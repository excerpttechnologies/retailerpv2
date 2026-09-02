import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import Grc from '@/models/Grc';
import Item from '@/models/Item';
import Contact from '@/models/Contact';
import { handler, json } from '@/lib/apiError';
import { requirePermission, PERMISSIONS } from '@/lib/rbac';
import { escapeRegex } from '@/lib/validate';
import { nextDocNumber } from '@/lib/docnumber';
import { BarcodeLabel, BARCODE_STATUS } from '@/lib/barcodeLabel';
import { reserveBarcodeNumbers, loadFormat, uomTypeOf, batchTypeOf } from '@/lib/barcodeEngine';
import { withTransaction, receiveIntoStock, voidUnits, InventoryError } from '@/lib/inventory';

/* /api/barcode-generation

   Barcode Generation is where stock ENTERS the system - it is the only thing
   that creates a barcodeLabel row, and a barcodeLabel row is one unit of
   stock. Two things changed here:

   1. The barcode NUMBER is issued by the server, from the atomic counter, not
      by the browser. See ../reserve/route.js for why.
   2. Saving now also places the stock: each new row is stamped IN_STOCK at
      the receiving location and gets its opening entry in the movement
      ledger. Before this, a generated barcode existed but was nowhere, which
      is why nothing downstream could tell available stock from sold stock.

   Both happen in one transaction with the GRC header, so a half-generated
   receipt is not a state the database can be left in. */

const PER_PAGE = 20;

/* ================================================================= list === */

export const GET = handler(async (req) => {
  await requirePermission(null);
  await dbConnect();
  const sp = new URL(req.url).searchParams;

  const page = Math.max(1, Number(sp.get('page') || 1));
  const perPage = Math.min(1000, Number(sp.get('perPage') || PER_PAGE));

  const filter = {};
  const business = sp.get('business');
  const location = sp.get('location');
  const finYear = sp.get('finYear');
  const grcId = sp.get('grcId');
  const supplier = sp.get('supplier');
  if (business) filter.businessId = business;
  if (location) filter.locationId = location;
  if (finYear) filter.finYear = finYear;
  if (grcId) filter.grcId = grcId;
  if (supplier) filter.supplierId = supplier;
  const status = sp.get('status'); if (status) filter.status = status;

  const code = (sp.get('code') || '').trim();
  const name = (sp.get('name') || '').trim();

  const andClauses = [];
  if (code) {
    const rx = { $regex: escapeRegex(code), $options: 'i' };
    andClauses.push({ $or: [{ itemCode: rx }, { oldBarcode: rx }, { barcodeGenerated: rx }, { barcodeNo: rx }] });
  }
  if (name) {
    const rx = { $regex: escapeRegex(name), $options: 'i' };
    andClauses.push({ $or: [{ supplierDescription: rx }, { printDescription: rx }] });
  }
  if (andClauses.length) filter.$and = andClauses;

  const total = await BarcodeLabel.countDocuments(filter);
  const rows = await BarcodeLabel.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .lean();

  /* Supplier name and GRC number, resolved for the label.

     The label has to print who the goods came from and which receipt they
     arrived on, and the barcode row stores only ids. Resolved here, for the
     page being displayed, rather than denormalised onto every row - a
     supplier's name can be corrected, and a label printed tomorrow should
     show the corrected one. */
  const supplierIds = [...new Set(
    rows.map((r) => r.supplierId).filter((s) => s && isValidObjectId(String(s))).map(String)
  )];
  const grcIds = [...new Set(
    rows.filter((r) => !r.grcNo).map((r) => r.grcId).filter((g) => g && isValidObjectId(String(g))).map(String)
  )];

  const [suppliers, grcs] = await Promise.all([
    supplierIds.length
      ? Contact.find({ _id: { $in: supplierIds } }).select('businessName firstName lastName contactId').lean()
      : [],
    grcIds.length
      ? Grc.find({ _id: { $in: grcIds } }).select('grcNumber').lean()
      : [],
  ]);

  const supplierName = new Map(suppliers.map((s) => [
    String(s._id),
    (s.businessName || [s.firstName, s.lastName].filter(Boolean).join(' ') || '').trim(),
  ]));
  const grcNumber = new Map(grcs.map((g) => [String(g._id), g.grcNumber || '']));

  return json({
    rows: rows.map((r) => ({
      ...r,
      _id: String(r._id),
      supplierName: supplierName.get(String(r.supplierId)) || '',
      grcNo: r.grcNo || grcNumber.get(String(r.grcId)) || '',
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    perPage,
  });
});

/* ============================================================== generate === */

export const POST = handler(async (req) => {
  const body = await req.json().catch(() => ({}));
  const {
    rows, business, location, finYear, totals,
    supplierId, vendorDocNo, grcDate, grcId, stockPointId,
  } = body || {};

  const session = await requirePermission(PERMISSIONS.BARCODE_GENERATE, { locationId: location });
  await dbConnect();

  if (!Array.isArray(rows) || rows.length === 0) {
    return json({ error: 'No rows to save', code: 'EMPTY' }, 400);
  }

  /* ---- money, derived from the rows rather than trusted from the form --- */
  const totalQuantity = rows.reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0);
  const netAmount = rows.reduce((sum, row) => {
    const price = parseFloat(row.offerPrice || row.retailPrice) || 0;
    return sum + price * (parseFloat(row.qty) || 0);
  }, 0);
  const discountAmount = rows.reduce((sum, row) => {
    const rate = parseFloat(row.finalNet || row.purRate) || 0;
    const discount = parseFloat(row.disc) || 0;
    return sum + (rate * discount) / 100 * (parseFloat(row.qty) || 0);
  }, 0);
  const gst = rows.reduce((sum, row) => sum + (parseFloat(row.gst) || 0), 0);

  /* Item codes on the rows are free text; resolving them once here means the
     barcode carries a real itemId and the reports stop having to re-match on
     a string. Unmatched codes are not an error - the operator may be
     receiving something not yet in the item master. */
  const itemByCode = await resolveItems(rows, business);

  const result = await withTransaction(async (dbSession) => {
    /* ---------------------------------------------- editing an existing -- */
    if (grcId) {
      if (!isValidObjectId(grcId)) return json({ error: 'Invalid grcId', code: 'BAD_INPUT' }, 400);
      const existing = await Grc.findById(grcId).session(dbSession || null);
      if (!existing) return json({ error: 'GRC not found', code: 'NOT_FOUND' }, 404);

      /* Regenerating replaces this GRC's barcode rows. That is only safe
         while every one of them is still sitting in stock where it was
         received: once a unit has been transferred, sold or returned it has a
         history, and deleting the row would erase stock that physically
         moved. Refuse, and say which units are the problem. */
      const current = await BarcodeLabel.find({ grcId: String(grcId) })
        .session(dbSession || null).lean();

      const moved = current.filter(
        (u) => u.status && u.status !== BARCODE_STATUS.IN_STOCK
      );
      if (moved.length) {
        throw new InventoryError('GRC_LOCKED',
          moved.length + ' barcode(s) from this GRC have already moved (' +
          [...new Set(moved.map((m) => m.status))].join(', ') +
          '), so its barcodes can no longer be regenerated. Raise a stock adjustment instead. ' +
          'Affected: ' + moved.map((m) => m.barcodeNo || m.barcodeGenerated).slice(0, 8).join(', '),
          { status: 409, skipped: moved.map((m) => m.barcodeNo || m.barcodeGenerated) });
      }

      /* the units being replaced are written off in the ledger, so the trail
         shows the regeneration rather than a silent disappearance */
      if (current.length) {
        await voidUnits({
          units: current,
          ref: { model: 'grc', _id: existing._id, no: existing.grcNumber },
          reason: 'Barcodes regenerated for this GRC',
          user: session, session: dbSession,
        });
        await BarcodeLabel.deleteMany({ grcId: String(grcId) }, dbSession ? { session: dbSession } : {});
      }

      const savedSupplierId = body.supplierId || String(existing.supplierId || '');
      const docs = await buildDocs({
        rows, business, location, finYear, grcId: String(grcId),
        supplierId: savedSupplierId, grcNo: existing.grcNumber, itemByCode, session: dbSession,
      });

      const created = await BarcodeLabel.insertMany(docs, dbSession ? { session: dbSession, ordered: true } : { ordered: true });

      await receiveIntoStock({
        units: created.map((d) => d.toObject()),
        businessId: business, locationId: location, stockPointId,
        grc: existing, user: session, session: dbSession,
      });

      await Grc.findByIdAndUpdate(
        grcId,
        { totalQuantity, gst, netAmount, taxable: netAmount - discountAmount },
        dbSession ? { session: dbSession } : {}
      );

      return { grcId: String(grcId), grcNumber: existing.grcNumber, count: created.length };
    }

    /* ------------------------------------------------- a brand new GRC -- */
    const grcPayload = {
      grcDate: grcDate || new Date(),
      vendorDocNo: vendorDocNo || '',
      totalQuantity: totals?.count || totalQuantity,
      gst,
      netAmount: totals?.value || 0,
      taxable: (totals?.value || 0) - (totals?.discAmount || 0),
    };
    if (business && isValidObjectId(business)) grcPayload.businessId = business;
    if (location && isValidObjectId(location)) grcPayload.locationId = location;
    if (finYear) grcPayload.finYear = finYear;
    if (supplierId && isValidObjectId(supplierId)) grcPayload.supplierId = supplierId;
    if (stockPointId && isValidObjectId(stockPointId)) grcPayload.stockPointId = stockPointId;

    grcPayload.grcNumber = await nextDocNumber(Grc, 'grcNumber', 'Goods Receipt Challan', {
      businessId: grcPayload.businessId,
      locationId: grcPayload.locationId,
      finYear: grcPayload.finYear,
    });

    const [grc] = await Grc.create([grcPayload], dbSession ? { session: dbSession } : {});

    const docs = await buildDocs({
      rows, business, location, finYear, grcId: String(grc._id),
      supplierId, grcNo: grcPayload.grcNumber, itemByCode, session: dbSession,
    });

    const created = await BarcodeLabel.insertMany(docs, dbSession ? { session: dbSession, ordered: true } : { ordered: true });

    /* the barcodes become stock at the receiving location, and the ledger
       gets each unit's opening entry */
    await receiveIntoStock({
      units: created.map((d) => d.toObject()),
      businessId: business, locationId: location, stockPointId,
      grc, user: session, session: dbSession,
    });

    return { grcId: String(grc._id), grcNumber: grcPayload.grcNumber, count: created.length };
  });

  /* a validation short-circuit inside the transaction returns a Response */
  if (result instanceof Response) return result;

  return json({ ok: true, ...result });
});

/* ================================================================ delete === */

export const DELETE = handler(async (req) => {
  const body = await req.json().catch(() => ({}));
  const session = await requirePermission(PERMISSIONS.GRC_MANAGE);
  await dbConnect();

  if (body?.grcId) {
    return withTransaction(async (dbSession) => {
      const units = await BarcodeLabel.find({ grcId: body.grcId }).session(dbSession || null).lean();

      const moved = units.filter((u) => u.status && u.status !== BARCODE_STATUS.IN_STOCK);
      if (moved.length) {
        throw new InventoryError('GRC_LOCKED',
          'This GRC cannot be deleted: ' + moved.length + ' of its barcodes have already moved ('
          + [...new Set(moved.map((m) => m.status))].join(', ') + ').',
          { status: 409, skipped: moved.map((m) => m.barcodeNo || m.barcodeGenerated) });
      }

      const grc = await Grc.findById(body.grcId).session(dbSession || null).lean();
      if (units.length) {
        await voidUnits({
          units,
          ref: { model: 'grc', _id: body.grcId, no: grc?.grcNumber || '' },
          reason: 'GRC deleted',
          user: session, session: dbSession,
        });
      }

      await Grc.findByIdAndDelete(body.grcId, dbSession ? { session: dbSession } : {});
      await BarcodeLabel.deleteMany({ grcId: body.grcId }, dbSession ? { session: dbSession } : {});
      return json({ ok: true });
    });
  }

  if (body?.id) {
    return withTransaction(async (dbSession) => {
      const unit = await BarcodeLabel.findById(body.id).session(dbSession || null).lean();
      if (!unit) return json({ ok: true });

      if (unit.status && unit.status !== BARCODE_STATUS.IN_STOCK) {
        throw new InventoryError('BARCODE_LOCKED',
          'Barcode ' + (unit.barcodeNo || unit.barcodeGenerated) + ' has already moved (' + unit.status + ') and cannot be deleted.',
          { status: 409 });
      }
      await voidUnits({
        units: [unit], ref: { model: 'barcodeLabel', _id: unit._id, no: unit.barcodeNo },
        reason: 'Barcode row deleted', user: session, session: dbSession,
      });
      await BarcodeLabel.findByIdAndDelete(body.id, dbSession ? { session: dbSession } : {});
      return json({ ok: true });
    });
  }

  return json({ error: 'id or grcId required', code: 'BAD_INPUT' }, 400);
});

/* ------------------------------------------------------------- internals -- */

/* Turns the screen's rows into barcode documents, issuing any number the row
   does not already carry.

   A row normally arrives with the number it reserved (see ../reserve), and
   that number is kept - it is on the label the operator may already have
   printed. A row without one is numbered here, which covers an Excel import
   and any older client. */
async function buildDocs({ rows, business, location, finYear, grcId, supplierId, grcNo, itemByCode, session }) {
  const needing = rows.filter((r) => !String(r.barcodeGenerated || r.barcodeNo || '').trim()).length;
  const format = await loadFormat(business, finYear);
  const issued = needing
    ? await reserveBarcodeNumbers(needing, { businessId: business, finYear, setting: format }, session)
    : [];
  let next = 0;

  return rows.map((r) => {
    const barcodeNo = String(r.barcodeGenerated || r.barcodeNo || '').trim() || issued[next++];

    const uomType = uomTypeOf(r.uom);
    const batchType = batchTypeOf(r.batchUnique ?? r.mode ?? r.uniqueBarcode);
    const item = itemByCode.get(String(r.itemCode || '').trim());

    return {
      grcId,
      grcNo: grcNo || '',
      supplierId: supplierId || '',
      groupId: r.groupId || '',
      oldBarcode: r.oldBarcode || '',
      itemCode: r.itemCode || '',
      batchUnique: batchType,
      billSlNo: r.billSlNo || '',
      seq: r.seq || r.seqDummy || '',
      dummy: r.dummy || '',
      supplierDescription: r.supplierDescription || '',
      qty: String(r.qty ?? ''),
      uom: r.uom || '',
      hsn: r.hsn || '',
      purRate: r.purRate || '',
      disc: r.disc || '',
      finalNet: r.finalNet || '',
      gst: r.gst || '',
      printDescription: r.printDescription || '',
      retailPrice: r.retailPrice || '',
      disc2: r.disc2 || '',
      offerPrice: r.offerPrice || '',
      wspPrice: r.wspPrice || '',
      dpPrice: r.dpPrice || '',
      customFields: r.customFields && typeof r.customFields === 'object' ? r.customFields : {},
      fma: r.fma || '',
      silkMark: r.silkMark || '',

      /* canonical + legacy, kept in step so nothing that still reads
         barcodeGenerated breaks */
      barcodeNo,
      barcodeGenerated: barcodeNo,

      /* ---- lifecycle ---- */
      itemId: item?._id || null,
      itemName: item?.name || r.itemName || r.printDescription || r.supplierDescription || '',
      uomType,
      batchType,
      qtyNum: Number(r.qty) || 1,
      batchNo: batchType === 'batch' ? String(r.batchNo || barcodeNo) : '',
      serialNo: String(r.serialNo || r.billSlNo || ''),
      status: BARCODE_STATUS.IN_STOCK,
      currentLocationId: isValidObjectId(location) ? location : null,
      currentBusinessId: isValidObjectId(business) ? business : null,

      businessId: business || '',
      locationId: location || '',
      finYear: finYear || '',
    };
  });
}

async function resolveItems(rows, businessId) {
  const codes = [...new Set(rows.map((r) => String(r.itemCode || '').trim()).filter(Boolean))];
  if (!codes.length) return new Map();

  const items = await Item.find({
    itemCode: { $in: codes },
    ...(businessId && isValidObjectId(businessId) ? { businessId } : {}),
  }).select('_id name itemCode').lean();

  return new Map(items.map((i) => [String(i.itemCode), i]));
}

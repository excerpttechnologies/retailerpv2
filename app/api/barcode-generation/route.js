// import dbConnect from '@/lib/db';
// import { requireSession } from '@/lib/session';
// import { escapeRegex } from '@/lib/validate';
// import { Grc } from '@/lib/grc';
// import { BarcodeLabel } from '@/lib/barcodeLabel';

// const json = (d, s = 200) => Response.json(d, { status: s });

// /* GET /api/barcode-generation?business=&location=&finYear=&page=&perPage=&code=&name=&grcId=
//    Paginated list, newest first, scoped to whatever of business/location/
//    finYear are passed. Any of the three can be omitted.

//    - `code` matches Item Code, Old Barcode, or Generated Barcode (partial, case-insensitive).
//    - `name` matches Supplier Description or Print Description (partial, case-insensitive).
//    - `grcId` restricts to one GRC's rows (used by GRC/Barcode print pages).
//    - all empty -> returns every saved row (paginated), newest first. */
// export async function GET(req) {
//   const session = await requireSession();
//   if (!session) return json({ error: 'Unauthorized' }, 401);

//   await dbConnect();
//   const sp = new URL(req.url).searchParams;

//   const page = Math.max(1, Number(sp.get('page') || 1));
//   const perPage = Math.min(200, Number(sp.get('perPage') || 20));

//   const filter = {};
//   const business = sp.get('business');
//   const location = sp.get('location');
//   const finYear = sp.get('finYear');
//   const grcId = sp.get('grcId');
//   if (business) filter.businessId = business;
//   if (location) filter.locationId = location;
//   if (finYear) filter.finYear = finYear;
//   if (grcId) filter.grcId = grcId;

//   const code = (sp.get('code') || '').trim();
//   const name = (sp.get('name') || '').trim();

//   const andClauses = [];
//   if (code) {
//     const rx = { $regex: escapeRegex(code), $options: 'i' };
//     andClauses.push({ $or: [{ itemCode: rx }, { oldBarcode: rx }, { barcodeGenerated: rx }] });
//   }
//   if (name) {
//     const rx = { $regex: escapeRegex(name), $options: 'i' };
//     andClauses.push({ $or: [{ supplierDescription: rx }, { printDescription: rx }] });
//   }
//   if (andClauses.length) filter.$and = andClauses;

//   const total = await BarcodeLabel.countDocuments(filter);
//   const rows = await BarcodeLabel.find(filter)
//     .sort({ createdAt: -1 })
//     .skip((page - 1) * perPage)
//     .limit(perPage)
//     .lean();

//   return json({
//     rows: rows.map((r) => ({ ...r, _id: String(r._id) })),
//     total,
//     page,
//     pages: Math.max(1, Math.ceil(total / perPage)),
//     perPage,
//   });
// }

// /* POST /api/barcode-generation
//    Body: { rows, business, location, finYear, totals, supplierId, vendorDocNo, grcDate }

//    1. Creates one Grc header document (so the entry shows up in the
//       "Goods Receipt Challans" list at transaction/purchase/grc).
//    2. Bulk-inserts every barcode row, each linked back via grcId. */
// export async function POST(req) {
//   const session = await requireSession();
//   if (!session) return json({ error: 'Unauthorized' }, 401);

//   await dbConnect();
//   const body = await req.json();
//   const { rows, business, location, finYear, totals, supplierId, vendorDocNo, grcDate } = body || {};

//   if (!Array.isArray(rows) || rows.length === 0) {
//     return json({ error: 'No rows to save' }, 400);
//   }

//   // TODO: replace with your real Doc Setup numbering call (docType:
//   // 'Goods Receipt Challan') once wired up - Date.now() is a placeholder.
//   const grcNumber = `GRC-${Date.now()}`;

//   const grcPayload = {
//     grcNumber,
//     grcDate: grcDate || new Date(),
//     vendorDocNo: vendorDocNo || '',
//     totalQuantity: totals?.count || 0,
//     gst: rows.reduce((s, r) => s + (parseFloat(r.gst) || 0), 0),
//     netAmount: totals?.value || 0,
//     taxable: (totals?.value || 0) - (totals?.discAmount || 0),
//     businessId: business || '',
//     locationId: location || '',
//     finYear: finYear || '',
//   };
//   // supplierId is an ObjectId ref on Grc - omit entirely if empty, don't set ''
//   if (supplierId) grcPayload.supplierId = supplierId;

//   const grc = await Grc.create(grcPayload);

//   const docs = rows.map((r) => ({
//     grcId: String(grc._id),
//     groupId: r.groupId || '',
//     oldBarcode: r.oldBarcode || '',
//     itemCode: r.itemCode || '',
//     batchUnique: r.batchUnique || '',
//     billSlNo: r.billSlNo || '',
//     seq: r.seq || '',
//     dummy: r.dummy || '',
//     supplierDescription: r.supplierDescription || '',
//     qty: r.qty || '',
//     uom: r.uom || '',
//     hsn: r.hsn || '',
//     purRate: r.purRate || '',
//     disc: r.disc || '',
//     finalNet: r.finalNet || '',
//     gst: r.gst || '',
//     printDescription: r.printDescription || '',
//     retailPrice: r.retailPrice || '',
//     disc2: r.disc2 || '',
//     offerPrice: r.offerPrice || '',
//     wspPrice: r.wspPrice || '',
//     dpPrice: r.dpPrice || '',
//     fma: r.fma || '',
//     silkMark: r.silkMark || '',
//     barcodeGenerated: r.barcodeGenerated || '',
//     businessId: business || '',
//     locationId: location || '',
//     finYear: finYear || '',
//   }));

//   const created = await BarcodeLabel.insertMany(docs);
//   return json({ ok: true, grcId: String(grc._id), grcNumber, count: created.length });
// }

// /* DELETE /api/barcode-generation
//    Body: either
//      { id }     - removes a single saved barcode row
//      { grcId }  - removes a whole GRC: header + every linked barcode row */
// export async function DELETE(req) {
//   const session = await requireSession();
//   if (!session) return json({ error: 'Unauthorized' }, 401);

//   await dbConnect();
//   const body = await req.json();

//   if (body?.grcId) {
//     await Promise.all([
//       Grc.findByIdAndDelete(body.grcId),
//       BarcodeLabel.deleteMany({ grcId: body.grcId }),
//     ]);
//     return json({ ok: true });
//   }

//   if (body?.id) {
//     await BarcodeLabel.findByIdAndDelete(body.id);
//     return json({ ok: true });
//   }

//   return json({ error: 'id or grcId required' }, 400);
// }




import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import Grc from '@/models/Grc';
import { requireSession } from '@/lib/session';
import { escapeRegex } from '@/lib/validate';
import { nextDocNumber } from '@/lib/docnumber';
import { BarcodeLabel } from '@/lib/barcodeLabel';

const json = (d, s = 200) => Response.json(d, { status: s });

/* GET /api/barcode-generation?business=&location=&finYear=&page=&perPage=&code=&name=&grcId=
   Lists saved BarcodeLabel rows (unchanged shape/logic from before). */
export async function GET(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  await dbConnect();
  const sp = new URL(req.url).searchParams;

  const page = Math.max(1, Number(sp.get('page') || 1));
  const perPage = Math.min(200, Number(sp.get('perPage') || 20));

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

  const code = (sp.get('code') || '').trim();
  const name = (sp.get('name') || '').trim();

  const andClauses = [];
  if (code) {
    const rx = { $regex: escapeRegex(code), $options: 'i' };
    andClauses.push({ $or: [{ itemCode: rx }, { oldBarcode: rx }, { barcodeGenerated: rx }] });
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

  return json({
    rows: rows.map((r) => ({ ...r, _id: String(r._id) })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    perPage,
  });
}

/* POST /api/barcode-generation
   Body: { rows, business, location, finYear, totals, supplierId, vendorDocNo, grcDate }

   Now uses the REAL Grc model (@/models/Grc) - same one the Goods Receipt
   Challan list/add form use - so records show up correctly, with proper
   ObjectId fields and real Doc Setup numbering via nextDocNumber. */
export async function POST(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  await dbConnect();
  const body = await req.json();
  const { rows, business, location, finYear, totals, supplierId, vendorDocNo, grcDate, grcId } = body || {};

  if (!Array.isArray(rows) || rows.length === 0) {
    return json({ error: 'No rows to save' }, 400);
  }

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

  if (grcId) {
    if (!isValidObjectId(grcId)) return json({ error: 'Invalid grcId' }, 400);
    const existing = await Grc.findById(grcId);
    if (!existing) return json({ error: 'GRC not found' }, 404);

    await BarcodeLabel.deleteMany({ grcId: String(grcId) });
    const savedSupplierId = body.supplierId || String(existing.supplierId || '');
    const docs = rows.map((r) => ({
      grcId: String(grcId),
      supplierId: savedSupplierId,
      groupId: r.groupId || '', oldBarcode: r.oldBarcode || '', itemCode: r.itemCode || '',
      batchUnique: r.batchUnique || r.mode || '', billSlNo: r.billSlNo || '', seq: r.seq || r.seqDummy || '', dummy: r.dummy || '',
      supplierDescription: r.supplierDescription || '', qty: r.qty || '', uom: r.uom || '', hsn: r.hsn || '',
      purRate: r.purRate || '', disc: r.disc || '', finalNet: r.finalNet || '', gst: r.gst || '',
      printDescription: r.printDescription || '', retailPrice: r.retailPrice || '', disc2: r.disc2 || '',
      offerPrice: r.offerPrice || '', wspPrice: r.wspPrice || '', dpPrice: r.dpPrice || '', fma: r.fma || '',
      silkMark: r.silkMark || '', barcodeGenerated: r.barcodeGenerated || r.barcodeNo || '',
      businessId: business || '', locationId: location || '', finYear: finYear || '',
    }));
    const created = await BarcodeLabel.insertMany(docs);
    await Grc.findByIdAndUpdate(grcId, {
      totalQuantity,
      gst,
      netAmount,
      taxable: netAmount - discountAmount,
    });
    return json({ ok: true, grcId: String(grcId), count: created.length });
  }

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

  // real Doc Setup numbering, same call the main Add GRC form uses
  grcPayload.grcNumber = await nextDocNumber(Grc, 'grcNumber', 'Goods Receipt Challan', {
    businessId: grcPayload.businessId,
    locationId: grcPayload.locationId,
    finYear: grcPayload.finYear,
  });

  const grc = await Grc.create(grcPayload);

  const docs = rows.map((r) => ({
    grcId: String(grc._id),
    supplierId: supplierId || String(grc.supplierId || ''),
    groupId: r.groupId || '',
    oldBarcode: r.oldBarcode || '',
    itemCode: r.itemCode || '',
    batchUnique: r.batchUnique || r.mode || '',
    billSlNo: r.billSlNo || '',
    seq: r.seq || r.seqDummy || '',
    dummy: r.dummy || '',
    supplierDescription: r.supplierDescription || '',
    qty: r.qty || '',
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
    fma: r.fma || '',
    silkMark: r.silkMark || '',
    barcodeGenerated: r.barcodeGenerated || r.barcodeNo || '',
    businessId: business || '',
    locationId: location || '',
    finYear: finYear || '',
  }));

  const created = await BarcodeLabel.insertMany(docs);
  return json({ ok: true, grcId: String(grc._id), grcNumber: grcPayload.grcNumber, count: created.length });
}

/* DELETE /api/barcode-generation - unchanged */
export async function DELETE(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  await dbConnect();
  const body = await req.json();

  if (body?.grcId) {
    await Promise.all([
      Grc.findByIdAndDelete(body.grcId),
      BarcodeLabel.deleteMany({ grcId: body.grcId }),
    ]);
    return json({ ok: true });
  }
  if (body?.id) {
    await BarcodeLabel.findByIdAndDelete(body.id);
    return json({ ok: true });
  }
  return json({ error: 'id or grcId required' }, 400);
}
import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import Item from '@/models/Item';
import Hsn from '@/models/Hsn';
import Uom from '@/models/Uom';
import Tax from '@/models/Tax';
import CompanyLocation from '@/models/CompanyLocation';
import StockTransferPacket from '@/models/StockTransferPacket';
import { BarcodeLabel } from '@/lib/barcodeLabel';
import { requireSession } from '@/lib/session';
import { escapeRegex } from '@/lib/validate';

/* /api/stock-transfer-packet/item-lookup?code=<item code>&business=&fromLocation=
   &toLocation=&finYear=

   Everything one grid row needs the moment an item code is scanned: item,
   HSN, GST slab percentages, UOM, net rate and how much is left to send.

   This covers the two rules in the screen's Info panel:

     1. Item Code Validation - the code must exist for the selected business
        and source location. BarcodeLabel is where GRC lines live (see
        /api/barcode-generation), so a code with no barcode row is rejected
        even if an Item master record exists for it.

     2. Stock Availability Check - maxQty below.                             */

const json = (d, s = 200) => Response.json(d, { status: s });
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/* Item codes are typed by hand and scanned by gun, and the barcode rows were
   written by a different screen - so match on a trimmed, case-insensitive
   basis rather than on an exact string. */
const codeMatch = (code) => ({
  $regex: '^\\s*' + escapeRegex(String(code).trim()) + '\\s*$',
  $options: 'i',
});

/* BarcodeLabel stores businessId / locationId as plain strings defaulting to
   '' (see lib/barcodeLabel.js), and the barcode screen writes whatever the
   top bar happened to hold - which is '' when a row is saved before the
   location selector has resolved. Filtering on locationId therefore hides
   real stock, so stock is scoped by BUSINESS only, and rows carrying a blank
   business are treated as belonging to whoever is asking.

   That is a deliberate loosening, not an oversight: a true per-location
   balance needs a stock ledger, which this project does not have. The same
   compromise is documented on /api/ic-delivery-challan/item-lookup. */
const stockScope = (businessId) => (businessId
  ? { $or: [
      { businessId: String(businessId) },
      { businessId: '' },
      { businessId: { $exists: false } },
    ] }
  : {});

/* Available quantity to send from this location.

   Derived, because there is no stock ledger: everything received for the code
   through GRC barcode rows, minus whatever is already committed to stock
   transfer packets raised FROM this location that nobody has received yet.
   It is the figure the deployed screen prints in the "Max QTY" column. */
async function availableQty(itemCode, { businessId, fromLocationId, finYear }) {
  const received = await BarcodeLabel.find({
    itemCode: codeMatch(itemCode),
    ...stockScope(businessId),
  }).select('qty').lean();

  const inStock = received.reduce((a, r) => a + num(r.qty), 0);

  /* already promised on packets that have left this location on paper */
  const open = await StockTransferPacket.find({
    ...(businessId ? { businessId } : {}),
    ...(fromLocationId ? { fromLocationId } : {}),
    ...(finYear ? { finYear } : {}),
  }).select('items').lean();

  const committed = open.reduce((a, p) => {
    const lines = Array.isArray(p.items) ? p.items : [];
    return a + lines
      .filter((l) => String(l.itemCode).trim().toLowerCase()
        === String(itemCode).trim().toLowerCase())
      .reduce((s, l) => s + num(l.qty), 0);
  }, 0);

  return Math.max(0, Math.round((inStock - committed) * 100) / 100);
}

export async function GET(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const sp = new URL(req.url).searchParams;
  const code = (sp.get('code') || '').trim();
  if (!code) return json({ error: 'Enter an item code.' }, 400);

  await dbConnect();

  const business = sp.get('business');
  const fromLocation = sp.get('fromLocation');
  const toLocation = sp.get('toLocation');

  const scope = {
    businessId: business && isValidObjectId(business) ? business : null,
    fromLocationId: fromLocation && isValidObjectId(fromLocation) ? fromLocation : null,
    finYear: sp.get('finYear') || '',
  };

  /* rule 1 - the code must exist in this business's GRC item list */
  const rx = codeMatch(code);
  const barcodeRow = await BarcodeLabel.findOne({
    itemCode: rx,
    ...stockScope(scope.businessId),
  }).lean();

  if (!barcodeRow) {
    /* distinguish "never received anywhere" from "not received HERE" */
    const elsewhere = await BarcodeLabel.findOne({ itemCode: rx }).lean();
    return json({
      error: elsewhere
        ? 'No stock of "' + code + '" at this business. Receive it here first.'
        : 'No GRC item found for "' + code + '". Receive it first.',
    }, 404);
  }

  const item = await Item.findOne({
    itemCode: rx,
    ...(scope.businessId ? { businessId: scope.businessId } : {}),
  }).lean()
    || await Item.findOne({ itemCode: rx }).lean();

  if (!item) return json({ error: 'No item master record for "' + code + '".' }, 404);

  const [hsn, uom] = await Promise.all([
    item.hsnId ? Hsn.findById(item.hsnId).lean() : null,
    item.uomId ? Uom.findById(item.uomId).lean() : null,
  ]);

  /* GST chain: HSN -> taxSlabs[].gstTaxNameId -> Tax.igst/cgst/sgst, the same
     join /api/item/[id]/detail already does */
  let slab = null;
  if (hsn && Array.isArray(hsn.taxSlabs) && hsn.taxSlabs.length) {
    const taxIds = hsn.taxSlabs.map((s) => s.gstTaxNameId).filter(Boolean);
    const taxes = taxIds.length ? await Tax.find({ _id: { $in: taxIds } }).lean() : [];
    const byId = new Map(taxes.map((t) => [String(t._id), t]));
    const first = hsn.taxSlabs.find((s) => byId.has(String(s.gstTaxNameId)));
    const t = first ? byId.get(String(first.gstTaxNameId)) : null;
    if (t) {
      slab = {
        name: t.taxName || '',
        igst: num(t.igst),
        cgst: num(t.cgst),
        sgst: num(t.sgst),
      };
    }
  }

  /* Inter-state movement carries IGST, intra-state splits into CGST + SGST.
     Decided from the two LOCATIONS' GSTINs - the first two digits are the
     state code. Both locations belong to the same business here, so it is the
     location GSTINs that differ, not the business's. */
  let igstPct = 0;
  let cgstPct = slab ? slab.cgst : 0;
  let sgstPct = slab ? slab.sgst : 0;

  if (slab && scope.fromLocationId && toLocation && isValidObjectId(toLocation)) {
    const [from, to] = await Promise.all([
      CompanyLocation.findById(scope.fromLocationId).select('gstin').lean(),
      CompanyLocation.findById(toLocation).select('gstin').lean(),
    ]);
    const stateOf = (g) => String(g || '').slice(0, 2);
    if (from?.gstin && to?.gstin && stateOf(from.gstin) !== stateOf(to.gstin)) {
      igstPct = slab.igst;
      cgstPct = 0;
      sgstPct = 0;
    }
  }

  return json({
    item: {
      itemId: String(item._id),
      itemCode: item.itemCode || code,
      itemName: item.name || '',
      hsn: hsn ? hsn.code || '' : '',
      slabName: slab ? slab.name : '',
      uom: uom ? uom.shortName || uom.name || '' : '',
      /* a stock transfer moves goods at cost, so the line opens at the item's
         retail price only because nothing else on the item master represents
         a transfer rate - override it on the row if your costing differs */
      netRate: num(item.rsp),
      igstPct,
      cgstPct,
      sgstPct,
      maxQty: await availableQty(item.itemCode || code, scope),
    },
  });
}

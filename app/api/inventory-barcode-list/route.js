import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import Grc from '@/models/Grc';
import { BarcodeLabel } from '@/lib/barcodeLabel';
import { requireSession } from '@/lib/session';
import { escapeRegex } from '@/lib/validate';

/* /api/inventory-barcode-list - read-only list for Inventory > Barcode Item.
   Separate from /api/barcodeitem on purpose (that route/model is left
   untouched). Sourced from BarcodeLabel, the collection barcode-generation
   actually writes rows into, joined back to Grc for the GRC number. */

const json = (d, s = 200) => Response.json(d, { status: s });
const PER_PAGE = 10;

export async function GET(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  await dbConnect();
  const sp = new URL(req.url).searchParams;

  const page = Math.max(1, Number(sp.get('page') || 1));
  const perPage = Math.min(500, Number(sp.get('perPage') || PER_PAGE));

  const business = sp.get('business');
  const location = sp.get('location');

  const filter = {};
  if (business && isValidObjectId(business)) filter.businessId = business;
  if (location && isValidObjectId(location)) filter.locationId = location;

  /* groupId / subGroupId both point at the same product-group collection on
     the filter panel, but BarcodeLabel only carries one groupId field today.
     subGroupId, if given, is treated as the more specific selection. */
  const groupId = sp.get('groupId');
  const subGroupId = sp.get('subGroupId');
  if (subGroupId) filter.groupId = subGroupId;
  else if (groupId) filter.groupId = groupId;

  /* No real itemId ref stored on BarcodeLabel - itemCode is free text from
     the barcode-generation screen, so match against that. */
  const itemId = sp.get('itemId');
  if (itemId) filter.itemCode = itemId;

  const rspStart = sp.get('rspStart');
  const rspEnd = sp.get('rspEnd');
  if (rspStart || rspEnd) {
    filter.retailPrice = {};
    if (rspStart) filter.retailPrice.$gte = Number(rspStart);
    if (rspEnd) filter.retailPrice.$lte = Number(rspEnd);
  }

  const cpStart = sp.get('cpStart');
  const cpEnd = sp.get('cpEnd');
  if (cpStart || cpEnd) {
    filter.finalNet = {};
    if (cpStart) filter.finalNet.$gte = Number(cpStart);
    if (cpEnd) filter.finalNet.$lte = Number(cpEnd);
  }

  const barcodeStart = sp.get('barcodeStart');
  const barcodeEnd = sp.get('barcodeEnd');
  if (barcodeStart || barcodeEnd) {
    filter.barcodeGenerated = {};
    if (barcodeStart) filter.barcodeGenerated.$gte = barcodeStart;
    if (barcodeEnd) filter.barcodeGenerated.$lte = barcodeEnd;
  }

  const search = (sp.get('search') || '').trim();
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [
      { barcodeGenerated: rx },
      { oldBarcode: rx },
      { itemCode: rx },
      { printDescription: rx },
      { supplierDescription: rx },
    ];
  }

  /* supplierId and grcNo both live on the parent Grc doc - resolve matching
     grc ids first, then constrain BarcodeLabel.grcId to that set. */
  const supplierId = sp.get('supplierId');
  const grcNo = (sp.get('grcNo') || '').trim();
  if (supplierId || grcNo) {
    const grcFilter = {};
    if (supplierId && isValidObjectId(supplierId)) grcFilter.supplierId = supplierId;
    if (grcNo) grcFilter.grcNumber = { $regex: escapeRegex(grcNo), $options: 'i' };
    if (business && isValidObjectId(business)) grcFilter.businessId = business;
    if (location && isValidObjectId(location)) grcFilter.locationId = location;

    const matches = await Grc.find(grcFilter).select('_id').lean();
    filter.grcId = { $in: matches.map((g) => String(g._id)) };
  }

  const total = await BarcodeLabel.countDocuments(filter);
  const rows = await BarcodeLabel.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .lean();

  /* join grcNumber back in for display */
  const grcIds = [...new Set(rows.map((r) => r.grcId).filter(Boolean))];
  const grcs = grcIds.length
    ? await Grc.find({ _id: { $in: grcIds } }).select('_id grcNumber').lean()
    : [];
  const grcNumberById = Object.fromEntries(grcs.map((g) => [String(g._id), g.grcNumber]));

  return json({
    rows: rows.map((r) => ({
      _id: String(r._id),
      barcodeNo: r.barcodeGenerated || r.oldBarcode || '',
      itemId: r.printDescription || r.supplierDescription || r.itemCode || '',
      rsp: Number(r.retailPrice) || 0,
      cp: Number(r.finalNet || r.purRate) || 0,
      grcNo: grcNumberById[r.grcId] || '',
    })),
    labels: {},
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    perPage,
  });
}
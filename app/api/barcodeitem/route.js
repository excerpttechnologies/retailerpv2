// import { isValidObjectId } from 'mongoose';
// import dbConnect from '@/lib/db';
// import BarcodeItem from '@/models/BarcodeItem';
// import { requireSession } from '@/lib/session';
// import { resolveRefLabels } from '@/lib/refLabels';
// import { validate, escapeRegex } from '@/lib/validate';
// /* Barcode Item is a filter-only screen - it has no add form, so there are
//    no declared fields to validate against. */
// const FIELDS = [];

// /* /api/barcodeitem - list + create. */

// const json = (d, s = 200) => Response.json(d, { status: s });
// const PER_PAGE = 10;

// export async function GET(req) {
//   const session = await requireSession();
//   if (!session) return json({ error: 'Unauthorized' }, 401);

//   const sp = new URL(req.url).searchParams;
//   await dbConnect();

//   const page = Math.max(1, Number(sp.get('page') || 1));
//   const perPage = Math.min(500, Number(sp.get('perPage') || PER_PAGE));
//   const search = (sp.get('search') || '').trim();

//   const filter = {};
//   const b = sp.get('business'); if (b && isValidObjectId(b)) filter.businessId = b;
//   const l = sp.get('location'); if (l && isValidObjectId(l)) filter.locationId = l;

//   if (search) {
//     const rx = { $regex: escapeRegex(search), $options: 'i' };
//     filter.$or = [];
//   }

//   const total = await BarcodeItem.countDocuments(filter);
//   const rows = await BarcodeItem.find(filter)
//     .sort({ createdAt: -1 })
//     .skip((page - 1) * perPage)
//     .limit(perPage)
//     .lean();

//   return json({
//     rows: rows.map((r) => ({ ...r, _id: String(r._id) })),
//     labels: await resolveRefLabels(rows),
//     total,
//     page,
//     pages: Math.max(1, Math.ceil(total / perPage)),
//     perPage,
//   });
// }

// export async function POST(req) {
//   const session = await requireSession();
//   if (!session) return json({ error: 'Unauthorized' }, 401);

//   const body = await req.json();
//   await dbConnect();

//   const { errors, doc, ok } = validate(FIELDS, body.data || {});
//   if (!ok) return json({ errors }, 422);
//   if (body.business && isValidObjectId(body.business)) doc.businessId = body.business;
//   if (body.location && isValidObjectId(body.location)) doc.locationId = body.location;

//   const created = await BarcodeItem.create(doc);
//   return json({ ok: true, id: String(created._id) });
// }






import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import BarcodeItem from '@/models/BarcodeItem';
import { requireSession } from '@/lib/session';
import { resolveRefLabels } from '@/lib/refLabels';
import { validate, escapeRegex } from '@/lib/validate';

/* Barcode Item is a filter-only screen - it has no add form, so there are
   no declared fields to validate against. */
const FIELDS = [];

/* /api/barcodeitem - list + create. */

const json = (d, s = 200) => Response.json(d, { status: s });
const PER_PAGE = 10;

/* Filters may arrive as a single id ("507f...") or a comma-separated list
   ("507f...,608a...") - the Items filter on the screen is a multi-select
   tag input. Splits + validates, returns null if nothing usable. */
function idListParam(sp, key) {
  const raw = sp.get(key);
  if (!raw) return null;
  const ids = raw.split(',').map((s) => s.trim()).filter(isValidObjectId);
  if (!ids.length) return null;
  return ids.length === 1 ? ids[0] : { $in: ids };
}

export async function GET(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const sp = new URL(req.url).searchParams;
  await dbConnect();

  const page = Math.max(1, Number(sp.get('page') || 1));
  const perPage = Math.min(500, Number(sp.get('perPage') || PER_PAGE));
  const search = (sp.get('search') || '').trim();

  const filter = {};
  const b = sp.get('business'); if (b && isValidObjectId(b)) filter.businessId = b;
  const l = sp.get('location'); if (l && isValidObjectId(l)) filter.locationId = l;

  /* ref filters - stored directly on BarcodeItem now, no joins needed */
  const groupId = idListParam(sp, 'groupId'); if (groupId) filter.groupId = groupId;
  const subGroupId = idListParam(sp, 'subGroupId'); if (subGroupId) filter.subGroupId = subGroupId;
  const itemId = idListParam(sp, 'itemId'); if (itemId) filter.itemId = itemId;
  const supplierId = idListParam(sp, 'supplierId'); if (supplierId) filter.supplierId = supplierId;

  /* numeric range filters */
  const numRange = (startKey, endKey) => {
    const start = sp.get(startKey);
    const end = sp.get(endKey);
    if (!start && !end) return null;
    const range = {};
    if (start !== null && start !== '') range.$gte = Number(start);
    if (end !== null && end !== '') range.$lte = Number(end);
    return Object.keys(range).length ? range : null;
  };
  const rsp = numRange('rspStart', 'rspEnd'); if (rsp) filter.rsp = rsp;
  const cp = numRange('cpStart', 'cpEnd'); if (cp) filter.cp = cp;

  /* barcodeNo is stored as a string, so Start/End is a lexicographic range
     rather than a true numeric one - fine as long as barcode numbers stay
     a fixed width, but if they ever grow past that this needs padding. */
  const barcodeStart = sp.get('barcodeStart');
  const barcodeEnd = sp.get('barcodeEnd');
  if (barcodeStart || barcodeEnd) {
    filter.barcodeNo = {};
    if (barcodeStart) filter.barcodeNo.$gte = barcodeStart;
    if (barcodeEnd) filter.barcodeNo.$lte = barcodeEnd;
  }

  const grcNo = (sp.get('grcNo') || '').trim();
  if (grcNo) filter.grcNo = { $regex: escapeRegex(grcNo), $options: 'i' };

  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ barcodeNo: rx }, { itemCode: rx }, { grcNo: rx }];
  }

  const total = await BarcodeItem.countDocuments(filter);
  const rows = await BarcodeItem.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .lean();

  return json({
    rows: rows.map((r) => ({ ...r, _id: String(r._id) })),
    labels: await resolveRefLabels(rows),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    perPage,
  });
}

export async function POST(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const body = await req.json();
  await dbConnect();

  const { errors, doc, ok } = validate(FIELDS, body.data || {});
  if (!ok) return json({ errors }, 422);
  if (body.business && isValidObjectId(body.business)) doc.businessId = body.business;
  if (body.location && isValidObjectId(body.location)) doc.locationId = body.location;

  const created = await BarcodeItem.create(doc);
  return json({ ok: true, id: String(created._id) });
}
import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import StockTransferPacket from '@/models/StockTransferPacket';
import { requireSession } from '@/lib/session';
import { resolveRefLabels } from '@/lib/refLabels';
import { validate, escapeRegex } from '@/lib/validate';

const json = (d, s = 200) => Response.json(d, { status: s });
const PER_PAGE = 10;

const FIELDS = [
  { k: 'transferFromLocationId', label: 'Transfer From', type: 'ref', req: true },
  { k: 'transferToLocationId', label: 'Transfer To', type: 'ref', req: true },
  { k: 'transferFromLocationGstn', label: 'Transfer From GSTN', type: 'text' },
  { k: 'transferFromLocationAddress', label: 'Transfer From Address', type: 'text' },
  { k: 'transferToLocationGstn', label: 'Transfer To GSTN', type: 'text' },
  { k: 'transferToLocationAddress', label: 'Transfer To Address', type: 'text' },
  { k: 'stockPointId', label: 'Stock Point', type: 'ref' },
  { k: 'packetNo', label: 'Packet No', type: 'text' },
  { k: 'transferDate', label: 'Transfer Date', type: 'date', req: true },
  { k: 'waybill', label: 'Waybill', type: 'text' },
  { k: 'remarks', label: 'Remarks', type: 'text' },
  { k: 'items', label: 'Items', type: 'multiref' },
];

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
  const y = sp.get('finYear'); if (y) filter.finYear = y;

  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ packetNo: rx }, { remarks: rx }, { waybill: rx }];
  }

  const total = await StockTransferPacket.countDocuments(filter);
  const rows = await StockTransferPacket.find(filter)
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
  if (body.finYear) doc.finYear = body.finYear;

  if (Array.isArray(body.data?.items)) doc.items = body.data.items;

  const created = await StockTransferPacket.create(doc);
  return json({ ok: true, id: String(created._id) });
}

import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import StockTransferReceived from '@/models/StockTransferReceived';
import { requireSession } from '@/lib/session';
import { resolveRefLabels } from '@/lib/refLabels';
import { validate, escapeRegex } from '@/lib/validate';

const json = (d, s = 200) => Response.json(d, { status: s });
const PER_PAGE = 10;

const FIELDS = [
  { k: 'packetId', label: 'Packet', type: 'ref' },
  { k: 'locationIdFrom', label: 'Transfer From', type: 'ref' },
  { k: 'locationIdTo', label: 'Transfer To', type: 'ref' },
  { k: 'receivedNo', label: 'Received No', type: 'text' },
  { k: 'receivedDate', label: 'Received Date', type: 'date' },
  { k: 'sentQty', label: 'Sent Qty', type: 'number' },
  { k: 'receivedQty', label: 'Received Qty', type: 'number' },
  { k: 'pendingQty', label: 'Pending Qty', type: 'number' },
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
    filter.$or = [{ receivedNo: rx }, { status: rx }];
  }

  const total = await StockTransferReceived.countDocuments(filter);
  const rows = await StockTransferReceived.find(filter)
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

  const created = await StockTransferReceived.create(doc);
  return json({ ok: true, id: String(created._id) });
}

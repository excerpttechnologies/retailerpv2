import dbConnect from '@/lib/db';
import StockTransferReceived from '@/models/StockTransferReceived';
import { requireSession } from '@/lib/session';
import { validate } from '@/lib/validate';

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

const json = (d, s = 200) => Response.json(d, { status: s });

export async function GET(req, { params }) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const { id } = await params;
  await dbConnect();

  const doc = await StockTransferReceived.findById(id).lean();
  if (!doc) return json({ doc: null }, 404);
  return json({ doc: { ...doc, _id: String(doc._id) } });
}

export async function PUT(req, { params }) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const { id } = await params;
  const body = await req.json();
  await dbConnect();

  const { errors, doc, ok } = validate(FIELDS, body.data || {});
  if (!ok) return json({ errors }, 422);

  if (Array.isArray(body.data?.items)) doc.items = body.data.items;

  const updated = await StockTransferReceived.findByIdAndUpdate(id, doc, { new: true, runValidators: true });
  if (!updated) return json({ error: 'Not found' }, 404);

  return json({ ok: true, id });
}

export async function DELETE(req, { params }) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const { id } = await params;
  await dbConnect();

  await StockTransferReceived.findByIdAndDelete(id);
  return json({ ok: true });
}

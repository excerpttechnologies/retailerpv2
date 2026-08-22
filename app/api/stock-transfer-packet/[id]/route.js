import dbConnect from '@/lib/db';
import StockTransferPacket from '@/models/StockTransferPacket';
import { requireSession } from '@/lib/session';
import { validate } from '@/lib/validate';

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

const json = (d, s = 200) => Response.json(d, { status: s });

export async function GET(req, { params }) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const { id } = await params;
  await dbConnect();

  const doc = await StockTransferPacket.findById(id).lean();
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

  const updated = await StockTransferPacket.findByIdAndUpdate(id, doc, { new: true, runValidators: true });
  if (!updated) return json({ error: 'Not found' }, 404);

  return json({ ok: true, id });
}

export async function DELETE(req, { params }) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const { id } = await params;
  await dbConnect();

  await StockTransferPacket.findByIdAndDelete(id);
  return json({ ok: true });
}

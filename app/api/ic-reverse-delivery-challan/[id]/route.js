import dbConnect from '@/lib/db';
import IcReverseDeliveryChallan from '@/models/IcReverseDeliveryChallan';
import { requireSession } from '@/lib/session';
import { validate } from '@/lib/validate';
import { FIELDS, computeTotals } from '@/app/admin/transaction/intercompanysell/reversedeliverychallan/fields';

/* /api/ic-reverse-delivery-challan/<id> - read one, update, delete.

   No conversion lock here, unlike the delivery challan's [id] route: nothing
   downstream consumes a reverse challan yet, so there is nothing to protect
   it from. Add the guard when it gains a downstream document. */

const json = (d, s = 200) => Response.json(d, { status: s });

function applyTotals(doc, body) {
  const items = Array.isArray(body.data?.items) ? body.data.items : [];
  const t = computeTotals(items, {
    discountPercent: body.data?.discountPercent,
    roundOffDiscountAmt: body.data?.roundOffDiscountAmt,
  });

  doc.items = items;
  doc.discountPercent = Number(body.data?.discountPercent) || 0;
  doc.roundOffDiscountAmt = Number(body.data?.roundOffDiscountAmt) || 0;
  doc.taxableValue = t.taxableValue;
  doc.igstTotal = t.igstTotal;
  doc.cgstTotal = t.cgstTotal;
  doc.sgstTotal = t.sgstTotal;
  doc.roundOff = t.roundOff;
  doc.totalQty = t.totalQty;
  doc.netValue = t.netValue;
}

export async function GET(req, { params }) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const { id } = await params;
  await dbConnect();

  const doc = await IcReverseDeliveryChallan.findById(id).lean();
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

  applyTotals(doc, body);

  /* never overwrite the document number on edit */
  delete doc.rdcNo;

  const updated = await IcReverseDeliveryChallan.findByIdAndUpdate(
    id, doc, { new: true, runValidators: true }
  );
  if (!updated) return json({ error: 'Not found' }, 404);

  return json({ ok: true, id });
}

export async function DELETE(req, { params }) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const { id } = await params;
  await dbConnect();

  await IcReverseDeliveryChallan.findByIdAndDelete(id);
  return json({ ok: true });
}

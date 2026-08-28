import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import Grc from '@/models/Grc';
import Delivery from '@/models/Delivery';
import { requireSession } from '@/lib/session';
import { resolveRefLabels } from '@/lib/refLabels';
import { validate, escapeRegex } from '@/lib/validate';
import { nextDocNumber } from '@/lib/docnumber';
import { FORM } from '@/app/admin/transaction/purchase/grc/form';

/* header fields AND the totals rows - the totals card holds real stored
   numbers (taxable value, round off, net value, the editable discounts).
   Leaving them out meant validate() silently dropped them on every save. */
const FIELDS = (FORM.cards || []).flatMap((c) => {
  if (c.type === 'fields') return c.fields || [];
  if (c.type === 'source' && c.sourceKey) return [{ k: c.sourceKey, label: c.label, type: 'ref', req: c.req }];
  if (c.type === 'totals') {
    return (c.rows || []).flatMap((r) => [
      ...(r.value ? [{ k: r.value, label: r.label, type: 'number' }] : []),
      ...(r.input ? [{ k: r.input, label: r.label, type: 'number', def: 0 }] : []),
    ]);
  }
  return [];
});

/* /api/purchase-grc - list + create. */

const json = (d, s = 200) => Response.json(d, { status: s });
const PER_PAGE = 10;

export async function GET(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const sp = new URL(req.url).searchParams;
  await dbConnect();

  if (sp.get('availableLr') === '1') {
    const deliveryFilter = {};
    const business = sp.get('business');
    const location = sp.get('location');
    if (business && isValidObjectId(business)) deliveryFilter.businessId = business;
    if (location && isValidObjectId(location)) deliveryFilter.locationId = location;
    if (sp.get('finYear')) deliveryFilter.finYear = sp.get('finYear');
    if (sp.get('supplierId') && isValidObjectId(sp.get('supplierId'))) deliveryFilter.supplierId = sp.get('supplierId');
    const used = await Grc.find({
      ...(deliveryFilter.businessId ? { businessId: deliveryFilter.businessId } : {}),
      ...(deliveryFilter.locationId ? { locationId: deliveryFilter.locationId } : {}),
      ...(deliveryFilter.finYear ? { finYear: deliveryFilter.finYear } : {}),
      lrTransactionId: { $ne: null },
    }).select('lrTransactionId').lean();
    deliveryFilter._id = { $nin: used.map((r) => r.lrTransactionId) };
    const rows = await Delivery.find(deliveryFilter).sort({ createdAt: -1 }).limit(500).lean();
    return json({ rows: rows.map((r) => ({ ...r, _id: String(r._id) })) });
  }

  const page = Math.max(1, Number(sp.get('page') || 1));
  const perPage = Math.min(500, Number(sp.get('perPage') || PER_PAGE));

  const filter = {};
  const b = sp.get('business'); if (b && isValidObjectId(b)) filter.businessId = b;
  const l = sp.get('location'); if (l && isValidObjectId(l)) filter.locationId = l;
  const y = sp.get('finYear'); if (y) filter.finYear = y;
  const sup = sp.get('supplierId'); if (sup && isValidObjectId(sup)) filter.supplierId = sup;

  const from = sp.get('startDate');
  const to = sp.get('endDate');
  if (from) filter.grcDate = { ...(filter.grcDate || {}), $gte: new Date(from) };
  if (to) filter.grcDate = { ...(filter.grcDate || {}), $lte: new Date(to + 'T23:59:59') };

  /* "unconverted" upstream documents: a GRC with no purchase invoice yet, a
     GRT with no debit note yet. $eq: null matches missing AND null - passing
     '' here would be cast against an ObjectId path and throw. */
  const unconverted = sp.get('unconverted');
  if (unconverted) filter[unconverted] = { $eq: null };

  const search = (sp.get('search') || '').trim();
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ grcNumber: rx }];
  }

  const total = await Grc.countDocuments(filter);
  const rows = await Grc.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .lean();

  const labels = await resolveRefLabels(rows);
  return json({
    rows: rows.map((r) => ({ ...r, _id: String(r._id), supplierName: labels[String(r.supplierId)] || '' })),
    labels,
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
  if (Array.isArray(body.data?.voucherRows)) doc.voucherRows = body.data.voucherRows;

  const duplicate = await Grc.exists({ lrTransactionId: doc.lrTransactionId });
  if (duplicate) return json({ errors: { lrTransactionId: 'This LR / Transaction already has a GRC.' } }, 422);

  const delivery = await Delivery.findById(doc.lrTransactionId).select('supplierId transactionNo invPmNumber').lean();
  if (!delivery) return json({ errors: { lrTransactionId: 'Selected LR / Transaction was not found.' } }, 422);
  if (String(delivery.supplierId) !== String(doc.supplierId)) {
    return json({ errors: { lrTransactionId: 'Selected LR does not belong to this vendor.' } }, 422);
  }
  doc.lrTransactionNo = delivery.transactionNo || '';
  if (!doc.vendorDocNo) doc.vendorDocNo = delivery.invPmNumber || '';

  /* document number from the Doc Setup master */
  if (!doc.grcNumber) {
    doc.grcNumber = await nextDocNumber(Grc, 'grcNumber', "Goods Receipt Challan", {
      businessId: doc.businessId, locationId: doc.locationId, finYear: doc.finYear,
    });
  }

  const created = await Grc.create(doc);

  return json({ ok: true, id: String(created._id) });
}

// import { isValidObjectId } from 'mongoose';
// import dbConnect from '@/lib/db';
// import Delivery from '@/models/Delivery';
// import Transporter from '@/models/Transporter';
// import Contact from '@/models/Contact';
// import { requireSession } from '@/lib/session';
// import { validate, escapeRegex } from '@/lib/validate';
// import { FIELDS, DERIVED_FIELDS, freightBreakdown } from '@/app/admin/transport/delivery/fields';

// /* /api/delivery - Delivery / LR transactions: list + create. */

// const json = (d, s = 200) => Response.json(d, { status: s });
// const PER_PAGE = 100;

// /* LR/<financial year short>/<running number>, e.g. LR/26/003.
//    Scoped by business and financial year so two tenants never interleave. */
// async function nextTransactionNo({ businessId, finYear }) {
//   const [start] = String(finYear || '').split('-');
//   const yy = (start || String(new Date().getFullYear())).slice(2);
//   const prefix = 'LR/' + yy + '/';

//   const used = await Delivery.countDocuments({
//     transactionNo: { $regex: '^' + escapeRegex(prefix) },
//     ...(businessId ? { businessId } : {}),
//     ...(finYear ? { finYear } : {}),
//   });

//   return prefix + String(used + 1).padStart(3, '0');
// }

// /* The list shows transporter and supplier names, not ids. */
// async function resolveNames(rows) {
//   const labels = {};
//   const tIds = [...new Set(rows.map((r) => r.transporterId).filter(Boolean).map(String))];
//   const sIds = [...new Set(rows.map((r) => r.supplierId).filter(Boolean).map(String))];

//   const [transporters, suppliers] = await Promise.all([
//     tIds.length ? Transporter.find({ _id: { $in: tIds } }).lean() : [],
//     sIds.length ? Contact.find({ _id: { $in: sIds } }).lean() : [],
//   ]);

//   transporters.forEach((t) => { labels[String(t._id)] = t.transporterName || t.transporterCode || ''; });
//   suppliers.forEach((c) => {
//     labels[String(c._id)] = c.businessName
//       || [c.firstName, c.lastName].filter(Boolean).join(' ')
//       || '';
//   });

//   return labels;
// }

// export async function GET(req) {
//   const session = await requireSession();
//   if (!session) return json({ error: 'Unauthorized' }, 401);

//   const sp = new URL(req.url).searchParams;
//   await dbConnect();

//   const page = Math.max(1, Number(sp.get('page') || 1));
//   const perPage = Math.min(500, Number(sp.get('perPage') || PER_PAGE));

//   const filter = {};
//   const b = sp.get('business'); if (b && isValidObjectId(b)) filter.businessId = b;
//   const l = sp.get('location'); if (l && isValidObjectId(l)) filter.locationId = l;
//   const y = sp.get('finYear'); if (y) filter.finYear = y;

//   /* the Filter card above the list */
//   const from = sp.get('startDate');
//   const to = sp.get('endDate');
//   if (from) filter.transactionDate = { ...(filter.transactionDate || {}), $gte: new Date(from) };
//   if (to) filter.transactionDate = { ...(filter.transactionDate || {}), $lte: new Date(to + 'T23:59:59') };

//   const search = (sp.get('search') || '').trim();
//   if (search) {
//     const rx = { $regex: escapeRegex(search), $options: 'i' };
//     /* "Search transaction, LR or supplier" - supplier is matched by resolving
//        names to ids first, since the name lives on the contact */
//     const supplierIds = await Contact.find({
//       $or: [{ businessName: rx }, { firstName: rx }, { lastName: rx }],
//     }).select('_id').lean();

//     filter.$or = [
//       { transactionNo: rx },
//       { lrNumber: rx },
//       { invPmNumber: rx },
//       ...(supplierIds.length ? [{ supplierId: { $in: supplierIds.map((s) => s._id) } }] : []),
//     ];
//   }

//   const total = await Delivery.countDocuments(filter);
//   const rows = await Delivery.find(filter)
//     .sort({ createdAt: -1 })
//     .skip((page - 1) * perPage)
//     .limit(perPage)
//     .lean();

//   return json({
//     rows: rows.map((r) => ({ ...r, _id: String(r._id) })),
//     labels: await resolveNames(rows),
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
//   if (body.finYear) doc.finYear = body.finYear;

//   /* recomputed here rather than trusted from the dialog */
//   const totals = freightBreakdown(doc);
//   DERIVED_FIELDS.forEach((f) => { doc[f.k] = totals[f.k]; });

//   doc.transactionNo = await nextTransactionNo({
//     businessId: doc.businessId, finYear: doc.finYear,
//   });

//   const created = await Delivery.create(doc);
//   return json({ ok: true, id: String(created._id), transactionNo: created.transactionNo });
// }










import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import Delivery from '@/models/Delivery';
import Transporter from '@/models/Transporter';
import Contact from '@/models/Contact';
import Dispatch from '@/models/Dispatch';
import { requireSession } from '@/lib/session';
import { validate, escapeRegex } from '@/lib/validate';
import { nextSeriesNumber } from '@/lib/docnumber';
import { FIELDS, DERIVED_FIELDS, freightBreakdown } from '@/app/admin/transport/delivery/fields';

/* /api/delivery - Delivery / LR transactions: list + create. */

const json = (d, s = 200) => Response.json(d, { status: s });
const PER_PAGE = 100;

/* LR/<financial year short>/<running number>, e.g. LR/26/003.
   Scoped by business and financial year so two tenants never interleave. */
async function nextTransactionNo({ businessId, finYear }) {
  const [start] = String(finYear || '').split('-');
  const yy = (start || String(new Date().getFullYear())).slice(2);

  /* highest-so-far, not a count: deleting one transaction must not make the
     next one collide with a number already in use */
  return nextSeriesNumber(Delivery, 'transactionNo', 'LR/' + yy + '/', {
    scope: {
      ...(businessId ? { businessId } : {}),
      ...(finYear ? { finYear } : {}),
    },
  });
}

/* The list shows transporter and supplier names, not ids. */
async function resolveNames(rows) {
  const labels = {};
  const tIds = [...new Set(rows.map((r) => r.transporterId).filter(Boolean).map(String))];
  const sIds = [...new Set(rows.map((r) => r.supplierId).filter(Boolean).map(String))];
  const dIds = [...new Set(rows.map((r) => r.dispatchId).filter(Boolean).map(String))];

  const [transporters, suppliers, dispatches] = await Promise.all([
    tIds.length ? Transporter.find({ _id: { $in: tIds } }).lean() : [],
    sIds.length ? Contact.find({ _id: { $in: sIds } }).lean() : [],
    dIds.length ? Dispatch.find({ _id: { $in: dIds } }).lean() : [],
  ]);

  dispatches.forEach((d) => { labels[String(d._id)] = d.docNo || ''; });

  transporters.forEach((t) => { labels[String(t._id)] = t.transporterName || t.transporterCode || ''; });
  suppliers.forEach((c) => {
    labels[String(c._id)] = c.businessName
      || [c.firstName, c.lastName].filter(Boolean).join(' ')
      || '';
  });

  return labels;
}

export async function GET(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const sp = new URL(req.url).searchParams;
  await dbConnect();

  if (sp.get('nextNumber') === '1') {
    const businessId = sp.get('business');
    return json({ transactionNo: await nextTransactionNo({
      businessId: businessId && isValidObjectId(businessId) ? businessId : null,
      finYear: sp.get('finYear') || '',
    }) });
  }

  const page = Math.max(1, Number(sp.get('page') || 1));
  const perPage = Math.min(500, Number(sp.get('perPage') || PER_PAGE));

  const filter = {};
  const b = sp.get('business'); if (b && isValidObjectId(b)) filter.businessId = b;
  const l = sp.get('location'); if (l && isValidObjectId(l)) filter.locationId = l;
  const y = sp.get('finYear'); if (y) filter.finYear = y;

  /* consignments not yet loaded onto a dispatch */
  if (sp.get('unassigned') === '1') {
    filter.$and = [...(filter.$and || []),
      { $or: [{ dispatchId: null }, { dispatchId: { $exists: false } }] }];
  }

  /* the Filter card above the list */
  const from = sp.get('startDate');
  const to = sp.get('endDate');
  if (from) filter.transactionDate = { ...(filter.transactionDate || {}), $gte: new Date(from) };
  if (to) filter.transactionDate = { ...(filter.transactionDate || {}), $lte: new Date(to + 'T23:59:59') };

  const search = (sp.get('search') || '').trim();
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    /* "Search transaction, LR or supplier" - supplier is matched by resolving
       names to ids first, since the name lives on the contact */
    const supplierIds = await Contact.find({
      $or: [{ businessName: rx }, { firstName: rx }, { lastName: rx }],
    }).select('_id').lean();

    filter.$or = [
      { transactionNo: rx },
      { lrNumber: rx },
      { invPmNumber: rx },
      ...(supplierIds.length ? [{ supplierId: { $in: supplierIds.map((s) => s._id) } }] : []),
    ];
  }

  const total = await Delivery.countDocuments(filter);
  const rows = await Delivery.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .lean();

  return json({
    rows: rows.map((r) => ({ ...r, _id: String(r._id) })),
    labels: await resolveNames(rows),
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

  /* recomputed here rather than trusted from the dialog */
  const totals = freightBreakdown(doc);
  DERIVED_FIELDS.forEach((f) => { doc[f.k] = totals[f.k]; });

  if (doc.transactionNo) {
    const duplicate = await Delivery.exists({
      transactionNo: doc.transactionNo,
      ...(doc.businessId ? { businessId: doc.businessId } : {}),
      ...(doc.finYear ? { finYear: doc.finYear } : {}),
    });
    if (duplicate) return json({ errors: { transactionNo: 'Transaction No already exists' } }, 422);
  } else {
    doc.transactionNo = await nextTransactionNo({
      businessId: doc.businessId, finYear: doc.finYear,
    });
  }

  const created = await Delivery.create(doc);
  return json({ ok: true, id: String(created._id), transactionNo: created.transactionNo });
}
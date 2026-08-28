import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import PosInvoice from '@/models/PosInvoice';
import Business from '@/models/Business';
import CompanyLocation from '@/models/CompanyLocation';
import Contact from '@/models/Contact';
import PosCounter from '@/models/PosCounter';
import { requireSession } from '@/lib/session';
import { resolveRefLabels } from '@/lib/refLabels';
import { validate, escapeRegex } from '@/lib/validate';
import { nextDocNumber } from '@/lib/docnumber';
const FIELDS = [];

/* /api/sell-pos - list + create. */

const json = (d, s = 200) => Response.json(d, { status: s });
const PER_PAGE = 10;

export async function GET(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const sp = new URL(req.url).searchParams;
  await dbConnect();

  const page = Math.max(1, Number(sp.get('page') || 1));
  const perPage = Math.min(500, Number(sp.get('perPage') || PER_PAGE));

  const filter = {};
  const b = sp.get('business'); if (b && isValidObjectId(b)) filter.businessId = b;
  const l = sp.get('location'); if (l && isValidObjectId(l)) filter.locationId = l;
  const y = sp.get('finYear'); if (y) filter.finYear = y;


  const from = sp.get('startDate');
  const to = sp.get('endDate');
  if (from) filter.date = { ...(filter.date || {}), $gte: new Date(from) };
  if (to) filter.date = { ...(filter.date || {}), $lte: new Date(to + 'T23:59:59') };

  /* "unconverted" upstream documents: a GRC with no purchase invoice yet, a
     GRT with no debit note yet. $eq: null matches missing AND null - passing
     '' here would be cast against an ObjectId path and throw. */
  const unconverted = sp.get('unconverted');
  if (unconverted) filter[unconverted] = { $eq: null };

  const search = (sp.get('search') || '').trim();
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ invoiceNo: rx }];
  }

  const total = await PosInvoice.countDocuments(filter);
  const rows = await PosInvoice.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .lean();

  const [businesses, locations, customers, counters] = await Promise.all([
    Business.find({ _id: { $in: rows.map((r) => r.businessId).filter(Boolean) } }).select('_id name businessPrintName').lean(),
    CompanyLocation.find({ _id: { $in: rows.map((r) => r.locationId).filter(Boolean) } }).select('_id name businessPrintName').lean(),
    Contact.find({ _id: { $in: rows.map((r) => r.customerId).filter(Boolean) } }).select('_id businessName firstName middleName lastName billingMobile').lean(),
    PosCounter.find({ _id: { $in: rows.map((r) => r.counterId).filter(Boolean) } }).select('_id counterName').lean(),
  ]);
  const byId = (list) => new Map(list.map((item) => [String(item._id), item]));
  const businessById = byId(businesses);
  const locationById = byId(locations);
  const customerById = byId(customers);
  const counterById = byId(counters);

  return json({
    rows: rows.map((r) => {
      const customer = customerById.get(String(r.customerId));
      return {
        ...r,
        _id: String(r._id),
        businessName: businessById.get(String(r.businessId))?.name || businessById.get(String(r.businessId))?.businessPrintName || '',
        locationName: locationById.get(String(r.locationId))?.name || locationById.get(String(r.locationId))?.businessPrintName || '',
        counterName: counterById.get(String(r.counterId))?.counterName || '',
        customerName: customer ? customer.businessName || [customer.firstName, customer.middleName, customer.lastName].filter(Boolean).join(' ') : r.customerSnapshot?.businessName || [r.customerSnapshot?.firstName, r.customerSnapshot?.middleName, r.customerSnapshot?.lastName].filter(Boolean).join(' ') || 'Walk-in Customer',
        customerContact: r.customerContact || customer?.billingMobile || r.customerSnapshot?.billingMobile || '',
      };
    }),
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

  doc.date = body.data?.date ? new Date(body.data.date) : new Date();
  doc.customerId = body.data?.customerId && isValidObjectId(body.data.customerId) ? body.data.customerId : null;
  doc.customerContact = String(body.data?.customerContact || '');
  doc.counterId = body.data?.counterId && isValidObjectId(body.data.counterId) ? body.data.counterId : null;
  doc.billingType = String(body.data?.billingType || '');
  doc.exempted = String(body.data?.exempted || 'NO');

  if (Array.isArray(body.data?.items)) doc.items = body.data.items;
  if (Array.isArray(body.data?.payments)) doc.payments = body.data.payments;
  if (body.data?.customerSnapshot) doc.customerSnapshot = body.data.customerSnapshot;
  if (body.data?.sellNote !== undefined) doc.sellNote = body.data.sellNote;
  if (body.data?.staffNote !== undefined) doc.staffNote = body.data.staffNote;
  doc.totalAmount = Number(body.data?.totalAmount || 0);
  doc.paid = Number(body.data?.paid || 0);
  doc.sellDue = Math.max(0, doc.totalAmount - doc.paid);
  doc.paymentStatus = doc.sellDue === 0 ? 'Paid' : doc.paid > 0 ? 'Part Paid' : 'Unpaid';
  if (!doc.invoiceNo) {
    doc.invoiceNo = await nextDocNumber(PosInvoice, 'invoiceNo', 'POS', {
      businessId: doc.businessId, locationId: doc.locationId, finYear: doc.finYear,
    });
  }

  const created = await PosInvoice.create(doc);

  return json({ ok: true, id: String(created._id) });
}

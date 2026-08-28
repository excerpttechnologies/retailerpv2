import dbConnect from '@/lib/db';
import PosInvoice from '@/models/PosInvoice';
import Business from '@/models/Business';
import CompanyLocation from '@/models/CompanyLocation';
import Contact from '@/models/Contact';
import PosCounter from '@/models/PosCounter';
import { requireSession } from '@/lib/session';
import { validate } from '@/lib/validate';
const FIELDS = [];

/* /api/sell-pos/<id> - read one, update, delete. */

const json = (d, s = 200) => Response.json(d, { status: s });

export async function GET(req, { params }) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const { id } = await params;
  await dbConnect();

  const doc = await PosInvoice.findById(id).lean();
  if (!doc) return json({ doc: null }, 404);
  const [business, location, customer, counter] = await Promise.all([
    doc.businessId ? Business.findById(doc.businessId).lean() : null,
    doc.locationId ? CompanyLocation.findById(doc.locationId).lean() : null,
    doc.customerId ? Contact.findById(doc.customerId).lean() : null,
    doc.counterId ? PosCounter.findById(doc.counterId).lean() : null,
  ]);
  const customerData = customer || doc.customerSnapshot || null;
  const customerName = customerData
    ? customerData.businessName || [customerData.firstName, customerData.middleName, customerData.lastName].filter(Boolean).join(' ')
    : 'Walk-in Customer';
  return json({ doc: {
    ...doc,
    _id: String(doc._id),
    businessName: business?.name || business?.businessPrintName || '',
    locationName: location?.name || location?.businessPrintName || '',
    customerName,
    customerEmail: customerData?.billingEmail || '',
    customerContact: doc.customerContact || customerData?.billingMobile || '',
    customerAddress: customerData ? [customerData.billingAddressLine1, customerData.billingCity, customerData.billingDistrict, customerData.billingTaluk, customerData.billingState, customerData.billingCountry, customerData.billingZipCode].filter(Boolean).join(', ') : '',
    counterName: counter?.counterName || '',
    status: doc.paymentStatus === 'Paid' ? 'FINALIZED' : doc.paymentStatus || 'DRAFT',
  } });
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
  if (Array.isArray(body.data?.payments)) doc.payments = body.data.payments;
  if (body.data?.sellNote !== undefined) doc.sellNote = body.data.sellNote;
  if (body.data?.staffNote !== undefined) doc.staffNote = body.data.staffNote;

  /* never overwrite the document number on edit */
  delete doc.invoiceNo;

  const updated = await PosInvoice.findByIdAndUpdate(id, doc, { new: true, runValidators: true });
  if (!updated) return json({ error: 'Not found' }, 404);

  return json({ ok: true, id });
}

export async function DELETE(req, { params }) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const { id } = await params;
  await dbConnect();

  await PosInvoice.findByIdAndDelete(id);
  return json({ ok: true });
}

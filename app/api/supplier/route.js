import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import Contact from '@/models/Contact';
import { requireSession } from '@/lib/session';
import { resolveRefLabels } from '@/lib/refLabels';
import { validate, escapeRegex } from '@/lib/validate';
import { TABS } from '@/app/admin/contact/supplier/tabs';

import ContactType from '@/models/ContactType';
import { nextContactId } from '@/lib/contactId';

const FIELDS = TABS.flatMap((t) => (t.sections || []).flatMap((s) => [
  ...(s.fields || []),
  ...(s.toggle ? [{ k: s.toggle.k, label: s.toggle.label, type: 'checkbox' }] : []),
]));

/* /api/supplier - list + create. */

const json = (d, s = 200) => Response.json(d, { status: s });
const PER_PAGE = 10;

export async function GET(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const sp = new URL(req.url).searchParams;
  await dbConnect();

  const page = Math.max(1, Number(sp.get('page') || 1));
  const perPage = Math.min(500, Number(sp.get('perPage') || PER_PAGE));
  const search = (sp.get('search') || '').trim();
  const gstNo = (sp.get('gstNo') || '').trim().toUpperCase();

  if (gstNo) {
    const exactFilter = {
      gstNo: { $regex: `^${escapeRegex(gstNo)}$`, $options: 'i' },
      contactKind: 'Supplier',
    };
    if (sp.get('business') && isValidObjectId(sp.get('business'))) exactFilter.businessId = sp.get('business');
    const doc = await Contact.findOne(exactFilter).lean();
    return doc
      ? json({ doc: { ...doc, _id: String(doc._id) } })
      : json({ doc: null });
  }

  const filter = {};
  const b = sp.get('business'); if (b && isValidObjectId(b)) filter.businessId = b;
  /* pinned server-side so the discriminator can't be spoofed */
  filter.contactKind = 'Supplier';

  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ gstNo: rx }, { businessName: rx }, { shortName: rx }, { firstName: rx }, { middleName: rx }, { lastName: rx }, { userName: rx }, { billingAddressLine1: rx }];
  }

  const total = await Contact.countDocuments(filter);
  const rows = await Contact.find(filter)
    .sort({ _id: -1 })
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

  const validationFields = body.allowBlankFirstName === true
    ? FIELDS.map((f) => (f.k === 'firstName' ? { ...f, req: false } : f))
    : FIELDS;
  const { errors, doc, ok } = validate(validationFields, body.data || {});
  if (!ok) return json({ errors }, 422);
  if (body.business && isValidObjectId(body.business)) doc.businessId = body.business;

  /* stamped here, never taken from the client */
  doc.contactKind = 'Supplier';
  if (doc.gstNo) doc.gstNo = String(doc.gstNo).trim().toUpperCase();
  const duplicate = doc.gstNo && await Contact.exists({
    gstNo: doc.gstNo,
    contactKind: 'Supplier',
    ...(doc.businessId ? { businessId: doc.businessId } : {}),
  });
  if (duplicate) return json({ errors: { gstNo: 'GST already exists' } }, 422);
  doc.contactId = await nextContactId(Contact, ContactType, doc.typeId);

  const created = await Contact.create(doc);
  return json({ ok: true, id: String(created._id) });
}

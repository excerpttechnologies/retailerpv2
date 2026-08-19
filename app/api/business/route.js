import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import Business from '@/models/Business';
import { requireSession } from '@/lib/session';
import { validate, escapeRegex } from '@/lib/validate';
import { FIELDS } from '@/app/admin/setting/business/fields';

/* /api/business - list + create. */

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

  const filter = {};
  /* global - no tenant scope */

  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ name: rx }, { businessPrintName: rx }, { landmark: rx }, { city: rx }, { state: rx }, { country: rx }, { zipCode: rx }, { addressLine1: rx }, { addressLine2: rx }, { mobile: rx }, { alternateContactNumber: rx }, { email: rx }, { websiteUrl: rx }, { gstin: rx }];
  }

  const total = await Business.countDocuments(filter);
  const rows = await Business.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .lean();

  /* resolve ObjectId columns to their display labels */
  const labels = {};

  return json({
    rows: rows.map((r) => ({ ...r, _id: String(r._id) })),
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


  const created = await Business.create(doc);
  return json({ ok: true, id: String(created._id) });
}

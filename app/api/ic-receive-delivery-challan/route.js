import { isValidObjectId, Types } from 'mongoose';
import dbConnect from '@/lib/db';
import IcDeliveryChallan from '@/models/IcDeliveryChallan';
import { requireSession } from '@/lib/session';
import { resolveRefLabels } from '@/lib/refLabels';
import { escapeRegex } from '@/lib/validate';

/* /api/ic-receive-delivery-challan

   The INBOX of the branch in the top bar: delivery challans somebody else
   raised and addressed HERE.

   Note which way the scope points. Every other list in this module filters on
   businessId / locationId - the branch that RAISED the document. This one
   filters on toBusinessId / toLocationId, because the question it answers is
   "what is on its way to me", not "what did I send". Passing the top bar's
   business as `businessId` here would list the branch's own outgoing
   challans, which is the opposite of the screen's purpose.

   GET  - challans addressed here. ?received=yes for ones already accepted.
   POST - accept one: { id } stamps receivedAt / receivedBy.

   Receiving records the ACCEPTANCE only. No stock is moved: this project has
   no ledger posting for inter company movement yet, and inventing one here
   would put stock in two places at once. */

const json = (d, s = 200) => Response.json(d, {
  status: s,
  headers: { 'Cache-Control': 'no-store' },
});
const PER_PAGE = 10;

export async function GET(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const sp = new URL(req.url).searchParams;
  await dbConnect();

  const page = Math.max(1, Number(sp.get('page') || 1));
  const perPage = Math.min(500, Number(sp.get('perPage') || PER_PAGE));

  const business = sp.get('business');
  const location = sp.get('location');

  /* No branch in the top bar means no inbox - returning everything would show
     one branch another's incoming goods. */
  if (!business || !isValidObjectId(business)) {
    return json({ rows: [], labels: {}, total: 0, page: 1, pages: 1, perPage });
  }

  const filter = { toBusinessId: business };
  if (location && isValidObjectId(location)) filter.toLocationId = location;

  const y = sp.get('finYear'); if (y) filter.finYear = y;

  filter.receivedAt = sp.get('received') === 'yes' ? { $ne: null } : { $eq: null };

  const from = sp.get('startDate');
  const to = sp.get('endDate');
  if (from) filter.dcDate = { ...(filter.dcDate || {}), $gte: new Date(from) };
  if (to) filter.dcDate = { ...(filter.dcDate || {}), $lte: new Date(to + 'T23:59:59') };

  const search = (sp.get('search') || '').trim();
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ dcNo: rx }, { customerGstn: rx }];
  }

  const total = await IcDeliveryChallan.countDocuments(filter);
  const rows = await IcDeliveryChallan.find(filter)
    .sort({ dcDate: -1, createdAt: -1 })
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
  const id = String(body.id || '');
  if (!isValidObjectId(id)) return json({ error: 'A challan id is required.' }, 400);

  await dbConnect();

  const challan = await IcDeliveryChallan.findById(id)
    .select('toBusinessId toLocationId receivedAt dcNo').lean();
  if (!challan) return json({ error: 'Challan not found.' }, 404);

  /* Only the addressee may receive it, and only once. Checked here and not
     just in the screen, because the id arrives in the request body. */
  const business = String(body.business || '');
  if (!isValidObjectId(business) || String(challan.toBusinessId) !== business) {
    return json({ error: 'This challan is not addressed to the selected branch.' }, 403);
  }
  if (challan.receivedAt) {
    return json({ error: 'Challan ' + (challan.dcNo || '') + ' is already received.' }, 409);
  }

  /* Written through the RAW driver, not the Mongoose model.

     Mongoose caches compiled models on `mongoose.models`, and Next's dev
     server hot-reloads route files WITHOUT re-registering them. A process
     that started before `receivedAt` joined the schema keeps the old model,
     and strict mode then drops the $set silently - the request answers 200
     while the document never changes. That is exactly what happened here:
     challans saved afterwards still carried the removed viaBusinessId and
     had no receivedAt key at all.

     .collection bypasses the schema, so the write lands whatever the running
     process last compiled. Reads are unaffected - strictQuery is off by
     default in Mongoose 7+, so the receivedAt filter in GET works either way.

     _id has to be cast by hand here; that casting is the model's job, and we
     have just stepped around the model. */
  const res = await IcDeliveryChallan.collection.updateOne(
    { _id: new Types.ObjectId(id), receivedAt: { $eq: null } },
    { $set: { receivedAt: new Date(), receivedBy: session.name || session.email || '' } }
  );

  /* never report success on a write that did not happen */
  if (!res.modifiedCount) {
    return json({ error: 'The receipt was not saved. Please try again.', code: 'NOT_PERSISTED' }, 500);
  }

  return json({ ok: true, id });
}

import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import IcReverseDeliveryChallan from '@/models/IcReverseDeliveryChallan';
import Business from '@/models/Business';
import { reserveSequence } from '@/models/Counter';
import { requireSession } from '@/lib/session';
import { resolveRefLabels } from '@/lib/refLabels';
import { validate, escapeRegex } from '@/lib/validate';
import { FIELDS, TOTAL_KEYS, computeTotals } from '@/app/admin/transaction/intercompanysell/reversedeliverychallan/fields';

/* /api/ic-reverse-delivery-challan - list + create.

   Plain storage, mirroring /api/ic-delivery-challan. The reverse-specific
   behaviour is NOT here: no link back to the challan being reversed, no
   stock movement, no hub routing and no rule about what may be reversed.
   Those wait until the flow is settled - this route exists so the screen
   renders, lists and saves. */

const json = (d, s = 200) => Response.json(d, { status: s });
const PER_PAGE = 10;

/* RDC/26-27/TF/1000 - same shape as the delivery challan's DC number, with
   its own series so the two never share a running number. */
const FY_SHORT = (finYear) => {
  const [a, b] = String(finYear || '').split('-');
  return a && b ? a.slice(2) + '-' + b.slice(2) : String(finYear || '');
};

const BRANCH_CODE = (name) => {
  const words = String(name || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^A-Za-z ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'XX';
};

async function nextRdcNo({ businessId, finYear }) {
  const business = businessId
    ? await Business.findById(businessId).select('name').lean()
    : null;
  const branch = BRANCH_CODE(business && business.name);
  const seq = await reserveSequence('icRdcNo|' + branch, { businessId, finYear }, 1);
  return ['RDC', FY_SHORT(finYear), branch, 999 + seq].join('/');
}

/* Totals are RECOMPUTED from the line items rather than trusted from the
   form - a request carrying its own netValue has it ignored. */
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

  const tb = sp.get('toBusinessId'); if (tb && isValidObjectId(tb)) filter.toBusinessId = tb;
  const tl = sp.get('toLocationId'); if (tl && isValidObjectId(tl)) filter.toLocationId = tl;

  const from = sp.get('startDate');
  const to = sp.get('endDate');
  if (from) filter.dcDate = { ...(filter.dcDate || {}), $gte: new Date(from) };
  if (to) filter.dcDate = { ...(filter.dcDate || {}), $lte: new Date(to + 'T23:59:59') };

  const search = (sp.get('search') || '').trim();
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ rdcNo: rx }, { customerGstn: rx }, { customerAddress: rx }];
  }

  const total = await IcReverseDeliveryChallan.countDocuments(filter);
  const rows = await IcReverseDeliveryChallan.find(filter)
    .sort({ createdAt: -1 })
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

  const { errors, doc, ok } = validate(FIELDS, body.data || {});
  if (!ok) return json({ errors }, 422);

  TOTAL_KEYS.forEach((k) => { delete doc[k]; });

  if (body.business && isValidObjectId(body.business)) doc.businessId = body.business;
  if (body.location && isValidObjectId(body.location)) doc.locationId = body.location;
  if (body.finYear) doc.finYear = body.finYear;

  applyTotals(doc, body);

  if (!doc.rdcNo) {
    doc.rdcNo = await nextRdcNo({ businessId: doc.businessId, finYear: doc.finYear });
  }

  const created = await IcReverseDeliveryChallan.create(doc);
  return json({ ok: true, id: String(created._id), rdcNo: created.rdcNo }, 201);
}

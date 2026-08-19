import mongoose, { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/session';
import Grc from '@/models/Grc';
import SalesInvoice from '@/models/SalesInvoice';
import PosInvoice from '@/models/PosInvoice';
import Ledger from '@/models/Ledger';
import LedgerGroup from '@/models/LedgerGroup';
import Business from '@/models/Business';

/* ==========================================================================
   Dashboard aggregates.

   DYNAMIC (computed from stored data):
     Total Purchase  - count of Goods Receipt Challans. GRC's add screen is
                       header-only in the original, so no amount is captured
                       yet; this is a document count, not a value.
     Total Sales     - sum of sales invoice netValue + POS invoice totalAmount
     Expenses        - sum of opening balances of ledgers whose group tree is
                       rooted at EXPENSES
     Both charts     - sales invoices grouped by day (last 30) and by month
                       (financial year), split into two series by business

   STATIC (source module not built):
     Purchase Due / Invoice Due need payments and receipts, which live in the
     Voucher / Cash Register modules.

   Scope is applied per collection: ledgers aren't FY-scoped, so applying a
   finYear filter to them matches nothing and silently reads zero.
   ========================================================================== */

const json = (d, s = 200) => Response.json(d, { status: s });

const STATIC_TILES = { purchaseDue: 3299, invoiceDue: 3459 };

function fyRange(finYear) {
  /* Indian FY: 1 April -> 31 March */
  const [a] = String(finYear || '').split('-');
  const start = Number(a) || new Date().getFullYear();
  return { from: new Date(start, 3, 1), to: new Date(start + 1, 2, 31, 23, 59, 59) };
}

export async function GET(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const sp = new URL(req.url).searchParams;
  const businessRaw = sp.get('business');
  const locationRaw = sp.get('location');
  /* MUST be real ObjectIds, not strings: find()/countDocuments() cast against
     the schema, but aggregate() does NOT - a string businessId in a $match
     silently matches nothing, which is what zeroed out Total Sales. */
  const oid = (v) => (v && isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);
  const business = oid(businessRaw);
  const location = oid(locationRaw);
  const finYear = sp.get('finYear') || '';

  await dbConnect();

  /* transaction docs carry business + location + finYear */
  const txScope = {
    ...(business ? { businessId: business } : {}),
    ...(location ? { locationId: location } : {}),
    ...(finYear ? { finYear } : {}),
  };
  /* ledgers carry business only */
  const ledgerScope = business ? { businessId: business } : {};

  const sum = async (Model, match, field) => {
    const r = await Model.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$' + field, 0] } } } },
    ]);
    return r.length ? r[0].total : 0;
  };

  /* ---------------------------------------------------------------- tiles */
  const totalPurchaseCount = await Grc.countDocuments(txScope);
  const salesInvoiceTotal = await sum(SalesInvoice, txScope, 'netValue');
  const posTotal = await sum(PosInvoice, txScope, 'totalAmount');

  /* Expenses: walk the ledger-group tree down from any EXPENSES root */
  let expenses = 0;
  const groups = await LedgerGroup.find(ledgerScope).lean();
  const byParent = new Map();
  groups.forEach((g) => {
    const key = String(g.parentGroupId || 'root');
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(g);
  });
  const roots = groups.filter((g) => /expens/i.test(String(g.groupName || '')));
  const ids = [];
  const walk = (g) => {
    ids.push(g._id);
    (byParent.get(String(g._id)) || []).forEach(walk);
  };
  roots.forEach(walk);
  if (ids.length) {
    expenses = await sum(Ledger, { ...ledgerScope, ledgerGroupId: { $in: ids } }, 'openingBalance');
  }

  /* --------------------------------------------------------------- charts */
  const businesses = await Business.find({}).limit(2).lean();
  const seriesNames = businesses.map((b) => b.name || 'Business');

  const dayLabels = [];
  const from30 = new Date();
  from30.setDate(from30.getDate() - 29);
  for (let i = 0; i < 30; i += 1) {
    const d = new Date(from30);
    d.setDate(from30.getDate() + i);
    dayLabels.push(d.toISOString().slice(0, 10));
  }

  const bucket = (groupBy, match) => SalesInvoice.aggregate([
    { $match: { ...(location ? { locationId: location } : {}), ...match } },
    {
      $group: {
        _id: { businessId: '$businessId', key: groupBy },
        total: { $sum: { $ifNull: ['$netValue', 0] } },
      },
    },
  ]);

  const last30Raw = await bucket(
    { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
    { createdAt: { $gte: from30 } }
  );

  const { from, to } = fyRange(finYear);
  const byMonthRaw = await bucket({ $month: '$createdAt' }, { createdAt: { $gte: from, $lte: to } });

  const toSeries = (raw, labels) =>
    businesses.map((b) =>
      labels.map((l) => {
        const hit = raw.find(
          (r) => String(r._id.businessId) === String(b._id) && String(r._id.key) === String(l)
        );
        return hit ? Number(hit.total.toFixed(2)) : 0;
      })
    );

  const monthLabels = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
  const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return json({
    tiles: {
      totalPurchase: { value: totalPurchaseCount, dynamic: true, note: 'GRC count' },
      totalSales: { value: Number((salesInvoiceTotal + posTotal).toFixed(2)), dynamic: true },
      purchaseDue: { value: STATIC_TILES.purchaseDue, dynamic: false },
      invoiceDue: { value: STATIC_TILES.invoiceDue, dynamic: false },
      expenses: { value: Number(expenses.toFixed(2)), dynamic: true },
    },
    last30: {
      labels: dayLabels.map((d) => d.slice(8)),
      series: toSeries(last30Raw, dayLabels).map((points, i) => ({
        name: seriesNames[i] || 'Business ' + (i + 1), points,
      })),
    },
    byMonth: {
      labels: monthLabels.map((m) => MONTH_NAMES[m]),
      series: toSeries(byMonthRaw, monthLabels).map((points, i) => ({
        name: seriesNames[i] || 'Business ' + (i + 1), points,
      })),
    },
  });
}

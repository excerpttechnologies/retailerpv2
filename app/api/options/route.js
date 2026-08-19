import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/session';

/* /api/options?ref=<name>&business=<id>
   Feeds every `ref` dropdown in the app. Replaces the `options` branch of the
   old /api/settings/[action] handler.

   This is a model index, not a page registry - it maps a dropdown's target
   name to a model file and the field to display. Nothing here renders a page. */

const json = (d, s = 200) => Response.json(d, { status: s });

const REFS = {
  business:                  { load: () => import('@/models/Business'), scoped: false },
  companylocations:          { load: () => import('@/models/CompanyLocation') },
  ledgergroups:              { load: () => import('@/models/LedgerGroup') },
  ledger:                    { load: () => import('@/models/Ledger') },
  docsetup:                  { load: () => import('@/models/DocSetup') },
  purchasegroup:             { load: () => import('@/models/PurchaseGroup') },
  stockpoint:                { load: () => import('@/models/StockPoint') },
  poscounter:                { load: () => import('@/models/PosCounter') },
  paymentmethod:             { load: () => import('@/models/PaymentMethod') },
  tax:                       { load: () => import('@/models/Tax') },
  hsn:                       { load: () => import('@/models/Hsn') },
  citygroup:                 { load: () => import('@/models/CityGroup') },
  barcodesetting:            { load: () => import('@/models/BarcodeSetting') },
  'purchase/master/charge':  { load: () => import('@/models/PurchaseCharge') },
  'purchase/master/term':    { load: () => import('@/models/PurchaseTerm') },
  'sales/master/term':       { load: () => import('@/models/SalesTerm') },

  'contact-type':            { load: () => import('@/models/ContactType') },
  supplier:                  { load: () => import('@/models/Contact'), kind: 'Supplier', label: 'businessName' },
  agent:                     { load: () => import('@/models/Contact'), kind: 'Agent', label: 'businessName' },
  customer:                  { load: () => import('@/models/Contact'), kind: 'Customer', label: 'businessName' },

  'product/filter':          { load: () => import('@/models/ProductFilter') },
  'product/group':           { load: () => import('@/models/ProductGroup') },
  uom:                       { load: () => import('@/models/Uom') },
  'attribute-addon':         { load: () => import('@/models/AttributeAddon') },
  item:                      { load: () => import('@/models/Item') },
  logistic:                  { load: () => import('@/models/Logistic') },
};

export async function GET(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const sp = new URL(req.url).searchParams;
  const ref = sp.get('ref');
  const entry = REFS[ref];
  if (!entry) return json({ options: [] });

  await dbConnect();

  const mod = await entry.load();
  const Model = mod.default;
  const label = entry.label || mod.LABEL_FIELD || 'name';

  const filter = {};
  if (entry.scoped !== false) {
    const b = sp.get('business');
    if (b && isValidObjectId(b)) filter.businessId = b;
  }
  if (entry.kind) filter.contactKind = entry.kind;

  /* typing in the control narrows server-side - the old endpoint pulled up to
     2000 rows and filtered in the browser, which does not survive 56k customers */
  const q = (sp.get('q') || '').trim();
  if (q) filter[label] = { $regex: escapeRegex(q), $options: 'i' };

  const rows = await Model.find(filter).sort({ [label]: 1 }).limit(200).lean();

  return json({
    options: rows.map((r) => ({ value: String(r._id), label: String(r[label] ?? '(untitled)') })),
  });
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

import DocSetup from '@/models/DocSetup';
import Counter, { counterKey, reserveSequence, ensureFloor } from '@/models/Counter';

/* ==========================================================================
   Document numbers, from the Doc Setup master:
   prefix + zero-padded running number, honouring Auto Number Length and
   Start From. Falls back to a plain sequence when no Doc Setup row exists,
   so a fresh install still saves.

   WHY THIS WAS REWRITTEN.

   The number used to be `start + countDocuments(matching prefix)`. Two
   separate failures came out of that:

     - Deleting a document reissued its number. With GRC/26/001 and
       GRC/26/002 on file, deleting 001 drops the count to 1 and the next GRC
       is issued 002 - a duplicate of a live document.
     - Two saves that overlap both read the same count and both get the same
       number. On a busy till or a shared warehouse screen that is not a
       remote possibility, it is a daily one.

   Numbers now come from an atomic counter (models/Counter.js): a single
   findOneAndUpdate with $inc, which the database serialises. Deleting a
   document no longer moves the counter, and two concurrent callers get two
   different numbers.

   MIGRATION IS AUTOMATIC. The first time a series is used after this change
   its counter does not exist, so the highest number already issued is read
   once and set as the floor. Numbering continues from there rather than
   restarting at 1. Nothing has to be run by hand.

   The scoping fixes from the previous version are kept: the series is per
   business and per financial year, and the Doc Setup lookup honours finYear.
   ========================================================================== */

export async function nextDocNumber(Model, field, docType, { businessId, locationId, finYear } = {}) {
  let prefix = '';
  let suffix = '';
  let pad = 4;
  let start = 1;
  let validity = 'Yearly';

  if (docType) {
    const setup = await DocSetup.findOne({
      documentType: docType,
      ...(businessId ? { businessId } : {}),
      ...(finYear ? { finYear } : {}),
      /* an inactive setup is ignored - retiring a series should not silently
         keep issuing numbers from it */
      status: { $ne: false },
    }).lean();

    if (setup) {
      prefix = expandTokens(setup.prefix || '', finYear);
      suffix = expandTokens(setup.suffix || '', finYear);
      pad = Number(setup.autoNumberLength) || 4;
      start = Number(setup.startFrom) || 1;
      validity = setup.validity || 'Yearly';
    }
  }

  /* ---- VALIDITY decides how often the running number restarts -----------

     The field has always been on the Doc Setup form (Never / Daily / Monthly
     / Yearly) but nothing read it: the counter key always carried finYear,
     so EVERY series reset each financial year regardless of what was
     configured - including the ones explicitly set to "Never".

     The period is part of the counter's identity, so a new period simply
     addresses a new counter and starts at `start`. Nothing has to run at
     midnight or at year end.

     A series that does not reset must not be scoped by finYear either, or
     "Never" would still restart in April. */
  const period = periodKey(validity, finYear);
  const scope = validity === 'Never' ? { businessId } : { businessId, finYear };

  /* the counter name carries the expanded prefix, so a Doc Setup change that
     alters the prefix mid-year starts that prefix's own series instead of
     continuing the old one's numbers under a new face */
  const name = 'doc:' + (docType || field) + ':' + (prefix || '-') + (period ? ':' + period : '');

  /* seedFloorOnce reads finYear off `scope`, which is exactly right here:
     a "Never" series has no finYear in its scope, so its floor is taken from
     the highest number ever issued under that prefix rather than from this
     year's alone. */
  await seedFloorOnce({ Model, field, prefix, name, scope, start });

  const seq = await reserveSequence(name, scope, 1);
  return prefix + String(seq).padStart(pad, '0') + suffix;
}

/* The slice of time a series restarts on.

     Never    - one continuous run, no period in the key
     Yearly   - the financial year already in the counter scope
     Monthly  - that year plus the calendar month
     Daily    - that year plus the date

   Monthly and Daily append to the financial year rather than replacing it,
   so two years' Januarys are different counters. */
function periodKey(validity, finYear) {
  const now = new Date();
  switch (validity) {
    case 'Never': return '';
    case 'Daily': return String(finYear || '') + ':' + now.toISOString().slice(0, 10);
    case 'Monthly': return String(finYear || '') + ':' + now.toISOString().slice(0, 7);
    case 'Yearly':
    default: return '';                 // finYear is already in the scope
  }
}

/* Next number in a prefixed series that does not come from Doc Setup - the
   GRT series, and anything else with a hard-coded prefix.

   Same guarantee as nextDocNumber: atomic, and seeded once from whatever is
   already on disk so an existing series continues rather than restarting. */
export async function nextSeriesNumber(Model, field, prefix, { scope = {}, pad = 3, start = 1 } = {}) {
  const name = 'series:' + prefix;
  const counterScope = { businessId: scope.businessId, locationId: scope.locationId, finYear: scope.finYear };

  await seedFloorOnce({ Model, field, prefix, name, scope: counterScope, start, extraFilter: scope });

  const seq = await reserveSequence(name, counterScope, 1);
  return prefix + String(seq).padStart(pad, '0');
}

/* Reserves a block of consecutive numbers in one call, for a screen that
   creates many documents at once. Returns an array of formatted numbers. */
export async function nextDocNumbers(Model, field, docType, scopeArgs = {}, count = 1) {
  const n = Math.max(1, Number(count) || 1);
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(await nextDocNumber(Model, field, docType, scopeArgs));
  return out;
}

/* ------------------------------------------------------------- internals -- */

/* Sets the counter's floor from the highest number already issued, but only
   the first time this series is seen. The check is a single indexed lookup on
   the counter, so the cost after migration is one small find per save. */
async function seedFloorOnce({ Model, field, prefix, name, scope, start, extraFilter = {} }) {
  const key = counterKey(name, scope);
  const existing = await Counter.findOne({ key }).select('_id').lean();
  if (existing) return;

  const rows = await Model.find({
    [field]: { $regex: '^' + escapeRegex(prefix) },
    ...(scope.businessId ? { businessId: scope.businessId } : {}),
    ...(scope.finYear ? { finYear: scope.finYear } : {}),
    ...(extraFilter.locationId ? { locationId: extraFilter.locationId } : {}),
  }).select(field).lean();

  const highest = rows.reduce((max, r) => {
    /* strip the prefix, then take the leading digits - a suffix after the
       number ("GRC/26/001-A") must not turn the parse into NaN */
    const tail = String(r[field] ?? '').slice(prefix.length);
    const n = parseInt(tail.match(/^\d+/)?.[0] ?? '', 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);

  /* Start From on the Doc Setup master is the number of the FIRST document,
     so the floor sits one below it. */
  await ensureFloor(name, scope, Math.max(highest, Math.max(0, (Number(start) || 1) - 1)));
}

/* [MMM] [YY] [YYYY] [FYY] [FYYYY] as documented on the Doc Setup add form */
function expandTokens(prefix, finYear) {
  const now = new Date();
  const fy = String(finYear || '');
  const [fyStart, fyEnd] = fy.split('-');

  return prefix
    .replace(/\[MMM\]/g, now.toLocaleString('en', { month: 'short' }))
    .replace(/\[YYYY\]/g, String(now.getFullYear()))
    .replace(/\[YY\]/g, String(now.getFullYear()).slice(2))
    .replace(/\[FYYYY\]/g, fy)
    .replace(/\[FYY\]/g, fyStart && fyEnd ? fyStart.slice(2) + '-' + fyEnd.slice(2) : fy);
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

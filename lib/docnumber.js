import DocSetup from '@/models/DocSetup';

/* Document numbers come from the Doc Setup master:
   prefix + zero-padded running number, honouring Auto Number Length and
   Start From. Falls back to a plain sequence when no Doc Setup row exists,
   so a fresh install still saves.

   Two bugs from the original are fixed here:
     - the count wasn't scoped by business or financial year, so two
       businesses sharing a prefix interleaved their numbering
     - the Doc Setup lookup ignored finYear and picked any year's row */

export async function nextDocNumber(Model, field, docType, { businessId, locationId, finYear } = {}) {
  let prefix = '';
  let pad = 4;
  let start = 1;

  if (docType) {
    const setup = await DocSetup.findOne({
      documentType: docType,
      ...(businessId ? { businessId } : {}),
      ...(finYear ? { finYear } : {}),
    }).lean();

    if (setup) {
      prefix = expandTokens(setup.prefix || '', finYear);
      pad = Number(setup.autoNumberLength) || 4;
      start = Number(setup.startFrom) || 1;
    }
  }

  /* scoped, so each tenant/year runs its own series */
  const used = await Model.countDocuments({
    [field]: { $regex: '^' + escapeRegex(prefix) },
    ...(businessId ? { businessId } : {}),
    ...(finYear ? { finYear } : {}),
  });

  return prefix + String(start + used).padStart(pad, '0');
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

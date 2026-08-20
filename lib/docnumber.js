// import DocSetup from '@/models/DocSetup';

// /* Document numbers come from the Doc Setup master:
//    prefix + zero-padded running number, honouring Auto Number Length and
//    Start From. Falls back to a plain sequence when no Doc Setup row exists,
//    so a fresh install still saves.

//    Two bugs from the original are fixed here:
//      - the count wasn't scoped by business or financial year, so two
//        businesses sharing a prefix interleaved their numbering
//      - the Doc Setup lookup ignored finYear and picked any year's row */

// export async function nextDocNumber(Model, field, docType, { businessId, locationId, finYear } = {}) {
//   let prefix = '';
//   let pad = 4;
//   let start = 1;

//   if (docType) {
//     const setup = await DocSetup.findOne({
//       documentType: docType,
//       ...(businessId ? { businessId } : {}),
//       ...(finYear ? { finYear } : {}),
//     }).lean();

//     if (setup) {
//       prefix = expandTokens(setup.prefix || '', finYear);
//       pad = Number(setup.autoNumberLength) || 4;
//       start = Number(setup.startFrom) || 1;
//     }
//   }

//   /* scoped, so each tenant/year runs its own series */
//   const used = await Model.countDocuments({
//     [field]: { $regex: '^' + escapeRegex(prefix) },
//     ...(businessId ? { businessId } : {}),
//     ...(finYear ? { finYear } : {}),
//   });

//   return prefix + String(start + used).padStart(pad, '0');
// }

// /* [MMM] [YY] [YYYY] [FYY] [FYYYY] as documented on the Doc Setup add form */
// function expandTokens(prefix, finYear) {
//   const now = new Date();
//   const fy = String(finYear || '');
//   const [fyStart, fyEnd] = fy.split('-');

//   return prefix
//     .replace(/\[MMM\]/g, now.toLocaleString('en', { month: 'short' }))
//     .replace(/\[YYYY\]/g, String(now.getFullYear()))
//     .replace(/\[YY\]/g, String(now.getFullYear()).slice(2))
//     .replace(/\[FYYYY\]/g, fy)
//     .replace(/\[FYY\]/g, fyStart && fyEnd ? fyStart.slice(2) + '-' + fyEnd.slice(2) : fy);
// }

// function escapeRegex(s) {
//   return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// }









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

/* Next number in a prefixed series, derived from the HIGHEST number already
   issued rather than from a count of them.

   Counting is wrong as soon as anything is deleted: with DSP/26/001 and
   DSP/26/002 on file, deleting 001 leaves a count of 1, so the next document
   is issued 002 - a duplicate of a live one. Taking the maximum can only ever
   reuse a number whose document no longer exists, and only when it was the
   most recent.

   Still not safe against two simultaneous inserts; that needs a counter
   collection or a unique index, and is noted rather than solved here. */
export async function nextSeriesNumber(Model, field, prefix, { scope = {}, pad = 3 } = {}) {
  const rows = await Model.find({
    [field]: { $regex: '^' + escapeRegex(prefix) },
    ...scope,
  }).select(field).lean();

  const highest = rows.reduce((max, r) => {
    const n = parseInt(String(r[field]).slice(prefix.length), 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);

  return prefix + String(highest + 1).padStart(pad, '0');
}
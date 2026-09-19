/* Matches the photos in the top-level "images db" folder to barcodeLabel rows
   by barcodeNo (file "4A1001.jpg" -> barcodeNo "4A1001") and stamps imageUrl
   with the SAME absolute URL shape the mobile backend already writes there:

     http://wovenessencemobile.etpl.ai/uploads/itemsbarcodeimage/<file name>

   This does not upload anything - it only writes that URL string onto the
   matching row(s), on the assumption the file of that name already exists (or
   will exist) at that path on wovenessencemobile.etpl.ai. If it does not, the
   thumbnail in Master Stock Report will 404 exactly like a dead link, the
   same failure mode seedBarcodeImages.mjs guards against for the August
   presigned-URL set.

   What it will not do
   -------------------
   Overwrite an imageUrl that is already set - UNLESS --force is passed. Without
   it, only rows with an empty imageUrl are touched, so a photo already on file
   (whatever its source) is left alone. --force writes the folder's URL onto
   every matched row regardless of what is stored there now (the prior value
   is still saved to the backup file first, so it is one $set away from being
   put back).

     npm run seed:barcode-images-folder                  # dry run, changes nothing
     npm run seed:barcode-images-folder:apply             # writes empty imageUrl rows only
     npm run seed:barcode-images-folder:apply -- --force  # also overwrites rows that already have one

   Options
     --dir=<name>   folder to read, relative to the project root
                    (default "images db")
     --force        overwrite an imageUrl that is already set, not just a blank one
*/

import mongoose from 'mongoose';
import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const DIR_NAME = arg('dir') || 'images db';
const BASE_URL = 'http://wovenessencemobile.etpl.ai/uploads/itemsbarcodeimage/';

const URI = process.env.MONGODB_URI;
if (!URI) {
  console.error('MONGODB_URI is not set. Run with: node --env-file=.env scripts/seedBarcodeImagesFromFolder.mjs');
  process.exit(1);
}

const ROOT = process.cwd();
const DIR = path.join(ROOT, DIR_NAME);
if (!existsSync(DIR)) { console.error('No such folder: ' + DIR); process.exit(1); }

const up = (v) => String(v || '').trim().toUpperCase();
const escapeRx = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ------------------------------------------------------------------ disk -- */

const files = readdirSync(DIR).filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f));
const byStem = new Map();
for (const file of files) byStem.set(up(file.replace(/\.[^.]+$/, '')), file);
console.log(`Folder   : ${DIR_NAME}`);
console.log(`Images   : ${files.length}${files.length !== byStem.size ? `  (${files.length - byStem.size} duplicate stems ignored)` : ''}`);

await mongoose.connect(URI);
const rowsCol = mongoose.connection.db.collection('barcodeLabel');

/* --------------------------------------------------------------- matching --
   barcodeNo has no fixed case in the data (screenshots show "8A4288" and
   "9A1167"), so each stem is matched with a case-insensitive, anchored
   regex rather than a plain $in. */

const stems = [...byStem.keys()];
const candidates = stems.length
  ? await rowsCol.find({
    $or: stems.map((s) => ({ barcodeNo: { $regex: `^${escapeRx(s)}$`, $options: 'i' } })),
  }).toArray()
  : [];

const fileFor = (r) => byStem.get(up(r.barcodeNo)) || null;
const urlFor = (file) => BASE_URL + file;

const toFill = [];
const alreadyHave = [];
for (const r of candidates) {
  const file = fileFor(r);
  if (!file) continue;
  const stored = String(r.imageUrl || '').trim();
  if (!stored || FORCE) { toFill.push({ r, url: urlFor(file), stored }); continue; }
  alreadyHave.push({ r, stored });
}

const usedStems = new Set(candidates.map((r) => up(r.barcodeNo)));
const unused = stems.filter((s) => !usedStems.has(s));

console.log(`Barcodes : ${usedStems.size} of ${byStem.size} images match at least one barcode row`);
console.log(`Rows     : ${candidates.length} row(s) carry one of those barcodes`);
console.log(`  to write (${FORCE ? 'empty or overwriting existing, --force is on' : 'image currently empty'}) : ${toFill.length}`);
console.log(`  left alone (already has a photo): ${alreadyHave.length}`);

if (alreadyHave.length) {
  console.log('\n--- LEFT ALONE, imageUrl already set ---');
  alreadyHave.slice(0, 6).forEach(({ r, stored }) =>
    console.log(`  ${String(r.barcodeNo).padEnd(10)} ${stored.slice(0, 70)}${stored.length > 70 ? '...' : ''}`));
  if (alreadyHave.length > 6) console.log(`  ... and ${alreadyHave.length - 6} more`);
}

if (unused.length) {
  console.log(`\n--- ${unused.length} IMAGE(S) WITH NO MATCHING barcodeNo ROW ---`);
  console.log('  ' + unused.slice(0, 30).join(', ') + (unused.length > 30 ? ` ... +${unused.length - 30}` : ''));
}

if (!toFill.length) {
  console.log('\nNothing to write - every matched row already has an imageUrl, or nothing matched.');
  await mongoose.disconnect();
  process.exit(0);
}

console.log('\n--- WOULD WRITE ---');
toFill.slice(0, 30).forEach(({ r, url, stored }) =>
  console.log(`  ${String(r.barcodeNo).padEnd(10)} ${stored ? `${stored.slice(0, 40)}... -> ` : '(empty) -> '}${url}`));
if (toFill.length > 30) console.log(`  ... ${toFill.length - 30} more`);

if (!APPLY) {
  console.log(`\nDRY RUN - ${toFill.length} row(s) would get an imageUrl.`);
  console.log('Re-run with --apply to write.');
  await mongoose.disconnect();
  process.exit(0);
}

/* ------------------------------------------------------------------ apply -- */

const dir = path.join(ROOT, 'backups');
mkdirSync(dir, { recursive: true });
const backupFile = path.join(dir, `barcode-images-folder-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
writeFileSync(backupFile, JSON.stringify(toFill.map(({ r, url }) => ({
  _id: r._id, barcodeNo: r.barcodeNo, imageUrl: r.imageUrl ?? null, willBeSetTo: url,
})), null, 2));
console.log(`\nBackup written: ${backupFile}`);

const result = await rowsCol.bulkWrite(toFill.map(({ r, url }) => ({
  updateOne: { filter: { _id: r._id }, update: { $set: { imageUrl: url } } },
})), { ordered: false });
console.log(`imageUrl set on ${result.modifiedCount} row(s) (matched ${result.matchedCount})`);

await mongoose.disconnect();

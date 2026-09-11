/* Import historical Goods Receipt Challans from the scraped workbook.

   WHAT IT WRITES, AND WHERE

     "GRC Summary"        -> grc            (models/Grc.js)
     "Item With Barcode"  -> barcodeLabel   (lib/barcodeLabel.js), grcId-linked
     "Item Summary"       -> NOTHING. It is DERIVED.

   That last point is the important one. The GRC detail screen builds its
   Summary tab from the barcode rows it already has:

       beforeGst = (finalNet || purRate) * qty
       gstAmount = beforeGst * gst / 100
       netAmount = beforeGst + gstAmount

   Importing the Item Summary sheet as its own records would create a second,
   divergent copy of numbers the UI already computes. So the sheet is parsed
   only to CHECK the import - every imported GRC's derived totals are compared
   against it, and a mismatch is reported.

   THE HEADER ROW OF "Item With Barcode" IS MISALIGNED.

   The scrape lost several column names, so the header sits one column to the
   left of its data - the cell labelled "Code" is above the serial number, and
   the real barcode is one further right. Reading by header name here would
   silently import the wrong column into every field.

   So that sheet is read BY POSITION, from the explicit map below, and every
   row is checked arithmetically (finalRate x qty must equal beforeTax). If
   enough rows fail that check the layout has changed and the import aborts
   rather than writing rubbish. The other two sheets have clean headers and
   are read by name.

   SAFE BY DEFAULT - reports and exits. Pass --apply to write. Idempotent:
   re-running updates the same records rather than duplicating them.

     npm run seed:grc          dry run
     npm run seed:grc:apply    write
     npm run seed:grc:apply -- --no-stock    write, but create no stock

   FOLDER MODE (--dir): the item detail for GRCs that were imported as
   headers only, from a folder of one-workbook-per-GRC exports ("purchase
   excels"). See "folder mode" near the end of this file.

     npm run seed:grc:folder                         dry run
     npm run seed:grc:folder:apply -- --file 05074   write one file

   Paths come from GRC_EXCEL_PATH / GRC_EXCEL_DIR / GRC_BARCODE_IMAGE_DIR,
   defaulting to the repository-relative locations - no absolute personal
   paths in the code. The workbooks and the images are only ever READ.
*/

import path from 'path';
import { readdirSync, existsSync, writeFileSync } from 'fs';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
/* the ERP's own purchase-price rule, not a copy of it */
import { purchasePriceError } from '../lib/purchasePrice.js';

const APPLY = process.argv.includes('--apply');
const NO_STOCK = process.argv.includes('--no-stock');
/* "--flag value" -> value; "--flag" alone -> ''; absent -> null */
function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : '';
}
/* --dir [folder]: folder mode. --file <text>: only the file(s) whose name
   contains it. --force: fill a GRC even when its totals or supplier do not
   agree with the file - for a human who has checked, never a default. */
const DIR_ARG = argValue('--dir');
const FILE_FILTER = argValue('--file');
const FORCE = process.argv.includes('--force');
/* --repair: fix the CHILDREN of GRCs that already exist, and create no
   headers. For when a later export finally carries the item detail that an
   earlier one was missing - the headers are already right, only the barcode
   rows need filling in. Safe to run against a live database: it never
   inserts, updates or deletes a GRC header. */
const REPAIR = process.argv.includes('--repair');
const ROOT = process.cwd();
/* folder mode's folder: --dir <path>, else GRC_EXCEL_DIR, else "purchase
   excels" beside the project; null when --dir was not given at all */
const DIR = DIR_ARG === null ? null : (DIR_ARG || process.env.GRC_EXCEL_DIR || path.join(ROOT, 'purchase excels'));

const EXCEL_PATH = process.env.GRC_EXCEL_PATH || path.join(ROOT, 'grc_full_scrape (1).xlsx');
const IMAGE_DIR = process.env.GRC_BARCODE_IMAGE_DIR || path.join(ROOT, 'public', 'august_8A_images');
/* public/ is served at the site root by Next, so a file on disk at
   public/august_8A_images/X.jpg is reachable at /august_8A_images/X.jpg.
   lib/inventory.js imageUrl() passes a value starting with "/" through
   unchanged, so this needs no upload and no second storage system. */
const IMAGE_URL_BASE = '/august_8A_images';

const URI = process.env.MONGODB_URI;
if (!URI) { console.error('MONGODB_URI is not set. Run with --env-file=.env'); process.exit(1); }

/* ---- "Item With Barcode" column positions ------------------------------
   Derived by reading the data, not the header, and confirmed against the
   Item Summary sheet: GRC 05158 / SRB -> qty 401.00, before-tax 31462.46,
   GST 1573.12, net 33035.58 all reconcile exactly. RSP/WSP/DP additionally
   check out as purchase rate x1.15 and x1.30. */
const C = {
  grcNo: 4, slNo: 5, code: 6, name: 7, hsn: 8, gstSlab: 9, uom: 10,
  qty: 11, cuts: 12, purchaseRate: 13, discountPct: 14, roundOff: 15,
  finalRate: 16, beforeTax: 17, igst: 18, cgst: 19, sgst: 20,
  netAmount: 21, rsp: 22, wsp: 23, dp: 24,
};

const report = {
  startedAt: new Date().toISOString(), mode: APPLY ? 'apply' : 'dry-run',
  sheets: {}, grc: { processed: 0, inserted: 0, updated: 0, skipped: 0 },
  barcodes: { processed: 0, inserted: 0, updated: 0, skipped: 0 },
  images: { onDisk: 0, matched: 0, missing: 0, missingList: [], unused: 0 },
  vendors: { matched: 0, unmatched: 0, unmatchedList: [] },
  duplicates: { grcNumbers: [], barcodes: [] },
  summaryCheck: { compared: 0, agreed: 0, mismatched: [] },
  coverage: { withItems: 0, withoutItems: 0, missingList: [] },
  errors: [], warnings: [],
};

const err = (o) => { report.errors.push(o); };
const warn = (m) => { report.warnings.push(m); };

/* ---------------------------------------------------------------- helpers */

/* Business identifiers stay STRINGS. "05158" must never become 5158 - the
   workbook is read with raw:true so xlsx does not coerce, and every id is
   trimmed rather than parsed. */
const text = (v) => (v === null || v === undefined ? '' : String(v).trim());

/* Money and quantities. Empty means absent, not zero - a blank discount and a
   0.00 discount are different statements, though both store as 0 here
   because the schema has no null. */
function num(v) {
  /* the "purchase excels" exports write some amounts as "₹7,250.00" text */
  const s = text(v).replace(/[,₹\s]/g, '');
  if (s === '') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/* "31-08-2026" is DD-MM-YYYY. Parsed explicitly: Date.parse() reads that as
   an invalid date on some runtimes and as MM-DD on others, which would turn
   31 August into a silent failure and 02-09 into 9 February. Excel serials
   are handled too, in case a future export writes real dates. */
function parseDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? new Date(Date.UTC(d.y, d.m - 1, d.d)) : null;
  }
  const s = text(v);
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  return null;
}

/* Indian financial year, April to March: 31-08-2026 -> "2026-2027".
   Derived from each GRC's own date rather than hardcoded, so a workbook
   spanning a year boundary lands its records in the right years. */
function finYearOf(date) {
  if (!date) return '';
  const y = date.getUTCFullYear();
  const startYear = date.getUTCMonth() + 1 >= 4 ? y : y - 1;
  return `${startYear}-${startYear + 1}`;
}

/* "P S Fabrics, SALEM [G1280]" -> { name, code }. The bracketed code is the
   contact's own contactId and is the reliable half - names carry commas,
   cities and inconsistent casing. */
function parseVendor(cell) {
  const s = text(cell);
  const m = s.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
  return m ? { name: m[1].trim(), code: m[2].trim() } : { name: s, code: '' };
}

/* "GST 5 %" -> 5. Also copes with "5", "5%", "GST 12.5%". */
function gstPercent(cell) {
  const m = text(cell).match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

/* Barcodes are matched case-insensitively but stored exactly as the workbook
   has them. Nothing is stripped: leading zeroes, letters and separators are
   all meaningful in a barcode. */
const normBarcode = (v) => text(v).toUpperCase();

/* 'PC' | 'MTR', by the same matcher the barcode engine uses, so a unit
   imported here means the same thing everywhere else. */
const METER_RX = /(^|[^a-z])(mtr|mts|meter|metre|meters|metres)([^a-z]|$)/i;
const uomTypeOf = (u) => (METER_RX.test(text(u)) ? 'MTR' : 'PC');

const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

/* ================================================================= main == */

async function main() {
  /* folder mode is its own flow - see "folder mode" below */
  if (DIR !== null) return runFolder();

  console.log(APPLY
    ? (REPAIR ? '=== APPLYING (REPAIR: children only, no headers created or changed) ==='
      : '=== APPLYING ===')
    : (REPAIR ? '=== DRY RUN - REPAIR MODE (pass --apply to write) ==='
      : '=== DRY RUN (pass --apply to write) ==='));

  if (!existsSync(EXCEL_PATH)) { console.error('Workbook not found: ' + EXCEL_PATH); process.exit(1); }
  console.log('workbook :', EXCEL_PATH);
  console.log('images   :', existsSync(IMAGE_DIR) ? IMAGE_DIR : IMAGE_DIR + '  (MISSING - items will import without images)');

  /* ---------------------------------------------------------- 1. images */
  const imageIndex = buildImageIndex();
  report.images.onDisk = imageIndex.size;
  console.log(`\nimage index: ${imageIndex.size} file(s)`);

  /* ------------------------------------------------------- 2. workbook */
  const wb = XLSX.readFile(EXCEL_PATH, { raw: true });
  console.log('sheets     :', wb.SheetNames.join(', '));

  const grcRows = sheetByHeader(wb, 'GRC Summary');
  const itemRows = sheetByIndex(wb, 'Item With Barcode');
  const sumRows = sheetByHeader(wb, 'Item Summary');
  report.sheets = {
    'GRC Summary': grcRows.length,
    'Item With Barcode': itemRows.length,
    'Item Summary': sumRows.length,
  };
  console.log(`rows       : GRC Summary ${grcRows.length}, Item With Barcode ${itemRows.length}, Item Summary ${sumRows.length}`);

  /* ------------------------------------------------- 3. parse the items */
  const { items, layoutOk } = parseItems(itemRows);
  if (!layoutOk) {
    console.error('\nABORTED: the "Item With Barcode" columns do not line up with the expected layout.');
    console.error('The workbook format has changed. Update the C{} map in this script before importing.');
    process.exit(1);
  }
  const itemsByGrc = new Map();
  items.forEach((it) => {
    if (!itemsByGrc.has(it.grcNo)) itemsByGrc.set(it.grcNo, []);
    itemsByGrc.get(it.grcNo).push(it);
  });

  /* duplicate barcodes across the whole workbook */
  const seenBarcode = new Map();
  items.forEach((it) => {
    const k = normBarcode(it.code);
    if (!k) return;
    if (seenBarcode.has(k)) report.duplicates.barcodes.push(k);
    else seenBarcode.set(k, it.grcNo);
  });

  /* ------------------------------------------------ 4. parse the headers */
  const headers = parseHeaders(grcRows);
  const seenGrc = new Set();
  headers.forEach((h) => {
    if (seenGrc.has(h.grcNumber)) report.duplicates.grcNumbers.push(h.grcNumber);
    seenGrc.add(h.grcNumber);
  });

  /* ------------------------------------------------------- 5. the scope */
  await mongoose.connect(URI);
  const db = mongoose.connection.db;
  const scope = await resolveScope(db);
  console.log(`\nscope      : ${scope.businessName} / ${scope.locationName}`);

  /* --------------------------------------------------------- 6. vendors */
  const vendorIndex = await buildVendorIndex(db, scope.businessId);
  console.log(`vendors    : ${vendorIndex.byCode.size} supplier(s) in this business`);

  /* -------------------------------------------------------- 7. assemble */
  const planned = [];
  for (const h of headers) {
    const its = itemsByGrc.get(h.grcNumber) || [];
    const vendor = resolveVendor(vendorIndex, h.vendor);

    if (vendor) report.vendors.matched += 1;
    else if (h.vendor.name || h.vendor.code) {
      report.vendors.unmatched += 1;
      report.vendors.unmatchedList.push(`${h.vendor.name} [${h.vendor.code}] (GRC ${h.grcNumber})`);
    }

    /* Which GRCs the workbook actually carries item rows for. A header with
       no items is not an import failure - it is an incomplete export - and
       the difference decides whether someone needs to re-scrape. */
    if (its.length) report.coverage.withItems += 1;
    else {
      report.coverage.withoutItems += 1;
      report.coverage.missingList.push({ grcNumber: h.grcNumber, totalQuantity: h.totalQuantity });
    }

    planned.push({ header: h, items: its, vendor });
  }

  /* image matching, once the item list is final */
  items.forEach((it) => {
    const hit = imageIndex.get(normBarcode(it.code));
    if (hit) { it.imageUrl = `${IMAGE_URL_BASE}/${hit}`; report.images.matched += 1; }
    else {
      it.imageUrl = '';
      report.images.missing += 1;
      if (report.images.missingList.length < 500) report.images.missingList.push(it.code);
    }
  });
  const usedImages = new Set(items.filter((i) => i.imageUrl).map((i) => normBarcode(i.code)));
  report.images.unused = imageIndex.size - usedImages.size;

  /* the Item Summary cross-check */
  crossCheckSummary(sumRows, itemsByGrc);

  preview(planned);
  printReport();

  if (!APPLY) {
    writeReport();
    console.log('\nDry run complete - nothing was written.');
    await mongoose.disconnect();
    return;
  }

  /* ---------------------------------------------------------- 8. import */
  await importAll(db, planned, scope);
  printCounts();
  writeReport();
  await mongoose.disconnect();
  console.log('\nImport complete.');
}

/* ============================================================== parsing == */

function sheetByHeader(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) { warn(`sheet "${name}" is not in the workbook`); return []; }
  return XLSX.utils.sheet_to_json(ws, { raw: true, defval: null });
}

function sheetByIndex(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) { warn(`sheet "${name}" is not in the workbook`); return []; }
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  return rows.slice(1);              // the header row is unusable - see the note above
}

/* Header names arrive with stray spacing and casing; normalise before use. */
const normHeader = (h) => text(h).toLowerCase().replace(/[^a-z0-9]/g, '');
function pick(row, ...names) {
  const want = names.map(normHeader);
  for (const key of Object.keys(row)) {
    if (want.includes(normHeader(key))) return row[key];
  }
  return undefined;
}

function parseHeaders(rows) {
  const out = [];
  rows.forEach((row, i) => {
    const grcNumber = text(pick(row, 'GRC No (resolved)', 'GRC NO', 'GRC No'));
    if (!grcNumber) { report.grc.skipped += 1; return; }   // blank / artifact row

    const date = parseDate(pick(row, 'GRC Date'));
    if (!date) {
      err({ sheet: 'GRC Summary', row: i + 2, grc: grcNumber, field: 'GRC Date',
        reason: `unparseable date "${text(pick(row, 'GRC Date'))}"` });
    }

    out.push({
      grcNumber,
      grcDate: date,
      finYear: finYearOf(date),
      vendor: parseVendor(pick(row, 'Vendor Name')),
      logisticNo: text(pick(row, 'Logistic No')),
      purchaseGroup: text(pick(row, 'Purchase Group')),
      occasion: text(pick(row, 'Occasion')),
      agent: text(pick(row, 'Agent')),
      vendorDocNo: text(pick(row, 'Vendor Doc No')),
      procurementType: text(pick(row, 'Procurement Type')),
      /* the workbook's "Purchase Term" holds Before/After Tax, which is what
         the Grc schema calls freightMode - purchaseTermId is a different,
         master-backed field and is deliberately left unset */
      purchaseTerm: text(pick(row, 'Purchase Term')),
      taxable: num(pick(row, 'Taxable')),
      totalQuantity: num(pick(row, 'Total Quantity')),
      gst: num(pick(row, 'GST')),
      netAmount: num(pick(row, 'Net Amount')),
      pcsTotal: num(pick(row, 'pcs_total')),
      mtrTotal: num(pick(row, 'mtr_total')),
      sourceRow: i + 2,
    });
    report.grc.processed += 1;
  });
  return out;
}

function parseItems(rows) {
  const out = [];
  let checked = 0;
  let agreed = 0;

  rows.forEach((r, i) => {
    const rowNo = i + 2;
    const grcNo = text(r[C.grcNo]);
    const code = text(r[C.code]);

    /* a row carrying only a GRC number is a group header the scrape left in */
    if (!code) { if (grcNo) report.barcodes.skipped += 1; return; }
    if (!grcNo) {
      err({ sheet: 'Item With Barcode', row: rowNo, barcode: code, field: 'GRC No', reason: 'missing' });
      return;
    }

    const qty = num(r[C.qty]);
    const purchaseRate = num(r[C.purchaseRate]);
    const finalRate = num(r[C.finalRate]);
    const beforeTax = num(r[C.beforeTax]);

    if (Number.isNaN(qty) || Number.isNaN(finalRate)) {
      err({ sheet: 'Item With Barcode', row: rowNo, grc: grcNo, barcode: code,
        field: Number.isNaN(qty) ? 'Qty' : 'Final Rate', reason: 'not a number' });
      return;
    }

    /* THE LAYOUT GUARD. finalRate x qty must reproduce beforeTax. If the
       columns ever shift, this stops agreeing and the import refuses to
       write - which is the whole reason a positional read is acceptable. */
    if (beforeTax > 0) {
      checked += 1;
      if (Math.abs(finalRate * qty - beforeTax) <= Math.max(0.5, beforeTax * 0.001)) agreed += 1;
    }

    out.push({
      grcNo, code,
      slNo: text(r[C.slNo]),
      name: text(r[C.name]),
      hsn: text(r[C.hsn]),
      gstPct: gstPercent(r[C.gstSlab]),
      uom: text(r[C.uom]),
      qty,
      cuts: text(r[C.cuts]),
      purchaseRate, finalRate, beforeTax,
      discountPct: num(r[C.discountPct]),
      roundOff: num(r[C.roundOff]),
      igst: num(r[C.igst]), cgst: num(r[C.cgst]), sgst: num(r[C.sgst]),
      netAmount: num(r[C.netAmount]),
      rsp: num(r[C.rsp]), wsp: num(r[C.wsp]), dp: num(r[C.dp]),
      sourceRow: rowNo,
    });
    report.barcodes.processed += 1;
  });

  const ratio = checked ? agreed / checked : 1;
  console.log(`\nlayout check: ${agreed}/${checked} rows reconcile (finalRate x qty = beforeTax)`);
  return { items: out, layoutOk: ratio >= 0.9 };
}

/* The workbook's own Item Summary versus what the GRC screen will compute
   from the barcode rows this import creates. They must agree, or one of the
   two is being read wrongly. */
function crossCheckSummary(sumRows, itemsByGrc) {
  const wanted = new Map();
  sumRows.forEach((row) => {
    const grc = text(pick(row, 'GRC No'));
    if (!grc) return;
    const cur = wanted.get(grc) || { qty: 0, before: 0, gst: 0, net: 0 };
    cur.qty += num(pick(row, 'QTY'));
    cur.before += num(pick(row, 'Before GST Amount'));
    cur.gst += num(pick(row, 'GST Amount'));
    cur.net += num(pick(row, 'Net Amount'));
    wanted.set(grc, cur);
  });

  wanted.forEach((want, grc) => {
    const its = itemsByGrc.get(grc);
    if (!its || !its.length) return;
    report.summaryCheck.compared += 1;

    /* exactly the arithmetic the detail screen uses */
    const got = its.reduce((a, it) => {
      const before = (it.finalRate || it.purchaseRate) * it.qty;
      const gst = before * (it.gstPct / 100);
      return { qty: a.qty + it.qty, before: a.before + before, gst: a.gst + gst, net: a.net + before + gst };
    }, { qty: 0, before: 0, gst: 0, net: 0 });

    const off = (a, b) => Math.abs(a - b) > Math.max(1, Math.abs(b) * 0.001);
    if (off(got.qty, want.qty) || off(got.before, want.before) || off(got.net, want.net)) {
      report.summaryCheck.mismatched.push({
        grc,
        workbook: { qty: r2(want.qty), before: r2(want.before), net: r2(want.net) },
        derived: { qty: r2(got.qty), before: r2(got.before), net: r2(got.net) },
      });
    } else {
      report.summaryCheck.agreed += 1;
    }
  });
}

/* ================================================================ lookup == */

function buildImageIndex() {
  const map = new Map();
  if (!existsSync(IMAGE_DIR)) return map;
  /* scanned ONCE into a map - the alternative, re-scanning per row, is
     O(rows x files) and pointless */
  for (const file of readdirSync(IMAGE_DIR)) {
    const m = file.match(/^(.*)\.(jpe?g|png|webp)$/i);
    if (!m) continue;
    const key = normBarcode(m[1]);
    if (map.has(key)) warn(`two image files share barcode ${key}: ${map.get(key)} and ${file}`);
    else map.set(key, file);
  }
  return map;
}

async function resolveScope(db) {
  /* Not hardcoded: the main branch is the one flagged isMainBranch, which is
     the same rule ScopeContext uses to preselect the business. Both halves
     can be overridden for a different install. */
  const bizId = process.env.GRC_BUSINESS_ID;
  const business = bizId
    ? await db.collection('business').findOne({ _id: new mongoose.Types.ObjectId(bizId) })
    : (await db.collection('business').findOne({ isMainBranch: true })
      || await db.collection('business').findOne({}));
  if (!business) throw new Error('No business found - seed the Business master first.');

  const locId = process.env.GRC_LOCATION_ID;
  const location = locId
    ? await db.collection('companylocation').findOne({ _id: new mongoose.Types.ObjectId(locId) })
    : (await db.collection('companylocation').findOne({ businessId: business._id, name: /warehouse/i })
      || await db.collection('companylocation').findOne({ businessId: business._id }));
  if (!location) throw new Error('No location found for that business.');

  return {
    businessId: business._id, businessName: business.name,
    locationId: location._id, locationName: location.name,
  };
}

async function buildVendorIndex(db, businessId) {
  const rows = await db.collection('contact')
    .find({ contactKind: 'Supplier', businessId })
    .project({ contactId: 1, businessName: 1, firstName: 1, lastName: 1 }).toArray();

  const byCode = new Map();
  const byName = new Map();
  rows.forEach((r) => {
    const code = text(r.contactId).toUpperCase();
    if (code) byCode.set(code, r);
    const name = text(r.businessName) || [r.firstName, r.lastName].filter(Boolean).join(' ');
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key && !byName.has(key)) byName.set(key, r);
  });
  return { byCode, byName };
}

/* Code first, name only as a fallback - §17: do not rely on name matching
   when a stable identifier exists. A vendor that resolves to neither is
   LEFT NULL AND REPORTED, never invented: the GRC create route requires a
   real supplier and never creates one, so inventing vendors here would
   contradict the application's own rule. */
function resolveVendor(index, vendor) {
  if (vendor.code) {
    const hit = index.byCode.get(vendor.code.toUpperCase());
    if (hit) return hit;
  }
  if (vendor.name) {
    const key = vendor.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hit = index.byName.get(key);
    if (hit) return hit;
  }
  return null;
}

/* ================================================================ import == */

async function importAll(db, planned, scope) {
  const grcColl = db.collection('grc');
  const bcColl = db.collection('barcodeLabel');
  const mvColl = db.collection('stockmovement');

  for (const { header: h, items, vendor } of planned) {
    /* IDEMPOTENCY KEY: business + financial year + GRC number. Re-running
       updates the same header instead of creating a second one. */
    const key = { businessId: scope.businessId, finYear: h.finYear, grcNumber: h.grcNumber };
    const existing = await grcColl.findOne(key);

    const doc = {
      ...key,
      locationId: scope.locationId,
      supplierId: vendor ? vendor._id : null,
      grcDate: h.grcDate,
      vendorDocNo: h.vendorDocNo,
      occasion: h.occasion,
      /* the workbook's Purchase Term is Before/After Tax = freightMode */
      freightMode: /before/i.test(h.purchaseTerm) ? 'Before Tax' : 'After Tax',
      stockPointName: 'Warehouse',
      taxable: h.taxable,
      totalQuantity: h.totalQuantity,
      gst: h.gst,
      netAmount: h.netAmount,
      vendorGstNo: '',
      /* provenance, so an imported record is always distinguishable from one
         raised in the app */
      importedFrom: 'grc_full_scrape',
      importedAt: new Date(),
      /* free-text values with no master behind them are kept rather than
         dropped - purchaseGroupId/agentId/logisticId are ObjectId paths and
         would reject these strings */
      importMeta: {
        vendorName: h.vendor.name, vendorCode: h.vendor.code,
        purchaseGroup: h.purchaseGroup, agent: h.agent,
        logisticNo: h.logisticNo, procurementType: h.procurementType,
        purchaseTerm: h.purchaseTerm,
        pcsTotal: h.pcsTotal, mtrTotal: h.mtrTotal,
      },
      updatedAt: new Date(),
    };

    let grcId;
    if (existing) {
      /* repair leaves the header exactly as it is - only children are its
         business, so a hand-corrected header is never overwritten */
      if (!REPAIR) {
        await grcColl.updateOne({ _id: existing._id }, { $set: doc });
        report.grc.updated += 1;
      }
      grcId = existing._id;
    } else {
      if (REPAIR) {
        /* repair never creates a GRC - a header missing in repair mode is a
           gap worth reporting, not something to silently invent */
        report.grc.skipped += 1;
        report.warnings.push(`repair: GRC ${h.grcNumber} has no header in the database - skipped`);
        continue;
      }
      const res = await grcColl.insertOne({ ...doc, items: [], voucherRows: [], createdAt: new Date() });
      grcId = res.insertedId;
      report.grc.inserted += 1;
    }

    /* in repair mode a GRC the workbook has no items for is left untouched -
       otherwise a truncated export would look like a reason to wipe children
       that a fuller export had already supplied */
    if (REPAIR && items.length === 0) continue;

    /* ---- barcode rows -------------------------------------------------
       Key: grcId + barcodeNo, so a re-run updates each unit in place. */
    for (const it of items) {
      const barcodeNo = it.code;
      const found = await bcColl.findOne({ grcId: String(grcId), barcodeNo });

      const row = {
        grcId: String(grcId),
        grcNo: h.grcNumber,
        supplierId: vendor ? String(vendor._id) : '',
        barcodeNo,
        barcodeGenerated: barcodeNo,
        itemCode: it.code,
        itemName: it.name,
        printDescription: it.name,
        supplierDescription: it.name,
        billSlNo: it.slNo,
        serialNo: it.slNo,
        hsn: it.hsn,
        gst: String(it.gstPct),
        uom: it.uom,
        uomType: uomTypeOf(it.uom),
        /* one workbook row is one barcode, so it is a unique unit */
        batchType: 'unique',
        batchUnique: 'unique',
        qty: String(it.qty),
        qtyNum: it.qty,
        purRate: String(it.purchaseRate),
        disc: String(it.discountPct),
        finalNet: String(it.finalRate),
        retailPrice: String(it.rsp),
        offerPrice: String(it.rsp),
        wspPrice: String(it.wsp),
        dpPrice: String(it.dp),
        imageUrl: it.imageUrl,
        /* values the workbook carries that the schema has no column for -
           kept verbatim rather than recomputed or discarded */
        customFields: {
          noOfCuts: it.cuts, roundOff: it.roundOff, beforeTax: it.beforeTax,
          igst: it.igst, cgst: it.cgst, sgst: it.sgst, netAmount: it.netAmount,
          dp: it.dp,
        },
        businessId: String(scope.businessId),
        locationId: String(scope.locationId),
        currentBusinessId: scope.businessId,
        currentLocationId: scope.locationId,
        finYear: h.finYear,
        status: NO_STOCK ? 'VOID' : 'IN_STOCK',
        importedFrom: 'grc_full_scrape',
        updatedAt: new Date(),
      };

      if (found) {
        await bcColl.updateOne({ _id: found._id }, { $set: row });
        report.barcodes.updated += 1;
      } else {
        const res = await bcColl.insertOne({ ...row, createdAt: h.grcDate || new Date() });
        report.barcodes.inserted += 1;

        /* Goods received is a stock movement. Written here so the ledger and
           the barcode rows agree - the same rule every other receipt follows -
           and flagged derived, because it is reconstructed from a historical
           document rather than captured as it happened. */
        if (!NO_STOCK) {
          await mvColl.insertOne({
            businessId: scope.businessId, finYear: h.finYear,
            type: 'GRC_IN', barcodeId: res.insertedId, barcodeNo,
            itemId: null, itemCode: it.code, itemName: it.name,
            uom: it.uom, batchType: 'unique', qty: it.qty,
            fromLocationId: null, toLocationId: scope.locationId,
            statusBefore: '', statusAfter: 'IN_STOCK',
            refModel: 'grc', refId: grcId, refNo: h.grcNumber,
            reason: '', notes: '', userId: null, userName: '', userEmail: '',
            at: h.grcDate || new Date(),
            derived: true, derivedFrom: 'grc_full_scrape',
            createdAt: new Date(), updatedAt: new Date(),
          });
        }
      }
    }
  }
}

/* ================================================================ output == */

function preview(planned) {
  console.log('\n--- preview (first 5 GRCs) ---');
  planned.slice(0, 5).forEach(({ header: h, items, vendor }) => {
    console.log(`\nGRC ${h.grcNumber}  ${h.grcDate ? h.grcDate.toISOString().slice(0, 10) : '(no date)'}  FY ${h.finYear}`);
    console.log(`  Vendor : ${h.vendor.name} [${h.vendor.code}] -> ${vendor ? 'MATCHED ' + vendor.contactId : 'NOT FOUND (will import with no vendor)'}`);
    console.log(`  Totals : taxable ${h.taxable}  qty ${h.totalQuantity}  gst ${h.gst}  net ${h.netAmount}`);
    console.log(`  Items  : ${items.length}`);
    items.slice(0, 4).forEach((it) => {
      console.log(`     ${it.code.padEnd(9)} ${String(it.name).padEnd(12)} qty ${String(it.qty).padEnd(8)} rate ${String(it.finalRate).padEnd(9)} image ${it.imageUrl ? 'FOUND' : 'MISSING'}`);
    });
    if (items.length > 4) console.log(`     ...and ${items.length - 4} more`);
  });
}

function printReport() {
  const R = report;
  console.log('\n======================= ANALYSIS =======================');
  console.log(`GRC Summary       : ${R.grc.processed} records  (${R.grc.skipped} blank rows skipped)`);
  console.log(`Item With Barcode : ${R.barcodes.processed} items   (${R.barcodes.skipped} group-header rows skipped)`);
  console.log(`Item Summary      : ${R.sheets['Item Summary']} rows  (derived by the UI - not imported)`);
  console.log(`\nIMAGES`);
  console.log(`  on disk         : ${R.images.onDisk}`);
  console.log(`  matched         : ${R.images.matched}`);
  console.log(`  missing         : ${R.images.missing}`);
  console.log(`  unused on disk  : ${R.images.unused}`);
  if (R.images.missing) {
    console.log(`  missing barcodes (first 10): ${R.images.missingList.slice(0, 10).join(', ')}${R.images.missing > 10 ? ', ...' : ''}`);
  }
  console.log(`\nITEM-DETAIL COVERAGE  (which GRCs the workbook carries items for)`);
  console.log(`  GRCs with item rows    : ${R.coverage.withItems}`);
  console.log(`  GRCs with NO item rows : ${R.coverage.withoutItems}`);
  if (R.coverage.missingList.length) {
    console.log('  These import as HEADERS ONLY - the export carried no item detail for');
    console.log('  them. Re-scrape those GRCs, then re-run with --repair to fill them in:');
    const shown = R.coverage.missingList.slice(0, 12)
      .map((m) => `${m.grcNumber} (header qty ${m.totalQuantity})`).join(', ');
    console.log(`     ${shown}${R.coverage.missingList.length > 12
      ? `, ...and ${R.coverage.missingList.length - 12} more` : ''}`);
  }

  console.log(`\nVENDORS`);
  console.log(`  matched         : ${R.vendors.matched}`);
  console.log(`  not found       : ${R.vendors.unmatched}`);
  R.vendors.unmatchedList.slice(0, 8).forEach((v) => console.log(`     ${v}`));
  console.log(`\nSUMMARY CROSS-CHECK (workbook vs what the GRC screen will compute)`);
  console.log(`  compared        : ${R.summaryCheck.compared}`);
  console.log(`  agreed          : ${R.summaryCheck.agreed}`);
  console.log(`  mismatched      : ${R.summaryCheck.mismatched.length}`);
  R.summaryCheck.mismatched.slice(0, 5).forEach((m) => {
    console.log(`     GRC ${m.grc}: workbook net ${m.workbook.net} vs derived ${m.derived.net}`);
  });
  console.log(`\nDUPLICATES`);
  console.log(`  GRC numbers     : ${R.duplicates.grcNumbers.length}`);
  console.log(`  barcodes        : ${R.duplicates.barcodes.length}`);
  console.log(`\nERRORS   : ${R.errors.length}`);
  R.errors.slice(0, 8).forEach((e) => {
    console.log(`  ${e.sheet} row ${e.row}${e.grc ? ' GRC ' + e.grc : ''}${e.barcode ? ' barcode ' + e.barcode : ''}: ${e.field} - ${e.reason}`);
  });
  console.log(`WARNINGS : ${R.warnings.length}`);
  R.warnings.slice(0, 5).forEach((w) => console.log(`  ${w}`));
  console.log('=======================================================');
}

function printCounts() {
  const R = report;
  console.log('\n=================== IMPORT COMPLETED ==================');
  console.log(`GRC headers   : ${R.grc.inserted} inserted, ${R.grc.updated} updated`);
  console.log(`Barcode items : ${R.barcodes.inserted} inserted, ${R.barcodes.updated} updated`);
  console.log(`Images linked : ${R.images.matched} of ${R.barcodes.processed}`);
  console.log(`Stock created : ${NO_STOCK ? 'NO (--no-stock)' : R.barcodes.inserted + ' units, with ledger entries'}`);
  console.log('=======================================================');
}

function writeReport() {
  report.finishedAt = new Date().toISOString();
  const file = path.join(ROOT, 'grc-import-report.json');
  writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(`\nreport written: ${file}`);
}

/* ========================================================= folder mode ==

   THE "purchase excels" EXPORTS - one workbook per GRC.

   Each file carries ONE GRC's item detail, and nothing inside it names the
   GRC: "Sri KRUPA Silks(05074)9(5).xlsx" is GRC 05074 from Sri KRUPA Silks,
   and that file name is the only place the number appears. The sheet NAME
   varies from file to file - Inventory Report, Purchase Invoice Details,
   Itemized Report, GRC Report, Item Details ... - so a sheet is recognised
   by its HEADER, never by its name. Inside it:

     rows 1-2        a two-row header ("Item" over "Code", "Discount" over
                     "%", ...). Two exports label a few columns differently
                     ("Quantity"/"QTY/MTR", "Rate"/"Purchase Rate"), so each
                     field below lists every spelling seen.
     item rows       Sl No, Code (the BARCODE), Name (the item code), HSN,
                     GST Slab, UOM, QTY/MTR, No. of Cuts, Purchase Rate,
                     Discount (an AMOUNT, despite its "%" sub-header - 725 on
                     a 7,250 rate), R.Off, Final Rate, Before Tax, IGST,
                     CGST, SGST, Net Amount, RSP, WSP, DP
     "Total"         the item table's own total
     "Item Summary"  a second small table - Bill Sl No, Item Name, QTY,
                     Before GST, GST, Net - with its own Total. One export
                     also carries it as a separate sheet.

   WHAT IT WRITES. These GRCs' HEADERS were imported on 2 Sept from
   grc_full_scrape with no item rows ("headers only"), so this mode does what
   --repair does: it fills in the CHILDREN of GRCs that already exist -
   barcodeLabel rows, and their GRC_IN ledger entries as the workbook flow
   writes them - and never creates, changes or invents a header. A file whose
   GRC has no header is reported, not imported: the file carries no date,
   vendor or totals to build one from.

   Item Summary is NOT written, for the reason given at the top of this file:
   the GRC screen derives it from the barcode rows. The file's own Item
   Summary table is parsed only to cross-check that derivation.

   THE HEADER IS THE CHECK. A file's item totals must reconcile with the GRC
   header its name points at, and the header's supplier must be the one the
   file name says - that is what a mislabelled export looks like, and one is
   in the folder today (05092's file is a copy of 05097's). A file that fails
   either check, or has any invalid row, is refused WHOLE rather than
   imported in part, and each GRC's rows are written in one transaction, so a
   GRC is never left half-filled.

     npm run seed:grc:folder                          dry run, every file
     npm run seed:grc:folder -- --file 05074          dry run, one file
     npm run seed:grc:folder:apply -- --file 05074    write one file
     npm run seed:grc:folder:apply                    write every file
       --no-stock   write the rows without creating stock
       --force      import a GRC even when its totals or supplier disagree */

const colNorm = (h) => text(h).toLowerCase().replace(/[^a-z0-9%]/g, '');

/* field -> every header spelling seen for it (matched on either header row).
   Order matters only in that a column, once claimed, is not reused. */
const FOLDER_COLUMNS = [
  ['slNo', ['slno']],
  ['code', ['code']],
  ['name', ['name']],
  ['hsn', ['hsn']],
  ['gstSlab', ['gstslab']],
  ['uom', ['uom']],
  ['qty', ['qtymtr', 'quantity']],
  ['cuts', ['noofcuts']],
  ['purchaseRate', ['purchaserate']],
  ['discountAmount', ['%', 'discount%']],
  ['roundOff', ['roff', 'discountroff']],
  ['finalRate', ['finalrate']],
  ['beforeTax', ['beforetax']],
  ['igst', ['igst']],
  ['cgst', ['cgst']],
  ['sgst', ['sgst']],
  ['netAmount', ['netamount']],
  ['rsp', ['rsp']],
  ['wsp', ['wsp']],
  ['dp', ['dp']],
];
/* a sheet is an item-detail sheet only if every one of these is found */
const REQUIRED_COLUMNS = ['code', 'name', 'uom', 'qty', 'purchaseRate', 'finalRate', 'beforeTax', 'netAmount'];

function folderColumnMap(r1 = [], r2 = []) {
  const width = Math.max(r1.length, r2.length);
  const tokens = Array.from({ length: width }, (_, i) => [colNorm(r1[i]), colNorm(r2[i])].filter(Boolean));
  const map = {};
  const used = new Set();
  for (const [field, aliases] of FOLDER_COLUMNS) {
    const i = tokens.findIndex((t, idx) => !used.has(idx) && t.some((tok) => aliases.includes(tok)));
    if (i !== -1) { map[field] = i; used.add(i); }
  }
  return { map, missing: REQUIRED_COLUMNS.filter((f) => map[f] === undefined) };
}

const hasContent = (row) => (row || []).some((c) => text(c) !== '');
const isTotalRow = (row) => /^total$/i.test(text((row || []).find((c) => text(c) !== '')));
const isSummaryHeader = (row) => {
  const t = (row || []).map(colNorm);
  return t.includes('itemname') && t.includes('beforegstamount');
};

/* the Item Summary block: header row at hIdx, rows until its Total */
function parseSummaryBlock(grid, hIdx) {
  const t = grid[hIdx].map(colNorm);
  const col = {
    billSlNo: t.indexOf('billslno'), itemName: t.indexOf('itemname'), qty: t.indexOf('qty'),
    before: t.indexOf('beforegstamount'), gst: t.indexOf('gstamount'), net: t.indexOf('netamount'),
  };
  const rows = [];
  for (let i = hIdx + 1; i < grid.length; i++) {
    const row = grid[i] || [];
    if (isTotalRow(row)) break;
    if (!hasContent(row)) continue;
    rows.push({
      excelRow: i + 1, billSlNo: text(row[col.billSlNo]), itemName: text(row[col.itemName]),
      qty: num(row[col.qty]), before: num(row[col.before]), gst: num(row[col.gst]), net: num(row[col.net]),
    });
  }
  return rows;
}

/* One workbook -> { grcNumber, supplierName, sheet, items, summary, ... }.
   Reads only; judges nothing - validation is a separate step. */
function parseFolderWorkbook(dir, file) {
  const out = {
    file,
    grcNumber: (file.match(/\((\d{4,6})\)/) || [])[1] || '',
    supplierName: text(file.replace(/\(.*$/, '')),
    sheet: '', recognised: false, items: [], summary: [], summarySheet: '',
    otherSheets: [], unrecognisedRows: [],
  };
  const wb = XLSX.readFile(path.join(dir, file), { raw: true });
  let itemSheet = null;
  for (const name of wb.SheetNames) {
    /* blankrows: true keeps grid index i on Excel row i + 1, so every
       reported row number is the one the operator will find in the file */
    const grid = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null, blankrows: true });
    const { map, missing } = folderColumnMap(grid[0], grid[1]);
    if (!itemSheet && !missing.length) { itemSheet = { name, grid, map }; continue; }
    const hIdx = grid.findIndex(isSummaryHeader);
    if (hIdx !== -1 && !out.summary.length) {
      out.summary = parseSummaryBlock(grid, hIdx);
      out.summarySheet = name;
    } else {
      out.otherSheets.push({ name, missingColumns: missing });
    }
  }
  if (!itemSheet) return out;

  out.recognised = true;
  out.sheet = itemSheet.name;
  const { grid, map } = itemSheet;
  const cell = (row, f) => (map[f] === undefined ? null : row[map[f]]);

  let r = 2;
  for (; r < grid.length; r++) {
    const row = grid[r] || [];
    if (isTotalRow(row)) { r += 1; break; }
    if (!hasContent(row)) continue;
    const code = text(cell(row, 'code'));
    if (!code) { out.unrecognisedRows.push({ excelRow: r + 1, row: row.filter((c) => text(c) !== '') }); continue; }
    out.items.push({
      excelRow: r + 1,
      slNo: text(cell(row, 'slNo')),
      code,
      name: text(cell(row, 'name')),
      hsn: text(cell(row, 'hsn')),
      gstPct: gstPercent(cell(row, 'gstSlab')),
      uom: text(cell(row, 'uom')),
      qty: num(cell(row, 'qty')),
      cuts: text(cell(row, 'cuts')),
      rawPurchaseRate: cell(row, 'purchaseRate'),
      purchaseRate: num(cell(row, 'purchaseRate')),
      discountAmount: num(cell(row, 'discountAmount')),
      roundOff: num(cell(row, 'roundOff')),
      finalRate: num(cell(row, 'finalRate')),
      beforeTax: num(cell(row, 'beforeTax')),
      igst: num(cell(row, 'igst')), cgst: num(cell(row, 'cgst')), sgst: num(cell(row, 'sgst')),
      netAmount: num(cell(row, 'netAmount')),
      rsp: num(cell(row, 'rsp')), wsp: num(cell(row, 'wsp')), dp: num(cell(row, 'dp')),
    });
  }

  /* the embedded Item Summary follows the item table's Total; it wins over
     a separate Item Summary sheet, which only one export carries */
  const hIdx = grid.findIndex((row, i) => i >= r && isSummaryHeader(row));
  if (hIdx !== -1) { out.summary = parseSummaryBlock(grid, hIdx); out.summarySheet = itemSheet.name; }
  return out;
}

const round4 = (v) => Math.round((Number(v) || 0) * 10000) / 10000;
const words = (s) => text(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean);

/* Every row checked; each problem reported with file / sheet / row / GRC /
   item / field / value / reason. Returns true when the whole file is clean. */
function validateFolderWorkbook(w, F) {
  const fail = (it, field, value, reason) => {
    F.errors.push({ file: w.file, sheet: w.sheet, row: it?.excelRow ?? '', grc: w.grcNumber,
      item: it ? `${it.code} ${it.name}`.trim() : '', field, value: value === undefined ? '' : String(value ?? ''), reason });
  };
  let ok = true;
  const seen = new Map();
  let arithChecked = 0; let arithAgreed = 0; let discChecked = 0; let discAgreed = 0;

  if (!w.grcNumber) { fail(null, 'File name', w.file, 'no GRC number in brackets, e.g. "Supplier(05074).xlsx"'); ok = false; }
  if (!w.items.length) { fail(null, 'Item rows', 0, 'the item table has no rows'); ok = false; }
  w.unrecognisedRows.forEach((u) => { fail({ excelRow: u.excelRow, code: '', name: '' }, 'Code', JSON.stringify(u.row), 'row without a barcode in the item table'); ok = false; });

  for (const it of w.items) {
    if (seen.has(normBarcode(it.code))) {
      fail(it, 'Code', it.code, `duplicate barcode - also on row ${seen.get(normBarcode(it.code))}`);
      it.invalid = true;
    } else seen.set(normBarcode(it.code), it.excelRow);

    if (!(it.qty > 0)) { fail(it, 'QTY/MTR', it.qty, 'quantity must be greater than 0'); it.invalid = true; }
    const priceProblem = purchasePriceError(it.rawPurchaseRate);
    if (priceProblem) { fail(it, 'Purchase Rate', it.rawPurchaseRate, priceProblem); it.invalid = true; }
    if (!Number.isFinite(it.finalRate) || it.finalRate < 0) { fail(it, 'Final Rate', it.finalRate, 'not a valid amount'); it.invalid = true; }
    if (!Number.isFinite(it.gstPct)) { fail(it, 'GST Slab', it.gstPct, 'not a valid percentage'); it.invalid = true; }

    /* layout guards, as in the workbook flow: if the columns were ever read
       from the wrong places these stop agreeing */
    if (it.beforeTax > 0 && it.qty > 0) {
      arithChecked += 1;
      if (Math.abs(it.finalRate * it.qty - it.beforeTax) <= Math.max(0.5, it.beforeTax * 0.001)) arithAgreed += 1;
    }
    if (it.purchaseRate > 0) {
      discChecked += 1;
      const base = it.purchaseRate - it.discountAmount;
      if (Math.min(Math.abs(base + it.roundOff - it.finalRate), Math.abs(base - it.roundOff - it.finalRate)) <= 0.5) discAgreed += 1;
    }
    /* the Discount column holds an AMOUNT; the barcode row's `disc` is a
       PERCENTAGE everywhere else in the app (rate x disc / 100) */
    it.discPct = it.purchaseRate > 0 ? round4((it.discountAmount / it.purchaseRate) * 100) : 0;
    if (it.invalid) ok = false;
  }

  if (arithChecked && arithAgreed / arithChecked < 0.9) {
    fail(null, 'Layout', `${arithAgreed}/${arithChecked}`, 'Final Rate x QTY does not give Before Tax - the columns are not where this importer expects');
    ok = false;
  }
  if (discChecked && discAgreed / discChecked < 0.9) {
    fail(null, 'Layout', `${discAgreed}/${discChecked}`, 'Purchase Rate - Discount does not give Final Rate - the Discount column is not an amount here');
    ok = false;
  }
  return ok;
}

/* exactly the arithmetic the GRC screen uses for its Item Summary */
function derivedTotals(items) {
  return items.reduce((a, it) => {
    const before = (it.finalRate || it.purchaseRate) * it.qty;
    const gst = before * (it.gstPct / 100);
    return { qty: a.qty + it.qty, before: a.before + before, gst: a.gst + gst, net: a.net + before + gst };
  }, { qty: 0, before: 0, gst: 0, net: 0 });
}

async function runFolder() {
  const F = {
    startedAt: new Date().toISOString(), mode: APPLY ? 'apply' : 'dry-run', dir: DIR,
    fileFilter: FILE_FILTER || '', noStock: NO_STOCK, force: FORCE,
    files: { scanned: 0, recognised: 0, notGrcItemFiles: [], filtered: 0 },
    grc: { ready: 0, imported: 0, unchanged: 0, noHeader: [], ambiguousHeader: [], mismatched: [],
      supplierMismatch: [], invalid: [], conflicts: [], failed: [] },
    items: { detected: 0, created: 0, updated: 0, unchanged: 0, failed: 0 },
    summary: { compared: 0, agreed: 0, mismatched: [] },
    suppliers: { matched: 0, unmatched: 0 },
    itemMaster: { matchedNames: [], unmatchedNames: [] },
    duplicates: { withinFiles: 0, acrossFiles: [], alreadyOnAnotherGrc: [] },
    invalidPrices: 0,
    images: { matched: 0, missing: 0 },
    perGrc: [],
    errors: [], warnings: [],
  };

  console.log(APPLY ? '=== FOLDER IMPORT - APPLYING ===' : '=== FOLDER IMPORT - DRY RUN (pass --apply to write) ===');
  if (!existsSync(DIR)) { console.error('Folder not found: ' + DIR); process.exit(1); }
  console.log('folder   :', DIR);

  /* ---- 1. discover and parse -------------------------------------------- */
  const all = readdirSync(DIR).filter((f) => /\.xlsx?$/i.test(f) && !f.startsWith('~$')).sort();
  F.files.scanned = all.length;
  const files = FILE_FILTER ? all.filter((f) => f.toLowerCase().includes(FILE_FILTER.toLowerCase())) : all;
  F.files.filtered = files.length;
  if (FILE_FILTER) console.log(`filter   : "${FILE_FILTER}" -> ${files.length} of ${all.length} file(s)`);

  const books = [];
  for (const file of files) {
    let w;
    try { w = parseFolderWorkbook(DIR, file); } catch (e) {
      F.errors.push({ file, sheet: '', row: '', grc: '', item: '', field: 'Workbook', value: '', reason: 'cannot be read: ' + e.message });
      continue;
    }
    if (!w.recognised) {
      F.files.notGrcItemFiles.push({ file, sheets: w.otherSheets });
      continue;
    }
    F.files.recognised += 1;
    F.items.detected += w.items.length;
    books.push(w);
  }

  /* ---- 2. validate ------------------------------------------------------ */
  for (const w of books) {
    w.valid = validateFolderWorkbook(w, F);
    F.invalidPrices += w.items.filter((it) => purchasePriceError(it.rawPurchaseRate)).length;
    F.duplicates.withinFiles += w.items.length - new Set(w.items.map((it) => normBarcode(it.code))).size;
  }

  /* ---- 3. the database: headers, suppliers, existing barcodes, items ---- */
  await mongoose.connect(URI);
  const db = mongoose.connection.db;
  const grcColl = db.collection('grc');
  const bcColl = db.collection('barcodeLabel');

  const numbers = [...new Set(books.map((w) => w.grcNumber).filter(Boolean))];
  const headers = await grcColl.find({ grcNumber: { $in: numbers } }).toArray();
  const supplierIds = [...new Set(headers.map((h) => h.supplierId).filter(Boolean).map(String))];
  const suppliers = await db.collection('contact')
    .find({ _id: { $in: supplierIds.map((id) => new mongoose.Types.ObjectId(id)) } })
    .project({ contactId: 1, businessName: 1, firstName: 1, lastName: 1 }).toArray();
  const supplierById = new Map(suppliers.map((s) => [String(s._id), s]));

  const allCodes = books.flatMap((w) => w.items.map((it) => it.code));
  const existingRows = allCodes.length
    ? await bcColl.find({ $or: [{ barcodeNo: { $in: allCodes } }, { barcodeGenerated: { $in: allCodes } }] })
      .project({ barcodeNo: 1, barcodeGenerated: 1, grcId: 1, grcNo: 1, businessId: 1 }).toArray()
    : [];

  /* Item master: the workbook's Name is an item CODE (15-SA-PURE, SRB) -
     matched exactly, never loosely, and left unlinked when nothing matches */
  const itemMaster = await db.collection('item').find({ itemCode: { $nin: ['', null] } })
    .project({ itemCode: 1, name: 1, businessId: 1 }).toArray();
  const itemByCode = new Map(itemMaster.map((i) => [text(i.itemCode).toUpperCase(), i]));
  const names = [...new Set(books.flatMap((w) => w.items.map((it) => it.name)).filter(Boolean))];
  F.itemMaster.matchedNames = names.filter((n) => itemByCode.has(n.toUpperCase()));
  F.itemMaster.unmatchedNames = names.filter((n) => !itemByCode.has(n.toUpperCase()));

  const imageIndex = buildImageIndex();

  /* ---- 4. decide, per GRC ------------------------------------------------ */
  const plans = [];
  for (const w of books) {
    const plan = { w, status: 'ready', reasons: [] };
    const hs = headers.filter((h) => h.grcNumber === w.grcNumber);
    if (!w.valid) { plan.status = 'invalid'; plan.reasons.push('the file has invalid rows (see errors)'); }
    if (!hs.length) { plan.status = 'no-header'; plan.reasons.push(`GRC ${w.grcNumber} has no header in the database`); }
    else if (hs.length > 1) { plan.status = 'ambiguous'; plan.reasons.push(`GRC ${w.grcNumber} has ${hs.length} headers (different years or businesses)`); }
    plan.header = hs.length === 1 ? hs[0] : null;

    if (plan.header) {
      const h = plan.header;
      /* supplier: the header's own, checked against the file name */
      const s = h.supplierId ? supplierById.get(String(h.supplierId)) : null;
      const sName = s ? (text(s.businessName) || [s.firstName, s.lastName].filter(Boolean).join(' ')) : '';
      plan.supplier = s ? `${s.contactId} ${sName}` : '';
      const fileWords = words(w.supplierName);
      const supplierWords = new Set(words(sName));
      const agrees = s && fileWords.length && fileWords.every((x) => supplierWords.has(x));
      if (agrees) F.suppliers.matched += 1;
      else {
        F.suppliers.unmatched += 1;
        plan.reasons.push(`file supplier "${w.supplierName}" is not the GRC's supplier "${sName || '(none)'}"`);
        if (!FORCE && plan.status === 'ready') plan.status = 'supplier-mismatch';
      }

      /* totals: the file must be THIS GRC's item detail */
      const valid = w.items.filter((it) => !it.invalid);
      const got = derivedTotals(valid);
      const hq = Number(h.totalQuantity) || 0;
      const ht = Number(h.taxable) || 0;
      plan.totals = { header: { qty: hq, taxable: ht }, file: { qty: r2(got.qty), before: r2(got.before), gst: r2(got.gst), net: r2(got.net) } };
      const qtyOk = Math.abs(got.qty - hq) <= Math.max(0.01, hq * 0.005);
      const taxOk = Math.abs(got.before - ht) <= Math.max(1, ht * 0.01);
      if (!(qtyOk && taxOk)) {
        plan.reasons.push(`file totals qty ${r2(got.qty)} / before-GST ${r2(got.before)} do not reconcile with GRC header qty ${hq} / taxable ${ht}`);
        if (!FORCE && plan.status === 'ready') plan.status = 'mismatch';
      } else if (Math.abs(got.before - ht) > 1) {
        F.warnings.push(`GRC ${w.grcNumber}: before-GST ${r2(got.before)} vs header taxable ${ht} (within tolerance)`);
      }

      /* barcodes already on ANOTHER GRC - never moved or duplicated */
      const mine = new Set(w.items.map((it) => normBarcode(it.code)));
      const elsewhere = existingRows.filter((e) => (mine.has(normBarcode(e.barcodeNo)) || mine.has(normBarcode(e.barcodeGenerated)))
        && String(e.grcId || '') !== String(h._id));
      if (elsewhere.length) {
        F.duplicates.alreadyOnAnotherGrc.push({ grc: w.grcNumber, barcodes: elsewhere.map((e) => `${e.barcodeNo} (GRC ${e.grcNo || e.grcId || 'none'})`) });
        plan.reasons.push(`${elsewhere.length} barcode(s) already belong to another GRC or to no GRC`);
        if (plan.status === 'ready') plan.status = 'conflict';
      }
    }

    /* the file's own Item Summary vs what the screen will derive */
    if (w.summary.length) {
      F.summary.compared += 1;
      const want = w.summary.reduce((a, s) => ({ qty: a.qty + s.qty, before: a.before + s.before, net: a.net + s.net }), { qty: 0, before: 0, net: 0 });
      const got = derivedTotals(w.items.filter((it) => !it.invalid));
      const off = (a, b) => Math.abs(a - b) > Math.max(1, Math.abs(b) * 0.001);
      if (off(got.qty, want.qty) || off(got.before, want.before) || off(got.net, want.net)) {
        F.summary.mismatched.push({ grc: w.grcNumber, file: w.file,
          summary: { qty: r2(want.qty), before: r2(want.before), net: r2(want.net) },
          items: { qty: r2(got.qty), before: r2(got.before), net: r2(got.net) } });
      } else F.summary.agreed += 1;
    }
    plans.push(plan);
  }

  /* the same barcode in two files that are both about to be imported */
  const owner = new Map();
  plans.filter((p) => p.status === 'ready').forEach((p) => p.w.items.forEach((it) => {
    const k = normBarcode(it.code);
    if (!owner.has(k)) owner.set(k, new Set());
    owner.get(k).add(p);
  }));
  owner.forEach((set, code) => {
    if (set.size < 2) return;
    F.duplicates.acrossFiles.push({ barcode: code, files: [...set].map((p) => p.w.file) });
    set.forEach((p) => { p.status = 'conflict'; p.reasons.push(`barcode ${code} is also in another file`); });
  });

  plans.forEach((p) => {
    const bucket = { 'no-header': 'noHeader', ambiguous: 'ambiguousHeader', mismatch: 'mismatched',
      'supplier-mismatch': 'supplierMismatch', invalid: 'invalid', conflict: 'conflicts' }[p.status];
    if (p.status === 'ready') F.grc.ready += 1;
    else F.grc[bucket].push({ grc: p.w.grcNumber, file: p.w.file, reasons: p.reasons });
    F.perGrc.push({
      grc: p.w.grcNumber, file: p.w.file, sheet: p.w.sheet, status: p.status, items: p.w.items.length,
      supplier: p.supplier || '', totals: p.totals || null, reasons: p.reasons,
    });
  });

  printFolderReport(F, plans);

  if (!APPLY) {
    writeFolderReport(F);
    console.log('\nDry run complete - nothing was written.');
    await mongoose.disconnect();
    return;
  }

  /* ---- 5. write, one transaction per GRC --------------------------------- */
  const client = mongoose.connection.getClient();
  for (const p of plans.filter((x) => x.status === 'ready')) {
    try {
      const counts = await importFolderGrc(db, client, p, { itemByCode, imageIndex });
      F.items.created += counts.created;
      F.items.updated += counts.updated;
      F.items.unchanged += counts.unchanged;
      F.images.matched += counts.images;
      F.images.missing += counts.created + counts.updated + counts.unchanged - counts.images;
      if (counts.created || counts.updated) F.grc.imported += 1; else F.grc.unchanged += 1;
      console.log(`  GRC ${p.w.grcNumber}: ${counts.created} created, ${counts.updated} updated, ${counts.unchanged} unchanged`);
    } catch (e) {
      F.items.failed += p.w.items.length;
      F.grc.failed.push({ grc: p.w.grcNumber, file: p.w.file, reason: e.message });
      console.error(`  GRC ${p.w.grcNumber}: FAILED - nothing written for it (${e.message})`);
    }
  }

  console.log('\n=================== FOLDER IMPORT COMPLETED ===================');
  console.log(`GRCs      : ${F.grc.imported} filled, ${F.grc.unchanged} already up to date, ${F.grc.failed.length} failed`);
  console.log(`Items     : ${F.items.created} created, ${F.items.updated} updated, ${F.items.unchanged} unchanged, ${F.items.failed} failed`);
  console.log(`Images    : ${F.images.matched} linked`);
  console.log(`Stock     : ${NO_STOCK ? 'NO (--no-stock)' : F.items.created + ' new units, with GRC_IN ledger entries'}`);
  writeFolderReport(F);
  await mongoose.disconnect();
}

/* Writes one GRC's barcode rows - and a GRC_IN ledger entry for each NEW
   one, exactly as the workbook flow does - inside ONE transaction, so a
   failure leaves the GRC as it was rather than half filled. The callback may
   be retried by the driver, so the counts are rebuilt on every attempt. */
async function importFolderGrc(db, client, plan, { itemByCode, imageIndex }) {
  const { w, header: h } = plan;
  const bcColl = db.collection('barcodeLabel');
  const mvColl = db.collection('stockmovement');
  const grcId = String(h._id);
  const session = client.startSession();
  let counts;
  try {
    await session.withTransaction(async () => {
      counts = { created: 0, updated: 0, unchanged: 0, images: 0 };
      for (const [index, it] of w.items.entries()) {
        const barcodeNo = it.code;
        const item = itemByCode.get(it.name.toUpperCase()) || null;
        const image = imageIndex.get(normBarcode(barcodeNo));
        if (image) counts.images += 1;

        /* the same field names the workbook flow writes, so both kinds of
           import - and rows the app generates - read alike on every screen.
           itemCode is the workbook's Name, which is the item code, as on a
           row the Barcode Generation screen writes. */
        const row = {
          grcId,
          grcNo: h.grcNumber,
          supplierId: h.supplierId ? String(h.supplierId) : '',
          barcodeNo,
          barcodeGenerated: barcodeNo,
          itemId: item ? item._id : null,
          itemCode: it.name,
          itemName: item ? text(item.name) || it.name : it.name,
          printDescription: it.name,
          supplierDescription: it.name,
          billSlNo: it.slNo,
          serialNo: it.slNo,
          hsn: it.hsn,
          gst: String(it.gstPct),
          uom: it.uom,
          uomType: uomTypeOf(it.uom),
          /* one workbook row is one barcode, so it is a unique unit */
          batchType: 'unique',
          batchUnique: 'unique',
          qty: String(it.qty),
          qtyNum: it.qty,
          purRate: String(it.purchaseRate),
          disc: String(it.discPct),
          finalNet: String(it.finalRate),
          retailPrice: String(it.rsp),
          offerPrice: String(it.rsp),
          wspPrice: String(it.wsp),
          dpPrice: String(it.dp),
          imageUrl: image ? `${IMAGE_URL_BASE}/${image}` : '',
          customFields: {
            noOfCuts: it.cuts, discountAmount: it.discountAmount, roundOff: it.roundOff,
            beforeTax: it.beforeTax, igst: it.igst, cgst: it.cgst, sgst: it.sgst,
            netAmount: it.netAmount, dp: it.dp,
          },
          businessId: h.businessId ? String(h.businessId) : '',
          locationId: h.locationId ? String(h.locationId) : '',
          currentBusinessId: h.businessId || null,
          currentLocationId: h.locationId || null,
          finYear: h.finYear || '',
          importedFrom: 'purchase_excels',
          /* provenance: where this row came from, to the cell */
          importSource: { file: w.file, sheet: w.sheet, row: it.excelRow },
        };

        const found = await bcColl.findOne({ grcId, barcodeNo }, { session });
        if (found) {
          /* compare everything but the timestamps - a re-run that changes
             nothing writes nothing */
          const same = Object.entries(row).every(([k, v]) => JSON.stringify(found[k] ?? null) === JSON.stringify(v ?? null));
          if (same) { counts.unchanged += 1; continue; }
          /* stock state is the inventory engine's once a unit exists - a
             re-import corrects the commercial fields, never the status */
          await bcColl.updateOne({ _id: found._id }, { $set: { ...row, updatedAt: new Date() } }, { session });
          counts.updated += 1;
          continue;
        }

        /* createdAt is the GRC date plus the row's position: GET
           /api/grc/[id] lists rows by createdAt, so this keeps the file's
           order on the Item With Barcode and Item Summary tabs */
        const at = new Date((h.grcDate ? new Date(h.grcDate).getTime() : Date.now()) + index);
        const res = await bcColl.insertOne({
          ...row,
          status: NO_STOCK ? 'VOID' : 'IN_STOCK',
          createdAt: at,
          updatedAt: new Date(),
        }, { session });
        counts.created += 1;

        if (!NO_STOCK) {
          await mvColl.insertOne({
            businessId: h.businessId || null, finYear: h.finYear || '',
            type: 'GRC_IN', barcodeId: res.insertedId, barcodeNo,
            itemId: item ? item._id : null, itemCode: it.name, itemName: row.itemName,
            uom: it.uom, batchType: 'unique', qty: it.qty,
            fromLocationId: null, toLocationId: h.locationId || null,
            statusBefore: '', statusAfter: 'IN_STOCK',
            refModel: 'grc', refId: h._id, refNo: h.grcNumber,
            reason: '', notes: '', userId: null, userName: '', userEmail: '',
            at: h.grcDate || new Date(),
            derived: true, derivedFrom: 'purchase_excels',
            createdAt: new Date(), updatedAt: new Date(),
          }, { session });
        }
      }
    });
  } finally {
    await session.endSession();
  }
  return counts;
}

function printFolderReport(F, plans) {
  console.log('\n------------------------------------------');
  console.log('GRC EXCEL SEED REPORT');
  console.log('------------------------------------------');
  console.log(`Files scanned            : ${F.files.scanned}${F.fileFilter ? ` (${F.files.filtered} after --file filter)` : ''}`);
  console.log(`GRC item files identified: ${F.files.recognised}`);
  if (F.files.notGrcItemFiles.length) console.log(`Not GRC item files       : ${F.files.notGrcItemFiles.map((n) => n.file).join(', ')}`);
  console.log(`Items detected           : ${F.items.detected}`);
  console.log('\nPER GRC');
  plans.forEach((p) => {
    const t = p.totals;
    console.log(`  ${p.w.grcNumber}  ${p.status.toUpperCase().padEnd(17)} ${String(p.w.items.length).padStart(4)} items  ${p.w.sheet.padEnd(26)} ${p.w.file}`);
    if (t) console.log(`         header qty ${t.header.qty} taxable ${t.header.taxable}  |  file qty ${t.file.qty} before-GST ${t.file.before}  |  supplier ${p.supplier || '(none)'}`);
    p.reasons.forEach((r) => console.log(`         - ${r}`));
  });
  console.log('\nGRC records');
  console.log(`  ready to fill          : ${F.grc.ready}`);
  console.log(`  no header in database  : ${F.grc.noHeader.length}`);
  console.log(`  ambiguous header       : ${F.grc.ambiguousHeader.length}`);
  console.log(`  totals do not reconcile: ${F.grc.mismatched.length}`);
  console.log(`  supplier mismatch      : ${F.grc.supplierMismatch.length}`);
  console.log(`  invalid rows           : ${F.grc.invalid.length}`);
  console.log(`  barcode conflicts      : ${F.grc.conflicts.length}`);
  console.log('Supplier matches');
  console.log(`  matched                : ${F.suppliers.matched}`);
  console.log(`  unmatched              : ${F.suppliers.unmatched}`);
  console.log('Item master matches (workbook Name = item code)');
  console.log(`  matched                : ${F.itemMaster.matchedNames.length}`);
  console.log(`  unmatched              : ${F.itemMaster.unmatchedNames.length}${F.itemMaster.unmatchedNames.length ? '  (' + F.itemMaster.unmatchedNames.join(', ') + ')' : ''}`);
  console.log('Item Summary (derived by the GRC screen - compared, not imported)');
  console.log(`  compared / agreed      : ${F.summary.compared} / ${F.summary.agreed}`);
  F.summary.mismatched.forEach((m) => console.log(`  MISMATCH ${m.grc}: file summary qty ${m.summary.qty} before ${m.summary.before} | items qty ${m.items.qty} before ${m.items.before}`));
  console.log(`Invalid prices           : ${F.invalidPrices}`);
  console.log('Duplicate records prevented');
  console.log(`  within a file          : ${F.duplicates.withinFiles}`);
  console.log(`  across files           : ${F.duplicates.acrossFiles.length}`);
  console.log(`  already on another GRC : ${F.duplicates.alreadyOnAnotherGrc.length}`);
  console.log(`\nERRORS   : ${F.errors.length}`);
  F.errors.slice(0, 40).forEach((e) => console.log(`  File: ${e.file} | Sheet: ${e.sheet} | Row: ${e.row} | GRC: ${e.grc} | Item: ${e.item} | Field: ${e.field} | Value: ${e.value} | Reason: ${e.reason}`));
  if (F.errors.length > 40) console.log(`  ...and ${F.errors.length - 40} more (see the report file)`);
  console.log(`WARNINGS : ${F.warnings.length}`);
  F.warnings.slice(0, 10).forEach((w) => console.log(`  ${w}`));
}

function writeFolderReport(F) {
  F.finishedAt = new Date().toISOString();
  /* its own file - grc-import-report.json is the workbook flow's record */
  const file = path.join(ROOT, 'grc-excel-folder-report.json');
  writeFileSync(file, JSON.stringify(F, null, 2));
  console.log(`\nreport written: ${file}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

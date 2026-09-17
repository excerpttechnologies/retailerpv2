/* The CODE128 encoder JsBarcode itself draws with. Imported rather than
   re-implemented so barsBox() below counts the modules that will actually be
   printed - see barcodeModules(). It is the same module components/
   BarcodeSvg.jsx pulls in, so it costs the client bundle nothing new.

   A NAMESPACE import, and the class is picked out lazily inside a function.
   The package ships CommonJS: under Node `import pkg from` hands back the
   module.exports object, but under webpack it handed back undefined, and
   reading `.default` off it at module scope threw - at IMPORT time, which
   took down every page that renders a label rather than just the sizing.
   A namespace object always exists, and resolving inside the call means the
   worst case is a barcode drawn at its old full-band size. */
import * as CODE128_MODULE from 'jsbarcode/bin/barcodes/CODE128/index.js';

function code128Class() {
  const mod = CODE128_MODULE || {};
  return mod.CODE128
    || mod.default?.CODE128
    || mod.default?.default?.CODE128
    || null;
}

/* ==========================================================================
   THE PHYSICAL GEOMETRY OF A BARCODE LABEL.

   A barcode label is a printed object, not a card on a web page. Its width
   and height come from the barcode label catalog (labelSize "50 x 40 mm",
   stickerInRow 2) and everything on it is laid out in MILLIMETRES - the one
   CSS unit that survives the browser's print pipeline at its real size.

   Pure and client-safe, and deliberately not in a .jsx file: the numbers
   below decide whether a sticker can be scanned, so they are testable on
   their own (scripts/testGrcBarcodeLabel.mjs) rather than only observable
   by printing one.

   ---------------------------------------------------------------- why ----
   The GRC label used to be laid out in px inside a box with no size of its
   own, so a label was as wide as whatever container it landed in - about
   100mm on A4 for a 50mm sticker - and the bars were squeezed into a fixed
   190px box under the DEFAULT preserveAspectRatio, which scales BOTH axes:
   a 22-character CODE128 value is 277 modules and 360px wide at the encoder
   settings used, so it came back at 53% and the 42px bar height collapsed to
   22px. Short bars at a sub-dot module width is what "the barcode is
   missing / half printed / will not scan" looks like coming off a printer.
   ========================================================================== */

/* "50 x 40 mm" -> { w: 50, h: 40 }. Falls back to a sane default rather than
   rendering a zero-sized label when a catalog row is missing its sizes - the
   seeded catalog is not self-consistent ('RT 72 x 116 mm' declares a label
   size of "0 x 0 mm"). */
export function parseSize(text, fallback = { w: 50, h: 40 }) {
  const m = String(text || '').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (!m) return fallback;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!w || !h) return fallback;
  return { w, h };
}

/* THE EIGHT SECTIONS of the GRC label, as fractions of its usable height:

     1 barcode graphic
     2 barcode identifier        number | secondary reference
     3 product description       two lines
     4 product information       HSN | item code | P-M-F
     5 quantity / uom / value    encoded PR | qty + unit | wsp
     6 rate
     7 tax / washing             (Inclusive all taxes) | DRY WASH ONLY
     8 disclaimer

   They sum to exactly 1, so the sections always fill the sticker and can
   never overflow it, at ANY configured label height - 50x40, 50x25, 38x25.
   A section cannot grow: its track is a fixed millimetre height and its
   content is clipped to it. That is what keeps the barcode where it is when
   a description runs long, and keeps the disclaimer on the label when a
   price runs wide.

   `font` is the type size as a fraction of the section's OWN height, so text
   can never be taller than the band it sits in. */
export const LABEL_SECTIONS = {
  barcode:     { share: 0.3300 },
  identifier:  { share: 0.0750, font: 0.66 },
  description: { share: 0.1350, font: 0.39 },  /* two lines */
  detailRow1:  { share: 0.0850, font: 0.66 },
  detailRow2:  { share: 0.0850, font: 0.66 },
  rate:        { share: 0.1250, font: 0.66 },
  taxWash:     { share: 0.0825, font: 0.58 },
  disclaimer:  { share: 0.0825, font: 0.58 },
};

/* The order they are stacked in, top to bottom. One list, used to build the
   grid tracks AND to render, so a section cannot be given a track it is not
   rendered into or rendered into a track it was not given. */
export const SECTION_ORDER = [
  'barcode', 'identifier', 'description',
  'detailRow1', 'detailRow2', 'rate', 'taxWash', 'disclaimer',
];

/* Sticker margins. Small - the label is only 50mm across and every
   millimetre spent here is a millimetre of barcode lost - but never zero:
   ink that runs to the die cut is ink the printer clips. */
export const PAD_X_MM = 1.2;
export const PAD_Y_MM = 0.8;

/* The cut line round a label, in millimetres rather than pixels - and
   subtracted from the usable height below, because it is part of the
   sticker's box. A 1px border is 0.265mm, which is exactly what the
   disclaimer at the foot of the label was being clipped by: the section
   tracks were budgeted against the padding alone, so the stack came out
   2px taller than the content box it had to fit in. Everything on a label
   is measured in the label's own units, this included. */
export const BORDER_MM = 0.2;

/* The blank run either side of the bars, in modules. CODE128 asks for ten;
   a scanner uses it to find where the symbol starts and ends. It is inside
   the barcode's own viewBox, so it survives however narrow the label is -
   unlike padding, which the bars would simply be scaled into. */
export const QUIET_ZONE_MODULES = 10;

/* A number as a CSS millimetre length. */
export const mm = (n) => Number(n).toFixed(3) + 'mm';

/* The mm geometry of one label, derived ONCE per sheet and handed to every
   label on it - so no label can compute a different size from its neighbour.

     w, h    the sticker, exactly as configured
     band(k) the height of section k, in mm
     type(k) the type size for section k, in mm */
export function labelGeometry(format) {
  const { w, h } = parseSize(format?.labelSize);
  /* box-sizing is border-box, so w and h include BOTH the padding and the
     cut line. What the sections have to fit inside is what is left. */
  const usableH = Math.max(0, h - (PAD_Y_MM + BORDER_MM) * 2);
  const usableW = Math.max(0, w - (PAD_X_MM + BORDER_MM) * 2);
  const band = (key) => usableH * LABEL_SECTIONS[key].share;
  const type = (key) => band(key) * (LABEL_SECTIONS[key].font || 0);
  return { w, h, usableH, usableW, band, type };
}

/* How many labels sit across the sheet. Two is the seeded default and what
   the GRC sheet has always shown. */
export function labelsPerRow(format) {
  return Math.max(1, Number(format?.stickerInRow) || 2);
}

/* ==========================================================================
   THE PAGE a sheet of these labels is printed on.

   Written out inside the Barcode Generation print picker and nowhere else,
   so the GRC Barcode Print page - which prints the very same sheet - had no
   @page rule at all and came out at whatever the browser's default page and
   margins happened to be. Both read it from here now.
   ========================================================================== */

/* One physical sheet of the configured sticker stock as a CSS page size,
   widened if the labels on it do not actually fit.

   The seeded catalog is not self-consistent - 'RT 72 x 116 mm' declares a
   72mm sheet, a label size of "0 x 0 mm" and 2 labels per row. parseSize
   rejects the zero and substitutes 50x40, so two 50mm labels would be laid
   across a 72mm page and the second one would fall off the edge of the
   paper. Taking the wider of the two keeps every label on the sheet; a
   little extra margin is recoverable, a clipped barcode is not.

   Returns null when there is no usable sheet size at all, so the caller can
   fall back to A4 rather than emit a zero-sized page that prints nothing. */
export function stockPageCss(format, labelW, labelH, perRow, gapMm) {
  const sheet = String(format?.pageSize || '').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (!sheet) return null;
  const sheetW = Number(sheet[1]);
  const sheetH = Number(sheet[2]);
  if (!sheetW || !sheetH) return null;

  const needW = labelW * perRow + gapMm * (perRow - 1);
  return Math.max(sheetW, needW) + 'mm ' + Math.max(sheetH, labelH) + 'mm';
}

/* The @page rule for a label run.

   On sticker stock the sheet IS the page, so the page is one sheet with no
   margin. Otherwise A4 with a 5mm margin - what a desktop printer and
   "Microsoft Print to PDF" are loaded with - and the labels are guillotined
   along their cut lines. */
export function labelPageRule(format, { onStock = false, gapMm = 1 } = {}) {
  const { w, h } = parseSize(format?.labelSize);
  const stock = onStock ? stockPageCss(format, w, h, labelsPerRow(format), gapMm) : null;
  return stock
    ? '@page { size: ' + stock + '; margin: 0; }'
    : '@page { size: A4; margin: 5mm; }';
}

/* ==========================================================================
   HOW BIG THE BARS ARE DRAWN INSIDE THEIR BAND.

   The band is the space the barcode may occupy. It is not the size of the
   symbol: a barcode drawn to the last millimetre of its band is a black slab
   that crowds everything under it, and on a 6-character value it is far
   wider than a scanner needs.

   The symbol is therefore sized from the VALUE, inside that band:

     height  a fixed share of the band, so the rest of the band is the white
             space a scanner wants above and below the bars
     width   one module at TARGET_X_MM, capped at the label's usable width

   A short value (a counter number like "9A1135") comes out visibly smaller
   than the band and centred in it. A long one (a composed value) still gets
   every millimetre the label has, exactly as before - the cap is what stops
   this making an already-tight symbol tighter.

   Nothing here crops or stretches: the width is the number of modules times
   a module width, so every bar keeps its proportion to every other bar.
   ========================================================================== */

/* The module width the bars are drawn at when the label can afford it.
   ISO/IEC 15417 asks for 0.250mm and a 203dpi thermal dot is 0.125mm, so
   0.33mm is two whole dots plus a margin - comfortably readable, and narrow
   enough that a short value no longer fills the sticker. */
export const TARGET_X_MM = 0.33;

/* The share of the barcode band the bars themselves take. The rest is the
   quiet space above and below them. */
export const BAR_HEIGHT_SHARE = 0.62;

/* The modules a CODE128 symbol needs for this value, quiet zones included.
   Counted with the SAME encoder JsBarcode draws with, not estimated: CODE128
   packs pairs of digits into one symbol character in C mode, so arithmetic on
   the character count is wrong for exactly the digit-heavy values this ERP
   issues. Returns 0 when the value cannot be encoded. */
export function barcodeModules(value) {
  const text = String(value ?? '');
  if (!text) return 0;
  try {
    const CODE128 = code128Class();
    if (!CODE128) return 0;
    const encoded = new CODE128(text, { width: 1, height: 40, format: 'CODE128' }).encode();
    return (encoded?.data?.length || 0) + QUIET_ZONE_MODULES * 2;
  } catch {
    /* CODE128 encodes anything printable; a control character pasted into a
       value can still throw. 0 means "no idea how wide" and barsBox then
       hands the bars the whole band, which is what they had before. */
    return 0;
  }
}

/* The box the bars are drawn in, in mm, for one label and one value:

     { w, h, x, modules }   w x h to draw, x the printed module width

   w is capped at the usable width, so a value too long for the stock still
   fills it rather than overflowing; x then says what that cost.
   When the value cannot be encoded the box is the full band, which is what
   an empty svg occupies anyway. */
export function barsBox(geometry, value) {
  const usableW = Number(geometry?.usableW) || 0;
  const band = typeof geometry?.band === 'function' ? geometry.band('barcode') : 0;
  const h = band * BAR_HEIGHT_SHARE;
  const modules = barcodeModules(value);
  if (!modules) return { w: usableW, h, x: 0, modules: 0 };
  const w = Math.min(usableW, modules * TARGET_X_MM);
  return { w, h, x: w / modules, modules };
}

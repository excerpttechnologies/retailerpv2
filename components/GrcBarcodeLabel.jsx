'use client';
import BarcodeSvg from './BarcodeSvg';
import { toLabelData } from '@/lib/barcodeLabelPrint';
import { displayBarcodeValue } from '@/lib/barcodeValue';
import {
  labelGeometry,
  labelsPerRow,
  SECTION_ORDER,
  PAD_X_MM,
  PAD_Y_MM,
  BORDER_MM,
  QUIET_ZONE_MODULES,
  mm,
} from '@/lib/barcodeLabelGeometry';

/* ==========================================================================
   GrcBarcodeLabel — the SINGLE label renderer shared by:

     - app/admin/transaction/purchase/barcode-print/[id]/page.jsx
         (the authoritative print output)
     - components/GCRBarcodeGeneration.jsx PrintLabelPicker preview
         (the WYSIWYG preview that must match print exactly)

   Both hand it the SAME rows and the SAME label format, so what is on screen
   and what comes off the printer are one layout with one geometry.

   A LABEL IS A PHYSICAL OBJECT, not a card on a web page. Its width, height
   and the eight bands it is divided into come from lib/barcodeLabelGeometry.js
   and are set in MILLIMETRES — the one CSS unit that survives the browser's
   print pipeline at its real size. This file used to lay the same label out
   in pixels inside a box with no size of its own, so a 50 x 40 mm sticker
   came out as wide as whatever column it landed in (~135mm in a max-w-5xl
   page) and no band had a fixed height: the description pushed the rate down,
   the disclaimer fell off the bottom, and the preview and the paper agreed
   with each other only by accident.

   DATA CONTRACT — every label value comes from toLabelData() (whitelist) +
   the row's own qty text. Nothing outside that contract can reach the paper.
   ========================================================================== */

/* -----------------------------------------------------------------------
   LABEL FIELD MAP
   Controls which toLabelData() key fills LEFT | CENTRE | RIGHT on each row.

     detail row 1   hsn | itemCode | pmf
     detail row 2   encodedCostPrice | qtyWithUnit | wspPrice
     RATE line      sellingPrice  (offerPrice → retailPrice fallback)
----------------------------------------------------------------------- */
export const LABEL_FIELDS = {
  detailRow1: ['hsn', 'itemCode', 'pmf'],
  detailRow2Left: 'encodedCostPrice',
  detailRow2Price: 'wspPrice',
};

/* -----------------------------------------------------------------------
   labelFor(row) — augments the toLabelData whitelist with qtyWithUnit.
   qty is stored as the operator typed it ("16", "2.50"); the numeric
   quantity from toLabelData is the fallback when that text is blank.

   ONE ROW IN, ONE LABEL OUT. Every value on a sticker — the number, the
   composed barcode value, the description, the HSN, the price — is read off
   the SAME barcode record here, so no two fields on a label can ever come
   from two different barcodes. Nothing downstream pairs values by position.
----------------------------------------------------------------------- */
export function labelFor(row) {
  const label = toLabelData(row);
  const qtyText =
    String(row?.qty ?? '').trim() ||
    (label.quantity ? String(label.quantity) : '');
  return { ...label, qtyWithUnit: [qtyText, label.unit].filter(Boolean).join(' ') };
}

/* The bars are drawn by the shared components/BarcodeSvg.jsx — the one
   CODE128 implementation in the application, so a label printed from this
   screen scans the same as the same label printed from any other. It carries
   data-barcode, which is what the print readiness check in
   GCRBarcodeGeneration.jsx counts before it opens the print dialog. */
export { BarcodeSvg };

/* Text that must not be re-cased or wrapped: a barcode value is
   case-sensitive (globals.css uppercases body text) and must stay on its own
   single line, cut with an ellipsis rather than pushed onto a second one. */
const ONE_LINE = { overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' };

/* -----------------------------------------------------------------------
   Label — one complete printable sticker.

              [ machine-readable barcode ]
     barcodeNo                       barcodeGenerated
     description (up to 2 lines)
     HSN            item code          P-M-F
     encoded PR     qty + unit         wsp price
                   RATE : ₹.../-
     (Inclusive all taxes)       DRY WASH ONLY
         No exchange, no guarantee, No Return

   The eight bands are the eight LABEL_SECTIONS, in SECTION_ORDER, each a
   fixed millimetre track of the sticker's own height. A band cannot grow:
   a missing field leaves its place blank, a long value is cut with an
   ellipsis and a long description wraps inside its two-line box. That is
   what keeps the barcode at the top where a scanner expects it, and the
   disclaimer on the label, whatever the data does.

   Accepts the label data object (from labelFor / toLabelData), never the raw
   barcode row, so the whitelist is the only gate to paper.
----------------------------------------------------------------------- */
export function Label({ label, geometry }) {
  const g = geometry;
  const band = (key) => mm(g.band(key));
  const type = (key) => mm(g.type(key));

  const detailRow1 = LABEL_FIELDS.detailRow1.map((k) => label[k] ?? '');
  const detailRow2 = [
    label[LABEL_FIELDS.detailRow2Left],
    label.qtyWithUnit,
    label[LABEL_FIELDS.detailRow2Price],
  ];

  /* THE BARCODE IDENTIFIER ROW — both values off the SAME record.

     LEFT   barcodeNo          the unit's own number, "9A1135"
     RIGHT  barcodeGenerated   the composed value - supplier code, GRC number,
                               the item's Bill Sl No. and the barcode's SEQ,
                               "G512 * 05173 * 5 * 1" (lib/barcodeValue.js)

     Printed the way the reference label prints them, with the spaces around
     the separators closed up (displayBarcodeValue). The STORED strings are
     untouched — this is the printed form of them, nothing else.

     A row whose two fields hold the SAME string (every barcode the save route
     writes today stores the composed value in both) prints it once, on the
     left, rather than twice across the row. Nothing is invented to fill the
     right-hand side: a row with no separate composed value simply has none. */
  const barcodeNo = displayBarcodeValue(label.barcodeNo);
  const composed = displayBarcodeValue(label.barcodeGenerated);
  const secondary = composed && composed !== barcodeNo ? composed : '';

  /* A row of three values on one grid, so each value's horizontal position is
     fixed regardless of how long its neighbours are. minmax(0, …) stops
     a long value widening its own column and displacing the others. */
  const threeUp = (key, cells, style = {}) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1fr)',
        alignItems: 'center',
        columnGap: mm(0.8),
        height: band(key),
        fontSize: type(key),
        lineHeight: band(key),
        ...style,
      }}
    >
      {cells.map((value, i) => (
        <span key={i} style={{ ...ONE_LINE, textAlign: ['left', 'center', 'right'][i] }}>
          {value}
        </span>
      ))}
    </div>
  );

  return (
    <div
      data-label=""
      className="barcode-label"
      style={{
        boxSizing: 'border-box',
        width: mm(g.w),
        height: mm(g.h),
        padding: mm(PAD_Y_MM) + ' ' + mm(PAD_X_MM),
        border: mm(BORDER_MM) + ' dashed #94a3b8',
        overflow: 'hidden',
        display: 'grid',
        /* One track per section, in the one order they are rendered in, so a
           section can neither be given a track it is not rendered into nor
           rendered into a track it was not given. */
        gridTemplateRows: SECTION_ORDER.map((key) => band(key)).join(' '),
        color: '#000',
        background: '#fff',
      }}
    >
      {/* 1 — MACHINE-READABLE BARCODE, at the top of every label.

          preserveAspectRatio="none" keeps the bars the full height of their
          band: under the default, a symbol wider than the sticker is scaled
          down on BOTH axes and the lost height is what makes a label need a
          second pass under the scanner. quietZone is the blank run either
          side that tells a scanner where the symbol starts and ends — inside
          the SVG's own viewBox, so it survives however narrow the label is. */}
      <div style={{ height: band('barcode'), overflow: 'hidden' }}>
        <BarcodeSvg
          value={label.barcode}
          height={60}
          quietZone={QUIET_ZONE_MODULES}
          preserveAspectRatio="none"
          className="block h-full w-full"
        />
      </div>

      {/* 2 — barcodeNo (LEFT) and barcodeGenerated (RIGHT), one row, directly
          below the bars. textTransform none: globals.css uppercases body
          text and a barcode value is case-sensitive. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, auto) minmax(0, 1fr)',
          alignItems: 'center',
          columnGap: mm(1),
          height: band('identifier'),
          fontSize: type('identifier'),
          lineHeight: band('identifier'),
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontWeight: 600,
          letterSpacing: '0.01em',
          textTransform: 'none',
        }}
      >
        <span style={{ ...ONE_LINE, textAlign: 'left' }}>{barcodeNo}</span>
        <span style={{ ...ONE_LINE, textAlign: 'right' }}>{secondary}</span>
      </div>

      {/* 3 — the print description, two lines, left-aligned */}
      <div
        style={{
          height: band('description'),
          fontSize: type('description'),
          lineHeight: mm(g.band('description') / 2),
          textAlign: 'left',
          color: '#334155',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
          wordBreak: 'break-word',
        }}
      >
        {label.description}
      </div>

      {/* 4 — HSN | item code | P-M-F */}
      {threeUp('detailRow1', detailRow1, { fontWeight: 600 })}

      {/* 5 — encoded cost price | qty + unit | wsp price */}
      {threeUp('detailRow2', detailRow2, { fontWeight: 600 })}

      {/* 6 — RATE */}
      <div
        style={{
          height: band('rate'),
          fontSize: type('rate'),
          lineHeight: band('rate'),
          textAlign: 'center',
          fontWeight: 800,
          ...ONE_LINE,
        }}
      >
        RATE : ₹{label.sellingPrice}/-
      </div>

      {/* 7 — tax note (left) | washing instruction (right) */}
      {threeUp('taxWash', ['(Inclusive all taxes)', '', 'DRY WASH ONLY'], { color: '#475569' })}

      {/* 8 — disclaimer */}
      <div
        style={{
          height: band('disclaimer'),
          fontSize: type('disclaimer'),
          lineHeight: band('disclaimer'),
          textAlign: 'center',
          color: '#475569',
          ...ONE_LINE,
        }}
      >
        No exchange, no guarantee, No Return
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------
   GrcBarcodeLabelSheet — the labels of a GRC, laid out on the sticker stock
   they are printed on.

   rows    — barcode rows, each carrying `copies` (from withLabelCounts)
   format  — the chosen barcode label catalog row (labelSize "50 x 40 mm",
             stickerInRow 2). null until the catalog answers, which falls back
             to that same 50 x 40 mm 2-up default rather than rendering a
             label with no size.
   gap     — the gutter between stickers: a cut line's worth on a sheet of A4
             that somebody has to guillotine, zero on die-cut stock where the
             sheet IS the page.

   Each row is expanded into `copies` identical stickers — the same barcode
   number on every copy. Nothing here reserves, generates or saves anything,
   so printing a second metre sticker or a twenty-fifth batch sticker cannot
   move the barcode sequence.

   print-doc + alignContent:start stay on the wrapper so the sheet still
   survives the generic @media print rules in globals.css for a Ctrl+P on the
   print page; a label RUN takes the #barcode-print-root path instead, where
   globals.css overrides .print-doc back into normal flow so the sheet can
   fragment across as many pages as it needs.
----------------------------------------------------------------------- */
export default function GrcBarcodeLabelSheet({ rows, format = null, gap = '1mm' }) {
  const geometry = labelGeometry(format);
  const perRow = labelsPerRow(format);

  const labels = (rows || []).flatMap((row, ri) => {
    const n = Math.max(0, Math.floor(Number(row.copies) || 0));
    return Array.from({ length: n }, (_, copy) => ({
      key: `${row._id || row.id || ri}-${copy}`,
      label: labelFor(row),
    }));
  });

  if (!labels.length) {
    return (
      <div className="py-6 text-center text-[13px] text-slate-400">
        No labels to display.
      </div>
    );
  }

  return (
    <div
      className="print-doc"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(' + perRow + ', ' + mm(geometry.w) + ')',
        gridAutoRows: mm(geometry.h),
        gap,
        justifyContent: 'center',
        /* Without this the implicit rows stretch to fill whatever height the
           sheet is given, and a single row of labels comes out a full page
           tall with the cut line running the length of the paper. */
        alignContent: 'start',
      }}
    >
      {labels.map(({ key, label }) => (
        <Label key={key} label={label} geometry={geometry} />
      ))}
    </div>
  );
}

'use client';
import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

/* ==========================================================================
   A printable sheet of barcode labels.

   Geometry comes from the chosen Barcode Label Setting - the seeded catalog
   rows carry labelSize ("50 x 40 mm") and stickerInRow (2), so a format
   change re-lays the sheet without touching this file.

   Sizes are set in millimetres rather than pixels: a label has to come out
   of the printer at its real size, and mm is the one CSS unit that survives
   the browser's print scaling intact.

   NOTE: app/admin/transaction/purchase/barcode-print/[id]/page.jsx has its
   own copy of this label markup. It works and is left alone deliberately -
   it can adopt this component whenever that page is next touched.
   ========================================================================== */

/* "50 x 40 mm" -> { w: 50, h: 40 }. Falls back to a sane default rather
   than rendering a zero-sized label when a catalog row is missing sizes. */
export function parseSize(text, fallback = { w: 50, h: 40 }) {
  const m = String(text || '').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (!m) return fallback;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!w || !h) return fallback;
  return { w, h };
}

export function BarcodeSvg({ value, height = 34 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!value || !ref.current) return;
    try {
      JsBarcode(ref.current, String(value), {
        format: 'CODE128',
        displayValue: false,
        height,
        width: 1.2,
        margin: 0,
      });
    } catch {
      /* CODE128 encodes anything printable; if it still throws, leave the
         svg empty rather than taking the whole sheet down */
    }
  }, [value, height]);

  return <svg ref={ref} className="block w-full" />;
}

/* One label. Rows may come from a barcode row (which carries a generated
   barcode and GRC pricing) or from the item master (which does not) - so
   every field falls back rather than assuming a shape. */
export function Label({ row, w, h }) {
  const code = row.barcodeGenerated || row.itemCode || '';
  const rate = row.offerPrice || row.retailPrice || row.rsp || '';
  const desc = row.printDescription || row.supplierDescription || row.itemName || '';

  return (
    <div
      className="flex flex-col items-center justify-center overflow-hidden border border-dashed border-[#d5dce8] px-1 text-center leading-tight"
      style={{ width: w + 'mm', height: h + 'mm' }}
    >
      {code && <BarcodeSvg value={code} height={Math.max(18, Math.round(h * 0.9))} />}

      <div className="mt-[0.5mm] w-full truncate font-mono text-[7pt] font-semibold">
        {code}
      </div>

      {desc && (
        <div className="w-full truncate text-[6pt] text-[#46556f]">{desc}</div>
      )}

      {rate !== '' && rate !== null && (
        <div className="text-[8pt] font-extrabold">
          &#8377;{Number(rate).toFixed(2)}
        </div>
      )}
    </div>
  );
}

/* Expands each row by its Barcode Copies and lays the result out in a grid
   `stickerInRow` wide. */
export default function BarcodeLabelSheet({ rows, format }) {
  const { w, h } = parseSize(format?.labelSize);
  const perRow = Math.max(1, Number(format?.stickerInRow) || 1);

  const labels = rows.flatMap((r, ri) => {
    const n = Math.max(0, Math.floor(Number(r.copies) || 0));
    return Array.from({ length: n }, (_, i) => ({ row: r, key: ri + '-' + i }));
  });

  if (!labels.length) {
    return (
      <div className="py-10 text-center text-[13px] text-inkmuted">
        Every row has Barcode Copies set to 0 - nothing to print.
      </div>
    );
  }

  return (
    <div
      className="print-doc mx-auto"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(' + perRow + ', ' + w + 'mm)',
        gap: '1mm',
        justifyContent: 'center',
      }}
    >
      {labels.map(({ row, key }) => <Label key={key} row={row} w={w} h={h} />)}
    </div>
  );
}

'use client';
import BarcodeSvg from './BarcodeSvg';

/* ==========================================================================
   A printable sheet of barcode labels.

   Geometry comes from the chosen Barcode Label Setting - the seeded catalog
   rows carry labelSize ("50 x 40 mm") and stickerInRow (2), so a format
   change re-lays the sheet without touching this file.

   Sizes are set in millimetres rather than pixels: a label has to come out
   of the printer at its real size, and mm is the one CSS unit that survives
   the browser's print scaling intact.

   The barcode itself now comes from ./BarcodeSvg, which is the single
   implementation shared with the print page, the stock transfer document
   number and the billing document - it used to be written out twice.
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

/* Re-exported so the screens that already import { BarcodeSvg } from this
   file keep working unchanged. */
export { BarcodeSvg };

/* One label.

   Rows may come from a barcode row (which carries a generated barcode and
   GRC pricing) or from the item master (which does not), so every field
   falls back rather than assuming a shape.

   WHAT IS ON IT, and why. The label is the only thing that travels with the
   goods, so it has to carry enough to identify the piece without a computer:

     barcode + number   the scannable reference, and the same number in
                        human-readable form for when a label is damaged
     description        what it is
     supplier           who it came from
     GRC number         which receipt it arrived on
     serial             its position within that receipt
     quantity           essential on a BATCH label, where one barcode stands
                        for several pieces or several metres - without it,
                        nobody can tell a 5-metre label from a 1-metre one
     rate / RSP         cost and retail price

   A label is small. Everything below the barcode is rendered only when the
   row actually carries it, and the tiny print scales with the label height,
   so a 25mm sticker drops to essentials while a 50mm one shows the lot -
   rather than a fixed layout that overflows on the small stock. */
export function Label({ row, w, h }) {
  const code = row.barcodeNo || row.barcodeGenerated || row.itemCode || '';
  const rate = row.offerPrice || row.retailPrice || row.rsp || '';
  const cost = row.finalNet || row.purRate || '';
  const desc = row.printDescription || row.supplierDescription || row.itemName || '';
  const supplier = row.supplierName || '';
  const grcNo = row.grcNo || row.grcNumber || '';
  const serial = row.serialNo || row.billSlNo || '';
  const qty = Number(row.qtyNum ?? row.qty ?? 0);
  const uom = row.uom || row.uomType || '';
  const isBatch = String(row.batchType || row.batchUnique || '').toLowerCase() === 'batch';

  /* Room for the extra lines only exists on a taller sticker. */
  const roomy = h >= 30;
  const barcodeHeight = Math.max(14, Math.round(h * (roomy ? 0.5 : 0.62)));

  return (
    <div
      className="flex flex-col items-center justify-center overflow-hidden border border-dashed border-[#d5dce8] px-1 text-center leading-tight"
      style={{ width: w + 'mm', height: h + 'mm' }}
    >
      {code && <BarcodeSvg value={code} height={barcodeHeight} />}

      <div className="w-full truncate font-mono text-[7pt] font-semibold">
        {code}
      </div>

      {desc && (
        <div className="w-full truncate text-[6pt] text-[#46556f]">{desc}</div>
      )}

      {/* A batch label MUST show its quantity - one barcode, several units.
          On a unique label the quantity is always 1, so printing it only
          wastes a line that the supplier or GRC number can use. */}
      {isBatch && qty > 0 && (
        <div className="w-full truncate text-[7pt] font-bold">
          {trimQty(qty)} {uom}
          <span className="ml-[0.6mm] font-normal text-[#46556f]">(batch)</span>
        </div>
      )}

      {roomy && (supplier || grcNo || serial) && (
        <div className="w-full truncate text-[5.5pt] text-[#5a6c88]">
          {[supplier, grcNo, serial ? 'Sl ' + serial : ''].filter(Boolean).join(' · ')}
        </div>
      )}

      {rate !== '' && rate !== null && (
        <div className="flex w-full items-baseline justify-center gap-[1mm]">
          <span className="text-[8pt] font-extrabold">
            &#8377;{Number(rate).toFixed(2)}
          </span>
          {roomy && cost !== '' && Number(cost) > 0 && (
            <span className="text-[5.5pt] text-[#5a6c88]">CP {Number(cost).toFixed(2)}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* 5 rather than 5.000, but 2.5 stays 2.5 - a metre label has to be exact. */
function trimQty(v) {
  const n = Number(v) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
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

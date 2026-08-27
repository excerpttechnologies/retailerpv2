
// 'use client';
// import { useEffect, useState } from 'react';
// import { useParams } from 'next/navigation';

// /* Printable barcode label sheet: one small label per row (item code, price,
//    generated barcode), laid out in a grid so it prints multiple labels per
//    page. Rows that never had a barcode generated are skipped since there's
//    nothing to print for them. */
// export default function GrcBarcodePrintPage() {
//   const { id } = useParams();
//   const [data, setData] = useState(null);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     if (!id) return;
//     fetch(`/api/grc/${id}`)
//       .then((r) => r.json())
//       .then((d) => {
//         if (d.error) setError(d.error);
//         else setData(d);
//       })
//       .catch((e) => setError(e.message || 'Failed to load'));
//   }, [id]);

//   if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
//   if (!data) return <div className="p-6 text-sm text-slate-500">Loading...</div>;

//   const labels = data.rows.filter((r) => r.barcodeGenerated);

//   return (
//     <div className="max-w-5xl mx-auto p-6 print:p-0">
//       <style jsx global>{`
//         @media print {
//           .no-print { display: none !important; }
//           body { background: white; }
//         }
//       `}</style>

//       <div className="no-print flex justify-between items-center mb-4">
//         <span className="text-xs text-slate-500">
//           {labels.length} label(s) &middot; GRC {data.grc.grcNumber}
//         </span>
//         <button
//           onClick={() => window.print()}
//           className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded shadow-sm"
//         >
//           Print Labels
//         </button>
//       </div>

//       {labels.length === 0 ? (
//         <p className="text-sm text-slate-400">
//           No barcodes have been generated for this GRC yet.
//         </p>
//       ) : (
//         <div className="grid grid-cols-3 gap-2 print:grid-cols-3">
//           {labels.map((r) => (
//             <div
//               key={r._id}
//               className="border border-slate-400 rounded p-2 text-center break-inside-avoid"
//             >
//               <div className="text-[10px] font-semibold truncate">{r.itemCode}</div>
//               <div className="text-[9px] text-slate-500 truncate">{r.printDescription}</div>
//               <div className="text-xs font-bold mt-1">
//                 {r.offerPrice ? `₹${r.offerPrice}` : r.retailPrice ? `₹${r.retailPrice}` : ''}
//               </div>
//               <div className="font-mono text-[10px] mt-1 tracking-wide">
//                 {r.barcodeGenerated}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }




//

'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import JsBarcode from 'jsbarcode';
/* Run: npm install jsbarcode
   Bundled as a real dependency instead of a <script src="cdnjs..."> tag -
   the CDN script was the blank-box problem: it either got blocked by a CSP
   header, a network/proxy filter, or just never resolved before this
   component rendered. Importing it means it ships inside your own JS
   bundle, so there's no runtime network call to fail. */

/* =====================================================================================
   LABEL FIELD MAP
   Which row field fills which slot on the printed label. Confirmed:
     - barcode graphic + the number printed under it -> barcodeGenerated
     - description line                              -> printDescription
     - big "RATE : ₹.../-" line                       -> offerPrice, falling back to retailPrice

   NOT yet confirmed against your data (image showed values like
   "G1260*4953*1", "608", "4-F-W BDR", "MNRG", "MMIO", "12.65 Mtr" with no
   obvious matching field name) - these four are best guesses so the page
   renders something sensible today. Swap the field names on the right below
   once you confirm them; nothing else in this file needs to change.
===================================================================================== */
const LABEL_FIELDS = {
  topRightCode: 'itemCode', // TODO confirm: label showed "G1260*4953*1"
  detailRow1: ['dummy', 'hsn', 'fma'], // TODO confirm: label showed "608" / "4-F-W BDR" / "MNRG"
  detailRow2Left: 'uom', // TODO confirm: label showed "MMIO"
  detailRow2Price: 'wspPrice', // TODO confirm: label showed "1,980" (smaller, above the big RATE line)
};

/** Renders one CODE128 barcode into an <svg>. barcodeGenerated is whatever
 *  string your Barcode Setting produced (e.g. "18A1005") - JsBarcode encodes
 *  it as-is, no reformatting. */
function BarcodeSvg({ value }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!value || !svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        displayValue: false,
        height: 42,
        width: 1.3,
        margin: 0,
      });
    } catch {
      // JsBarcode throws on characters it can't encode (e.g. empty string) -
      // leave the svg empty rather than crashing the whole sheet over one row
    }
  }, [value]);

  return <svg ref={svgRef} className="mx-auto block w-full max-w-[190px]" />;
}

/* One printable label, laid out top to bottom exactly like the reference:
   barcode graphic -> (barcode number | top-right code) -> description ->
   detail row 1 (3 values) -> detail row 2 (left value | qty+uom | price) ->
   big RATE line -> footer notes. */
function Label({ row }) {
  const rate = row.offerPrice || row.retailPrice || '';
  const detailRow1 = LABEL_FIELDS.detailRow1.map((k) => row[k]).filter((v) => v !== undefined);
  const qtyWithUom = [row.qty, row.uom].filter(Boolean).join(' ');

  return (
    <div className="px-3 py-2 text-center break-inside-avoid">
      <BarcodeSvg value={row.barcodeGenerated} />

      <div className="flex items-center justify-between text-[11px] font-semibold font-mono mt-0.5">
        <span>{row.barcodeGenerated}</span>
        <span>{row[LABEL_FIELDS.topRightCode]}</span>
      </div>

      <div className="text-[9px] text-slate-600 leading-tight mt-0.5 truncate">
        {row.printDescription || row.supplierDescription}
      </div>

      <div className="flex items-center justify-between text-[10px] font-semibold mt-1">
        {detailRow1.map((v, i) => (
          <span key={i}>{v}</span>
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] font-semibold mt-0.5">
        <span>{row[LABEL_FIELDS.detailRow2Left]}</span>
        <span>{qtyWithUom}</span>
        <span>{row[LABEL_FIELDS.detailRow2Price]}</span>
      </div>

      <div className="text-[13px] font-extrabold mt-1">
        RATE : ₹{rate}/-
      </div>

      <div className="flex items-center justify-between text-[7.5px] text-slate-500 mt-0.5">
        <span>(Inclusive all taxes)</span>
        <span>DRY WASH ONLY</span>
      </div>
      <div className="text-[7.5px] text-slate-500">
        No exchange, no guarantee, No Return
      </div>
    </div>
  );
}

/* =====================================================================================
   PAGE
===================================================================================== */
export default function GrcBarcodePrintPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/grc/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message || 'Failed to load'));
  }, [id]);

  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!data) return <div className="p-6 text-sm text-slate-500">Loading...</div>;

  const labels = data.rows.filter((r) => r.barcodeGenerated);

  return (
    <div className="max-w-5xl mx-auto p-6 print:p-0">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <div className="no-print flex justify-between items-center mb-4">
        <span className="text-xs text-slate-500">
          {labels.length} label(s) &middot; GRC {data.grc.grcNumber}
        </span>
        <button
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded shadow-sm"
        >
          Print Labels
        </button>
      </div>

      {labels.length === 0 ? (
        <p className="text-sm text-slate-400">
          No barcodes have been generated for this GRC yet.
        </p>
      ) : (
        // 2 per row for now - the actual physical label size will come from
        // elsewhere later, per your note, so this grid isn't tuned to a
        // specific sticker sheet yet.
        <div className="grid grid-cols-2 print:grid-cols-2">
          {labels.map((r, i) => (
            <div
              key={r._id}
              className={
                'border-y border-slate-300 ' +
                (i % 2 === 0 ? 'border-r border-dashed border-slate-400' : '')
              }
            >
              <Label row={r} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
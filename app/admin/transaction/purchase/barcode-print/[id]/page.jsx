
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

   The "G1260*4953*1" value in the reference image is now accounted for: it is
   the composite barcode built by buildBarcode() below, not a stored field.

   NOT yet confirmed against your data (image showed "608", "4-F-W BDR",
   "MNRG", "MMIO", "12.65 Mtr" with no obvious matching field name) - these
   are best guesses so the page renders something sensible today. Swap the
   field names on the right below once you confirm them; nothing else in this
   file needs to change.
===================================================================================== */
const LABEL_FIELDS = {
  topRightCode: 'itemCode',
  detailRow1: ['dummy', 'hsn', 'fma'], // TODO confirm: label showed "608" / "4-F-W BDR" / "MNRG"
  detailRow2Left: 'uom', // TODO confirm: label showed "MMIO"
  detailRow2Price: 'wspPrice', // TODO confirm: label showed "1,980" (smaller, above the big RATE line)
};

/* =====================================================================================
   BARCODE VALUE - assembled from the REAL GRC response. Nothing here is
   hardcoded, defaulted or invented; every part is traced to a stored field:

     SUPPLIER_CODE  grc.supplierCode  <- contact.contactId (models/Contact.js:143),
                                         the "Supplier Code" of the contact master.
                                         Carried by GET /api/grc/[id], which now
                                         selects it alongside the supplier name.
     GRC_NO         grc.grcNumber     <- models/Grc.js:21
     SL_NO          the row's position in the SAME rows array the GRC screen
                                         numbers its Item Summary from. That screen
                                         renders <td>{index + 1}</td> at
                                         grc/[id]/page.jsx:231, so position IS the
                                         official Sl No - no stored field holds it.
                                         "Bill Sl No." is a DIFFERENT column there
                                         (row.billSlNo) and is deliberately not used.
     QTY            row.qty           <- barcodeLabel.qty (lib/barcodeLabel.js:46),
                                         used exactly as stored, not reformatted.

   Both screens read GET /api/grc/[id], which sorts rows by createdAt ascending,
   so the index is stable and a label's Sl No always matches the Item Summary.
===================================================================================== */
function buildBarcode({ grc, row, slNo }) {
  const supplierCode = String(grc?.supplierCode ?? '').trim();
  const grcNo = String(grc?.grcNumber ?? '').trim();
  const qty = String(row?.qty ?? '').trim();

  if (!supplierCode) throw new Error('Supplier Code missing from real GRC data');
  if (!grcNo) throw new Error('GRC Number missing from real GRC data');
  if (slNo === undefined || slNo === null) throw new Error('Sl No missing from Item Summary');
  if (!qty) throw new Error('Quantity missing from Item Summary');

  return {
    value: `${supplierCode}*${grcNo}*${slNo}*${qty}`,      // what the bars encode
    display: `${supplierCode} * ${grcNo} * ${slNo} * ${qty}`, // spaced, for a human
  };
}

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
function Label({ row, grc, slNo }) {
  const rate = row.offerPrice || row.retailPrice || '';
  const detailRow1 = LABEL_FIELDS.detailRow1.map((k) => row[k]).filter((v) => v !== undefined);
  const qtyWithUom = [row.qty, row.uom].filter(Boolean).join(' ');

  /* A row missing any of the four parts prints the reason instead of a
     barcode. Failing the one label rather than throwing keeps the rest of the
     sheet printable, and no invalid value is ever encoded or shown - the
     alternative was a sticker reading "undefined*undefined*undefined". */
  let barcode = null;
  let barcodeError = '';
  try {
    barcode = buildBarcode({ grc, row, slNo });
  } catch (e) {
    barcodeError = e.message;
  }

  return (
    <div className="px-3 py-2 text-center break-inside-avoid">
      {barcode ? (
        <BarcodeSvg value={barcode.value} />
      ) : (
        <div className="py-3 text-[9px] font-semibold text-red-600">
          No barcode - {barcodeError}
        </div>
      )}

      {/* the encoded value in human-readable form, directly under the bars */}
      {barcode && (
        <div className="truncate font-mono text-[11px] font-semibold mt-0.5">
          {barcode.display}
        </div>
      )}

      {/* The generated unit number stays on the label. It is what every scan
          lookup still matches on (app/api/barcode/[code]/route.js:28 queries
          barcodeNo / barcodeGenerated), so dropping it would leave a sticker
          that cannot be traced back to its unit at all. */}
      <div className="flex items-center justify-between font-mono text-[9px] text-slate-600 mt-0.5">
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

      {/* The purchase (cost) rate written through the Purchase Rate Code
          Master, printed only when one is configured. Deliberately its own
          line: the RATE line above is the RETAIL/offer price and is left
          exactly as it was. */}
      {row.encodedPurRate && (
        <div className="font-mono text-[9px] font-semibold text-slate-700">
          {row.encodedPurRate}
        </div>
      )}

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

  /* Temporary verification aid: proves in the console that every printed part
     came out of the real backend response. Delete this effect once you are
     satisfied - nothing else depends on it. */
  useEffect(() => {
    if (!data) return;
    console.log('REAL GRC RESPONSE:', data.grc);
    console.log('REAL ITEM SUMMARY:', data.rows);
    (data.rows || []).forEach((row, index) => {
      const slNo = index + 1;
      try {
        const { value } = buildBarcode({ grc: data.grc, row, slNo });
        console.log('REAL BARCODE DATA:', {
          supplierCode: data.grc.supplierCode,
          grcNo: data.grc.grcNumber,
          slNo,
          qty: row.qty,
          barcodeValue: value,
        });
      } catch (e) {
        console.warn(`BARCODE SKIPPED (Sl No ${slNo}):`, e.message);
      }
    });
  }, [data]);

  /* Nothing is rendered until the real data has arrived, so a label can never
     flash "undefined * undefined * undefined * undefined". */
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!data) return <div className="p-6 text-sm text-slate-500">Loading GRC data...</div>;

  /* Sl No is positional (see buildBarcode), so the index must come from the
     FULL rows array - the same one the GRC screen's Item Summary numbers.
     Filtering first would renumber every label after the first row without a
     barcode and put the sheet quietly out of step with that summary. */
  const labels = data.rows
    .map((row, index) => ({ row, slNo: index + 1 }))
    .filter(({ row }) => row.barcodeGenerated);

  /* Supplier Code and GRC Number are the same for the whole sheet, so if
     either is missing every label is unprintable - say so once, up front,
     rather than repeating it on every sticker. */
  const missingHeader = [
    data.grc?.supplierCode ? '' : 'Supplier Code',
    data.grc?.grcNumber ? '' : 'GRC Number',
  ].filter(Boolean);

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
          {data.grc.supplierCode ? ` · Supplier ${data.grc.supplierCode}` : ''}
        </span>
        <button
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded shadow-sm"
        >
          Print Labels
        </button>
      </div>

      {missingHeader.length > 0 && (
        <p className="no-print mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {missingHeader.join(' and ')} {missingHeader.length === 1 ? 'is' : 'are'} missing
          from this GRC&rsquo;s real data, so no barcode can be built. Fix the record
          rather than printing a placeholder.
        </p>
      )}

      {labels.length === 0 ? (
        <p className="text-sm text-slate-400">
          No barcodes have been generated for this GRC yet.
        </p>
      ) : (
        // 2 per row for now - the actual physical label size will come from
        // elsewhere later, per your note, so this grid isn't tuned to a
        // specific sticker sheet yet.
        /* print-doc is what makes this sheet survive printing at all.
           globals.css hides every element on the page at print time
           (body * { visibility: hidden }) and only un-hides .print-doc and
           its children - that is how the sidebar, top bar and the Print
           button are kept off the paper. Without the class the labels were
           hidden along with everything else and the printout came out as a
           blank page, even though the screen looked correct.

           content-start goes with it: .print-doc is absolutely positioned
           at inset 0, so the grid is as tall as the page and its rows would
           otherwise stretch to fill it - one row of labels came out a full
           page tall, with the cut line running the whole sheet. */
        <div className="print-doc content-start grid grid-cols-2 print:grid-cols-2">
          {labels.map(({ row, slNo }, i) => (
            <div
              key={row._id}
              className={
                'border-y border-slate-300 ' +
                (i % 2 === 0 ? 'border-r border-dashed border-slate-400' : '')
              }
            >
              <Label row={row} grc={data.grc} slNo={slNo} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
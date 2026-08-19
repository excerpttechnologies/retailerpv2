// 'use client';
// import { use } from 'react';
// import TransactionFormView from '@/components/TransactionFormView';
// import { FORM } from '../form';

// /* Edit Goods Receiptc Challans */

// export default function EditTransactionPurchaseGrcPage({ params }) {
//   const { id } = use(params);

//   return (
//     <TransactionFormView
//       id={id}
//       cfg={{
//         title: "Goods Receiptc Challans",
//         addTitle: "Edit Goods Receiptc Challans",
//         basePath: '/admin/',
//         slugPath: "transaction/purchase/grc",
//         endpoint: '/api/purchase-grc',
//         scope: ["business","location","finYear"],
//         docType: "Goods Receipt Challan",
//         form: FORM,
//       }}
//     />
//   );
// }




//sagara

'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

/* Printable barcode label sheet: one small label per row (item code, price,
   generated barcode), laid out in a grid so it prints multiple labels per
   page. Rows that never had a barcode generated are skipped since there's
   nothing to print for them. */
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
        <div className="grid grid-cols-3 gap-2 print:grid-cols-3">
          {labels.map((r) => (
            <div
              key={r._id}
              className="border border-slate-400 rounded p-2 text-center break-inside-avoid"
            >
              <div className="text-[10px] font-semibold truncate">{r.itemCode}</div>
              <div className="text-[9px] text-slate-500 truncate">{r.printDescription}</div>
              <div className="text-xs font-bold mt-1">
                {r.offerPrice ? `₹${r.offerPrice}` : r.retailPrice ? `₹${r.retailPrice}` : ''}
              </div>
              <div className="font-mono text-[10px] mt-1 tracking-wide">
                {r.barcodeGenerated}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
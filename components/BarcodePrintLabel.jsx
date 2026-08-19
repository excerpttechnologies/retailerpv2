// 'use client';
// import { useCallback, useEffect, useState } from 'react';
// import { useSearchParams } from 'next/navigation';
// import Icon from './Icon';
// import MultiSelect from './MultiSelect';
// import { useScope } from './ScopeContext';
// import { useOptions } from './useOptions';

// /* Barcode Print Label.

//    Reached two ways:
//      - Action ▾ -> Barcode Print on the GRC list, which arrives as ?grc=<id>
//        and prefills the rows from that challan's items
//      - directly from the sidebar, where rows are added by scanning

//    "Barcode Copies + Apply" sets every row at once; "Copy Quantity to Barcode
//    Copies" pulls each row's own quantity across. */

// const n = (v, dp = 2) => (v === null || v === undefined || v === '' ? '' : Number(v).toFixed(dp));

// export default function BarcodePrintLabel() {
//   const sp = useSearchParams();
//   const grcId = sp.get('grc');
//   const scope = useScope();

//   /* the barcode SETTINGS master, not the label choice-table */
//   const { options, loading } = useOptions('barcodesetting');

//   const [settingId, setSettingId] = useState('');
//   const [rows, setRows] = useState([]);
//   const [bulkCopies, setBulkCopies] = useState(1);
//   const [scan, setScan] = useState('');
//   const [status, setStatus] = useState(null);
//   const [busy, setBusy] = useState(false);

//   /* ---------------------------------------------------- prefill from GRC -- */
//   useEffect(() => {
//     if (!grcId) return;
//     setBusy(true);

//     fetch('/api/purchase-grc/' + grcId + '/print')
//       .then(async (r) => {
//         if (!r.ok) throw new Error('Could not load that challan');
//         return r.json();
//       })
//       .then((d) => {
//         setRows((d.items || []).map((r) => ({
//           itemName: r.itemName,
//           itemCode: r.batchNo,
//           quantity: r.qty,
//           rsp: r.rsp,
//           wsp: r.wsp ?? '',
//           copies: 1,
//         })));
//         if (!(d.items || []).length) setStatus('That challan has no line items.');
//       })
//       .catch((e) => setStatus(e.message))
//       .finally(() => setBusy(false));
//   }, [grcId]);

//   /* --------------------------------------------------------------- scan --- */
//   const addScanned = useCallback(async (code) => {
//     if (!code.trim()) return;
//     setScan('');

//     try {
//       const r = await fetch('/api/item?perPage=1&search=' + encodeURIComponent(code.trim())
//         + '&business=' + (scope.business || ''));
//       const d = await r.json();
//       const hit = (d.rows || [])[0];
//       if (!hit) { setStatus('No item matches ' + code); return; }

//       setRows((prev) => [...prev, {
//         itemName: hit.name || '',
//         itemCode: hit.itemCode || code.trim(),
//         quantity: 0,
//         rsp: hit.rsp ?? '',
//         wsp: hit.wsp ?? '',
//         copies: 1,
//       }]);
//       setStatus(null);
//     } catch {
//       setStatus('Lookup failed');
//     }
//   }, [scope.business]);

//   const setCopies = (i, v) =>
//     setRows((prev) => prev.map((r, ri) => (ri === i ? { ...r, copies: v } : r)));

//   const applyToAll = () =>
//     setRows((prev) => prev.map((r) => ({ ...r, copies: Number(bulkCopies) || 0 })));

//   const copyQuantity = () =>
//     setRows((prev) => prev.map((r) => ({ ...r, copies: Number(r.quantity) || 0 })));

//   const preview = () => {
//     if (!settingId) { setStatus('Pick a barcode setting first.'); return; }
//     if (!rows.length) { setStatus('Nothing to preview.'); return; }
//     setStatus(null);
//     window.print();
//   };

//   const totalLabels = rows.reduce((a, r) => a + (Number(r.copies) || 0), 0);

//   return (
//     <div className="card">
//       <div className="card-head">
//         <span className="card-title">Barcode Print Label</span>
//       </div>

//       <div className="card-body">
//         {status && <div className="flash flash-err no-print">{status}</div>}

//         {/* setting + preview */}
//         <div className="no-print grid grid-cols-1 gap-4 md:grid-cols-3">
//           <div className="md:col-span-2">
//             <label className="f-label">Barcode setting</label>
//             <MultiSelect
//               mode="single"
//               options={options}
//               loading={loading}
//               value={settingId}
//               placeholder="Select..."
//               onChange={setSettingId}
//             />
//           </div>
//           <div className="flex items-end">
//             <button type="button" className="btn btn-primary h-[38px] w-full justify-center" onClick={preview}>
//               Preview
//             </button>
//           </div>
//         </div>

//         {/* copies controls */}
//         <div className="no-print mt-4 flex flex-wrap items-center gap-3">
//           <span className="text-[13px]">Barcode Copies</span>
//           <input
//             type="number" min="0"
//             className="f-input w-[86px]"
//             value={bulkCopies}
//             onChange={(e) => setBulkCopies(e.target.value)}
//           />
//           <button type="button" className="btn btn-primary" onClick={applyToAll}>Apply</button>
//           <span className="flex-1" />
//           <button type="button" className="btn" onClick={copyQuantity}>
//             <Icon name="file" size={13} /> Copy Quantity to Barcode Copies
//           </button>
//         </div>

//         {/* scan box - only when not driven by a GRC */}
//         {!grcId && (
//           <div className="no-print mt-3 max-w-[420px]">
//             <label className="f-label">Scan / type an item code</label>
//             <input
//               className="f-input"
//               value={scan}
//               placeholder="Scan barcode"
//               onChange={(e) => setScan(e.target.value)}
//               onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addScanned(scan); } }}
//             />
//           </div>
//         )}

//         <div className="print-doc mt-4 overflow-x-auto">
//           <table className="dt">
//             <thead>
//               <tr>
//                 <th>Item Name</th>
//                 <th>Item Code</th>
//                 <th>Quantity</th>
//                 <th>RSP Price</th>
//                 <th>WSP Price</th>
//                 <th style={{ width: 130 }}>Barcode Copies</th>
//                 <th className="no-print" style={{ width: 50 }} />
//               </tr>
//             </thead>
//             <tbody>
//               {busy && <tr><td colSpan={7} className="dt-empty"><span className="spin" /></td></tr>}
//               {!busy && rows.length === 0 && (
//                 <tr><td colSpan={7} className="dt-empty">No Item Found</td></tr>
//               )}
//               {rows.map((r, i) => (
//                 <tr key={r.itemCode + i}>
//                   <td className="text-brand-link">{r.itemName}</td>
//                   <td>{r.itemCode}</td>
//                   <td>{r.quantity}</td>
//                   <td>{n(r.rsp)}</td>
//                   <td>{n(r.wsp)}</td>
//                   <td>
//                     <input
//                       type="number" min="0"
//                       className="f-input h-8 w-[80px]"
//                       value={r.copies}
//                       onChange={(e) => setCopies(i, e.target.value)}
//                     />
//                   </td>
//                   <td className="no-print">
//                     <button
//                       type="button"
//                       className="act-btn bg-danger"
//                       onClick={() => setRows((prev) => prev.filter((_, ri) => ri !== i))}
//                     >
//                       <Icon name="trash" size={12} />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>

//         {rows.length > 0 && (
//           <div className="no-print mt-3 text-[13px] text-inkmuted">
//             {rows.length} item{rows.length === 1 ? '' : 's'} &middot; {totalLabels} label{totalLabels === 1 ? '' : 's'} to print
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }




'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Icon from './Icon';
import MultiSelect from './MultiSelect';
import { useScope } from './ScopeContext';

/* Barcode Print Label.

   Reached two ways:
     - Action ▾ -> Barcode Print on the GRC list, which arrives as ?grc=<id>
       and prefills the rows from that challan's items
     - directly from the sidebar, where rows are added by scanning

   "Barcode Copies + Apply" sets every row at once; "Copy Quantity to Barcode
   Copies" pulls each row's own quantity across. */

const n = (v, dp = 2) => (v === null || v === undefined || v === '' ? '' : Number(v).toFixed(dp));

export default function BarcodePrintLabel() {
  const sp = useSearchParams();
  const grcId = sp.get('grc');
  const scope = useScope();

  /* Label FORMATS, from Settings -> Barcode Label Settings - the sizes you
     ticked there (TF 50 x 40, MA 38 x 25 mm 1Ups, ...).

     Not the Barcode Settings master: that page holds numbering config
     (prefix, start number, period dates) and has no name to display. */
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settingId, setSettingId] = useState('');
  const [rows, setRows] = useState([]);
  const [bulkCopies, setBulkCopies] = useState(1);
  const [scan, setScan] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  /* ------------------------------------------------ chosen label formats -- */
  useEffect(() => {
    const qs = new URLSearchParams({
      business: scope.business || '', location: scope.location || '', finYear: scope.finYear || '',
    });

    fetch('/api/barcode-label-setting?' + qs)
      .then((r) => r.json())
      .then((d) => {
        const chosen = ((d.doc && d.doc.rows) || []).filter((r) => r.choice);
        setOptions(chosen.map((r) => ({ value: r.name, label: r.name })));

        /* preselect whichever format is marked Default there */
        const def = chosen.find((r) => r.isDefault);
        if (def) setSettingId(def.name);

        if (!chosen.length) {
          setStatus('No label formats are ticked yet - set them in Settings \u2192 Barcode Label Settings.');
        }
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [scope.business, scope.location, scope.finYear]);

  /* ---------------------------------------------------- prefill from GRC -- */
  useEffect(() => {
    if (!grcId) return;
    setBusy(true);

    fetch('/api/purchase-grc/' + grcId + '/print')
      .then(async (r) => {
        if (!r.ok) throw new Error('Could not load that challan');
        return r.json();
      })
      .then((d) => {
        setRows((d.items || []).map((r) => ({
          itemName: r.itemName,
          itemCode: r.batchNo,
          quantity: r.qty,
          rsp: r.rsp,
          wsp: r.wsp ?? '',
          copies: 1,
        })));
        if (!(d.items || []).length) setStatus('That challan has no line items.');
      })
      .catch((e) => setStatus(e.message))
      .finally(() => setBusy(false));
  }, [grcId]);

  /* --------------------------------------------------------------- scan --- */
  const addScanned = useCallback(async (code) => {
    if (!code.trim()) return;
    setScan('');

    try {
      const r = await fetch('/api/item?perPage=1&search=' + encodeURIComponent(code.trim())
        + '&business=' + (scope.business || ''));
      const d = await r.json();
      const hit = (d.rows || [])[0];
      if (!hit) { setStatus('No item matches ' + code); return; }

      setRows((prev) => [...prev, {
        itemName: hit.name || '',
        itemCode: hit.itemCode || code.trim(),
        quantity: 0,
        rsp: hit.rsp ?? '',
        wsp: hit.wsp ?? '',
        copies: 1,
      }]);
      setStatus(null);
    } catch {
      setStatus('Lookup failed');
    }
  }, [scope.business]);

  const setCopies = (i, v) =>
    setRows((prev) => prev.map((r, ri) => (ri === i ? { ...r, copies: v } : r)));

  const applyToAll = () =>
    setRows((prev) => prev.map((r) => ({ ...r, copies: Number(bulkCopies) || 0 })));

  const copyQuantity = () =>
    setRows((prev) => prev.map((r) => ({ ...r, copies: Number(r.quantity) || 0 })));

  const preview = () => {
    if (!settingId) { setStatus('Pick a label format first.'); return; }
    if (!rows.length) { setStatus('Nothing to preview.'); return; }
    setStatus(null);
    window.print();
  };

  const totalLabels = rows.reduce((a, r) => a + (Number(r.copies) || 0), 0);

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Barcode Print Label</span>
      </div>

      <div className="card-body">
        {status && <div className="flash flash-err no-print">{status}</div>}

        {/* setting + preview */}
        <div className="no-print grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="f-label">Barcode setting</label>
            <MultiSelect
              mode="single"
              options={options}
              loading={loading}
              value={settingId}
              placeholder="Select..."
              onChange={setSettingId}
            />
          </div>
          <div className="flex items-end">
            <button type="button" className="btn btn-primary h-[38px] w-full justify-center" onClick={preview}>
              Preview
            </button>
          </div>
        </div>

        {/* copies controls */}
        <div className="no-print mt-4 flex flex-wrap items-center gap-3">
          <span className="text-[13px]">Barcode Copies</span>
          <input
            type="number" min="0"
            className="f-input w-[86px]"
            value={bulkCopies}
            onChange={(e) => setBulkCopies(e.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={applyToAll}>Apply</button>
          <span className="flex-1" />
          <button type="button" className="btn" onClick={copyQuantity}>
            <Icon name="file" size={13} /> Copy Quantity to Barcode Copies
          </button>
        </div>

        {/* scan box - only when not driven by a GRC */}
        {!grcId && (
          <div className="no-print mt-3 max-w-[420px]">
            <label className="f-label">Scan / type an item code</label>
            <input
              className="f-input"
              value={scan}
              placeholder="Scan barcode"
              onChange={(e) => setScan(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addScanned(scan); } }}
            />
          </div>
        )}

        <div className="print-doc mt-4 overflow-x-auto">
          <table className="dt">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Item Code</th>
                <th>Quantity</th>
                <th>RSP Price</th>
                <th>WSP Price</th>
                <th style={{ width: 130 }}>Barcode Copies</th>
                <th className="no-print" style={{ width: 50 }} />
              </tr>
            </thead>
            <tbody>
              {busy && <tr><td colSpan={7} className="dt-empty"><span className="spin" /></td></tr>}
              {!busy && rows.length === 0 && (
                <tr><td colSpan={7} className="dt-empty">No Item Found</td></tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.itemCode + i}>
                  <td className="text-brand-link">{r.itemName}</td>
                  <td>{r.itemCode}</td>
                  <td>{r.quantity}</td>
                  <td>{n(r.rsp)}</td>
                  <td>{n(r.wsp)}</td>
                  <td>
                    <input
                      type="number" min="0"
                      className="f-input h-8 w-[80px]"
                      value={r.copies}
                      onChange={(e) => setCopies(i, e.target.value)}
                    />
                  </td>
                  <td className="no-print">
                    <button
                      type="button"
                      className="act-btn bg-danger"
                      onClick={() => setRows((prev) => prev.filter((_, ri) => ri !== i))}
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="no-print mt-3 text-[13px] text-inkmuted">
            {rows.length} item{rows.length === 1 ? '' : 's'} &middot; {totalLabels} label{totalLabels === 1 ? '' : 's'} to print
          </div>
        )}
      </div>
    </div>
  );
}
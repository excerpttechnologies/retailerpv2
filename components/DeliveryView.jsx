// 'use client';
// import { useCallback, useEffect, useState } from 'react';
// import Icon from './Icon';
// import Toolbar from './Toolbar';
// import Field from './Field';
// import ModalForm from './ModalForm';
// import { useScope } from './ScopeContext';
// import { useOptions } from './useOptions';
// import { fmt, toCsv, toXlsHtml, download, printTable } from '@/lib/format';
// import { FIELDS, freightBreakdown, bookingDelayDays, delayTone } from '@/app/admin/transport/delivery/fields';
// import { FIELDS as TRANSPORTER_FIELDS } from '@/app/admin/transport/transporter/fields';

// /* ==========================================================================
//    Delivery / LR Transactions.

//    Three things this screen does that the generic list pattern can't:

//      - a Filter card (start / end date) sitting above the list, applied only
//        when Search is pressed
//      - an Add dialog in three sections whose Total Freight Payable updates as
//        you type, with Transaction No issued by the server on save
//      - a read-only View dialog showing the freight breakdown

//    The freight maths is imported from the page's fields.js, which the API
//    also imports - so what you see while typing is what gets stored.
//    ========================================================================== */

// const ENDPOINT = '/api/delivery';
// const money = (n) => '\u20b9 ' + (Number(n) || 0).toFixed(2);

// const COLUMNS = [
//   { k: 'transactionNo', t: 'Transaction No' },
//   { k: 'transactionDate', t: 'Date', f: 'date' },
//   { k: 'transporterId', t: 'Transporter', f: 'ref' },
//   { k: 'lrNumber', t: 'LR No' },
//   { k: 'bookingDelay', t: 'Booking Delay' },
//   { k: 'supplierId', t: 'Supplier', f: 'ref' },
//   { k: 'invPmNumber', t: 'Invoice No' },
//   { k: 'parcelQty', t: 'Parcel Qty' },
//   { k: 'value', t: 'Value', f: 'amount' },
//   { k: 'totalFreight', t: 'Freight', f: 'amount' },
// ];

// const field = (k) => FIELDS.find((f) => f.k === k);

// function Section({ title, children }) {
//   return (
//     <div className="mb-4">
//       <div className="mb-2 border-b border-line pb-1 text-[11.5px] font-bold uppercase tracking-wide text-inkmuted">
//         {title}
//       </div>
//       {children}
//     </div>
//   );
// }

// /* ------------------------------------------------------------- ADD/EDIT -- */

// function DeliveryDialog({ row, onClose, onSaved }) {
//   const scope = useScope();
//   const isEdit = Boolean(row?._id);

//   const [data, setData] = useState(() => {
//     const d = {};
//     FIELDS.forEach((f) => {
//       const v = row?.[f.k];
//       d[f.k] = v === undefined || v === null
//         ? (f.def !== undefined ? f.def : '')
//         : (f.type === 'date' ? String(v).slice(0, 10) : (f.type === 'ref' ? String(v) : v));
//     });
//     return d;
//   });
//   const [errors, setErrors] = useState({});
//   const [flash, setFlash] = useState(null);
//   const [saving, setSaving] = useState(false);
//   const [addingTransporter, setAddingTransporter] = useState(false);
//   /* bumped after a transporter is created inline, to refetch the dropdown */
//   const [transporterNonce, setTransporterNonce] = useState(0);

//   const set = (k, v) => {
//     setData((d) => ({ ...d, [k]: v }));
//     setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
//   };

//   /* same helper the API uses, so this preview cannot disagree with storage */
//   const totals = freightBreakdown(data);

//   async function submit() {
//     setSaving(true);
//     setFlash(null);
//     try {
//       const r = await fetch(ENDPOINT + (isEdit ? '/' + row._id : ''), {
//         method: isEdit ? 'PUT' : 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           data,
//           business: scope.business, location: scope.location, finYear: scope.finYear,
//         }),
//       });
//       const d = await r.json();

//       if (r.status === 422) {
//         setErrors(d.errors || {});
//         setFlash({ type: 'err', msg: 'Please correct the highlighted fields.' });
//         return;
//       }
//       if (!r.ok) { setFlash({ type: 'err', msg: d.error || 'Save failed' }); return; }

//       onSaved();
//     } finally {
//       setSaving(false);
//     }
//   }

//   return (
//     <>
//       {addingTransporter && (
//         <ModalForm
//           cfg={{
//             addTitle: 'Add Transporter',
//             endpoint: '/api/transporter',
//             fields: TRANSPORTER_FIELDS,
//             modalWide: true,
//           }}
//           slug="transporter"
//           onClose={() => setAddingTransporter(false)}
//           onSaved={() => {
//             setAddingTransporter(false);
//             setTransporterNonce((n) => n + 1);
//           }}
//         />
//       )}

//       <div
//         className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/45 p-4 pt-10"
//         onMouseDown={onClose}
//       >
//         <div
//           className="w-full max-w-[560px] rounded-lg bg-white shadow-pop"
//           onMouseDown={(e) => e.stopPropagation()}
//         >
//           <div className="flex items-center border-b border-line px-4 py-3">
//             <span className="text-[15px] font-bold">
//               {isEdit ? 'Edit' : 'Add'} Delivery / LR Transaction
//             </span>
//             <span className="flex-1" />
//             <button type="button" onClick={onClose} className="text-inkmuted">
//               <Icon name="x" size={15} />
//             </button>
//           </div>

//           <div className="px-4 py-4">
//             {flash && <div className={'flash ' + (flash.type === 'err' ? 'flash-err' : 'flash-ok')}>{flash.msg}</div>}

//             <Section title="Transaction Info">
//               <div className="mb-3">
//                 <label className="f-label">Transaction No<span className="f-req">*</span></label>
//                 <input
//                   className="f-input bg-[#eff2f7] text-inkmuted"
//                   value={isEdit ? (row.transactionNo || '') : 'Auto generate on save'}
//                   readOnly
//                 />
//               </div>

//               <div className="grid grid-cols-1 gap-3">
//                 <Field f={field('transactionDate')} value={data.transactionDate} error={errors.transactionDate} onChange={set} />

//                 <div>
//                   <Field
//                     key={'transporter-' + transporterNonce}
//                     f={field('transporterId')}
//                     value={data.transporterId}
//                     error={errors.transporterId}
//                     onChange={set}
//                   />
//                   <button
//                     type="button"
//                     className="btn btn-primary mt-2"
//                     onClick={() => setAddingTransporter(true)}
//                   >
//                     <Icon name="plus" size={13} /> Transporter
//                   </button>
//                 </div>

//                 <Field f={field('lrNumber')} value={data.lrNumber} error={errors.lrNumber} onChange={set} />
//                 <Field f={field('bookingDate')} value={data.bookingDate} error={errors.bookingDate} onChange={set} />
//               </div>
//             </Section>

//             <Section title="Supplier / Parcel Info">
//               <div className="grid grid-cols-1 gap-3">
//                 {['supplierId', 'invPmNumber', 'parcelQty', 'value'].map((k) => (
//                   <Field key={k} f={field(k)} value={data[k]} error={errors[k]} onChange={set} />
//                 ))}
//               </div>
//             </Section>

//             <Section title="Freight Details">
//               <div className="grid grid-cols-1 gap-3">
//                 <Field f={field('freightAmount')} value={data.freightAmount} error={errors.freightAmount} onChange={set} />
//                 <Field f={field('gstApplicable')} value={data.gstApplicable} error={errors.gstApplicable} onChange={set} />

//                 <div className="flex items-center border-y border-line py-2">
//                   <span className="text-[13.5px] font-semibold">Total Freight Payable</span>
//                   <span className="flex-1" />
//                   <span className="text-[13.5px] font-semibold text-brand-link">
//                     {money(totals.totalFreight)}
//                   </span>
//                 </div>

//                 <Field f={field('autoCharges')} value={data.autoCharges} error={errors.autoCharges} onChange={set} />
//                 <Field f={field('tips')} value={data.tips} error={errors.tips} onChange={set} />
//               </div>
//             </Section>

//             <div className="mt-4 flex justify-end gap-2">
//               <button type="button" className="btn" onClick={onClose}>Cancel</button>
//               <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
//                 {saving ? <span className="spin" /> : <Icon name="save" size={14} />} Save
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// /* ----------------------------------------------------------------- VIEW -- */

// function Line({ label, value, badge, badgeTone = 'blue', strong }) {
//   return (
//     <div className={'flex items-center py-1.5 ' + (strong ? 'font-semibold' : '')}>
//       <span className="text-[13.5px]">{label}</span>
//       <span className="flex-1" />
//       <span className="text-[13.5px]">{value}</span>
//       {badge && <span className={'pill pill-' + badgeTone + ' ml-2'}>{badge}</span>}
//     </div>
//   );
// }

// function ViewDialog({ row, labels, onClose }) {
//   const transporter = labels[String(row.transporterId)] || '';
//   const supplier = labels[String(row.supplierId)] || '';

//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/45 p-4 pt-12"
//       onMouseDown={onClose}
//     >
//       <div className="w-full max-w-[900px] rounded-lg bg-white shadow-pop" onMouseDown={(e) => e.stopPropagation()}>
//         <div className="flex items-center border-b border-line px-5 py-3">
//           <span className="text-[16px] font-bold">View Delivery &mdash; {row.transactionNo}</span>
//           <span className="flex-1" />
//           <button type="button" onClick={onClose} className="text-inkmuted"><Icon name="x" size={16} /></button>
//         </div>

//         <div className="px-5 py-4">
//           <Section title="Transaction Info">
//             <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
//               <Line label="Transaction No" value={row.transactionNo} />
//               <Line label="Transaction Date" value={fmt('date', row.transactionDate)} />
//               <Line label="Transporter" value={transporter} />
//               <Line label="LR Number" value={row.lrNumber} />
//               <Line label="Booking Date" value={fmt('date', row.bookingDate)} />
//             </div>
//           </Section>

//           <Section title="Supplier / Parcel">
//             <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
//               <Line label="Supplier Name" value={supplier} />
//               <Line label="Inv / PM Number" value={row.invPmNumber} />
//               <Line label="Parcel Qty" value={row.parcelQty ?? ''} />
//               <Line label="Value" value={money(row.value)} />
//             </div>
//           </Section>

//           <Section title="Freight Breakdown">
//             <Line label="Freight" value={money(row.freightAmount)} badge="INDIRECT EXP" badgeTone="red" />
//             <Line label={'Input CGST @ ' + (Number(row.gstRate) || 0) / 2 + '%'} value={money(row.inputCgst)} badge="GST" />
//             <Line label={'Input SGST @ ' + (Number(row.gstRate) || 0) / 2 + '%'} value={money(row.inputSgst)} badge="GST" />
//             <div className="border-t border-line" />
//             <Line label="Total Freight" value={money(row.totalFreight)} badge={transporter} badgeTone="grey" strong />
//             <Line label="Auto Charges" value={money(row.autoCharges)} />
//             <Line label="Tips" value={money(row.tips)} />
//           </Section>

//           <div className="flex justify-end">
//             <button type="button" className="btn" onClick={onClose}>Close</button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ----------------------------------------------------------------- LIST -- */

// export default function DeliveryView() {
//   const { business, location, finYear } = useScope();
//   const [state, setState] = useState({ rows: [], labels: {}, page: 1, pages: 1, total: 0 });
//   const [search, setSearch] = useState('');
//   const [hidden, setHidden] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(1);
//   const [range, setRange] = useState({ startDate: '', endDate: '' });
//   const [applied, setApplied] = useState({ startDate: '', endDate: '' });
//   const [editing, setEditing] = useState(null);
//   const [viewing, setViewing] = useState(null);

//   const load = useCallback(async () => {
//     setLoading(true);
//     const qs = new URLSearchParams({
//       page: String(page), search,
//       business: business || '', location: location || '', finYear: finYear || '',
//     });
//     if (applied.startDate) qs.set('startDate', applied.startDate);
//     if (applied.endDate) qs.set('endDate', applied.endDate);

//     try {
//       const r = await fetch(ENDPOINT + '?' + qs);
//       const d = await r.json();
//       setState({
//         rows: d.rows || [], labels: d.labels || {},
//         page: d.page || 1, pages: d.pages || 1, total: d.total || 0,
//       });
//     } finally {
//       setLoading(false);
//     }
//   }, [page, search, business, location, finYear, applied]);

//   useEffect(() => { load(); }, [load]);
//   useEffect(() => { setPage(1); }, [search, business, location, finYear, applied]);

//   const visible = COLUMNS.filter((c) => !hidden.includes(c.t));

//   const cellText = (row, col) => {
//     if (col.k === 'bookingDelay') {
//       const d = bookingDelayDays(row);
//       return d === null ? '' : d + (d === 1 ? ' day' : ' days');
//     }
//     if (col.f === 'ref') return state.labels[String(row[col.k])] || '';
//     return col.f ? fmt(col.f, row[col.k]) : (row[col.k] ?? '');
//   };

//   const cell = (row, col) => {
//     if (col.k === 'bookingDelay') {
//       const d = bookingDelayDays(row);
//       if (d === null) return '';
//       return <span className={'pill pill-' + delayTone(d)}>{cellText(row, col)}</span>;
//     }
//     return cellText(row, col);
//   };

//   const exportRows = () => state.rows.map((r) => visible.map((c) => cellText(r, c)));
//   const exportHeaders = () => visible.map((c) => c.t);

//   async function remove(id) {
//     if (!window.confirm('Delete this record?')) return;
//     const r = await fetch(ENDPOINT + '/' + id, { method: 'DELETE' });
//     if (!r.ok) {
//       const d = await r.json().catch(() => ({}));
//       window.alert(d.error || 'Could not delete this record.');
//       return;
//     }
//     load();
//   }

//   return (
//     <>
//       {editing && (
//         <DeliveryDialog
//           row={editing === true ? null : editing}
//           onClose={() => setEditing(null)}
//           onSaved={() => { setEditing(null); setPage(1); load(); }}
//         />
//       )}

//       {viewing && <ViewDialog row={viewing} labels={state.labels} onClose={() => setViewing(null)} />}

//       {/* Filter card */}
//       <div className="card">
//         <div className="card-head">
//           <span className="card-title"><Icon name="filter" size={15} /> Filter</span>
//         </div>
//         <div className="card-body">
//           <div className="grid grid-cols-1 items-end gap-x-[22px] gap-y-3.5 md:grid-cols-2 xl:grid-cols-3">
//             <div>
//               <label className="f-label">Start Date</label>
//               <input
//                 type="date" className="f-input" value={range.startDate}
//                 onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))}
//               />
//             </div>
//             <div>
//               <label className="f-label">End Date</label>
//               <input
//                 type="date" className="f-input" value={range.endDate}
//                 onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))}
//               />
//             </div>
//             <button
//               type="button"
//               className="btn btn-primary h-9 justify-center"
//               onClick={() => setApplied(range)}
//             >
//               <Icon name="search" size={14} /> Search
//             </button>
//           </div>
//         </div>
//       </div>

//       <div className="card">
//         <div className="card-head">
//           <span className="card-title">Delivery / LR Transactions</span>
//           <span className="flex-1" />
//           <button type="button" className="btn btn-ghost" onClick={load}>
//             <Icon name="refresh" size={14} /> Refresh
//           </button>
//         </div>

//         <div className="card-body">
//           <Toolbar
//             columns={COLUMNS}
//             hidden={hidden}
//             onToggleColumn={(t) =>
//               setHidden((h) => (h.includes(t) ? h.filter((x) => x !== t) : [...h, t]))
//             }
//             search={search}
//             onSearch={setSearch}
//             onAdd={() => setEditing(true)}
//             onExportCsv={() => download('delivery.csv', toCsv(exportHeaders(), exportRows()), 'text/csv')}
//             onExportExcel={() =>
//               download('delivery.xls', toXlsHtml('Delivery / LR', exportHeaders(), exportRows()),
//                 'application/vnd.ms-excel')
//             }
//             onExportPdf={() => printTable('Delivery / LR Transactions', exportHeaders(), exportRows())}
//           />

//           <div className="mt-3 overflow-x-auto">
//             <table className="dt">
//               <thead>
//                 <tr>
//                   {visible.map((c, i) => <th key={c.t + i}>{c.t}</th>)}
//                   <th>Action</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {loading && (
//                   <tr><td colSpan={visible.length + 1} className="dt-empty"><span className="spin" /></td></tr>
//                 )}
//                 {!loading && state.rows.length === 0 && (
//                   <tr><td colSpan={visible.length + 1} className="dt-empty">No Data..</td></tr>
//                 )}
//                 {!loading && state.rows.map((row) => (
//                   <tr key={row._id}>
//                     {visible.map((c, i) => <td key={c.t + i}>{cell(row, c)}</td>)}
//                     <td>
//                       <span className="inline-flex items-center gap-1.5">
//                         <button className="act-btn bg-[#2b7fd4]" title="View" onClick={() => setViewing(row)}>
//                           <Icon name="eye" size={12} />
//                         </button>
//                         <button className="act-btn bg-warnyellow" title="Edit" onClick={() => setEditing(row)}>
//                           <Icon name="pencil" size={12} />
//                         </button>
//                         <button className="act-btn bg-danger" title="Delete" onClick={() => remove(row._id)}>
//                           <Icon name="trash" size={12} />
//                         </button>
//                       </span>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           <div className="flex items-center pt-3 text-[13px] text-cell">
//             <span>Page <b className="text-brand-link">{state.page}</b> of {state.pages}</span>
//             <span className="flex-1" />
//             <span className="flex gap-2">
//               <button className="btn" disabled={state.page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
//               <button className="btn" disabled={state.page >= state.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
//             </span>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }


















'use client';
import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon';
import Toolbar from './Toolbar';
import Field from './Field';
import ModalForm from './ModalForm';
import { useScope } from './ScopeContext';
import { useOptions } from './useOptions';
import { fmt, toCsv, toXlsHtml, download, printTable } from '@/lib/format';
import { FIELDS, freightBreakdown, bookingDelayDays, delayTone } from '@/app/admin/transport/delivery/fields';
import { FIELDS as TRANSPORTER_FIELDS } from '@/app/admin/transport/transporter/fields';

/* ==========================================================================
   Delivery / LR Transactions.

   Three things this screen does that the generic list pattern can't:

     - a Filter card (start / end date) sitting above the list, applied only
       when Search is pressed
     - an Add dialog in three sections whose Total Freight Payable updates as
       you type, with Transaction No issued by the server on save
     - a read-only View dialog showing the freight breakdown

   The freight maths is imported from the page's fields.js, which the API
   also imports - so what you see while typing is what gets stored.
   ========================================================================== */

const ENDPOINT = '/api/delivery';
const money = (n) => '\u20b9 ' + (Number(n) || 0).toFixed(2);

const COLUMNS = [
  { k: 'transactionNo', t: 'Transaction No' },
  { k: 'transactionDate', t: 'Date', f: 'date' },
  { k: 'transporterId', t: 'Transporter', f: 'ref' },
  { k: 'lrNumber', t: 'LR No' },
  { k: 'bookingDelay', t: 'Booking Delay' },
  { k: 'supplierId', t: 'Supplier', f: 'ref' },
  { k: 'invPmNumber', t: 'Invoice No' },
  { k: 'parcelQty', t: 'Parcel Qty' },
  { k: 'value', t: 'Value', f: 'amount' },
  { k: 'totalFreight', t: 'Freight', f: 'amount' },
  { k: 'dispatchId', t: 'Dispatch', f: 'ref' },
];

const field = (k) => FIELDS.find((f) => f.k === k);

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <div className="mb-2 border-b border-line pb-1 text-[11.5px] font-bold uppercase tracking-wide text-inkmuted">
        {title}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------- ADD/EDIT -- */

function DeliveryDialog({ row, onClose, onSaved }) {
  const scope = useScope();
  const isEdit = Boolean(row?._id);

  const [data, setData] = useState(() => {
    const d = {};
    FIELDS.forEach((f) => {
      const v = row?.[f.k];
      d[f.k] = v === undefined || v === null
        ? (f.def !== undefined ? f.def : '')
        : (f.type === 'date' ? String(v).slice(0, 10) : (f.type === 'ref' ? String(v) : v));
    });
    return d;
  });
  const [errors, setErrors] = useState({});
  const [flash, setFlash] = useState(null);
  const [saving, setSaving] = useState(false);
  const [addingTransporter, setAddingTransporter] = useState(false);
  /* bumped after a transporter is created inline, to refetch the dropdown */
  const [transporterNonce, setTransporterNonce] = useState(0);

  const set = (k, v) => {
    setData((d) => ({ ...d, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  /* same helper the API uses, so this preview cannot disagree with storage */
  const totals = freightBreakdown(data);

  async function submit() {
    setSaving(true);
    setFlash(null);
    try {
      const r = await fetch(ENDPOINT + (isEdit ? '/' + row._id : ''), {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          business: scope.business, location: scope.location, finYear: scope.finYear,
        }),
      });
      const d = await r.json();

      if (r.status === 422) {
        setErrors(d.errors || {});
        setFlash({ type: 'err', msg: 'Please correct the highlighted fields.' });
        return;
      }
      if (!r.ok) { setFlash({ type: 'err', msg: d.error || 'Save failed' }); return; }

      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {addingTransporter && (
        <ModalForm
          cfg={{
            addTitle: 'Add Transporter',
            endpoint: '/api/transporter',
            fields: TRANSPORTER_FIELDS,
            modalWide: true,
          }}
          slug="transporter"
          onClose={() => setAddingTransporter(false)}
          onSaved={() => {
            setAddingTransporter(false);
            setTransporterNonce((n) => n + 1);
          }}
        />
      )}

      <div
        className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/45 p-4 pt-10"
        onMouseDown={onClose}
      >
        <div
          className="w-full max-w-[560px] rounded-lg bg-white shadow-pop"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center border-b border-line px-4 py-3">
            <span className="text-[15px] font-bold">
              {isEdit ? 'Edit' : 'Add'} Delivery / LR Transaction
            </span>
            <span className="flex-1" />
            <button type="button" onClick={onClose} className="text-inkmuted">
              <Icon name="x" size={15} />
            </button>
          </div>

          <div className="px-4 py-4">
            {flash && <div className={'flash ' + (flash.type === 'err' ? 'flash-err' : 'flash-ok')}>{flash.msg}</div>}

            <Section title="Transaction Info">
              <div className="mb-3">
                <label className="f-label">Transaction No<span className="f-req">*</span></label>
                <input
                  className="f-input bg-[#eff2f7] text-inkmuted"
                  value={isEdit ? (row.transactionNo || '') : 'Auto generate on save'}
                  readOnly
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Field f={field('transactionDate')} value={data.transactionDate} error={errors.transactionDate} onChange={set} />

                <div>
                  <Field
                    key={'transporter-' + transporterNonce}
                    f={field('transporterId')}
                    value={data.transporterId}
                    error={errors.transporterId}
                    onChange={set}
                  />
                  <button
                    type="button"
                    className="btn btn-primary mt-2"
                    onClick={() => setAddingTransporter(true)}
                  >
                    <Icon name="plus" size={13} /> Transporter
                  </button>
                </div>

                <Field f={field('lrNumber')} value={data.lrNumber} error={errors.lrNumber} onChange={set} />
                <Field f={field('bookingDate')} value={data.bookingDate} error={errors.bookingDate} onChange={set} />
              </div>
            </Section>

            <Section title="Supplier / Parcel Info">
              <div className="grid grid-cols-1 gap-3">
                {['supplierId', 'invPmNumber', 'parcelQty', 'value'].map((k) => (
                  <Field key={k} f={field(k)} value={data[k]} error={errors[k]} onChange={set} />
                ))}
              </div>
            </Section>

            <Section title="Freight Details">
              <div className="grid grid-cols-1 gap-3">
                <Field f={field('freightAmount')} value={data.freightAmount} error={errors.freightAmount} onChange={set} />
                <Field f={field('gstApplicable')} value={data.gstApplicable} error={errors.gstApplicable} onChange={set} />

                <div className="flex items-center border-y border-line py-2">
                  <span className="text-[13.5px] font-semibold">Total Freight Payable</span>
                  <span className="flex-1" />
                  <span className="text-[13.5px] font-semibold text-brand-link">
                    {money(totals.totalFreight)}
                  </span>
                </div>

                <Field f={field('autoCharges')} value={data.autoCharges} error={errors.autoCharges} onChange={set} />
                <Field f={field('tips')} value={data.tips} error={errors.tips} onChange={set} />
              </div>
            </Section>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
                {saving ? <span className="spin" /> : <Icon name="save" size={14} />} Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- VIEW -- */

function Line({ label, value, badge, badgeTone = 'blue', strong }) {
  return (
    <div className={'flex items-center py-1.5 ' + (strong ? 'font-semibold' : '')}>
      <span className="text-[13.5px]">{label}</span>
      <span className="flex-1" />
      <span className="text-[13.5px]">{value}</span>
      {badge && <span className={'pill pill-' + badgeTone + ' ml-2'}>{badge}</span>}
    </div>
  );
}

function ViewDialog({ row, labels, onClose }) {
  const transporter = labels[String(row.transporterId)] || '';
  const supplier = labels[String(row.supplierId)] || '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/45 p-4 pt-12"
      onMouseDown={onClose}
    >
      <div className="w-full max-w-[900px] rounded-lg bg-white shadow-pop" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center border-b border-line px-5 py-3">
          <span className="text-[16px] font-bold">View Delivery &mdash; {row.transactionNo}</span>
          <span className="flex-1" />
          <button type="button" onClick={onClose} className="text-inkmuted"><Icon name="x" size={16} /></button>
        </div>

        <div className="px-5 py-4">
          <Section title="Transaction Info">
            <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
              <Line label="Transaction No" value={row.transactionNo} />
              <Line label="Transaction Date" value={fmt('date', row.transactionDate)} />
              <Line label="Transporter" value={transporter} />
              <Line label="LR Number" value={row.lrNumber} />
              <Line label="Booking Date" value={fmt('date', row.bookingDate)} />
            <Line
              label="Dispatch"
              value={labels[String(row.dispatchId)] || 'Not dispatched'}
            />
            </div>
          </Section>

          <Section title="Supplier / Parcel">
            <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
              <Line label="Supplier Name" value={supplier} />
              <Line label="Inv / PM Number" value={row.invPmNumber} />
              <Line label="Parcel Qty" value={row.parcelQty ?? ''} />
              <Line label="Value" value={money(row.value)} />
            </div>
          </Section>

          <Section title="Freight Breakdown">
            <Line label="Freight" value={money(row.freightAmount)} badge="INDIRECT EXP" badgeTone="red" />
            <Line label={'Input CGST @ ' + (Number(row.gstRate) || 0) / 2 + '%'} value={money(row.inputCgst)} badge="GST" />
            <Line label={'Input SGST @ ' + (Number(row.gstRate) || 0) / 2 + '%'} value={money(row.inputSgst)} badge="GST" />
            <div className="border-t border-line" />
            <Line label="Total Freight" value={money(row.totalFreight)} badge={transporter} badgeTone="grey" strong />
            <Line label="Auto Charges" value={money(row.autoCharges)} />
            <Line label="Tips" value={money(row.tips)} />
          </Section>

          <div className="flex justify-end">
            <button type="button" className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- LIST -- */

export default function DeliveryView() {
  const { business, location, finYear } = useScope();
  const [state, setState] = useState({ rows: [], labels: {}, page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [hidden, setHidden] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [range, setRange] = useState({ startDate: '', endDate: '' });
  const [applied, setApplied] = useState({ startDate: '', endDate: '' });
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), search,
      business: business || '', location: location || '', finYear: finYear || '',
    });
    if (applied.startDate) qs.set('startDate', applied.startDate);
    if (applied.endDate) qs.set('endDate', applied.endDate);

    try {
      const r = await fetch(ENDPOINT + '?' + qs);
      const d = await r.json();
      setState({
        rows: d.rows || [], labels: d.labels || {},
        page: d.page || 1, pages: d.pages || 1, total: d.total || 0,
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, business, location, finYear, applied]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, business, location, finYear, applied]);

  const visible = COLUMNS.filter((c) => !hidden.includes(c.t));

  const cellText = (row, col) => {
    if (col.k === 'bookingDelay') {
      const d = bookingDelayDays(row);
      return d === null ? '' : d + (d === 1 ? ' day' : ' days');
    }
    if (col.f === 'ref') {
      const label = state.labels[String(row[col.k])] || '';
      /* an unclaimed consignment should read as such, not as a blank cell */
      return label || (col.k === 'dispatchId' ? '\u2014' : '');
    }
    return col.f ? fmt(col.f, row[col.k]) : (row[col.k] ?? '');
  };

  const cell = (row, col) => {
    if (col.k === 'bookingDelay') {
      const d = bookingDelayDays(row);
      if (d === null) return '';
      return <span className={'pill pill-' + delayTone(d)}>{cellText(row, col)}</span>;
    }
    return cellText(row, col);
  };

  const exportRows = () => state.rows.map((r) => visible.map((c) => cellText(r, c)));
  const exportHeaders = () => visible.map((c) => c.t);

  async function remove(id) {
    if (!window.confirm('Delete this record?')) return;
    const r = await fetch(ENDPOINT + '/' + id, { method: 'DELETE' });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      window.alert(d.error || 'Could not delete this record.');
      return;
    }
    load();
  }

  return (
    <>
      {editing && (
        <DeliveryDialog
          row={editing === true ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setPage(1); load(); }}
        />
      )}

      {viewing && <ViewDialog row={viewing} labels={state.labels} onClose={() => setViewing(null)} />}

      {/* Filter card */}
      <div className="card">
        <div className="card-head">
          <span className="card-title"><Icon name="filter" size={15} /> Filter</span>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 items-end gap-x-[22px] gap-y-3.5 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="f-label">Start Date</label>
              <input
                type="date" className="f-input" value={range.startDate}
                onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="f-label">End Date</label>
              <input
                type="date" className="f-input" value={range.endDate}
                onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary h-9 justify-center"
              onClick={() => setApplied(range)}
            >
              <Icon name="search" size={14} /> Search
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">Delivery / LR Transactions</span>
          <span className="flex-1" />
          <button type="button" className="btn btn-ghost" onClick={load}>
            <Icon name="refresh" size={14} /> Refresh
          </button>
        </div>

        <div className="card-body">
          <Toolbar
            columns={COLUMNS}
            hidden={hidden}
            onToggleColumn={(t) =>
              setHidden((h) => (h.includes(t) ? h.filter((x) => x !== t) : [...h, t]))
            }
            search={search}
            onSearch={setSearch}
            onAdd={() => setEditing(true)}
            onExportCsv={() => download('delivery.csv', toCsv(exportHeaders(), exportRows()), 'text/csv')}
            onExportExcel={() =>
              download('delivery.xls', toXlsHtml('Delivery / LR', exportHeaders(), exportRows()),
                'application/vnd.ms-excel')
            }
            onExportPdf={() => printTable('Delivery / LR Transactions', exportHeaders(), exportRows())}
          />

          <div className="mt-3 overflow-x-auto">
            <table className="dt">
              <thead>
                <tr>
                  {visible.map((c, i) => <th key={c.t + i}>{c.t}</th>)}
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={visible.length + 1} className="dt-empty"><span className="spin" /></td></tr>
                )}
                {!loading && state.rows.length === 0 && (
                  <tr><td colSpan={visible.length + 1} className="dt-empty">No Data..</td></tr>
                )}
                {!loading && state.rows.map((row) => (
                  <tr key={row._id}>
                    {visible.map((c, i) => <td key={c.t + i}>{cell(row, c)}</td>)}
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        <button className="act-btn bg-[#2b7fd4]" title="View" onClick={() => setViewing(row)}>
                          <Icon name="eye" size={12} />
                        </button>
                        <button className="act-btn bg-warnyellow" title="Edit" onClick={() => setEditing(row)}>
                          <Icon name="pencil" size={12} />
                        </button>
                        <button className="act-btn bg-danger" title="Delete" onClick={() => remove(row._id)}>
                          <Icon name="trash" size={12} />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center pt-3 text-[13px] text-cell">
            <span>Page <b className="text-brand-link">{state.page}</b> of {state.pages}</span>
            <span className="flex-1" />
            <span className="flex gap-2">
              <button className="btn" disabled={state.page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn" disabled={state.page >= state.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
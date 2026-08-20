

// 'use client';
// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { useRouter } from "next/navigation";
// import { useScope } from "./ScopeContext";

// /* =====================================================================================
//    SHARED FIELDS
//    Fields that live-propagate from the entry row to every sibling row in the
//    currently active duplicate group as you type.
// ===================================================================================== */

// const SHARED_FIELDS = [
//   "uom",
//   "hsn",
//   "purRate",
//   "disc",
//   "finalNet",
//   "gst",
//   "printDescription",
//   "retailPrice",
//   "disc2",
//   "offerPrice",
//   "wspPrice",
//   "dpPrice",
//   "fma",
//   "silkMark",
// ];

// /* =====================================================================================
//    HELPERS
// ===================================================================================== */

// let idCounter = 0;
// function nextId(prefix) {
//   idCounter += 1;
//   return `${prefix}-${Date.now()}-${idCounter}`;
// }

// /** Final Net = Pur Rate minus Disc% of Pur Rate. Returns "" if Pur Rate isn't a valid number. */
// function calcFinalNet(purRate, disc) {
//   const rate = parseFloat(purRate);
//   if (Number.isNaN(rate)) return "";
//   const discPct = parseFloat(disc) || 0;
//   const net = rate - (rate * discPct) / 100;
//   return String(Math.round(net * 100) / 100);
// }

// function generateBarcodeNumber(itemCode, billSlNo) {
//   const cleanItem = (itemCode || "ITEM").replace(/\s+/g, "").toUpperCase();
//   const serial = (billSlNo || "0").padStart(4, "0");
//   const rand = Math.floor(1000 + Math.random() * 9000);
//   return `${cleanItem}-${serial}-${rand}`;
// }

// /** Builds a sequential series of N values starting from `base`.
//  *  - If base is a valid number, the series counts up from it (base, base+1, ...).
//  *  - If base is blank / not numeric, falls back to the global running counter. */
// function buildSeries(base, count, counterRef) {
//   const trimmed = base.trim();
//   const asNum = trimmed === "" ? NaN : Number(trimmed);

//   if (trimmed === "" || Number.isNaN(asNum)) {
//     return Array.from({ length: count }, () => {
//       const v = counterRef.current;
//       counterRef.current += 1;
//       return String(v);
//     });
//   }

//   const series = Array.from({ length: count }, (_, i) => String(asNum + i));
//   counterRef.current = Math.max(counterRef.current, asNum + count);
//   return series;
// }

// function emptyEntry(nextCounter) {
//   return {
//     oldBarcode: "",
//     itemCode: "",
//     batchUnique: "",
//     billSlNo: String(nextCounter),
//     seq: String(nextCounter),
//     dummy: String(nextCounter),
//     supplierDescription: "",
//     qty: "",
//     uom: "",
//     hsn: "",
//     purRate: "",
//     disc: "",
//     finalNet: "",
//     gst: "",
//     printDescription: "",
//     retailPrice: "",
//     disc2: "",
//     offerPrice: "",
//     wspPrice: "",
//     dpPrice: "",
//     fma: "",
//     silkMark: "",
//   };
// }

// /* =====================================================================================
//    COMPONENT
// ===================================================================================== */

// export default function GCRBarcodeGeneration({ grcId, initialRows }) {
//   const scope = useScope();
//   const router = useRouter();
//   const counterRef = useRef(1);
//   const groupQtyRef = useRef(1);
//   const qtyEnterLockRef = useRef(false);

//   const [rows, setRows] = useState([]);
//   const [entry, setEntry] = useState(emptyEntry(counterRef.current));
//   const [activeGroupId, setActiveGroupId] = useState(null);
//   const [lookupMsg, setLookupMsg] = useState("");
//   // NOTE: moved up here from inside handleQtyEnter. Hooks can only be called
//   // at the top level of a component - calling useState() inside a handler
//   // function throws "Invalid hook call" and also meant `submitting` was
//   // silently re-initialized to false every time Qty's Enter key fired.
//   const [submitting, setSubmitting] = useState(false);

//   useEffect(() => {
//     if (!grcId || !Array.isArray(initialRows)) return;
//     const loadedRows = initialRows.map((row) => ({
//       ...row,
//       id: row.id || String(row._id || nextId("row")),
//       groupId: row.groupId || nextId("grp"),
//     }));
//     setRows(loadedRows);
//     const nextCounter = loadedRows.reduce((max, row) => {
//       const value = Number(row.billSlNo);
//       return Number.isFinite(value) ? Math.max(max, value + 1) : max;
//     }, loadedRows.length + 1);
//     counterRef.current = Math.max(counterRef.current, nextCounter);
//   }, [grcId, initialRows]);

//   const refs = {
//     oldBarcode: useRef(null),
//     itemCode: useRef(null),
//     batchUnique: useRef(null),
//     billSlNo: useRef(null),
//     seq: useRef(null),
//     dummy: useRef(null),
//     supplierDescription: useRef(null),
//     qty: useRef(null),
//     uom: useRef(null),
//     hsn: useRef(null),
//     purRate: useRef(null),
//     disc: useRef(null),
//     finalNet: useRef(null),
//     gst: useRef(null),
//     printDescription: useRef(null),
//     retailPrice: useRef(null),
//     disc2: useRef(null),
//     offerPrice: useRef(null),
//     wspPrice: useRef(null),
//     dpPrice: useRef(null),
//     fma: useRef(null),
//     silkMark: useRef(null),
//   };

//   const isGroupOpen = activeGroupId !== null;
//   const isBatchMode = entry.batchUnique === "BATCH";

//   const focusNext = (ref) => {
//     requestAnimationFrame(() => ref.current?.focus());
//   };

//   const totals = useMemo(() => {
//     return rows.reduce(
//       (acc, r) => {
//         const qty = parseFloat(r.qty) || 0;
//         const rate = parseFloat(r.finalNet || r.purRate) || 0;
//         const disc = parseFloat(r.disc) || 0;
//         const price = parseFloat(r.offerPrice || r.retailPrice) || 0;

//         acc.count += qty;
//         acc.value += price * qty;
//         acc.discAmount += (rate * disc) / 100 * qty;
//         return acc;
//       },
//       { count: 0, value: 0, discAmount: 0 }
//     );
//   }, [rows]);

//   /* ---------------------------------------------------------------------------------
//      ITEM LOOKUP — queries the real Item master (/api/settings/list?slug=item).
//      `search` matches name / prefix / itemCode / description (see collectFields
//      in the list API), so typing an exact item code resolves to that item.
//      Ref columns (hsnId, uomId) come back as raw ObjectId strings; the API's
//      `labels` map resolves them to display text.
//   --------------------------------------------------------------------------------- */
//  const fetchItem = async (code) => {
//   const qs = new URLSearchParams({
//     search: code,
//     perPage: "5",
//     business: scope.business || "",
//   });
//   const r = await fetch("/api/item?" + qs);
//   const d = await r.json();
//   const items = d.rows || [];
//   const labels = d.labels || {};
//   // prefer an exact itemCode match over a loose regex hit
//   const hit = items.find((it) => it.itemCode === code) || items[0];
//   if (!hit) return null;

//   return {
//     itemCode: hit.itemCode || "",
//     batchUnique: hit.uniqueBarcode === "Yes" ? "UNIQUE" : "BATCH",
//     supplierDescription: hit.name || "",
//     uom: labels[String(hit.uomId)] || "",
//     hsn: labels[String(hit.hsnId)] || "",
//     printDescription: hit.description || hit.name || "",
//     // pricing/tax not on Item master except RSP/WSP - rest filled per GRC
//     purRate: "",
//     disc: "",
//     finalNet: "",
//     gst: "",
//     retailPrice: hit.rsp != null ? String(hit.rsp) : "",
//     disc2: hit.rspOfferPercent != null ? String(hit.rspOfferPercent) : "",
//     offerPrice: "",
//     wspPrice: hit.wsp != null ? String(hit.wsp) : "",
//     dpPrice: "",
//     fma: "",
//     silkMark: "",
//   };
// };

//   /* ---------------------------------------------------------------------------------
//      OLD BARCODE — auto fetch the item (always a single row)
//   --------------------------------------------------------------------------------- */
//   const handleOldBarcodeEnter = async () => {
//     const code = entry.oldBarcode.trim();
//     if (!code) {
//       refs.itemCode.current?.focus();
//       return;
//     }

//     setLookupMsg("");
//     const found = await fetchItem(code);
//     if (found) {
//       const [billSlNo] = buildSeries(entry.billSlNo, 1, counterRef);
//       const [seq] = buildSeries(entry.seq, 1, counterRef);
//       const [dummy] = buildSeries(entry.dummy, 1, counterRef);

//       const row = {
//         id: nextId("row"),
//         groupId: nextId("grp"),
//         oldBarcode: code,
//         billSlNo,
//         seq,
//         dummy,
//         qty: "1",
//         barcodeGenerated: "",
//         ...found,
//       };

//       setRows((prev) => [...prev, row]);
//       setEntry(emptyEntry(counterRef.current));
//       requestAnimationFrame(() => refs.oldBarcode.current?.focus());
//     } else {
//       setLookupMsg('No item found for "' + code + '"');
//       refs.itemCode.current?.focus();
//     }
//   };

//   /* ---------------------------------------------------------------------------------
//      ITEM CODE — typing/scanning a code directly (Enter) fetches from the Item
//      master and AUTOFILLS the entry row only (itemCode, batchUnique, uom, hsn,
//      description, etc). It does NOT create a row by itself - the existing
//      BATCH/UNIQUE + QTY flow (handleQtyEnter below) still owns row creation and
//      duplication, unchanged. Since the fetch already knows batchUnique, focus
//      jumps straight to Qty; if nothing is found it falls back to focusing
//      batchUnique so the admin can fill it in manually, same as before.
//   --------------------------------------------------------------------------------- */
//   const handleItemCodeEnter = async () => {
//     const code = entry.itemCode.trim();
//     if (!code) {
//       focusNext(refs.batchUnique);
//       return;
//     }

//     setLookupMsg("");
// const found = await fetchItem(code);
// if (found) {
//   setEntry((prev) => ({
//     ...prev,
//     ...found,
//     // don't clobber a BATCH/UNIQUE the admin already picked by hand -
//     // only use the item master's default when nothing's selected yet
//     batchUnique: prev.batchUnique || found.batchUnique,
//   }));
//   focusNext(refs.qty);
// } else {
//       setLookupMsg('No item found for "' + code + '"');
//       focusNext(refs.batchUnique);
//     }
//   };

//   /* ---------------------------------------------------------------------------------
//      QTY — UNIQUE splits into N duplicate rows. BATCH always makes exactly ONE
//      row (e.g. a batch of 500/1000 pcs shares a single barcode), no duplicates.
//   --------------------------------------------------------------------------------- */
//   const handleQtyEnter = (event) => {
//     event?.preventDefault();
//     if (qtyEnterLockRef.current || isGroupOpen) return;
//     qtyEnterLockRef.current = true;

//     const qtyNum = Math.max(1, parseInt(entry.qty || "1", 10) || 1);
//     groupQtyRef.current = qtyNum;
//     const groupId = nextId("grp");

//     const rowCount = isBatchMode ? 1 : qtyNum;

//     const billSlNoSeries = buildSeries(entry.billSlNo, rowCount, counterRef);
//     const seqSeries = buildSeries(entry.seq, rowCount, counterRef);
//     const dummySeries = buildSeries(entry.dummy, rowCount, counterRef);

//     const newRows = Array.from({ length: rowCount }, (_, i) => ({
//       id: nextId("row"),
//       groupId,
//       oldBarcode: "",
//       itemCode: entry.itemCode,
//       batchUnique: entry.batchUnique,
//       billSlNo: billSlNoSeries[i],
//       seq: seqSeries[i],
//       dummy: dummySeries[i],
//       supplierDescription: entry.supplierDescription,
//       // BATCH keeps the qty exactly as typed (e.g. 500). UNIQUE shows 1 per duplicate.
//       qty: isBatchMode ? entry.qty : "1",
//       uom: entry.uom,
//       hsn: entry.hsn,
//       purRate: entry.purRate,
//       disc: entry.disc,
//       finalNet: entry.finalNet,
//       gst: entry.gst,
//       printDescription: entry.printDescription || entry.supplierDescription,
//       retailPrice: entry.retailPrice,
//       disc2: entry.disc2,
//       offerPrice: entry.offerPrice,
//       wspPrice: entry.wspPrice,
//       dpPrice: entry.dpPrice,
//       fma: entry.fma,
//       silkMark: entry.silkMark,
//       barcodeGenerated: "",
//     }));

//     setRows((prev) => [...prev, ...newRows]);
//     setActiveGroupId(groupId);
//     setEntry((prev) => ({
//       ...prev,
//       printDescription: prev.printDescription || prev.supplierDescription,
//     }));
//     requestAnimationFrame(() => refs.uom.current?.focus());
//   };

//   /* ---------------------------------------------------------------------------------
//      SHARED FIELDS (uom ... silkMark) — live propagation to every row in the
//      currently active duplicate group as soon as the master value changes.
//   --------------------------------------------------------------------------------- */
//   const handleSharedChange = (field, value) => {
//     setEntry((prev) => {
//       const updated = { ...prev, [field]: value };
//       if (field === "purRate" || field === "disc") {
//         updated.finalNet = calcFinalNet(updated.purRate, updated.disc);
//       }
//       return updated;
//     });

//     if (activeGroupId) {
//       setRows((prev) =>
//         prev.map((r) => {
//           if (r.groupId !== activeGroupId) return r;
//           const updatedRow = { ...r, [field]: value };
//           if (field === "purRate" || field === "disc") {
//             updatedRow.finalNet = calcFinalNet(updatedRow.purRate, updatedRow.disc);
//           }
//           return updatedRow;
//         })
//       );
//     }
//   };


//   const handlePurRateEnter = () => {
//   const groupQty = groupQtyRef.current || 1;
//   const raw = parseFloat(entry.purRate);
//   if (!Number.isNaN(raw) && groupQty > 1) {
//     const perUnit = String(Math.round((raw / groupQty) * 100) / 100);
//     handleSharedChange("purRate", perUnit); // updates entry + propagates + recalculates Final Net
//   }
//   focusNext(refs.disc);
// };

//   const commitGroup = () => {
//     qtyEnterLockRef.current = false;
//     setActiveGroupId(null);
//     setEntry(emptyEntry(counterRef.current));
//     requestAnimationFrame(() => refs.oldBarcode.current?.focus());
//   };

//   /* ---------------------------------------------------------------------------------
//      DIRECT ROW EDITING — admin can edit BILL SL NO / SEQ / DUMMY (and anything
//      else) on an already-created row at any time.
//   --------------------------------------------------------------------------------- */
//   const updateRowField = (id, field, value) => {
//     setRows((prev) =>
//       prev.map((r) => {
//         if (r.id !== id) return r;
//         const updated = { ...r, [field]: value };
//         if (field === "purRate" || field === "disc") {
//           updated.finalNet = calcFinalNet(updated.purRate, updated.disc);
//         }
//         return updated;
//       })
//     );
//   };

//   /* ---------------------------------------------------------------------------------
//      MANUAL "+ ADD ROW" — appends one blank, fully editable row directly to the
//      grid, independent of the guided entry flow.
//   --------------------------------------------------------------------------------- */
//   const handleAddRow = () => {
//     const n = counterRef.current;
//     counterRef.current += 1;
//     const row = {
//       id: nextId("row"),
//       groupId: nextId("grp"),
//       oldBarcode: "",
//       itemCode: "",
//       batchUnique: "",
//       billSlNo: String(n),
//       seq: String(n),
//       dummy: String(n),
//       supplierDescription: "",
//       qty: "1",
//       uom: "",
//       hsn: "",
//       purRate: "",
//       disc: "",
//       finalNet: "",
//       gst: "",
//       printDescription: "",
//       retailPrice: "",
//       disc2: "",
//       offerPrice: "",
//       wspPrice: "",
//       dpPrice: "",
//       fma: "",
//       silkMark: "",
//       barcodeGenerated: "",
//     };
//     setRows((prev) => [...prev, row]);
//   };

//   /* ---------------------------------------------------------------------------------
//      GENERATE BARCODE NUMBERS
//   --------------------------------------------------------------------------------- */
//   const handleGenerateAll = () => {
//     setRows((prev) =>
//       prev.map((r) =>
//         r.barcodeGenerated
//           ? r
//           : { ...r, barcodeGenerated: generateBarcodeNumber(r.itemCode, r.billSlNo) }
//       )
//     );
//   };

//   const handleGenerateOne = (id) => {
//     setRows((prev) =>
//       prev.map((r) =>
//         r.id === id ? { ...r, barcodeGenerated: generateBarcodeNumber(r.itemCode, r.billSlNo) } : r
//       )
//     );
//   };

//   const handleDeleteRow = (id) => {
//     setRows((prev) => prev.filter((r) => r.id !== id));
//   };

//   /* ---------------------------------------------------------------------------------
//      SUBMIT — bulk-saves every row (POST /api/barcode-generation), which also
//      creates the GRC header on the backend so it appears in the GRC list.
//   --------------------------------------------------------------------------------- */
//   const handleSubmit = async () => {
//     if (rows.length === 0) return;
//     setSubmitting(true);
//     try {
//       const res = await fetch("/api/barcode-generation", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           rows,
//           business: scope.business,
//           location: scope.location,
//           finYear: scope.finYear,
//           totals,
//           ...(grcId ? { grcId } : {}),
//         }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Save failed");
//       setLookupMsg("");
//       if (grcId) {
//         router.push(`/admin/transaction/purchase/grc/${grcId}?tab=items`);
//       } else {
//         setRows([]);
//         fetchSaved(1);
//       }
//     } catch (err) {
//       setLookupMsg(err.message || "Failed to save");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const pendingCount = useMemo(() => rows.filter((r) => !r.barcodeGenerated).length, [rows]);

//   /* =====================================================================================
//      SAVED RECORDS SEARCH (below the entry grid)
//      Two search boxes:
//        - codeSearch  -> matches Item Code / Old Barcode / Generated Barcode
//        - nameSearch  -> matches Supplier Description / Print Description
//      Hitting Enter in either box (or clicking Search) runs the query against
//      GET /api/barcode-generation. Leaving both boxes empty and searching
//      returns every saved record (paginated), newest first.
//   ===================================================================================== */
//   const [codeSearch, setCodeSearch] = useState("");
//   const [nameSearch, setNameSearch] = useState("");
//   const [savedRows, setSavedRows] = useState([]);
//   const [savedLoading, setSavedLoading] = useState(false);
//   const [savedPage, setSavedPage] = useState(1);
//   const [savedPages, setSavedPages] = useState(1);
//   const [savedTotal, setSavedTotal] = useState(0);

//   const codeSearchRef = useRef(null);
//   const nameSearchRef = useRef(null);

//   const fetchSaved = useCallback(
//     async (page = 1) => {
//       setSavedLoading(true);
//       try {
//         const qs = new URLSearchParams({
//           business: scope.business || "",
//           location: scope.location || "",
//           finYear: scope.finYear || "",
//           page: String(page),
//           perPage: "20",
//         });
//         if (codeSearch.trim()) qs.set("code", codeSearch.trim());
//         if (nameSearch.trim()) qs.set("name", nameSearch.trim());

//         const r = await fetch("/api/barcode-generation?" + qs);
//         const d = await r.json();
//         setSavedRows(d.rows || []);
//         setSavedPage(d.page || 1);
//         setSavedPages(d.pages || 1);
//         setSavedTotal(d.total || 0);
//       } catch {
//         setSavedRows([]);
//       } finally {
//         setSavedLoading(false);
//       }
//     },
//     [scope.business, scope.location, scope.finYear, codeSearch, nameSearch]
//   );

//   // load every saved record once on mount (empty search = show all)
//   useEffect(() => {
//     fetchSaved(1);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [scope.business, scope.location, scope.finYear]);

//   const runSearch = () => fetchSaved(1);
//   const handleSearchKeyDown = (e) => {
//     if (e.key === "Enter") runSearch();
//   };
//   const clearSearch = () => {
//     setCodeSearch("");
//     setNameSearch("");
//     requestAnimationFrame(() => fetchSaved(1));
//   };

//   /* =====================================================================================
//      RENDER
//   ===================================================================================== */

//   const inputBase =
//     "w-full min-w-[150px] bg-white border border-slate-300 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-100 disabled:text-slate-400";
//   const inputEditable =
//     "w-full min-w-[130px] bg-white border border-slate-300 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";
//   const inputCalculated =
//     "w-full min-w-[130px] bg-emerald-50 border border-emerald-300 rounded px-2.5 py-2 text-sm font-semibold text-emerald-800 focus:outline-none";
//   const thBase =
//     "px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 border border-slate-300 whitespace-nowrap bg-slate-100 sticky top-0";
//   const tdBase = "border border-slate-200 p-1.5 align-middle";

//   return (
//     <div className="min-h-screen bg-slate-50 p-4 text-slate-800">
//       <div className="max-w-full mx-auto">
//         <div className="flex items-center justify-between mb-3 gap-4">
//           <div>
//             <h1 className="text-lg font-bold">Barcode Generation — GCR</h1>
//             <p className="text-xs text-slate-500">
//               OLD BARCODE auto-fetches a saved item. BILL SL NO / SEQ / DUMMY are editable
//               anywhere (suggested automatically, but admin can override). Selecting{" "}
//               <span className="font-semibold">UNIQUE</span> + QTY splits into that many duplicate
//               rows (one barcode per piece). Selecting <span className="font-semibold">BATCH</span>{" "}
//               + QTY keeps everything in a single row — one barcode for the whole batch.
//             </p>
//           </div>
//           <div className="flex items-center gap-2 shrink-0">
//             <span className="text-xs text-slate-500 whitespace-nowrap">
//               {rows.length} row(s) &middot; {pendingCount} pending
//             </span>
//             <button
//               onClick={handleAddRow}
//               className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded shadow-sm whitespace-nowrap"
//             >
//               + Add Row
//             </button>
//             <button
//               onClick={handleGenerateAll}
//               disabled={pendingCount === 0}
//               className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold px-3 py-2 rounded shadow-sm whitespace-nowrap"
//             >
//               Generate All Barcodes
//             </button>
//             <button
//               onClick={handleSubmit}
//               disabled={rows.length === 0 || submitting}
//               className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold px-3 py-2 rounded shadow-sm whitespace-nowrap"
//             >
//               {submitting ? "Saving..." : grcId ? "Update" : "Submit"}
//             </button>
//           </div>
//         </div>

//         {lookupMsg && (
//           <div className="mb-2 rounded border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-700">
//             {lookupMsg}
//           </div>
//         )}

//         <div className="overflow-auto border border-slate-300 rounded-lg shadow-sm bg-white max-h-[75vh]">
//           <table className="border-collapse w-full">
//             <thead>
//               <tr>
//                 <th className={thBase}>Old Barcode</th>
//                 <th className={thBase}>Item Code</th>
//                 <th className={thBase}>Batch/Unique</th>
//                 <th className={thBase}>Bill Sl No.</th>
//                 <th className={thBase}>Seq</th>
//                 <th className={thBase}>Dummy</th>
//                 <th className={thBase}>Supplier Description</th>
//                 <th className={thBase}>Qty</th>
//                 <th className={thBase}>UOM</th>
//                 <th className={thBase}>HSN</th>
//                 <th className={thBase}>Pur Rate</th>
//                 <th className={thBase}>Disc</th>
//                 <th className={thBase}>Final Net</th>
//                 <th className={thBase}>GST %</th>
//                 <th className={thBase}>Print Description</th>
//                 <th className={thBase}>Retail Price</th>
//                 <th className={thBase}>Disc</th>
//                 <th className={thBase}>Offer Price</th>
//                 <th className={thBase}>WSP Price</th>
//                 <th className={thBase}>DP Price</th>
//                 <th className={thBase}>FMA</th>
//                 <th className={thBase}>Silk Mark</th>
//                 <th className={thBase}>Barcode Number Generated</th>
//                 <th className={thBase}></th>
//               </tr>
//             </thead>

//             <tbody>
//               {/* ---------------- LIVE ENTRY ROW ---------------- */}
//               <tr className="bg-amber-50">
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.oldBarcode}
//                     className={inputBase}
//                     value={entry.oldBarcode}
//                     disabled={isGroupOpen}
//                     placeholder="scan/type"
//                     onChange={(e) => setEntry((p) => ({ ...p, oldBarcode: e.target.value }))}
//                     onKeyDown={(e) => e.key === "Enter" && handleOldBarcodeEnter()}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.itemCode}
//                     className={inputBase}
//                     value={entry.itemCode}
//                     disabled={isGroupOpen}
//                     onChange={(e) => setEntry((p) => ({ ...p, itemCode: e.target.value }))}
//                     onKeyDown={(e) => e.key === "Enter" && handleItemCodeEnter()}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <select
//                     ref={refs.batchUnique}
//                     className={inputBase}
//                     value={entry.batchUnique}
//                     disabled={isGroupOpen}
//                     onChange={(e) => {
//                       setEntry((p) => ({ ...p, batchUnique: e.target.value }));
//                       focusNext(refs.billSlNo);
//                     }}
//                   >
//                     <option value="">--</option>
//                     <option value="BATCH">BATCH</option>
//                     <option value="UNIQUE">UNIQUE</option>
//                   </select>
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.billSlNo}
//                     className={inputEditable}
//                     value={entry.billSlNo}
//                     disabled={isGroupOpen}
//                     onChange={(e) => setEntry((p) => ({ ...p, billSlNo: e.target.value }))}
//                     onKeyDown={(e) => e.key === "Enter" && focusNext(refs.seq)}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.seq}
//                     className={inputEditable}
//                     value={entry.seq}
//                     disabled={isGroupOpen}
//                     onChange={(e) => setEntry((p) => ({ ...p, seq: e.target.value }))}
//                     onKeyDown={(e) => e.key === "Enter" && focusNext(refs.dummy)}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.dummy}
//                     className={inputEditable}
//                     value={entry.dummy}
//                     disabled={isGroupOpen}
//                     onChange={(e) => setEntry((p) => ({ ...p, dummy: e.target.value }))}
//                     onKeyDown={(e) => e.key === "Enter" && focusNext(refs.supplierDescription)}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.supplierDescription}
//                     className={inputBase}
//                     value={entry.supplierDescription}
//                     disabled={isGroupOpen}
//                     onChange={(e) =>
//                       setEntry((p) => ({ ...p, supplierDescription: e.target.value }))
//                     }
//                     onKeyDown={(e) => e.key === "Enter" && focusNext(refs.qty)}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.qty}
//                     type="number"
//                     min={1}
//                     className={inputBase}
//                     value={entry.qty}
//                     disabled={isGroupOpen}
//                     placeholder={isBatchMode ? "batch qty" : "pieces"}
//                     onChange={(e) => setEntry((p) => ({ ...p, qty: e.target.value }))}
//                     onKeyDown={(e) => e.key === "Enter" && handleQtyEnter(e)}
//                   />
//                 </td>

//                 {/* shared fields */}
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.uom}
//                     className={inputBase}
//                     value={entry.uom}
//                     disabled={!isGroupOpen}
//                     onChange={(e) => handleSharedChange("uom", e.target.value)}
//                     onKeyDown={(e) => e.key === "Enter" && focusNext(refs.hsn)}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.hsn}
//                     className={inputBase}
//                     value={entry.hsn}
//                     disabled={!isGroupOpen}
//                     onChange={(e) => handleSharedChange("hsn", e.target.value)}
//                     onKeyDown={(e) => e.key === "Enter" && focusNext(refs.purRate)}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.purRate}
//                     type="number"
//                     className={inputBase}
//                     value={entry.purRate}
//                     disabled={!isGroupOpen}
//                     onChange={(e) => handleSharedChange("purRate", e.target.value)}
//                     onKeyDown={(e) => e.key === "Enter" && handlePurRateEnter()}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.disc}
//                     type="number"
//                     className={inputBase}
//                     value={entry.disc}
//                     disabled={!isGroupOpen}
//                     onChange={(e) => handleSharedChange("disc", e.target.value)}
//                     onKeyDown={(e) => e.key === "Enter" && focusNext(refs.finalNet)}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.finalNet}
//                     type="text"
//                     className={inputCalculated}
//                     value={entry.finalNet}
//                     readOnly
//                     disabled={!isGroupOpen}
//                     placeholder="auto"
//                     onKeyDown={(e) => e.key === "Enter" && focusNext(refs.gst)}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.gst}
//                     type="number"
//                     className={inputBase}
//                     value={entry.gst}
//                     disabled={!isGroupOpen}
//                     onChange={(e) => handleSharedChange("gst", e.target.value)}
//                     onKeyDown={(e) => e.key === "Enter" && focusNext(refs.printDescription)}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.printDescription}
//                     className={inputBase}
//                     value={entry.printDescription}
//                     disabled={!isGroupOpen}
//                     onChange={(e) => handleSharedChange("printDescription", e.target.value)}
//                     onKeyDown={(e) => e.key === "Enter" && focusNext(refs.retailPrice)}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.retailPrice}
//                     type="number"
//                     className={inputBase}
//                     value={entry.retailPrice}
//                     disabled={!isGroupOpen}
//                     onChange={(e) => handleSharedChange("retailPrice", e.target.value)}
//                     onKeyDown={(e) => e.key === "Enter" && focusNext(refs.disc2)}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.disc2}
//                     type="number"
//                     className={inputBase}
//                     value={entry.disc2}
//                     disabled={!isGroupOpen}
//                     onChange={(e) => handleSharedChange("disc2", e.target.value)}
//                     onKeyDown={(e) => e.key === "Enter" && focusNext(refs.offerPrice)}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.offerPrice}
//                     type="number"
//                     className={inputBase}
//                     value={entry.offerPrice}
//                     disabled={!isGroupOpen}
//                     onChange={(e) => handleSharedChange("offerPrice", e.target.value)}
//                     onKeyDown={(e) => e.key === "Enter" && focusNext(refs.wspPrice)}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.wspPrice}
//                     type="number"
//                     className={inputBase}
//                     value={entry.wspPrice}
//                     disabled={!isGroupOpen}
//                     onChange={(e) => handleSharedChange("wspPrice", e.target.value)}
//                     onKeyDown={(e) => e.key === "Enter" && focusNext(refs.dpPrice)}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <input
//                     ref={refs.dpPrice}
//                     type="number"
//                     className={inputBase}
//                     value={entry.dpPrice}
//                     disabled={!isGroupOpen}
//                     onChange={(e) => handleSharedChange("dpPrice", e.target.value)}
//                     onKeyDown={(e) => e.key === "Enter" && focusNext(refs.fma)}
//                   />
//                 </td>
//                 <td className={tdBase}>
//                   <select
//                     ref={refs.fma}
//                     className={inputBase}
//                     value={entry.fma}
//                     disabled={!isGroupOpen}
//                     onChange={(e) => {
//                       handleSharedChange("fma", e.target.value);
//                       focusNext(refs.silkMark);
//                     }}
//                   >
//                     <option value="">--</option>
//                     <option value="YES">YES</option>
//                     <option value="NO">NO</option>
//                   </select>
//                 </td>
//                 <td className={tdBase}>
//                   <select
//                     ref={refs.silkMark}
//                     className={inputBase}
//                     value={entry.silkMark}
//                     disabled={!isGroupOpen}
//                     onChange={(e) => handleSharedChange("silkMark", e.target.value)}
//                     onKeyDown={(e) => e.key === "Enter" && commitGroup()}
//                   >
//                     <option value="">--</option>
//                     <option value="YES">YES</option>
//                     <option value="NO">NO</option>
//                   </select>
//                 </td>
//                 <td className={tdBase}>
//                   <span className="text-[11px] text-slate-400 italic">pending</span>
//                 </td>
//                 <td className={tdBase}>
//                   {isGroupOpen && (
//                     <button
//                       onClick={commitGroup}
//                       className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded whitespace-nowrap"
//                     >
//                       Done ✓
//                     </button>
//                   )}
//                 </td>
//               </tr>

//               {/* ---------------- COMMITTED / DUPLICATE ROWS (all editable) ---------------- */}
//               {rows
//                 .slice()
//                 .reverse()
//                 .map((r) => (
//                   <tr
//                     key={r.id}
//                     className={r.groupId === activeGroupId ? "bg-indigo-50" : "hover:bg-slate-50"}
//                   >
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.oldBarcode}
//                         onChange={(e) => updateRowField(r.id, "oldBarcode", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.itemCode}
//                         onChange={(e) => updateRowField(r.id, "itemCode", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <select
//                         className={inputEditable}
//                         value={r.batchUnique}
//                         onChange={(e) =>
//                           updateRowField(r.id, "batchUnique", e.target.value)
//                         }
//                       >
//                         <option value="">--</option>
//                         <option value="BATCH">BATCH</option>
//                         <option value="UNIQUE">UNIQUE</option>
//                       </select>
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.billSlNo}
//                         onChange={(e) => updateRowField(r.id, "billSlNo", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.seq}
//                         onChange={(e) => updateRowField(r.id, "seq", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.dummy}
//                         onChange={(e) => updateRowField(r.id, "dummy", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.supplierDescription}
//                         onChange={(e) =>
//                           updateRowField(r.id, "supplierDescription", e.target.value)
//                         }
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.qty}
//                         onChange={(e) => updateRowField(r.id, "qty", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.uom}
//                         onChange={(e) => updateRowField(r.id, "uom", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.hsn}
//                         onChange={(e) => updateRowField(r.id, "hsn", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.purRate}
//                         onChange={(e) => updateRowField(r.id, "purRate", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.disc}
//                         onChange={(e) => updateRowField(r.id, "disc", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input className={inputCalculated} value={r.finalNet} readOnly />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.gst}
//                         onChange={(e) => updateRowField(r.id, "gst", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.printDescription}
//                         onChange={(e) => updateRowField(r.id, "printDescription", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.retailPrice}
//                         onChange={(e) => updateRowField(r.id, "retailPrice", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.disc2}
//                         onChange={(e) => updateRowField(r.id, "disc2", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.offerPrice}
//                         onChange={(e) => updateRowField(r.id, "offerPrice", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.wspPrice}
//                         onChange={(e) => updateRowField(r.id, "wspPrice", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <input
//                         className={inputEditable}
//                         value={r.dpPrice}
//                         onChange={(e) => updateRowField(r.id, "dpPrice", e.target.value)}
//                       />
//                     </td>
//                     <td className={tdBase}>
//                       <select
//                         className={inputEditable}
//                         value={r.fma}
//                         onChange={(e) => updateRowField(r.id, "fma", e.target.value)}
//                       >
//                         <option value="">--</option>
//                         <option value="YES">YES</option>
//                         <option value="NO">NO</option>
//                       </select>
//                     </td>
//                     <td className={tdBase}>
//                       <select
//                         className={inputEditable}
//                         value={r.silkMark}
//                         onChange={(e) => updateRowField(r.id, "silkMark", e.target.value)}
//                       >
//                         <option value="">--</option>
//                         <option value="YES">YES</option>
//                         <option value="NO">NO</option>
//                       </select>
//                     </td>
//                     <td className={tdBase}>
//                       {r.barcodeGenerated ? (
//                         <span className="font-mono text-[11px] font-semibold text-emerald-700">
//                           {r.barcodeGenerated}
//                         </span>
//                       ) : (
//                         <button
//                           onClick={() => handleGenerateOne(r.id)}
//                           className="text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded whitespace-nowrap"
//                         >
//                           Generate
//                         </button>
//                       )}
//                     </td>
//                     <td className={tdBase}>
//                       <button
//                         onClick={() => handleDeleteRow(r.id)}
//                         className="text-[11px] text-red-500 hover:text-red-700"
//                       >
//                         ✕
//                       </button>
//                     </td>
//                   </tr>
//                 ))}

//               {rows.length === 0 && (
//                 <tr>
//                   <td colSpan={24} className="text-center text-xs text-slate-400 py-6">
//                     No rows yet — start typing an OLD BARCODE or ITEM CODE above, or click{" "}
//                     <span className="font-semibold">+ Add Row</span>.
//                   </td>
//                 </tr>
//               )}
//             </tbody>

//             {/* NOTE: <tfoot> moved to be a direct child of <table>, matching the
//                 thead/tbody siblings above. Previously it was placed after the
//                 closing </table> tag, which browsers silently drop/ignore -
//                 the totals row never actually rendered. */}
//             <tfoot>
//               <tr className="bg-slate-100 font-semibold">
//                 <td colSpan={7} className="px-3 py-2 text-right border border-slate-300">Totals</td>
//                 <td className="px-3 py-2 border border-slate-300">{totals.count}</td>
//                 <td colSpan={5} className="border border-slate-300"></td>
//                 <td className="px-3 py-2 border border-slate-300 text-emerald-700">
//                   ₹ {totals.discAmount.toFixed(2)}
//                 </td>
//                 <td colSpan={7} className="border border-slate-300"></td>
//                 <td className="px-3 py-2 border border-slate-300 text-indigo-700">
//                   ₹ {totals.value.toFixed(2)}
//                 </td>
//                 <td colSpan={2} className="border border-slate-300"></td>
//               </tr>
//             </tfoot>
//           </table>
//         </div>

//         {/* =====================================================================================
//             SAVED RECORDS — SEARCH + TABLE
//             Independent of the entry grid above. Shows every BarcodeLabel row already
//             saved to the DB (via /api/barcode-generation GET), scoped to the current
//             business/location/finYear. Search by Item Code / Barcode and/or by Name;
//             pressing Enter in either box or clicking Search re-runs the query. Empty
//             search = all saved records, paginated.
//         ===================================================================================== */}
//         <div className="mt-6">
//           <div className="flex flex-wrap items-end gap-3 mb-3">
//             <div>
//               <label className="block text-xs font-semibold text-slate-600 mb-1">
//                 Search by Item Code / Barcode
//               </label>
//               <input
//                 ref={codeSearchRef}
//                 className={inputBase}
//                 placeholder="e.g. SAR1023 or old/generated barcode"
//                 value={codeSearch}
//                 onChange={(e) => setCodeSearch(e.target.value)}
//                 onKeyDown={handleSearchKeyDown}
//               />
//             </div>
//             <div>
//               <label className="block text-xs font-semibold text-slate-600 mb-1">
//                 Search by Name
//               </label>
//               <input
//                 ref={nameSearchRef}
//                 className={inputBase}
//                 placeholder="Supplier or print description"
//                 value={nameSearch}
//                 onChange={(e) => setNameSearch(e.target.value)}
//                 onKeyDown={handleSearchKeyDown}
//               />
//             </div>
//             <button
//               onClick={runSearch}
//               className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded shadow-sm h-[38px]"
//             >
//               Search
//             </button>
//             {(codeSearch || nameSearch) && (
//               <button
//                 onClick={clearSearch}
//                 className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold px-3 py-2 rounded h-[38px]"
//               >
//                 Clear
//               </button>
//             )}
//             <span className="text-xs text-slate-500 ml-auto whitespace-nowrap">
//               {savedLoading ? "Loading..." : `${savedTotal} record(s)`}
//             </span>
//           </div>

//           <div className="overflow-auto border border-slate-300 rounded-lg shadow-sm bg-white max-h-[60vh]">
//             <table className="border-collapse w-full">
//               <thead>
//                 <tr>
//                   <th className={thBase}>Old Barcode</th>
//                   <th className={thBase}>Item Code</th>
//                   <th className={thBase}>Batch/Unique</th>
//                   <th className={thBase}>Bill Sl No.</th>
//                   <th className={thBase}>Supplier Description</th>
//                   <th className={thBase}>Qty</th>
//                   <th className={thBase}>UOM</th>
//                   <th className={thBase}>HSN</th>
//                   <th className={thBase}>Pur Rate</th>
//                   <th className={thBase}>Final Net</th>
//                   <th className={thBase}>GST %</th>
//                   <th className={thBase}>Print Description</th>
//                   <th className={thBase}>Retail Price</th>
//                   <th className={thBase}>Offer Price</th>
//                   <th className={thBase}>WSP Price</th>
//                   <th className={thBase}>DP Price</th>
//                   <th className={thBase}>Barcode Number Generated</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {savedLoading && (
//                   <tr>
//                     <td colSpan={17} className="text-center text-xs text-slate-400 py-6">
//                       <span className="inline-block h-4 w-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin align-middle mr-2" />
//                       Loading...
//                     </td>
//                   </tr>
//                 )}
//                 {!savedLoading && savedRows.length === 0 && (
//                   <tr>
//                     <td colSpan={17} className="text-center text-xs text-slate-400 py-6">
//                       No records found.
//                     </td>
//                   </tr>
//                 )}
//                 {!savedLoading &&
//                   savedRows.map((r) => (
//                     <tr key={r._id} className="hover:bg-slate-50">
//                       <td className={tdBase}>{r.oldBarcode || "\u2014"}</td>
//                       <td className={tdBase}>{r.itemCode || "\u2014"}</td>
//                       <td className={tdBase}>{r.batchUnique || "\u2014"}</td>
//                       <td className={tdBase}>{r.billSlNo || "\u2014"}</td>
//                       <td className={tdBase}>{r.supplierDescription || "\u2014"}</td>
//                       <td className={tdBase}>{r.qty || "\u2014"}</td>
//                       <td className={tdBase}>{r.uom || "\u2014"}</td>
//                       <td className={tdBase}>{r.hsn || "\u2014"}</td>
//                       <td className={tdBase}>{r.purRate || "\u2014"}</td>
//                       <td className={tdBase}>{r.finalNet || "\u2014"}</td>
//                       <td className={tdBase}>{r.gst || "\u2014"}</td>
//                       <td className={tdBase}>{r.printDescription || "\u2014"}</td>
//                       <td className={tdBase}>{r.retailPrice || "\u2014"}</td>
//                       <td className={tdBase}>{r.offerPrice || "\u2014"}</td>
//                       <td className={tdBase}>{r.wspPrice || "\u2014"}</td>
//                       <td className={tdBase}>{r.dpPrice || "\u2014"}</td>
//                       <td className={tdBase}>
//                         {r.barcodeGenerated ? (
//                           <span className="font-mono text-[11px] font-semibold text-emerald-700">
//                             {r.barcodeGenerated}
//                           </span>
//                         ) : (
//                           <span className="text-[11px] text-slate-400 italic">pending</span>
//                         )}
//                       </td>
//                     </tr>
//                   ))}
//               </tbody>
//             </table>
//           </div>

//           <div className="flex items-center pt-3 text-[13px] text-slate-500">
//             <span>
//               Page <b className="text-indigo-600">{savedPage}</b> of {savedPages}
//             </span>
//             <span className="flex-1" />
//             <span className="flex gap-2">
//               <button
//                 className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs disabled:opacity-50"
//                 disabled={savedPage <= 1 || savedLoading}
//                 onClick={() => fetchSaved(savedPage - 1)}
//               >
//                 Previous
//               </button>
//               <button
//                 className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs disabled:opacity-50"
//                 disabled={savedPage >= savedPages || savedLoading}
//                 onClick={() => fetchSaved(savedPage + 1)}
//               >
//                 Next
//               </button>
//             </span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }







//afternoon agust 20


'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useScope } from "./ScopeContext";

/* =====================================================================================
   BARCODE SETTING SOURCE
   Real route: GET /api/barcode-setting?business=&finYear=&page=&perPage= (see
   app/api/barcode-setting/route.js - scopeOf() only filters by business +
   finYear, there is no location scope on this model). Returns one document
   per period (Monthly/Quarterly/Yearly block), each carrying its own prefix,
   suffix, startNumber, numberLenght, effectiveDate, expiryDate.

   Editing a single period goes through PUT /api/barcode-setting/:id with
   body { data: {...period fields} } - that's the exact contract EditDialog
   in BarcodeSettingsView already uses. GCR reuses that same PUT after every
   "Generate" to advance startNumber to the next unused serial, so the serial
   is persisted on the setting document itself rather than reset every time
   this page reloads.
===================================================================================== */
const BARCODE_SETTING_API = "/api/barcode-setting";

/** Same math as sampleBarcode() in app/admin/setting/barcodesetting/fields.js -
 *  duplicated here (rather than imported) only because this file's real path
 *  relative to fields.js wasn't given; point this at that export directly if
 *  you'd rather share one implementation. */
function computeSampleBarcode(p) {
  const start = String(p?.startNumber ?? "").trim();
  if (!start) return "";
  const len = Number(p?.numberLenght) || 0;
  const body = start.length >= len ? start : start.padStart(len, "0");
  return String(p?.prefix ?? "").trim() + body + String(p?.suffix ?? "").trim();
}

/* =====================================================================================
   SHARED FIELDS
   Fields that live-propagate from the entry row to every sibling row in the
   currently active duplicate group as you type.
===================================================================================== */

const SHARED_FIELDS = [
  "uom",
  "hsn",
  "purRate",
  "disc",
  "finalNet",
  "gst",
  "printDescription",
  "retailPrice",
  "disc2",
  "offerPrice",
  "wspPrice",
  "dpPrice",
  "fma",
  "silkMark",
];

/* =====================================================================================
   HELPERS
===================================================================================== */

let idCounter = 0;
function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

/** Final Net = Pur Rate minus Disc% of Pur Rate. Returns "" if Pur Rate isn't a valid number. */
function calcFinalNet(purRate, disc) {
  const rate = parseFloat(purRate);
  if (Number.isNaN(rate)) return "";
  const discPct = parseFloat(disc) || 0;
  const net = rate - (rate * discPct) / 100;
  return String(Math.round(net * 100) / 100);
}

/* ---------------------------------------------------------------------------------
   BARCODE NUMBER — built from the active Barcode Setting, not a random guess.
   Same shape as sampleBarcode() in barcodeSettings.js: prefix + serial padded
   to Number Lenght + suffix (prefix "4A", serial 1000, length 4 -> "4A1000").
   The serial starts at the setting's Start Number and increments by 1 every
   time a barcode is actually generated, tracked in serialRef so duplicate
   rows in the same session never collide.
--------------------------------------------------------------------------------- */
function nextSettingBarcode(setting, serialRef) {
  if (!setting) return null;
  const len = Number(setting.numberLenght) || 0;
  const n = serialRef.current;
  serialRef.current += 1;
  const body = String(n).padStart(len, "0");
  return String(setting.prefix ?? "").trim() + body + String(setting.suffix ?? "").trim();
}

/** Builds a sequential series of N values starting from `base`.
 *  - If base is a valid number, the series counts up from it (base, base+1, ...).
 *  - If base is blank / not numeric, falls back to the global running counter. */
function buildSeries(base, count, counterRef) {
  const trimmed = base.trim();
  const asNum = trimmed === "" ? NaN : Number(trimmed);

  if (trimmed === "" || Number.isNaN(asNum)) {
    return Array.from({ length: count }, () => {
      const v = counterRef.current;
      counterRef.current += 1;
      return String(v);
    });
  }

  const series = Array.from({ length: count }, (_, i) => String(asNum + i));
  counterRef.current = Math.max(counterRef.current, asNum + count);
  return series;
}

function emptyEntry(nextCounter) {
  return {
    oldBarcode: "",
    itemCode: "",
    batchUnique: "",
    billSlNo: String(nextCounter),
    seq: String(nextCounter),
    dummy: String(nextCounter),
    supplierDescription: "",
    qty: "",
    uom: "",
    hsn: "",
    purRate: "",
    disc: "",
    finalNet: "",
    gst: "",
    printDescription: "",
    retailPrice: "",
    disc2: "",
    offerPrice: "",
    wspPrice: "",
    dpPrice: "",
    fma: "",
    silkMark: "",
  };
}

/* =====================================================================================
   COMPONENT
===================================================================================== */

export default function GCRBarcodeGeneration({ grcId, initialRows }) {
  const scope = useScope();
  const router = useRouter();
  const counterRef = useRef(1);
  const groupQtyRef = useRef(1);
  const qtyEnterLockRef = useRef(false);

  const [rows, setRows] = useState([]);
  const [entry, setEntry] = useState(emptyEntry(counterRef.current));
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [lookupMsg, setLookupMsg] = useState("");
  // NOTE: moved up here from inside handleQtyEnter. Hooks can only be called
  // at the top level of a component - calling useState() inside a handler
  // function throws "Invalid hook call" and also meant `submitting` was
  // silently re-initialized to false every time Qty's Enter key fired.
  const [submitting, setSubmitting] = useState(false);

  /* ---------------------------------------------------------------------------------
     ACTIVE BARCODE SETTING — the Periodic setting whose Effective/Expiry Date
     covers today, for the current business/location/finYear. Its prefix,
     suffix and Number Lenght drive every "Generate" click; its Start Number
     seeds settingSerialRef, which then increments per barcode generated in
     this session (so QTY-duplicated rows each get the next serial, not the
     same one twice).
  --------------------------------------------------------------------------------- */
  const [activeSetting, setActiveSetting] = useState(null);
  const [settingMsg, setSettingMsg] = useState("");
  const [settingLoading, setSettingLoading] = useState(false);
  const settingSerialRef = useRef(1);

  const loadActiveSetting = useCallback(async () => {
    setSettingLoading(true);
    try {
      // scopeOf() on the server only filters by business + finYear - this
      // model carries no locationId, so location is intentionally omitted.
      const qs = new URLSearchParams({
        business: scope.business || "",
        finYear: scope.finYear || "",
        perPage: "500",
      });
      const r = await fetch(`${BARCODE_SETTING_API}?${qs}`);
      const d = await r.json();
      const settingRows = d.rows || [];

      const today = new Date();
      const inWindow = settingRows.filter((row) => {
        if (!row.effectiveDate || !row.expiryDate) return false;
        const eff = new Date(row.effectiveDate);
        const exp = new Date(row.expiryDate);
        return today >= eff && today <= exp;
      });
      // several periods can theoretically overlap - prefer a Periodic one,
      // otherwise take whichever period's window covers today
      const match =
        inWindow.find((row) => row.type === "Periodic") || inWindow[0] || null;

      if (match) {
        setActiveSetting(match);
        settingSerialRef.current = Number(match.startNumber) || 1;
        setSettingMsg("");
      } else {
        setActiveSetting(null);
        setSettingMsg(
          "No active Barcode Setting covers today's date - add one under Barcode Settings before generating."
        );
      }
    } catch {
      setActiveSetting(null);
      setSettingMsg("Could not load Barcode Settings.");
    } finally {
      setSettingLoading(false);
    }
  }, [scope.business, scope.finYear]);

  useEffect(() => {
    loadActiveSetting();
  }, [loadActiveSetting]);

  /* ---------------------------------------------------------------------------------
     PERSIST SERIAL — after generating, push the advanced startNumber back onto
     the Barcode Setting document via the same PUT contract EditDialog uses
     (PUT /api/barcode-setting/:id, body { data: {...period fields} }). This is
     what makes numbering survive a reload: the "next number" lives on the
     setting itself, not in a ref that resets every time this page mounts.
  --------------------------------------------------------------------------------- */
  const persistSerial = async (setting, nextStartNumber) => {
    if (!setting?._id) return;
    const nextPeriod = {
      prefix: setting.prefix || "",
      suffix: setting.suffix || "",
      startNumber: nextStartNumber,
      numberLenght: setting.numberLenght,
      effectiveDate: setting.effectiveDate ? String(setting.effectiveDate).slice(0, 10) : "",
      expiryDate: setting.expiryDate ? String(setting.expiryDate).slice(0, 10) : "",
    };
    nextPeriod.sampleBarcode = computeSampleBarcode(nextPeriod);
    try {
      await fetch(`${BARCODE_SETTING_API}/${setting._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: nextPeriod }),
      });
      // keep local state in sync so the "next no." badge and future generates
      // build on the number we just saved, without waiting on a re-fetch
      setActiveSetting((prev) =>
        prev && prev._id === setting._id ? { ...prev, ...nextPeriod } : prev
      );
    } catch {
      // non-fatal: the barcode was already generated for this row either way;
      // worst case the next page load re-reads the pre-advance startNumber
      setSettingMsg("Generated, but couldn't save the updated serial to Barcode Settings.");
    }
  };

  useEffect(() => {
    if (!grcId || !Array.isArray(initialRows)) return;
    const loadedRows = initialRows.map((row) => ({
      ...row,
      id: row.id || String(row._id || nextId("row")),
      groupId: row.groupId || nextId("grp"),
    }));
    setRows(loadedRows);
    const nextCounter = loadedRows.reduce((max, row) => {
      const value = Number(row.billSlNo);
      return Number.isFinite(value) ? Math.max(max, value + 1) : max;
    }, loadedRows.length + 1);
    counterRef.current = Math.max(counterRef.current, nextCounter);
  }, [grcId, initialRows]);

  const refs = {
    oldBarcode: useRef(null),
    itemCode: useRef(null),
    batchUnique: useRef(null),
    billSlNo: useRef(null),
    seq: useRef(null),
    dummy: useRef(null),
    supplierDescription: useRef(null),
    qty: useRef(null),
    uom: useRef(null),
    hsn: useRef(null),
    purRate: useRef(null),
    disc: useRef(null),
    finalNet: useRef(null),
    gst: useRef(null),
    printDescription: useRef(null),
    retailPrice: useRef(null),
    disc2: useRef(null),
    offerPrice: useRef(null),
    wspPrice: useRef(null),
    dpPrice: useRef(null),
    fma: useRef(null),
    silkMark: useRef(null),
  };

  const isGroupOpen = activeGroupId !== null;
  const isBatchMode = entry.batchUnique === "BATCH";

  const focusNext = (ref) => {
    requestAnimationFrame(() => ref.current?.focus());
  };

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        const qty = parseFloat(r.qty) || 0;
        const rate = parseFloat(r.finalNet || r.purRate) || 0;
        const disc = parseFloat(r.disc) || 0;
        const price = parseFloat(r.offerPrice || r.retailPrice) || 0;

        acc.count += qty;
        acc.value += price * qty;
        acc.discAmount += (rate * disc) / 100 * qty;
        return acc;
      },
      { count: 0, value: 0, discAmount: 0 }
    );
  }, [rows]);

  /* ---------------------------------------------------------------------------------
     ITEM LOOKUP — queries the real Item master (/api/settings/list?slug=item).
     `search` matches name / prefix / itemCode / description (see collectFields
     in the list API), so typing an exact item code resolves to that item.
     Ref columns (hsnId, uomId) come back as raw ObjectId strings; the API's
     `labels` map resolves them to display text.
  --------------------------------------------------------------------------------- */
 const fetchItem = async (code) => {
  const qs = new URLSearchParams({
    search: code,
    perPage: "5",
    business: scope.business || "",
  });
  const r = await fetch("/api/item?" + qs);
  const d = await r.json();
  const items = d.rows || [];
  const labels = d.labels || {};
  // prefer an exact itemCode match over a loose regex hit
  const hit = items.find((it) => it.itemCode === code) || items[0];
  if (!hit) return null;

  return {
    itemCode: hit.itemCode || "",
    batchUnique: hit.uniqueBarcode === "Yes" ? "UNIQUE" : "BATCH",
    supplierDescription: hit.name || "",
    uom: labels[String(hit.uomId)] || "",
    hsn: labels[String(hit.hsnId)] || "",
    printDescription: hit.description || hit.name || "",
    // pricing/tax not on Item master except RSP/WSP - rest filled per GRC
    purRate: "",
    disc: "",
    finalNet: "",
    gst: "",
    retailPrice: hit.rsp != null ? String(hit.rsp) : "",
    disc2: hit.rspOfferPercent != null ? String(hit.rspOfferPercent) : "",
    offerPrice: "",
    wspPrice: hit.wsp != null ? String(hit.wsp) : "",
    dpPrice: "",
    fma: "",
    silkMark: "",
  };
};

  /* ---------------------------------------------------------------------------------
     OLD BARCODE — auto fetch the item (always a single row)
  --------------------------------------------------------------------------------- */
  const handleOldBarcodeEnter = async () => {
    const code = entry.oldBarcode.trim();
    if (!code) {
      refs.itemCode.current?.focus();
      return;
    }

    setLookupMsg("");
    const found = await fetchItem(code);
    if (found) {
      const [billSlNo] = buildSeries(entry.billSlNo, 1, counterRef);
      const [seq] = buildSeries(entry.seq, 1, counterRef);
      const [dummy] = buildSeries(entry.dummy, 1, counterRef);

      const row = {
        id: nextId("row"),
        groupId: nextId("grp"),
        oldBarcode: code,
        billSlNo,
        seq,
        dummy,
        qty: "1",
        barcodeGenerated: "",
        ...found,
      };

      setRows((prev) => [...prev, row]);
      setEntry(emptyEntry(counterRef.current));
      requestAnimationFrame(() => refs.oldBarcode.current?.focus());
    } else {
      setLookupMsg('No item found for "' + code + '"');
      refs.itemCode.current?.focus();
    }
  };

  /* ---------------------------------------------------------------------------------
     ITEM CODE — typing/scanning a code directly (Enter) fetches from the Item
     master and AUTOFILLS the entry row only (itemCode, batchUnique, uom, hsn,
     description, etc). It does NOT create a row by itself - the existing
     BATCH/UNIQUE + QTY flow (handleQtyEnter below) still owns row creation and
     duplication, unchanged. Since the fetch already knows batchUnique, focus
     jumps straight to Qty; if nothing is found it falls back to focusing
     batchUnique so the admin can fill it in manually, same as before.
  --------------------------------------------------------------------------------- */
  const handleItemCodeEnter = async () => {
    const code = entry.itemCode.trim();
    if (!code) {
      focusNext(refs.batchUnique);
      return;
    }

    setLookupMsg("");
const found = await fetchItem(code);
if (found) {
  setEntry((prev) => ({
    ...prev,
    ...found,
    // don't clobber a BATCH/UNIQUE the admin already picked by hand -
    // only use the item master's default when nothing's selected yet
    batchUnique: prev.batchUnique || found.batchUnique,
  }));
  focusNext(refs.qty);
} else {
      setLookupMsg('No item found for "' + code + '"');
      focusNext(refs.batchUnique);
    }
  };

  /* ---------------------------------------------------------------------------------
     QTY — UNIQUE splits into N duplicate rows. BATCH always makes exactly ONE
     row (e.g. a batch of 500/1000 pcs shares a single barcode), no duplicates.
  --------------------------------------------------------------------------------- */
  const handleQtyEnter = (event) => {
    event?.preventDefault();
    if (qtyEnterLockRef.current || isGroupOpen) return;
    qtyEnterLockRef.current = true;

    const qtyNum = Math.max(1, parseInt(entry.qty || "1", 10) || 1);
    groupQtyRef.current = qtyNum;
    const groupId = nextId("grp");

    const rowCount = isBatchMode ? 1 : qtyNum;

    const billSlNoSeries = buildSeries(entry.billSlNo, rowCount, counterRef);
    const seqSeries = buildSeries(entry.seq, rowCount, counterRef);
    const dummySeries = buildSeries(entry.dummy, rowCount, counterRef);

    const newRows = Array.from({ length: rowCount }, (_, i) => ({
      id: nextId("row"),
      groupId,
      oldBarcode: "",
      itemCode: entry.itemCode,
      batchUnique: entry.batchUnique,
      billSlNo: billSlNoSeries[i],
      seq: seqSeries[i],
      dummy: dummySeries[i],
      supplierDescription: entry.supplierDescription,
      // BATCH keeps the qty exactly as typed (e.g. 500). UNIQUE shows 1 per duplicate.
      qty: isBatchMode ? entry.qty : "1",
      uom: entry.uom,
      hsn: entry.hsn,
      purRate: entry.purRate,
      disc: entry.disc,
      finalNet: entry.finalNet,
      gst: entry.gst,
      printDescription: entry.printDescription || entry.supplierDescription,
      retailPrice: entry.retailPrice,
      disc2: entry.disc2,
      offerPrice: entry.offerPrice,
      wspPrice: entry.wspPrice,
      dpPrice: entry.dpPrice,
      fma: entry.fma,
      silkMark: entry.silkMark,
      barcodeGenerated: "",
    }));

    setRows((prev) => [...prev, ...newRows]);
    setActiveGroupId(groupId);
    setEntry((prev) => ({
      ...prev,
      printDescription: prev.printDescription || prev.supplierDescription,
    }));
    requestAnimationFrame(() => refs.uom.current?.focus());
  };

  /* ---------------------------------------------------------------------------------
     SHARED FIELDS (uom ... silkMark) — live propagation to every row in the
     currently active duplicate group as soon as the master value changes.
  --------------------------------------------------------------------------------- */
  const handleSharedChange = (field, value) => {
    setEntry((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "purRate" || field === "disc") {
        updated.finalNet = calcFinalNet(updated.purRate, updated.disc);
      }
      return updated;
    });

    if (activeGroupId) {
      setRows((prev) =>
        prev.map((r) => {
          if (r.groupId !== activeGroupId) return r;
          const updatedRow = { ...r, [field]: value };
          if (field === "purRate" || field === "disc") {
            updatedRow.finalNet = calcFinalNet(updatedRow.purRate, updatedRow.disc);
          }
          return updatedRow;
        })
      );
    }
  };


  const handlePurRateEnter = () => {
  const groupQty = groupQtyRef.current || 1;
  const raw = parseFloat(entry.purRate);
  if (!Number.isNaN(raw) && groupQty > 1) {
    const perUnit = String(Math.round((raw / groupQty) * 100) / 100);
    handleSharedChange("purRate", perUnit); // updates entry + propagates + recalculates Final Net
  }
  focusNext(refs.disc);
};

  const commitGroup = () => {
    qtyEnterLockRef.current = false;
    setActiveGroupId(null);
    setEntry(emptyEntry(counterRef.current));
    requestAnimationFrame(() => refs.oldBarcode.current?.focus());
  };

  /* ---------------------------------------------------------------------------------
     DIRECT ROW EDITING — admin can edit BILL SL NO / SEQ / DUMMY (and anything
     else) on an already-created row at any time.
  --------------------------------------------------------------------------------- */
  const updateRowField = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === "purRate" || field === "disc") {
          updated.finalNet = calcFinalNet(updated.purRate, updated.disc);
        }
        return updated;
      })
    );
  };

  /* ---------------------------------------------------------------------------------
     MANUAL "+ ADD ROW" — appends one blank, fully editable row directly to the
     grid, independent of the guided entry flow.
  --------------------------------------------------------------------------------- */
  const handleAddRow = () => {
    const n = counterRef.current;
    counterRef.current += 1;
    const row = {
      id: nextId("row"),
      groupId: nextId("grp"),
      oldBarcode: "",
      itemCode: "",
      batchUnique: "",
      billSlNo: String(n),
      seq: String(n),
      dummy: String(n),
      supplierDescription: "",
      qty: "1",
      uom: "",
      hsn: "",
      purRate: "",
      disc: "",
      finalNet: "",
      gst: "",
      printDescription: "",
      retailPrice: "",
      disc2: "",
      offerPrice: "",
      wspPrice: "",
      dpPrice: "",
      fma: "",
      silkMark: "",
      barcodeGenerated: "",
    };
    setRows((prev) => [...prev, row]);
  };

  /* ---------------------------------------------------------------------------------
     GENERATE BARCODE NUMBERS — pulled from the active Barcode Setting
     (prefix + serial padded to Number Lenght + suffix), not a random value.
     If no setting covers today, nothing is generated and settingMsg explains
     why (surfaced next to the Generate buttons below).
  --------------------------------------------------------------------------------- */
  const handleGenerateAll = () => {
    if (!activeSetting) {
      setLookupMsg(settingMsg || "No active Barcode Setting - cannot generate.");
      return;
    }
    setLookupMsg("");
    let generatedAny = false;
    setRows((prev) =>
      prev.map((r) => {
        if (r.barcodeGenerated) return r;
        generatedAny = true;
        return { ...r, barcodeGenerated: nextSettingBarcode(activeSetting, settingSerialRef) };
      })
    );
    // settingSerialRef.current is now sitting one past the last serial used -
    // that's exactly the startNumber the setting document should hold next
    if (generatedAny) persistSerial(activeSetting, settingSerialRef.current);
  };

  const handleGenerateOne = (id) => {
    if (!activeSetting) {
      setLookupMsg(settingMsg || "No active Barcode Setting - cannot generate.");
      return;
    }
    setLookupMsg("");
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, barcodeGenerated: nextSettingBarcode(activeSetting, settingSerialRef) }
          : r
      )
    );
    persistSerial(activeSetting, settingSerialRef.current);
  };

  const handleDeleteRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  /* ---------------------------------------------------------------------------------
     SUBMIT — bulk-saves every row (POST /api/barcode-generation), which also
     creates the GRC header on the backend so it appears in the GRC list.
  --------------------------------------------------------------------------------- */
  const handleSubmit = async () => {
    if (rows.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/barcode-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows,
          business: scope.business,
          location: scope.location,
          finYear: scope.finYear,
          totals,
          ...(grcId ? { grcId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setLookupMsg("");
      if (grcId) {
        router.push(`/admin/transaction/purchase/grc/${grcId}?tab=items`);
      } else {
        setRows([]);
        fetchSaved(1);
      }
    } catch (err) {
      setLookupMsg(err.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = useMemo(() => rows.filter((r) => !r.barcodeGenerated).length, [rows]);

  /* =====================================================================================
     SAVED RECORDS SEARCH (below the entry grid)
     Two search boxes:
       - codeSearch  -> matches Item Code / Old Barcode / Generated Barcode
       - nameSearch  -> matches Supplier Description / Print Description
     Hitting Enter in either box (or clicking Search) runs the query against
     GET /api/barcode-generation. Leaving both boxes empty and searching
     returns every saved record (paginated), newest first.
  ===================================================================================== */
  const [codeSearch, setCodeSearch] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [savedRows, setSavedRows] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedPage, setSavedPage] = useState(1);
  const [savedPages, setSavedPages] = useState(1);
  const [savedTotal, setSavedTotal] = useState(0);

  const codeSearchRef = useRef(null);
  const nameSearchRef = useRef(null);

  const fetchSaved = useCallback(
    async (page = 1) => {
      setSavedLoading(true);
      try {
        const qs = new URLSearchParams({
          business: scope.business || "",
          location: scope.location || "",
          finYear: scope.finYear || "",
          page: String(page),
          perPage: "20",
        });
        if (codeSearch.trim()) qs.set("code", codeSearch.trim());
        if (nameSearch.trim()) qs.set("name", nameSearch.trim());

        const r = await fetch("/api/barcode-generation?" + qs);
        const d = await r.json();
        setSavedRows(d.rows || []);
        setSavedPage(d.page || 1);
        setSavedPages(d.pages || 1);
        setSavedTotal(d.total || 0);
      } catch {
        setSavedRows([]);
      } finally {
        setSavedLoading(false);
      }
    },
    [scope.business, scope.location, scope.finYear, codeSearch, nameSearch]
  );

  // load every saved record once on mount (empty search = show all)
  useEffect(() => {
    fetchSaved(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.business, scope.location, scope.finYear]);

  const runSearch = () => fetchSaved(1);
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") runSearch();
  };
  const clearSearch = () => {
    setCodeSearch("");
    setNameSearch("");
    requestAnimationFrame(() => fetchSaved(1));
  };

  /* =====================================================================================
     RENDER
  ===================================================================================== */

  const inputBase =
    "w-full min-w-[150px] bg-white border border-slate-300 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-100 disabled:text-slate-400";
  const inputEditable =
    "w-full min-w-[130px] bg-white border border-slate-300 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const inputCalculated =
    "w-full min-w-[130px] bg-emerald-50 border border-emerald-300 rounded px-2.5 py-2 text-sm font-semibold text-emerald-800 focus:outline-none";
  const thBase =
    "px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 border border-slate-300 whitespace-nowrap bg-slate-100 sticky top-0";
  const tdBase = "border border-slate-200 p-1.5 align-middle";

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800">
      <div className="max-w-full mx-auto">
        <div className="flex items-center justify-between mb-3 gap-4">
          <div>
            <h1 className="text-lg font-bold">Barcode Generation — GCR</h1>
            <p className="text-xs text-slate-500">
              OLD BARCODE auto-fetches a saved item. BILL SL NO / SEQ / DUMMY are editable
              anywhere (suggested automatically, but admin can override). Selecting{" "}
              <span className="font-semibold">UNIQUE</span> + QTY splits into that many duplicate
              rows (one barcode per piece). Selecting <span className="font-semibold">BATCH</span>{" "}
              + QTY keeps everything in a single row — one barcode for the whole batch.
            </p>
            <p className="text-xs mt-1 flex items-center gap-2">
              {activeSetting ? (
                <span className="text-emerald-700 font-medium">
                  Using Barcode Setting: {activeSetting.periodLabel || activeSetting.subType} — next:{" "}
                  {String(activeSetting.prefix || "").trim()}
                  {String(settingSerialRef.current).padStart(Number(activeSetting.numberLenght) || 0, "0")}
                  {String(activeSetting.suffix || "").trim()}
                </span>
              ) : (
                <span className="text-amber-600 font-medium">
                  {settingLoading ? "Loading Barcode Setting..." : settingMsg}
                </span>
              )}
              <button
                type="button"
                onClick={loadActiveSetting}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
              >
                Refresh setting
              </button>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {rows.length} row(s) &middot; {pendingCount} pending
            </span>
            <button
              onClick={handleAddRow}
              className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded shadow-sm whitespace-nowrap"
            >
              + Add Row
            </button>
            <button
              onClick={handleGenerateAll}
              disabled={pendingCount === 0 || !activeSetting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold px-3 py-2 rounded shadow-sm whitespace-nowrap"
            >
              Generate All Barcodes
            </button>
            <button
              onClick={handleSubmit}
              disabled={rows.length === 0 || submitting}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold px-3 py-2 rounded shadow-sm whitespace-nowrap"
            >
              {submitting ? "Saving..." : grcId ? "Update" : "Submit"}
            </button>
          </div>
        </div>

        {lookupMsg && (
          <div className="mb-2 rounded border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-700">
            {lookupMsg}
          </div>
        )}

        <div className="overflow-auto border border-slate-300 rounded-lg shadow-sm bg-white max-h-[75vh]">
          <table className="border-collapse w-full">
            <thead>
              <tr>
                <th className={thBase}>Old Barcode</th>
                <th className={thBase}>Item Code</th>
                <th className={thBase}>Batch/Unique</th>
                <th className={thBase}>Bill Sl No.</th>
                <th className={thBase}>Seq</th>
                <th className={thBase}>Dummy</th>
                <th className={thBase}>Supplier Description</th>
                <th className={thBase}>Qty</th>
                <th className={thBase}>UOM</th>
                <th className={thBase}>HSN</th>
                <th className={thBase}>Pur Rate</th>
                <th className={thBase}>Disc</th>
                <th className={thBase}>Final Net</th>
                <th className={thBase}>GST %</th>
                <th className={thBase}>Print Description</th>
                <th className={thBase}>Retail Price</th>
                <th className={thBase}>Disc</th>
                <th className={thBase}>Offer Price</th>
                <th className={thBase}>WSP Price</th>
                <th className={thBase}>DP Price</th>
                <th className={thBase}>FMA</th>
                <th className={thBase}>Silk Mark</th>
                <th className={thBase}>Barcode Number Generated</th>
                <th className={thBase}></th>
              </tr>
            </thead>

            <tbody>
              {/* ---------------- LIVE ENTRY ROW ---------------- */}
              <tr className="bg-amber-50">
                <td className={tdBase}>
                  <input
                    ref={refs.oldBarcode}
                    className={inputBase}
                    value={entry.oldBarcode}
                    disabled={isGroupOpen}
                    placeholder="scan/type"
                    onChange={(e) => setEntry((p) => ({ ...p, oldBarcode: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleOldBarcodeEnter()}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.itemCode}
                    className={inputBase}
                    value={entry.itemCode}
                    disabled={isGroupOpen}
                    onChange={(e) => setEntry((p) => ({ ...p, itemCode: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleItemCodeEnter()}
                  />
                </td>
                <td className={tdBase}>
                  <select
                    ref={refs.batchUnique}
                    className={inputBase}
                    value={entry.batchUnique}
                    disabled={isGroupOpen}
                    onChange={(e) => {
                      setEntry((p) => ({ ...p, batchUnique: e.target.value }));
                      focusNext(refs.billSlNo);
                    }}
                  >
                    <option value="">--</option>
                    <option value="BATCH">BATCH</option>
                    <option value="UNIQUE">UNIQUE</option>
                  </select>
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.billSlNo}
                    className={inputEditable}
                    value={entry.billSlNo}
                    disabled={isGroupOpen}
                    onChange={(e) => setEntry((p) => ({ ...p, billSlNo: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && focusNext(refs.seq)}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.seq}
                    className={inputEditable}
                    value={entry.seq}
                    disabled={isGroupOpen}
                    onChange={(e) => setEntry((p) => ({ ...p, seq: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && focusNext(refs.dummy)}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.dummy}
                    className={inputEditable}
                    value={entry.dummy}
                    disabled={isGroupOpen}
                    onChange={(e) => setEntry((p) => ({ ...p, dummy: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && focusNext(refs.supplierDescription)}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.supplierDescription}
                    className={inputBase}
                    value={entry.supplierDescription}
                    disabled={isGroupOpen}
                    onChange={(e) =>
                      setEntry((p) => ({ ...p, supplierDescription: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && focusNext(refs.qty)}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.qty}
                    type="number"
                    min={1}
                    className={inputBase}
                    value={entry.qty}
                    disabled={isGroupOpen}
                    placeholder={isBatchMode ? "batch qty" : "pieces"}
                    onChange={(e) => setEntry((p) => ({ ...p, qty: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleQtyEnter(e)}
                  />
                </td>

                {/* shared fields */}
                <td className={tdBase}>
                  <input
                    ref={refs.uom}
                    className={inputBase}
                    value={entry.uom}
                    disabled={!isGroupOpen}
                    onChange={(e) => handleSharedChange("uom", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && focusNext(refs.hsn)}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.hsn}
                    className={inputBase}
                    value={entry.hsn}
                    disabled={!isGroupOpen}
                    onChange={(e) => handleSharedChange("hsn", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && focusNext(refs.purRate)}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.purRate}
                    type="number"
                    className={inputBase}
                    value={entry.purRate}
                    disabled={!isGroupOpen}
                    onChange={(e) => handleSharedChange("purRate", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePurRateEnter()}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.disc}
                    type="number"
                    className={inputBase}
                    value={entry.disc}
                    disabled={!isGroupOpen}
                    onChange={(e) => handleSharedChange("disc", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && focusNext(refs.finalNet)}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.finalNet}
                    type="text"
                    className={inputCalculated}
                    value={entry.finalNet}
                    readOnly
                    disabled={!isGroupOpen}
                    placeholder="auto"
                    onKeyDown={(e) => e.key === "Enter" && focusNext(refs.gst)}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.gst}
                    type="number"
                    className={inputBase}
                    value={entry.gst}
                    disabled={!isGroupOpen}
                    onChange={(e) => handleSharedChange("gst", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && focusNext(refs.printDescription)}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.printDescription}
                    className={inputBase}
                    value={entry.printDescription}
                    disabled={!isGroupOpen}
                    onChange={(e) => handleSharedChange("printDescription", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && focusNext(refs.retailPrice)}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.retailPrice}
                    type="number"
                    className={inputBase}
                    value={entry.retailPrice}
                    disabled={!isGroupOpen}
                    onChange={(e) => handleSharedChange("retailPrice", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && focusNext(refs.disc2)}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.disc2}
                    type="number"
                    className={inputBase}
                    value={entry.disc2}
                    disabled={!isGroupOpen}
                    onChange={(e) => handleSharedChange("disc2", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && focusNext(refs.offerPrice)}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.offerPrice}
                    type="number"
                    className={inputBase}
                    value={entry.offerPrice}
                    disabled={!isGroupOpen}
                    onChange={(e) => handleSharedChange("offerPrice", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && focusNext(refs.wspPrice)}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.wspPrice}
                    type="number"
                    className={inputBase}
                    value={entry.wspPrice}
                    disabled={!isGroupOpen}
                    onChange={(e) => handleSharedChange("wspPrice", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && focusNext(refs.dpPrice)}
                  />
                </td>
                <td className={tdBase}>
                  <input
                    ref={refs.dpPrice}
                    type="number"
                    className={inputBase}
                    value={entry.dpPrice}
                    disabled={!isGroupOpen}
                    onChange={(e) => handleSharedChange("dpPrice", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && focusNext(refs.fma)}
                  />
                </td>
                <td className={tdBase}>
                  <select
                    ref={refs.fma}
                    className={inputBase}
                    value={entry.fma}
                    disabled={!isGroupOpen}
                    onChange={(e) => {
                      handleSharedChange("fma", e.target.value);
                      focusNext(refs.silkMark);
                    }}
                  >
                    <option value="">--</option>
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                </td>
                <td className={tdBase}>
                  <select
                    ref={refs.silkMark}
                    className={inputBase}
                    value={entry.silkMark}
                    disabled={!isGroupOpen}
                    onChange={(e) => handleSharedChange("silkMark", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && commitGroup()}
                  >
                    <option value="">--</option>
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                </td>
                <td className={tdBase}>
                  <span className="text-[11px] text-slate-400 italic">pending</span>
                </td>
                <td className={tdBase}>
                  {isGroupOpen && (
                    <button
                      onClick={commitGroup}
                      className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded whitespace-nowrap"
                    >
                      Done ✓
                    </button>
                  )}
                </td>
              </tr>

              {/* ---------------- COMMITTED / DUPLICATE ROWS (all editable) ---------------- */}
              {rows
                .slice()
                .reverse()
                .map((r) => (
                  <tr
                    key={r.id}
                    className={r.groupId === activeGroupId ? "bg-indigo-50" : "hover:bg-slate-50"}
                  >
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.oldBarcode}
                        onChange={(e) => updateRowField(r.id, "oldBarcode", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.itemCode}
                        onChange={(e) => updateRowField(r.id, "itemCode", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <select
                        className={inputEditable}
                        value={r.batchUnique}
                        onChange={(e) =>
                          updateRowField(r.id, "batchUnique", e.target.value)
                        }
                      >
                        <option value="">--</option>
                        <option value="BATCH">BATCH</option>
                        <option value="UNIQUE">UNIQUE</option>
                      </select>
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.billSlNo}
                        onChange={(e) => updateRowField(r.id, "billSlNo", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.seq}
                        onChange={(e) => updateRowField(r.id, "seq", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.dummy}
                        onChange={(e) => updateRowField(r.id, "dummy", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.supplierDescription}
                        onChange={(e) =>
                          updateRowField(r.id, "supplierDescription", e.target.value)
                        }
                      />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.qty}
                        onChange={(e) => updateRowField(r.id, "qty", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.uom}
                        onChange={(e) => updateRowField(r.id, "uom", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.hsn}
                        onChange={(e) => updateRowField(r.id, "hsn", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.purRate}
                        onChange={(e) => updateRowField(r.id, "purRate", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.disc}
                        onChange={(e) => updateRowField(r.id, "disc", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <input className={inputCalculated} value={r.finalNet} readOnly />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.gst}
                        onChange={(e) => updateRowField(r.id, "gst", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.printDescription}
                        onChange={(e) => updateRowField(r.id, "printDescription", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.retailPrice}
                        onChange={(e) => updateRowField(r.id, "retailPrice", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.disc2}
                        onChange={(e) => updateRowField(r.id, "disc2", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.offerPrice}
                        onChange={(e) => updateRowField(r.id, "offerPrice", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.wspPrice}
                        onChange={(e) => updateRowField(r.id, "wspPrice", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <input
                        className={inputEditable}
                        value={r.dpPrice}
                        onChange={(e) => updateRowField(r.id, "dpPrice", e.target.value)}
                      />
                    </td>
                    <td className={tdBase}>
                      <select
                        className={inputEditable}
                        value={r.fma}
                        onChange={(e) => updateRowField(r.id, "fma", e.target.value)}
                      >
                        <option value="">--</option>
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </td>
                    <td className={tdBase}>
                      <select
                        className={inputEditable}
                        value={r.silkMark}
                        onChange={(e) => updateRowField(r.id, "silkMark", e.target.value)}
                      >
                        <option value="">--</option>
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </td>
                    <td className={tdBase}>
                      {r.barcodeGenerated ? (
                        <span className="font-mono text-[11px] font-semibold text-emerald-700">
                          {r.barcodeGenerated}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleGenerateOne(r.id)}
                          disabled={!activeSetting}
                          className="text-[11px] bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-2 py-1 rounded whitespace-nowrap"
                        >
                          Generate
                        </button>
                      )}
                    </td>
                    <td className={tdBase}>
                      <button
                        onClick={() => handleDeleteRow(r.id)}
                        className="text-[11px] text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={24} className="text-center text-xs text-slate-400 py-6">
                    No rows yet — start typing an OLD BARCODE or ITEM CODE above, or click{" "}
                    <span className="font-semibold">+ Add Row</span>.
                  </td>
                </tr>
              )}
            </tbody>

            {/* NOTE: <tfoot> moved to be a direct child of <table>, matching the
                thead/tbody siblings above. Previously it was placed after the
                closing </table> tag, which browsers silently drop/ignore -
                the totals row never actually rendered. */}
            <tfoot>
              <tr className="bg-slate-100 font-semibold">
                <td colSpan={7} className="px-3 py-2 text-right border border-slate-300">Totals</td>
                <td className="px-3 py-2 border border-slate-300">{totals.count}</td>
                <td colSpan={5} className="border border-slate-300"></td>
                <td className="px-3 py-2 border border-slate-300 text-emerald-700">
                  ₹ {totals.discAmount.toFixed(2)}
                </td>
                <td colSpan={7} className="border border-slate-300"></td>
                <td className="px-3 py-2 border border-slate-300 text-indigo-700">
                  ₹ {totals.value.toFixed(2)}
                </td>
                <td colSpan={2} className="border border-slate-300"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* =====================================================================================
            SAVED RECORDS — SEARCH + TABLE
            Independent of the entry grid above. Shows every BarcodeLabel row already
            saved to the DB (via /api/barcode-generation GET), scoped to the current
            business/location/finYear. Search by Item Code / Barcode and/or by Name;
            pressing Enter in either box or clicking Search re-runs the query. Empty
            search = all saved records, paginated.
        ===================================================================================== */}
        <div className="mt-6">
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Search by Item Code / Barcode
              </label>
              <input
                ref={codeSearchRef}
                className={inputBase}
                placeholder="e.g. SAR1023 or old/generated barcode"
                value={codeSearch}
                onChange={(e) => setCodeSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Search by Name
              </label>
              <input
                ref={nameSearchRef}
                className={inputBase}
                placeholder="Supplier or print description"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </div>
            <button
              onClick={runSearch}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded shadow-sm h-[38px]"
            >
              Search
            </button>
            {(codeSearch || nameSearch) && (
              <button
                onClick={clearSearch}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold px-3 py-2 rounded h-[38px]"
              >
                Clear
              </button>
            )}
            <span className="text-xs text-slate-500 ml-auto whitespace-nowrap">
              {savedLoading ? "Loading..." : `${savedTotal} record(s)`}
            </span>
          </div>

          <div className="overflow-auto border border-slate-300 rounded-lg shadow-sm bg-white max-h-[60vh]">
            <table className="border-collapse w-full">
              <thead>
                <tr>
                  <th className={thBase}>Old Barcode</th>
                  <th className={thBase}>Item Code</th>
                  <th className={thBase}>Batch/Unique</th>
                  <th className={thBase}>Bill Sl No.</th>
                  <th className={thBase}>Supplier Description</th>
                  <th className={thBase}>Qty</th>
                  <th className={thBase}>UOM</th>
                  <th className={thBase}>HSN</th>
                  <th className={thBase}>Pur Rate</th>
                  <th className={thBase}>Final Net</th>
                  <th className={thBase}>GST %</th>
                  <th className={thBase}>Print Description</th>
                  <th className={thBase}>Retail Price</th>
                  <th className={thBase}>Offer Price</th>
                  <th className={thBase}>WSP Price</th>
                  <th className={thBase}>DP Price</th>
                  <th className={thBase}>Barcode Number Generated</th>
                </tr>
              </thead>
              <tbody>
                {savedLoading && (
                  <tr>
                    <td colSpan={17} className="text-center text-xs text-slate-400 py-6">
                      <span className="inline-block h-4 w-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin align-middle mr-2" />
                      Loading...
                    </td>
                  </tr>
                )}
                {!savedLoading && savedRows.length === 0 && (
                  <tr>
                    <td colSpan={17} className="text-center text-xs text-slate-400 py-6">
                      No records found.
                    </td>
                  </tr>
                )}
                {!savedLoading &&
                  savedRows.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50">
                      <td className={tdBase}>{r.oldBarcode || "\u2014"}</td>
                      <td className={tdBase}>{r.itemCode || "\u2014"}</td>
                      <td className={tdBase}>{r.batchUnique || "\u2014"}</td>
                      <td className={tdBase}>{r.billSlNo || "\u2014"}</td>
                      <td className={tdBase}>{r.supplierDescription || "\u2014"}</td>
                      <td className={tdBase}>{r.qty || "\u2014"}</td>
                      <td className={tdBase}>{r.uom || "\u2014"}</td>
                      <td className={tdBase}>{r.hsn || "\u2014"}</td>
                      <td className={tdBase}>{r.purRate || "\u2014"}</td>
                      <td className={tdBase}>{r.finalNet || "\u2014"}</td>
                      <td className={tdBase}>{r.gst || "\u2014"}</td>
                      <td className={tdBase}>{r.printDescription || "\u2014"}</td>
                      <td className={tdBase}>{r.retailPrice || "\u2014"}</td>
                      <td className={tdBase}>{r.offerPrice || "\u2014"}</td>
                      <td className={tdBase}>{r.wspPrice || "\u2014"}</td>
                      <td className={tdBase}>{r.dpPrice || "\u2014"}</td>
                      <td className={tdBase}>
                        {r.barcodeGenerated ? (
                          <span className="font-mono text-[11px] font-semibold text-emerald-700">
                            {r.barcodeGenerated}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center pt-3 text-[13px] text-slate-500">
            <span>
              Page <b className="text-indigo-600">{savedPage}</b> of {savedPages}
            </span>
            <span className="flex-1" />
            <span className="flex gap-2">
              <button
                className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs disabled:opacity-50"
                disabled={savedPage <= 1 || savedLoading}
                onClick={() => fetchSaved(savedPage - 1)}
              >
                Previous
              </button>
              <button
                className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs disabled:opacity-50"
                disabled={savedPage >= savedPages || savedLoading}
                onClick={() => fetchSaved(savedPage + 1)}
              >
                Next
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
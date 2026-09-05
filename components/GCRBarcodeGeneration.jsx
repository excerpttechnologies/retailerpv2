"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useScope } from "./ScopeContext";
import { useOptions } from "./useOptions";
import { useBarcodeLookup } from "./useScanner";
import Icon from "./Icon";
import { computeSampleBarcode } from "@/lib/barcodeFormat";
import * as XLSX from "xlsx";

const money = (value) => {
  const n = Number(value || 0);
  return Number.isFinite(n)
    ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";
};

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const meterRegex = /(mtr|meter|metre|meters|metres)/i;
const pcRegex = /(pc|pcs|piece|pieces)/i;

const exportFieldLabels = {
  itemCode: "Item Code",
  itemName: "Item Name",
  goodsType: "Attribute Add On",
  hsn: "HSN",
  gst: "GST",
  uom: "UOM",
  qty: "Quantity",
  noOfCuts: "No. of Cuts",
  totalMtr: "Total MTR",
  billSlNo: "Serial No",
  purchaseRate: "Purchase Rate",
  discountType: "Discount Type",
  discount: "Discount",
  finalPrice: "Final Price",
  retailPrice: "Retail Price",
  disc1: "Disc 1",
  uniqueBarcode: "Unique Barcode",
  barcodeNo: "Barcode No",
  supplierDescription: "Supplier Description",
  printDescription: "Print Description",
  rsp: "RSP",
  wsp: "WSP",
  dp: "DP",
  offerPrice: "Offer Price",
  wspPrice: "WSP Offer Price",
  dpPrice: "DP Offer Price",
  rspOfferPct: "RSP Offer %",
  wspOfferPct: "WSP Offer %",
  dpOfferPct: "DP Offer %",
  markupRSP: "Markup RSP %",
  markupWSP: "Markup WSP %",
  markupDP: "Markup DP %",
};

const normalizeExportHeader = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const sheetRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
        const headers = (sheetRows.shift() || []).map((header) => String(header || "").trim());
        if (headers.length === 0) throw new Error("The Excel file does not contain a header row.");
        const headerMap = new Map(Object.entries(exportFieldLabels).map(([key, label]) => [normalizeExportHeader(label), key]));
        const rows = sheetRows.map((values) => headers.reduce((result, header, index) => {
          const value = values[index] ?? "";
          const key = headerMap.get(normalizeExportHeader(header));
          if (key) result[key] = value;
          else if (header) result.customFields = { ...(result.customFields || {}), [header]: value };
          return result;
        }, {})).filter((row) => Object.keys(row).some((key) => key !== "customFields" && row[key] !== "") || Object.values(row.customFields || {}).some((value) => value !== ""));
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Unable to read the Excel file."));
    reader.readAsArrayBuffer(file);
  });
}

function rowMatchKey(row) {
  const barcode = String(row?.barcodeNo || "").trim();
  if (barcode) return `barcode:${barcode}`;
  return rowItemKey(row);
}

function rowItemKey(row) {
  const itemCode = String(row?.itemCode || "").trim();
  const serial = String(row?.billSlNo || "").trim();
  return itemCode || serial ? `item:${itemCode}|serial:${serial}` : null;
}

function customFieldNames(rows) {
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row?.customFields || {}))));
}

function incrementSerial(value) {
  const serial = String(value ?? '').trim();
  if (!serial) return '1';

  if (/^\d+$/.test(serial)) {
    return String(Number(serial) + 1).padStart(serial.length, '0');
  }

  const match = serial.match(/^(.*?)([A-Za-z]+)$/);
  if (!match) return serial;

  const prefix = match[1];
  const letters = match[2].toUpperCase().split('');
  let index = letters.length - 1;
  while (index >= 0 && letters[index] === 'Z') {
    letters[index] = 'A';
    index -= 1;
  }
  if (index < 0) letters.unshift('A');
  else letters[index] = String.fromCharCode(letters[index].charCodeAt(0) + 1);

  return prefix + letters.join('');
}

function modeFromUom(uom, uniqueBarcode = "No") {
  const value = String(uom || "").trim();
  if (meterRegex.test(value)) return "batch";
  if (pcRegex.test(value)) return "unique";
  return String(uniqueBarcode).toLowerCase() === "yes" ? "unique" : "batch";
}

function usesMeterCuts(row) {
  return meterRegex.test(String(row?.uom || "")) && String(row?.uniqueBarcode || "No").toLowerCase() === "yes";
}

function buildMeterCutPlan({ totalMtr = 0, qtyOrCuts = 1, uniqueBarcode = false }) {
  const cuts = Math.max(1, Number(qtyOrCuts) || 1);
  const total = Math.max(0, Number(totalMtr) || 0);
  const plan = [];
  let remaining = total;

  for (let i = 0; i < cuts; i += 1) {
    const share = i === 0 ? total : remaining;
    if (i < cuts - 1) remaining = Math.max(0, remaining - share);
    plan.push({
      index: i + 1,
      value: Number(share || 0),
      shareBarcode: !uniqueBarcode,
      groupId: uniqueBarcode ? `meter-${i + 1}` : "meter-shared",
    });
  }

  return plan;
}

function makeMeterCutRows(count = 1, totalMtr = 0) {
  const safeCount = Math.max(1, Number(count || 1));
  void totalMtr;

  return Array.from({ length: safeCount }, (_, index) => ({
    id: index + 1,
    value: "",
  }));
}

function recalcMeterCutRows({ count, totalMtr, rows = [], changedIndex = null, changedValue = "" }) {
  const safeCount = Math.max(1, Number(count || rows.length || 1));
  const total = Number(totalMtr || 0);
  const nextRows = Array.from({ length: safeCount }, (_, index) => {
    const current = rows[index] || {};
    const baseValue = current.value ?? "";
    let value = baseValue;
    if (index === changedIndex) value = changedValue;
    return {
      id: current.id ?? index + 1,
      value: value === null || value === undefined ? "" : String(value),
    };
  });

  if (changedIndex === null || !Number.isFinite(total) || total <= 0) {
    return nextRows;
  }

  if (nextRows[changedIndex]?.value === "") {
    return nextRows;
  }

  let runningSum = 0;
  let firstBlankIndex = -1;

  for (let index = 0; index < safeCount; index += 1) {
    const raw = nextRows[index]?.value;
    const numeric = raw === "" || raw === null || raw === undefined ? null : Number(raw);
    if (numeric !== null && Number.isFinite(numeric)) {
      runningSum += numeric;
      continue;
    }

    firstBlankIndex = index;
    break;
  }

  if (firstBlankIndex === -1) {
    return nextRows;
  }

  const remaining = Math.max(0, total - runningSum);
  nextRows[firstBlankIndex] = { ...nextRows[firstBlankIndex], value: remaining > 0 ? String(remaining) : "" };
  for (let index = firstBlankIndex + 1; index < safeCount; index += 1) {
    nextRows[index] = { ...nextRows[index], value: "" };
  }

  return nextRows;
}

function emptyRow(id) {
  return {
    id,
    /* the barcode physically on the incoming goods - the vendor's own printed
       number. It identifies the item, and is carried through to the saved
       label so the new barcode stays traceable back to the old one. */
    oldBarcode: "",
    itemCode: "",
    itemName: "",
    goodsType: "",
    hsn: "",
    gst: "",
    uom: "",
    qty: "",
    noOfCuts: "",
    totalMtr: "",
    purchaseRate: "",
    discountType: "Percentage",
    discount: "5",
    finalPrice: "",
    retailPrice: "",
    disc1: "",
    uniqueBarcode: "No",
    barcodeNo: "",
    supplierDescription: "",
    printDescription: "",
    mode: "unique",
    groupId: null,
    groupSize: 1,
    billSlNo: "",
    rsp: "",
    wsp: "",
    dp: "",
  };
}

function isDateActive(row, date = new Date()) {
  const effectiveDate = row?.effectiveDate ? new Date(row.effectiveDate) : null;
  const expiryDate = row?.expiryDate ? new Date(row.expiryDate) : null;
  const validEffective = !effectiveDate || (Number.isFinite(effectiveDate.getTime()) && effectiveDate <= date);
  const validExpiry = !expiryDate || (Number.isFinite(expiryDate.getTime()) && expiryDate >= date);
  return validEffective && validExpiry;
}

function buildBarcodePlan({ uom, uniqueBarcode, qtyOrCuts, totalMtr, cutRows = [] }) {
  const meterMode = meterRegex.test(String(uom || ""));
  const targetQty = Math.max(1, Number(qtyOrCuts || 1));

  if (meterMode) {
    const meterValues = cutRows.length > 0
      ? cutRows.map((cut) => Number(cut.value || 0)).filter((value) => Number.isFinite(value) && value > 0)
      : [Math.max(0, Number(totalMtr || 0)) || 1];

    if (uniqueBarcode) {
      return meterValues.map((value, index) => ({
        qty: Number(value || 0),
        groupId: `meter-${index + 1}`,
        groupSize: 1,
        shareBarcode: false,
      }));
    }

    const sharedValue = meterValues.reduce((sum, value) => sum + Number(value || 0), 0) || targetQty;
    return [{
      qty: sharedValue,
      groupId: "meter-shared",
      groupSize: Math.max(1, meterValues.length),
      shareBarcode: true,
    }];
  }

  if (uniqueBarcode) {
    return Array.from({ length: targetQty }, (_, index) => ({
      qty: 1,
      groupId: `pc-${index + 1}`,
      groupSize: 1,
      shareBarcode: false,
    }));
  }

  return [{
    qty: targetQty,
    groupId: "pc-shared",
    groupSize: 1,
    shareBarcode: true,
  }];
}

function calculatePrices(row) {
  const purchaseRate = Number(row.purchaseRate || 0);
  const discount = Number(row.discount || row.disc1 || 0);
  const discountType = row.discountType || "Percentage";
  const finalValue = discountType === "Flat"
    ? Math.max(0, purchaseRate - discount)
    : Math.max(0, purchaseRate - (purchaseRate * discount) / 100);

  const rsp = finalValue * (1 + Number(row.markupRSP ?? 100) / 100);
  const wsp = finalValue * (1 + Number(row.markupWSP ?? 15) / 100);
  const dp = finalValue * (1 + Number(row.markupDP ?? 15) / 100);

  return {
    ...row,
    finalPrice: round2(finalValue),
    rsp: round2(rsp),
    wsp: round2(wsp),
    dp: round2(dp),
  };
}

/* Searchable combobox used for Item Code and HSN.
   Queries the server as the user types (debounced 300 ms).
   value  = the stored id/code string
   label  = what the user sees in the closed field
   onSearch(q) called as user types
   onSelect(optionObject) called on selection
   onClear() called when × is clicked */
function SearchSelect({ placeholder, value, label, onSearch, options, loading, onSelect, onClear, editableClass }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  /* close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setHighlighted(0); }, [options]);

  const handleKey = (e) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); onSearch(query); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (options[highlighted]) { onSelect(options[highlighted]); setOpen(false); setQuery(''); } }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  const isSelected = Boolean(value);

  return (
    <div ref={containerRef} className="relative">
      {isSelected && !open ? (
        /* closed + value: show label with clear button */
        <div className={`flex items-center gap-1 rounded-md px-2 py-2 text-sm ${editableClass}`}>
          <span className="flex-1 truncate">{label || value}</span>
          <button type="button" onClick={() => { onClear(); setQuery(''); }}
            className="shrink-0 text-gray-400 hover:text-red-500" aria-label="Clear">✕</button>
        </div>
      ) : (
        /* open / searching */
        <div className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${editableClass}`}>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
            placeholder={isSelected ? (label || value) : placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); onSearch(e.target.value); setOpen(true); }}
            onFocus={() => { setOpen(true); onSearch(query); }}
            onKeyDown={handleKey}
            autoComplete="off"
          />
          {loading
            ? <span className="shrink-0 text-[11px] text-gray-400">…</span>
            : <span className="shrink-0 text-gray-400 text-[12px]">🔍</span>}
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-md"
          style={{ maxHeight: 280 }}>
          {loading && <div className="px-3 py-2 text-[12px] text-gray-400">Searching…</div>}
          {!loading && options.length === 0 && (
            <div className="px-3 py-2 text-[12px] text-gray-400">No results found</div>
          )}
          {options.map((opt, i) => (
            <div
              key={opt.value}
              className={`cursor-pointer px-3 py-2 text-[13px] ${i === highlighted ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
              onMouseDown={() => { onSelect(opt); setOpen(false); setQuery(''); }}
              onMouseEnter={() => setHighlighted(i)}
            >
              <div className="font-medium leading-tight">{opt.primaryLabel}</div>
              {opt.secondaryLabel && <div className="text-[11px] text-gray-400">{opt.secondaryLabel}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Serial No., rendered TWICE - once in row 2, once in row 3.

   It is a component rather than copied JSX for one reason: both boxes must
   show the same number and both must be locked the same way, and two copies of
   this markup would eventually drift. Both call sites pass the one
   form.serialNo, so the pair is two windows onto a single value - there is no
   second serial, and nothing here can generate one.

   The number is GENERATED, never typed: seeded to rowCount + 1 when the form
   opens and advanced by incrementSerial() after every submit. A hand-edit
   could only put it out of step with the rows already in the grid, and two
   rows carrying the same serial cannot be told apart afterwards.

   readOnly is the real guard - it blocks typing, paste, cut and delete at the
   browser level. The handlers below only close the gaps it leaves: a caret
   keystroke reaching a click-focused box, a drop, and a scroll over it. Tab
   and Ctrl/Cmd combinations are let through, so focus can still leave the box
   and the value can still be copied. The last
   line of defence is not here at all: AddItemModal's updateField refuses the
   serialNo key outright, so no handler anywhere can write it. */
function LockedSerialField({ value, readOnlyClass }) {
  return (
    <div className="max-w-[110px] space-y-1 xl:max-w-none">
      <label className="block text-[11px] font-semibold text-gray-700">Serial No. *</label>
      <div className="relative">
        <input
          value={value}
          readOnly
          tabIndex={-1}
          aria-readonly="true"
          title="Serial No. is generated automatically"
          onKeyDown={(event) => { if (event.key !== "Tab" && !event.ctrlKey && !event.metaKey) event.preventDefault(); }}
          onPaste={(event) => event.preventDefault()}
          onCut={(event) => event.preventDefault()}
          onDrop={(event) => event.preventDefault()}
          onWheel={(event) => event.currentTarget.blur()}
          className={`w-full cursor-not-allowed rounded-md px-2 py-2 pr-7 text-sm ${readOnlyClass}`}
        />
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
    </div>
  );
}
function AddItemModal({ open, onClose, onSubmit, onSubmitAndPrint, rowCount = 0, barcodeFormat, reserveNumbers, business = "" }) {
  const createBlankForm = (overrides = {}) => ({
    oldBarcode: "",
    itemCode: "",
    itemName: "",
    itemId: "",
    itemLabel: "",
    hsnId: "",
    hsn: "",
    gst: "5",
    goodsType: "",
    /* the vendor's own wording for the goods. Was previously never a form
       field - the generated row just copied itemName into it - so it is
       seeded from the Old Barcode lookup and editable from row 2. */
    supplierDescription: "",
    printDescription: "",
    uniqueBarcode: true,
    isMtr: false,
    qty: "",
    noOfCuts: "",
    totalMtr: "",
    purchaseRate: "",
    discountType: "Percentage",
    discount: "5",
    finalPrice: "0.00",
    markupRSP: 100,
    rspPrice: "0.00",
    markupWSP: 15,
    wspPrice: "0.00",
    markupDP: 15,
    dpPrice: "0.00",
    rspOfferPct: 0,
    rspOfferPrice: "0.00",
    wspOfferPct: 0,
    wspOfferPrice: "0.00",
    dpOfferPct: 0,
    dpOfferPrice: "0.00",
    serialNo: 1,
    ...overrides,
  });

  const [form, setForm] = useState(() => createBlankForm());
  /* the reservation round trip - the Add buttons are disabled while it runs
     so a double-click cannot burn a second block of numbers */
  const [reserving, setReserving] = useState(false);
  const [reserveError, setReserveError] = useState("");
  /* Server-side search state for Item Code and HSN */
  const [itemOptions, setItemOptions] = useState([]);
  const [itemLoading, setItemLoading] = useState(false);
  const [itemLabel, setItemLabel] = useState('');
  const [hsnOptions, setHsnOptions] = useState([]);
  const [hsnLoading, setHsnLoading] = useState(false);
  const [hsnLabel, setHsnLabel] = useState('');
  const itemTimerRef = useRef(null);
  const hsnTimerRef = useRef(null);
  const [cutRows, setCutRows] = useState([{ id: 1, value: "" }]);
  const [focusedCutIndex, setFocusedCutIndex] = useState(0);
  const cutTargetRef = useRef(0);

  /* Debounced server-side item search */
  const searchItems = (q) => {
    clearTimeout(itemTimerRef.current);
    setItemLoading(true);
    itemTimerRef.current = setTimeout(() => {
      const qs = new URLSearchParams({ perPage: '20', search: q || '' });
      if (business) qs.set('business', business);
      fetch('/api/item?' + qs)
        .then((r) => r.json())
        .then((d) => {
          setItemOptions((d.rows || []).map((row) => ({
            value: String(row._id),
            primaryLabel: row.itemCode || row.name || '',
            secondaryLabel: row.name !== row.itemCode ? row.name : '',
            itemCode: row.itemCode || '',
            name: row.name || '',
            subGroupId: row.subGroupId || '',
            description: row.description || '',
          })));
        })
        .catch(() => setItemOptions([]))
        .finally(() => setItemLoading(false));
    }, 300);
  };

  /* Debounced server-side HSN search */
  const searchHsn = (q) => {
    clearTimeout(hsnTimerRef.current);
    setHsnLoading(true);
    hsnTimerRef.current = setTimeout(() => {
      const qs = new URLSearchParams({ perPage: '20', search: q || '' });
      fetch('/api/hsn?' + qs)
        .then((r) => r.json())
        .then((d) => {
          setHsnOptions((d.rows || []).map((row) => ({
            value: String(row._id),
            primaryLabel: row.code || '',
            secondaryLabel: row.description || '',
            code: row.code || '',
            description: row.description || '',
            taxSlabs: Array.isArray(row.taxSlabs) ? row.taxSlabs : [],
          })));
        })
        .catch(() => setHsnOptions([]))
        .finally(() => setHsnLoading(false));
    }, 300);
  };

  /* OLD BARCODE LOOKUP.

     status: idle | loading | found | error. `resolvedRef` holds the code that
     is currently loaded into the form, so re-scanning the same label - the
     classic double-trigger of a wedge scanner - neither refetches nor
     rebuilds the form. `inFlightRef` blocks a second request while one is
     already running. */
  const [lookup, setLookup] = useState({ status: "idle", message: "" });
  const resolvedRef = useRef("");
  const inFlightRef = useRef("");

  /* the shared scanner hook every other scanning screen uses (POS, stock
     transfer, receiving, returns), so this screen talks to /api/barcode/scan
     the same way and surfaces the same server messages */
  const { lookup: scanLookup } = useBarcodeLookup({ business, intent: "LOOKUP" });

  const readOnlyClass = "border border-[#dfe4eb] bg-[#f3f5f9] text-gray-700";
  const editableClass = "border border-[#dfe4eb] bg-white text-gray-700";

  useEffect(() => {
    if (!open) return;
    setForm((current) => ({
      ...current,
      serialNo: Number(rowCount || 0) + 1,
    }));

    setCutRows((current) => {
      if (!form.isMtr) return [{ id: 1, value: "" }];
      const count = Math.max(1, Number(form.noOfCuts || current.length || 1));
      return makeMeterCutRows(count, Number(form.totalMtr || 0));
    });

    /* pre-populate dropdowns with initial results so they are not blank on open */
    searchItems('');
    searchHsn('');
  }, [open]);

  useEffect(() => {
    const purchaseRate = Number(form.purchaseRate || 0);
    const discount = Number(form.discount || 0);
    const finalValue = form.discountType === "Flat"
      ? Math.max(0, purchaseRate - discount)
      : Math.max(0, purchaseRate - (purchaseRate * discount) / 100);

    setForm((current) => {
      const rspPrice = finalValue * (1 + Number(current.markupRSP || 0) / 100);
      const wspPrice = finalValue * (1 + Number(current.markupWSP || 0) / 100);
      const dpPrice = finalValue * (1 + Number(current.markupDP || 0) / 100);
      const rspOfferPct = Number(current.rspOfferPct || 0);
      const wspOfferPct = Number(current.wspOfferPct || 0);
      const dpOfferPct = Number(current.dpOfferPct || 0);

      return {
        ...current,
        finalPrice: finalValue.toFixed(2),
        rspPrice: rspPrice.toFixed(2),
        wspPrice: wspPrice.toFixed(2),
        dpPrice: dpPrice.toFixed(2),
        rspOfferPrice: (rspPrice * (1 - rspOfferPct / 100)).toFixed(2),
        wspOfferPrice: (wspPrice * (1 - wspOfferPct / 100)).toFixed(2),
        dpOfferPrice: (dpPrice * (1 - dpOfferPct / 100)).toFixed(2),
      };
    });
  }, [form.purchaseRate, form.discount, form.discountType]);

  if (!open) return null;

  /* Serial No. is generated, never entered. Refusing the key here - rather
     than only marking the two inputs readOnly - means no handler, no future
     field and no stray call can put a UI value into it. The generator still
     writes it: createBlankForm seeds it and the post-submit reset advances
     it, and both go through setForm directly, not through here. */
  const updateField = (key, value) => {
    if (key === "serialNo") return;
    setForm((current) => ({ ...current, [key]: value }));
  };

  /* HSN appears in row 1 and again in row 3. Both call this, so both read
     the same form.hsnId / hsnLabel and both go through handleHsnSelection -
     picking in either box updates the other and pulls the GST slab with it.
     Fully editable in both places: this is a live search, never locked. */
  const renderHsnField = () => (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold text-gray-700">HSN *</label>
      <SearchSelect
        placeholder="Search HSN…"
        value={form.hsnId}
        label={hsnLabel}
        onSearch={searchHsn}
        options={hsnOptions}
        loading={hsnLoading}
        onSelect={(opt) => handleHsnSelection(opt)}
        onClear={() => handleHsnSelection(null)}
        editableClass={editableClass}
      />
    </div>
  );

  const resolveProductGroup = async (subGroupId) => {
    if (!subGroupId) {
      setForm((current) => ({ ...current, subGroupName: "", groupName: "" }));
      return;
    }

    try {
      const response = await fetch(`/api/product-group/${subGroupId}`);
      const payload = await response.json();
      const subGroup = payload?.doc || null;
      if (!subGroup) {
        setForm((current) => ({ ...current, subGroupName: "", groupName: "" }));
        return;
      }

      let groupName = "";
      if (subGroup.parentId) {
        const groupResponse = await fetch(`/api/product-group/${subGroup.parentId}`);
        const groupPayload = await groupResponse.json();
        groupName = groupPayload?.doc?.name || "";
      }

      setForm((current) => ({
        ...current,
        subGroupName: subGroup.name || "",
        groupName,
      }));
    } catch (error) {
      console.error(error);
      setForm((current) => ({ ...current, subGroupName: "", groupName: "" }));
    }
  };

  const resolveHsnGst = async (hsnDoc) => {
    const code = hsnDoc?.code || hsnDoc?.label || "";
    const taxId = hsnDoc?.taxSlabs?.[0]?.gstTaxNameId || "";

    setForm((current) => ({ ...current, hsn: code, hsnId: hsnDoc?.value || current.hsnId }));

    if (!taxId) {
      setForm((current) => ({ ...current, gst: "5" }));
      return;
    }

    try {
      const response = await fetch(`/api/tax/${taxId}`);
      const payload = await response.json();
      const taxRecord = payload?.doc || payload || {};
      const gstValue = Number(taxRecord.igst ?? taxRecord.cgst ?? taxRecord.sgst ?? taxRecord.gst ?? 5);
      setForm((current) => ({ ...current, gst: String(gstValue || 5) }));
    } catch (error) {
      setForm((current) => ({ ...current, gst: "5" }));
    }
  };

  /* Clears everything the previous Old Barcode put on the form, so barcode B
     can never inherit barcode A's item, HSN or GST. */
  const clearFetchedItem = () => {
    resolvedRef.current = "";
    setForm((current) => ({
      ...current,
      itemId: "", itemCode: "", itemName: "", itemLabel: "",
      hsnId: "", hsn: "", gst: "5",
      printDescription: "", supplierDescription: "", subGroupName: "", groupName: "",
    }));
  };

  /* Old Barcode -> the item it belongs to.

     Reuses POST /api/barcode/scan, the single endpoint every scanner in the
     app already talks to. With intent 'LOOKUP' it is a pure read - it never
     writes, reserves or consumes anything - and it is the only lookup that
     matches on oldBarcode as well as barcodeNo/barcodeGenerated, which is
     exactly what is printed on incoming supplier goods. */
  const lookupOldBarcode = async (rawCode) => {
    const code = String(rawCode || "").trim();

    if (!code) {
      setLookup({ status: "idle", message: "" });
      clearFetchedItem();
      return;
    }
    /* already loaded, or already being fetched - a repeat scan is a no-op */
    if (code === resolvedRef.current || code === inFlightRef.current) return;

    inFlightRef.current = code;
    setLookup({ status: "loading", message: "Fetching barcode..." });
    /* the previous item must not linger while the new one is on its way */
    clearFetchedItem();

    try {
      const result = await scanLookup(code);

      /* the user typed on - this answer is for a code that is no longer in
         the box, so dropping it avoids a late response overwriting a newer one */
      if (inFlightRef.current !== code) return;

      if (!result?.ok || !result.unit) {
        /* "belongs to a different business" is worth repeating verbatim - it
           tells the operator to change the company selector, which the
           generic wording would send them hunting for. Anything else reads
           as plain not-found. */
        setLookup({
          status: "error",
          message: result?.code === "BARCODE_WRONG_BUSINESS"
            ? result.error
            : "Barcode not found. Please enter or scan a valid barcode.",
        });
        return;
      }

      const unit = result.unit;

      /* When a barcode is scanned, populate labels so the SearchSelect
         closed state shows the item code and HSN code correctly. */
      if (unit.itemCode) setItemLabel(unit.itemCode);
      if (unit.hsn) setHsnLabel(unit.hsn);

      setForm((current) => ({
        ...current,
        oldBarcode: code,
        itemId: unit.itemId ? String(unit.itemId) : "",
        itemCode: unit.itemCode || "",
        itemName: unit.itemName || "",
        hsnId: "",
        hsn: unit.hsn || "",
        gst: unit.gst ? String(unit.gst) : current.gst,
        printDescription: unit.printDescription || unit.description || unit.itemName || "",
        /* the vendor's wording as recorded on the matched label - falls back
           to the merged description so an older row without a separate
           supplier description still fills the field */
        supplierDescription: unit.supplierDescription || unit.description || "",
        purchaseRate: unit.rate ? String(unit.rate) : current.purchaseRate,
        uom: unit.uom || current.uom,
      }));

      resolvedRef.current = code;
      setLookup({
        status: "found",
        message: `${unit.itemCode || unit.itemName || "Item"} loaded.`,
      });
    } catch {
      if (inFlightRef.current !== code) return;
      setLookup({ status: "error", message: "Could not reach the server. Try the scan again." });
    } finally {
      if (inFlightRef.current === code) inFlightRef.current = "";
    }
  };

  const handleItemSelection = async (opt) => {
    if (!opt) {
      setItemLabel('');
      setForm((current) => ({ ...current, itemId: "", itemName: "", itemCode: "", subGroupName: "", groupName: "", printDescription: "" }));
      return;
    }
    const itemCode = opt.itemCode || opt.primaryLabel || "";
    const itemName = opt.name || opt.secondaryLabel || "";
    setItemLabel(itemCode);
    setForm((current) => ({
      ...current,
      itemId: opt.value,
      itemCode,
      itemName,
      printDescription: opt.description || "",
    }));
    await resolveProductGroup(opt.subGroupId || "");
  };

  const handleHsnSelection = async (opt) => {
    if (!opt) {
      setHsnLabel('');
      setForm((current) => ({ ...current, hsnId: "", hsn: "", gst: "5" }));
      return;
    }
    setHsnLabel(opt.code || opt.primaryLabel || "");
    await resolveHsnGst({
      value: opt.value,
      code: opt.code || opt.primaryLabel || "",
      label: opt.primaryLabel || "",
      taxSlabs: opt.taxSlabs || [],
    });
  };

  /* Markup RSP % and RSP Offer % take two digits - 0 to 99 - and nothing else.

     The cap lives here and not on the input maxLength because maxLength only
     limits typing. A paste, an autofill, a drop or an input event raised by an
     extension all bypass it, and every one of those still fires onChange - so
     sanitising on the way into state is what actually holds.

     Stripping non-digits also removes the minus sign and the decimal point, so
     these two fields carry whole positive percentages only. No separate
     "> 99" test is needed: two digits IS 0-99, and the slice enforces it
     before the value is ever parsed.

     Deliberately scoped to these two fields only - Markup WSP %, Markup DP %,
     Discount and GST% are untouched and still accept their existing range. */
  const twoDigitPercent = (raw) => String(raw ?? "").replace(/\D/g, "").slice(0, 2);
  const updateMarkupValue = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      const netPrice = Number(current.finalPrice || 0);

      if (key === "markupRSP") {
        const pct = Number(value || 0);
        next.rspPrice = (netPrice * (1 + pct / 100)).toFixed(2);
        next.rspOfferPrice = (Number(next.rspPrice) * (1 - Number(current.rspOfferPct || 0) / 100)).toFixed(2);
      }
      if (key === "rspPrice") {
        const price = Number(value || 0);
        next.markupRSP = netPrice > 0 ? (((price / netPrice) - 1) * 100) : 0;
        next.rspOfferPrice = (price * (1 - Number(current.rspOfferPct || 0) / 100)).toFixed(2);
      }
      if (key === "markupWSP") {
        const pct = Number(value || 0);
        next.wspPrice = (netPrice * (1 + pct / 100)).toFixed(2);
        next.wspOfferPrice = (Number(next.wspPrice) * (1 - Number(current.wspOfferPct || 0) / 100)).toFixed(2);
      }
      if (key === "wspPrice") {
        const price = Number(value || 0);
        next.markupWSP = netPrice > 0 ? (((price / netPrice) - 1) * 100) : 0;
        next.wspOfferPrice = (price * (1 - Number(current.wspOfferPct || 0) / 100)).toFixed(2);
      }
      if (key === "markupDP") {
        const pct = Number(value || 0);
        next.dpPrice = (netPrice * (1 + pct / 100)).toFixed(2);
        next.dpOfferPrice = (Number(next.dpPrice) * (1 - Number(current.dpOfferPct || 0) / 100)).toFixed(2);
      }
      if (key === "dpPrice") {
        const price = Number(value || 0);
        next.markupDP = netPrice > 0 ? (((price / netPrice) - 1) * 100) : 0;
        next.dpOfferPrice = (price * (1 - Number(current.dpOfferPct || 0) / 100)).toFixed(2);
      }

      return next;
    });
  };

  const updateOfferValue = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      const rspBase = Number(current.rspPrice || 0);
      const wspBase = Number(current.wspPrice || 0);
      const dpBase = Number(current.dpPrice || 0);

      if (key === "rspOfferPct") {
        const pct = Number(value || 0);
        next.rspOfferPrice = (rspBase * (1 - pct / 100)).toFixed(2);
      }
      if (key === "rspOfferPrice") {
        const offerPrice = Number(value || 0);
        next.rspOfferPct = rspBase > 0 ? (((rspBase - offerPrice) / rspBase) * 100) : 0;
      }
      if (key === "wspOfferPct") {
        const pct = Number(value || 0);
        next.wspOfferPrice = (wspBase * (1 - pct / 100)).toFixed(2);
      }
      if (key === "wspOfferPrice") {
        const offerPrice = Number(value || 0);
        next.wspOfferPct = wspBase > 0 ? (((wspBase - offerPrice) / wspBase) * 100) : 0;
      }
      if (key === "dpOfferPct") {
        const pct = Number(value || 0);
        next.dpOfferPrice = (dpBase * (1 - pct / 100)).toFixed(2);
      }
      if (key === "dpOfferPrice") {
        const offerPrice = Number(value || 0);
        next.dpOfferPct = dpBase > 0 ? (((dpBase - offerPrice) / dpBase) * 100) : 0;
      }

      return next;
    });
  };

  const addCutRow = () => {
    const currentCount = Number(form.noOfCuts || cutRows.length || 1);
    const nextCount = Number.isFinite(currentCount) && currentCount > 0 ? currentCount + 1 : 1;
    updateField("noOfCuts", String(nextCount));
    setCutRows(makeMeterCutRows(nextCount, Number(form.totalMtr || 0)));
  };

  const removeCutRow = (index) => {
    setCutRows((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      updateField("noOfCuts", String(next.length));
      return next;
    });
  };

  const updateCutValue = (index, value) => {
    const trimmed = value === "" ? "" : String(value);
    const nextCuts = cutRows.map((row, rowIndex) => rowIndex === index ? { ...row, value: trimmed } : row);
    setCutRows(nextCuts);
    const enteredTotal = nextCuts.reduce((sum, row) => sum + (Number(row.value || 0) || 0), 0);
    if (enteredTotal > cutTargetRef.current) cutTargetRef.current = enteredTotal;
    updateField("totalMtr", enteredTotal ? String(enteredTotal) : "");
  };

  const commitCutValue = (index) => {
    const countValue = form.noOfCuts === "" ? cutRows.length : form.noOfCuts;
    const count = Number.isFinite(Number(countValue)) && Number(countValue) > 0 ? Number(countValue) : cutRows.length || 1;
    const nextCuts = recalcMeterCutRows({
      count,
      totalMtr: cutTargetRef.current || Number(form.totalMtr || 0),
      rows: cutRows,
      changedIndex: index,
      changedValue: cutRows[index]?.value || "",
    });
    setCutRows(nextCuts);
    const committedTotal = nextCuts.reduce((sum, row) => sum + (Number(row.value || 0) || 0), 0);
    updateField("totalMtr", committedTotal ? String(committedTotal) : "");
  };

  /* Barcode numbers are RESERVED FROM THE SERVER, not counted in the browser.

     This used to read a running number out of sequenceRef, which starts from
     whatever the Barcode Setting says and advances locally. Two operators
     generating at the same time therefore both started from the same place
     and printed overlapping numbers - and once two garments carry the same
     label there is no way to tell them apart again.

     The reservation happens here, when the row is created, so the number the
     operator sees in the grid is the number that will be saved and the number
     on the label they may print immediately. */
  const submit = async (printAfterSubmit = false) => {
    /* Old Barcode is OPTIONAL - a blank one generates a label with no link
       back to a previous barcode, which is the normal case for goods that
       arrive unlabelled.

       It is still checked when one IS entered: a code that never resolved
       would otherwise save a label pointing at a record that does not exist.
       So the rule is "if you typed something, it has to be real", not "you
       have to type something". */
    const enteredOldBarcode = form.oldBarcode?.trim() || "";
    if (enteredOldBarcode && resolvedRef.current !== enteredOldBarcode) {
      setReserveError("Barcode not found. Please enter or scan a valid barcode.");
      return;
    }
    if (!String(form.serialNo ?? "").trim()) {
      setReserveError("Serial No. is required.");
      return;
    }
    if (!form.itemName?.trim()) return;
    if (!form.goodsType?.trim()) {
      setReserveError("Goods Type is required. Please select SM or P-M-F.");
      return;
    }
    if (form.goodsType !== "SM" && form.goodsType !== "P-M-F") {
      setReserveError("Invalid Goods Type. Please select SM or P-M-F.");
      return;
    }
    if (reserving) return;                       // guards the double-click

    const generatedRows = [];
    const baseSerial = String(form.serialNo || 1).trim();
    const finalPriceValue = Number(form.finalPrice || 0);
    const purchaseRateValue = Number(form.purchaseRate || 0);
    const barcodePlan = buildBarcodePlan({
      uom: form.isMtr ? "MTR" : "PC",
      uniqueBarcode: Boolean(form.uniqueBarcode),
      qtyOrCuts: form.isMtr ? (cutRows.length || Number(form.noOfCuts || 1)) : Number(form.qty || 1),
      totalMtr: Number(form.totalMtr || 0),
      cutRows,
    });

    setReserving(true);
    let numbers = [];
    try {
      numbers = await reserveNumbers({
        uom: form.isMtr ? "MTR" : "PC",
        batchType: form.uniqueBarcode ? "unique" : "batch",
        qty: form.isMtr
          ? Number(form.totalMtr || 0) || (cutRows.length || Number(form.noOfCuts || 1))
          : Number(form.qty || 1),
        cuts: form.isMtr ? cutRows.map((c) => Number(c.value || 0)).filter((n) => n > 0) : [],
        count: barcodePlan.length,
      });
    } catch (error) {
      setReserveError(error.message || "Could not reserve barcode numbers.");
      setReserving(false);
      return;
    }
    setReserving(false);
    setReserveError("");

    barcodePlan.forEach((planItem, index) => {
      const distinctBarcode = numbers[index];

      generatedRows.push(calculatePrices({
        ...emptyRow(`${Date.now()}-${index}`),
        /* carried through to the saved label (the save route already persists
           oldBarcode), so the new barcode stays traceable to the old one.
           Empty when none was entered - stored as '' to match the schema
           default, never faked or copied from another barcode. */
        oldBarcode: enteredOldBarcode,
        itemCode: form.itemCode || form.itemName.replace(/\s+/g, "-").toUpperCase(),
        itemName: form.itemName,
        goodsType: form.goodsType,
        hsn: form.hsn,
        gst: form.gst,
        uom: form.isMtr ? "MTR" : "PC",
        qty: String(planItem.qty || 0),
        noOfCuts: form.isMtr ? String(cutRows.length || Number(form.noOfCuts || 1)) : "",
        totalMtr: form.isMtr ? String(form.totalMtr || 0) : "",
        purchaseRate: String(purchaseRateValue),
        discountType: form.discountType,
        discount: String(form.discount || 0),
        finalPrice: String(finalPriceValue),
        retailPrice: String(form.rspPrice || 0),
        uniqueBarcode: Boolean(form.uniqueBarcode) ? "Yes" : "No",
        barcodeNo: distinctBarcode,
        /* what the operator typed in row 2, falling back to the old behaviour
           (itemName) so a blank field still saves what it always did */
        supplierDescription: form.supplierDescription?.trim() || form.itemName,
        printDescription: form.printDescription,
        mode: Boolean(form.uniqueBarcode) ? "unique" : "batch",
        groupId: planItem.groupId || null,
        groupSize: planItem.groupSize || 1,
        billSlNo: String(baseSerial),
        rsp: String(form.rspPrice || 0),
        wsp: String(form.wspPrice || 0),
        dp: String(form.dpPrice || 0),
        offerPrice: String(form.rspOfferPrice || form.rspPrice || 0),
        wspPrice: String(form.wspOfferPrice || form.wspPrice || 0),
        dpPrice: String(form.dpOfferPrice || form.dpPrice || 0),
        rspOfferPct: form.rspOfferPct,
        wspOfferPct: form.wspOfferPct,
        dpOfferPct: form.dpOfferPct,
        markupRSP: form.markupRSP,
        markupWSP: form.markupWSP,
        markupDP: form.markupDP,
      }));
    });

    if (printAfterSubmit && onSubmitAndPrint) onSubmitAndPrint(generatedRows);
    else onSubmit(generatedRows);

    const nextSerial = incrementSerial(baseSerial);
    /* the next row is a different physical piece, so its Old Barcode starts
       empty - createBlankForm already clears it, this just clears the
       matching lookup state so the old "loaded" note does not linger */
    resolvedRef.current = "";
    inFlightRef.current = "";
    setLookup({ status: "idle", message: "" });
    setForm((current) => createBlankForm({
      itemId: current.itemId,
      itemName: current.itemName,
      itemCode: current.itemCode,
      hsnId: current.hsnId,
      hsn: current.hsn,
      gst: current.gst,
      goodsType: current.goodsType,
      printDescription: current.printDescription,
      /* carried forward alongside printDescription - consecutive pieces off
         the same GRC line share the vendor's wording */
      supplierDescription: current.supplierDescription,
      uniqueBarcode: current.uniqueBarcode,
      isMtr: current.isMtr,
      discountType: current.discountType,
      discount: current.discount,
      markupRSP: current.markupRSP,
      markupWSP: current.markupWSP,
      markupDP: current.markupDP,
      serialNo: nextSerial,
    }));
    setCutRows([{ id: 1, value: "" }]);
    onClose();
  };

  return (
    <div className="mt-4 w-full rounded-[8px] border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4">
          {/* ROW 1: Old Barcode | Item Code | HSN | GST% | Attribute Add On.

              Four tracks for five fields: HSN and GST% share the third cell.
              GST% is not typed - resolveHsnGst() fills it from whichever HSN
              is picked - so sitting them side by side is how the operator
              checks the pick landed. They stay two separate controls; the
              grouping is only the cell they share.

              Explicit widths rather than equal quarters: GST% holds two digits
              and Attribute Add On holds two fixed checkboxes, so both are
              pinned to what they need and Old Barcode / Item Code split the
              rest. The two-column md: stage exists because the sidebar is a
              fixed 280px - at 768px viewport a four-across row leaves each
              field about 90px, which is unreadable. */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_270px_230px]">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-gray-700">Old Barcode</label>
              <input
                value={form.oldBarcode}
                autoFocus
                placeholder="Enter / Scan Old Barcode"
                onChange={(event) => {
                  const next = event.target.value;
                  setForm((current) => ({ ...current, oldBarcode: next }));
                  if (lookup.status !== "idle") setLookup({ status: "idle", message: "" });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    lookupOldBarcode(event.currentTarget.value);
                  }
                }}
                onBlur={(event) => lookupOldBarcode(event.currentTarget.value)}
                className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`}
              />
              {lookup.status !== "idle" && (
                <p className={`text-[11px] ${
                  lookup.status === "error" ? "text-red-600"
                    : lookup.status === "found" ? "text-green-700"
                      : "text-gray-500"
                }`}>
                  {lookup.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-gray-700">Item Code *</label>
              <SearchSelect
                placeholder="Search Item Code…"
                value={form.itemId}
                label={itemLabel}
                onSearch={searchItems}
                options={itemOptions}
                loading={itemLoading}
                onSelect={(opt) => handleItemSelection(opt)}
                onClear={() => handleItemSelection(null)}
                editableClass={editableClass}
              />
            </div>

            {/* HSN + GST% - grouped in one cell, still two separate controls */}
            <div className="grid grid-cols-[minmax(0,1fr)_86px] gap-2">
              {renderHsnField()}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">GST% *</label>
                <input value={form.gst} readOnly className={`w-full rounded-md px-2 py-2 text-sm ${readOnlyClass}`} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-gray-700">Attribute Add On *</label>
              <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-md border border-linestrong bg-white px-3 py-2">
                <label className="flex cursor-pointer items-center gap-1.5 text-[13px]">
                  <input
                    type="checkbox"
                    checked={form.goodsType === "SM"}
                    onChange={(e) => updateField("goodsType", e.target.checked ? "SM" : "")}
                    className="h-4 w-4 accent-[#0d5ddc]"
                  />
                  SM
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-[13px]">
                  <input
                    type="checkbox"
                    checked={form.goodsType === "P-M-F"}
                    onChange={(e) => updateField("goodsType", e.target.checked ? "P-M-F" : "")}
                    className="h-4 w-4 accent-[#0d5ddc]"
                  />
                  P-M-F
                </label>
              </div>
            </div>
          </div>

          {/* ROW 2: Serial No. | Supplier Description | Print Description.

              Serial No. is pinned to 90px - it holds a short running number -
              so the two descriptions take a half each of everything left. They
              hold real supplier text and are the fields that most need width;
              this is also why the page shell below dropped its second gutter,
              which was costing the card 32px it could spend here. */}
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[90px_minmax(0,1fr)_minmax(0,1fr)]">
            <LockedSerialField value={form.serialNo} readOnlyClass={readOnlyClass} />

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-gray-700">Supplier Description</label>
              <input value={form.supplierDescription} title={form.supplierDescription} onChange={(event) => updateField("supplierDescription", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-gray-700">Print Description</label>
              <input value={form.printDescription} title={form.printDescription} onChange={(event) => updateField("printDescription", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
            </div>
          </div>

          {/* ROW 3: Serial No. | HSN | Unique Barcode | MTR.

              The second Serial No. and the second HSN are the SAME two values
              as row 2 and row 1 - both serial boxes read form.serialNo and
              both HSN boxes read form.hsnId / hsnLabel, so there is one value
              behind each pair and no way for them to disagree. Nothing here
              generates a second serial: the pair is two windows onto one
              number, and neither window is writable. */}
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[90px_170px_230px_230px]">
            <LockedSerialField value={form.serialNo} readOnlyClass={readOnlyClass} />

            {renderHsnField()}

            <div className="space-y-1 flex items-end">
              <label className="flex w-full cursor-pointer items-center justify-start gap-3 rounded-md border border-[#dfe4eb] bg-white px-3 py-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.uniqueBarcode} onChange={(event) => updateField("uniqueBarcode", event.target.checked)} className="h-4 w-4 accent-[#0d5ddc]" /> Unique Barcode
              </label>
            </div>

            <div className="space-y-1 flex items-end">
              <label className="flex w-full cursor-pointer items-center justify-start gap-3 rounded-md border border-[#dfe4eb] bg-white px-3 py-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.isMtr} onChange={(event) => {
                  const checked = event.target.checked;
                  updateField("isMtr", checked);
                  if (checked) {
                    const count = Math.max(1, Number(form.noOfCuts || 1));
                    updateField("noOfCuts", String(count));
                    cutTargetRef.current = Number(form.totalMtr || 0);
                    setCutRows(makeMeterCutRows(count, Number(form.totalMtr || 0)));
                  } else {
                    cutTargetRef.current = 0;
                    setFocusedCutIndex(0);
                    setCutRows([{ id: 1, value: "" }]);
                  }
                }} className="h-4 w-4 accent-[#0d5ddc]" /> MTR
              </label>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-4 text-center text-[15px] font-bold uppercase tracking-wide underline decoration-[1.5px] underline-offset-4">Price Calculation</div>

            {/* Price Calculation grid */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">{form.isMtr ? "No. of Cuts *" : "Quantity *"}</label>
                {form.isMtr ? (
                  <input type="number" min={1} value={form.noOfCuts} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => {
                    const raw = event.target.value;
                    updateField("noOfCuts", raw);

                    if (raw === "") {
                      setCutRows((current) => Array.from({ length: Math.max(1, current.length || 1) }, (_, index) => ({
                        id: current[index]?.id ?? index + 1,
                        value: "",
                      })));
                      return;
                    }

                    const count = Number(raw);
                    if (!Number.isFinite(count) || count <= 0) {
                      setCutRows((current) => Array.from({ length: Math.max(1, current.length || 1) }, (_, index) => ({
                        id: current[index]?.id ?? index + 1,
                        value: "",
                      })));
                      return;
                    }

                    setCutRows(makeMeterCutRows(count, Number(form.totalMtr || 0)));
                  }} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
                ) : (
                  <input type="number" min={1} value={form.qty} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateField("qty", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
                )}
              </div>

              {form.isMtr && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700">Total MTR *</label>
                  <input type="number" min={0} step="0.01" value={form.totalMtr} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => {
                    const totalValue = event.target.value;
                    updateField("totalMtr", totalValue);

                    if (totalValue === "") {
                      setCutRows((current) => current.map((row) => ({ ...row, value: "" })));
                      return;
                    }

                    const numeric = Number(totalValue);
                    if (!Number.isFinite(numeric) || numeric < 0) return;
                    cutTargetRef.current = numeric;

                    setCutRows((current) => {
                      const count = Math.max(1, Number(form.noOfCuts || current.length || 1));
                      return recalcMeterCutRows({
                        count,
                        totalMtr: numeric,
                        rows: current,
                        changedIndex: 0,
                        changedValue: String(numeric),
                      });
                    });
                  }} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">Purchase Rate *</label>
                <input type="number" step="0.01" min={0} value={form.purchaseRate} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateField("purchaseRate", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">Discount Type</label>
                <select value={form.discountType} onChange={(event) => updateField("discountType", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`}>
                  <option value="Percentage">Percentage</option>
                  <option value="Flat">Flat</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">Discount *</label>
                <input type="number" step="0.01" min={0} value={form.discount} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateField("discount", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>

              {!form.isMtr && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700">Final price *</label>
                  <input value={form.finalPrice} readOnly className={`w-full rounded-md px-2 py-2 text-sm font-semibold ${readOnlyClass}`} />
                </div>
              )}
            </div>

            <div className="mt-5 text-center text-[15px] font-bold uppercase tracking-wide underline decoration-[1.5px] underline-offset-4">Mark up on Net Price</div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">Markup RSP % *</label>
                <input type="text" inputMode="numeric" maxLength={2} value={form.markupRSP} onChange={(event) => updateMarkupValue("markupRSP", twoDigitPercent(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">RSP Price *</label>
                <input type="number" step="0.01" min={0} value={form.rspPrice} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateMarkupValue("rspPrice", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">Markup WSP % *</label>
                <input type="number" min={0} value={form.markupWSP} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateMarkupValue("markupWSP", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">WSP Price *</label>
                <input type="number" step="0.01" min={0} value={form.wspPrice} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateMarkupValue("wspPrice", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">Markup DP % *</label>
                <input type="number" min={0} value={form.markupDP} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateMarkupValue("markupDP", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">DP Price *</label>
                <input type="number" step="0.01" min={0} value={form.dpPrice} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateMarkupValue("dpPrice", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
            </div>

            <div className="mt-5 text-center text-[15px] font-bold uppercase tracking-wide underline decoration-[1.5px] underline-offset-4">Offer Price /Mark Down</div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">RSP Offer %</label>
                <input type="text" inputMode="numeric" maxLength={2} value={form.rspOfferPct} onChange={(event) => updateOfferValue("rspOfferPct", twoDigitPercent(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">RSP Offer Price</label>
                <input type="number" step="0.01" min={0} value={form.rspOfferPrice} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateOfferValue("rspOfferPrice", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">WSP Offer %</label>
                <input type="number" min={0} value={form.wspOfferPct} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateOfferValue("wspOfferPct", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">WSP Offer Price</label>
                <input type="number" step="0.01" min={0} value={form.wspOfferPrice} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateOfferValue("wspOfferPrice", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">DP Offer %</label>
                <input type="number" min={0} value={form.dpOfferPct} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateOfferValue("dpOfferPct", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">DP Offer Price</label>
                <input type="number" step="0.01" min={0} value={form.dpOfferPrice} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateOfferValue("dpOfferPrice", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
            </div>

            {form.isMtr && (
              <div className="mt-5 rounded-md border border-[#dfe4eb] bg-[#f8fafc] p-3">
                <div className="grid grid-cols-[70px_1fr_48px] items-center gap-2">
                  <div className="text-center text-xs font-semibold uppercase tracking-wide text-gray-600">SL</div>
                  <div className="text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Cuts(mtr)</div>
                  <div />
                </div>

                {cutRows.map((cut, index) => (
                  <div key={cut.id ?? index} className={`mt-2 grid grid-cols-[70px_1fr_48px] items-center gap-2 rounded-md p-1 ${index === focusedCutIndex ? "bg-orange-50" : ""}`}>
                    <div className={`flex h-10 items-center justify-center rounded-md border border-gray-300 text-sm font-medium text-gray-700 ${index === focusedCutIndex ? "bg-orange-100" : "bg-[#f3f5f9]"}`}>{index + 1}</div>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={cut.value}
                      onWheel={(e) => e.currentTarget.blur()}
                      onFocus={() => setFocusedCutIndex(index)}
                      onChange={(event) => updateCutValue(index, event.target.value)}
                      onBlur={() => commitCutValue(index)}
                      className={`h-10 rounded-md px-2 text-sm ${index === focusedCutIndex ? "border border-orange-300 bg-orange-50" : editableClass} focus:border-[#0d5ddc] focus:outline-none focus:ring-2 focus:ring-[#0d5ddc]/20`}
                    />
                    <div className="flex h-10 items-center justify-center gap-2">
                      {index === cutRows.length - 1 ? (
                        <button type="button" onClick={addCutRow} className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2fbf6c] text-lg font-bold text-white">+</button>
                      ) : (
                        <button type="button" onClick={() => removeCutRow(index)} className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e34a3a] text-xl font-bold text-white">−</button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-200 pt-3">
                  <div className="text-sm font-medium text-gray-600">Total Cuts(mtr)</div>
                  <input
                    value={cutRows.reduce((sum, row) => sum + (Number(row.value || 0) || 0), 0).toFixed(2)}
                    readOnly
                    className={`w-40 rounded-md px-2 py-2 text-sm ${readOnlyClass}`}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            {reserveError && <div className="mb-2 w-full rounded border border-[#f5c2c7] bg-[#f8d7da] px-3 py-2 text-[13px] text-[#842029]">{reserveError}</div>}
            <button type="button" disabled={reserving} onClick={() => submit(false)} className="rounded-md bg-[#0d5ddc] px-7 py-3 text-[15px] font-semibold text-white shadow-[0_2px_8px_rgba(13,93,220,0.35)] transition hover:bg-[#0b4bb6] disabled:opacity-60">{reserving ? "Reserving barcodes..." : "Submit"}</button>
            <button type="button" disabled={reserving} onClick={() => submit(true)} className="rounded-md bg-[#198754] px-7 py-3 text-[15px] font-semibold text-white shadow-[0_2px_8px_rgba(25,135,84,0.3)] transition hover:bg-[#146c43] disabled:opacity-60">Submit &amp; Print Label</button>
          </div>
      </div>
    </div>
  );
}

function PrintLabelPicker({ rows, open, onClose }) {
  const [selected, setSelected] = useState([]);
  const [copies, setCopies] = useState({});

  useEffect(() => {
    if (!open) return;
    const next = {};
    rows.forEach((row) => {
      if (row.barcodeNo) next[row.barcodeNo] = Number(row.qty || 1) || 1;
    });
    setCopies(next);
    setSelected(Object.keys(next));
  }, [open, rows]);

  if (!open) return null;

  const selectedRows = rows.filter((row) => selected.includes(row.barcodeNo));

  /* The box is capped to the viewport and scrolls INTERNALLY.

     It used to be an uncapped panel inside a centred `fixed inset-0` overlay.
     Once enough barcodes were generated the list and the preview cards grew
     taller than the screen, and because the panel was centred it overflowed
     off BOTH the top and the bottom with no scrollbar anywhere to reach it -
     the Print and Close buttons included. The overlay covers the whole
     viewport, so the wheel could not scroll the page behind it either, and
     the screen read as frozen.

     max-h + flex-col + an overflow-y-auto body fixes all of that: the list
     scrolls, the header and footer stay put, and nothing is ever pushed out
     of reach. */
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-[960px] flex-col rounded-lg bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold">Print Label Picker</h3>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-gray-500">×</button>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-2">
          <div>
            {rows.filter((row) => row.barcodeNo).length === 0 && <div className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-500">No barcode generated yet.</div>}
            {rows.filter((row) => row.barcodeNo).map((row, index) => (
              <div key={row.barcodeNo || index} className="mb-3 flex items-center gap-3 rounded border border-gray-200 p-2">
                <input type="checkbox" checked={selected.includes(row.barcodeNo)} onChange={() => setSelected((prev) => prev.includes(row.barcodeNo) ? prev.filter((item) => item !== row.barcodeNo) : [...prev, row.barcodeNo])} />
                <div className="flex-1">
                  <div className="font-medium">{row.itemName || row.supplierDescription || "Item"}</div>
                  <div className="text-xs text-gray-600">{row.barcodeNo}</div>
                </div>
                <input type="number" min={1} value={copies[row.barcodeNo] || 1} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => setCopies((prev) => ({ ...prev, [row.barcodeNo]: Number(e.target.value) || 1 }))} className="w-[90px] rounded border border-gray-300 px-2 py-1 text-sm" />
              </div>
            ))}
          </div>

          <div className="rounded border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 text-sm font-semibold">Preview</div>
            {selectedRows.length === 0 ? (
              <div className="rounded border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">Select a barcode to preview.</div>
            ) : (
              <div className="space-y-4">
                {selectedRows.map((row) => (
                  <div key={row.barcodeNo} className="rounded border border-gray-300 bg-white p-3">
                    <div className="text-lg font-semibold">{row.itemName || row.supplierDescription}</div>
                    <div className="text-sm text-gray-600">{row.barcodeNo}</div>
                    <div className="mt-3 h-10 rounded border border-gray-700 bg-[repeating-linear-gradient(90deg,#000_0,#000_2px,transparent_2px,transparent_4px)]" />
                    <div className="mt-3 flex items-center justify-between text-sm"><span>RSP</span><span>{money(row.rsp || row.retailPrice || 0)}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
          <button type="button" onClick={() => window.print()} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700">Print</button>
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function GCRBarcodeGeneration({ grcId = null, initialRows = [] }) {
  const router = useRouter();
  const scope = useScope();

  const [rows, setRows] = useState([]);
  const [activeTab, setActiveTab] = useState("items");
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [printRows, setPrintRows] = useState([]);
  const [showAddItem, setShowAddItem] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  /* why the last save was refused, in the server's own words */
  const [saveError, setSaveError] = useState("");
  const importInputRef = useRef(null);
  const [barcodeFormat, setBarcodeFormat] = useState({ prefix: "", suffix: "", startNumber: 1, numberLenght: 4 });
  /* sequenceRef was the browser-held running number. It is kept only so the
     Barcode Setting's Start From can still be shown as a preview on the
     settings card; NOTHING is numbered from it any more - see
     reserveBarcodeNumbers below. */
  const sequenceRef = useRef(1);

  useEffect(() => {
    if (!Array.isArray(initialRows) || initialRows.length === 0) {
      setRows([]);
      return;
    }

    const normalized = initialRows.map((row, index) => ({
      ...row,
      id: row._id || row.id || `${row.itemCode || row.itemName || 'saved-row'}-${index}`,
      itemCode: row.itemCode || '',
      itemName: row.itemName || row.supplierDescription || row.printDescription || '',
      hsn: row.hsn || '',
      gst: row.gst || '',
      qty: row.qty || '',
      noOfCuts: row.noOfCuts || '',
      purchaseRate: row.purchaseRate || row.purRate || '',
      finalPrice: row.finalPrice || row.finalNet || '',
      retailPrice: row.retailPrice || row.rsp || '',
      offerPrice: row.offerPrice || '',
      uniqueBarcode: row.uniqueBarcode || (row.batchUnique === 'unique' ? 'Yes' : 'No') || 'No',
      uom: row.uom || '',
      barcodeNo: row.barcodeGenerated || row.barcodeNo || '',
      supplierDescription: row.supplierDescription || row.itemName || '',
      printDescription: row.printDescription || '',
      mode: row.mode || row.batchUnique || '',
      groupId: row.groupId || null,
      groupSize: row.groupSize || 1,
      billSlNo: row.billSlNo || '',
      rsp: row.rsp || row.retailPrice || '',
      wsp: row.wspPrice || row.wsp || '',
      dp: row.dpPrice || row.dp || '',
      customFields: row.customFields && typeof row.customFields === 'object' ? row.customFields : {},
    }));
    setRows(normalized);
  }, [initialRows]);

  useEffect(() => {
    const params = new URLSearchParams({
      business: scope.business || "",
      finYear: scope.finYear || "",
      page: "1",
      perPage: "50",
    });

    fetch("/api/barcode-setting?" + params)
      .then((response) => response.json())
      .then((result) => {
        const rows = Array.isArray(result.rows) ? result.rows : [];
        const active = rows
          .filter((row) => isDateActive(row))
          .sort((a, b) => new Date(b.effectiveDate || 0) - new Date(a.effectiveDate || 0))[0]
          || rows[0]
          || null;

        if (active) {
          const format = {
            prefix: active.prefix || "",
            suffix: active.suffix || "",
            startNumber: Number(active.startNumber) || 1,
            numberLenght: Number(active.numberLenght) || 4,
          };
          setBarcodeFormat(format);
          sequenceRef.current = format.startNumber;
        }
      })
      .catch(() => {});
  }, [scope.business, scope.finYear]);

  const validRows = useMemo(() => rows.filter((row) => String(row.itemCode || row.itemName || "").trim()), [rows]);
  const additionalFields = useMemo(() => customFieldNames(validRows), [validRows]);

  const totals = useMemo(() => validRows.reduce((acc, row) => {
    const qty = Number(row.qty || 0);
    const beforeTax = Number(row.finalPrice || 0) * qty;
    const gstAmount = beforeTax * (Number(row.gst || 0) / 100);
    acc.taxable += beforeTax;
    acc.gst += gstAmount;
    acc.net += beforeTax + gstAmount;
    acc.pcs += pcRegex.test(String(row.uom || "")) ? qty : 0;
    acc.mtr += meterRegex.test(String(row.uom || "")) ? qty : 0;
    return acc;
  }, { taxable: 0, gst: 0, net: 0, pcs: 0, mtr: 0 }), [validRows]);

  const summaryRows = useMemo(() => {
    const map = new Map();
    validRows.forEach((row) => {
      const key = `${row.itemCode || row.itemName || "item"}-${row.hsn || ""}-${row.gst || ""}-${row.uom || ""}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          itemName: row.itemName || row.supplierDescription || row.itemCode,
          qty: 0,
          beforeTax: 0,
          gst: 0,
          net: 0,
          customFields: {},
        });
      }
      const entry = map.get(key);
      const qty = Number(row.qty || 0);
      const beforeTax = Number(row.finalPrice || 0) * qty;
      entry.qty += qty;
      entry.beforeTax += beforeTax;
      entry.gst += beforeTax * (Number(row.gst || 0) / 100);
      entry.net += beforeTax + beforeTax * (Number(row.gst || 0) / 100);
      Object.entries(row.customFields || {}).forEach(([key, value]) => {
        const current = entry.customFields[key];
        entry.customFields[key] = current && current !== value ? `${current}, ${value}` : value;
      });
    });
    return Array.from(map.values());
  }, [validRows]);

  function appendRows(items) {
    setRows((current) => [...current, ...items]);
  }

  /* Reserves `count` real barcode numbers from the server.

     The server applies the PC/MTR x batch/unique rule itself and hands back
     one number per label it decides is needed, so the browser cannot get the
     count wrong either. Throws with the server's own message - an invalid
     quantity ("a unique piece quantity must be a whole number") is worth
     showing verbatim. */
  async function reserveBarcodeNumbers(countOrPlan) {
    const plan = typeof countOrPlan === "number"
      ? { uom: "PC", batchType: "unique", qty: countOrPlan }
      : countOrPlan;

    const response = await fetch("/api/barcode-generation/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uom: plan.uom,
        batchType: plan.batchType,
        qty: plan.qty,
        cuts: plan.cuts || [],
        business: scope.business,
        finYear: scope.finYear,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Could not reserve barcode numbers. Check the Barcode Settings for this business.");
    }
    return (data.rows || []).map((r) => r.barcodeNo);
  }

  function exportRowsToExcel() {
    const headers = [...Object.values(exportFieldLabels), ...additionalFields];
    const fields = Object.keys(exportFieldLabels);
    const values = validRows.map((row) => [
      ...fields.map((field) => field === "barcodeNo" ? row[field] ?? "" : row[field] ?? ""),
      ...additionalFields.map((field) => row.customFields?.[field] ?? ""),
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...values]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Barcode Items");
    XLSX.writeFile(workbook, "barcode-items-template.xlsx");
  }

  async function importRowsFromExcel(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const importedRows = await readExcelFile(file);
      if (importedRows.length === 0) throw new Error("No item rows were found in the Excel file.");

      /* ---- validate BEFORE anything is written -------------------------
         An import that is half applied leaves the grid in a state nobody can
         reason about, and if it is then saved it puts wrong stock into the
         system. Every row is checked first and the whole file is rejected
         with the offending row numbers if any of them fail. */
      const problems = [];
      importedRows.forEach((row, i) => {
        const line = i + 2;                       // +1 for the header, +1 for 1-based
        const name = String(row.itemName || row.itemCode || "").trim();
        if (!name) problems.push(`Row ${line}: item code or name is required`);

        const qty = Number(row.qty ?? row.totalMtr ?? 0);
        if (!Number.isFinite(qty) || qty <= 0) problems.push(`Row ${line}: quantity must be a positive number`);

        const isMtr = meterRegex.test(String(row.uom || ""));
        const unique = String(row.uniqueBarcode || "").trim().toLowerCase() === "yes";
        if (!isMtr && unique && !Number.isInteger(qty)) {
          problems.push(`Row ${line}: a unique piece quantity must be a whole number (got ${qty})`);
        }

        const rate = Number(row.purchaseRate ?? 0);
        if (row.purchaseRate !== undefined && row.purchaseRate !== "" && !Number.isFinite(rate)) {
          problems.push(`Row ${line}: purchase rate is not a number`);
        }
      });

      if (problems.length) {
        const shown = problems.slice(0, 12).join(" · ");
        throw new Error(
          `The file was not imported - ${problems.length} problem${problems.length === 1 ? "" : "s"} found. ` +
          shown +
          (problems.length > 12 ? ` ...and ${problems.length - 12} more` : "")
        );
      }

      /* ---- work out how many NEW rows need a number, then reserve that
         many from the server in one call. Imported rows are numbered the
         same way scanned ones are - never from a browser-held counter. */
      const currentByKey = new Map();
      rows.forEach((row) => {
        [rowMatchKey(row), rowItemKey(row)].filter(Boolean).forEach((key) => currentByKey.set(key, row));
      });

      const seen = new Set();
      const planned = [];
      importedRows.forEach((importedRow, index) => {
        const matchKey = rowMatchKey(importedRow) || `new:${index}`;
        if (seen.has(matchKey)) return;
        seen.add(matchKey);
        const existing = currentByKey.get(matchKey) || currentByKey.get(rowItemKey(importedRow));
        planned.push({ importedRow, index, matchKey, existing });
      });

      const needing = planned.filter((p) => !p.existing?.barcodeNo && !p.importedRow.barcodeNo).length;
      const issued = needing ? await reserveBarcodeNumbers(needing) : [];
      let nextNumber = 0;

      setRows((current) => {
        const byKey = new Map();
        current.forEach((row) => {
          [rowMatchKey(row), rowItemKey(row)].filter(Boolean).forEach((key) => byKey.set(key, row));
        });
        const newRows = [];

        planned.forEach(({ importedRow, index, matchKey, existing }) => {
          const rowId = existing?.id || `import-${Date.now()}-${index}`;
          const barcodeNo = existing?.barcodeNo || importedRow.barcodeNo || issued[nextNumber++];
          const nextRow = { ...(existing || emptyRow(rowId)), ...importedRow, id: rowId, barcodeNo, customFields: importedRow.customFields || {} };
          if (existing) {
            [matchKey, rowMatchKey(nextRow), rowItemKey(nextRow)].filter(Boolean).forEach((key) => byKey.set(key, nextRow));
          } else newRows.push(nextRow);
        });

        return current.map((row) => byKey.get(rowMatchKey(row)) || row).concat(newRows);
      });

      setImportMessage(`${importedRows.length} row${importedRows.length === 1 ? "" : "s"} imported and validated. Matching Row IDs were updated.`);
    } catch (error) {
      setImportMessage(error.message || "Unable to import the Excel file.");
    }
  }

  async function saveRows(rowsToSave = validRows, printAfterSave = false) {
    setSaving(true);
    setSaveError("");
    try {
      const saveTotals = rowsToSave.reduce((result, row) => {
        const qty = Number(row.qty || 0);
        const beforeTax = Number(row.finalPrice || 0) * qty;
        const gstAmount = beforeTax * (Number(row.gst || 0) / 100);
        result.count += qty;
        result.value += beforeTax + gstAmount;
        return result;
      }, { count: 0, value: 0 });
      const response = await fetch("/api/barcode-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rowsToSave,
          grcId: grcId || null,
          business: scope.business,
          location: scope.location,
          finYear: scope.finYear,
          supplierId: scope.supplierId || null,
          totals: {
            count: saveTotals.count,
            value: saveTotals.value,
          },
        }),
      });
      /* The API answers a failure as { error, code } (lib/apiError.js) - the
         message is written for the operator and says WHICH rule was broken:
         a missing Goods Type, an Old Barcode that matches nothing, a barcode
         that has already moved, a permission the user does not hold. Throwing
         a flat "Save failed" here discarded all of it, so a rejected save was
         indistinguishable from a server being down and left nothing on screen
         to act on. */
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (HTTP ${response.status})`);
      }
      setShowSaveConfirm(false);
      if (printAfterSave) setShowPrint(true);
      router.refresh?.();
    } catch (error) {
      console.error(error);
      /* the confirm dialog sits over the banner, so it has to go or the
         operator never sees why the save was refused */
      setShowSaveConfirm(false);
      setSaveError(error.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 px-2 py-4 md:py-6">
      <div className="flex items-center justify-between gap-4 pb-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">GRC Barcode Generation</h1>
        </div>
        <div className="text-sm text-gray-500">Barcode labels are ready after submit</div>
      </div>

      <AddItemModal
        open={showAddItem}
        rowCount={rows.length}
        barcodeFormat={barcodeFormat}
        reserveNumbers={reserveBarcodeNumbers}
        /* scopes the Old Barcode lookup to the selected company, so a code
           belonging to another business reports that rather than "not found" */
        business={scope.business}
        onClose={() => setShowAddItem(true)}
        onSubmit={(items) => appendRows(items)}
        onSubmitAndPrint={(items) => {
          const nextRows = [...rows, ...items];
          setRows(nextRows);
          setPrintRows(nextRows);
          saveRows(nextRows, true);
        }}
      />

      <div className="mt-4 rounded-lg border border-gray-300 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
          <div className="flex gap-6 text-sm font-semibold">
            {[
              { key: "items", label: "ITEMS" },
              { key: "summary", label: "ITEM SUMMARY" },
              { key: "withBarcode", label: "ITEM WITH BARCODE" },
            ].map((tab) => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={activeTab === tab.key ? "border-b-2 border-blue-600 pb-1 text-blue-700" : "pb-1 text-gray-600"}>{tab.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input ref={importInputRef} type="file" accept=".xls,.html" onChange={importRowsFromExcel} className="hidden" />
            <button type="button" onClick={() => importInputRef.current?.click()} className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50" title="Import edited Excel template">
              <Icon name="file" size={14} /> Import Excel
            </button>
            <button type="button" onClick={exportRowsToExcel} disabled={validRows.length === 0} className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50" title="Export all item fields to Excel">
              <Icon name="file" size={14} /> Export Excel
            </button>
            <span className="rounded border border-gray-300 bg-gray-50 px-2 py-1">Pc(s) {totals.pcs}</span>
          </div>
        </div>

        {importMessage && (
          <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-800">
            <span>{importMessage}</span>
            <button type="button" onClick={() => setImportMessage("")} className="text-blue-700" aria-label="Dismiss import message">×</button>
          </div>
        )}

        {saveError && (
          <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-800">
            <span>{saveError}</span>
            <button type="button" onClick={() => setSaveError("")} className="text-red-700" aria-label="Dismiss save error">×</button>
          </div>
        )}

        <div className="overflow-auto">
          {activeTab === "items" && (
            <table className="min-w-[1200px] w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border border-gray-300 px-2 py-2">Sl No</th>
                  <th className="border border-gray-300 px-2 py-2">Item Code</th>
                  <th className="border border-gray-300 px-2 py-2">Item</th>
                  <th className="border border-gray-300 px-2 py-2">HSN</th>
                  <th className="border border-gray-300 px-2 py-2">GST%</th>
                  <th className="border border-gray-300 px-2 py-2">QTY/MTR</th>
                  <th className="border border-gray-300 px-2 py-2">No. of Cut</th>
                  <th className="border border-gray-300 px-2 py-2">Rate</th>
                  <th className="border border-gray-300 px-2 py-2">GST Amount</th>
                  {additionalFields.map((field) => <th key={field} className="border border-gray-300 px-2 py-2">{field}</th>)}
                </tr>
              </thead>
              <tbody>
                {validRows.length === 0 ? (
                  <tr><td colSpan={9 + additionalFields.length} className="px-3 py-8 text-center text-gray-500">No data found</td></tr>
                ) : validRows.map((row, index) => (
                  <tr key={row.id || index} className="odd:bg-white even:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-2">{row.itemCode || "-"}</td>
                    <td className="border border-gray-300 px-2 py-2">{row.itemName || row.supplierDescription || "-"}</td>
                    <td className="border border-gray-300 px-2 py-2">{row.hsn || "-"}</td>
                    <td className="border border-gray-300 px-2 py-2">{row.gst || "-"}</td>
                    <td className="border border-gray-300 px-2 py-2">{row.qty || "-"}</td>
                    <td className="border border-gray-300 px-2 py-2">{row.noOfCuts || "-"}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(row.purchaseRate || 0)} / {money(row.finalPrice || 0)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money((Number(row.finalPrice || 0) * Number(row.qty || 0)) * (Number(row.gst || 0) / 100))}</td>
                    {additionalFields.map((field) => <td key={field} className="border border-gray-300 px-2 py-2">{row.customFields?.[field] || "-"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "summary" && (
            <table className="min-w-[1000px] w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border border-gray-300 px-2 py-2">Sl No</th>
                  <th className="border border-gray-300 px-2 py-2">Bill Sl No.</th>
                  <th className="border border-gray-300 px-2 py-2">Item Name</th>
                  <th className="border border-gray-300 px-2 py-2">QTY</th>
                  <th className="border border-gray-300 px-2 py-2">Before GST Amount</th>
                  <th className="border border-gray-300 px-2 py-2">GST Amount</th>
                  <th className="border border-gray-300 px-2 py-2">Net Amount</th>
                  {additionalFields.map((field) => <th key={field} className="border border-gray-300 px-2 py-2">{field}</th>)}
                </tr>
              </thead>
              <tbody>
                {summaryRows.length === 0 ? (
                  <tr><td colSpan={7 + additionalFields.length} className="px-3 py-8 text-center text-gray-500">No data found</td></tr>
                ) : summaryRows.map((row, index) => (
                  <tr key={row.id} className="odd:bg-white even:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-2">{row.itemName}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(row.qty)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(row.beforeTax)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(row.gst)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(row.net)}</td>
                    {additionalFields.map((field) => <td key={field} className="border border-gray-300 px-2 py-2">{row.customFields?.[field] || "-"}</td>)}
                  </tr>
                ))}
                {summaryRows.length > 0 && (
                  <tr className="bg-gray-100 font-semibold">
                    <td className="border border-gray-300 px-2 py-2" colSpan={3}>Total</td>
                    <td className="border border-gray-300 px-2 py-2">{money(totals.pcs + totals.mtr)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(totals.taxable)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(totals.gst)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(totals.net)}</td>
                    {additionalFields.map((field) => <td key={field} className="border border-gray-300 px-2 py-2" />)}
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === "withBarcode" && (
            <table className="min-w-[1400px] w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border border-gray-300 px-2 py-2">Sl No</th>
                  <th className="border border-gray-300 px-2 py-2">Item</th>
                  <th className="border border-gray-300 px-2 py-2">QTY/MTR</th>
                  <th className="border border-gray-300 px-2 py-2">No. of Cuts</th>
                  <th className="border border-gray-300 px-2 py-2">Purchase Rate</th>
                  <th className="border border-gray-300 px-2 py-2">Discount</th>
                  <th className="border border-gray-300 px-2 py-2">Final Rate</th>
                  <th className="border border-gray-300 px-2 py-2">Before Tax</th>
                  <th className="border border-gray-300 px-2 py-2">GST Amount</th>
                  <th className="border border-gray-300 px-2 py-2">Net Amount</th>
                  <th className="border border-gray-300 px-2 py-2">RSP</th>
                  <th className="border border-gray-300 px-2 py-2">WSP</th>
                  <th className="border border-gray-300 px-2 py-2">DP</th>
                  <th className="border border-gray-300 px-2 py-2">Variant</th>
                  <th className="border border-gray-300 px-2 py-2">Barcode No</th>
                  {additionalFields.map((field) => <th key={field} className="border border-gray-300 px-2 py-2">{field}</th>)}
                  <th className="border border-gray-300 px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {validRows.length === 0 ? (
                  <tr><td colSpan={16 + additionalFields.length} className="px-3 py-8 text-center text-gray-500">No data found</td></tr>
                ) : validRows.map((row, index) => (
                  <tr key={row.id || index} className="odd:bg-white even:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-2">{row.itemCode || "-"}</td>
                    <td className="border border-gray-300 px-2 py-2">{row.qty || "-"}</td>
                    <td className="border border-gray-300 px-2 py-2">{row.noOfCuts || "-"}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(row.purchaseRate || 0)}</td>
                    <td className="border border-gray-300 px-2 py-2">{row.discount || 0}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(row.finalPrice || 0)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money((Number(row.finalPrice || 0) * Number(row.qty || 0)))}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(((Number(row.finalPrice || 0) * Number(row.qty || 0)) * (Number(row.gst || 0) / 100)))}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(((Number(row.finalPrice || 0) * Number(row.qty || 0)) + ((Number(row.finalPrice || 0) * Number(row.qty || 0)) * (Number(row.gst || 0) / 100))))}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(row.rsp || row.retailPrice || 0)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(row.wsp || 0)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(row.dp || 0)}</td>
                    <td className="border border-gray-300 px-2 py-2">{row.uniqueBarcode || "No"}</td>
                    <td className="border border-gray-300 px-2 py-2"><input value={row.barcodeNo || ""} disabled className="w-32 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-gray-500" aria-label="System generated barcode" /></td>
                    {additionalFields.map((field) => <td key={field} className="border border-gray-300 px-2 py-2">{row.customFields?.[field] || "-"}</td>)}
                    <td className="border border-gray-300 px-2 py-2"><div className="flex gap-2"><button type="button" className="text-blue-600 hover:underline">Edit</button><button type="button" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} className="text-red-600 hover:underline">Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-6 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm">
        <div className="flex items-center gap-2"><span className="text-gray-500">Total Taxable</span><span className="font-mono font-semibold text-gray-800">₹ {money(totals.taxable)}</span></div>
        <div className="flex items-center gap-2"><span className="text-gray-500">Total GST</span><span className="font-mono font-semibold text-gray-800">₹ {money(totals.gst)}</span></div>
        <div className="flex items-center gap-2"><span className="text-gray-500">Grand Total</span><span className="font-mono font-bold text-indigo-700">₹ {money(totals.net)}</span></div>
      </div>

      <PrintLabelPicker rows={printRows.length ? printRows : validRows} open={showPrint} onClose={() => { setShowPrint(false); setPrintRows([]); }} />

      {showSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[520px] rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800">Confirm submit</h3>
            <p className="mt-2 text-sm text-gray-600">Do you want to save all generated barcode rows?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowSaveConfirm(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">Cancel</button>
              <button type="button" onClick={() => saveRows(validRows, false)} disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Submit"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4">
        <button type="button" onClick={() => setShowSaveConfirm(true)} className="rounded-md bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-green-700">Submit</button>
      </div>
    </div>
  );
}

export { modeFromUom, usesMeterCuts, buildMeterCutPlan };
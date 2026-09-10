"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useScope } from "./ScopeContext";
import BarcodeLabelSheet, { parseSize } from "./BarcodeLabelSheet";
import { useOptions } from "./useOptions";
import { useBarcodeLookup } from "./useScanner";
import Icon from "./Icon";
import { computeSampleBarcode } from "@/lib/barcodeFormat";
import { encodeRate } from "@/lib/purchaseRateCode";
import { gstPercentForAmount, slabGstPercent } from "@/lib/hsnGst";
import * as XLSX from "xlsx";

const money = (value) => {
  const n = Number(value || 0);
  return Number.isFinite(n)
    ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";
};

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const decimal2 = (value) => {
  const raw = String(value ?? '').replace(/[^0-9.]/g, '');
  const dot = raw.indexOf('.');
  if (dot < 0) return raw;
  return raw.slice(0, dot + 1) + raw.slice(dot + 1).replace(/\./g, '').slice(0, 2);
};
const fixed2 = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '');

/* HSN Master stores a tax slab as a reference to a Tax record plus a price
   band; the barcode screen needs the percentage. Tax records do not move
   during a session and one HSN routinely points several slabs at the same
   record, so each is fetched once and remembered for the life of the page. */
const taxRateCache = new Map();

async function fetchTaxRate(taxId) {
  const key = String(taxId || "");
  if (!key) return 0;
  if (taxRateCache.has(key)) return taxRateCache.get(key);

  try {
    const response = await fetch(`/api/tax/${key}`);
    const payload = await response.json();
    const rate = slabGstPercent(payload?.doc || payload || {});
    taxRateCache.set(key, rate);
    return rate;
  } catch {
    return 0;
  }
}

/* An HSN's raw taxSlabs -> the same bands with their rates filled in, which is
   the shape /api/item/<id>/detail already returns, so both routes into the
   form hand the slab picker identical rows. */
async function resolveSlabRates(taxSlabs) {
  const rows = Array.isArray(taxSlabs) ? taxSlabs.filter(Boolean) : [];
  if (!rows.length) return [];

  const ids = [...new Set(rows.map((s) => String(s.gstTaxNameId || "")).filter(Boolean))];
  const pairs = await Promise.all(ids.map(async (id) => [id, await fetchTaxRate(id)]));
  const rates = new Map(pairs);

  return rows.map((s) => ({
    amountFrom: s.amountFrom,
    amountTo: s.amountTo,
    igst: rates.get(String(s.gstTaxNameId || "")) || 0,
  }));
}

const meterRegex = /(mtr|meter|metre|meters|metres)/i;
const pcRegex = /(pc|pcs|piece|pieces)/i;

const exportFieldLabels = {
  itemCode: "Item Code",
  itemName: "Item Name",
  goodsType: "Attribute Add On",
  sm: "SM",
  p_m_f: "P-M-F",
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
  dp: "E-COMM",
  offerPrice: "Offer Price",
  wspPrice: "WSP Offer Price",
  dpPrice: "E-COMM Offer Price",
  rspOfferPct: "RSP Offer %",
  wspOfferPct: "WSP Offer %",
  dpOfferPct: "E-COMM Offer %",
  markupRSP: "Markup RSP %",
  markupWSP: "Markup WSP %",
  markupDP: "Markup E-COMM %",
};

/* These four columns were exported under "DP ..." before the label became
   E-COMM. A workbook exported back then is still a perfectly good file to
   import today, so the old headings keep resolving to the same keys. Without
   this they would stop matching, fall through to customFields, and the three
   E-COMM prices would silently arrive empty - which reads as lost data, not
   as a rename. The keys are unchanged; only what the heading says moved. */
const legacyExportHeaders = {
  "DP": "dp",
  "DP Offer Price": "dpPrice",
  "DP Offer %": "dpOfferPct",
  "Markup DP %": "markupDP",
};

const normalizeExportHeader = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

/* Universal Excel converter - converts ANY Excel format to ERP template format.
   Maps the column-name variations seen in exported and external workbooks to
   the grid's keys; anything unrecognised is kept as a custom field.

   Every column Export Excel writes maps back to its own key, so an exported
   sheet can be edited and imported again. The E-COMM and markup columns used
   to be dropped here, which silently threw away an edited E-COMM price. */
function convertToERPTemplate(rawHeaders, rawRows) {
  // Column mapping: external format → ERP key
  const columnMap = {
    'attributeaddon': 'goodsType',
    'goodstype': 'goodsType',
    'itemcode': 'itemCode',
    'itemname': 'itemName',
    'hsn': 'hsn',
    'gst': 'gst',
    'uom': 'uom',
    'quantity': 'qty',
    'noofcuts': 'noOfCuts',
    'totalmtr': 'totalMtr',
    'serialno': 'billSlNo',
    'purchaserate': 'purchaseRate',
    'discounttype': 'discountType',
    'discount': 'discount',
    'finalprice': 'finalPrice',
    'retailprice': 'retailPrice',
    'disc1': 'disc1',
    'uniquebarcode': 'uniqueBarcode',
    'barcodeno': 'barcodeNo',
    'supplierdescription': 'supplierDescription',
    'printdescription': 'printDescription',
    'rsp': 'rsp',
    'rspoffer': 'rspOfferPct',
    'offerprice': 'offerPrice',
    'wsp': 'wsp',
    'wspoffer': 'wspOfferPct',
    'wspofferprice': 'wspPrice',
    'dp': 'dp',
    'dpoffer': 'dpOfferPct',
    'dpofferprice': 'dpPrice',
    'ecomm': 'dp',
    'ecommoffer': 'dpOfferPct',
    'ecommofferprice': 'dpPrice',
    'markuprsp': 'markupRSP',
    'markupwsp': 'markupWSP',
    'markupecomm': 'markupDP',
    'markupdp': 'markupDP',
    'sm': 'sm',
    'smnumber': 'sm',
    'pmf': 'p_m_f',
  };

  // Build header mapping
  const headerMapping = new Map();
  rawHeaders.forEach((header, index) => {
    const normalized = normalizeExportHeader(header);
    
    const erpKey = columnMap[normalized];
    if (erpKey) {
      headerMapping.set(index, erpKey);
    } else if (header && header.trim()) {
      // Unknown column → custom field
      headerMapping.set(index, { customField: header.trim() });
    }
  });

  // Convert rows
  return rawRows.map((values) => {
    const result = {};
    const customFields = {};

    headerMapping.forEach((mapping, index) => {
      const value = values[index] ?? "";
      
      if (typeof mapping === 'string') {
        // Standard ERP field
        result[mapping] = NUMERIC_IMPORT_KEYS.has(mapping) ? importNumber(value) : value;
      } else if (mapping.customField) {
        // Custom field
        customFields[mapping.customField] = value;
      }
    });

    if (Object.keys(customFields).length > 0) {
      result.customFields = customFields;
    }

    return result;
  });
}

function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result, { type: "array", cellDates: true });
        
        // Auto-detect sheet: prefer "Barcode Items", else use first sheet
        let sheetName = workbook.SheetNames[0];
        const barcodeSheet = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('barcode') || name.toLowerCase().includes('items')
        );
        if (barcodeSheet) sheetName = barcodeSheet;
        
        const sheet = workbook.Sheets[sheetName];
        const sheetRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
        
        if (sheetRows.length === 0) {
          throw new Error("The Excel file is empty.");
        }
        
        const rawHeaders = (sheetRows[0] || []).map((header) => String(header || "").trim());
        if (rawHeaders.length === 0) {
          throw new Error("The Excel file does not contain a header row.");
        }
        
        const rawDataRows = sheetRows.slice(1);
        
        // Convert to ERP template format
        const convertedRows = convertToERPTemplate(rawHeaders, rawDataRows);
        
        // Validate critical columns
        const hasCriticalColumn = convertedRows.some(row => 
          row.itemCode || row.itemName || row.barcodeNo
        );
        
        if (!hasCriticalColumn && convertedRows.length > 0) {
          throw new Error("Invalid template: Item Code, Item Name, or Barcode No column not found");
        }
        
        // Filter out completely empty rows
        const rows = convertedRows.filter((row) => 
          Object.keys(row).some((key) => key !== "customFields" && row[key] !== "") || 
          Object.values(row.customFields || {}).some((value) => value !== "")
        );
        
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

/* Money, quantity and percentage cells come back as the text Excel displays
   (sheet_to_json raw: false), so a price typed as 1,980 or ₹1,980 or a GST of
   5% arrives with its separators and reads as NaN wherever it is added up.
   Stripped here; anything still not a number is left exactly as typed so the
   import's own checks can report it. */
const NUMERIC_IMPORT_KEYS = new Set([
  "qty", "noOfCuts", "totalMtr", "purchaseRate", "discount", "finalPrice", "retailPrice", "disc1", "gst",
  "rsp", "rspOfferPct", "offerPrice", "wsp", "wspOfferPct", "wspPrice", "dp", "dpOfferPct", "dpPrice",
  "markupRSP", "markupWSP", "markupDP",
]);

function importNumber(value) {
  const text = String(value ?? "").trim();
  const cleaned = text.replace(/[,\s₹%]/g, "");
  return cleaned !== "" && Number.isFinite(Number(cleaned)) ? cleaned : text;
}

/* "1980" and "1980.00" are the same price - comparing them as text would
   count a reformatted cell as an edit. */
function sameValue(a, b) {
  const x = String(a ?? "").trim();
  const y = String(b ?? "").trim();
  if (x === y) return true;
  return x !== "" && y !== "" && Number.isFinite(Number(x)) && Number.isFinite(Number(y)) && Number(x) === Number(y);
}

/* What one imported sheet row does to the grid row it matched - or to a blank
   row when it is new. The sheet's values win; then every value the grid holds
   twice, or derives, is brought back in line, because the save reads the
   OTHER copy:

     - purRate / finalNet / encodedPurRate are the stored names of
       purchaseRate / finalPrice / encodedPurchaseRate. A row loaded from the
       database carries both and the save prefers the stored one, so an edited
       Purchase Rate or Final Price was saved as its old value.
     - RSP is stored as retailPrice, WSP and E-COMM as their offer prices
       (wspPrice, dpPrice); rsp / wsp / dp themselves are never saved, so an
       edit to the RSP, WSP or E-COMM column vanished on save. Each pair is
       now one value: the RSP / WSP / E-COMM column wins when filled (the
       offer % applied to WSP / E-COMM), and its duplicate column is used only
       when it is empty. The rule reads the sheet alone, never the grid - an
       operator edits one column of a pair and leaves the other as exported,
       and comparing against the grid treated that stale copy as a fresh edit
       on the next import of the same sheet, undoing the change.
     - a changed Purchase Rate is re-encoded, so the label never prints the
       old cost code beside the new cost.
     - P-M-F falls back to the Attribute Add On, as it does for a saved row. */
function mergeImportedRow(existing, importedRow, { id, barcodeNo, rateCodeMapping, onOverride = () => {} }) {
  const next = {
    ...(existing || emptyRow(id)),
    ...importedRow,
    id,
    barcodeNo,
    customFields: { ...(existing?.customFields || {}), ...(importedRow.customFields || {}) },
  };
  const provided = (key) => key in importedRow && String(importedRow[key] ?? "").trim() !== "";
  const edited = (key) => key in importedRow && !sameValue(importedRow[key], existing?.[key]);

  if (provided("rsp")) {
    if (provided("retailPrice") && !sameValue(importedRow.rsp, importedRow.retailPrice)) onOverride("Retail Price");
    next.retailPrice = next.rsp;
  } else if (provided("retailPrice")) {
    next.rsp = next.retailPrice;
  }

  [["wsp", "wspPrice", "wspOfferPct", "WSP Offer Price"], ["dp", "dpPrice", "dpOfferPct", "E-COMM Offer Price"]].forEach(([base, stored, pctKey, storedLabel]) => {
    const pct = Number(next[pctKey]);
    if (provided(base)) {
      const baseValue = Number(next[base]);
      const offer = pct > 0 && Number.isFinite(baseValue) ? fixed2(baseValue * (1 - pct / 100)) : next[base];
      if (provided(stored) && !sameValue(importedRow[stored], offer)) onOverride(storedLabel);
      next[stored] = offer;
    } else if (provided(stored) && !(pct > 0)) {
      next[base] = next[stored];
    }
  });

  next.purRate = next.purchaseRate;
  next.finalNet = next.finalPrice;
  if (!existing || edited("purchaseRate")) {
    next.encodedPurchaseRate = encodeRate(String(next.purchaseRate ?? ""), rateCodeMapping);
  }
  next.encodedPurRate = next.encodedPurchaseRate;

  if (!String(next.p_m_f || "").trim() && next.goodsType === "P-M-F") next.p_m_f = "P-M-F";
  return next;
}

function pmfMissingMessage(rows) {
  const names = rows.map((row) => row.barcodeNo || row.itemCode || row.itemName).filter(Boolean);
  const shown = names.slice(0, 8).join(", ") + (names.length > 8 ? ` and ${names.length - 8} more` : "");
  return `P-M-F is required on every row and is empty on ${rows.length} (${shown}). ` +
    `Export Excel, fill the P-M-F column, then Import Excel and Submit again.`;
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
    discount: "0",
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

   ONE value, two windows. Both call sites pass form.serialNo, so row 3 always
   shows whatever row 2 holds; there is no second serial and no second state.
   The difference between them is only who may write it:

     row 2  editable  - this is where the number is entered
     row 3  locked    - a read-back of the same value, beside HSN

   readOnly rather than disabled for the locked one: a disabled input is left
   out of form submission in plain HTML, and although this form reads from React
   state rather than the DOM, readOnly keeps the two consistent. The handlers
   below close what readOnly leaves open - a caret keystroke in a clicked box, a
   drop, a scroll - while Tab and Ctrl/Cmd still work, so focus can leave and
   the value can still be copied.

   Digits only on the editable one. Stripping the rest on the way in is what
   makes "positive whole number" true by construction: a minus sign, a decimal
   point or a pasted "12abc" never reach state. Empty IS allowed while typing;
   submit() rejects a blank one. */
function SerialNoField({ value, onChange, editableClass, readOnlyClass, locked = false }) {
  const lockedProps = {
    readOnly: true,
    tabIndex: -1,
    "aria-readonly": "true",
    title: "Shows the Serial No. entered above",
    onKeyDown: (event) => { if (event.key !== "Tab" && !event.ctrlKey && !event.metaKey) event.preventDefault(); },
    onPaste: (event) => event.preventDefault(),
    onCut: (event) => event.preventDefault(),
    onDrop: (event) => event.preventDefault(),
  };

  return (
    <div className="max-w-[110px] space-y-1 xl:max-w-none">
      <label className="block text-[11px] font-semibold text-gray-700">Serial No. *</label>
      <div className="relative">
        <input
          value={value ?? ""}
          inputMode="numeric"
          aria-label="Serial No."
          placeholder="1"
          {...(locked ? lockedProps : { onChange: (event) => onChange(event.target.value) })}
          onWheel={(event) => event.currentTarget.blur()}
          className={`w-full rounded-md px-2 py-2 text-sm ${locked ? `cursor-not-allowed pr-7 ${readOnlyClass}` : editableClass}`}
        />
        {locked && (
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
        )}
      </div>
    </div>
  );
}

function AddItemModal({ open, onClose, onSubmit, onSubmitAndPrint, rowCount = 0, barcodeFormat, reserveNumbers, business = "", markupDefaults = {}, rateCodeMapping = null }) {
  const createBlankForm = (overrides = {}) => ({
    oldBarcode: "",
    itemCode: "",
    itemName: "",
    itemId: "",
    itemLabel: "",
    hsnId: "",
    hsn: "",
    gst: "0",
    goodsType: "",
    sm: "",
    p_m_f: "",
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
    discount: "0",
    finalPrice: "0.00",
    markupRSP: markupDefaults.rsp ?? 100,
    rspPrice: "0.00",
    markupWSP: markupDefaults.wsp ?? 15,
    wspPrice: "0.00",
    markupDP: markupDefaults.dp ?? 15,
    dpPrice: "0.00",
    rspOfferPct: 0,
    rspOfferPrice: "0.00",
    wspOfferPct: 0,
    wspOfferPrice: "0.00",
    dpOfferPct: 0,
    dpOfferPrice: "0.00",
    offerApplicable: false,
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
  /* The selected HSN's tax slabs, rates already resolved. GST% is derived from
     these rather than stored once, because a price-banded HSN answers
     differently as the row's value moves - see the effect below. */
  const [hsnSlabs, setHsnSlabs] = useState([]);
  /* What that effect last wrote into GST%. Anything else in the box is the
     operator's own figure and is left alone; null means the HSN just changed,
     so the next auto-fill overrides whatever is there. */
  const autoGstRef = useRef(null);
  /* picking a second HSN while the first is still loading must not let the
     first one's slabs land on top - same guard the item detail read uses */
  const hsnDetailRef = useRef(0);
  const itemTimerRef = useRef(null);
  const hsnTimerRef = useRef(null);
  const itemDetailRef = useRef(0);
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

  /* The real Purchase Rate written through the active Purchase Rate Code
     Master. Derived, never stored in form state and never written back into
     form.purchaseRate - the typed number has to stay exactly as entered.
     Empty string while the master is unconfigured or still loading, which is
     what hides the read-only echo under the input. */
  const encodedPurchaseRate = useMemo(
    () => encodeRate(form.purchaseRate, rateCodeMapping),
    [form.purchaseRate, rateCodeMapping]
  );

  /* GST% <- the HSN's Tax Slabs.

     A single-slab HSN is one flat rate. A price-banded HSN answers by value,
     so the rate is re-derived whenever the row's value moves rather than being
     frozen at the moment the HSN was picked - edit the purchase rate or the
     discount and a row can cross a slab boundary. Final Price is the value
     matched against the bands, falling back to Purchase Rate before any
     discount has been worked out.

     The field stays editable throughout: once the operator types over the
     auto-filled rate, form.gst no longer matches what this effect last wrote
     and their figure is left standing until a different HSN is chosen. */
  useEffect(() => {
    if (!hsnSlabs.length) return;

    const amount = Number(form.finalPrice) || Number(form.purchaseRate) || 0;
    const next = String(gstPercentForAmount(hsnSlabs, amount) || 0);

    if (autoGstRef.current !== null && form.gst !== autoGstRef.current) return;
    autoGstRef.current = next;
    if (form.gst !== next) setForm((current) => ({ ...current, gst: next }));
  }, [hsnSlabs, form.finalPrice, form.purchaseRate, form.gst]);

  if (!open) return null;

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  /* Both Serial No. boxes come through here, which is why they stay in step.
     See SerialNoField for why the digits are stripped rather than validated. */
  const updateSerialNo = (raw) => updateField("serialNo", String(raw ?? "").replace(/\D/g, ""));

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

  /* Hands the form a new slab table. A fresh HSN overrides whatever GST% holds
     - including a hand-typed figure, which belonged to the HSN that was there
     before - so the override guard is cleared with it. An HSN with no slabs at
     all leaves GST% at 0 and editable rather than blocking the operator. */
  const applyHsnSlabs = (slabs) => {
    autoGstRef.current = null;
    setHsnSlabs(slabs);
    if (!slabs.length) setForm((current) => ({ ...current, gst: "0" }));
  };

  /* HSN picked -> its Tax Slabs from HSN Master. The search dropdown already
     carries them, so the extra read only runs for an HSN that arrived without
     one (a code typed in, or a stale option). Which slab applies is settled by
     the effect below, not here, because that answer depends on the price. */
  const resolveHsnGst = async (hsnDoc) => {
    const detailRequest = hsnDetailRef.current + 1;
    hsnDetailRef.current = detailRequest;

    const code = hsnDoc?.code || hsnDoc?.label || "";
    let taxSlabs = Array.isArray(hsnDoc?.taxSlabs) ? hsnDoc.taxSlabs : [];

    if (!taxSlabs.length && code) {
      try {
        const response = await fetch(`/api/hsn?perPage=20&search=${encodeURIComponent(code)}`);
        const payload = await response.json();
        const match = (payload.rows || []).find((row) => String(row.code || '').trim() === String(code).trim());
        taxSlabs = Array.isArray(match?.taxSlabs) ? match.taxSlabs : [];
      } catch {
        taxSlabs = [];
      }
    }

    if (hsnDetailRef.current !== detailRequest) return;

    setForm((current) => ({ ...current, hsn: code, hsnId: hsnDoc?.value || current.hsnId }));

    const slabs = await resolveSlabRates(taxSlabs);
    if (hsnDetailRef.current !== detailRequest) return;
    applyHsnSlabs(slabs);
  };

  /* Clears everything the previous Old Barcode put on the form, so barcode B
     can never inherit barcode A's item, HSN or GST. */
  const clearFetchedItem = () => {
    resolvedRef.current = "";
    hsnDetailRef.current += 1;
    applyHsnSlabs([]);
    setForm((current) => ({
      ...current,
      itemId: "", itemCode: "", itemName: "", itemLabel: "",
      hsnId: "", hsn: "", gst: "0",
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
    hsnDetailRef.current += 1;
    if (!opt) {
      itemDetailRef.current += 1;
      setItemLabel('');
      applyHsnSlabs([]);
      setForm((current) => ({
        ...current,
        itemId: "", itemName: "", itemCode: "", subGroupName: "", groupName: "", printDescription: "",
        hsnId: "", hsn: "", gst: "0",
        markupRSP: markupDefaults.rsp ?? "", markupWSP: markupDefaults.wsp ?? "", markupDP: markupDefaults.dp ?? "",
      }));
      return;
    }
    const detailRequest = itemDetailRef.current + 1;
    itemDetailRef.current = detailRequest;
    const itemCode = opt.itemCode || opt.primaryLabel || "";
    const itemName = opt.name || opt.secondaryLabel || "";
    setItemLabel(itemCode);
    applyHsnSlabs([]);
    setForm((current) => ({
      ...current,
      itemId: opt.value,
      itemCode,
      itemName,
      printDescription: opt.description || "",
      hsnId: "",
      hsn: "",
      gst: "0",
      markupRSP: markupDefaults.rsp ?? "",
      markupWSP: markupDefaults.wsp ?? "",
      markupDP: markupDefaults.dp ?? "",
    }));
    try {
      const response = await fetch(`/api/item/${encodeURIComponent(opt.value)}/detail`);
      const payload = await response.json();
      if (!response.ok || itemDetailRef.current !== detailRequest) return;
      const item = payload?.item || {};
      setHsnLabel(item.hsnCode || '');
      /* the detail route resolves the item's HSN slabs for us - bands and
         rates both - so the rate is picked by value here exactly as it is
         when the HSN is chosen by hand */
      applyHsnSlabs(Array.isArray(item.slabs) ? item.slabs : []);
      setForm((current) => ({
        ...current,
        hsnId: item.hsnId || "",
        hsn: item.hsnCode || "",
        markupRSP: item.markupRSP == null ? (markupDefaults.rsp ?? "") : fixed2(item.markupRSP),
        markupWSP: item.markupWSP == null ? (markupDefaults.wsp ?? "") : fixed2(item.markupWSP),
        markupDP: item.markupDP == null ? (markupDefaults.dp ?? "") : fixed2(item.markupDP),
      }));
    } catch {
      if (itemDetailRef.current === detailRequest) setHsnLabel('');
    }
    await resolveProductGroup(opt.subGroupId || "");
  };

  const handleHsnSelection = async (opt) => {
    if (!opt) {
      hsnDetailRef.current += 1;
      setHsnLabel('');
      applyHsnSlabs([]);
      setForm((current) => ({ ...current, hsnId: "", hsn: "", gst: "0" }));
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

     Deliberately scoped to these two fields only - Markup WSP %, Markup E-COMM %,
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
        next.markupRSP = netPrice > 0 ? fixed2(((price / netPrice) - 1) * 100) : '0.00';
        next.rspOfferPrice = (price * (1 - Number(current.rspOfferPct || 0) / 100)).toFixed(2);
      }
      if (key === "markupWSP") {
        const pct = Number(value || 0);
        next.wspPrice = (netPrice * (1 + pct / 100)).toFixed(2);
        next.wspOfferPrice = (Number(next.wspPrice) * (1 - Number(current.wspOfferPct || 0) / 100)).toFixed(2);
      }
      if (key === "wspPrice") {
        const price = Number(value || 0);
        next.markupWSP = netPrice > 0 ? fixed2(((price / netPrice) - 1) * 100) : '0.00';
        next.wspOfferPrice = (price * (1 - Number(current.wspOfferPct || 0) / 100)).toFixed(2);
      }
      if (key === "markupDP") {
        const pct = Number(value || 0);
        next.dpPrice = (netPrice * (1 + pct / 100)).toFixed(2);
        next.dpOfferPrice = (Number(next.dpPrice) * (1 - Number(current.dpOfferPct || 0) / 100)).toFixed(2);
      }
      if (key === "dpPrice") {
        const price = Number(value || 0);
        next.markupDP = netPrice > 0 ? fixed2(((price / netPrice) - 1) * 100) : '0.00';
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
        next.rspOfferPct = rspBase > 0 ? fixed2(((rspBase - offerPrice) / rspBase) * 100) : '0.00';
      }
      if (key === "wspOfferPct") {
        const pct = Number(value || 0);
        next.wspOfferPrice = (wspBase * (1 - pct / 100)).toFixed(2);
      }
      if (key === "wspOfferPrice") {
        const offerPrice = Number(value || 0);
        next.wspOfferPct = wspBase > 0 ? fixed2(((wspBase - offerPrice) / wspBase) * 100) : '0.00';
      }
      if (key === "dpOfferPct") {
        const pct = Number(value || 0);
        next.dpOfferPrice = (dpBase * (1 - pct / 100)).toFixed(2);
      }
      if (key === "dpOfferPrice") {
        const offerPrice = Number(value || 0);
        next.dpOfferPct = dpBase > 0 ? fixed2(((dpBase - offerPrice) / dpBase) * 100) : '0.00';
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
    /* the field only ever holds digits, so "not a number" cannot get here -
       what is left to check is that it is present and not zero */
    const serialEntered = String(form.serialNo ?? "").trim();
    if (!serialEntered) {
      setReserveError("Serial No. is required.");
      return;
    }
    if (Number(serialEntered) < 1) {
      setReserveError("Serial No. must be 1 or more.");
      return;
    }
    if (!form.itemName?.trim()) {
      setReserveError("Please select an Item Code.");
      return;
    }
    if (!form.p_m_f?.trim()) {
      setReserveError("P-M-F is required.");
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
        sm: form.sm,
        p_m_f: form.p_m_f,
        hsn: form.hsn,
        gst: form.gst,
        uom: form.isMtr ? "MTR" : "PC",
        qty: String(planItem.qty || 0),
        noOfCuts: form.isMtr ? String(cutRows.length || Number(form.noOfCuts || 1)) : "",
        totalMtr: form.isMtr ? String(form.totalMtr || 0) : "",
        purchaseRate: String(purchaseRateValue),
        /* Encoded from the SAME value on the line above, so the two can never
           disagree. Kept as a separate key - purchaseRate stays the real
           number, and the server copies both across (buildDocs is a
           whitelist). '' when no Purchase Rate Code Master is configured. */
        encodedPurchaseRate: encodeRate(String(purchaseRateValue), rateCodeMapping),
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
        offerPrice: form.offerApplicable ? String(form.rspOfferPrice || form.rspPrice || 0) : '',
        wspPrice: form.offerApplicable ? String(form.wspOfferPrice || form.wspPrice || 0) : '',
        dpPrice: form.offerApplicable ? String(form.dpOfferPrice || form.dpPrice || 0) : '',
        rspOfferPct: form.offerApplicable ? form.rspOfferPct : '',
        wspOfferPct: form.offerApplicable ? form.wspOfferPct : '',
        dpOfferPct: form.offerApplicable ? form.dpOfferPct : '',
        markupRSP: form.markupRSP,
        markupWSP: form.markupWSP,
        markupDP: form.markupDP,
      }));
    });

    if (printAfterSubmit && onSubmitAndPrint) await onSubmitAndPrint(generatedRows);
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
      sm: current.sm,
      p_m_f: current.p_m_f,
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
      offerApplicable: current.offerApplicable,
      serialNo: nextSerial,
    }));
    setCutRows([{ id: 1, value: "" }]);
    onClose();
  };

  return (
    <div className="mt-4 w-full rounded-[8px] border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4">
          {/* ROW 1: Old Barcode | Item Code | HSN | GST% | SM | P-M-F.

              Four tracks for five fields: HSN and GST% share the third cell.
              GST% is normally not typed - it is derived from whichever HSN is
              picked and the row's value - so sitting them side by side is how
              the operator checks the pick landed. It stays editable for the
              transaction that needs a different rate. They are two separate
              controls; the grouping is only the cell they share.

              Explicit widths rather than equal quarters: GST% holds two digits
              and the two add-on inputs share the final track. The two-column
              md: stage exists because the sidebar is a
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
                {/* decimal2 keeps this to a number the rate can actually be -
                    a GST rate is a positive percentage, never a minus sign or
                    a second decimal point */}
                <input
                  value={form.gst}
                  inputMode="decimal"
                  title="Filled from the HSN's tax slab - edit to override for this row"
                  onChange={(event) => updateField("gst", decimal2(event.target.value))}
                  className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">SM(Number)</label>
                <input type="number" step="1" min={0} value={form.sm} onChange={(event) => updateField("sm", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">P-M-F *</label>
                <input value={form.p_m_f} onChange={(event) => updateField("p_m_f", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
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
            <SerialNoField value={form.serialNo} onChange={updateSerialNo} editableClass={editableClass} />

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
            <SerialNoField value={form.serialNo} readOnlyClass={readOnlyClass} locked />

            {renderHsnField()}

            <div className="flex items-end gap-0">
              <label className="flex w-fit cursor-pointer items-center justify-start gap-3 whitespace-nowrap rounded-md border border-[#dfe4eb] bg-white px-3 py-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.uniqueBarcode} onChange={(event) => updateField("uniqueBarcode", event.target.checked)} className="h-4 w-4 accent-[#0d5ddc]" /> Unique Barcode
              </label>
              <label className="flex w-fit cursor-pointer items-center justify-start gap-3 whitespace-nowrap rounded-md border border-[#dfe4eb] bg-white px-3 py-2 text-sm text-gray-700">
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
              <label className="flex w-fit cursor-pointer items-center justify-start gap-3 whitespace-nowrap rounded-md border border-[#dfe4eb] bg-white px-3 py-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.offerApplicable} onChange={(event) => updateField("offerApplicable", event.target.checked)} className="h-4 w-4 accent-[#0d5ddc]" /> OFFER APPLICABLE
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
                  <input type="text" inputMode="decimal" value={form.qty} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateField("qty", decimal2(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
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
                <input type="text" inputMode="decimal" value={form.purchaseRate} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateField("purchaseRate", decimal2(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
                {/* Read-only echo of the SAME value through the Purchase Rate
                    Code Master. The input above keeps the real number - this
                    is only what a label would print. Hidden entirely when no
                    mapping is configured, rather than showing a half-encoded
                    string. */}
                {encodedPurchaseRate && (
                  <div className="mt-1 text-[10px] text-gray-500">
                    Encoded: <span className="font-mono font-semibold text-gray-700">{encodedPurchaseRate}</span>
                  </div>
                )}
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
                <input type="text" inputMode="decimal" value={form.discount} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateField("discount", decimal2(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
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
                <input type="text" inputMode="decimal" value={form.markupRSP} onChange={(event) => updateMarkupValue("markupRSP", decimal2(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">RSP Price *</label>
                <input type="text" inputMode="decimal" value={form.rspPrice} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateMarkupValue("rspPrice", decimal2(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">Markup WSP % *</label>
                <input type="text" inputMode="decimal" value={form.markupWSP} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateMarkupValue("markupWSP", decimal2(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">WSP Price *</label>
                <input type="text" inputMode="decimal" value={form.wspPrice} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateMarkupValue("wspPrice", decimal2(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">Markup E-COMM % *</label>
                <input type="text" inputMode="decimal" value={form.markupDP} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateMarkupValue("markupDP", decimal2(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">E-COMM Price *</label>
                <input type="text" inputMode="decimal" value={form.dpPrice} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateMarkupValue("dpPrice", decimal2(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
            </div>

            <div className="mt-5 text-center text-[15px] font-bold uppercase tracking-wide underline decoration-[1.5px] underline-offset-4">Offer Price /Mark Down</div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">RSP Offer %</label>
                <input disabled={!form.offerApplicable} type="text" inputMode="decimal" value={form.rspOfferPct} onChange={(event) => updateOfferValue("rspOfferPct", decimal2(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${form.offerApplicable ? editableClass : readOnlyClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">RSP Offer Price</label>
                <input disabled={!form.offerApplicable} type="text" inputMode="decimal" value={form.rspOfferPrice} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateOfferValue("rspOfferPrice", decimal2(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${form.offerApplicable ? editableClass : readOnlyClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">WSP Offer %</label>
                <input disabled={!form.offerApplicable} type="text" inputMode="decimal" value={form.wspOfferPct} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateOfferValue("wspOfferPct", decimal2(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${form.offerApplicable ? editableClass : readOnlyClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">WSP Offer Price</label>
                <input disabled={!form.offerApplicable} type="text" inputMode="decimal" value={form.wspOfferPrice} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateOfferValue("wspOfferPrice", decimal2(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${form.offerApplicable ? editableClass : readOnlyClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">E-COMM Offer %</label>
                <input disabled={!form.offerApplicable} type="text" inputMode="decimal" value={form.dpOfferPct} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateOfferValue("dpOfferPct", decimal2(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${form.offerApplicable ? editableClass : readOnlyClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">E-COMM Offer Price</label>
                <input disabled={!form.offerApplicable} type="text" inputMode="decimal" value={form.dpOfferPrice} onWheel={(e) => e.currentTarget.blur()} onChange={(event) => updateOfferValue("dpOfferPrice", decimal2(event.target.value))} className={`w-full rounded-md px-2 py-2 text-sm ${form.offerApplicable ? editableClass : readOnlyClass}`} />
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

/* ==========================================================================
   From a Barcode Generation row to a label.

   BarcodeLabelSheet is the one label implementation in this system - it is
   what the Inventory print screen puts on paper - and it reads a SAVED
   barcode row (the shape lib/barcodeLabel.js stores). The rows on this
   screen are the form's own shape, and the two disagree on four fields, so
   handing them over unmapped printed a label with no quantity, no cost and,
   on the Submit & Print path, nothing at all below the barcode:

     purRate / finalNet   the form calls these purchaseRate / finalPrice
     batchType            the form calls it mode, or uniqueBarcode "Yes"/"No"
     qtyNum               the form keeps qty as a string
     supplierName, grcNo  belong to the GRC header, never to a row

   Mapping here rather than changing either side keeps the saved data format
   and the label component exactly as they are.
   ========================================================================== */
function toLabelRow(row, copies, header) {
  /* Four fields answer "is this one barcode for one piece, or for the lot?",
     and they are consulted in order of how much they can be trusted:

       batchType / batchUnique   written by the save route - authoritative
       uniqueBarcode             the control the operator actually ticked
       mode                      derived, and last because emptyRow() seeds it
                                 "unique" while seeding uniqueBarcode "No" -
                                 reading it first stamps every imported batch
                                 row as unique

     Getting this backwards is not cosmetic. A batch row read as unique loses
     the quantity line - the one thing that distinguishes a 5-metre label from
     a 1-metre one - and a unique row read as batch prints a quantity that
     overstates what is on the hanger. */
  const declared = String(row.batchType || row.batchUnique || '').toLowerCase();
  const ticked = String(row.uniqueBarcode || '').toLowerCase();
  const isBatch = declared
    ? declared === 'batch'
    : ticked
      ? ticked !== 'yes'
      : String(row.mode || '').toLowerCase() === 'batch';

  return {
    ...row,
    copies,
    /* every price the label may show, under the name the label looks for */
    purRate: row.purRate || row.purchaseRate || '',
    finalNet: row.finalNet || row.finalPrice || '',
    retailPrice: row.retailPrice || row.rsp || '',
    batchType: isBatch ? 'batch' : 'unique',
    qtyNum: Number(row.qtyNum ?? row.qty ?? 0) || 0,
    serialNo: row.serialNo || row.billSlNo || '',
    supplierName: row.supplierName || header.supplierName || '',
    grcNo: row.grcNo || row.grcNumber || header.grcNumber || '',
  };
}

/* How many stickers a row starts out asking for.

   A sticker count is a WHOLE number of pieces of paper, and it is not the
   same thing as a quantity:

     PC   the quantity is a count of pieces, so one sticker each is the
          sensible opening offer - which is what this screen has always done
     MTR  the quantity is a length. A 12.65-metre cut is one cut and wants
          ONE label reading "12.65 MTR"; asking for 12.65 labels asks for
          something nobody can print.

   The fractional case was not merely untidy. The readiness check compares
   the number of labels asked for against the number actually drawn, and the
   sheet floors its copy count - so 12.65 could never equal 12, and Print
   would have been refused outright on every metre-based GRC. */
function defaultCopies(row) {
  const metres = /mtr|met/i.test(String(row.uom || row.uomType || ''));
  if (metres) return 1;
  const qty = Math.floor(Number(row.qty) || 0);
  return qty > 0 ? qty : 1;
}

/* The physical page for a run on sticker stock: the catalog's sheet size,
   widened if the labels on it do not actually fit.

   The seeded catalog is not self-consistent - 'RT 72 x 116 mm' declares a
   72mm sheet, a label size of "0 x 0 mm" and 2 labels per row. parseSize
   rejects the zero and substitutes 50x40, so two 50mm labels would be laid
   across a 72mm page and the second one would fall off the edge of the
   paper. Taking the wider of the two keeps every label on the sheet; a
   little extra margin is recoverable, a clipped barcode is not.

   Returns null when there is no usable sheet size at all, so the caller can
   fall back to A4 rather than emit a zero-sized page that prints nothing. */
function stockPageCss(format, labelW, labelH, perRow, gapMm) {
  const sheet = String(format?.pageSize || '').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (!sheet) return null;
  const sheetW = Number(sheet[1]);
  const sheetH = Number(sheet[2]);
  if (!sheetW || !sheetH) return null;

  const needW = labelW * perRow + gapMm * (perRow - 1);
  return Math.max(sheetW, needW) + 'mm ' + Math.max(sheetH, labelH) + 'mm';
}

function PrintLabelPicker({ rows, open, onClose, header = {} }) {
  const scope = useScope();
  const [selected, setSelected] = useState([]);
  const [copies, setCopies] = useState({});

  /* label geometry - the sticker stock this tenant actually buys */
  const [formats, setFormats] = useState([]);
  const [formatName, setFormatName] = useState('');
  const [paper, setPaper] = useState('a4');

  /* the print run: mounted -> measured -> dialog. See runPrint below. */
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState('');
  const printRootRef = useRef(null);
  /* how many labels this particular run was asked for - frozen at the click */
  const wantedRef = useRef(0);

  /* Seeded when the picker OPENS, and not again while it is open.

     `rows` is a fresh array on every parent render, and saving calls
     router.refresh() - so keying this on rows meant a refresh landing behind
     the open picker silently threw away whatever the operator had ticked and
     typed, and put the defaults back. */
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!open) { wasOpen.current = false; return; }
    if (wasOpen.current) return;
    wasOpen.current = true;

    const next = {};
    rows.forEach((row) => {
      if (row.barcodeNo) next[row.barcodeNo] = defaultCopies(row);
    });
    setCopies(next);
    setSelected(Object.keys(next));
  }, [open, rows]);

  /* Label formats, loaded the same way the Inventory print screen loads them
     (components/BarcodePrintLabel.jsx): the whole seeded catalog is offered,
     and the format ticked as Default in Settings -> Barcode Label Settings is
     preselected. This screen previously loaded NO geometry at all, so a label
     had no physical size to be printed at. */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      const qs = new URLSearchParams({
        business: scope.business || '',
        location: scope.location || '',
        finYear: scope.finYear || '',
      });
      const [chosen, catalog] = await Promise.all([
        fetch('/api/barcode-label-setting?' + qs).then((r) => r.json()).catch(() => ({})),
        fetch('/api/catalog?name=barcodeLabels').then((r) => r.json()).catch(() => ({})),
      ]);
      if (cancelled) return;

      const list = catalog.rows || [];
      setFormats(list);

      const ticked = ((chosen.doc && chosen.doc.rows) || []).filter((r) => r.choice);
      const preferred = ticked.find((t) => t.isDefault)?.name || ticked[0]?.name;
      setFormatName(list.some((c) => c.name === preferred) ? preferred : (list[0]?.name || ''));
    })();

    return () => { cancelled = true; };
  }, [open, scope.business, scope.location, scope.finYear]);

  const format = useMemo(
    () => formats.find((f) => f.name === formatName) || null,
    [formats, formatName]
  );

  const selectedRows = useMemo(
    () => rows
      .filter((row) => row.barcodeNo && selected.includes(row.barcodeNo))
      /* floored here as well as on input: the sheet expands by a whole
         number of copies, and the readiness check counts what the sheet
         produced. If these two ever disagreed, Print would refuse forever. */
      .map((row) => toLabelRow(row, Math.max(1, Math.floor(Number(copies[row.barcodeNo]) || 1)), header)),
    [rows, selected, copies, header]
  );

  /* what the printer is being asked for, counted from the same list the sheet
     is built from - this is the number the readiness check has to find drawn */
  const expectedLabels = useMemo(
    () => selectedRows.reduce((total, row) => total + (row.copies || 0), 0),
    [selectedRows]
  );

  /* Paper. A4 is the default because that is what a desktop printer and
     "Microsoft Print to PDF" are loaded with; the sticker-stock option sets
     the page to one physical sheet from the catalog, which is what a label
     printer feeds.

     On sticker stock the sheet IS the page, so a gutter between labels would
     push the last column off the edge of the paper - hence gap 0 there, and
     a 1mm cut line on a sheet of A4 that somebody has to guillotine. */
  const geometry = parseSize(format?.labelSize);
  const perRow = Math.max(1, Number(format?.stickerInRow) || 1);
  const onStock = paper === 'stock';
  const gapMm = onStock ? 0 : 1;
  const stockSize = stockPageCss(format, geometry.w, geometry.h, perRow, gapMm);

  const pageRule = onStock && stockSize
    ? '@page { size: ' + stockSize + '; margin: 0; }'
    : '@page { size: A4; margin: 5mm; }';
  const gap = gapMm + 'mm';

  /* ---------------------------------------------------------------- print --
     window.print() photographs the DOM as it stands at the instant it is
     called. It used to be called straight out of the click handler, before
     React had committed anything and before JsBarcode had drawn a single bar,
     so what went to the printer was whatever happened to be on screen.

     The run is therefore staged. `printing` mounts the sheet; the effect
     below waits for the browser to have actually finished with it, checks
     that every barcode it was asked for is really there, and only then opens
     the dialog. No timers: each await is a real signal from the browser. */
  useEffect(() => {
    if (!printing) return undefined;
    let cancelled = false;

    /* The class is what arms the print rules in globals.css. Gating them on it
       rather than on the mere existence of the sheet means every other print
       screen in the application - and this one at any other moment - keeps
       printing exactly the way it does today. Removed in the cleanup below,
       so there is no state to unwind by hand. */
    document.body.classList.add('printing-labels');

    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);

    (async () => {
      try {
        /* Fonts first. The code, the price and the description are text; print
           before the face has loaded and they are measured with fallback
           metrics and re-flow inside a fixed-size sticker. */
        if (document.fonts && document.fonts.ready) {
          try { await document.fonts.ready; } catch { /* unsupported - the frames below still gate on layout */ }
        }
        if (cancelled) return;

        /* Two frames. The first lets React's commit reach the screen, the
           second lets the browser lay out the SVG children JsBarcode appended
           synchronously during that commit. */
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (cancelled) return;

        const root = printRootRef.current;
        const drawn = root ? Array.from(root.querySelectorAll('svg[data-barcode]')) : [];
        const blank = drawn.filter((svg) => {
          const box = svg.getBoundingClientRect();
          return !svg.firstChild || box.width < 1 || box.height < 1;
        });

        const wanted = wantedRef.current;
        if (!root || drawn.length !== wanted || blank.length) {
          /* Refusing to open the dialog is the point. A run that is short a
             label, or carries an empty box where a barcode should be, produces
             stickers that cannot be scanned and goods that cannot be found -
             and the operator would have no way of knowing until the till. */
          setPrintError(
            'Printing stopped: ' + drawn.length + ' of ' + wanted +
            ' barcodes were drawn' + (blank.length ? ', ' + blank.length + ' of them empty' : '') +
            '. Nothing was sent to the printer.'
          );
          setPrinting(false);
          return;
        }

        setPrintError('');
        window.print();

        /* afterprint is the signal that the dialog is finished with, and in
           every current browser print() has already blocked until then. The
           frame below is the belt to that braces: it hands control back once
           more so a browser whose print() returns EARLY still has its
           afterprint delivered first, and the sheet is never pulled out from
           under a dialog that is still reading it. */
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (!cancelled) setPrinting(false);
      } catch (error) {
        /* Without this the run could end with `printing` stuck true - which
           leaves printing-labels welded to <body>, and every LATER print
           anywhere in the application comes out blank. */
        console.error('Barcode label print failed', error);
        setPrintError('Printing stopped: the label sheet could not be prepared. Nothing was sent to the printer.');
        setPrinting(false);
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('afterprint', done);
      document.body.classList.remove('printing-labels');
    };
    /* expectedLabels is deliberately NOT a dependency. It is read from a ref
       taken when Print was pressed, because the picker stays interactive
       behind the dialog: nudging a copy count mid-run would otherwise re-run
       this effect and open a SECOND print dialog for the same click. */
  }, [printing]);

  /* Closing the picker abandons the run. The component is not unmounted when
     it closes - it just renders null - so a run left in flight would keep the
     body class on and re-run the check against a sheet that is no longer
     there, reporting a failure nobody caused. */
  useEffect(() => {
    if (!open) {
      setPrinting(false);
      setPrintError('');
    }
  }, [open]);

  function runPrint() {
    setPrintError('');
    if (!expectedLabels) {
      setPrintError('Nothing is selected to print.');
      return;
    }
    wantedRef.current = expectedLabels;
    setPrinting(true);
  }

  if (!open) return null;

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
    /* no-print: the picker itself is never paper. An operator who reaches for
       Ctrl+P instead of the Print button would otherwise send this dialog -
       checkboxes, copy counts and all - to the printer. */
    <div className="no-print fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
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
                <input type="number" min={1} step={1} value={copies[row.barcodeNo] || 1} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => setCopies((prev) => ({ ...prev, [row.barcodeNo]: Math.max(1, Math.floor(Number(e.target.value) || 1)) }))} className="w-[90px] rounded border border-gray-300 px-2 py-1 text-sm" />
              </div>
            ))}
          </div>

          {/* The preview is the SAME component, with the SAME rows and the
              SAME geometry that the print sheet below is built from, so what
              is on screen and what comes out of the printer cannot drift
              apart. It used to be a hand-drawn card whose "barcode" was a
              striped CSS background - it encoded nothing, and being a
              background image Chrome would have dropped it from the paper
              even if the rest had worked. */}
          <div className="rounded border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-baseline justify-between text-sm font-semibold">
              <span>Preview</span>
              <span className="text-[11px] font-normal text-gray-500">
                {expectedLabels} label{expectedLabels === 1 ? '' : 's'}
                {format?.labelSize ? ' · ' + format.labelSize : ''}
              </span>
            </div>
            {selectedRows.length === 0 ? (
              <div className="rounded border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">Select a barcode to preview.</div>
            ) : (
              <div className="overflow-auto rounded border border-gray-300 bg-white p-2">
                <BarcodeLabelSheet rows={selectedRows} format={format} gap={gap} />
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
          {printError && (
            <span className="mr-auto text-sm font-medium text-red-700">{printError}</span>
          )}

          <label className="flex items-center gap-1 text-xs text-gray-600">
            Label
            <select
              value={formatName}
              onChange={(event) => setFormatName(event.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-xs"
            >
              {formats.length === 0 && <option value="">Default 50 x 40 mm</option>}
              {formats.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
          </label>

          <label className="flex items-center gap-1 text-xs text-gray-600">
            Paper
            <select
              value={paper}
              onChange={(event) => setPaper(event.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-xs"
            >
              <option value="a4">A4 sheet</option>
              <option value="stock" disabled={!stockSize}>
                {stockSize ? 'Label stock ' + format.pageSize : 'Label stock (no size set)'}
              </option>
            </select>
          </label>

          <button type="button" disabled={printing} onClick={runPrint} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-60">{printing ? 'Preparing...' : 'Print'}</button>
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700">Close</button>
        </div>
      </div>

      {/* THE PRINT SURFACE.

          Portaled to <body> so it is a sibling of the application rather than
          a descendant of this modal. That matters: the modal is
          `fixed inset-0` with a `max-h` scrolling body, and Chrome prints a
          fixed box on the first page only and clips an overflow box instead
          of paginating it - a sheet of labels left inside it would have come
          out as one truncated page however the CSS was written.

          At <body> level the sheet is ordinary in-flow content that fragments
          across as many pages as it needs, and the @media print rules in
          globals.css take the rest of the application out of the box tree so
          not one sheet of paper is spent on it. */}
      {printing && typeof document !== 'undefined' && createPortal(
        <div id="barcode-print-root" ref={printRootRef}>
          <style>{pageRule}</style>
          <BarcodeLabelSheet rows={selectedRows} format={format} gap={gap} />
        </div>,
        document.body
      )}
    </div>
  );
}

export default function GCRBarcodeGeneration({ grcId = null, initialRows = [], supplierMarkup = {}, grcHeader = {} }) {
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
      sm: row.sm || (row.goodsType === 'SM' ? 'SM' : ''),
      p_m_f: row.p_m_f || (row.goodsType === 'P-M-F' ? 'P-M-F' : ''),
      hsn: row.hsn || '',
      gst: row.gst || '',
      qty: row.qty || '',
      noOfCuts: row.noOfCuts || '',
      purchaseRate: row.purchaseRate || row.purRate || '',
      /* carried through on reload so re-saving an existing GRC does not blank
         the encoded value that was generated with it */
      encodedPurchaseRate: row.encodedPurchaseRate || row.encodedPurRate || '',
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

  /* The active Purchase Rate Code Master for this scope. Loaded once here and
     handed down, so the Add Item form never has to fetch it itself and every
     row generated in one session encodes against the same table. An absent or
     inactive record leaves the mapping empty, and encodeRate() then returns
     '' rather than inventing an alphabet. */
  const [rateCodeMapping, setRateCodeMapping] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams({
      business: scope.business || "",
      location: scope.location || "",
    });
    fetch("/api/purchase-rate-code?" + params)
      .then((response) => response.json())
      .then((result) => {
        const doc = result.doc;
        setRateCodeMapping(doc && doc.isActive !== false ? doc.digitMappings || {} : {});
      })
      .catch(() => setRateCodeMapping({}));
  }, [scope.business, scope.location]);

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
    /* cleared at once, so picking the same file again after editing it still
       fires onChange - a browser does not re-report an unchanged selection */
    event.target.value = "";
    if (!file) return;

    try {
      const importedRows = await readExcelFile(file);
      if (importedRows.length === 0) throw new Error("No item rows were found in the Excel file.");

      /* ---- match every sheet row to the grid row it edits --------------
         A row with a Barcode No matches the grid row carrying that barcode
         and nothing else; a row without one matches on Item Code + Serial No.
         A match is UPDATED in place and anything else is added, so importing
         the same sheet again edits rows instead of duplicating them. Matching
         comes before validation so each row is checked as it will end up - a
         sheet carrying only Barcode No and the changed prices is a valid edit. */
      const currentByKey = new Map();
      rows.forEach((row) => {
        [rowMatchKey(row), rowItemKey(row)].filter(Boolean).forEach((key) => currentByKey.set(key, row));
      });

      const problems = [];
      const lineByKey = new Map();
      const planned = [];
      importedRows.forEach((importedRow, index) => {
        const line = index + 2;                   // +1 for the header, +1 for 1-based
        const matchKey = rowMatchKey(importedRow) || `new:${index}`;
        if (lineByKey.has(matchKey)) {
          /* the second copy used to be skipped without a word, so an edit on
             the lower row silently did nothing */
          if (matchKey.startsWith("barcode:")) {
            problems.push(`Row ${line}: Barcode No ${importedRow.barcodeNo} is also on row ${lineByKey.get(matchKey)}`);
          }
          return;
        }
        lineByKey.set(matchKey, line);
        planned.push({ importedRow, index, line, existing: currentByKey.get(matchKey) });
      });

      /* ---- validate BEFORE anything is written -------------------------
         An import that is half applied leaves the grid in a state nobody can
         reason about, and if it is then saved it puts wrong stock into the
         system. Every row is checked first and the whole file is rejected
         with the offending row numbers if any of them fail. */
      const priceKeys = ["purchaseRate", "finalPrice", "retailPrice", "rsp", "offerPrice", "wsp", "wspPrice", "dp", "dpPrice"];
      planned.forEach(({ importedRow, line, existing }) => {
        const row = { ...(existing || {}), ...importedRow };
        const name = String(row.itemName || row.itemCode || "").trim();
        if (!name) problems.push(`Row ${line}: item code or name is required`);

        const qty = Number(row.qty ?? row.totalMtr ?? 0);
        if (!Number.isFinite(qty) || qty <= 0) problems.push(`Row ${line}: quantity must be a positive number`);

        const isMtr = meterRegex.test(String(row.uom || ""));
        const unique = String(row.uniqueBarcode || "").trim().toLowerCase() === "yes";
        if (!isMtr && unique && !Number.isInteger(qty)) {
          problems.push(`Row ${line}: a unique piece quantity must be a whole number (got ${qty})`);
        }

        priceKeys.forEach((key) => {
          const value = importedRow[key];
          if (value !== undefined && value !== "" && !Number.isFinite(Number(value))) {
            problems.push(`Row ${line}: ${exportFieldLabels[key] || key} is not a number ("${value}")`);
          }
        });
      });

      if (problems.length) {
        const shown = problems.slice(0, 12).join(" · ");
        throw new Error(
          `The file was not imported - ${problems.length} problem${problems.length === 1 ? "" : "s"} found. ` +
          shown +
          (problems.length > 12 ? ` ...and ${problems.length - 12} more` : "")
        );
      }

      /* ---- number the NEW rows: reserve exactly that many from the server
         in one call. Imported rows are numbered the same way scanned ones
         are - never from a browser-held counter. */
      const needing = planned.filter((p) => !p.existing?.barcodeNo && !p.importedRow.barcodeNo).length;
      const issued = needing ? await reserveBarcodeNumbers(needing) : [];
      let nextNumber = 0;

      const updatedById = new Map();
      const addedRows = [];
      const overridden = {};                      // duplicate price column -> rows where it lost
      const onOverride = (label) => { overridden[label] = (overridden[label] || 0) + 1; };
      planned.forEach(({ importedRow, index, existing }) => {
        const id = existing?.id || `import-${Date.now()}-${index}`;
        const barcodeNo = existing?.barcodeNo || importedRow.barcodeNo || issued[nextNumber++];
        const merged = mergeImportedRow(existing, importedRow, { id, barcodeNo, rateCodeMapping, onOverride });
        if (existing) updatedById.set(existing.id, merged);
        else addedRows.push(merged);
      });

      /* an updated row is swapped in by id, so it keeps its place in the grid */
      const applyImport = (list) => list.map((row) => updatedById.get(row.id) || row).concat(addedRows);
      setRows(applyImport);

      const stillMissing = applyImport(rows).filter(
        (row) => String(row.itemCode || row.itemName || "").trim() && !String(row.p_m_f || "").trim()
      );
      const overrideNote = Object.entries(overridden)
        .map(([label, n]) => `${label} on ${n} row${n === 1 ? "" : "s"}`).join(", ");
      setImportMessage(
        `${planned.length} row${planned.length === 1 ? "" : "s"} imported: ${updatedById.size} updated, ${addedRows.length} added.` +
        (overrideNote ? ` RSP / WSP / E-COMM take priority over their duplicate columns, so the differing ${overrideNote} was not used.` : "") +
        (stillMissing.length ? ` Before you Submit: ${pmfMissingMessage(stillMissing)}` : "")
      );
    } catch (error) {
      setImportMessage(error.message || "Unable to import the Excel file.");
    }
  }

  async function saveRows(rowsToSave = validRows, printAfterSave = false) {
    /* The server refuses the whole save when any row has no P-M-F, and every
       row of the GRC is re-sent - so one older unit without it blocked every
       save. Checked here first, naming the rows, so the operator knows what
       to fill instead of seeing a bare "required for all rows". */
    const missingPmf = rowsToSave.filter((row) => !String(row.p_m_f || "").trim());
    if (missingPmf.length) {
      setShowSaveConfirm(false);
      setSaveError(pmfMissingMessage(missingPmf));
      return false;
    }
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
        /* a refusal is an answer, not a crash: shown in the banner rather
           than thrown into console.error, which Next's dev overlay reports
           as a runtime error */
        const data = await response.json().catch(() => ({}));
        setShowSaveConfirm(false);
        setSaveError(data.error || `Save failed (HTTP ${response.status})`);
        return false;
      }
      setShowSaveConfirm(false);
      if (printAfterSave) setShowPrint(true);
      router.refresh?.();
      return true;
    } catch (error) {
      console.error(error);
      /* the confirm dialog sits over the banner, so it has to go or the
         operator never sees why the save was refused */
      setShowSaveConfirm(false);
      setSaveError(error.message || "Save failed");
      return false;
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
        markupDefaults={supplierMarkup}
        rateCodeMapping={rateCodeMapping}
        onClose={() => setShowAddItem(true)}
        onSubmit={(items) => appendRows(items)}
        onSubmitAndPrint={(items) => {
          const nextRows = [...rows, ...items];
          setRows(nextRows);
          setPrintRows(nextRows);
          return saveRows(nextRows, true);
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
            <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv,.html" onChange={importRowsFromExcel} className="hidden" />
            <button type="button" onClick={() => importInputRef.current?.click()} className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50" title="Import edited Excel template">
              <Icon name="file" size={14} /> Import Excel
            </button>
            <button type="button" onClick={exportRowsToExcel} disabled={validRows.length === 0} className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50" title="Export all item fields to Excel">
              <Icon name="file" size={14} /> Export Excel
            </button>
            {/* The picker could only ever be reached by adding another item
                and pressing Submit & Print Label. Re-opening a GRC to reprint
                a damaged sticker - the ordinary reason to come back to this
                screen - meant generating a barcode nobody wanted. */}
            <button type="button" onClick={() => { setPrintRows([]); setShowPrint(true); }} disabled={validRows.filter((row) => row.barcodeNo).length === 0} className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50" title="Print labels for the barcodes on this GRC">
              <Icon name="printer" size={14} /> Print Labels
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
                  <th className="border border-gray-300 px-2 py-2">E-COMM</th>
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

      {/* The supplier and the GRC number live on the GRC header, never on a
          barcode row, so they are handed down here. Without them the label's
          provenance line prints blank - and the label is the only thing that
          travels with the goods. */}
      <PrintLabelPicker rows={printRows.length ? printRows : validRows} open={showPrint} header={grcHeader} onClose={() => { setShowPrint(false); setPrintRows([]); }} />

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
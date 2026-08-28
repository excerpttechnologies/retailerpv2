"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ModalForm from "./ModalForm";
import { useScope } from "./ScopeContext";
import { useOptions } from "./useOptions";
import { FIELDS as ITEM_FIELDS } from "@/app/admin/inventory/item/fields";
import { computeSampleBarcode } from "@/lib/barcodeFormat";

/**
 * GCRBarcodeGeneration.jsx
 * -----------------------------------------------------------------------
 * Static, front-end-only Excel-style data entry grid for GRC barcode
 * generation. No backend calls yet — all data (item master, calculations,
 * barcode numbers) is mocked/computed on the client so the page can be
 * wired to real APIs later.
 *
 * KEY ASSUMPTIONS (flagged here so they're easy to find & change later):
 * 1. WSP / DP / FMA formulas below are PLACEHOLDERS (simple markups on
 *    Final NET). Swap `computeCalculated()` with real business rules
 *    once available.
 * 2. UOM -> mode default: "Mtr" => BATCH, everything else => UNIQUE.
 *    User can still override the Batch/Unique dropdown per row.
 * 3. In UNIQUE mode, editing a field on the LEADER row (the first row of
 *    a duplicated group) copies that value to every duplicate row in the
 *    group. PUR RATE is the exception — it is treated as the TOTAL for
 *    the whole quantity and split evenly across the group. Editing a
 *    field directly on a duplicate row only changes that row.
 * 4. In BATCH mode, QTY is never duplicated — one row = one barcode for
 *    the whole quantity.
 * 5. Row auto-extension (+40 rows) fires when the grid is scrolled near
 *    the bottom, and is also available via a manual "+ 40 Rows" button.
 * -----------------------------------------------------------------------
 */

// ---------------------------------------------------------------------
// Mock item master — stand-in for a real item lookup API
// ---------------------------------------------------------------------
const ITEM_MASTER = {
  "SK-10": {
    description: "PREMIUM COTTON SAREE",
    uom: "PC",
    hsn: "5407",
    gst: 5,
    disc: 5,
    printDescription: "COTTON SAREE PREM",
    retailPrice: 1499,
  },
  "SK-11": {
    description: "SILK ZARI BORDER FABRIC",
    uom: "Mtr",
    hsn: "5007",
    gst: 12,
    disc: 8,
    printDescription: "SILK ZARI FABRIC",
    retailPrice: 399,
  },
  "SK-12": {
    description: "DESIGNER BLOUSE PIECE",
    uom: "PC",
    hsn: "6211",
    gst: 5,
    disc: 10,
    printDescription: "DESIGNER BLOUSE",
    retailPrice: 349,
  },
  "SK-13": {
    description: "KANJIVARAM SILK FABRIC",
    uom: "Mtr",
    hsn: "5007",
    gst: 12,
    disc: 6,
    printDescription: "KANJIVARAM SILK",
    retailPrice: 899,
  },
};

// ---------------------------------------------------------------------
// Column layout (single source of truth for widths so header + body
// always line up, via <colgroup>)
// ---------------------------------------------------------------------
const COLUMNS = [
  { key: "rowNum", label: "#", width: 46 },
  { key: "oldBarcode", label: "Old Barcode", width: 120 },
  { key: "itemCode", label: "Item Code", width: 110 },
  { key: "mode", label: "Batch / Unique", width: 118 },
  { key: "billSlNo", label: "Bill Sl No.", width: 100 },
  { key: "seqDummy", label: "SEQ Dummy", width: 100 },
  { key: "supplierDescription", label: "Supplier Description", width: 220 },
  { key: "qty", label: "QTY", width: 100 },
  { key: "uom", label: "UOM", width: 80 },
  { key: "hsn", label: "HSN", width: 90 },
  { key: "purRate", label: "Pur Rate", width: 100 },
  { key: "disc1", label: "Disc %", width: 75 },
  { key: "finalNet", label: "Final NET", width: 100 },
  { key: "gst", label: "GST %", width: 75 },
  { key: "printDescription", label: "Print Description", width: 190 },
  { key: "retailPrice", label: "Retail Price", width: 100 },
  { key: "disc2", label: "Disc %", width: 75 },
  { key: "offerPrice", label: "Offer Price", width: 100 },
  { key: "wsp", label: "WSP Price", width: 100 },
  { key: "dp", label: "DP Price", width: 100 },
  { key: "fma", label: "FMA", width: 90 },
  { key: "silkMark", label: "Silk Mark", width: 85 },
  { key: "barcodeNo", label: "Barcode No. (Generated)", width: 200 },
];

const ROW_INCREMENT = 40;
const EXTEND_THRESHOLD_PX = 300;

function modeFromUom(uom) {
  const normalized = String(uom || '').trim().toLowerCase();
  if (/\b(mtr|meter|metre|meters|metres)\b/.test(normalized)) return 'batch';
  if (/\b(pc|pcs|piece|pieces)\b/.test(normalized)) return 'unique';
  return 'unique';
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const inr = (n) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const emptyRow = (id) => ({
  id,
  groupId: null, // set on duplicate rows -> points to the leader row's id
  groupSize: 1, // meaningful on the leader row only
  oldBarcode: "",
  itemName: "",
  itemCode: "",
  mode: "unique", // 'unique' | 'batch'
  billSlNo: "",
  seqDummy: "",
  supplierDescription: "",
  qty: "",
  uom: "",
  hsn: "",
  purRate: "",
  enteredTotal: "", // raw total typed on a group leader's Pur Rate box (display only)
  disc1: "",
  finalNet: 0,
  gst: "",
  printDescription: "",
  retailPrice: "",
  disc2: "",
  offerPrice: 0,
  wsp: 0,
  dp: 0,
  fma: 0,
  silkMark: false,
  barcodeNo: null,
});

// PLACEHOLDER pricing logic — replace with real backend rules later.
function computeCalculated(row) {
  const purRate = parseFloat(row.purRate) || 0;
  const disc1 = parseFloat(row.disc1) || 0;
  const retailPrice = parseFloat(row.retailPrice) || 0;
  const disc2 = parseFloat(row.disc2) || 0;

  const finalNet = round2(purRate - (purRate * disc1) / 100);
  const offerPrice = round2(retailPrice - (retailPrice * disc2) / 100);
  const wsp = round2(finalNet * 1.2); // 20% markup over Final NET
  const dp = round2(finalNet * 1.1); // 10% markup over Final NET
  const fma = round2(wsp - dp); // margin between WSP & DP

  return { ...row, finalNet, offerPrice, wsp, dp, fma };
}

export default function GCRBarcodeGeneration({
  grcId = "",
  initialRows = [],
  editMode = false,
}) {
  const router = useRouter();
  const scope = useScope();
  const idRef = useRef(1);
  const makeId = () => idRef.current++;

  const [rows, setRows] = useState(() =>
    Array.from({ length: ROW_INCREMENT }, () => emptyRow(makeId())),
  );
  const [showModal, setShowModal] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemModalRowId, setItemModalRowId] = useState(null);
  const [qtyEditingRowId, setQtyEditingRowId] = useState(null);
  const [purRateEditingRowId, setPurRateEditingRowId] = useState(null);
  const [savedRows, setSavedRows] = useState([]);
  const [savedSupplier, setSavedSupplier] = useState("");
  const [barcodeSetting, setBarcodeSetting] = useState(null);
  const { options: supplierOptions } = useOptions("supplier");
  const extendingRef = useRef(false);
  const barcodeSequenceRef = useRef(null);

  useEffect(() => {
    const query = new URLSearchParams({
      business: scope.business || "",
      finYear: scope.finYear || "",
      page: "1",
      perPage: "500",
    });
    fetch("/api/barcode-setting?" + query)
      .then((response) => response.json())
      .then((result) => {
        const today = new Date();
        const active = (result.rows || []).find((row) => {
          const from = row.effectiveDate ? new Date(row.effectiveDate) : null;
          const to = row.expiryDate ? new Date(row.expiryDate) : null;
          return (!from || today >= from) && (!to || today <= to);
        }) || result.rows?.[0] || null;
        setBarcodeSetting(active);
        barcodeSequenceRef.current = active ? Number(active.startNumber) || 1 : null;
      })
      .catch(() => setBarcodeSetting(null));
  }, [scope.business, scope.finYear]);

  useEffect(() => {
    if (!Array.isArray(initialRows) || initialRows.length === 0) return;
    const loaded = initialRows.map((row) =>
      computeCalculated({
        ...emptyRow(makeId()),
        ...row,
        id: row.id || row._id || makeId(),
        itemCode: row.itemCode || "",
        mode:
          String(row.batchUnique || "").toLowerCase() === "batch"
            ? "batch"
            : row.mode || "unique",
        barcodeNo: row.barcodeNo || row.barcodeGenerated || null,
        disc1: row.disc1 ?? row.disc ?? "",
        wsp: row.wsp ?? row.wspPrice ?? 0,
        dp: row.dp ?? row.dpPrice ?? 0,
      }),
    );
    setRows((current) =>
      current.some((row) => row.itemCode || row.barcodeNo)
        ? current
        : [...loaded, ...current.slice(loaded.length)],
    );
  }, [initialRows]);

  async function saveRows() {
    setSaving(true);
    try {
      const response = await fetch("/api/barcode-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows,
          grcId: grcId || undefined,
          business: scope.business,
          location: scope.location,
          finYear: scope.finYear,
          supplierId: initialRows[0]?.supplierId || "",
          totals: {
            count: totals.taxable
              ? validRows.reduce(
                  (sum, row) => sum + (parseFloat(row.qty) || 0),
                  0,
                )
              : 0,
            value: grandTotal,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not save barcode rows.");
      setShowModal(false);
      setJustSubmitted(true);
      if (editMode && grcId) {
        router.push("/admin/transaction/purchase/grc/" + grcId);
      } else {
        setTimeout(() => setJustSubmitted(false), 3000);
      }
    } catch (error) {
      setJustSubmitted(error.message || "Could not save barcode rows.");
    } finally {
      setSaving(false);
    }
  }

  async function fetchItem(code) {
    const response = await fetch(
      "/api/item?perPage=5&search=" + encodeURIComponent(code),
    );
    const result = await response.json();
    const hit =
      (result.rows || []).find(
        (item) =>
          String(item.itemCode || "").toLowerCase() ===
          String(code).trim().toLowerCase(),
      ) || result.rows?.[0];
    if (!hit) return null;
    const labels = result.labels || {};
    const uomLabel = labels[String(hit.uomId)] || "";
    return {
      itemCode: hit.itemCode || code,
      itemName: hit.name || "",
      supplierDescription: hit.name || "",
      uom: uomLabel,
      hsn: labels[String(hit.hsnId)] || "",
      gst: "",
      printDescription: hit.description || hit.name || "",
      retailPrice: hit.rsp != null ? String(hit.rsp) : "",
      disc1: "",
      mode: modeFromUom(uomLabel),
    };
  }

  async function handleItemCodeEnter(rowId, code) {
    const item = await fetchItem(code).catch(() => null);
    if (!item) return;
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? computeCalculated({ ...row, ...item }) : row,
      ),
    );
  }

  async function loadSavedRows(supplier = savedSupplier) {
    const query = new URLSearchParams({
      page: "1",
      perPage: "100",
      business: scope.business || "",
      location: scope.location || "",
      finYear: scope.finYear || "",
    });
    if (supplier) query.set("supplier", supplier);
    const result = await fetch("/api/barcode-generation?" + query).then(
      (response) => response.json(),
    );
    setSavedRows(result.rows || []);
  }

  // ---- row management -------------------------------------------------
  const addRows = (count = ROW_INCREMENT) => {
    setRows((prev) => [
      ...prev,
      ...Array.from({ length: count }, () => emptyRow(makeId())),
    ]);
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (extendingRef.current) return;
    if (scrollHeight - scrollTop - clientHeight < EXTEND_THRESHOLD_PX) {
      extendingRef.current = true;
      addRows(ROW_INCREMENT);
      setTimeout(() => {
        extendingRef.current = false;
      }, 400);
    }
  };

  // ---- item code -> master lookup + reset of any duplicate group ------
  const updateItemCode = (rowId, value) => {
    setRows((prev) => {
      const cleaned = prev.filter((r) => r.groupId !== rowId);
      return cleaned.map((r) => {
        if (r.id !== rowId) return r;
        const master = ITEM_MASTER[value.trim().toUpperCase()];
         let updated = { ...r, itemCode: value, itemName: '', qty: '', groupId: null, groupSize: 1, enteredTotal: '' }; // ✅ reset itemName
        
        if (master) {
          updated = {
            ...updated,
            itemName: master.description,
            supplierDescription: master.description,
            uom: master.uom,
            hsn: master.hsn,
            gst: String(master.gst),
            printDescription: master.printDescription,
            retailPrice: String(master.retailPrice),
            disc1: String(master.disc),
            mode: modeFromUom(master.uom),
          };
        }
        return computeCalculated(updated);
      });
    });
  };

  // ---- batch/unique mode switch (clears any existing duplicate group) -
  const updateMode = (rowId, newMode) => {
    setRows((prev) => {
      const cleaned = prev.filter((r) => r.groupId !== rowId);
      return cleaned.map((r) =>
        r.id === rowId
          ? computeCalculated({
              ...r,
              mode: newMode,
              qty: "",
              groupId: null,
              groupSize: 1,
            })
          : r,
      );
    });
  };

  // ---- QTY: drives duplication in UNIQUE mode --------------------------
  const updateQty = (rowId, rawValue) => {
    setRows((prev) => {
      const cleaned = prev.filter((r) => r.groupId !== rowId);
      const idx = cleaned.findIndex((r) => r.id === rowId);
      if (idx === -1) return prev;
      const row = cleaned[idx];
      const qty = Math.max(0, parseInt(rawValue, 10) || 0);

      if (row.mode === "unique" && qty > 0) {
        const leader = computeCalculated({
          ...row,
          qty: 1,
          groupSize: qty,
          groupId: null,
          billSlNo: "1",
        });
        const duplicates = Array.from({ length: Math.max(0, qty - 1) }, (_, duplicateIndex) =>
          computeCalculated({
            ...leader,
            id: makeId(),
            groupId: leader.id,
            billSlNo: String(duplicateIndex + 2),
            barcodeNo: null,
          }),
        );
        const next = [...cleaned];
        next.splice(idx, 1, leader, ...duplicates);
        return next;
      }

      const next = [...cleaned];
      next[idx] = computeCalculated({
        ...row,
        qty: rawValue,
        groupSize: 1,
        groupId: null,
      });
      return next;
    });
  };

  // ---- generic field update (with leader -> group propagation) --------
  const updateField = (rowId, field, rawValue) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === rowId);
      if (idx === -1) return prev;
      const row = prev[idx];
      const hasDuplicates =
        row.groupId === null && prev.some((r) => r.groupId === row.id);

      let next = [...prev];

      if (row.mode === "unique" && hasDuplicates) {
        const groupIdx = next.reduce((acc, r, i) => {
          if (r.id === row.id || r.groupId === row.id) acc.push(i);
          return acc;
        }, []);
        const groupSize = groupIdx.length;

        groupIdx.forEach((i) => {
          let updated = { ...next[i] };
          if (field === "purRate") {
            const total = parseFloat(rawValue) || 0;
            const perUnit = groupSize > 0 ? total / groupSize : 0;
            updated.purRate = total === 0 ? "" : String(round2(perUnit));
            if (next[i].id === row.id) updated.enteredTotal = rawValue; // keep raw text on leader only
          } else if (field !== "billSlNo") {
            updated[field] = rawValue;
          }
          next[i] = computeCalculated(updated);
        });
      } else {
        next[idx] = computeCalculated({ ...row, [field]: rawValue });
      }

      return next;
    });
  };

  // ---- barcode generation ----------------------------------------------
  const generateBarcode = (rowId) => {
    if (!barcodeSetting || barcodeSequenceRef.current === null) return;
    const serial = barcodeSequenceRef.current;
    barcodeSequenceRef.current += 1;
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId && !r.barcodeNo
          ? {
              ...r,
              barcodeNo: computeSampleBarcode(
                barcodeSetting.prefix,
                serial,
                barcodeSetting.suffix,
                barcodeSetting.numberLenght,
              ),
            }
          : r,
      ),
    );
  };

  const generateAllBarcodes = () => {
    if (!barcodeSetting || barcodeSequenceRef.current === null) return;
    setRows((prev) => prev.map((row) => {
      if (!row.itemCode.trim() || row.barcodeNo) return row;
      const serial = barcodeSequenceRef.current;
      barcodeSequenceRef.current += 1;
      return {
        ...row,
        barcodeNo: computeSampleBarcode(
          barcodeSetting.prefix,
          serial,
          barcodeSetting.suffix,
          barcodeSetting.numberLenght,
        ),
      };
    }));
  };

  // ---- totals -----------------------------------------------------------
  const validRows = useMemo(
    () => rows.filter((r) => r.itemCode.trim() !== ""),
    [rows],
  );

  const totals = useMemo(() => {
    return validRows.reduce(
      (acc, r) => {
        const qty = parseFloat(r.qty) || 0;
        const taxable = (r.finalNet || 0) * qty;
        const gstAmt = taxable * ((parseFloat(r.gst) || 0) / 100);
        acc.taxable += taxable;
        acc.gst += gstAmt;
        return acc;
      },
      { taxable: 0, gst: 0 },
    );
  }, [validRows]);
  const grandTotal = totals.taxable + totals.gst;
  const modalTotals = useMemo(() => validRows.reduce((acc, row) => {
    const qty = parseFloat(row.qty) || 0;
    const purRate = parseFloat(row.purRate) || 0;
    const finalNet = parseFloat(row.finalNet) || 0;
    const taxable = finalNet * qty;
    const gstAmount = taxable * ((parseFloat(row.gst) || 0) / 100);
    acc.qty += qty;
    acc.purRate += purRate * qty;
    acc.finalNet += taxable;
    acc.taxable += taxable;
    acc.gstAmount += gstAmount;
    acc.gstBase += taxable * (parseFloat(row.gst) || 0);
    return acc;
  }, { qty: 0, purRate: 0, finalNet: 0, taxable: 0, gstAmount: 0, gstBase: 0 }), [validRows]);
  const modalGstRate = modalTotals.taxable ? modalTotals.gstBase / modalTotals.taxable : 0;

  const colTotalWidth = COLUMNS.reduce((sum, c) => sum + c.width, 0);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6 flex flex-col gap-4">
      {/* Header / toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">
            GRC Barcode Generation
          </h1>
          <p className="text-xs text-gray-500">
            {rows.length} rows &middot; {validRows.length} filled &middot;
            scroll to bottom to auto-add {ROW_INCREMENT} more rows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => addRows(ROW_INCREMENT)}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            + {ROW_INCREMENT} Rows
          </button>
          <button
            type="button"
            onClick={generateAllBarcodes}
            disabled={!validRows.length || !barcodeSetting || validRows.every((row) => row.barcodeNo)}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed shadow-sm"
          >
            Generate All
          </button>
          <button
            onClick={() => setShowModal(true)}
            disabled={validRows.length === 0}
            className="px-4 py-1.5 text-sm font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
          >
            Submit ({validRows.length})
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-auto max-h-[70vh]" onScroll={handleScroll}>
          <table
            className="border-collapse text-xs"
            style={{ tableLayout: "fixed", width: colTotalWidth }}
          >
            <colgroup>
              {COLUMNS.map((c) => (
                <col key={c.key} style={{ width: c.width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {COLUMNS.map((c, i) => (
                  <th
                    key={c.key}
                    className={`sticky top-0 z-20 bg-gray-100 border border-gray-300 px-2 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide ${
                      i === 0 ? "sticky left-0 z-30" : ""
                    }`}
                    style={{ fontSize: "10px" }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isDuplicate = row.groupId !== null;
                const isLeaderOfGroup =
                  row.groupId === null &&
                  rows.some((r) => r.groupId === row.id);
                const groupLeaderIndex = row.groupId === null
                  ? index
                  : rows.findIndex((r) => r.id === row.groupId);
                const serialNumber = row.groupId === null
                  ? (isLeaderOfGroup ? 1 : index + 1)
                  : index - groupLeaderIndex + 1;
                const rowBg = isDuplicate
                  ? "bg-indigo-50/50"
                  : index % 2 === 0
                    ? "bg-white"
                    : "bg-gray-50";

                return (
                  <tr key={row.id} className={rowBg}>
                    {/* row number */}
                    <td
                      className={`sticky left-0 z-10 border border-gray-200 px-1 py-1 text-center text-gray-400 font-medium ${rowBg}`}
                    >
                      {serialNumber}
                    </td>

                    {/* Old Barcode */}
                    <td className="border border-gray-200 p-0">
                      <input
                        type="text"
                        value={row.oldBarcode}
                        onChange={(e) =>
                          updateField(row.id, "oldBarcode", e.target.value)
                        }
                        className="w-full h-full px-1.5 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400"
                      />
                    </td>

                    {/* Item Code */}
                    <td className="border border-gray-200 p-0">
                      <div className="flex h-full items-stretch">
                        <input
                          type="text"
                          value={row.itemName || row.itemCode}
                          disabled={isDuplicate}
                          placeholder="SK-10"
                          onChange={(e) =>
                            updateItemCode(row.id, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handleItemCodeEnter(row.id, row.itemCode);
                          }}
                          className="min-w-0 flex-1 px-1.5 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400 disabled:bg-gray-100 disabled:text-gray-400 font-medium"
                        />
                        {!isDuplicate && (
                          <button
                            type="button"
                            title="Add Item"
                            onClick={() => setItemModalRowId(row.id)}
                            className="shrink-0 border-l border-gray-200 px-1.5 text-indigo-600 hover:bg-indigo-50"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Batch / Unique */}
                    <td className="border border-gray-200 p-0">
                      <select
                        value={row.mode}
                        disabled={isDuplicate}
                        onChange={(e) => updateMode(row.id, e.target.value)}
                        className="w-full h-full px-1 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="unique">UNIQUE</option>
                        <option value="batch">BATCH</option>
                      </select>
                    </td>

                    {/* Bill Sl No. */}
                    <td className="border border-gray-200 p-0">
                      <input
                        type="text"
                        value={row.billSlNo}
                        onChange={(e) =>
                          updateField(row.id, "billSlNo", e.target.value)
                        }
                        className="w-full h-full px-1.5 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400"
                      />
                    </td>

                    {/* SEQ Dummy */}
                    <td className="border border-gray-200 p-0">
                      <input
                        type="text"
                        value={row.seqDummy}
                        onChange={(e) =>
                          updateField(row.id, "seqDummy", e.target.value)
                        }
                        className="w-full h-full px-1.5 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400"
                      />
                    </td>

                    {/* Supplier Description */}
                    <td className="border border-gray-200 p-0">
                      <input
                        type="text"
                        value={row.supplierDescription}
                        onChange={(e) =>
                          updateField(
                            row.id,
                            "supplierDescription",
                            e.target.value,
                          )
                        }
                        className="w-full h-full px-1.5 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400"
                      />
                    </td>

                    {/* QTY */}
                    <td className="border border-gray-200 p-0">
                      <input
                        type="number"
                        min={0}
                        value={isLeaderOfGroup && qtyEditingRowId === row.id ? row.groupSize : row.qty}
                        disabled={isDuplicate}
                        onChange={(e) => updateQty(row.id, e.target.value)}
                        onFocus={() => setQtyEditingRowId(row.id)}
                        onBlur={() => setQtyEditingRowId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        className="no-spinner w-full h-full px-1.5 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400 disabled:bg-gray-100 disabled:text-gray-400 text-right font-mono"
                      />
                    </td>

                    {/* UOM */}
                    <td className="border border-gray-200 p-0">
                      <input
                        type="text"
                        value={row.uom}
                        onChange={(e) =>
                          updateField(row.id, "uom", e.target.value)
                        }
                        className="w-full h-full px-1.5 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400"
                      />
                    </td>

                    {/* HSN */}
                    <td className="border border-gray-200 p-0">
                      <input
                        type="text"
                        value={row.hsn}
                        onChange={(e) =>
                          updateField(row.id, "hsn", e.target.value)
                        }
                        className="w-full h-full px-1.5 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400 font-mono"
                      />
                    </td>

                    {/* Pur Rate */}
                    <td className="border border-gray-200 p-0">
                      <input
                        type="number"
                        value={isLeaderOfGroup && purRateEditingRowId === row.id ? row.enteredTotal : row.purRate}
                        title={
                          isLeaderOfGroup
                            ? "Enter the TOTAL pur rate for this group — it is split evenly across all duplicate rows"
                            : undefined
                        }
                        onFocus={() => setPurRateEditingRowId(row.id)}
                        onBlur={() => setPurRateEditingRowId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        onChange={(e) =>
                          updateField(row.id, "purRate", e.target.value)
                        }
                        className="w-full h-full px-1.5 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400 text-right font-mono"
                      />
                    </td>

                    {/* Disc 1 */}
                    <td className="border border-gray-200 p-0">
                      <input
                        type="number"
                        value={row.disc1}
                        onChange={(e) =>
                          updateField(row.id, "disc1", e.target.value)
                        }
                        className="w-full h-full px-1.5 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400 text-right font-mono"
                      />
                    </td>

                    {/* Final NET (calculated) */}
                    <td className="border border-gray-200 px-1.5 py-1 text-right font-mono bg-gray-50 text-gray-700">
                      {inr(row.finalNet)}
                    </td>

                    {/* GST % */}
                    <td className="border border-gray-200 p-0">
                      <input
                        type="number"
                        value={row.gst}
                        onChange={(e) =>
                          updateField(row.id, "gst", e.target.value)
                        }
                        className="w-full h-full px-1.5 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400 text-right font-mono"
                      />
                    </td>

                    {/* Print Description */}
                    <td className="border border-gray-200 p-0">
                      <input
                        type="text"
                        value={row.printDescription}
                        onChange={(e) =>
                          updateField(
                            row.id,
                            "printDescription",
                            e.target.value,
                          )
                        }
                        className="w-full h-full px-1.5 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400"
                      />
                    </td>

                    {/* Retail Price */}
                    <td className="border border-gray-200 p-0">
                      <input
                        type="number"
                        value={row.retailPrice}
                        onChange={(e) =>
                          updateField(row.id, "retailPrice", e.target.value)
                        }
                        className="w-full h-full px-1.5 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400 text-right font-mono"
                      />
                    </td>

                    {/* Disc 2 */}
                    <td className="border border-gray-200 p-0">
                      <input
                        type="number"
                        value={row.disc2}
                        onChange={(e) =>
                          updateField(row.id, "disc2", e.target.value)
                        }
                        className="w-full h-full px-1.5 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400 text-right font-mono"
                      />
                    </td>

                    {/* Offer Price (calculated) */}
                    <td className="border border-gray-200 px-1.5 py-1 text-right font-mono bg-gray-50 text-gray-700">
                      {inr(row.offerPrice)}
                    </td>

                    {/* WSP (calculated) */}
                    <td className="border border-gray-200 px-1.5 py-1 text-right font-mono bg-gray-50 text-gray-700">
                      {inr(row.wsp)}
                    </td>

                    {/* DP (calculated) */}
                    <td className="border border-gray-200 px-1.5 py-1 text-right font-mono bg-gray-50 text-gray-700">
                      {inr(row.dp)}
                    </td>

                    {/* FMA (calculated) */}
                    <td className="border border-gray-200 px-1.5 py-1 text-right font-mono bg-gray-50 text-gray-700">
                      {inr(row.fma)}
                    </td>

                    {/* Silk Mark */}
                    <td className="border border-gray-200 px-1.5 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={row.silkMark === true || row.silkMark === "true" || row.silkMark === 1 || row.silkMark === "1"}
                        onChange={(e) =>
                          updateField(row.id, "silkMark", e.target.checked)
                        }
                        className="h-3.5 w-3.5 accent-indigo-600"
                      />
                    </td>

                    {/* Barcode generation */}
                    <td className="border border-gray-200 px-1.5 py-1">
                      {row.barcodeNo ? (
                        <div className="flex flex-col gap-0.5">
                          <div
                            className="h-4 w-full rounded-sm"
                            style={{
                              backgroundImage:
                                "repeating-linear-gradient(90deg, #111 0px, #111 2px, transparent 2px, transparent 4px)",
                            }}
                          />
                          <span className="font-mono text-[10px] text-gray-700 select-all">
                            {row.barcodeNo}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => generateBarcode(row.id)}
                          disabled={!row.itemCode.trim() || !barcodeSetting}
                          className="w-full text-[11px] font-medium px-2 py-1 rounded border border-indigo-300 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Generate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals bar */}
      <div className="rounded-lg border border-gray-300 bg-white p-3 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-gray-700">
          Saved Barcode Rows
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px]">
            <label className="mb-1 block text-xs text-gray-500">Supplier</label>
            <select
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              value={savedSupplier}
              onChange={(e) => setSavedSupplier(e.target.value)}
            >
              <option value="">All suppliers</option>
              {supplierOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            onClick={() => loadSavedRows()}
          >
            Search
          </button>
        </div>
        {savedRows.length > 0 && (
          <div className="mt-3 overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-2 py-1">Item Code</th>
                  <th className="px-2 py-1">Barcode</th>
                  <th className="px-2 py-1">Supplier</th>
                </tr>
              </thead>
              <tbody>
                {savedRows.map((row) => (
                  <tr key={row._id} className="border-t border-gray-100">
                    <td className="px-2 py-1">{row.itemCode}</td>
                    <td className="px-2 py-1 font-mono">
                      {row.barcodeGenerated}
                    </td>
                    <td className="px-2 py-1">{row.supplierId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-6 rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm text-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-gray-500">Total Taxable</span>
          <span className="font-mono font-semibold text-gray-800">
            ₹ {inr(totals.taxable)}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-gray-500">Total GST</span>
          <span className="font-mono font-semibold text-gray-800">
            ₹ {inr(totals.gst)}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-gray-500">Grand Total</span>
          <span className="font-mono font-bold text-indigo-700 text-base">
            ₹ {inr(grandTotal)}
          </span>
        </div>
      </div>

      {/* Submit confirmation modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-6xl max-h-[85vh] rounded-lg bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">
                Confirm Barcode Generation &mdash; {validRows.length} item
                {validRows.length !== 1 ? "s" : ""}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="overflow-auto px-5 py-3">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 uppercase text-[10px]">
                    <th className="border border-gray-200 px-2 py-1.5 text-left">
                      Item Code
                    </th>
                    <th className="border border-gray-200 px-2 py-1.5 text-left">
                      Description
                    </th>
                    <th className="border border-gray-200 px-2 py-1.5 text-left">
                      Mode
                    </th>
                    <th className="border border-gray-200 px-2 py-1.5 text-right">
                      Qty
                    </th>
                    <th className="border border-gray-200 px-2 py-1.5 text-right">
                      Pur Rate
                    </th>
                    <th className="border border-gray-200 px-2 py-1.5 text-right">
                      Final NET
                    </th>
                    <th className="border border-gray-200 px-2 py-1.5 text-right">
                      GST %
                    </th>
                    <th className="border border-gray-200 px-2 py-1.5 text-right">
                      Taxable
                    </th>
                    <th className="border border-gray-200 px-2 py-1.5 text-right">
                      GST Amt
                    </th>
                    <th className="border border-gray-200 px-2 py-1.5 text-left">
                      Barcode No.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {validRows.map((r) => {
                    const qty = parseFloat(r.qty) || 0;
                    const taxable = (r.finalNet || 0) * qty;
                    const gstAmt = taxable * ((parseFloat(r.gst) || 0) / 100);
                    return (
                      <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                        <td className="border border-gray-200 px-2 py-1 font-medium">
                          {r.itemCode}
                        </td>
                        <td className="border border-gray-200 px-2 py-1">
                          {r.supplierDescription}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 uppercase">
                          {r.mode}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-right font-mono">
                          {qty}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-right font-mono">
                          {inr(parseFloat(r.purRate) || 0)}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-right font-mono">
                          {inr(r.finalNet)}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-right font-mono">
                          {r.gst || 0}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-right font-mono">
                          {inr(taxable)}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-right font-mono">
                          {inr(gstAmt)}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 font-mono text-[10px]">
                          {r.barcodeNo || (
                            <span className="text-red-500">not generated</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-semibold">
                    <td
                      colSpan={3}
                      className="border border-gray-200 px-2 py-1.5 text-right"
                    >
                      Totals
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right font-mono">
                      {modalTotals.qty}
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right font-mono">
                      {inr(modalTotals.purRate)}
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right font-mono">
                      {inr(modalTotals.finalNet)}
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right font-mono">
                      {modalGstRate.toFixed(2)}%
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right font-mono">
                      {inr(modalTotals.taxable)}
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right font-mono">
                      {inr(modalTotals.gstAmount)}
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5" />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Grand Total:{" "}
                <span className="font-mono font-bold text-indigo-700">
                  ₹ {inr(grandTotal)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRows}
                  disabled={saving}
                  className="px-4 py-1.5 text-sm font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {saving
                    ? "Saving..."
                    : editMode
                      ? "Update"
                      : "Confirm Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {justSubmitted && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md bg-green-600 text-white text-sm px-4 py-2 shadow-lg">
          Submitted (static demo — no backend wired yet).
        </div>
      )}

      {itemModalRowId !== null && (
        <ModalForm
          cfg={{
            title: "Items",
            addTitle: "Add Item",
            basePath: "/admin/inventory/",
            slugPath: "item",
            endpoint: "/api/item",
            fields: ITEM_FIELDS,
            modalWide: true,
          }}
          slug="item"
          onClose={() => setItemModalRowId(null)}
          onSaved={async (result) => {
            const item = result?.id
              ? await fetch("/api/item/" + result.id)
                  .then((response) => response.json())
                  .then((data) => data.doc)
                  .catch(() => null)
              : null;
            setItemModalRowId(null);
            if (item?.itemCode)
              handleItemCodeEnter(itemModalRowId, item.itemCode);
          }}
        />
      )}
    </div>
  );
}

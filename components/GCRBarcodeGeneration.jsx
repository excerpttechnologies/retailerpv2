"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useScope } from "./ScopeContext";
import { useOptions } from "./useOptions";
import { computeSampleBarcode } from "@/lib/barcodeFormat";

const money = (value) => {
  const n = Number(value || 0);
  return Number.isFinite(n)
    ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";
};

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const meterRegex = /(mtr|meter|metre|meters|metres)/i;
const pcRegex = /(pc|pcs|piece|pieces)/i;

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
    itemCode: "",
    itemName: "",
    hsn: "",
    gst: "",
    uom: "",
    qty: "",
    noOfCuts: "",
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

function AddItemModal({ open, onClose, onSubmit, onSubmitAndPrint, rowCount = 0, barcodeFormat, sequenceRef }) {
  const createBlankForm = (overrides = {}) => ({
    itemCode: "",
    itemName: "",
    itemId: "",
    itemLabel: "",
    hsnId: "",
    hsn: "",
    gst: "5",
    goodsType: "",
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
  const [itemOptions, setItemOptions] = useState([]);
  const [hsnOptions, setHsnOptions] = useState([]);
  const [cutRows, setCutRows] = useState([{ id: 1, value: "" }]);
  const [focusedCutIndex, setFocusedCutIndex] = useState(0);
  const cutTargetRef = useRef(0);

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

    fetch('/api/item?perPage=200')
      .then((response) => response.json())
      .then((result) => {
        const rows = (result.rows || []).map((row) => ({
          value: String(row._id),
          label: `${row.name || 'Unnamed item'}${row.itemCode ? ` (${row.itemCode})` : ''}`,
          itemCode: row.itemCode || '',
          name: row.name || '',
          subGroupId: row.subGroupId || '',
          description: row.description || '',
        }));
        setItemOptions(rows);
      })
      .catch(() => setItemOptions([]));

    fetch('/api/hsn?perPage=200')
      .then((response) => response.json())
      .then((result) => {
        const rows = (result.rows || []).map((row) => ({
          value: String(row._id),
          label: `${row.code || 'HSN'}${row.description ? ` - ${row.description}` : ''}`,
          code: row.code || '',
          description: row.description || '',
          taxSlabs: Array.isArray(row.taxSlabs) ? row.taxSlabs : [],
        }));
        setHsnOptions(rows);
      })
      .catch(() => setHsnOptions([]));
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

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

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

  const handleItemSelection = async (selectedValue) => {
    const selected = itemOptions.find((option) => String(option.value) === String(selectedValue));
    if (!selected) {
      setForm((current) => ({ ...current, itemId: "", itemName: "", itemCode: "", subGroupName: "", groupName: "", printDescription: "" }));
      return;
    }

    const itemCode = selected.itemCode || "";
    const itemName = selected.name || selected.label || "";
    setForm((current) => ({
      ...current,
      itemId: selected.value,
      itemCode,
      itemName,
      printDescription: selected.description || "",
    }));
    await resolveProductGroup(selected.subGroupId || "");
  };

  const handleHsnSelection = async (selectedValue) => {
    const selected = hsnOptions.find((option) => String(option.value) === String(selectedValue));
    if (!selected) {
      setForm((current) => ({ ...current, hsnId: "", hsn: "", gst: "5" }));
      return;
    }

    await resolveHsnGst(selected);
  };

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

  const submit = (printAfterSubmit = false) => {
    if (!form.itemName?.trim()) return;

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

    barcodePlan.forEach((planItem, index) => {
      const sampleBarcode = computeSampleBarcode(
        barcodeFormat.prefix,
        sequenceRef.current + index,
        barcodeFormat.suffix,
        barcodeFormat.numberLenght,
      );
      const distinctBarcode = form.isMtr && Boolean(form.uniqueBarcode)
        ? sampleBarcode
        : (barcodePlan.length > 1 ? sampleBarcode : sampleBarcode);

      generatedRows.push(calculatePrices({
        ...emptyRow(`${Date.now()}-${index}`),
        itemCode: form.itemCode || form.itemName.replace(/\s+/g, "-").toUpperCase(),
        itemName: form.itemName,
        hsn: form.hsn,
        gst: form.gst,
        uom: form.isMtr ? "MTR" : "PC",
        qty: String(planItem.qty || 0),
        noOfCuts: form.isMtr ? String(cutRows.length || Number(form.noOfCuts || 1)) : "",
        purchaseRate: String(purchaseRateValue),
        discountType: form.discountType,
        discount: String(form.discount || 0),
        finalPrice: String(finalPriceValue),
        retailPrice: String(form.rspPrice || 0),
        uniqueBarcode: Boolean(form.uniqueBarcode) ? "Yes" : "No",
        barcodeNo: distinctBarcode,
        supplierDescription: form.itemName,
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
    sequenceRef.current += generatedRows.length;

    const nextSerial = incrementSerial(baseSerial);
    setForm((current) => createBlankForm({
      itemId: current.itemId,
      itemName: current.itemName,
      itemCode: current.itemCode,
      hsnId: current.hsnId,
      hsn: current.hsn,
      gst: current.gst,
      goodsType: current.goodsType,
      printDescription: current.printDescription,
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="space-y-1 md:col-span-2">
              <label className="block text-[11px] font-semibold text-gray-700">Item Name *</label>
              <select value={form.itemId} onChange={(event) => handleItemSelection(event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`}>
                <option value="">Select...</option>
                {itemOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-gray-700">HSN *</label>
              <select value={form.hsnId} onChange={(event) => handleHsnSelection(event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`}>
                <option value="">Select...</option>
                {hsnOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-gray-700">GST% *</label>
              <input value={form.gst} readOnly className={`w-full rounded-md px-2 py-2 text-sm ${readOnlyClass}`} />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-gray-700">Goods Type</label>
              <select value={form.goodsType} onChange={(event) => updateField("goodsType", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`}>
                <option value="">Select...</option>
                <option value="Fabric">Fabric</option>
                <option value="Yarn">Yarn</option>
                <option value="Thread">Thread</option>
                <option value="Accessory">Accessory</option>
              </select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="space-y-1 md:col-span-3">
              <label className="block text-[11px] font-semibold text-gray-700">Print Item Description</label>
              <input value={form.printDescription} onChange={(event) => updateField("printDescription", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
            </div>

            <div className="space-y-1 flex items-end md:col-span-2">
              <label className="flex w-full items-center justify-start gap-3 rounded-md border border-[#dfe4eb] bg-white px-3 py-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.uniqueBarcode} onChange={(event) => updateField("uniqueBarcode", event.target.checked)} className="h-4 w-4 accent-[#0d5ddc]" /> Unique Barcode
              </label>
              <label className="flex w-full items-center justify-start gap-3 rounded-md border border-[#dfe4eb] bg-white px-3 py-2 text-sm text-gray-700">
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

            <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">Serial No. *</label>
                <input value={form.serialNo} onChange={(event) => updateField("serialNo", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">{form.isMtr ? "No. of Cuts *" : "Quantity *"}</label>
                {form.isMtr ? (
                  <input type="number" min={1} value={form.noOfCuts} onChange={(event) => {
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
                  <input type="number" min={1} value={form.qty} onChange={(event) => updateField("qty", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
                )}
              </div>

              {form.isMtr && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700">Total MTR *</label>
                  <input type="number" min={0} step="0.01" value={form.totalMtr} onChange={(event) => {
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
                <input type="number" step="0.01" min={0} value={form.purchaseRate} onChange={(event) => updateField("purchaseRate", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
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
                <input type="number" step="0.01" min={0} value={form.discount} onChange={(event) => updateField("discount", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
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
                <input type="number" min={0} value={form.markupRSP} onChange={(event) => updateMarkupValue("markupRSP", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">RSP Price *</label>
                <input type="number" step="0.01" min={0} value={form.rspPrice} onChange={(event) => updateMarkupValue("rspPrice", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">Markup WSP % *</label>
                <input type="number" min={0} value={form.markupWSP} onChange={(event) => updateMarkupValue("markupWSP", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">WSP Price *</label>
                <input type="number" step="0.01" min={0} value={form.wspPrice} onChange={(event) => updateMarkupValue("wspPrice", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">Markup DP % *</label>
                <input type="number" min={0} value={form.markupDP} onChange={(event) => updateMarkupValue("markupDP", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">DP Price *</label>
                <input type="number" step="0.01" min={0} value={form.dpPrice} onChange={(event) => updateMarkupValue("dpPrice", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
            </div>

            <div className="mt-5 text-center text-[15px] font-bold uppercase tracking-wide underline decoration-[1.5px] underline-offset-4">Offer Price /Mark Down</div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">RSP Offer %</label>
                <input type="number" min={0} value={form.rspOfferPct} onChange={(event) => updateOfferValue("rspOfferPct", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">RSP Offer Price</label>
                <input type="number" step="0.01" min={0} value={form.rspOfferPrice} onChange={(event) => updateOfferValue("rspOfferPrice", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">WSP Offer %</label>
                <input type="number" min={0} value={form.wspOfferPct} onChange={(event) => updateOfferValue("wspOfferPct", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">WSP Offer Price</label>
                <input type="number" step="0.01" min={0} value={form.wspOfferPrice} onChange={(event) => updateOfferValue("wspOfferPrice", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">DP Offer %</label>
                <input type="number" min={0} value={form.dpOfferPct} onChange={(event) => updateOfferValue("dpOfferPct", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">DP Offer Price</label>
                <input type="number" step="0.01" min={0} value={form.dpOfferPrice} onChange={(event) => updateOfferValue("dpOfferPrice", event.target.value)} className={`w-full rounded-md px-2 py-2 text-sm ${editableClass}`} />
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
            <button type="button" onClick={() => submit(false)} className="rounded-md bg-[#0d5ddc] px-7 py-3 text-[15px] font-semibold text-white shadow-[0_2px_8px_rgba(13,93,220,0.35)] transition hover:bg-[#0b4bb6]">Submit</button>
            <button type="button" onClick={() => submit(true)} className="rounded-md bg-[#198754] px-7 py-3 text-[15px] font-semibold text-white shadow-[0_2px_8px_rgba(25,135,84,0.3)] transition hover:bg-[#146c43]">Submit &amp; Print Label</button>
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

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[960px] rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold">Print Label Picker</h3>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-gray-500">×</button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div>
            {rows.filter((row) => row.barcodeNo).length === 0 && <div className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-500">No barcode generated yet.</div>}
            {rows.filter((row) => row.barcodeNo).map((row, index) => (
              <div key={row.barcodeNo || index} className="mb-3 flex items-center gap-3 rounded border border-gray-200 p-2">
                <input type="checkbox" checked={selected.includes(row.barcodeNo)} onChange={() => setSelected((prev) => prev.includes(row.barcodeNo) ? prev.filter((item) => item !== row.barcodeNo) : [...prev, row.barcodeNo])} />
                <div className="flex-1">
                  <div className="font-medium">{row.itemName || row.supplierDescription || "Item"}</div>
                  <div className="text-xs text-gray-600">{row.barcodeNo}</div>
                </div>
                <input type="number" min={1} value={copies[row.barcodeNo] || 1} onChange={(e) => setCopies((prev) => ({ ...prev, [row.barcodeNo]: Number(e.target.value) || 1 }))} className="w-[90px] rounded border border-gray-300 px-2 py-1 text-sm" />
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

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
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
  const [barcodeFormat, setBarcodeFormat] = useState({ prefix: "", suffix: "", startNumber: 1, numberLenght: 4 });
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
        });
      }
      const entry = map.get(key);
      const qty = Number(row.qty || 0);
      const beforeTax = Number(row.finalPrice || 0) * qty;
      entry.qty += qty;
      entry.beforeTax += beforeTax;
      entry.gst += beforeTax * (Number(row.gst || 0) / 100);
      entry.net += beforeTax + beforeTax * (Number(row.gst || 0) / 100);
    });
    return Array.from(map.values());
  }, [validRows]);

  function appendRows(items) {
    setRows((current) => [...current, ...items]);
  }

  async function saveRows(rowsToSave = validRows, printAfterSave = false) {
    setSaving(true);
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
      if (!response.ok) throw new Error("Save failed");
      setShowSaveConfirm(false);
      if (printAfterSave) setShowPrint(true);
      router.refresh?.();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
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
        sequenceRef={sequenceRef}
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
            <span className="rounded border border-gray-300 bg-gray-50 px-2 py-1">Pc(s) {totals.pcs}</span>
          </div>
        </div>

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
                </tr>
              </thead>
              <tbody>
                {validRows.length === 0 ? (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-500">No data found</td></tr>
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
                </tr>
              </thead>
              <tbody>
                {summaryRows.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No data found</td></tr>
                ) : summaryRows.map((row, index) => (
                  <tr key={row.id} className="odd:bg-white even:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-2">{row.itemName}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(row.qty)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(row.beforeTax)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(row.gst)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(row.net)}</td>
                  </tr>
                ))}
                {summaryRows.length > 0 && (
                  <tr className="bg-gray-100 font-semibold">
                    <td className="border border-gray-300 px-2 py-2" colSpan={3}>Total</td>
                    <td className="border border-gray-300 px-2 py-2">{money(totals.pcs + totals.mtr)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(totals.taxable)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(totals.gst)}</td>
                    <td className="border border-gray-300 px-2 py-2">{money(totals.net)}</td>
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
                  <th className="border border-gray-300 px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {validRows.length === 0 ? (
                  <tr><td colSpan={15} className="px-3 py-8 text-center text-gray-500">No data found</td></tr>
                ) : validRows.map((row, index) => (
                  <tr key={row.id || index} className="odd:bg-white even:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-2">{row.itemCode || "-"} / {row.itemName || "-"} / {row.hsn || "-"} / {row.gst || "-"} / {row.uom || "-"}</td>
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
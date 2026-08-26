/* Delivery / LR Transaction - field spec and freight maths.

   Plain module so the API routes can import the same rules the dialog uses:
   the totals shown while typing and the totals actually stored must agree. */

export const FIELDS = [
  /* TRANSACTION INFO */
  { k: 'transactionNo', label: 'Transaction No', type: 'text' },
  { k: 'document', label: 'Upload Document / Image', type: 'file', accept: 'image/*,.pdf,.doc,.docx' },
  { k: 'transactionDate', label: 'Transaction Date', type: 'date', displayFormat: 'DD/MM/YYYY', def: 'today', req: true },
  { k: 'transporterId', label: 'Transporter', type: 'ref', ref: 'transporter', req: true },
  { k: 'lrNumber', label: 'LR Number', type: 'text', req: true },
  { k: 'bookingDate', label: 'Booking Date', type: 'date', displayFormat: 'DD/MM/YYYY', req: true },

  /* SUPPLIER / PARCEL INFO */
  { k: 'supplierId', label: 'Supplier Name', type: 'ref', ref: 'supplier', req: true },
  { k: 'invPmNumber', label: 'Inv / PM Number', type: 'text', req: true },
  { k: 'parcelQty', label: 'Parcel Qty', type: 'number', req: true },
  { k: 'value', label: 'Value', type: 'number' },

  /* FREIGHT DETAILS */
  { k: 'freightAmount', label: 'Freight Amount', type: 'number', req: true },
  { k: 'gstApplicable', label: 'GST Applicable?', type: 'radio', def: 'No', opts: [{ v: 'Yes', l: 'Yes' }, { v: 'No', l: 'No' }] },
  { k: 'autoCharges', label: 'Auto Charges', type: 'number' },
  { k: 'tips', label: 'Tips', type: 'number' },
];

/* Derived on save, so they are not part of FIELDS above. */
export const DERIVED_FIELDS = [
  { k: 'gstRate', label: 'GST Rate', type: 'number' },
  { k: 'inputCgst', label: 'Input CGST', type: 'number' },
  { k: 'inputSgst', label: 'Input SGST', type: 'number' },
  { k: 'totalFreight', label: 'Total Freight', type: 'number' },
];

/* Goods transport is 5% GST, split evenly between CGST and SGST. One
   constant so the rate is a single edit if it ever changes; the rate that
   applied is stored per document, so history is never rewritten. */
export const GST_RATE = 5;

export function freightBreakdown(data) {
  const freight = Number(data?.freightAmount) || 0;
  const applicable = String(data?.gstApplicable || 'No') === 'Yes';
  const rate = applicable ? GST_RATE : 0;

  const half = round2((freight * rate) / 200);

  return {
    gstRate: rate,
    inputCgst: half,
    inputSgst: half,
    totalFreight: round2(freight + half * 2),
  };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/* Days between booking and the transaction being raised. The deployed list
   shows this as a small coloured bar; anything beyond a few days is worth
   flagging. */
export function bookingDelayDays(row) {
  if (!row?.bookingDate || !row?.transactionDate) return null;
  const from = new Date(row.bookingDate);
  const to = new Date(row.transactionDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.max(0, Math.round((to - from) / 86400000));
}

export function delayTone(days) {
  if (days === null) return 'grey';
  if (days <= 2) return 'green';
  if (days <= 5) return 'blue';
  return 'red';
}

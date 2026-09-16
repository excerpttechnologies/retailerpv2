/* THE barcode value of a GRC barcode - one string, made one way, used
   everywhere: what the bars encode, the line printed under them, the stored
   barcodeNo, what the Barcode Generation grid shows and what the till scans.

     SUPPLIER_CODE * GRC_NUMBER * BILL_SL_NO * SEQ   e.g. "G512 * 05173 * 5 * 1"

     SUPPLIER_CODE  the GRC supplier's code (Contact.contactId), e.g. G512
     GRC_NUMBER     the GRC number without its "GRC " display prefix: 05173
     BILL_SL_NO     the bill line this item was received on, as the GRC's Item
                    Summary shows it against that item: barcodeLabel.billSlNo,
                    which is the "Bill Sl No." column of the Barcode
                    Generation grid and the "Bill Sl No." column of Item
                    Summary - one field, one value, read off the same row
     SEQ            the barcode's own running number within its GRC - 1, 2,
                    3 ... - given when the barcode is created, never reused

   THE THIRD PART IS NOT THE QUANTITY. It used to be, and the two are easy to
   mistake for each other because a bill line's serial and its quantity are
   both small numbers on the same row. 16 metres received against bill line 5
   is "G512 * 05173 * 5 * 1", never "G512 * 05173 * 16 * 1": a quantity says
   how much arrived, the Bill Sl No. says which line of the supplier's bill it
   arrived on, and it is the bill line that the goods have to be traceable to.

   A barcode made before this change keeps the value it was printed with -
   hasComposedBarcode below answers false for it, so nothing recomposes it and
   the sticker already on the goods stays the truth.

   Pure and client-safe. The save route (app/api/barcode-generation) makes the
   stored value with it; the grid shows a row's value with it before the row is
   saved; printing reads the stored value and nothing else. */

export const BARCODE_SEPARATOR = ' * ';

/* "GRC 05178" -> "05178" */
export function grcNumberForBarcode(grcNumber) {
  return String(grcNumber ?? '').trim().replace(/^GRC\s*/i, '').trim();
}

/* A Bill Sl No. as the value writes it: the operator's own text, trimmed.

   Kept verbatim rather than put through Number(), so a bill line entered
   "007" is carried as "007". The value has to read back as the number the
   Item Summary shows against that item, not as this module's idea of it. */
export function billSlNoForBarcode(billSlNo) {
  return String(billSlNo ?? '').trim();
}

/* The value - or '' when any part is missing, never a shorter string that
   looks like a value. A row with no Bill Sl No. composes nothing at all, and
   the caller says so (billSlNoProblem below) rather than standing some other
   number in the third place. */
export function composeBarcodeValue({ supplierCode, grcNumber, billSlNo, seq } = {}) {
  const parts = [
    String(supplierCode ?? '').trim(),
    grcNumberForBarcode(grcNumber),
    billSlNoForBarcode(billSlNo),
    String(seq ?? '').trim(),
  ];
  return parts.every((part) => part !== '') ? parts.join(BARCODE_SEPARATOR) : '';
}

/* Why a GRC cannot give its barcodes a value, or '' when it can. */
export function barcodeValueProblem({ supplierCode, grcNumber } = {}) {
  if (!String(supplierCode ?? '').trim()) {
    return "This GRC's supplier has no supplier code, so its barcodes (SUPPLIER CODE * GRC NUMBER * BILL SL NO * SEQ) cannot be generated. "
      + 'Give the supplier a code in the contact master, or choose the supplier on the GRC, and submit again.';
  }
  if (!grcNumberForBarcode(grcNumber)) {
    return 'This GRC has no GRC number, so its barcodes (SUPPLIER CODE * GRC NUMBER * BILL SL NO * SEQ) cannot be generated.';
  }
  return '';
}

/* Why ONE row cannot have a value, or '' when it can.

   The Bill Sl No. is the one part of the value the operator enters
   themselves, so a missing one is said in their terms: which item, and which
   column to fill in. Nothing is guessed in its place - not the quantity, not
   the row's position in the grid, not the barcode's own serial. A guess would
   put a wrong bill line on the goods, and the sticker outlives the screen. */
export function billSlNoProblem(row) {
  if (billSlNoForBarcode(row && row.billSlNo)) return '';
  const item = String((row && (row.itemCode || row.itemName)) || '').trim() || 'A row';
  return item + ' has no Bill Sl No., so its barcode value '
    + '(SUPPLIER CODE * GRC NUMBER * BILL SL NO * SEQ) cannot be made. Enter the Bill Sl No. '
    + "this item is received on - the GRC's Item Summary shows it - and submit again. "
    + 'Nothing was saved.';
}

const seqOf = (value) => (/^\d+$/.test(String(value ?? '').trim()) ? Number(value) : 0);

/* The highest SEQ among some barcodes (0 for none). */
export function highestSeq(units) {
  return (Array.isArray(units) ? units : []).reduce((max, unit) => Math.max(max, seqOf(unit?.seq)), 0);
}

/* The SEQ the next new barcode of a GRC takes: after the highest SEQ its
   barcodes carry; after the highest it ever gave (`floor` - the GRC keeps it
   as lastBarcodeSeq, so the value of a deleted barcode, whose label may still
   exist, is never given out again); and never below the number of barcodes it
   holds - barcodes made before SEQ was stored carry none, and 1 up to that
   count is left for them. */
export function nextSeqStart(units, floor = 0) {
  const list = Array.isArray(units) ? units : [];
  return Math.max(highestSeq(list), list.length, Number(floor) || 0) + 1;
}

/* Whether a stored barcode's value was composed by THIS rule - it carries a
   SEQ and a Bill Sl No., and its value starts
   "SUPPLIER_CODE * GRC_NUMBER * BILL_SL_NO * ".

   Two kinds of barcode answer false and are then left exactly as they are:
   one from the old Barcode Setting counter ("9A1135"), and one composed
   before the third part became the Bill Sl No., which carries a quantity
   there. A value that is already printed on goods is not rewritten to match
   a rule that came after it. */
export function hasComposedBarcode(row, { supplierCode, grcNumber } = {}) {
  const seq = seqOf(row?.seq);
  if (!seq) return false;
  const billSlNo = billSlNoForBarcode(row?.billSlNo);
  if (!billSlNo) return false;
  const stem = [String(supplierCode ?? '').trim(), grcNumberForBarcode(grcNumber), billSlNo].join(BARCODE_SEPARATOR) + BARCODE_SEPARATOR;
  return String(row?.barcodeNo || row?.barcodeGenerated || '').startsWith(stem);
}

/* THE SAME VALUE, AS A LABEL PRINTS IT.

   "G1318 * 05178 * 1 * 16" -> "G1318*05178*1*16"

   Display only, and only for the human-readable line: the spaces are closed
   up so the value fits beside the barcode number on a 50mm sticker, exactly
   as the reference label prints it. Nothing that is stored, scanned, encoded
   into bars or compared with another barcode goes through here - the stored
   string stays the stored string, spaces and all. */
export function displayBarcodeValue(value) {
  return String(value ?? '').trim().replace(/\s*\*\s*/g, '*');
}

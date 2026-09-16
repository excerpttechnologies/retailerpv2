/* Unit tests for lib/barcodeValue.js - the one barcode value format:

     SUPPLIER_CODE * GRC_NUMBER * BILL_SL_NO * SEQ   e.g. "G512 * 05173 * 5 * 1"

   The third part is the BILL SL NO. - the bill line the item was received on,
   as the GRC's Item Summary shows it against that item - and never the
   quantity. The tests below are written so that a quantity put back in that
   place fails them: every case uses a Bill Sl No. and a quantity that are
   different numbers.

   Run against the real module. No database, no server.

     npm run test:barcode-value */

import {
  composeBarcodeValue, grcNumberForBarcode, billSlNoForBarcode, barcodeValueProblem,
  billSlNoProblem, nextSeqStart, highestSeq, hasComposedBarcode,
} from '@/lib/barcodeValue';

let pass = 0;
let fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail !== '' ? '  -> ' + JSON.stringify(detail) : '')); }
};

console.log('--- the format ---');
const v = composeBarcodeValue({ supplierCode: 'G512', grcNumber: '05173', billSlNo: 5, seq: 1 });
ok('G512 / 05173 / bill line 5 / SEQ 1  ->  "G512 * 05173 * 5 * 1"', v === 'G512 * 05173 * 5 * 1', v);
ok('another item, bill line 16, SEQ 1', composeBarcodeValue({ supplierCode: 'G512', grcNumber: '05173', billSlNo: 16, seq: 1 }) === 'G512 * 05173 * 16 * 1');
ok('"GRC 05173" is written 05173', composeBarcodeValue({ supplierCode: 'G512', grcNumber: 'GRC 05173', billSlNo: 5, seq: 1 }) === 'G512 * 05173 * 5 * 1'
  && grcNumberForBarcode('grc05173') === '05173');
ok('the separator is exactly space-asterisk-space', v.split(' * ').length === 4 && !/[-/]/.test(v));
ok('a Bill Sl No. is carried as it is typed, trimmed', billSlNoForBarcode(' 007 ') === '007' && billSlNoForBarcode(5) === '5');
ok('text around the parts is trimmed', composeBarcodeValue({ supplierCode: ' G512 ', grcNumber: ' 05173 ', billSlNo: ' 5 ', seq: ' 2 ' }) === 'G512 * 05173 * 5 * 2');
ok('a missing part gives no value, never a shorter one',
  ['supplierCode', 'grcNumber', 'billSlNo', 'seq'].every((k) => composeBarcodeValue({ supplierCode: 'G512', grcNumber: '05173', billSlNo: 5, seq: 1, [k]: '' }) === ''));

console.log('--- the quantity is NOT in the value ---');
/* The case the whole change is about: 16 metres received against bill line 5.
   The value carries the 5. */
ok('16 received on bill line 5 is "* 5 * 1", not "* 16 * 1"',
  composeBarcodeValue({ supplierCode: 'G512', grcNumber: '05173', billSlNo: '5', qty: '16', seq: 1 }) === 'G512 * 05173 * 5 * 1');
ok('37 received on bill line 16 is "* 16 * 1"',
  composeBarcodeValue({ supplierCode: 'G512', grcNumber: '05173', billSlNo: '16', qty: '37', seq: 1 }) === 'G512 * 05173 * 16 * 1');
ok('a quantity alone cannot make a value', composeBarcodeValue({ supplierCode: 'G512', grcNumber: '05173', qty: '16', seq: 1 }) === '');

console.log('--- several barcodes of one bill line ---');
/* One bill line cut into three pieces: same Bill Sl No., its own SEQ each, so
   every value is still unique. */
const cuts = [{ billSlNo: '5', qty: '16' }, { billSlNo: '5', qty: '16' }, { billSlNo: '5', qty: '89' }];
let seq = nextSeqStart([]);
const values = cuts.map((cut) => composeBarcodeValue({ supplierCode: 'G512', grcNumber: '05173', billSlNo: cut.billSlNo, seq: seq++ }));
ok('three barcodes of bill line 5 are SEQ 1, 2, 3 and all different',
  JSON.stringify(values) === JSON.stringify(['G512 * 05173 * 5 * 1', 'G512 * 05173 * 5 * 2', 'G512 * 05173 * 5 * 3'])
  && new Set(values).size === 3, values);
ok('their differing quantities change nothing', new Set(cuts.map((cut) => cut.qty)).size === 2);

console.log('--- SEQ ---');
ok('a GRC with no barcodes starts at 1', nextSeqStart([]) === 1);
ok('after SEQ 1..3 comes 4', nextSeqStart([{ seq: '1' }, { seq: '2' }, { seq: '3' }]) === 4);
ok('barcodes made before SEQ keep 1..count: 3 old ones -> the next new is 4', nextSeqStart([{ seq: '' }, { seq: '' }, { seq: '' }]) === 4);
ok('a deleted barcode\'s SEQ is not given again (lastBarcodeSeq)', nextSeqStart([{ seq: '1' }, { seq: '2' }], 5) === 6);
ok('highestSeq ignores text that is not a SEQ', highestSeq([{ seq: '7' }, { seq: 'abc' }, { seq: '' }, {}]) === 7);

console.log('--- which stored barcodes follow the rule ---');
const parts = { supplierCode: 'G512', grcNumber: 'GRC 05173' };
ok('a value composed by this rule does', hasComposedBarcode({ seq: '2', billSlNo: '5', barcodeNo: 'G512 * 05173 * 5 * 2' }, parts));
ok('an older counter number does not, even with a SEQ', !hasComposedBarcode({ seq: '2', billSlNo: '5', barcodeNo: '9A1136' }, parts)
  && !hasComposedBarcode({ seq: '', billSlNo: '5', barcodeNo: '9A1136' }, parts));
ok('a value of another GRC or supplier does not', !hasComposedBarcode({ seq: '2', billSlNo: '5', barcodeNo: 'G1087 * 05177 * 5 * 2' }, parts));
/* Barcodes printed before the third part became the Bill Sl No. carry a
   quantity there. They are not this rule's, so nothing recomposes them and the
   sticker on the goods stays the truth. */
ok('a value composed when the third part was the quantity does not',
  !hasComposedBarcode({ seq: '1', billSlNo: '5', qty: '16', barcodeNo: 'G512 * 05173 * 16 * 1' }, parts));
ok('a row with no Bill Sl No. does not', !hasComposedBarcode({ seq: '2', billSlNo: '', barcodeNo: 'G512 * 05173 *  * 2' }, parts));

console.log('--- refusals ---');
ok('no supplier code: refused, and says so', /supplier code/i.test(barcodeValueProblem({ supplierCode: '', grcNumber: '05173' })));
ok('no GRC number: refused', /GRC number/i.test(barcodeValueProblem({ supplierCode: 'G512', grcNumber: 'GRC ' })));
ok('both present: fine', barcodeValueProblem(parts) === '');
ok('no Bill Sl No.: refused, and names the item and the column',
  /Bill Sl No/i.test(billSlNoProblem({ itemCode: '10-PLNBTM', qty: '16' }))
  && /10-PLNBTM/.test(billSlNoProblem({ itemCode: '10-PLNBTM', qty: '16' })));
ok('a row with a Bill Sl No. is fine, whatever its quantity', billSlNoProblem({ itemCode: '10-PLNBTM', billSlNo: '5', qty: '16' }) === '');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

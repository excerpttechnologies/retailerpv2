/* Inter Company Reverse Delivery Challan - field spec.

   The header, grid, line maths and totals are the same as the Inter Company
   Delivery Challan, so they are imported rather than restated: one set of
   rules, one place to change them. Only the document label differs.

   Plain module (no 'use client'), so the API routes import the same spec the
   form uses. */

export {
  FIELDS, TOTAL_KEYS, GRID_COLS, COMPACT_GRID_COLS, INFO, BLANK_ROW,
  computeLine, computeTotals, num, r2, money,
} from '../deliverychallan/fields';

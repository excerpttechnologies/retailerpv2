# Test report — run against a live MongoDB

Not just compiled. A real `mongod` was started, seeded, `next start` served the
app, and every result below came from HTTP calls against it.

```
✓ Compiled successfully
✓ Generating static pages (143/143)
```

## Results

| Area | Result |
|---|---|
| Seed on empty DB | admin user + business + 2 locations + 18 ledger groups + catalogs + cities |
| Login | 200, session cookie set |
| API without cookie | **401** |
| `/admin` without cookie | **307** to `/login` |
| Forged session cookie | **307** — rejected |
| Regex-injection search `(a+)+$` | 200, treated as a literal (escaped) |
| 37 page routes rendered | **0 failures** |
| 6 removed pages | all **404** |
| 6 removed API routes | all **404** |
| Removed refs in `/api/options` | return empty |
| 25 remaining refs in `/api/options` | all resolve |
| Create (ledger group, ledger, uom, hsn, product group, item, logistic) | all created |
| Validation on empty body | **422** with per-field messages |
| Edit (PUT) | 200, and the document number was **not** overwritten |
| Delete | 200, then GET → 404 |
| Doc numbering from Doc Setup | `TFJ/26/0101`, `TFJ/26/0102` |
| **Contact ID sequence** | G1…G12, **12 unique of 12** — passes G10 |
| **GRC → Purchase Invoice** | unconverted 2 → 1 |
| **Delivery Challan → Sales Invoice** | unconverted 1 → 0, customer filter applied |
| Single-doc upserts (mapping, voucher, choice table, loyalty) | saved and read back |
| Line items | stored and read back |
| Dashboard tiles | Total Sales 2400 ✓ · Expenses 7500 ✓ (walks sub-groups) · charts ✓ |

## Two bugs the live run caught that the build did not

**1. Totals fields were silently dropped on every save.**
API validation derived its field list only from `type: 'fields'` cards, so the
`totals` card's real stored numbers — `taxableValue`, `roundOff`, `netValue`,
`discountPercent`, `roundOffDiscountAmt` — were stripped by `validate()` and
never written. A sales invoice saved with `netValue: 1500` came back with no
`netValue` at all. Fixed in **20 route files**; the field list now includes
totals rows, as the original `collectFields()` did.

**2. `aggregate()` does not cast ObjectIds.**
`find()` and `countDocuments()` cast a string id against the schema;
`aggregate()` does not. The dashboard passed `businessId` through as a raw
string, so every `$match` in an aggregation matched nothing — Total Sales,
Expenses and both charts read zero while Total Purchase (a `countDocuments`
call) looked fine. This was a regression I introduced when rewriting the
dashboard without the old `lib/scope.js` helper. Scope ids are now converted
with `new mongoose.Types.ObjectId()`.

Both were invisible to `next build` and to reading the code. Only running it
surfaced them.

## Not covered by these tests

- Browser UI: no clicks, no form submissions through React — routes were
  exercised over HTTP. Rendering was checked only by 200 status.
- Concurrency: document numbering still has a race between count and insert.
- Scale: tested with tens of rows, not the 56k customers the original carries.
- POS till: renders, but Hold / Multiple Pay / Recent Transactions persist
  nothing (unchanged — was never implemented).
- Line-item maths: still computed nowhere. Grids store what they're given.

# Reports module

Thirteen read-only screens under **Reports** in the sidebar, matched to
`erp.orbiteerp.com/admin/reports/*`.

Nothing is entered here. Every report is a filter card over one or more
tables, and every figure is computed at read time from documents other modules
created — the same approach **Ledger Transaction** and the **notification
bell** take.

---

## The thirteen screens

| Screen | Route | Sourced from | Has data today |
|---|---|---|---|
| Barcode Report | `/admin/reports/barcode-report` | `BarcodeLabel` + `Grc` | ✅ yes |
| Receipt Voucher Report | `/admin/reports/receipt-voucher-report` | `Voucher` (Receipt) | ✅ yes |
| Payment Voucher Report | `/admin/reports/payment-voucher-report` | `Voucher` (Payment) | ✅ yes |
| Sales Analysis | `/admin/reports/sales-analysis` | Sales + Returns + POS | ⚠️ groups only |
| Sales Report | `/admin/reports/sales-report` | Sales + `BarcodeLabel` for cost | ❌ empty |
| Sales Person | `/admin/reports/sales-person` | `DeliveryChallan` + Sales + POS | ⚠️ rows only |
| POS Summary | `/admin/reports/pos-summary` | `PosInvoice` + `PosCounter` | ❌ empty |
| POS Report | `/admin/reports/pos-report` | `PosInvoice` | ❌ empty |
| POS Credit Note | `/admin/reports/pos-credit-note` | `PosReturn` | ❌ empty |
| Item Stock | `/admin/reports/item-stock` | `BarcodeLabel` + `Item` | ✅ yes |
| Supplier Bill Report | `/admin/reports/supplier-bill` | `Grc` + `Grt` | ✅ yes |
| Supplier Outstanding | `/admin/reports/supplier-outstanding` | `PurchaseInvoice` + `DebitNote` | ✅ yes |
| Customer Outstanding | `/admin/reports/customer-outstanding` | `PosInvoice` + `PosReturn` | ❌ empty |

"⚠️ groups only" means the grouping and the joins work and the rows appear —
the money and quantity columns read 0.00. See **Known limits**.

Everything is scoped by the Business, Location and Financial Year in the top
bar, like every other screen.

Five reports carry **tabs**, sharing one set of filters:

- **Sales Person** — General (grouped by location) · Bill Wise view
- **POS Report** — Bill-wise · Item-wise
- **Item Stock** — Group Wise Summary · Group Wise Detailed · Item Wise Summary
- **Supplier Outstanding** — Supplier-wise Summary · Detailed *(tabs above the filters)*
- **Customer Outstanding** — Customer-wise Summary · Detailed *(tabs above the filters)*

---

## Files

Full manifest with line counts is in **`README-REPORTS.md`**. In short:

```
components/ReportView.jsx        506   the whole UI
lib/reports.js                   211   shared helpers only
app/api/reports/<slug>/route.js  ×13   one route per report
app/admin/reports/<slug>/        ×13   fields.js + page.jsx per report
config/nav.js                          the only existing file changed
```

34 files created, 1 changed, 0 deleted, 3,574 lines of code.

See `README-REPORTS.md` for the full file manifest and the note about
reading the `config/nav.js` diff.

---

## Architecture

There is **no registry**. Each report owns its own REST route, the way every
other screen in this project does since the restructure — see
`README-RESTRUCTURE.md`.

```
app/admin/reports/<slug>/fields.js   the spec: filters, tiles, columns
app/admin/reports/<slug>/page.jsx    <ReportView spec={REPORT} />
app/api/reports/<slug>/route.js      the query, GET only
```

`lib/reports.js` holds only what more than one route needs. It decides
nothing about which report runs.

### Adding a report

Three files, no wiring:

1. `app/admin/reports/<slug>/fields.js` — export a `REPORT` spec.
2. `app/admin/reports/<slug>/page.jsx` — nine lines, renders `ReportView`.
3. `app/api/reports/<slug>/route.js` — `requireSession()`, query, return
   `{ tiles, sections, total, pages }`.
4. One entry in `config/nav.js`.

The spec shape:

```js
export const REPORT = {
  slug: 'receipt-voucher-report',
  title: 'Receipt Voucher Report',
  subtitle: '...',            // optional - adds the page heading
  hint: '...',                // optional - small note beside the buttons
  searchOnly: true,           // optional - stay empty until Search is pressed
  paginated: false,           // optional - for multi-table reports
  perPage: 15,

  filters: [
    { k: 'location', label: 'Business Location', type: 'ref',
      ref: 'companylocations', all: 'All Locations' },
    { k: 'fromDate', label: 'Date From', type: 'date', req: true, def: '-1month' },
    { k: 'toDate',   label: 'Date To',   type: 'date', req: true, def: 'today' },
  ],

  tiles: [{ k: 'totalSaleQty', label: 'Total Sale Qty', icon: 'box', cls: 'bg-[#a9dfe8]' }],

  sections: [{
    key: 'receipts',
    title: 'Sales Summary',   // optional
    totalsRow: true,
    columns: [
      { k: 'voucherNo', t: 'Voucher No' },
      { k: 'total', t: 'Total Amount', f: 'amount', total: true },
    ],
  }],
};
```

Filter types: `ref` (a MultiSelect off `/api/options`; add `multi: true` for a
multi-select), `select`, `date`, `text`. `req: true` gates the search and, on a
`select`, suppresses the clear option. `def` accepts `today` and `-1month`.

Five optional shapes cover everything the thirteen reports needed:

| Key | What it does | Used by |
|---|---|---|
| `tabs` | Two or more views over one set of filters. The active tab is sent to the API as `tab`, and each tab carries its own `tiles` and `sections`. | Sales Person, POS Report |
| `dynamicSections` | The API decides how many tables come back and names each one — for rows grouped by something only known at read time. Columns come from `sections[0]`. | Sales Person (per location) |
| `grandTotal` | A separate totals table under the last table, for reports totalling across their groups. | Sales Person |
| `searchOnly` | Stay empty until Search is pressed. | Barcode Report |
| `tabsPosition: 'top'` | Put the tab strip above the filter card, for reports where each tab is a different question. | Supplier / Customer Outstanding |

A report with three tables is three `sections` (Sales Analysis). One with stat
tiles sets `tiles` (Sales Report, POS Report). No report needs its own
component.

---

## Rules the routes enforce

Server-side, so they hold if the form is bypassed:

- **Every route calls `requireSession()` first** and returns 401 without a
  valid session cookie.
- **Required filters are re-checked**, not just on the form — a missing Item
  Code or date range returns **422** with the message the filter card shows.
- **Totals cover the whole result set**, not the page on screen. The rows are
  paginated; the totals row is not.
- Search terms go through `escapeRegex()`.

---

## Two things worth knowing

### Bank / Cash / UPI is derived, not stored

A voucher line names a **ledger**, not a payment rail. The split is worked out
from the ledger's own name and then its group chain — "HDFC Bank" is Bank,
"Cash on Hand" is Cash, "PhonePe" is UPI. UPI is tested first because it is
the most specific. Same cycle-safe parent walk `/api/voucher/ledgers` uses.

The Payment report has no UPI column, so a UPI payment reads as Bank there —
which is what it is from the supplier's point of view.

### Advance / Settlement Status always reads the same

`Voucher.adjustedAmount` is hardcoded 0 because invoice allocation was never
built. So Advance Amount always equals the total, and the status column always
reads **Advance** (receipt) or **On Account** (payment).

All three states — Advance / Partly Adjusted / Fully Adjusted — are computed
properly, so the column is correct the moment allocation lands. Nothing here
needs changing then.

---

### "Cashier" on POS Summary is really the POS counter

`PosInvoice` stores `counterId` and **no user field at all** — the only record
of a person on a till in this project is `CashRegister.openedBy`, and that
belongs to the register session rather than to the bill. So POS Summary groups
by counter and labels the column Cashier Name, which is the closest honest
reading. If a cashier field is added to `PosInvoice`, change the two
`counterId` references in that route and nothing else moves.

### The ALL row on Sales Person is not a placeholder

Only `DeliveryChallan` carries `salesPersonId`. `SalesInvoice`, `PosInvoice`
and both return models do not, so anything raised through those has no
salesperson to attribute and lands in a row called **ALL**. The deployed
report shows the same row, for the same reason.

---

## Known limits

**Sales Report, POS Summary, POS Report and POS Credit Note return no rows,
and Sales Analysis / Sales Person return rows whose money columns are 0.00.**
This is a data-capture gap upstream, not a fault in the reports:

- The Sell screens go through `TransactionFormView`'s `scan` card, whose
  `ScanRow` stores only `{ 'Item Code', 'Item Name' }` per line. No quantity,
  rate, tax or cost is captured anywhere in the Sell chain.
- The POS till never posts — `PosTill` issues only GET requests, and nothing
  in the codebase writes to `/api/sell-pos`.
- Cost exists only as `BarcodeLabel.finalNet` / `purRate`, and sales lines
  carry no barcode reference to join on.

The aggregations are written against the shape a line *should* have, and read
both proper field names (`itemCode`, `qty`) and the display-label keys the
generic screens currently write (`'Item Code'`, `'QTY'`), so both reports fill
in the moment either is populated.

A live run against the seeded database showed this precisely: Sales Analysis
resolved the location name, joined item `2323` → "Maharanni" → group
"3 PC SET" and counted 1 bill — **every join worked, every money figure was
0.00.**

Closing it means adding quantity and rate inputs to the Sell line grids and
making the POS till persist. That is separate work.

**Exports carry the page on screen**, not the whole result set — the same
limitation every other list in this project has. Multi-table reports export
the first table.

**Each source is capped at 5,000 rows.** Merging and totalling happens in
application memory, the same trade-off `/api/ledger-transaction` makes.

**Tenant scope is not bound to the session.** Business and location arrive
from the request, matching the convention of the other 141 routes. A
project-wide item, not specific to this module.

---

## Three deliberate differences from the deployed screens

All three are copy-paste slips on the live site. Each is a one-line change in
the relevant `fields.js` if you would rather mirror it exactly. Same call the
Stock Transfer view made about its two swapped totals.

| Deployed | Here | Why |
|---|---|---|
| Sales Analysis → "Top 5 Item wise" headed **"Group Name"** | **Item Name** | Copy-paste from the table above it |
| Sales Person card headed **"Stock Summary Report"** | **Sales Person Report** | Copy-paste from another report |
| POS Credit Note filters on **Business** | **Business Location** | A second Business selector fights the one in the top bar, which already scopes the query |

---

## Testing it

```bash
npm install
npm run dev          # sign in: s@gmail.com / s@gmail.com
```

### Barcode Report
`Inventory → Barcode Generation`, enter an item code, **Generate All**,
**Submit**. Open the report, type that code, **Search**.

Expect the barcode rows with pur rate, the four prices and the GRC number.
*Verified against the seeded data: 11 rows for `maharanni`, barcodes
`pr0131su`–`pr0133su`, pur rate 7779.50, GRC `0035`.*

### Receipt Voucher Report
`Masters → Ledger` — create a customer ledger under Sundry Debtors and
"Cash on Hand" under Cash Accounts. `Voucher → Receipt Vouchers → ADD`,
Cr customer 5000, Dr cash 5000, Submit. Open the report.

Expect `RV/26/00001`, Total 5000.00, **Cash 5000.00**, Bank 0.00, Advance
5000.00, and a totals row that sums.

### Payment Voucher Report
Same, using **Add Discount**: Dr supplier 5000, Cr bank 4800, Cr discount 200.

Expect Bank 4800.00, **Discount 200.00**, On Account 5000.00.

### Filters
Date From and Date To are required — searching without them shows the message
rather than an empty table. A range that excludes the voucher returns "No data
found". **Reset** restores the defaults.

### Scope
Switch the top-bar Business. Rows belonging to the other branch disappear.

### Sales Analysis / Sales Report
Render with the right filters, tiles and headers, and report "No data found".
That is expected — see Known limits.

# Reports module — file manifest

Every file created and every existing file changed while building the Reports
module.

**Thirteen reports built. 34 files created · 1 file changed · 0 files deleted.**

| # | Report | Route |
|---|---|---|
| 1 | Barcode Report | `/admin/reports/barcode-report` |
| 2 | Receipt Voucher Report | `/admin/reports/receipt-voucher-report` |
| 3 | Payment Voucher Report | `/admin/reports/payment-voucher-report` |
| 4 | Sales Analysis | `/admin/reports/sales-analysis` |
| 5 | Sales Report | `/admin/reports/sales-report` |
| 6 | Sales Person | `/admin/reports/sales-person` |
| 7 | POS Summary | `/admin/reports/pos-summary` |
| 8 | POS Report | `/admin/reports/pos-report` |
| 9 | POS Credit Note | `/admin/reports/pos-credit-note` |
| 10 | Item Stock | `/admin/reports/item-stock` |
| 11 | Supplier Bill Report | `/admin/reports/supplier-bill` |
| 12 | Supplier Outstanding Report | `/admin/reports/supplier-outstanding` |
| 13 | Customer Outstanding Report | `/admin/reports/customer-outstanding` |

---

## NEWLY CREATED FILES — 34

### 1. Shared code — 2 files

| # | File | Lines | What it is |
|---|---|---|---|
| 1 | `components/ReportView.jsx` | 506 | The entire report UI: filter card, tabs, stat tiles, one or more result tables, grouped sections, totals row, grand total, CSV / Excel / Print exports, paging. Every report screen renders this. |
| 2 | `lib/reports.js` | 211 | Shared helpers only — scope parsing, date range, paging, line-item readers, Bank/Cash/UPI ledger classification, sales-document fetch, cost-per-item lookup. Decides nothing about which report runs. |

### 2. API routes — 13 files, one per report

| # | File | Lines |
|---|---|---|
| 3 | `app/api/reports/barcode-report/route.js` | 88 |
| 4 | `app/api/reports/receipt-voucher-report/route.js` | 115 |
| 5 | `app/api/reports/payment-voucher-report/route.js` | 120 |
| 6 | `app/api/reports/sales-analysis/route.js` | 172 |
| 7 | `app/api/reports/sales-report/route.js` | 163 |
| 8 | `app/api/reports/sales-person/route.js` | 208 |
| 9 | `app/api/reports/pos-summary/route.js` | 101 |
| 10 | `app/api/reports/pos-report/route.js` | 203 |
| 11 | `app/api/reports/pos-credit-note/route.js` | 65 |
| 12 | `app/api/reports/item-stock/route.js` | 205 |
| 13 | `app/api/reports/supplier-bill/route.js` | 168 |
| 14 | `app/api/reports/supplier-outstanding/route.js` | 175 |
| 15 | `app/api/reports/customer-outstanding/route.js` | 163 |

### 3. Screens — 26 files, one spec + one page per report

| # | File | Lines |
|---|---|---|
| 16 | `app/admin/reports/barcode-report/fields.js` | 43 |
| 17 | `app/admin/reports/barcode-report/page.jsx` | 9 |
| 18 | `app/admin/reports/receipt-voucher-report/fields.js` | 47 |
| 19 | `app/admin/reports/receipt-voucher-report/page.jsx` | 9 |
| 20 | `app/admin/reports/payment-voucher-report/fields.js` | 47 |
| 21 | `app/admin/reports/payment-voucher-report/page.jsx` | 9 |
| 22 | `app/admin/reports/sales-analysis/fields.js` | 69 |
| 23 | `app/admin/reports/sales-analysis/page.jsx` | 9 |
| 24 | `app/admin/reports/sales-report/fields.js` | 59 |
| 25 | `app/admin/reports/sales-report/page.jsx` | 9 |
| 26 | `app/admin/reports/sales-person/fields.js` | 81 |
| 27 | `app/admin/reports/sales-person/page.jsx` | 9 |
| 28 | `app/admin/reports/pos-summary/fields.js` | 43 |
| 29 | `app/admin/reports/pos-summary/page.jsx` | 9 |
| 30 | `app/admin/reports/pos-report/fields.js` | 90 |
| 31 | `app/admin/reports/pos-report/page.jsx` | 9 |
| 32 | `app/admin/reports/pos-credit-note/fields.js` | 41 |
| 33 | `app/admin/reports/pos-credit-note/page.jsx` | 9 |
| 34 | `app/admin/reports/item-stock/fields.js` | 96 |
| 35 | `app/admin/reports/item-stock/page.jsx` | 9 |
| 36 | `app/admin/reports/supplier-bill/fields.js` | 45 |
| 37 | `app/admin/reports/supplier-bill/page.jsx` | 9 |
| 38 | `app/admin/reports/supplier-outstanding/fields.js` | 76 |
| 39 | `app/admin/reports/supplier-outstanding/page.jsx` | 9 |
| 40 | `app/admin/reports/customer-outstanding/fields.js` | 70 |
| 41 | `app/admin/reports/customer-outstanding/page.jsx` | 9 |

### 4. Documentation — 3 files

| File | What it is |
|---|---|
| `REPORTS-MODULE.md` | The module doc — how it works, how to add a report, the rules the routes enforce, known limits, click-by-click testing. Same style as `VOUCHER-MODULE.md`. |
| `README-REPORTS-STEPS.md` | Step-by-step: which screen to fill in first so each report has data. Plain language. |
| `README-REPORTS.md` | This manifest. |

**Code total: 3,574 lines across 32 files** (plus the 3 docs).

---

## EXISTING FILES CHANGED — 1

| File | What changed |
|---|---|
| `config/nav.js` | **(a)** Added the `Reports` group after Inter Company Sell with all thirteen entries. **(b)** Removed the dead `// { label: 'Reports', … children: [] }` stub it replaces. |

No new icon imports — `LuChartNoAxesColumn`, `LuBarcode`, `LuBadgeIndianRupee`,
`LuWalletCards`, `LuFileText`, `LuUserRound`, `LuMonitor`, `LuStore` and
`LuFileMinus` were all already imported by that file.

> ⚠️ **Reading the diff on this file.** `config/nav.js` already carried
> uncommitted changes from earlier work before this module touched it, so
> `git diff config/nav.js` reports several hundred changed lines against the
> first commit. Only the Reports group (~30 lines) and the removed stub belong
> to this change.

---

## FILES NOT TOUCHED

Worth stating explicitly, because it bounds what this change can break:

- **No model was created or modified.** `models/` is untouched — there is no
  `Report` model. Reports read `BarcodeLabel`, `Grc`, `Voucher`, `Ledger`,
  `LedgerGroup`, `CompanyLocation`, `Contact`, `Item`, `ProductGroup`,
  `PosCounter`, `DeliveryChallan`, `SalesInvoice`, `SalesReturn`, `PosInvoice`
  and `PosReturn` as they are.
- **No existing component was modified.** `ListView`, `FormView`,
  `TransactionFormView`, `Field`, `MultiSelect`, `Toolbar`, `ScopeContext`
  and the rest are unchanged.
- **No existing API route was modified.** All 141 pre-existing routes are
  untouched; the 13 report routes are additions.
- **No existing lib module was modified.** `lib/reports.js` is new;
  `lib/format.js`, `lib/session.js`, `lib/validate.js`, `lib/refLabels.js`
  and `lib/barcodeLabel.js` are imported as-is and unchanged.
- **No CSS was written.** Everything uses the classes already in
  `app/globals.css`.
- **Nothing was deleted** from the project.

---

## Existing files this module IMPORTS (unchanged)

| Imported from | Used for |
|---|---|
| `lib/format.js` | `fmt`, `toCsv`, `toXlsHtml`, `download`, `printTable` |
| `lib/session.js` | `requireSession()` — first line of every report route |
| `lib/validate.js` | `escapeRegex()` on search terms |
| `lib/db.js` | `dbConnect()` |
| `lib/barcodeLabel.js` | the `BarcodeLabel` model |
| `components/Icon.jsx` | all report icons |
| `components/MultiSelect.jsx` | `ref` filters, single and multi |
| `components/ScopeContext.jsx` | `useScope()` — business / location / financial year |
| `components/useOptions.js` | dropdown options via `/api/options` |
| `app/globals.css` | `.card` `.dt` `.f-input` `.f-label` `.pill` `.flash` |

---

## Verification run

- `npm run build` — compiled successfully; all 26 routes present (13 pages + 13 APIs).
- **All 13 API routes return 401** without a session cookie, **200** with one.
- Missing required filters return **422** with the message the form shows.
- Against the live database:
  - **Barcode Report** — 11 real rows for item `maharanni` (barcodes
    `pr0131su`–`pr0133su`, pur rate 7779.50, GRC `0035`).
  - **Receipt Voucher** — `RV/26/00001`, Total 3.00, Bank 3.00, Advance.
  - **Payment Voucher** — `PV/26/00001`, Total 1.00, Bank 1.00, On Account.
  - **Sales Person / General** — grouped under `TEMPLE FABRICS WAREHOUSE`
    with an `ALL` row and a real salesperson (`DIRECT-DIRECT`) resolved from a
    Delivery Challan. **Bill Wise view** — 3 document rows. Both tabs switch
    server-side.
  - **Sales Analysis** — resolved the location, joined item `2323` →
    "Maharanni" → group "3 PC SET", counted 1 bill.
  - **POS Report / Summary / Credit Note** — 0 rows, no POS data exists.

`npm install` was also run, because `node_modules/` was absent and the build
could not be verified without it. That is the only other thing that wrote to
disk.

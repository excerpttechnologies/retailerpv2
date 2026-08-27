# ERP restructure — complete

The registry system is gone. Every screen is now a real folder with its own
`page.jsx`, its own model file, and its own REST route — the Kisan Partner shape.

## Final counts

| | |
|---|---|
| `page.jsx` | 125 |
| `models/*.js` | 55 |
| `app/api/**/route.js` | 100 |
| `components/` | 10 |
| `lib/` | 6 |
| `config/` | **1** (`nav.js`) |
| total | 344 files |

## Structure

```
app/
  admin/
    setting/<page>/          page.jsx · fields.js · add/page.jsx · [id]/page.jsx
    contact/<page>/          page.jsx · tabs.js  · add/page.jsx · [id]/page.jsx
    inventory/<page>/        page.jsx · fields.js|form.js · add/ · [id]/
    transaction/purchase/<page>/   page.jsx · form.js · add/ · [id]/
    transaction/sell/<page>/       page.jsx · form.js · add/ · [id]/
    logistic/                page.jsx · fields.js · [id]/
    pos/add/                 page.jsx  (full-screen till)
  api/<resource>/            route.js (GET list, POST create)
  api/<resource>/[id]/       route.js (GET one, PUT, DELETE)
models/                      one file per model, PascalCase
components/                  ListView FormView ModalForm TabbedFormView
                             TransactionFormView SingleFormView MappingView
                             VoucherSettingsView ChoiceTableView PosTill
lib/                         db auth session validate refs docnumber contactId format
config/nav.js                sidebar only
```

URLs are unchanged. `middleware.js` still gates `/admin/*`.

## DELETE THESE once you've smoke-tested

```
config/settingsRegistry.js
config/contactsRegistry.js
config/inventoryRegistry.js
config/logisticRegistry.js
config/purchaseRegistry.js
config/sellRegistry.js
config/registry.js
lib/models.js
lib/validate.js            (old signature — replaced)
lib/scope.js
app/api/settings/[action]/route.js
app/admin/setting/[...slug]/page.js
app/admin/contact/[...slug]/page.js
app/admin/inventory/[...slug]/page.js
app/admin/transaction/[...slug]/page.js
app/admin/logistic/page.js     (replaced by the new folder)
app/admin/pos/add/page.js      (replaced by page.jsx)
```

Nothing left imports them. Delete only after testing — every component still
carries a legacy fallback path that uses `/api/settings` when a page passes no
`cfg.endpoint`, and that fallback is the safety net if a page was missed.

## Bugs fixed during the port

1. **API had no authentication.** `middleware.js` matches only `/admin/*`, so
   `/api/settings/[action]` was fully reachable signed-out — read, write and
   delete on every tenant. All 100 routes now call `requireSession()` first.
2. **Save redirect.** `FormView` hardcoded `'/admin/setting/' + slug`, so saving
   an Inventory Item landed on "Page not registered". Uses `basePath` now.
3. **Regex injection.** Search went into `$regex` unescaped — `(a+)+$` is a
   ReDoS. Escaped via `escapeRegex()`.
4. **Contact ID duplicates.** Sorted `contactId` as a string, so past `G9` every
   new contact got `G10`. Now sorts on the numeric part.
5. **Grid first column** always showed the row index, destroying `Item Code`,
   `Item Name` and `DC Code` in five grids. Index only for real `Sl No` columns.
6. **Document numbering** counted across all tenants and years, so two
   businesses sharing a prefix interleaved. Now scoped by business + finYear,
   and edits no longer overwrite an existing number.
7. **Sales Invoice DC list** ignored the customer filter and showed every
   customer's challans. `customerId` is honoured now.
8. **Modal-add pages had no edit route** — the row action pointed at a
   non-existent `/<slug>/<id>`. All six have `[id]/page.jsx`.
9. **Mongoose `ref:`** pointed at page slugs instead of model names.
10. **POS till hardcoded** the location name and cashier to one tenant. Both
    fetched now.
11. **Dead sidebar links.** Staff Management's three entries 404 — commented out
    in `config/nav.js` rather than shipped broken.

## Not fixed — behaviour changes, not restructuring

Flagged in the original audit, left alone deliberately:

- Line-item maths (taxable / GST split / net) still isn't computed anywhere.
- Debit Note has no Supplier field; Credit Note has no Customer field.
- Print Label's Barcode-setting dropdown refs the choice-table page, yielding
  one `(untitled)` option — should ref `barcodesetting`.
- `multiref` renders as a single-select in `Field.jsx`.
- Barcode Settings periods never persisted (the form posted `periods` outside
  `data`). The model has the sub-schema; the page still needs wiring.
- `useOptions` still calls `/api/settings/options?ref=<slug>` — the last thing
  tying the app to the old handler. Needs its own `/api/options` before you can
  delete that route.
- Exports still cover only the visible page of rows.
- Permission enforcement, stock balances, file uploads: unchanged.

## Order to test

1. `npm run seed`, sign in.
2. Settings → Business Masters: list, add, edit, delete.
3. A modal master (Inventory → Category) and a tabbed one (Contacts → Supplier)
   — check the generated Contact ID increments past 10.
4. Purchase → GRC, then Purchase Invoice: the GRC should disappear from the
   invoice's GRC List once converted.
5. Sell → Delivery Challan → Sales Invoice: same, and confirm only the selected
   customer's challans appear.

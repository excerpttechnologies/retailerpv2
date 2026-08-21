# Inter Company Sell

Moving goods between two of your own businesses, and the paperwork that follows
them. Five screens under **Inter Company Sell** in the sidebar.

---

## The flow

```
Business A (sender)                       Business B (receiver)
─────────────────────                     ─────────────────────

1. Delivery Challan          ──────►
   WH/DC/26/0001
        │
        │ pick unconverted challans
        ▼
2. Sales Invoice             ──────►      3. Auto Purchases Received
   TFJ/26/0001                                Pending → Receive
   + Tax Invoice / e-invoice print                  │
                                                    ▼
                                              creates a real GRC
                                              → Purchase → Goods Receipt Challan

5. Sales Return              ◄──────      4. Auto Purchases Return
   Pending → Accept                           WH/APR/26/0001
   ICSR/26/001
```

Two of the five are documents you create (**Delivery Challan**, **Auto
Purchases Return**). Two are inboxes showing what the *other* branch sent you
(**Auto Purchases Received**, **Sales Return**). One converts (**Sales
Invoice**).

**The top-bar business selector is "which branch am I standing in."** Half of
this flow is switching it. If a list looks empty, check that first.

---

## Part 0 — Setup (once)

### Step 1 · Two businesses

`Settings → Business Masters → ADD`

The seed creates one, flagged **Main Branch**. Create a second.

| Field | Business A | Business B |
|---|---|---|
| Name | Temple Fabrics *(seeded)* | Omshree Fabs |
| GSTIN | `29AANFT6295P1ZW` | `29AAGFO9624G1ZW` |

**GSTIN matters.** The first two digits are the state code, and that is what
decides the tax split:

- **same** first two digits → intra-state → **CGST + SGST**
- **different** (e.g. `29…` vs `33…`) → inter-state → **IGST**

Use two `29…` numbers to test CGST+SGST, or make B a `33…` to watch it switch
to IGST.

### Step 2 · A location for each business

`Settings → Company Locations → ADD`

⚠️ **This page saves against the top-bar business.** Do it twice:

1. Top bar = **A** → add A's location (e.g. Temple Fabric JNR)
2. **Switch top bar to B** → add B's location (e.g. Test)

Skipping the switch is the most common setup mistake — B's Location dropdown
then stays empty on every screen and there is nothing on-screen to explain why.

### Step 3 · Doc Setup rows

`Settings → Doc Setup → ADD`

⚠️ **Doc Setup is scoped by business AND financial year.** `nextDocNumber()`
looks up on both, so rows must exist under whichever branch raises the
document.

**Top bar = A:**

| Document Type | Prefix | Auto Number Length | Start From | Validity |
|---|---|---|---|---|
| Goods Receipt Challan | `WH/GRC/[YY]/` | 4 | 1 | Yearly |
| Inter Company Delivery Challan | `WH/DC/[YY]/` | 4 | 1 | Yearly |
| Inter Company Sales Invoice | `TFJ/[YY]/` | 4 | 1 | Yearly |

**Switch top bar to B, repeat:**

| Document Type | Prefix | Auto Number Length | Start From | Validity |
|---|---|---|---|---|
| Goods Receipt Challan | `OMS/GRC/[YY]/` | 4 | 1 | Yearly |
| Inter Company Sales Return | `OMS/APR/[YY]/` | 4 | 1 | Yearly |

B needs a **Goods Receipt Challan** row because receiving an invoice creates a
GRC in B's scope.

Prefix tokens: `[YY]` short year, `[YYYY]` full year, `[MMM]` short month,
`[FYY]` / `[FYYYY]` financial year.

> **If a document number comes out as a bare `0001` with no prefix**, the Doc
> Setup row for that type is missing under that business + financial year.
> Numbering falls back silently rather than erroring. Existing documents keep
> their numbers; add the row and new ones pick up the prefix.

### Step 4 · Item masters (top bar = A)

Each feeds the next, so keep the order:

| # | Screen | What to enter |
|---|---|---|
| 1 | `Settings → Tax Master` | Name "GST 5 %", **IGST 5, CGST 2.5, SGST 2.5** |
| 2 | `Settings → HSN Master` | Code e.g. `520811`, then add a **Tax Slab row** pointing at that tax |
| 3 | `Inventory → Unit of Measurement` | e.g. Pc(s) or Mtr |
| 4 | `Inventory → Group` | any product group |
| 5 | `Inventory → Item` | Item Code, HSN, UOM, **RSP Price** |
| 6 | `Settings → Stock Point Master` | e.g. Warehouse |

⚠️ **Fill all four tax fields**, not just IGST. If CGST and SGST are blank, an
intra-state challan computes zero tax while still showing "GST 5 %".

⚠️ **HSN tax slabs can only be added when creating**, not when editing. Get it
right first time or delete and re-create.

⚠️ **RSP is the unit rate.** Without it every line is 0.00 and all totals stay
zero.

### Step 5 · Barcode Settings (top bar = A)

`Settings → Barcode Settings → ADD`

Type **Periodic**, Sub Type **Yearly**, fill Prefix / Start Number / Number
Length, and set **Effective and Expiry dates that cover today**. Barcode
generation refuses to run without an active setting.

---

## Part 1 — Put stock into Business A

### Step 6 · Generate barcodes

Go to `/admin/inventory/barcode-generation` (also the **Barcode Generation**
button on the GRC list — it has no sidebar entry).

1. Type the **Item Code** → `Enter`
2. Choose **UNIQUE** (one barcode per piece) or **BATCH** (one for the lot)
3. **QTY** → `Enter` — UNIQUE splits into that many rows
4. Fill the shared fields (UOM, HSN, Pur Rate, GST %, prices)
5. **Generate All Barcodes**
6. **Submit**

This creates a **GRC + barcode rows**, and **those barcode rows are your
stock**. Not optional: the challan screen refuses any code without one.

---

## Part 2 — The flow

### Step 7 · Delivery Challan — top bar = **A**

`Inter Company Sell → Delivery Challan → ADD`

| Field | Value |
|---|---|
| Business * | **B** — the destination |
| Location Name * | B's location |
| Customer GSTN | auto-fills from B |
| Customer Address | auto-fills from B |
| DC Date * | today |
| Stock Point * | Warehouse |
| Sales Person / Agent / Sales Term / Logistic | optional |

Then in **Enter item code**: type the code → `Enter` / `F9` / `Tab`.

The row lands with Item Name, HSN, GST Slab, UOM, Unit Rate and **`(Max: n)`**
under QTY. Set QTY, and optionally Discount / R.Off Discount per line, plus
Discount(%) and RoundOff Discount(Amt) at the foot.

- Scanning the same code again **adds 1** to the existing row rather than
  opening a duplicate
- QTY above the max turns the box **red**
- Negative QTY is clamped to 0

**Submit** → `WH/DC/26/0001`.

**Line maths** (checked against a posted document on the live system):

```
Discount   = Unit Rate × Discount%
Final Rate = Unit Rate − Discount − R.Off Discount
Before Tax = Final Rate × QTY
GST        = Before Tax × each slab %
Net Amount = Before Tax + IGST + CGST + SGST
Net Value  = whole-rupee rounding of the document total
```

### Step 8 · Sales Invoice — top bar = **A**

`Inter Company Sell → Sales Invoice → ADD`

1. Business = **B**, Location = B's location
2. Unconverted challans for that destination appear in **Inter Company
   Delivery Challan List** — tick one or more
3. Their lines merge into the grid below; totals fill in
4. **Submit** → `TFJ/26/0001`

**Check the guard:** go back to Delivery Challan and click the pencil on that
challan. It should refuse with a **409** — it is claimed by the invoice.

### Step 9 · Print E-Invoice — top bar = **A**

Sales Invoice list → **Action ▾** → **Print E-Invoice**

Verify: letterhead (business + location + GSTIN), buyer block, per-UoM
quantity totals (`Total Qty (Pc(s)) : 2`), the money block, and the HSN
summary at the foot.

The layout switches between **Cgst./Sgst.** and a single **Igst.** column
automatically, based on the rates the lines carry.

**IRN / Ack No / Ack Date / QR are absent — that is correct.** The fields
exist on the model but nothing in this project calls an IRP. When a real
integration writes them, the block appears; `qrCode` should be a data URI.

### Step 10 · Receive — **switch top bar to B**

`Inter Company Sell → Auto Purchases Received`

The invoice sits in **Pending Auto Purchases Receiveds** → **Receive** →
confirm.

Three things happen, in order:

1. a **real GRC** is created in B's scope carrying the invoice's lines
2. the receipt record is written (`REC/26/001`)
3. the invoice is stamped as received

**Then check the part that matters:** `Purchase → Goods Receipt Challan`
(still on B) has a **new GRC**. The goods are now in B's normal purchase flow
and can be turned into a Purchase Invoice.

Back on **A**, the Sales Invoice list's **Received** column now reads
`Received` instead of `—`, and deleting that invoice is refused with a 409.

### Step 11 · Auto Purchases Return — top bar = **B**

B is holding the goods and sending them back.

`Inter Company Sell → Auto Purchases Return → ADD`

| Field | Value |
|---|---|
| Business * | **A** — where the goods are going back to |
| Location Name * | A's location |
| Supplier * | any contact |
| Stock Point * | required |
| Auto Purchase Return Date * | today |

Scan an item, set QTY, **Submit** → `OMS/APR/26/0001`.

### Step 12 · Accept the return — **switch top bar to A**

`Inter Company Sell → Sales Return`

The return is in **Pending Inter Company Sale Returns** → **Accept**.

It moves to **Accepted Inter Company Sale Returns** with `ICSR/26/001`. **Ref**
is B's Return No; **Return Code** is A's own.

Back on **B**, editing or deleting that return is now refused with a 409.

**Accepting a return creates nothing else** — no GRC, no Credit Note, no stock
movement. Goods returning to the branch that shipped them want a **Credit
Note**, which lives in the Sell module, and this route does not raise a
financial document without being asked. Ask and it can.

---

## Every guard in the module

| Action | Refused when | Code |
|---|---|---|
| Edit / delete a Delivery Challan | it is on a Sales Invoice | 409 |
| Delete a Sales Invoice | B has already received it | 409 |
| Receive an invoice twice | already received (race-safe) | 409 |
| Receive an invoice not addressed to you | wrong destination | 403 |
| Edit / delete an Auto Purchase Return | A has already accepted it | 409 |
| Accept a return twice | already accepted (race-safe) | 409 |
| Reverse a receipt | its GRC is on a Purchase Invoice | 409 |

Claims are guarded updates with rollback, so two people clicking **Receive**
at the same moment cannot produce two GRCs for one invoice.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Location dropdown empty | No Company Location under **that** business (Step 2) |
| Doc number is a bare `0001` | No Doc Setup row for that type under that business + FY |
| *"No GRC item found — receive it first"* | No barcode row for the code anywhere (Step 6) |
| *"No stock of X at this business / location"* | Barcode rows exist, but under a different business |
| Unit Rate is 0.00 | Item has no **RSP Price** |
| GST columns 0.00 on a 5% slab | Tax Master has CGST / SGST blank |
| Pending inbox empty | Top bar is the **sender**, not the destination — switch it |
| Action ▾ menu invisible | Old `ListView.jsx` — the menu was clipped by the table's scroll container |
| Edit / print 404s | The `[id]` (or `print/[id]`) folder is missing |

**Editing a master does not update a row already on screen.** Change an
item's RSP or a tax rate, then delete the grid row and scan it again.

---

## Known limits

**Stock is derived, not a ledger.** `(Max: n)` counts barcode rows received,
minus quantity committed to uninvoiced inter company challans. It does **not**
subtract POS sales, sales invoices, stock adjustments or GRTs — nothing in
this project writes a running balance. It reads high for anything that has
moved through the sell side. It is also scoped by **business only**, not
location: barcode rows store their location as a plain string that is often
blank, so filtering on it hides real stock. All of it lives in one function
(`availableQty` in `app/api/ic-delivery-challan/item-lookup/route.js`) — when
a real stock ledger lands, replace that and nothing else changes.

**Unit Rate is the item's RSP.** The Info box promises the customer's pricing
setup (RSP / WSP / DP / Profit on Sharing), but those fields live on
`Contact`, and an inter company document sells to a `Business`, which has no
pricing setup. To do it properly: either add the markup fields to `Business`,
or map each branch to a `Contact` through Business Contact Mapping — then swap
the one line in item-lookup.

**Tenant scope is not bound to the session.** Every route here takes
`businessId` from the request body, matching the convention of the other 111
routes in this project. The two inbox screens read *by destination*, which
makes this the first place the gap is reachable through the UI: a signed-in
user can pass any business id and see another branch's pending queue. Worth
fixing before this goes live — one change in `lib/session.js` plus a
mechanical pass over the routes.

**Discount prints as 0.00 on the e-invoice.** A challan's header discount is
folded into the stored line figures before the invoice copies them, so nothing
remains to show separately at invoice level. The line is kept for layout
fidelity.

---

## File map

```
models/
  IcDeliveryChallan.js  IcSalesInvoice.js  IcAutoPurchaseReceived.js
  IcAutoPurchaseReturn.js  IcSalesReturn.js

components/
  IcChallanForm.jsx        shared by Delivery Challan + Auto Purchase Return
  IcSalesInvoiceForm.jsx   challan picker + merged grid
  IcTaxInvoiceView.jsx     Tax Invoice / e-invoice print
  IcInboxView.jsx          shared by Auto Purchases Received + Sales Return
  ListView.jsx             (edited — Action ▾ menu no longer clipped)

app/admin/transaction/intercompanysell/
  deliverychallan/         fields.js  page.jsx  add/  [id]/
  salesinvoice/            fields.js  page.jsx  add/  [id]/  print/[id]/
  auto-purchases-received/ page.jsx
  auto-purchases-return/   fields.js  page.jsx  add/  [id]/
  salereturn/              page.jsx

app/api/
  ic-delivery-challan/        route.js  [id]/  item-lookup/
  ic-sales-invoice/           route.js  [id]/  [id]/print/
  ic-auto-purchase-received/  route.js  [id]/
  ic-auto-purchase-return/    route.js  [id]/
  ic-sales-return/            route.js

edited: config/nav.js · lib/refLabels.js · app/api/options/route.js
```

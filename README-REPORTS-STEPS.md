# Reports — step by step

Where the data comes from, in plain language.

A report never has its own data. You enter something on another screen, and
the report reads it back. So for every report the question is the same:
**which screen do I fill in first?**

This file answers that, one report at a time.

---

## Quick map

| Report | You must first fill in… |
|---|---|
| Barcode Report | Inventory → **Barcode Generation** |
| Receipt Voucher Report | Voucher → **Receipt Vouchers** |
| Payment Voucher Report | Voucher → **Payment Vouchers** |
| Sales Analysis | Sell → **Delivery Challan** or **Sales Invoice** |
| Sales Report | Sell → **Delivery Challan** + Barcode Generation (for cost) |
| Sales Person | Sell → **Delivery Challan** (with a Sales Person picked) |
| POS Summary | Sell → **POS** ⚠️ |
| POS Report | Sell → **POS** ⚠️ |
| POS Credit Note | Sell → **POS Return** ⚠️ |
| Item Stock | Inventory → **Barcode Generation** |
| Supplier Bill Report | Purchase → **Goods Receipt Challan** |
| Supplier Outstanding Report | Purchase → **Purchase Invoice** |
| Customer Outstanding Report | Sell → **POS** ⚠️ |

⚠️ = the POS till cannot save a sale yet, so these three stay empty no matter
what you do. Explained at the bottom.

**Before anything:** set the top bar — Business, Location, Financial Year.
Every screen and every report is filtered by those three. If a report looks
empty, check the top bar first.

---

# 1 · Barcode Report

**This one works fully today.**

### Set up the masters (once)

Each step fills a dropdown the next one needs, so keep the order.

1. **Masters → Tax Master** → ADD
   Name it "GST 5%". Fill **all four** boxes: IGST 5, CGST 2.5, SGST 2.5, Cess 0.
   *(If you leave CGST and SGST blank, tax comes out as zero later.)*
2. **Masters → HSN Master** → ADD
   Code e.g. `520811`, then add a **Tax Slab row** pointing at the tax above.
   *(Tax slabs can only be added while creating. You cannot add one later.)*
3. **Inventory → Unit of Measurement** → ADD — e.g. `PCS`.
4. **Inventory → Group** → ADD — any product group.
5. **Inventory → Item** → ADD
   Fill **Item Code**, HSN, UOM, and **RSP Price**.
   *(Without RSP, prices come out 0.00.)*
6. **Masters → Barcode Settings** → ADD
   Type **Periodic**, Sub Type **Yearly**. Fill Prefix, Start Number, Number
   Length, and set **Effective / Expiry dates that cover today**.
   *(Barcode Generation refuses to run without an active setting.)*

### Create the data

7. **Inventory → Barcode Generation**
   1. Type the **Item Code**, press **Enter**
   2. Choose **UNIQUE** (one barcode per piece) or **BATCH** (one for the lot)
   3. Type **QTY**, press **Enter**
   4. Fill UOM, HSN, Pur Rate, GST %, Retail Price
   5. Click **Generate All Barcodes**
   6. Click **Submit**

   This creates a **GRC** plus one **barcode row per piece**.

### Read the report

8. **Reports → Barcode Report**
   Type the same **Item Code**, click **Search**.

**You will see:** one row per barcode — Barcode, Item Code, Description, Qty,
UOM, HSN, Pur Rate, Final Net, GST %, Retail / Offer / WSP / DP Price, and the
**GRC No** it was received on.

> The page stays blank until you type an item code and press Search. That is
> deliberate — it reads one item at a time.

---

# 2 · Receipt Voucher Report

**This one works fully today.** Money coming *in* from a customer.

### Set up the ledgers (once)

1. **Masters → Ledger** → ADD
   Name: `Walk-in Customer`. Ledger Group: **Sundry Debtors**.
2. **Masters → Ledger** → ADD
   Name: `Cash on Hand`. Ledger Group: **Cash Accounts**.

> **The ledger NAME decides which column the money lands in.**
> `Cash on Hand` → **Cash** column
> `HDFC Bank` → **Bank** column
> `PhonePe` / `Paytm` / `GPay` / anything with "UPI" → **UPI** column
> Anything else → Bank.

3. *(Optional)* **Masters → Voucher Settings** — choose which ledger groups
   appear in each dropdown. Leave it alone and every ledger is offered.

### Create the data

4. **Voucher → Receipt Vouchers → ADD**
   1. Voucher Date — today
   2. Row 1: pick `Walk-in Customer`, type **5000** under **Credit**
   3. Row 2: pick `Cash on Hand`, type **5000** under **Debit**
   4. The total row flips to **Balanced** and Submit turns blue
   5. **Submit Receipt Voucher**

   Saved as `RV/26/00001`.

### Read the report

5. **Reports → Receipt Voucher Report**
   Set **Date From** and **Date To** to cover today. Click **Search**.

**You will see:** `RV/26/00001` · today's date · Walk-in Customer ·
Total 5000.00 · **Cash 5000.00** · Bank 0.00 · UPI 0.00 · Advance 5000.00 ·
Advance. Plus a **Total** row at the bottom.

> **Advance Status will always say "Advance".** Matching a voucher against an
> invoice ("allocation") is not built yet, so every voucher is fully
> unallocated. This is correct behaviour, not a bug.

---

# 3 · Payment Voucher Report

**This one works fully today.** Money going *out* to a supplier.

### Set up the ledgers (once)

1. **Masters → Ledger** → ADD — `Test Supplier`, group **Sundry Creditors**.
2. **Masters → Ledger** → ADD — `HDFC Bank`, group **Bank Accounts**.
3. **Masters → Ledger** → ADD — `Discount Received`, any group.

### Create the data

4. **Voucher → Payment Vouchers → ADD**
   1. Row 1: `Test Supplier`, **Debit 5000**
   2. Row 2: `HDFC Bank`, **Credit 4800**
   3. Click **Add Discount** → row 3: `Discount Received`, **Credit 200**
   4. Balanced → **Submit Payment Voucher**

   Saved as `PV/26/00001`. *(You paid 4800, they wrote off 200, their account
   still clears the full 5000.)*

### Read the report

5. **Reports → Payment Voucher Report** → set dates → **Search**

**You will see:** `PV/26/00001` · Test Supplier · Total 5000.00 ·
**Bank 4800.00** · Cash 0.00 · **Discount 200.00** · On Account 5000.00.

---

# 4 · Sales Person

**Rows appear. Money columns stay 0.00** — see the note at the bottom.

### Set up (once)

1. **Contacts → Contact Types** → ADD — a type with Contact Type = **Agent**.
2. **Contacts → Agents** → ADD — the salesperson, e.g. `MAMTHA`.
3. **Contacts → Customers** → ADD — any customer.
4. Do the Barcode Report setup above (steps 1–7), so stock exists to sell.

### Create the data

5. **Sell → Delivery Challan → ADD**
   1. Pick the **Customer**
   2. **Pick the Sales Person** ← this is the field the report groups on
   3. Scan an item code, press Enter
   4. **Submit**

> **Only Delivery Challan has a Sales Person field.** Sales Invoice, POS and
> the return screens do not. Anything raised there is grouped under a row
> called **ALL**. That is why the report has an ALL row.

### Read the report

6. **Reports → Sales Person** → set dates → **Search**

**You will see:** one green table per location. Inside it, one row per
salesperson (plus **ALL**). Switch to **Bill Wise view** for one row per
document.

---

# 5 · Sales Analysis

**Rows appear. Money columns stay 0.00.**

### Create the data

1. Do the Barcode Report setup (steps 1–7).
2. **Sell → Delivery Challan → ADD** (or **Sales Invoice**) — pick a customer,
   scan an item, Submit.

### Read the report

3. **Reports → Sales Analysis** → set dates → **Search**

**You will see:** three tables — Location wise Performance, Top 5 Group wise,
Top 5 Item wise. The item you sold appears, grouped under its product group.
Bill Count is right. Every money and quantity figure is 0.00.

---

# 6 · Sales Report

**Empty today.**

It needs Sale Qty, Sale Amount, **Total Cost** and **Profit** per line. Cost
comes from what the goods were bought at (`Pur Rate` on the barcode row), and
the report joins sales lines to barcode rows by item code — but sales lines
carry no quantity or rate to price, so there is nothing to total.

Once the Sell screens capture quantity and rate, this report fills in on its
own. Nothing here needs changing.

---

# 7, 8, 9 · POS Summary · POS Report · POS Credit Note

**All three are empty, and no amount of data entry will change that yet.**

### Why

Open **Sell → POS → ADD**. The full-screen till opens. You can scan items and
they appear in the grid — but look at the buttons along the bottom: **Hold**,
**Multiple Pay**, **Clear Screen**, **Recent Transactions**.

**There is no Save or Checkout button.** The till never sends anything to the
server, so no POS bill is ever created. With no bills:

- **POS Report** has nothing to list
- **POS Summary** has no takings to total per cashier
- **POS Credit Note** has no bill to credit

All three screens are built, filtered and wired to the right models. They will
show data the moment the till starts saving.

### One more thing about POS Summary

The column says **Cashier Name**, but a POS bill does not record who rang it —
it only records which **counter** it was rung on. So the report groups by
counter.

If you want that column to have anything in it later:
**Masters → Pos Counter Master → ADD** — create your counters first.

---

# 10 · Item Stock

**This one works today** — for opening, inward and closing. Outward stays 0.00.

### Create the data

1. Do the Barcode Report setup above (steps 1–7). Every barcode row you
   generate is one piece of stock coming **in**.
2. To see items grouped properly, make sure each Item has a **Group** picked on
   **Inventory → Item**. Items without one show under `(ungrouped)`.

### Read the report

3. **Reports → Item Stock** → set dates → **Search**

**You will see:** six tiles across the top — Total Groups, Open Qty, Inward
Qty, Outward Qty, Close Qty, Close Value — and three tabs:

- **Group Wise Summary** — one row per location + group
- **Group Wise Detailed** — the same, broken down to item code
- **Item Wise Summary** — one row per item

**How the numbers are worked out.** There is no stock ledger in this project,
so it is derived:

| Column | Where it comes from |
|---|---|
| Inward | Barcode rows created **inside** your date range |
| Open | Barcode rows created **before** your date range |
| Outward | Quantity sold — **0.00 today** |
| Close | Open + Inward − Outward |
| Close Value | Close Qty × the average rate it was received at |

> Because Outward is always 0, **Close Qty is everything ever received.** It
> reads high for anything you have actually sold.

---

# 11 · Supplier Bill Report

**This one works today.**

### Create the data

1. **Contacts → Suppliers** → ADD — create the supplier.
2. **Purchase → Goods Receipt Challan → ADD** — pick the supplier, fill the
   bill details, Submit.
   *(Or use **Inventory → Barcode Generation**, which creates a GRC for you.)*
3. *(Optional)* **Purchase → Goods Return Note → ADD** — anything you send back
   shows in the **Return Qty** column. It is matched by **GRC Number**, so type
   the same GRC number on the return.

### Read the report

4. **Reports → Supplier Bill Report** → set dates → **Search**

**You will see:** one row per goods receipt — Location, Supplier, GRC No, Date,
Bill Value, Purchase Qty, Return Qty, Net Sale Qty, Close Qty, Close Bal.

Filter by **Supplier**, **Purchase Group** or **City** to narrow it.

> **Net Sale Qty is 0.00**, so Close Qty is purchases minus returns only.

---

# 12 · Supplier Outstanding Report

**This one works today.**

### Create the data

1. **Purchase → Goods Receipt Challan → ADD** — receive the goods.
2. **Purchase → Purchase Invoice → ADD** — tick the GRC, Submit.
   *(This is the document that creates the debt.)*
3. *(Optional)* **Purchase → Goods Return Note**, then
   **Purchase → Debit Note → ADD** — tick the GRT. A debit note **reduces**
   what you owe.

### Read the report

4. **Reports → Supplier Outstanding Report** → set dates → **Search**

**You will see:** four tiles — Total Suppliers, Total Outstanding PI, Total
Outstanding DN, Grand Total Due — and two tabs:

- **Supplier-wise Summary** — one row per supplier
- **Detailed** — one row per document

```
Total Due  =  Outstanding Purchase Invoices  −  Outstanding Debit Notes
```

> **Payments are NOT subtracted here.** If you raise a Payment Voucher, this
> report does not go down. That matches the deployed report — it shows what
> was invoiced, not what is still unpaid. *(The Dashboard's "Purchase Due"
> tile does subtract payments, so the two figures differ on purpose.)*

---

# 13 · Customer Outstanding Report

**Empty today** — it reads POS bills, and the till does not save. See section
7–9 above.

Once POS works, it will show one row per customer:

```
Total Due  =  unpaid part of POS bills  −  POS returns
```

> "Outstanding" is the **unpaid** part of a bill (`Sell Due`), not the whole
> bill. A customer who paid cash in full does not appear at all — which is why
> even a busy shop shows a short list here.

---

# Why some columns read 0.00

Short version: **the Sell screens do not ask for quantity or price.**

Open **Sell → Delivery Challan → ADD** and scan an item. The row appears with
the item code and name — and that is all that gets saved. The grid shows
headings for QTY, Unit Rate, Discount, Before Tax, IGST, CGST, SGST and Net
Amount, but there are no boxes to type them into.

So any report that totals money from a sales line has nothing to add up.

**This affects:** Sales Report (fully), Sales Analysis and Sales Person (money
columns only).

**This does NOT affect:** Barcode Report, Receipt Voucher Report and Payment
Voucher Report — those read from screens that do capture full figures, which
is why all three show real numbers today.

Fixing it means adding quantity and rate inputs to the Sell line grids, and
giving the POS till a Save button. That is a change to those screens, not to
the reports.

---

# If a report is empty — check these in order

1. **Top bar.** Wrong Business, Location or Financial Year is the most common
   cause. A document raised under one branch does not exist under another.
2. **Dates.** Most reports need Date From and Date To, and they default to the
   last month. If you entered the data with a different date, widen the range.
3. **Did you press Search?** Nothing loads until you do.
4. **Barcode Report only** — it stays blank until you type an Item Code.
5. **Is it one of the known-empty ones?** Sales Report and the three POS
   reports have no data to show yet. See above.

# Ledger Transaction

One screen: `/admin/ledger-transaction`. A filter card over a read-only list of
Dr / Cr entries.

**Nothing is entered here.** There is no ADD button because this module owns no
data of its own — it reads eight other collections and turns each document into
a ledger line.

---

## How data reaches this page

```
     YOU CREATE A DOCUMENT                 IT APPEARS HERE
     ─────────────────────                 ───────────────

Purchase → Purchase Invoice     ──────►    Cr  the supplier
Purchase → Debit Note           ──────►    Dr  the supplier

Sell → Sales Invoice            ──────►    Dr  the customer
Sell → Credit Note              ──────►    Cr  the customer
Sell → Sales Return             ──────►    Cr  the customer
Sell → POS                      ──────►    Dr  the customer
Sell → POS Return               ──────►    Cr  the customer

Inter Company Sell
  → Sales Invoice               ──────►    Dr  the destination business
```

Direction is from the **party's** point of view, which is how the deployed
screen reads it:

- buying on credit **credits** the supplier — you owe them
- returning goods to them **debits** them — they owe you back

### Fastest way to see a row

If you have run the Inter Company Sell flow, you already have one. Open this
page with the top bar on the **sending** branch and the inter company sales
invoice is sitting there as a **Dr** against the destination business.

Otherwise: `Purchase → Purchase Invoice → ADD`, save one, come back.

---

## What each column is, and where it comes from

| Column | Source |
|---|---|
| **Ledger Name** | The party's mapped ledger, or `<Party> A/C` if unmapped |
| **Contact** | The supplier / customer / business on the document |
| **Type** | `Dr` or `Cr`, fixed per document type (see the table below) |
| **amount** | The document's total — or summed from its lines when it has no total |
| **Description** | A fixed label per document type |
| **Doc Type** | Which document produced this entry |
| **Doc Number** | That document's own number |

### Ledger Name — why most rows read `<Party> A/C`

A party has a real ledger name only when its contact carries a
`paymentLedgerId`. Most do not, so the name falls back to `<Party> A/C`.

To map one properly:
`Contacts → Supplier (or Customer) → edit → Financial Details → Payment Ledger`

Once mapped, that ledger's name replaces the fallback on every entry for that
party — old rows included, because entries are computed on read.

---

## The eight sources

| Doc Type | Party field | Side | Date field | Number field | Amount from |
|---|---|---|---|---|---|
| Purchase Invoice | `supplierId` | **Cr** | `purchaseDate` | `purchaseInvoiceNo` | `totalPayable` |
| Debit Note | `supplierId` | **Dr** | `debitCreadted` | `debitNoteNo` | `value` |
| Sales Invoice | `customerId` | **Dr** | `createdAt` * | `salesInvoiceNo` | `netValue` |
| Credit Note | `customerId` | **Cr** | `createdAt` * | `creditNoteCode` | **summed from lines** |
| Sales Return | `customerId` | **Cr** | `returnDate` | `salesReturnNo` | **summed from lines** |
| POS | `customerId` | **Dr** | `date` | `invoiceNo` | `totalAmount` |
| POS Return | `customerId` | **Cr** | `date` | `invoiceNo` | `totalAmount` |
| Inter Company Sales Invoice | `toBusinessId` | **Dr** | `invoiceDate` | `invoiceNo` | `netValue` |

\* `SalesInvoice` and `CreditNote` carry no date field of their own, so the
record's `createdAt` stands in.

**Credit Note and Sales Return have no total on the header at all** — only line
items — so their amount is summed from each line's `netAmount`.

### What is deliberately NOT here

**GRC, GRT and Delivery Challan.** They move stock, not money. A goods return
shows up when its **Debit Note** is raised — which is the entry that carries
the value.

---

## What happens on one page load

**1 · The browser asks**

```
GET /api/ledger-transaction
      ?page=1&perPage=10
      &business=<top bar>&location=<top bar>&finYear=<top bar>
      &type=&docType=&docNumber=&ledgerName=&fromDate=&toDate=
```

**2 · The route decides which collections to open**

- a **Document Type** filter → only that one
- a **Ledger Type** filter → only sources on that side
- neither → all eight

**3 · Each collection is queried in parallel**, filtered by business +
location + financial year, plus your date range and document number, sorted
newest first, capped at 2,000 rows.

**4 · Each document becomes one entry**, using its row from the table above.

**5 · Party names resolved in two queries.** Every `supplierId` /
`customerId` is collected and fetched from `Contact` in one go; every
`toBusinessId` from `Business`. A third query fetches the mapped ledgers.

**6 · Merge → filter → sort → slice.** All entries combined; the Ledger Name
box matched against ledger name *and* party name; sorted by date descending;
then the requested page is cut out.

---

## The filters

| Filter | Behaviour |
|---|---|
| **Ledger Name** | Text match on ledger name **or** party name, applied after merging |
| **Ledger Type** | Dr / Cr — skips whole collections rather than filtering rows |
| **Document Type** | Opens only that one collection |
| **Document Number** | Partial, case-insensitive, per source |
| **From / To Date** | Against each source's own date field |
| **Reset** | Clears both the boxes and the applied filter, and reloads |

Filters apply on **Search** (or Enter in a text box), not as you type — same as
every other filter card in this project.

**Ledger Name is a text box, not a dropdown**, on purpose. A dropdown of the
Ledger master would return nothing for the many parties that have no ledger
mapped, which reads as "no data" rather than "not mapped". Typing finds both.

---

## Exports

CSV, Excel and PDF export **the page currently on screen**, not the whole
result set — the same limitation every other list in this project has. For a
full extract, raise `perPage` in the URL or narrow the filters first.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Expected row missing | **Wrong branch.** The top-bar business scopes everything; a document raised under one branch does not appear under another. |
| Expected row missing | **Wrong financial year.** Documents are FY-scoped and the top-right selector filters them out. |
| Ledger Name blank | The document has no supplier / customer on it. The row still appears; the two name columns are empty. |
| Ledger Name reads `X A/C` | Normal — that party has no Payment Ledger mapped. |
| Amount is 0.00 on a Credit Note | Its lines carry no `netAmount`. The header has no total to fall back on. |
| GRC / GRT / Challan not listed | Excluded by design — they move stock, not money. |
| Banner about too many entries | A source hit its 2,000 cap. Narrow the dates or pick a document type. |

---

## Known limits

**Derived, not posted.** This project has no posting engine: no model holds
journal entries and no route writes one. Every entry on this page is computed
at read time from the document that caused it.

Three consequences worth understanding before anyone treats this as books:

1. **Editing a source document silently rewrites its ledger line.** A real
   ledger keeps the original entry and posts a reversal.
2. **Deleting a document deletes its history.** The entry simply stops
   existing.
3. **No opening balances, no running balance, no trial balance.** There is
   nothing to accumulate against.

**Merged in memory, so capped at 2,000 per source.** Sorting across eight
collections cannot be done in the database. Past the cap the page shows the
most recent slice and says so in a banner rather than quietly truncating.

**Single-sided entries.** Each document produces one line against the party.
Real double-entry would post the matching side to a sales / purchase / GST
ledger too. The deployed screen shows the same single-sided view, so this
matches it — but it is not a balanced journal.

### If you want a real ledger later

Add a `LedgerTransaction` collection, and have every transaction route write
to it on save — the same place each one already calls `nextDocNumber()`. Then
this page's route swaps its source from these eight collections to that one
collection.

**Nothing on the screen changes.** The columns, filters and layout stay as they
are; only where the rows come from changes. That is why the derivation lives
entirely inside `app/api/ledger-transaction/route.js` rather than being spread
through the UI.

---

## File map

```
app/admin/ledger-transaction/
  fields.js     filters, columns, document-type list
  page.jsx      renders the view

components/
  LedgerTransactionView.jsx    filter card + table + exports + paging

app/api/
  ledger-transaction/route.js  the derivation — SOURCES lives here

edited: config/nav.js          "Ledger Transaction" entry above Logout
```

**Adding a ninth document type** is one entry in `SOURCES`
(`app/api/ledger-transaction/route.js`) plus one string in `DOC_TYPES`
(`app/admin/ledger-transaction/fields.js`). Nothing else needs touching.

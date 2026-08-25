# Voucher module

Three screens under **Voucher** in the sidebar: Receipt, Contra and Payment.

This is the first thing in the project that **actually posts**. Every other
balance — Ledger Transaction, the dashboard tiles, the "(Max: n)" stock hint —
is computed at read time from documents that were created for another purpose.
A voucher line is a real entry against a ledger, and it exists for no other
reason.

---

## The one idea

All three types are the same document: **a set of ledger lines that must
balance.** Total Debit = Total Credit, or it cannot be saved.

What differs between them is only which side the party sits on:

```
Receipt   money in     Dr bank / cash        Cr customer
Payment   money out    Dr supplier           Cr bank / cash   ( + Cr discount )
Contra    transfer     Dr destination a/c    Cr source a/c
```

> **You never choose Dr or Cr.** Each row has one editable amount cell, on its
> own side, because a receipt credits the customer and debits the bank — that
> is what a receipt *is*. The server re-derives the side from the same spec the
> form used, so a crafted request cannot post a voucher that balances but means
> the opposite thing.

---

## Before you start

**1. You need ledgers.** `Masters → Ledger`.

At minimum: one party ledger (a customer or supplier) and one bank/cash ledger.
Two rows pointing at the *same* ledger will balance arithmetically and record
nothing — Dr and Cr on one account cancel out.

**2. Voucher Settings decides what each dropdown offers.**
`Masters → Voucher Settings`.

It holds a **Dr** and a **Cr** list of ledger *groups* per voucher type. Each
dropdown offers the ledgers sitting under the groups configured for its side.

| Voucher | Dr side offers | Cr side offers |
|---|---|---|
| Receipt | Cash / Bank groups | Customer / Sundry Debtor groups |
| Payment | Supplier / Sundry Creditor groups | Cash / Bank groups |
| Contra | destination Cash / Bank | source Cash / Bank |

Sub-groups count. Ticking **Bank Accounts** offers everything beneath it — the
same tree walk the dashboard does for EXPENSES.

> **Nothing configured?** Every ledger is offered in every dropdown. A fresh
> install has no Voucher Settings row, and an empty dropdown with no
> explanation is worse than an unfiltered one. Configure it when you want the
> lists narrowed.

---

## Receipt Voucher — a customer pays you

`Voucher → Receipt Vouchers → ADD`

| Field | |
|---|---|
| Voucher Date * | defaults to today |
| Global Remark | optional, applies to the whole voucher |

Then the grid — **Ledger · Balance · Credit · Debit · Remarks · Action**:

1. **Row 1** — *Search debtor…* → the customer's ledger. Balance fills in.
   Type the amount under **Credit**.
2. **Row 2** — *Search bank/cash…* → where the money landed. Type the same
   amount under **Debit**.
3. Total row reads **Balanced** → **Submit Receipt Voucher**.

```
₹5,000 received from a customer into HDFC

  Customer A/C    Cr 5,000     they owe you 5,000 less
  HDFC Bank       Dr 5,000     you hold 5,000 more
                  ─────────
                  Balanced
```

Issued as `RV/26/00001`.

**Add Row** adds another bank/cash line, so one receipt can split across
accounts — ₹3,000 cash and ₹2,000 UPI against a ₹5,000 credit. It still has to
balance overall.

---

## Payment Voucher — you pay a supplier

`Voucher → Payment Vouchers → ADD`

Same shape, sides reversed. The extra move is **Add Discount**:

```
Supplier bill 5,000, you pay 4,800, they write off 200

  Supplier A/C    Dr 5,000     their account clears in full
  HDFC Bank       Cr 4,800     only 4,800 actually left the bank
  Discount Recd   Cr   200     the write-off has somewhere to live
                  ─────────
                  Balanced
```

That third row is the whole point of the button. Without it the supplier would
show ₹200 outstanding forever.

The blue banner on the form explains the sign convention: a **negative**
balance means you still owe them; a **positive** balance means they are holding
your advance.

Issued as `PV/26/00001`.

---

## Contra Voucher — moving your own money

`Voucher → Contra Vouchers → ADD`

No customer or supplier is involved, which is why this list has no filter card
and shows **To (Destination)** and **From (Source)** instead of a name.

```
Deposit ₹2,500 of till cash into the bank

  HDFC Bank      [To · Dr]     Dr 2,500
  Cash on Hand   [From · Cr]   Cr 2,500
```

**Add Source Account** lets one deposit draw from several tills into a single
bank account.

Issued as `CV/26/00001`.

---

## Where a saved voucher shows up

A voucher is not a dead end. Once submitted it reaches two other screens:

| Screen | What appears |
|---|---|
| `Ledger Transaction` | a **Receipt** as **Cr** against the customer, a **Payment** as **Dr** against the supplier — both filterable by Document Type |
| `Dashboard → Purchase Due` | drops by every Payment Voucher raised |
| `Dashboard → Invoice Due` | drops by every Receipt Voucher taken |
| The ledger's **Balance** on any voucher form | opening balance plus everything vouchers have posted to it |

So the Due tiles are real balances: *invoiced, less returned, less actually
settled.*

**Contra reaches none of them**, and that is deliberate. Moving money between
your own bank and cash accounts settles nothing with a supplier or a customer,
and it has no party for a ledger row to sit against. It still moves the two
account balances, which is the whole point of it.

---

## Testing it, click by click

Set the top bar to your business and financial year first.

1. `Masters → Ledger → ADD` — create **Walk-in Customer** under Sundry Debtors
   and **Cash on Hand** under Cash Accounts.
2. `Voucher → Receipt Vouchers → ADD`.
3. Row 1: Walk-in Customer, **Credit** `5000`.
4. Row 2: Cash on Hand, **Debit** `5000`.
5. The Total row flips from *Out by …* to **Balanced** and the Submit button
   turns blue. Submit.
6. **Expect:** the list shows `RV/26/00001`, Customer Name *Walk-in Customer*,
   Total Amount 5000.00, Advance 5000.00.
7. Re-open ADD and pick Cash on Hand again — its **Balance** now reads 5000.00
   higher than before. That is the voucher having posted.
8. `Ledger Transaction` — the receipt is there as **Cr 5000.00** against
   *Walk-in Customer*, Doc Type *Receipt Voucher*.
9. `Dashboard` — **Invoice Due** has dropped by 5000.00 (or is 0 if it was
   already lower; the tile is floored).

---

## Rules the API enforces

Server-side, so they hold even if the form is bypassed:

- **A voucher needs at least two lines.**
- **Every row needs a ledger**, and an **amount greater than zero**.
- **Debit must equal Credit**, and the total must not be zero.
- **The side is taken from the row's role, never from the request.**
- **A voucher cannot be edited.** There is no PUT — see below.
- **A voucher that has been adjusted against invoices cannot be deleted** (409).
  Allocation is not built yet, so this cannot trigger today; the guard is in
  place ahead of the feature that needs it.

---

## Numbering

`RV/<yy>/<00001>`, `PV/<yy>/…`, `CV/<yy>/…`, scoped by business, financial year
**and type**, so the three series run independently.

Taken from the **highest number already issued**, not a count
(`nextSeriesNumber` in `lib/docnumber.js`). Counting breaks as soon as anything
is deleted: with `RV/26/00001` and `00002` on file, deleting the first would
reissue `00002` — a duplicate of a live document.

No Doc Setup row is needed. Vouchers number themselves, like Transport's LR and
Dispatch numbers.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| **Submit is grey and will not click** | The two sides do not match. The message beside the button names the short side and the exact amount — e.g. *"Debit is short by 7700.00"*. Make them equal. |
| Submit stays grey with everything filled | One row has an amount of 0, or no ledger picked. |
| The dropdown is empty | No ledgers exist yet. `Masters → Ledger`. |
| The dropdown offers everything, including obviously wrong accounts | Voucher Settings has nothing configured for that side, so the filter is open by design. |
| The dropdown is missing a ledger you expect | Its group is not ticked for that side in Voucher Settings. |
| I saved it but nothing changed anywhere | Check `Ledger Transaction` and the Dashboard Due tiles — a Contra reaches neither by design, only the two account balances. |
| Balance always reads 0.00 | The ledger has no opening balance and no voucher has posted to it yet. |
| A voucher I raised is missing from the list | Wrong business, location or financial year in the top bar. |

---

## Known limits

**Invoice allocation is not built.** The **Adjust** button on the party row is
deliberately disabled. `adjustedAmount` stays 0, so the whole value shows under
**Advance** (receipt) or **Settlement** (payment). When allocation lands, only
that field and the Adjust action change — the list columns and the filter
already read from it.

**There is no edit.** A posted voucher is reversed by deleting it, not amended.
Editing the amounts would silently move a ledger balance somebody may already
have reconciled against — the same reasoning behind the Inter Company Sales
Invoice having no PUT.

**No approval or audit trail.** Anyone signed in can raise or delete a voucher,
and a delete leaves no trace. Real books want a reversal entry rather than a
removal.

**Tenant scope is not bound to the session.** As everywhere else in this
project, `businessId` arrives from the client. A project-wide item, not
specific to this module.

---

## File map

```
models/Voucher.js                    one shape for all three types

app/admin/voucher/
  fields.js                          SPECS + ROLE_SIDE + totalsOf - the rules
  receipt-vouchers/page.jsx
  contra-vouchers/page.jsx
  payment-vouchers/page.jsx

components/
  VoucherList.jsx                    list + filter card, driven by the spec
  VoucherForm.jsx                    the Add dialog, driven by the spec

app/api/voucher/
  route.js                           list + create
  [id]/route.js                      read one + delete
  ledgers/route.js                   dropdown options, filtered by Voucher Settings

edited: config/nav.js                the Voucher group
```

`fields.js` is imported by **both** the forms and the API route, so the sides
you watch on screen are exactly the sides that get stored.

**Adding a fourth voucher type** is one entry in `SPECS`, one entry in
`ROLE_SIDE`, and one page file. Nothing else needs touching — the list, the
filter card, the grid, the badges and the numbering all read the spec.

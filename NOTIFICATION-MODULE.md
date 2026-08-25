# Notification module

The bell in the top right. One screen's worth of code, no new collection.

**Nothing is stored and nothing is "sent".** There is no notification table and
no model writes events. Every line in the panel is a live count of documents
sitting in a state that needs someone to act, counted at the moment you open
it — the same read-time approach as **Ledger Transaction**.

The consequence, and it is the thing to understand before anything else:

> There is nothing to mark as read. A count drops when the work behind it is
> done. A dismiss button would let the badge go quiet while the GRCs stayed
> uninvoiced, which is worse than no badge at all.

---

## Where it is

Top bar, right-hand side, between the financial-year selector and the sidebar
toggle. It appears on every `/admin/*` screen because it lives in the Topbar.

```
GROO RETAIL ERP     [Business v] [Location v]  Financial Year  ( 3 )  ≡
                                                                 ▲
                                                             the bell
```

Click it to open the panel. Click anywhere else, or press Escape, to close.

---

## What makes the badge go red

The badge counts **only** the things waiting on *you* — the inbox items and
the setup warning. It deliberately ignores the "awaiting next step" group.

| Group | Badged? | Why |
|---|---|---|
| Needs your action | **yes** | Another branch or location acted; nothing moves until you respond |
| Setup | **yes** | Something is blocked right now |
| Awaiting next step | no | Uninvoiced GRCs are normal business. Counting them would leave the badge red permanently, which is the same as it meaning nothing |

Grey badge with a number = there is a list, but nothing is urgent.

---

## Which page produces which notification

This is the table to read. **"Do this"** is what makes the line appear;
**"Clear it"** is the screen that makes it go away.

### Needs your action — red badge

| Notification | Do this to make it appear | Clear it |
|---|---|---|
| **Inter company invoices to receive** | On branch A: `Inter Company Sell → Sales Invoice → ADD`, addressed to branch B. Then **switch the top-bar Business to B** | `Inter Company Sell → Auto Purchases Received` → **Receive** |
| **Inter company returns to accept** | On branch B: `Inter Company Sell → Auto Purchases Return → ADD`, addressed to A. Then **switch the top bar to A** | `Inter Company Sell → Sales Return` → **Accept** |
| **Stock transfers to receive** | `Stock Transfers → Transfer Stock Location → ADD`, addressed to another location. Then **switch the top-bar Location to that destination** | `Stock Transfers → Transfer Stock Received` → **Receive** |

> All three are **inboxes** — they are counted by *destination*, not by who
> raised them. Standing in the sending branch you will see nothing, and that
> is correct. Switching the top bar is the whole trick.

### Setup — red badge

| Notification | Appears when | Clear it |
|---|---|---|
| **No barcode setting covers today** | No Barcode Setting period for this business + financial year has an Effective/Expiry window that brackets today | `Masters → Barcode Settings` — add a period, or widen an existing one |

> This one is worth having: without an active setting, `Inventory → Barcode
> Generation` refuses to generate, and you only find that out once you are
> already on the screen with a half-filled grid.

### Awaiting next step — listed, not badged

| Notification | Do this to make it appear | Clear it |
|---|---|---|
| **Goods receipts not yet invoiced** | `Inventory → Barcode Generation` → Submit, or `Purchase → Goods Receipt Challan → ADD` | `Purchase → Purchase Invoice → ADD` — tick the GRC |
| **Goods returns without a debit note** | `Purchase → Goods Return Note → ADD` | `Purchase → Debit Note → ADD` — tick the GRT |
| **Delivery challans not yet invoiced** | `Sell → Delivery Challan → ADD` | `Sell → Sales Invoice → ADD` — tick the challan |
| **Sales returns without a credit note** | `Sell → Sales Return → ADD` | `Sell → Credit Note → ADD` — tick the return |
| **Inter company challans not yet invoiced** | `Inter Company Sell → Delivery Challan → ADD` | `Inter Company Sell → Sales Invoice → ADD` — tick the challan |
| **Stock packets not despatched** | `Stock Transfers → Transfer Stock Packet → ADD` | `Stock Transfers → Transfer Stock Location → ADD` — tick the packet |

Every row in the panel is clickable and takes you straight to the screen in
the "Clear it" column.

---

## Fastest way to see one

**A grey (pending) item — 30 seconds:**

1. `Inventory → Barcode Generation`
2. Enter an item code, QTY, **Generate All Barcodes**, **Submit**
3. Open the bell — *Goods receipts not yet invoiced* has gone up by one

**A red (action) item — needs two businesses:**

1. Top bar = **A**. `Inter Company Sell → Delivery Challan → ADD`, destination **B**. Submit.
2. `Inter Company Sell → Sales Invoice → ADD`, destination **B**, tick the challan. Submit.
3. **Switch the top-bar Business to B.**
4. The bell turns red: *Inter company invoices to receive: 1*
5. Click it → lands on Auto Purchases Received → **Receive** → badge returns to 0

---

## Scope — why the numbers change when you switch the top bar

Every count is filtered by the top bar, but not all of them use the same
parts of it. This catches people out, so it is spelled out:

| Notification | Business | Location | Fin year |
|---|---|---|---|
| Inter company invoices to receive | destination | — | — |
| Inter company returns to accept | destination | — | — |
| Stock transfers to receive | yes | **destination** | yes |
| Goods receipts not yet invoiced | yes | yes | yes |
| Goods returns without a debit note | yes | yes | yes |
| Delivery challans not yet invoiced | yes | yes | yes |
| Sales returns without a credit note | yes | yes | yes |
| Inter company challans not yet invoiced | yes | yes | yes |
| Stock packets not despatched | yes | — | yes |
| No barcode setting covers today | yes | — | yes |

So the same database can show 2, 3 or 4 uninvoiced GRCs purely depending on
which Location the top bar points at — because those GRCs belong to different
locations.

---

## Refreshing

- On open, and whenever the top-bar business, location or year changes.
- Every 60 seconds while the tab is in the foreground.
- Immediately when you switch back to a backgrounded tab, so returning never
  shows a stale count.
- Manually, via **Refresh** in the panel header.

A failed poll keeps the last good numbers rather than flashing to zero.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Badge is grey with a number | Nothing urgent. The list holds only "awaiting next step" items, which are not badged by design. |
| Panel says "Select a business" | The top-bar Business selector has not resolved yet, or the business list is empty. |
| An inbox row I expected is missing | You are standing in the **sending** branch. Switch the top bar to the destination. |
| Stock transfers to receive never appears | You only created a *packet*. A packet is goods boxed, not goods sent — create the Transfer Stock Location. |
| A count did not drop after I actioned it | Wait for the 60s poll or press Refresh. Counts are read on demand, not pushed. |
| Barcode warning on a business I do not use | Known noise — see below. |
| Everything is empty on a fresh install | Correct. Nothing has been raised yet. |

---

## Known limits

**Counts are read, never pushed.** There is no websocket and no polling of
individual documents. If a colleague receives an invoice while your panel is
open, your number is stale until the next 60-second tick.

**No history.** Because nothing is stored, you cannot see that something *was*
pending yesterday. The panel only ever describes the present.

**No per-user targeting.** Notifications belong to a scope, not a person.
Everyone signed in on the same business and location sees the same list.

**The barcode warning fires on half-configured businesses.** Any business
without an active Barcode Setting gets it, including ones created for testing
that have no locations and no documents. If that is noisy, the fix is one
condition in the route — skip the warning for a business with no company
locations.

**Tenant scope is not bound to the session.** As everywhere else in this
project, the business id arrives from the client. This route only counts, so
the exposure is a count rather than data, but it is the same project-wide gap.

---

## Where the code lives

```
app/api/notifications/route.js     the counts - SOURCES lives here
components/NotificationBell.jsx    the bell, badge and dropdown
components/Topbar.jsx              (edited - was a static span showing 0)
```

**Adding a notification is one entry in `SOURCES`:**

```js
{
  id: 'my-thing',
  kind: 'pending',                 // 'inbox' | 'warning' | 'pending'
  label: 'Things waiting on something',
  href: '/admin/where/to/fix/it',
  where: (s) => ({ ...scope(s), someClaimId: null }),
  Model: MyModel,
}
```

`kind` decides the heading, the dot colour and whether it counts toward the
badge. `where` returning `null` skips the source entirely — that is how the
inbox rows avoid counting across every tenant when no location is selected.

A source that throws is dropped rather than failing the whole request, so one
bad model cannot take the bell down.

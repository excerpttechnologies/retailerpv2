# Stock Transfer Module

Moving goods between two **locations of the same business**.

Not to be confused with **Inter Company Sell**, which moves goods between two
*businesses*. If the goods are changing owner, that is Inter Company Sell. If
they are only changing shelf, this is the module.

---

## The three stages

```
  Transfer Stock Packet   →   Transfer Stock Location   →   Transfer Stock Received
     (at the SOURCE)              (at the SOURCE)              (at the DESTINATION)

     WH/26/00001                  WH/26/00001                  26/jnr/001
     "goods are boxed"            "boxes are despatched"       "boxes have arrived"
```

Each stage claims the one before it:

| Stage | Field that gets stamped | Effect |
|---|---|---|
| Location claims Packets | packet's `stockTransferLocationId` | packet locks; green tick appears; "Is Location Created = Yes" |
| Received claims Location | location's `receivedId` | drops off the pending list |

A claimed document **cannot be edited or deleted** until the document above it
is deleted. Deleting releases what it claimed, so nothing is ever stranded.

> **A packet on its own never reaches the Received page.** A packet is goods
> *boxed*, not goods *sent*. Only a Stock Transfer Location is a despatch.

---

## Before you start

**1. You need two locations under one business.**
`Masters → Company Locations`. Both must belong to the business you pick in
the top bar. Give them different GSTINs if you want to see the IGST split;
same-state GSTINs produce CGST + SGST.

**2. You need a Stock Point** for the destination.
`Masters → Stock Point Master`.

**3. You need stock that actually exists.**
This is the step most first tests trip on. The scan box refuses any item code
that has never been received through a Goods Receipt Challan — that is the
Info panel's rule *"Item Code Validation: the item code must exist in selected
form business & location"*.

To create some: `Inventory → Barcode Generation`, enter an item code, set QTY,
Generate, Submit. That writes the barcode rows the transfer reads as stock.

**4. Doc Setup rows** — already created for TEMPLE FABRICS, FY 2026-2027:

| Document Type | Prefix | Length | First number |
|---|---|---|---|
| Stock Transfer Packet | `WH/[YY]/` | 5 | `WH/26/00001` |
| Stock Transfer Location | `WH/[YY]/` | 5 | `WH/26/00001` |
| Stock Transfer Received | `26/jnr/` | 3 | `26/jnr/001` |

For any other business, add them yourself at `Masters → Doc Setup`. Without a
row a document still saves — it just gets a bare number with no prefix.

---

## Testing it, click by click

Set the top bar to **TEMPLE FABRICS** and financial year **2026-2027** first.

### Stage 1 — create a packet

**Sidebar: `Stock Transfers → Transfer Stock Packet`**
`/admin/transaction/stocktransfers/transferstockpacket`

Press **ADD**.

1. **Transfer From** — defaults to the location in your top bar. GSTN and
   Address fill in by themselves; they are never typed.
2. **Transfer To** — pick a *different* location. The source is removed from
   this list on purpose. Choose a **Stock Point**.
3. **STP Date** — defaults to today. Packet No stays empty; the server issues it.
4. Click into **Enter item code**, type a code, press **Enter** (or F9 / Tab).

   The line appears with Item Name, HSN, GST slab, **Max QTY**, QTY = 1, and a
   Net Rate. Scanning the same code again adds 1 to that line rather than
   opening a second one — which is what a barcode gun does when it repeats.

5. Set QTY. Going over Max QTY turns the box red and warns, but does not block —
   the ceiling is advisory because this project has no stock ledger.
6. **Submit.**

**Expect:** back on the list, top row, Packet No `WH/26/00001`, **no** green tick.

Press the **eye** icon → the *View Stock Transfer Packet* dialog opens showing
`Is Location Created : No` in red, both address blocks, and the line grid.

### Stage 2 — despatch it

**Sidebar: `Stock Transfers → Transfer Stock Location`**
`/admin/transaction/stocktransfers/transferstocklocation`

Press **ADD**.

1. Pick the **same From and To pair** as the packet.
2. The **Stock Transfer Packet List** fills in as soon as both are chosen. Your
   packet is listed with its STP Date, STP Code, Total Qty and Net Amount.

   Empty? The pair does not match, or the packet is already consolidated.

3. Tick it. The lines merge into the grid below, now with the full tax split:
   Before Tax, IGST, CGST, SGST, Net Amount. Tick several packets to merge them
   into one despatch.
4. **STL Date**, optionally a **Stock Transfer Waybill**.
5. **Submit.**

**Expect:** Packet No `WH/26/00001` on the Location list. Go back to the packet
list — your packet now carries a **green tick**, and its Edit and Delete
buttons are gone. The View dialog now reads `Is Location Created : Yes`.

### Stage 3 — receive it

**Switch the top bar Location to the DESTINATION.**

This is the step people miss. The Received page shows *your* inbox, and "yours"
means whatever location the top bar points at. On the source location the page
is empty and correctly so.

**Sidebar: `Stock Transfers → Transfer Stock Received`**
`/admin/transaction/stocktransfers/transferstockreceiveds`

Two cards:

- **Pending Transfer Stock** — your transfer, with Sent Qty filled, Received
  Qty 0, Pending Qty equal to Sent.
- **Recieved Transfers** — empty for now.

Press **Receive**, confirm.

**Expect:** the row leaves the top card and appears below with STR Code
`26/jnr/001`. Receiving is all-or-nothing — Received Qty equals Sent Qty and
Pending Qty is 0.

---

## When a list is empty

In order of likelihood:

| Symptom | Cause |
|---|---|
| Pending Transfer Stock is empty | Top bar Location is still the **source**. Switch it to the destination. |
| …still empty | You only created a packet. Packets never appear here — create the Location. |
| …still empty | Financial Year differs between the two. |
| …still empty | Already received — look at the lower card. |
| Packet List empty on Add Location | From/To pair does not match any packet, or all of them are already consolidated. |
| Scan says "No GRC item found" | That item has never been received through a GRC. See prerequisite 3. |
| Scan says "No stock of X at this business" | The item exists, but its barcode rows belong to a different business. |
| Numbers come out bare, e.g. `00001` not `WH/26/00001` | No Doc Setup row for that document type + business + financial year. |

---

## Rules the API enforces

These are server-side, so they hold even if the form is bypassed.

- **Source ≠ destination.** Rejected with *"The destination must be a different
  location from the source."*
- **A packet must have at least one line.**
- **Only unconsolidated packets can be picked**, and only ones that actually run
  between the two chosen locations. Re-checked at write time, not just in the
  picker.
- **A claimed packet cannot be edited or deleted** — 409.
- **A received transfer cannot be deleted** — reverse the receipt first.
- **You can only receive what is addressed to you** — 403 otherwise.
- **Concurrent claims roll back.** If two people press Receive at once, the
  loser's receipt is deleted and they get 409 *"refresh and try again"*.
- **Totals are recomputed server-side** from the line items. A request carrying
  its own `netValue` has it ignored.

---

## Known limitations

**Max QTY is scoped by business, not location.** It counts GRC barcode rows for
the business, minus what open packets already commit. `BarcodeLabel` stores
`locationId` as a plain string that is frequently empty, so filtering on it
would hide real stock. The Inter Company item lookup makes the same compromise.
A true per-location balance needs a stock ledger, which this project does not
have.

**Receiving is all-or-nothing.** `sentQty`, `receivedQty` and `pendingQty` are
stored per document, so partial receipt can be switched on later by changing
the accept action alone — no migration needed.

**Nothing posts to the ledger.** A stock transfer moves goods, not money, so it
raises no accounting entry. Consistent with the rest of the app, which has no
posting engine.

**The deployed app's View dialog swaps two totals.** A packet of 2 x 80 @ 43.00
prints `6880.00` under *Net Rate* and `86.00` under *Net Amount*. This clone
puts each figure under its own heading.

---

## Where the code lives

**Screens** — `app/admin/transaction/stocktransfers/`

```
transferstockpacket/     page.jsx  add/  [id]/  fields.js
transferstocklocation/   page.jsx  add/  [id]/  fields.js
transferstockreceiveds/  page.jsx
```

**API** — `app/api/`

```
stock-transfer-packet/     route.js  [id]/  item-lookup/
stock-transfer-location/   route.js  [id]/
stock-transfer-received/   route.js  [id]/
```

**Models** — `models/StockTransferPacket.js`, `StockTransferLocation.js`,
`StockTransferReceived.js`

**Components** — `StockTransferPacketForm`, `StockTransferLocationForm`,
`StockTransferPacketList`, `StockTransferPacketView`, `TransferLocationPanel`

The Received screen reuses `IcInboxView` with `inboxScope: 'location'`.

`fields.js` in each screen folder holds the field spec, grid columns and line
maths, and is imported by **both** the form and the API route — so what you
watch while typing is exactly what gets stored.

# Transportation module

Six screens under `/admin/transport/`, added to the sidebar as **Transportation**.

Two masters feed one transaction, which is then loaded onto a dispatch:

```
Transport Master ─┐
                  ├─► Delivery / LR ──► Dispatch
Supplier (contacts) ┘        │              ▲
                             │              │
                    freight breakdown   Vehicle · Driver · Route
                    stored on save
```

---

## Screens

| Screen | Route | What it is |
|---|---|---|
| Transport Master | `/admin/transport/transporter` | Master — transporters and their freight terms |
| Delivery | `/admin/transport/delivery` | Transaction — one consignment booked with a transporter |
| Vehicle Master | `/admin/transport/vehicle` | Master — name / code / status |
| Driver Master | `/admin/transport/driver` | Master — name / code / status |
| Route Master | `/admin/transport/route` | Master — name / code / status |
| Dispatch | `/admin/transport/dispatch` | Transaction — a vehicle leaving with consignments |

Everything is scoped by the business (and where relevant the financial year)
selected in the top bar. A record created under one branch is not visible
under another.

---

## Day-one setup

Do this once, in order. Each step fills a dropdown the next screens need.

1. **Transport Master → ADD.** Transporter Name, Transporter Code (required),
   then tick the Freight terms this transporter accepts, set GST Applicable,
   and tick the Auto Charges Mode and Tips Mode options. Freight and both
   payment modes are multi-select — a transporter can accept several.
2. **Vehicle Master → New Vehicle Master.** Name (registration number), Code,
   Status.
3. **Driver Master → New Driver Master.** Same three fields.
4. **Route Master → New Route Master.** Same three fields. Optional on a
   dispatch, but fill it in so the dropdown isn't empty.

---

## Daily flow

### 1. Book a consignment — Delivery → ADD

Three sections:

- **Transaction info** — Transaction No is read-only and says *Auto generate on
  save*. Fill Transaction Date, Transporter, LR Number, Booking Date.
  The **+ Transporter** button opens the Add Transporter dialog inline and
  refreshes the dropdown, so a new transporter doesn't cost you the half-filled
  form.
- **Supplier / parcel info** — Supplier (from Contacts), Inv / PM Number,
  Parcel Qty, Value.
- **Freight details** — Freight Amount and GST Applicable. **Total Freight
  Payable updates as you type.**  Auto Charges and Tips are optional.

On Save the server issues the number as `LR/26/001` and stores the freight
breakdown.

### 2. Send it out — Dispatch → New Dispatch

Pick Date, Vehicle, Driver, Route, then **Consignments** — a multi-select that
only lists LRs no dispatch has claimed yet. Add Party and Status, Submit.

Doc No (`DSP/26/001`), Amount, Freight and Parcels are all computed by the
server from the consignments selected. They are not form fields.

### 3. Verify

Back on Delivery, dispatched consignments show the dispatch number in the
**Dispatch** column; free ones show `—`. The eye icon opens **View Delivery**
with the full freight breakdown and the dispatch it went out on.

---

## Rules worth knowing

**Freight maths.** GST is 5%, split evenly into CGST and SGST at 2.5% each.
The rate that applied is stored on each document, so changing the rate later
never rewrites history. The constant lives in
`app/admin/transport/delivery/fields.js` (`GST_RATE`) and is imported by both
the form and the API — what you watch while typing is exactly what is stored.

**Totals are never trusted from the browser.** Both Delivery and Dispatch
recompute their figures server-side. A request carrying its own
`totalFreight`, `amount` or document number has those values ignored.

**A consignment can only be on one dispatch.** `Delivery.dispatchId` is null
until a dispatch claims it. The picker only offers unclaimed ones, and the
claim is re-checked at write time — if two people pick the same LR at once,
the second dispatch is rolled back with a 409 rather than double-booking.

**The load is fixed when the dispatch is raised.** Editing a dispatch changes
Vehicle, Driver, Route, Party and Status only. To change which consignments it
carries, **delete the dispatch** — that releases every consignment back into
the picker — and raise it again.

**Document numbers come from the highest already issued**, not from a count
(`nextSeriesNumber` in `lib/docnumber.js`). Counting breaks as soon as anything
is deleted: with `DSP/26/001` and `002` on file, deleting `001` would reissue
`002` — a duplicate of a live document. A number is only ever reused if it was
the most recent and its document is gone.

**Booking Delay** on the Delivery list is the gap between Booking Date and
Transaction Date — green up to 2 days, blue to 5, red beyond.

---

## Data model

```
Transporter          transporterName, transporterCode, freight[],
                     gstApplicable, autoChargesMode[], tipsMode[]

Delivery             transactionNo, transactionDate, transporterId ──► Transporter
                     lrNumber, bookingDate,
                     supplierId ──► Contact, invPmNumber, parcelQty, value,
                     freightAmount, gstApplicable, gstRate,
                     inputCgst, inputSgst, totalFreight,
                     autoCharges, tips,
                     dispatchId ──► Dispatch   (null = not yet dispatched)

Dispatch             docNo, date,
                     vehicleId ──► Vehicle,
                     driverId  ──► Driver,
                     routeId   ──► TransportRoute,
                     deliveryIds[] ──► Delivery,
                     party, amount, freightTotal, parcelTotal, status

Vehicle / Driver / TransportRoute
                     name, code, status
```

All six carry `businessId` (and `locationId` / `finYear` where relevant).

---

## API

| Endpoint | Methods |
|---|---|
| `/api/transporter` · `/api/transporter/[id]` | GET list / POST · GET / PUT / DELETE |
| `/api/delivery` · `/api/delivery/[id]` | GET list / POST · GET / PUT / DELETE |
| `/api/vehicle` · `/api/vehicle/[id]` | GET list / POST · GET / PUT / DELETE |
| `/api/driver` · `/api/driver/[id]` | GET list / POST · GET / PUT / DELETE |
| `/api/transport-route` · `/api/transport-route/[id]` | GET list / POST · GET / PUT / DELETE |
| `/api/dispatch` · `/api/dispatch/[id]` | GET list / POST · GET / PUT / DELETE |

Every route calls `requireSession()` first and returns 401 without a valid
session cookie.

Useful query parameters:

- `/api/delivery?unassigned=1` — only consignments not yet on a dispatch
- `/api/delivery?startDate=&endDate=` — the Filter card above the list
- `/api/delivery?search=` — matches transaction no, LR no, invoice no or
  supplier name
- `/api/options?ref=delivery-unassigned` — the Dispatch consignment picker
- `/api/options?ref=transporter|vehicle|driver|transport-route|dispatch`

---

## Files

```
models/           Transporter.js  Vehicle.js  Driver.js
                  TransportRoute.js  Dispatch.js  Delivery.js

app/admin/transport/
  transporter/    fields.js  page.jsx  [id]/page.jsx
  delivery/       fields.js  page.jsx            (add/edit are dialogs)
  vehicle/        fields.js  page.jsx  [id]/page.jsx
  driver/         fields.js  page.jsx  [id]/page.jsx
  route/          fields.js  page.jsx  [id]/page.jsx
  dispatch/       fields.js  page.jsx  [id]/page.jsx

app/api/          transporter/  delivery/  vehicle/
                  driver/  transport-route/  dispatch/     each with [id]/

components/       DeliveryView.jsx
```

Shared files this module extended (all additive):

- `components/ListView.jsx` — `badges` column format, `col.value`
- `components/Field.jsx` — `checkgroup` field type
- `lib/validate.js` — coerce `checkgroup` to a string array
- `lib/refLabels.js` — transporter / vehicle / driver / route / dispatch labels
- `lib/docnumber.js` — `nextSeriesNumber()`
- `app/api/options/route.js` — new refs, and `where` support so a ref can
  narrow its own pool
- `config/nav.js` — the Transportation group
- `app/globals.css` — `.pill-blue`, `.pill-red`

---

## Known gaps

- **Concurrent document numbering.** Two dispatches saved in the same
  millisecond can still collide on `docNo`. Needs a unique index on
  `docNo` or a counter collection.
- **Vehicle, Driver and Route carry no detail** beyond name / code / status —
  no capacity, licence number, expiry dates or distance. Add fields to the
  relevant `fields.js` and model when needed.
- **Dispatch has no delivery confirmation** — status is set by hand, there is
  no proof-of-delivery or per-consignment status.
- **No tenant enforcement.** As elsewhere in the app, `businessId` arrives from
  the client and is not bound to the session, so any signed-in user can read
  another branch's records by id. This is a project-wide item, not specific to
  this module.

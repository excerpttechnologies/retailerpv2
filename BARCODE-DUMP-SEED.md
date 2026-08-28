# Barcode dump — seed & delete

Loads `dump db for grow (2).xlsx` into the `barcodeLabel` collection so the
rows appear on **Inventory › Barcode Item**.

---

## Commands

```bash
npm run seed:barcodes            # dry run  - reports, writes nothing
npm run seed:barcodes:apply      # inserts 20,793 rows

npm run delete:barcodes          # dry run  - reports, deletes nothing
npm run delete:barcodes:apply    # removes every imported row
```

Both default to a dry run. The destructive form is a **separate script name**,
not a flag, so it can never be reached by accident. Run them from the project
root — they read `MONGODB_URI` out of `.env` themselves.

Seed → delete → seed is repeatable as often as you like.

| Script | File |
|---|---|
| seed | `scripts/seedBarcodeDump.mjs` |
| delete | `scripts/deleteBarcodeDump.mjs` |
| source data | `dump db for grow (2).xlsx` (project root) |

---

## The source file

One sheet, `barcode_db.barcodes` — **20,793 data rows × 20 columns**. It is a
scrape, not a Mongo export: every row carries the same `_scraped_at` of
`2026-08-08T11:30:34`, and `_row_index` / `item_key` are scraper bookkeeping.

Three branches:

| Branch in sheet | Rows |
|---|---|
| `TEMPLE FABRICS, SILKS & SAREES` | 17,703 |
| `SUVARNA FABRICS` | 2,250 |
| `Temple Fabrics` | 840 |

Note `Temple Fabrics` and `TEMPLE FABRICS, SILKS & SAREES` are **different
businesses**, not a casing mismatch.

---

## What gets written

Only what the Barcode Item screen reads, per
`app/api/inventory-barcode-list/route.js`:

| Screen column | `barcodeLabel` field | Sheet column |
|---|---|---|
| Image | `imageUrl` | `image_url` |
| Item | `printDescription` | `Item Name` |
| RSP | `retailPrice` | `RSP` |
| CP | `finalNet` | `CP` |
| *(Group Name filter)* | `groupId` | `Group` → resolved to a real ProductGroup |
| *(Items filter)* | `itemCode` | `Item Code` |
| *(scoping)* | `businessId`, `locationId` | from `branch` |
| *(sort order)* | `createdAt`, `updatedAt` | from `_scraped_at` |

A sample document:

```json
{
  "businessId":       "6a853cdefb266c4358beb548",
  "locationId":       "6a858ded9d37d436b1fc02dc",
  "itemCode":         "160946",
  "printDescription": "3PC-ASUIT",
  "retailPrice":      "2388.87",
  "finalNet":         "1525",
  "groupId":          "6a8c18d6a0c19c692d203308",
  "imageUrl":         "https://templeimg.blr1.digitaloceanspaces.com/160946.jpg?...",
  "createdAt":        "2026-08-08T11:30:34.923Z",
  "updatedAt":        "2026-08-08T11:30:34.923Z"
}
```

### Deliberately NOT written

`barcodeGenerated`, `oldBarcode`, `grcId`, `supplierId`, `qty`, `hsn`,
`purRate`, `disc`, `gst`, `wspPrice`, `dpPrice`, `offerPrice`, `subgroup`.

Nothing in the sheet supplies them, or the screen does not use them. **So
"Barcode No" and "GRC No" render blank — that is intended, not a defect.**
The sheet has no barcode column at all; its only identifier is `Item Code`.

### Why CP goes in `finalNet` and not `purRate`

Confirmed against the source system's Barcode Report. Item `160946` shows
**Purchase Rate 1479.25**, **Discount −45.75**, **Final Rate 1525.00** — and
the sheet's `CP` is `1525`. So CP is the *final* rate.

It also matters mechanically: the screen's **CP Filter queries `finalNet`
specifically**. Putting the value in `purRate` would still display (the column
reads `finalNet || purRate`) but the filter would silently return nothing.

Verified on five items — Excel RSP/CP matched the report exactly every time:

| Item Code | RSP | CP / Final Rate |
|---|---|---|
| 160946 | 2388.87 | 1525.00 |
| 248865 | 869.99 | 409.51 |
| 251358 | 2900.00 | 1300.00 |
| 165704 | 220.00 | 103.00 |
| 114466 | 990.00 | 700.00 |

---

## Branch → business + location

The sheet's `branch` column holds **business** names only; there is no location
column anywhere in the 20.

| Branch | Business | Location | How decided |
|---|---|---|---|
| `TEMPLE FABRICS, SILKS & SAREES` | `6a853ba0fb266c4358beb530` | `6a874b62b5810c74e6a9b9c4` OMSHREE FABS (RRN) | only location under that business |
| `SUVARNA FABRICS` | `6a853bf6fb266c4358beb538` | `6a8c28fbc67379ce90586e44` SUVARNA FABRICS | only location under that business |
| `Temple Fabrics` | `6a853cdefb266c4358beb548` | `6a858ded9d37d436b1fc02dc` **TEMPLE FABRICS WAREHOUSE** | confirmed — see below |

TEMPLE FABRICS has three locations, so that one had to be established rather
than inferred. On the source system (`erp.orbiteerp.com`) → **Reports ›
Barcode Report**, with **Business Location = All Locations**, item codes
`160946`, `248865`, `251358`, `165704` and `114466` **all resolved to
Temple Fabrics Warehouse**.

Repeat that search if the mapping is ever in doubt.

**Group matching: 20,793 of 20,793 rows** matched an existing ProductGroup for
their business, so no row was left without one. The sheet's `Group` column is
the broad category (SAREES, FABRICS, 3 PC SET …) which is what the ERP holds
as ProductGroups. `Sub Group` is not used.

---

## Safety

**Seeding is insert-only.** Nothing existing is updated or deleted.

**It refuses to run twice.** Every pre-existing row came from barcode
generation and carries a `grcId`. The seed counts rows lacking one first and
aborts if it finds any — so a double run cannot duplicate 20,793 records.

**Deleting is narrowly targeted.** Three conditions, all of which must hold:

1. no `grcId`
2. no `barcodeGenerated`
3. in one of the three business+location pairs the import targeted

Any one alone would be too loose. Both scripts print samples of what they are
about to touch before touching it.

> A detail worth knowing if you ever edit that filter: on genuine rows
> `barcodeGenerated` is an **empty string**, not missing. Imported rows omit
> the field entirely. `$exists: false` distinguishes the two — an
> `{ $eq: '' }` test would delete real data.

Expected counts:

```
before seeding    69
after seeding     20,862      (69 + 20,793)
after deleting    69          back to exactly where it started
```

---

## Known limitation — the images will not display

`imageUrl` **is** stored on all 20,793 rows. The URLs themselves are broken,
in two different ways, and neither is fixable from this sheet:

**15,982 rows — DigitalOcean Spaces presigned links.** Signed
`20260807T111213Z` with `X-Amz-Expires=300`, so they expired five minutes
later — the day *before* the sheet was scraped. The server confirms it:

```
HTTP 403
<Error><Code>AccessDenied</Code><Message>Request has expired.</Message>
       <Resource>templeimg/160946.jpg</Resource></Error>
```

**4,811 rows — malformed.** A base64 data-URI was concatenated onto a
hostname:

```
https://erp.orbiteerp.com/data:image/jpeg;base64,/9j/4QAYRXhpZgAA...
```

Returns `HTTP 200` with 577 bytes of `text/html` — the site's 404 page — where
the browser expects a JPEG. These **do** contain real image data, just wrapped
wrongly; stripping the `https://erp.orbiteerp.com/` prefix would leave a valid
inline data-URI that renders. That repair has not been applied: it transforms
source data, so it needs a deliberate decision.

The 15,982 presigned links cannot be recovered at all and need a fresh export
with longer-lived URLs.

---

## After seeding — how to check

**Inventory › Barcode Item** → top bar set to the business and location you
want → press **Search** (the screen stays empty until you do).

Item, RSP and CP will be populated. Barcode No and GRC No blank. Images broken.

# PIN code → address autofill

Type a six-digit PIN code into any address block and **City, State, Country and
District fill themselves in**.

Live on all three contact forms, billing **and** shipping — six fields in total:

| Form | Blocks |
|---|---|
| `app/admin/contact/supplier/` | Billing Details · Shipping Details |
| `app/admin/contact/agent/` | Billing Details · Shipping Details |
| `app/admin/contact/customer/` | Billing Details · Shipping Details |

---

## How to use it

1. Contacts → Suppliers / Agents / Customers → **Add**
2. Basic Information tab → Billing Details
3. Type a PIN, e.g. `560001`

While it works a grey line appears under the box (*"Looking up 560001…"*), then
it becomes the resolved place (*"Bangalore, Karnataka"*) and the four fields
above are filled. A bad PIN shows *"No address found for 999999."* in red and
changes nothing.

Only digits are accepted, capped at six. Nothing is fetched until all six are
present, and the call is debounced by 450 ms, so typing a PIN costs **one**
request, not six.

## What it fills

| From the lookup | Written to (billing block) |
|---|---|
| `city` (= district) | `billingCity` |
| `state` | `billingState` |
| `country` | `billingCountry` |
| `district` | `billingDistrict` |

The shipping block writes the `shipping*` equivalents. "Same as Billing Address"
still works exactly as before — it copies whatever is in the billing block,
autofilled or hand-typed.

Fields the user has already typed into **are** overwritten by a fresh lookup.
Change the PIN, get the new address.

---

## Files

| File | What it does |
|---|---|
| `app/api/pincode/route.js` | resolves a PIN. New. |
| `components/Field.jsx` | `PincodeField`, reached by `type: 'zip'`. New. |
| `components/MultiSelect.jsx` | single-mode fallback fix, see below |
| `app/admin/contact/*/tabs.js` | the six zip fields switched from `text` to `zip` |

### The field spec

```js
{
  "k": "billingZipCode",
  "label": "Zip Code",
  "ph": true,
  "type": "zip",
  "fill": {
    "city":     "billingCity",
    "state":    "billingState",
    "country":  "billingCountry",
    "district": "billingDistrict"
  }
}
```

`fill` maps what the lookup returns onto **this** form's keys, which is how one
control serves both the billing and the shipping block. Drop `fill` and it is
just a digits-only text box with no lookup.

`type: 'zip'` needs no change in `lib/validate.js` — it falls through to
`String(raw)`, which is what the `billingZipCode` String path wants.

### No parent component had to change

`PincodeField` writes four keys at once through a `patch` helper that Field
builds itself:

```js
const patch = (obj) => Object.entries(obj).forEach(([k, v]) => onChange(k, v));
```

Every consumer of `Field` already passes an `onChange(key, value)` backed by a
functional `setState`, so back-to-back calls merge rather than clobber. That
means the field works in `TabbedFormView`, `FormView`, `ModalForm` and anywhere
else `Field` is rendered, with no wiring.

---

## The API route

`GET /api/pincode?pin=560001` → session-guarded, same as every other route.

```json
{ "found": true, "pin": "560001", "city": "Bangalore", "district": "Bangalore",
  "state": "Karnataka", "country": "India", "areas": ["Bangalore", "…"] }
```

Not found / bad input / upstream down all return `{ "found": false, "reason": "…" }`
with HTTP 200 — the form shows the reason and carries on.

**Source:** `https://api.postalpincode.in/pincode/<pin>` — India Post data, free,
no API key, no registration. A PIN's district and state never change, which is
what makes caching safe.

**Two cache layers**, both checked before the network:

1. `MEM` — a `Map` in the route module. Free, lost on restart.
2. the **`pincode`** collection — survives restarts, and covers the case where
   the postal API is unreachable.

A six-second `AbortSignal.timeout` stops a slow upstream from holding the
request open.

### It also seeds the City picker

The City control reads `/api/cities`, which reads the **`city`** collection —
and that collection **shipped empty**, so the picker offered nothing at all on
every contact form. Each successful lookup upserts its city, so the dropdown
fills in with the places you actually use.

Verified against the live DB:

```
BEFORE  city rows: 0, pincode rows: 0
560001  city Bangalore      · Karnataka   · India   (10 areas)
110001  city Central Delhi  · Delhi       · India   (21 areas)
400001  city Mumbai         · Maharashtra · India   (7 areas)
999999  found: false
repeat 560001 -> served from db-cache, no network call
AFTER   city rows: 3, pincode rows: 3
```

### One fix this needed elsewhere

`components/MultiSelect.jsx` in `mode="single"` did:

```js
options.find((o) => o.value === value) || null
```

An unknown value rendered **blank**. Since autofill can set a city before
`/api/cities` has that page loaded, single mode now falls back to the raw value
the way the multi branch always did:

```js
options.find((o) => o.value === value) || (value ? { value, label: String(value) } : null)
```

This also fixes an older latent bug: `/api/cities` caps at 200 rows, so any
saved city past that cap used to render blank when reopening a contact.

---

## Limits

- **India only.** India Post covers Indian PIN codes; a foreign postcode returns
  not-found.
- **City is set to the district**, since that is the closest thing the postal
  data has to the city name. One PIN often covers many post-office areas — they
  come back in `areas` and are not currently offered as a choice.
- **Needs outbound internet** the first time a PIN is seen. After that the DB
  cache answers offline.
- The `pincode` collection is a cache, not a master. Deleting it is safe.

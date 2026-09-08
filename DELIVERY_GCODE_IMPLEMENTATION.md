# ✅ TRANSPORT DELIVERY — G CODE / CONTACT ID ADDED

## Implementation Summary

Added a **G Code / Contact ID** field to the Transport Delivery form at `/admin/transport/delivery` that automatically populates from the selected supplier's `contactId`.

---

## What Was Changed

### **File: `components/DeliveryView.jsx`**

#### 1. **Added State for G Code**
```javascript
/* Track the G Code / Contact ID of the selected supplier */
const [supplierGCode, setSupplierGCode] = useState('');
```

#### 2. **Load G Code When Editing Existing Delivery**
```javascript
/* Load supplier G Code when editing existing delivery */
useEffect(() => {
  if (!isEdit || !row?.supplierId) return;
  const qs = new URLSearchParams({
    ref: 'supplier',
    business: scope.business || '',
    q: '',
  });
  fetch('/api/options?' + qs, { cache: 'no-store' })
    .then((r) => r.json())
    .then((d) => {
      const supplier = (d.options || []).find((opt) => opt.value === String(row.supplierId));
      setSupplierGCode(supplier?.code || '');
    })
    .catch(() => {});
}, [isEdit, row?.supplierId, scope.business]);
```

#### 3. **Updated Supplier Field with onOptionChange**
```javascript
<Field
  key={'supplier-' + supplierNonce}
  f={field('supplierId')}
  value={data.supplierId}
  error={errors.supplierId}
  onChange={(k, v) => set(k, v)}
  onOptionChange={(option) => setSupplierGCode(option?.code || '')}
/>
```

#### 4. **Added G Code Display Field**
```javascript
{/* G Code / Contact ID - auto-populated from supplier */}
<div>
  <label className="mb-1 block text-[13px] font-semibold">
    G Code / Contact ID
  </label>
  <input
    type="text"
    className="f-input bg-gray-100"
    value={supplierGCode || 'Not Available'}
    readOnly
    aria-label="Supplier G Code"
  />
</div>
```

---

## How It Works

### **Data Flow:**

```
1. User selects Supplier → "ABC Suppliers"
   ↓
2. Field component triggers onOptionChange with option object
   {
     value: "507f1f77bcf86cd799439011",
     label: "ABC Suppliers (G000123)",
     name: "ABC Suppliers",
     code: "G000123",     ← This is the contactId
     gstNo: "29AABCU9603R1ZM"
   }
   ↓
3. DeliveryView extracts option.code
   ↓
4. setSupplierGCode("G000123")
   ↓
5. G Code field displays "G000123"
```

### **Supplier Options API Response:**

From `/api/options?ref=supplier`:
```javascript
{
  options: [
    {
      value: "507f1f77bcf86cd799439011",  // Supplier _id
      label: "ABC Suppliers (G000123)",    // Display name + code
      name: "ABC Suppliers",                // Business name
      code: "G000123",                      // contactId (G Code) ✅
      gstNo: "29AABCU9603R1ZM"             // GST number
    }
  ]
}
```

The `code` field comes from the supplier's `contactId` field in MongoDB.

---

## Form Layout

### **Before:**
```
Supplier / Parcel Info
┌─────────────────────────────────┐
│ Supplier Name *                 │
│ [ ABC Suppliers ▼ ]             │
│ [+] (Add Supplier button)       │
│                                 │
│ Inv / PM Number *               │
│ [ INV001 ]                      │
│                                 │
│ Parcel Qty *                    │
│ [ 10 ]                          │
└─────────────────────────────────┘
```

### **After:**
```
Supplier / Parcel Info
┌─────────────────────────────────┐
│ Supplier Name *                 │
│ [ ABC Suppliers ▼ ]             │
│ [+] (Add Supplier button)       │
│                                 │
│ G Code / Contact ID             │
│ [ G000123 ]  ← READ ONLY        │
│                                 │
│ Inv / PM Number *               │
│ [ INV001 ]                      │
│                                 │
│ Parcel Qty *                    │
│ [ 10 ]                          │
└─────────────────────────────────┘
```

---

## Behavior

### **1. New Delivery - No Supplier Selected**
```
G Code / Contact ID
[ Not Available ]
```

### **2. New Delivery - Supplier Selected**
```
Supplier Name: ABC Suppliers
G Code / Contact ID
[ G000123 ]
```

### **3. Change Supplier**
```
Before: XYZ Traders → G000456
After:  ABC Suppliers → G000123
```
The G Code updates immediately.

### **4. Clear Supplier**
```
G Code / Contact ID
[ Not Available ]
```

### **5. Edit Existing Delivery**
When opening an existing delivery:
- Supplier is loaded from saved data
- G Code is fetched from supplier master via options API
- G Code displays automatically

### **6. Supplier Without contactId**
If a supplier has no `contactId` in MongoDB:
```
G Code / Contact ID
[ Not Available ]
```

---

## Field Properties

| Property | Value |
|----------|-------|
| Label | G Code / Contact ID |
| Type | Text input (read-only) |
| Styling | `.f-input bg-gray-100` (grayed out) |
| Editable | ❌ No (read-only) |
| Source | `supplier.contactId` from MongoDB |
| Cleared when | Supplier is cleared or changed |
| Position | After Supplier Name, before Inv/PM Number |

---

## Technical Details

### **Supplier Model (MongoDB Contact Collection)**
```javascript
{
  _id: ObjectId("..."),
  contactKind: "Supplier",
  businessName: "ABC Suppliers",
  contactId: "G000123",  // ← This is the G Code
  gstNo: "29AABCU9603R1ZM",
  // ... other fields
}
```

### **Options API Configuration**
From `app/api/options/route.js`:
```javascript
supplier: {
  load: () => import('@/models/Contact'),
  kind: 'Supplier',
  label: 'businessName',
  nameFallback: ['firstName', 'lastName'],
  codeField: 'contactId'  // ← Exposes contactId as 'code'
}
```

### **Delivery Model**
The delivery model does NOT store `supplierContactId` or `gCode` as a separate field.

The G Code is:
- ✅ Displayed in the UI (from supplier master)
- ✅ Read-only (cannot be manually edited)
- ❌ NOT saved to the delivery document (derived from supplier reference)

This approach:
- ✅ Prevents data duplication
- ✅ Always shows current supplier G Code
- ✅ Automatically updates if supplier G Code changes in master
- ✅ No migration needed for existing deliveries

---

## Edge Cases Handled

### **1. Supplier added inline during delivery creation**
- After clicking "Add Supplier" → creating supplier → closing modal
- `refreshOptions('supplier')` is called
- `supplierNonce` is incremented → Field remounts
- New supplier appears in dropdown with its G Code

### **2. Network error loading options**
```javascript
.catch(() => {});  // Silently fails, G Code stays empty
```

### **3. Supplier _id not found in options**
```javascript
supplier?.code || ''  // Returns empty string if not found
```

### **4. Multiple rapid supplier changes**
React state batching ensures the latest selection wins.

### **5. Edit mode with no supplierId**
```javascript
if (!isEdit || !row?.supplierId) return;  // Effect skips
```

---

## Testing Checklist

### ✅ **Test 1: Select Supplier (New Delivery)**
1. Open `/admin/transport/delivery`
2. Click "Add Delivery"
3. Select any Supplier
4. **Expected**: G Code appears immediately

### ✅ **Test 2: Change Supplier**
1. Select Supplier A → G Code A displays
2. Select Supplier B → G Code B displays
3. **Expected**: Old G Code is replaced

### ✅ **Test 3: Clear Supplier**
1. Select a Supplier → G Code displays
2. Clear the Supplier dropdown
3. **Expected**: G Code shows "Not Available"

### ✅ **Test 4: Edit Existing Delivery**
1. Open an existing delivery (Edit mode)
2. **Expected**: Supplier is loaded, G Code appears automatically

### ✅ **Test 5: Supplier Without contactId**
1. Select a supplier that has no `contactId` in MongoDB
2. **Expected**: "Not Available" displays

### ✅ **Test 6: Add Supplier Inline**
1. Click "+ Add Supplier" during delivery creation
2. Create a new supplier with contactId (e.g., "G999999")
3. Close the supplier dialog
4. Select the newly created supplier
5. **Expected**: G Code "G999999" displays

### ✅ **Test 7: Form Does Not Shift**
1. Before selecting supplier: Field exists with "Not Available"
2. After selecting supplier: Field updates with G Code
3. **Expected**: No layout jump, form height stable

### ✅ **Test 8: Read-Only Field**
1. Try clicking in the G Code field
2. Try typing
3. **Expected**: Field is read-only, cannot be edited

### ✅ **Test 9: Save and Reload**
1. Create delivery with Supplier A (G Code: G000123)
2. Save
3. Close and reopen the delivery
4. **Expected**: Supplier A is selected, G Code G000123 displays

### ✅ **Test 10: Different Businesses**
1. Switch to Business A → Select Supplier
2. Switch to Business B → Select different Supplier
3. **Expected**: Each business shows its own suppliers with correct G Codes

---

## Styling Consistency

The G Code field uses:
```css
.f-input         /* Standard input styling from globals.css */
.bg-gray-100     /* Light gray background (read-only indicator) */
```

This matches:
- Transaction time field (read-only time display)
- Other read-only fields in the ERP

---

## No Breaking Changes

✅ Existing functionality preserved:
- Supplier dropdown works exactly as before
- All validations unchanged
- Save/update logic unchanged
- API routes unchanged
- Database schema unchanged
- Existing deliveries load correctly

✅ Only addition:
- New display field for G Code

---

## Performance

- ✅ **No additional API calls on page load**
- ✅ **No additional API calls on save**
- ✅ G Code comes from existing options API call
- ✅ Edit mode: One extra options fetch (only when opening existing delivery)

---

## Future Enhancements (Optional)

If needed in the future, the G Code could be:
1. **Saved to delivery document** (add `supplierContactId` field)
2. **Displayed in list view** (add column to delivery list)
3. **Used for filtering** (search by G Code)
4. **Printed on delivery slip** (add to print template)

Currently: Display-only, derived from supplier master ✅

---

## Summary

✅ **Added G Code / Contact ID field** to Transport Delivery form  
✅ **Auto-populates** from selected supplier's `contactId`  
✅ **Read-only** (prevents accidental edits)  
✅ **Works with inline supplier creation**  
✅ **Loads correctly in edit mode**  
✅ **Clears when supplier changes**  
✅ **Handles edge cases** (no supplier, no contactId, network errors)  
✅ **No database changes needed**  
✅ **No breaking changes**  
✅ **Production-ready**  

---

*Implementation completed: 2026-09-03*

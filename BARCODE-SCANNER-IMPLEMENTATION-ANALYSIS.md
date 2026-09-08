# BARCODE SCANNER IMPLEMENTATION ANALYSIS
## Physical Barcode Scanner Device Integration

This document provides a complete analysis of where and how physical barcode scanner devices are implemented in the GrooERP Retail application.

---

## 🔧 CORE SCANNER INFRASTRUCTURE

### 1. Main Scanner Hook (Physical Device Handler)
**File:** `components/useScanner.js`

**Purpose:** Window-level keyboard listener that detects physical USB/Bluetooth barcode scanner input

**How It Works:**
- Listens to `keydown` events on the `window` object
- Differentiates between human typing and scanner input based on inter-keystroke timing
- Scanners type at < 30ms intervals; humans type slower (> 60ms threshold)
- Automatically handles:
  - Focus anywhere on the page (no need to click into a search box)
  - Enter/Tab suffix that scanners send
  - Double-trigger prevention (same barcode within 700ms)
  - Prevents stealing keystrokes from input fields (unless field has `data-scan-target` attribute)

**Functions Exported:**
1. **`useScanner(onScan, options)`** - Main scanner hook
   - `onScan`: Callback function when barcode is scanned
   - `options.enabled`: Enable/disable scanning
   - `options.allowRepeat`: Allow same barcode twice quickly
   - `options.minLength`: Minimum barcode length (default: 4)

2. **`useBarcodeLookup({ business, location, intent, invoiceId, transferId })`** - Server lookup hook
   - Calls `/api/barcode/scan` to validate and resolve barcode
   - Returns barcode unit data or error messages
   - Handles offline scenarios

3. **`useScanSound()`** - Audio feedback hook
   - Plays high-pitched beep for successful scan
   - Plays lower double-beep for failed scan
   - Uses Web Audio API (no file dependencies)

---

## 🌐 SCANNER API ENDPOINT

### 2. Barcode Scan API
**File:** `app/api/barcode/scan/route.js`

**Endpoint:** `POST /api/barcode/scan`

**Purpose:** Central validation endpoint for all scanner operations

**Request Body:**
```json
{
  "code": "barcode-value",
  "business": "businessId",
  "location": "locationId",
  "intent": "POS_SALE|POS_RETURN|TRANSFER_OUT|TRANSFER_RECEIVE|TRANSFER_RETURN|LOOKUP",
  "invoiceId": "invoice-id (optional)",
  "transferId": "transfer-id (optional)",
  "scanned": ["already-scanned-barcodes"]
}
```

**Response:**
- **200 OK:** Returns validated barcode unit data
- **4xx Error:** Returns error code and user-friendly message

**Related Library:**
- `lib/inventory.js` - Contains `scanBarcode()` function with business logic
- Validates barcode status, location, business, and intent
- Prevents duplicate scans within same document

---

## 📱 SCREENS USING PHYSICAL SCANNER

### 3. Point of Sale (POS) Till
**File:** `components/PosTill.jsx`

**Line:** 286
```javascript
useScanner(addScanned, { enabled: Boolean(business && location) });
```

**Scanner Behavior:**
- Adds items to the sale by scanning barcodes
- Works with focus anywhere on the till screen
- No need to click search box first
- Automatically looks up item details
- Updates quantity if same item scanned again

**Intent:** `POS_SALE`

---

### 4. POS Return Form
**File:** `components/PosReturnForm.jsx`

**Line:** 101
```javascript
useScanner(onScan, { enabled: !saving });
```

**Scanner Behavior:**
- Scans items being returned by customer
- Validates barcode belongs to a sold item
- Checks if item can be returned
- Disabled while saving to prevent double-entry

**Intent:** `POS_RETURN`

---

### 5. Stock Transfer (Create New Transfer)
**File:** `components/StockTransferForm.jsx`

**Line:** 113
```javascript
useScanner(addCode, { enabled: !saving });
```

**Scanner Behavior:**
- Scans items to add to stock transfer
- Works from any location on the page
- Validates item is in stock at source location
- Prevents adding same item twice
- Shows max quantity available

**Intent:** `TRANSFER_OUT`

**Note:** Found in line 88 of `STOCK-TRANSFER-MODULE.md`:
> "Scanning the same code again adds 1 to that line rather than opening a second one — which is what a barcode gun does when it repeats."

---

### 6. Stock Transfer Detail (Receive/Return)
**File:** `components/StockTransferDetail.jsx`

**Line:** 116
```javascript
useScanner(onScan, { enabled: Boolean(doc) && !busy });
```

**Scanner Behavior:**
- Receives items at destination location
- Returns items back to source
- Validates transfer document exists
- Shows user hint: "Scan items with the barcode gun to tick them below - no need to click into a box first."

**Intents:** `TRANSFER_RECEIVE` or `TRANSFER_RETURN`

**UI Hint Location:** Line 297-299

---

### 7. Stock Transfer List (Search by Document Barcode)
**File:** `app/admin/transaction/stocktransfers/transfer/page.jsx`

**Line:** 59
```javascript
useScanner(async (code) => {
  const r = await fetch('/api/stock-transfer?perPage=1&search=' + encodeURIComponent(code));
  const d = await r.json().catch(() => ({}));
  // Navigate to transfer detail
});
```

**Scanner Behavior:**
- Scans document barcode (transfer number) to open transfer
- Searches for transfer by barcode
- Auto-navigates to transfer detail page
- No validation needed (read-only search)

---

### 8. Stock Transfer Packet Form
**File:** `components/StockTransferPacketForm.jsx`

**Line:** 146-149 (Logic, scanner hook likely in parent)
```javascript
/* scanning a code already on the packet adds ONE to that line rather
   than opening a second line for the same item - which is what a
   barcode gun repeating a scan produces */
```

**Scanner Behavior:**
- Adds items to transfer packet
- Increments quantity on duplicate scan
- Prevents creating duplicate lines

---

## 📚 SUPPORTING FILES

### 9. Inventory Business Logic
**File:** `lib/inventory.js`

**Key Function:** `scanBarcode()` (Line 117)

**Purpose:**
- Core validation logic for all barcode scans
- Checks barcode status (IN_STOCK, SOLD, IN_TRANSIT, etc.)
- Validates business and location ownership
- Prevents duplicate scans within same document
- Returns detailed error codes for user feedback

**Error Codes Defined:**
- `NOT_FOUND` - Barcode doesn't exist
- `DUPLICATE_SCAN` - Already scanned in this document
- `WRONG_LOCATION` - Item at different location
- `SOLD` - Item already sold
- `IN_TRANSIT` - Item in transfer
- `VOID` - Item voided
- `NOT_ON_INVOICE` - Item not on specified invoice
- `ALREADY_RETURNED` - Item already returned

---

### 10. Barcode Lookup Helper Functions
**File:** `lib/inventory.js`

**Key Functions:**
- `scanBarcode()` - Main validation (Line 117)
- `loadBarcodes()` - Bulk load barcode data (Line 735)
- `resolveBarcode()` - Pick correct barcode from duplicates (Line 182)

---

## 🎯 SCANNER CONFIGURATION

### Scanner Device Requirements:
1. **Type:** USB or Bluetooth keyboard wedge scanner
2. **Suffix:** Must send Enter or Tab after barcode
3. **Speed:** Must type characters at < 50ms intervals
4. **Format:** Standard linear barcodes (Code 128, EAN-13, etc.)

### Timing Thresholds:
- **Human typing threshold:** 60ms between keystrokes
- **Duplicate scan window:** 700ms
- **Minimum barcode length:** 4 characters

---

## 📊 SCANNER INTENTS & FLOWS

| Intent | Screen | File | Validates |
|--------|--------|------|-----------|
| `POS_SALE` | POS Till | `components/PosTill.jsx` | Item in stock, not sold |
| `POS_RETURN` | POS Return | `components/PosReturnForm.jsx` | Item sold, on invoice, not returned |
| `TRANSFER_OUT` | Create Transfer | `components/StockTransferForm.jsx` | Item in stock at source location |
| `TRANSFER_RECEIVE` | Receive Transfer | `components/StockTransferDetail.jsx` | Item in transit to this location |
| `TRANSFER_RETURN` | Return Transfer | `components/StockTransferDetail.jsx` | Item in transit, can be returned |
| `LOOKUP` | General Search | Various | Read-only, no validation |

---

## 🔊 AUDIO FEEDBACK

**File:** `components/useScanner.js` (Line 146)

**Success Sound:** High-pitched beep (1180 Hz, 90ms)
**Error Sound:** Lower double-beep (320 Hz, 220ms)

**Implementation:** Web Audio API (no audio files needed)

---

## 🧪 TESTING & DEBUGGING

### Test Scanner Without Physical Device:
The scanner hook treats any rapid keyboard input as a scan. To test:
1. Open any scanner-enabled screen
2. Quickly type a barcode and press Enter
3. System treats it as a scan if typed fast enough

### Scanner Detection Log:
- Check browser console for scan events
- Monitor network tab for `/api/barcode/scan` POST requests
- Look for audio playback (success/error beeps)

---

## 📁 COMPLETE FILE LIST

### Core Scanner Files:
1. `components/useScanner.js` - Physical scanner hook
2. `app/api/barcode/scan/route.js` - Validation API
3. `lib/inventory.js` - Business logic

### Screens Using Scanner:
4. `components/PosTill.jsx` - POS sales
5. `components/PosReturnForm.jsx` - POS returns
6. `components/StockTransferForm.jsx` - Create transfer
7. `components/StockTransferDetail.jsx` - Receive/return transfer
8. `components/StockTransferPacketForm.jsx` - Packet creation
9. `app/admin/transaction/stocktransfers/transfer/page.jsx` - Transfer search

### Related Files:
10. `lib/barcodeEngine.js` - Barcode generation logic
11. `models/BarcodeLabel.js` - Database schema (likely)
12. `config/nav.js` - Navigation with scanner icons
13. `STOCK-TRANSFER-MODULE.md` - Documentation
14. `lib/chatbot/knowledge.js` - Help system docs

---

## 🎯 KEY INSIGHTS

1. **Single Hook for All Screens:** All scanner functionality uses the same `useScanner` hook
2. **Window-Level Listener:** Works without clicking into input fields
3. **Central Validation:** All scans go through `/api/barcode/scan` for consistency
4. **Audio Feedback:** Immediate sound feedback for operators looking at goods, not screen
5. **Duplicate Prevention:** Automatic handling of scanner double-triggers
6. **Intent-Based:** Same barcode validated differently based on what screen is using it

---

## 🚀 ADDING SCANNER TO NEW SCREEN

To add physical scanner support to a new screen:

```javascript
import { useScanner, useBarcodeLookup, useScanSound } from '@/components/useScanner';

function MyComponent() {
  const beep = useScanSound();
  const { lookup } = useBarcodeLookup({
    business: businessId,
    location: locationId,
    intent: 'YOUR_INTENT',
  });
  
  const handleScan = async (code) => {
    const result = await lookup(code, alreadyScanned);
    if (result.ok) {
      beep('ok');
      // Add item to your list
    } else {
      beep('error');
      alert(result.error);
    }
  };
  
  useScanner(handleScan, { enabled: true });
  
  return <div>Your UI</div>;
}
```

---

**Last Updated:** 2026-09-02
**Version:** 1.0

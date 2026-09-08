# 📊 DASHBOARD DATA - DYNAMIC ANALYSIS

## ✅ **YES, THE DASHBOARD DATA IS DYNAMIC!**

The dashboard pulls **real-time data** from your MongoDB database based on the selected Business, Location, and Financial Year.

---

## 🔄 **HOW IT WORKS**

### **1. Dynamic Data Fetching**
When you load the dashboard or change scope (Business/Location/Financial Year):

```javascript
useEffect(() => {
  fetch('/api/dashboard?business=X&location=Y&finYear=Z')
    .then(data => display(data))
}, [business, location, finYear]);
```

**Result**: The data updates automatically when you switch Business, Location, or Financial Year!

---

## 📊 **WHAT DATA IS DYNAMIC**

### **Tile 1: Total Purchase** ✅ DYNAMIC
- **Source**: Count of GRC (Goods Receipt Challan) documents
- **Query**: `Grc.countDocuments({ business, location, finYear })`
- **Updates**: When new GRCs are created
- **Note**: Shows document count, not monetary value

### **Tile 2: Total Sales** ✅ DYNAMIC
- **Source**: Sum of Sales Invoices + POS Invoices
- **Query**: 
  ```javascript
  SalesInvoice.sum('netValue') + PosInvoice.sum('totalAmount')
  ```
- **Updates**: When new sales/POS invoices are created
- **Calculation**: Real-time from database

### **Tile 3: Purchase Due** ✅ DYNAMIC
- **Source**: Purchase Invoices - Debit Notes - Payments
- **Formula**:
  ```
  Purchase Due = Purchase Invoices Total
                 - Debit Notes
                 - Payment Vouchers
  ```
- **Updates**: When:
  - New purchase invoices are created
  - Debit notes are issued
  - Payments are made
- **Smart**: Floored at 0 (negative balances don't show)

### **Tile 4: Invoice Due** ✅ DYNAMIC
- **Source**: Sales + POS Outstanding + IC Invoices - Returns - Receipts
- **Formula**:
  ```
  Invoice Due = Sales Invoices
                + POS Outstanding
                + Inter-Company Invoices
                - Credit Notes
                - Sales Returns
                - POS Returns
                - Receipt Vouchers
  ```
- **Updates**: When:
  - New sales/POS invoices are created
  - Returns are processed
  - Payments are received
- **Smart**: Calculates actual receivables

### **Tile 5: Expenses** ✅ DYNAMIC
- **Source**: Sum of opening balances in EXPENSES ledger group
- **Query**: Walks ledger group tree from "EXPENSES" root
- **Updates**: When ledger opening balances change
- **Calculation**: Real-time aggregation

---

## 📈 **CHARTS ARE ALSO DYNAMIC**

### **Chart 1: Sales Last 30 Days** ✅ DYNAMIC
- **Data**: Sales invoices from last 30 days
- **Grouping**: By day
- **Split**: By Business (2 series)
- **Query**:
  ```javascript
  SalesInvoice.aggregate([
    { $match: { createdAt: { $gte: last30Days } } },
    { $group: { _id: { business, date }, total: { $sum: 'netValue' } } }
  ])
  ```
- **Updates**: Shows sales for each of the last 30 days
- **Real-time**: Refreshes when page loads or scope changes

### **Chart 2: Sales Current Financial Year** ✅ DYNAMIC
- **Data**: Sales invoices for selected financial year
- **Grouping**: By month (Apr-Mar)
- **Split**: By Business (2 series)
- **Query**:
  ```javascript
  SalesInvoice.aggregate([
    { $match: { createdAt: { $gte: FYStart, $lte: FYEnd } } },
    { $group: { _id: { business, month }, total: { $sum: 'netValue' } } }
  ])
  ```
- **Updates**: Shows 12 months of financial year
- **Real-time**: Based on selected FY in top bar

---

## 🎯 **SCOPE SENSITIVITY**

The dashboard respects ALL three scope selectors:

### **Business Scope:**
- ✅ Filters all transactions by selected business
- ✅ Ledger expenses filtered by business
- ✅ Charts split by business

### **Location Scope:**
- ✅ Filters transactions by selected location
- ✅ Charts respect location filter

### **Financial Year Scope:**
- ✅ All transaction queries filter by finYear
- ✅ Annual chart shows selected FY months
- ⚠️ Ledgers NOT filtered (they're not FY-scoped)

---

## 🔍 **DATA SOURCES**

| Tile/Chart | Collections Used | Aggregation |
|------------|------------------|-------------|
| **Total Purchase** | `grc` | `countDocuments()` |
| **Total Sales** | `salesinvoice`, `posinvoice` | `$sum netValue + totalAmount` |
| **Purchase Due** | `purchaseinvoice`, `debitnote`, `voucher` | `$sum` with settlements |
| **Invoice Due** | `salesinvoice`, `posinvoice`, `icsalesinvoice`, `creditnote`, `salesreturn`, `posreturn`, `voucher` | Complex calculation |
| **Expenses** | `ledger`, `ledgergroup` | Tree walk + `$sum openingBalance` |
| **Last 30 Days Chart** | `salesinvoice` | `$group` by date + business |
| **Annual Chart** | `salesinvoice` | `$group` by month + business |

---

## ⚡ **PERFORMANCE**

### **Optimized Queries:**
- ✅ Uses MongoDB aggregation pipeline
- ✅ Indexes on `businessId`, `locationId`, `finYear`
- ✅ Parallel `Promise.all()` for multiple tiles
- ✅ Efficient date range queries

### **Loading States:**
- Shows spinner while fetching: `loading ? <spin /> : <data>`
- Prevents stale data display
- Updates on scope change automatically

---

## 🔄 **WHEN DATA UPDATES**

### **Automatic Updates:**
1. **Page Load**: Fetches fresh data
2. **Business Change**: Re-fetches with new business filter
3. **Location Change**: Re-fetches with new location filter
4. **FY Change**: Re-fetches with new financial year filter

### **Manual Updates:**
- **Refresh Page**: `F5` or `Ctrl+R` fetches latest data
- **Navigate Away & Back**: Triggers new fetch

### **Real-Time:**
⚠️ **Not** real-time (no WebSocket/polling)
✅ **Fresh** on every page load
✅ **Dynamic** based on database content

---

## 📝 **EXAMPLE SCENARIO**

### Scenario: You create a new sales invoice

**Before:**
```
Total Sales: ₹1,00,000
Invoice Due: ₹50,000
Last 30 Days Chart: Shows old data
```

**After (refresh page):**
```
Total Sales: ₹1,15,000  ← Updated (+₹15,000)
Invoice Due: ₹65,000    ← Updated (+₹15,000)
Last 30 Days Chart: Shows new spike for today
```

**How?**
1. Sales invoice saved to `salesinvoice` collection
2. Next dashboard load queries database
3. Aggregation includes the new invoice
4. Tiles and charts show updated values

---

## 🛠️ **TECHNICAL DETAILS**

### **API Endpoint:**
- **Route**: `/api/dashboard/route.js`
- **Method**: `GET`
- **Parameters**: `business`, `location`, `finYear`
- **Response**: JSON with tiles, last30, byMonth

### **Database Operations:**
```javascript
// Example: Total Sales calculation
const salesTotal = await SalesInvoice.aggregate([
  { $match: { businessId, locationId, finYear } },
  { $group: { _id: null, total: { $sum: '$netValue' } } }
]);

const posTotal = await PosInvoice.aggregate([
  { $match: { businessId, locationId, finYear } },
  { $group: { _id: null, total: { $sum: '$totalAmount' } } }
]);

return salesTotal + posTotal; // Dynamic sum
```

### **Frontend:**
```javascript
// Fetches fresh data when scope changes
useEffect(() => {
  fetch('/api/dashboard?' + new URLSearchParams({
    business, location, finYear
  }))
  .then(r => r.json())
  .then(setData)
}, [business, location, finYear]);
```

---

## ✅ **SUMMARY**

| Aspect | Status |
|--------|--------|
| **Is data dynamic?** | ✅ YES |
| **Updates on create/edit?** | ✅ YES (on next page load) |
| **Respects Business scope?** | ✅ YES |
| **Respects Location scope?** | ✅ YES |
| **Respects FY scope?** | ✅ YES |
| **Real-time (WebSocket)?** | ❌ NO |
| **Fresh on page load?** | ✅ YES |
| **Uses live database?** | ✅ YES |
| **Aggregates transactions?** | ✅ YES |

---

## 💡 **KEY POINTS**

1. **100% Dynamic**: All tiles and charts pull from database
2. **Scope-Aware**: Filters by Business, Location, and FY
3. **Not Real-Time**: Updates on page refresh, not automatically
4. **Accurate**: Calculations include settlements (payments/receipts)
5. **Fast**: Optimized aggregation queries
6. **Reliable**: Handles missing data gracefully

---

**Bottom Line**: The dashboard is fully dynamic and shows real data from your transactions. Just refresh the page to see the latest numbers!

---

*Data flow: Database → API Aggregation → Dashboard Display*

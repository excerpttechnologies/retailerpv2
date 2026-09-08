# Supplier Seed Data Deletion Guide

## Overview
This guide helps you safely delete supplier seed/test data from your MongoDB database while preserving:
- ✅ Supplier module code (UI pages, API routes)
- ✅ Customer and Agent data
- ✅ Purchase, inventory, and accounting records
- ✅ All other ERP modules

## What Gets Deleted
- Only records in the `contact` collection where `contactKind = 'Supplier'`
- Supplier seed/test data
- Mock supplier records

## What Does NOT Get Deleted
- `/app/admin/contact/supplier/` - Supplier UI pages
- `/app/api/supplier/` - Supplier API routes
- `models/Contact.js` - Contact model (shared with Customers/Agents)
- Historical purchase records that reference suppliers
- Inventory items with supplier information
- Accounting/ledger entries

---

## Method 1: Using Node.js Script (Recommended)

### Step 1: Run the Script
```cmd
node seeddelete.js
```

### Step 2: Review Output
The script will:
1. Connect to MongoDB
2. Count supplier records
3. Check for dependencies
4. Create a backup JSON file
5. Ask for confirmation
6. Delete supplier records
7. Verify deletion
8. Show final report

### Step 3: Confirm Deletion
When prompted, type `yes` to proceed or `no` to cancel.

### Options:
- **Normal mode**: Skips suppliers with dependencies
  ```cmd
  node seeddelete.js
  ```

- **Force mode**: Deletes all suppliers (⚠️ dangerous)
  ```cmd
  node seeddelete.js --force
  ```

---

## Method 2: Using Python Script

### Step 1: Install Dependencies
```cmd
pip install pymongo dnspython
```

### Step 2: Run the Script
```cmd
python seeddelete.py
```

### Options:
- **Normal mode**:
  ```cmd
  python seeddelete.py
  ```

- **Force mode**:
  ```cmd
  python seeddelete.py --force
  ```

---

## Method 3: Manual Deletion via MongoDB Compass

### Step 1: Connect to MongoDB
1. Open MongoDB Compass
2. Connect using: `mongodb+srv://myexcerpt1_db_user:yEXNF7BjVgDRanGI@cluster0.e3s8dbr.mongodb.net/grooretailerp1`

### Step 2: Navigate to Collection
1. Select database: `grooretailerp1`
2. Open collection: `contact`

### Step 3: Create Backup
1. Export all suppliers first:
   - Filter: `{ "contactKind": "Supplier" }`
   - Export to JSON file
   - Save as `supplier_backup_YYYYMMDD.json`

### Step 4: Check Dependencies
Before deleting, check these collections for supplier references:
- `grc` collection - check `supplierId` and `vendorId`
- `purchaseinvoice` - check `vendorId`
- `debitnote` - check `vendorId`
- `barcodeprintbatch` - check `supplierId`

### Step 5: Delete Suppliers
Run this query in the MongoDB Compass shell:
```javascript
db.contact.deleteMany({ "contactKind": "Supplier" })
```

### Step 6: Verify Deletion
```javascript
// Should return 0
db.contact.countDocuments({ "contactKind": "Supplier" })

// Should return existing counts
db.contact.countDocuments({ "contactKind": "Customer" })
db.contact.countDocuments({ "contactKind": "Agent" })
```

---

## Method 4: Manual Deletion via MongoDB Shell

### Step 1: Connect
```bash
mongosh "mongodb+srv://myexcerpt1_db_user:yEXNF7BjVgDRanGI@cluster0.e3s8dbr.mongodb.net/grooretailerp1"
```

### Step 2: Switch to Database
```javascript
use grooretailerp1
```

### Step 3: Count Suppliers
```javascript
db.contact.countDocuments({ "contactKind": "Supplier" })
```

### Step 4: View Sample Suppliers
```javascript
db.contact.find({ "contactKind": "Supplier" }).limit(5).pretty()
```

### Step 5: Create Backup
```javascript
// Save to file
mongoexport --uri="mongodb+srv://myexcerpt1_db_user:yEXNF7BjVgDRanGI@cluster0.e3s8dbr.mongodb.net/grooretailerp1" --collection=contact --query='{"contactKind":"Supplier"}' --out=supplier_backup.json
```

### Step 6: Delete All Suppliers
```javascript
db.contact.deleteMany({ "contactKind": "Supplier" })
```

### Step 7: Verify
```javascript
// Check suppliers deleted
db.contact.countDocuments({ "contactKind": "Supplier" })

// Check other contacts intact
db.contact.countDocuments({ "contactKind": "Customer" })
db.contact.countDocuments({ "contactKind": "Agent" })
```

---

## After Deletion

### What Still Works
1. ✅ You can navigate to `/admin/contact/supplier`
2. ✅ You can click "Add Supplier" button
3. ✅ You can create new suppliers
4. ✅ API endpoints `/api/supplier` still function
5. ✅ Supplier module is fully operational

### What Changes
1. ❌ Supplier list page will be empty
2. ❌ Supplier dropdown in GRC/Purchase will show no suppliers
3. ⚠️ Historical purchases may show "Supplier not found" if you didn't use --force mode

---

## Troubleshooting

### Script Won't Run
**Problem**: `node seeddelete.js` hangs or fails

**Solutions**:
1. Check MongoDB connection string in `.env`
2. Verify network access to MongoDB Atlas
3. Check if MongoDB driver is installed:
   ```cmd
   npm list mongodb
   ```
4. Install if missing:
   ```cmd
   npm install mongodb
   ```

### Permission Denied
**Problem**: Cannot delete records

**Solutions**:
1. Verify MongoDB user has write permissions
2. Check if user is authenticated
3. Try connecting via MongoDB Compass first

### Dependencies Found Warning
**Problem**: Script shows "X dependencies found"

**Explanation**: Suppliers are referenced in purchase/inventory records

**Options**:
1. **Skip deletion** - Keep suppliers with dependencies
2. **Force delete** - Use `--force` flag (⚠️ will orphan references)
3. **Manual review** - Delete only unused suppliers via Compass

---

## Backup Files

### Location
- `supplier_backup_YYYYMMDD-HHMMSS.json`

### Format
```json
{
  "timestamp": "2026-09-03T...",
  "suppliers": [
    {
      "_id": "...",
      "contactKind": "Supplier",
      "businessName": "...",
      ...
    }
  ],
  "dependencies_found": {
    "grc.vendorId": 45,
    "purchaseinvoice.vendorId": 23
  }
}
```

### Restoring from Backup
If you need to restore suppliers:

```javascript
// In MongoDB Compass or mongosh
const backup = // paste JSON content
db.contact.insertMany(backup.suppliers)
```

---

## Safety Checklist

Before running the deletion:

- [ ] I have a backup of my database
- [ ] I understand this deletes supplier RECORDS, not the supplier MODULE
- [ ] I reviewed the dependencies report
- [ ] I confirmed with my team this deletion is needed
- [ ] I saved the backup JSON file to a safe location
- [ ] I understand I can create new suppliers after deletion

---

## Support

If you encounter issues:

1. Check the backup file was created
2. Review dependencies before forcing deletion
3. Test on a development database first
4. Keep the backup file safe
5. Document which suppliers were deleted

---

## Quick Reference

| Action | Command |
|--------|---------|
| Run Node.js script | `node seeddelete.js` |
| Force delete (Node.js) | `node seeddelete.js --force` |
| Run Python script | `python seeddelete.py` |
| Force delete (Python) | `python seeddelete.py --force` |
| Manual count | `db.contact.countDocuments({ "contactKind": "Supplier" })` |
| Manual delete | `db.contact.deleteMany({ "contactKind": "Supplier" })` |

---

**Remember**: This deletion is **irreversible** without a backup. Always confirm you have a backup before proceeding!

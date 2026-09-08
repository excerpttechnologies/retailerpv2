# Supplier Import Excel Template

## Required Columns (Minimum)

These columns are **REQUIRED** for each supplier:

| Column Name | Required | Description | Example |
|-------------|----------|-------------|---------|
| Contact ID | ✓ | Unique supplier code | G001, SUP-001, etc. |
| Business Name | ✓ | Company/Supplier name | ABC Traders |
| Mobile | ✓ | Contact mobile number | 9876543210 |

---

## Basic Information Columns

| Column Name | Required | Description | Example |
|-------------|----------|-------------|---------|
| Contact ID | ✓ | Unique supplier code | G001 |
| Business Name | ✓ | Company name | ABC Traders Pvt Ltd |
| Short Name | | Abbreviated name | ABC |
| Business Type | | Type of business | Manufacturer, Trader |
| GST No | | GST number | 29ABCDE1234F1Z5 |
| Contact Type | | Individual/Business | Business |
| Prefix | | Mr./Mrs./Ms./Dr. | Mr. |
| First Name | | Contact person first name | John |
| Middle Name | | Contact person middle name | Kumar |
| Last Name | | Contact person last name | Sharma |
| DOB | | Date of birth | 1980-01-15 |
| Gender | | Male/Female/Other | Male |

---

## Billing Address Columns

| Column Name | Required | Description | Example |
|-------------|----------|-------------|---------|
| Address Line 1 | | Street address | 123 Main Street |
| Address Line 2 | | Additional address | Near City Mall |
| City | | City name | Mumbai |
| State | | State name | Maharashtra |
| Country | | Country name | India |
| District | | District name | Mumbai Suburban |
| Taluk | | Taluk/Tehsil | Andheri |
| Zip Code | | PIN code | 400001 |
| Mobile | ✓ | Primary mobile | 9876543210 |
| Alternate Contact | | Secondary number | 9876543211 |
| Landline | | Landline number | 022-12345678 |
| Fax | | Fax number | 022-12345679 |
| Email | | Primary email | contact@abc.com |
| Email 2 | | Secondary email | sales@abc.com |
| Website | | Website URL | https://abc.com |

---

## Shipping Address Columns

| Column Name | Required | Description | Example |
|-------------|----------|-------------|---------|
| Same as Billing | | Yes/No | Yes |
| Shipping Address 1 | | Shipping street | 456 Market Road |
| Shipping Address 2 | | Additional | Warehouse 3 |
| Shipping City | | Shipping city | Bangalore |
| Shipping State | | Shipping state | Karnataka |
| Shipping Country | | Shipping country | India |
| Shipping District | | Shipping district | Bangalore Urban |
| Shipping Zip | | Shipping PIN | 560001 |
| Shipping Mobile | | Shipping contact | 9876543212 |
| Shipping Email | | Shipping email | warehouse@abc.com |

---

## Purchase Details Columns

| Column Name | Required | Description | Example |
|-------------|----------|-------------|---------|
| Markup Price Calculation | | Calculation method | Purchase Rate |
| Discount Type | | Amount/Percentage | Percentage |
| Discount | | Discount value | 5 |
| Mark Up on Cost RSP | | RSP markup % | 20 |
| RSP Round Off | | RSP rounding | 5 |
| Mark Up on Cost WSP | | WSP markup % | 15 |
| WSP Round Off | | WSP rounding | 5 |
| Mark Up on Cost DP | | DP markup % | 10 |
| DP Round Off | | DP rounding | 5 |
| Agent Name | | Associated agent | Agent Name |
| Commission % | | Commission percentage | 2.5 |
| Order Delivery Days | | Estimated delivery | 7 |
| Order Delay Days | | Acceptable delay | 2 |
| Order Advance Limit | | Advance amount limit | 50000 |
| Payment Within Days | | Payment terms days | 30 |
| Payment Date Type | | Invoice Date/GRC Date/Month End | Invoice Date |
| Discount Allow % | | Early payment discount | 2 |
| Discount Allow Days | | Discount period | 10 |
| Logistics Terms | | To Pay/Paid/Self Pickup | Paid |

---

## Financial Details Columns

| Column Name | Required | Description | Example |
|-------------|----------|-------------|---------|
| Supplier Type | | Sundry Creditors/Debtors | Sundry Creditors |
| Opening Balance | | Opening balance amount | 0 |
| PAN | | PAN number | ABCDE1234F |
| CIN | | CIN number | U12345MH2020PTC123456 |
| GST Type | | Registered/Unregistered/Composition/SEZ | Registered |
| GST Registration Date | | GST reg date | 2020-01-01 |
| SSI No | | SSI number | SSI123456 |
| SSI Registration Date | | SSI reg date | 2020-01-01 |
| MSME No | | MSME number | MSME123456 |
| MSME Registration Date | | MSME reg date | 2020-01-01 |
| TDS % | | TDS percentage | 2 |
| TDS Name | | TDS name | TDS on Purchases |
| TDS Section | | TDS section | 194Q |

---

## Bank Details Columns

| Column Name | Required | Description | Example |
|-------------|----------|-------------|---------|
| Bank Account Name | | Name as per bank | ABC Traders Pvt Ltd |
| Bank Name | | Bank name | HDFC Bank |
| Account Number | | Bank account number | 12345678901234 |
| IFSC | | IFSC code | HDFC0001234 |
| Swift Code | | SWIFT code (for int'l) | HDFCINBB |

---

## Other Columns

| Column Name | Required | Description | Example |
|-------------|----------|-------------|---------|
| Allow Production | | Yes/No | Yes |
| Allow To Stock Point | | Yes/No | Yes |
| Maximum Overdue Days | | Max overdue allowed | 45 |
| Remarks | | Additional notes | Special supplier notes |

---

## Sample Excel Structure

Your Excel file should have these columns in the first row (header row):

```
Contact ID | Business Name | Mobile | Email | GST No | Address Line 1 | City | State | Zip Code | ...
G001       | ABC Traders   | 987654 | a@b.c | 29ABC... | 123 Main St   | Mum  | MH    | 400001   | ...
G002       | XYZ Corp      | 987654 | x@y.z | 29XYZ... | 456 Park Ave  | Pune | MH    | 411001   | ...
```

---

## Field Validation Rules

### Contact ID
- **Required**: Yes
- **Format**: Alphanumeric, typically 4-10 characters
- **Example**: G001, SUP-001, V123

### Business Name
- **Required**: Yes
- **Format**: Any text
- **Max Length**: 255 characters

### Mobile
- **Required**: Yes
- **Format**: 10 digits starting with 6-9
- **Example**: 9876543210

### GST No
- **Required**: No
- **Format**: 15 characters (2 digits + 10 alphanumeric + 3 characters)
- **Example**: 29ABCDE1234F1Z5
- **Auto**: Converted to uppercase

### PAN
- **Required**: No
- **Format**: 10 characters (5 letters + 4 digits + 1 letter)
- **Example**: ABCDE1234F
- **Auto**: Converted to uppercase

### Email
- **Required**: No
- **Format**: Valid email address
- **Example**: contact@supplier.com

### Dates
- **Format**: YYYY-MM-DD or Excel date format
- **Example**: 2020-01-15

### Numbers
- **Format**: Numeric values
- **Example**: 100, 25.50, 0

### Yes/No Fields
- **Format**: Yes/No, True/False, 1/0
- **Example**: Yes, No

---

## Alternative Column Headers

The import script recognizes these variations:

### Contact ID variations:
- Contact ID, Contact Code, Supplier Code, Supplier ID

### Business Name variations:
- Business Name, Company Name, Supplier Name

### GST variations:
- GST No, GST Number, GSTIN

### Mobile variations:
- Mobile, Mobile Number, Phone

### Address variations:
- Address Line 1, Address 1, Billing Address 1

---

## Import Commands

### 1. Dry Run (Preview Only)
```bash
npm run seed:suppliers
```
This will:
- Read the Excel file
- Validate all data
- Show what would be imported
- **NOT write to database**

### 2. Actual Import
```bash
npm run seed:suppliers:apply
```
This will:
- Read the Excel file
- Validate all data
- Create a backup
- **Import to database**

---

## File Location

Place your Excel file as:
1. **Default**: `suppliers.xlsx` in project root
2. **Custom**: Set environment variable `SUPPLIER_EXCEL_PATH`

Example with custom path:
```bash
SUPPLIER_EXCEL_PATH=/path/to/mysuppliers.xlsx npm run seed:suppliers:apply
```

---

## Tips for Best Results

1. **Use Excel/Google Sheets**: Maintain data in proper spreadsheet software
2. **Save as .xlsx**: Use modern Excel format
3. **First row is header**: Column names in row 1, data from row 2
4. **No merged cells**: Keep each cell independent
5. **Clean data**: Remove extra spaces, special characters
6. **Test first**: Always run dry-run before apply
7. **Check report**: Review `supplier-import-report.json` after import

---

## Troubleshooting

### "Excel file not found"
- Place `suppliers.xlsx` in project root
- Or set `SUPPLIER_EXCEL_PATH` environment variable

### "Business Name is required"
- Ensure Business Name column exists and has values

### "Invalid GST format"
- GST must be 15 characters: 29ABCDE1234F1Z5
- Remove spaces and special characters

### "Invalid mobile format"
- Must be 10 digits starting with 6, 7, 8, or 9
- Remove spaces, dashes, country codes

### "Duplicate Contact ID"
- Each Contact ID must be unique
- Check for duplicate rows

---

## After Import

1. Check the report file: `supplier-import-report.json`
2. Verify supplier count: Check `/admin/contact/supplier`
3. Test with a transaction: Create a GRC or purchase invoice
4. Backup is saved: `backups/suppliers-before-import-*.json`

---

## Need Help?

If you encounter issues:
1. Check validation errors in console output
2. Review `supplier-import-report.json`
3. Run dry-run first to preview
4. Check Excel file format and headers
5. Verify required fields have values

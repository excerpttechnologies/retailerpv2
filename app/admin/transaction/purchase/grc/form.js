/* Card spec for the Add Goods Receipt Challan entry screen.
   Each source card carries the upstream resource's own endpoint. */

export const FORM = {
    "cards": [
      {
        "type": "fields",
        "fields": [
          {
            "k": "supplierId",
            "label": "Vendor Name",
            "type": "ref",
            "ref": "supplier",
            "req": true,
            "placeholder": "Select Supplier"
          },
          {
            "k": "vendorGstNo",
            "label": "Vendor GST No",
            "type": "text",
            "readOnly": true
          },
          {
            "k": "grcDate",
            "label": "Transaction Date",
            "type": "date",
            "req": true,
            "def": "today"
          },
          {
            "k": "vendorDocNo",
            "label": "Invoice Number",
            "type": "text",
            "req": true,
            "placeholder": "Auto fetched from LR"
          },
          {
            "k": "purchaseGroupId",
            "label": "Purchase Group",
            "type": "ref",
            "ref": "purchasegroup"
          },
          {
            "k": "occasion",
            "label": "Occasion",
            "type": "select",
            "placeholder": "--Select--",
            "opts": [
              {
                "v": "Wedding",
                "l": "Wedding"
              },
              {
                "v": "Festival",
                "l": "Festival"
              },
              {
                "v": "Regular",
                "l": "Regular"
              },
              {
                "v": "Clearance",
                "l": "Clearance"
              }
            ]
          },
          {
            "k": "agentId",
            "label": "Agent",
            "type": "ref",
            "ref": "agent"
          },
          {
            "k": "stockPointName",
            "label": "Stock Point",
            "type": "text",
            "def": "Warehouse",
            "readOnly": true,
            "req": true
          },
          {
            "k": "vendorInvoiceCopy",
            "label": "Vendor Invoice Copy",
            "type": "file",
            "info": true
          },
          {
            "k": "vendorWaybill",
            "label": "Vendor Waybill",
            "type": "file",
            "info": true
          },
          {
            "k": "hsnCode",
            "label": "Enter HSN Code",
            "type": "text"
          },
          {
            "k": "invoiceQty",
            "label": "Enter Invoice Qty",
            "type": "number"
          },
          {
            "k": "taxableValue",
            "label": "Enter Taxable",
            "type": "number"
          },
          {
            "k": "taxAmount",
            "label": "Enter Tax Qty (IGST)",
            "type": "number"
          },
          {
            "k": "totalAmount",
            "label": "Enter Total Amount",
            "type": "number"
          },
          {
            "k": "freightMode",
            "label": "Freight",
            "type": "select",
            "req": true,
            "opts": [
              { "v": "Before Tax", "l": "Before Tax" },
              { "v": "After Tax", "l": "After Tax" }
            ]
          },
          {
            "k": "freightAmount",
            "label": "Freight Amount",
            "type": "number",
            "visibleWhen": { "freightMode": "After Tax" }
          },
        ]
      },
      {
        "type": "source",
        "endpoint": "/api/purchase-grc",
        "availableLr": true,
        "inlineAfter": "supplierId",
        "label": "LR / Transaction Number",
        "req": true,
        "sourceKey": "lrTransactionId",
        "sourceLabel": "transactionNo",
        "withSupplier": true,
        "populate": { "vendorDocNo": "invPmNumber", "lrTransactionNo": "transactionNo" }
      }
    ]
  };

export const SUPPLIER_QUICK_FIELDS = [
  { "k": "typeId", "label": "Type", "type": "ref", "ref": "contact-type-supplier", "req": true },
  { "k": "businessName", "label": "Business Name", "type": "text" },
  { "k": "businessType", "label": "Business Type", "type": "select", "req": true, "def": "Individual", "opts": [{ "v": "Individual", "l": "Individual" }, { "v": "Business", "l": "Business" }] },
  { "k": "contactType2", "label": "Contact Type (2)", "type": "select", "req": true, "def": "Individual", "opts": [{ "v": "Individual", "l": "Individual" }, { "v": "Business", "l": "Business" }] },
  { "k": "firstName", "label": "First Name", "type": "text", "req": true },
  { "k": "billingMobile", "label": "Mobile", "type": "text", "req": true },
  { "k": "markupPriceCalculation", "label": "Price Calculation", "type": "select", "req": true, "def": "Purchase Rate", "opts": [{ "v": "Purchase Rate", "l": "Purchase Rate" }, { "v": "MRP", "l": "MRP" }, { "v": "Landing Cost", "l": "Landing Cost" }] },
  { "k": "openingBalance", "label": "Opening Balance", "type": "number", "req": true, "def": 0 },
  { "k": "gstNo", "label": "GST No", "type": "text" },
];

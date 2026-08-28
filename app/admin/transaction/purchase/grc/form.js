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
            "placeholder": "Select Supplier",
            /* picking a vendor fills the read-only Vendor GST No below it */
            "fillFrom": {
              "endpoint": "/api/supplier",
              "map": { "vendorGstNo": "gstNo" }
            }
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
            "k": "freightMode",
            "label": "Freight",
            "type": "select",
            "req": true,
            "opts": [
              { "v": "Before Tax", "l": "Before Tax" },
              { "v": "After Tax", "l": "After Tax" }
            ]
          },
        ]
      },
      {
        "type": "voucher",
        "title": "Voucher Section",
        "fields": [
          { "k": "hsnCode", "label": "Enter HSN Code", "type": "text" },
          { "k": "invoiceQty", "label": "Enter Invoice Qty", "type": "number" },
          { "k": "taxableValue", "label": "Enter Taxable", "type": "number" },
          { "k": "totalAmount", "label": "Enter Total Amount", "type": "number" },
          { "k": "freightAmount", "label": "Freight", "type": "number", "req": true }
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
  { "k": "firstName", "label": "First Name", "type": "text", "req": true },
  { "k": "billingMobile", "label": "Mobile", "type": "text", "req": true },
  { "k": "gstNo", "label": "GST No", "type": "text" },
];

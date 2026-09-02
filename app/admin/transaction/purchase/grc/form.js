/* Card spec for the Add Goods Receipt Challan entry screen.
   Each source card carries the upstream resource's own endpoint. */

export const FORM = {
    "cards": [
      {
        "type": "source",
        "endpoint": "/api/purchase-grc",
        "availableLr": true,
        "label": "LR / Transaction Number",
        "req": true,
        "sourceKey": "lrTransactionId",
        "sourceLabel": "transactionNo",
        "withSupplier": true,
        "width": "full",
        /* "LR/26/011 | G524 | KARNATAKA Saree Centre, MYSORE"

           Transaction number, then the VENDOR NUMBER and VENDOR NAME - joined 
           onto the row from supplierId by the API, never stored on the delivery 
           itself. The vendor is what an operator checks before receiving goods, 
           and the bare transaction number does not tell two consignments apart.

           Any part the record does not carry is skipped rather than printed
           blank - see sourceLabel() in TransactionFormView. */
        "sourceSubLabel": ["supplier.vendorNo", "supplier.vendorName"],
        /* everything the delivery already recorded is copied onto the GRC
           rather than re-typed. freightAmount is the LR's own freight. */
        "populate": {
          "vendorDocNo": "invPmNumber",
          "lrTransactionNo": "transactionNo",
          "freightAmount": "freightAmount",
          "supplierId": "supplierId"
        }
      },
      {
        "type": "fields",
        "fields": [
          {
            "k": "supplierId",
            "label": "Vendor Name",
            "type": "ref",
            "ref": "supplier",
            "req": true,
            "width": "full",
            /* minSearch: 1 used to be here. It meant the dropdown fetched
               NOTHING until a character was typed, so opening it showed
               "No options" - which reads as "this company has no suppliers"
               rather than "type to search". The list now loads on open and
               narrows as you type. Search matches the vendor name and the
               G-code, so "KARNATAKA" and "G524" both find the same record. */
            /* picking a vendor fills the read-only Vendor GST No below it */
            "fillFrom": {
              "endpoint": "/api/supplier",
              "map": { "vendorGstNo": "gstNo" }
            },
            /* changing the vendor invalidates everything that came off the
               previous vendor's LR - see `clears` in TransactionFormView */
            "clears": ["lrTransactionId", "lrTransactionNo", "vendorDocNo"]
          },
          {
            "k": "vendorGstNo",
            "label": "Vendor GST No",
            "type": "text",
            "readOnly": true,
            "width": "full"
          },
          {
            "k": "grcDate",
            "label": "Transaction Date",
            "type": "date",
            "req": true,
            "def": "today",
            "width": "full"
          },
          {
            /* NOT req. The invoice number is copied off the selected LR by
               the server, and marking it required here made validate() reject
               the form BEFORE the LR was ever read - so a GRC could not be
               saved at all unless the operator retyped a number the system
               already had, which is exactly what "Auto fetched from LR"
               promises it will not ask for.

               It is still mandatory, just enforced where the answer is known:
               the POST fills it from the delivery and only complains if the
               LR itself carries no invoice number. */
            "k": "vendorDocNo",
            "label": "Invoice Number",
            "type": "text",
            "width": "full"
          },
          {
            "k": "vendorDocDate",
            "label": "Invoice Date",
            "type": "date",
            "width": "full"
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
          }
        ]
      },
      {
        "type": "voucher",
        "title": "Voucher Section",
        "fields": [
          { "k": "hsnCode", "label": "Enter HSN Code", "type": "text" },
          { "k": "invoiceQty", "label": "Enter Invoice Qty", "type": "number" },
          { "k": "taxableValue", "label": "Enter Taxable", "type": "number" },
          { "k": "taxAmount", "label": "Tax Amount", "type": "number" },
          { "k": "totalAmount", "label": "Enter Total Amount", "type": "number" },
          { "k": "freightAmount", "label": "Freight", "type": "number", "req": true }
        ]
      }
    ]
  };

export const SUPPLIER_QUICK_FIELDS = [
  { "k": "typeId", "label": "Type", "type": "ref", "ref": "contact-type-supplier", "req": true },
  { "k": "businessName", "label": "Business Name", "type": "text" },
  { "k": "firstName", "label": "First Name", "type": "text", "req": true },
  { "k": "billingMobile", "label": "Mobile", "type": "text", "req": true },
  { "k": "gstNo", "label": "GST No", "type": "text" }
];

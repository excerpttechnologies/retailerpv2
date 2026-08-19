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
            "label": "GRC Date",
            "type": "date",
            "req": true,
            "def": "today"
          },
          {
            "k": "vendorDocNo",
            "label": "Vendor Doc No",
            "type": "text",
            "req": true
          },
          {
            "k": "purchaseTermId",
            "label": "Purchase Term",
            "type": "ref",
            "ref": "purchase/master/term",
            "req": true
          },
          {
            "k": "grcNumber",
            "label": "GRC Number",
            "type": "text"
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
            "k": "logisticId",
            "label": "Logistic",
            "type": "ref",
            "ref": "logistic"
          },
          {
            "k": "stockPointId",
            "label": "Stock Point",
            "type": "ref",
            "ref": "stockpoint",
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
          }
        ]
      }
    ]
  };

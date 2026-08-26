/* Card spec for the Add GRT entry screen.
   Each source card carries the upstream resource's own endpoint. */

export const FORM = {
    "title": "Add GRT",
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
            "k": "oldStock",
            "label": "Old Stock",
            "type": "select",
            "req": true,
            "def": "No",
            "opts": [
              {
                "v": "Yes",
                "l": "Yes"
              },
              {
                "v": "No",
                "l": "No"
              }
            ]
          },
          {
            "k": "vendorGstNo",
            "label": "Vendor GST No",
            "type": "text",
            "readOnly": true
          },
          {
            "k": "grcNumber",
            "label": "GRC Number",
            "type": "text",
            "readOnly": true
          },
          {
            "k": "vendorDocNo",
            "label": "Vendor Doc No",
            "type": "text",
            "readOnly": true
          },
          {
            "k": "grcDate",
            "label": "GRC Date",
            "type": "date",
            "readOnly": true
          },
          {
            "k": "vendorDocDate",
            "label": "Vendor Doc Date",
            "type": "date",
            "readOnly": true
          },
          {
            "k": "purchaseGroupId",
            "label": "Purchase Group",
            "type": "ref",
            "ref": "purchasegroup",
            "readOnly": true
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
            "k": "purchaseTermId",
            "label": "Purchase Term",
            "type": "ref",
            "ref": "purchase/master/term",
            "readOnly": true
          },
          {
            "k": "agentId",
            "label": "Agent",
            "type": "ref",
            "ref": "agent",
            "readOnly": true
          },
          {
            "k": "logisticId",
            "label": "Logistic",
            "type": "ref",
            "ref": "logistic",
            "readOnly": true
          }
        ],
        "attachmentButtons": [
          {
            "k": "vendorInvoiceCopy",
            "label": "No Vendor Invoice Copy"
          },
          {
            "k": "vendorWaybill",
            "label": "No Vendor Waybill"
          }
        ]
      },
     
      {
        "type": "scan"
      },
      {
        "type": "grid",
        "empty": "No Items Added",
        "removable": true,
        "cols": [
          "Sl No",
          "Item Code",
          "Item Name",
          "HSN",
          "GST Slab",
          "UOM",
          "Maximum Quantity",
          "Final Rate",
          "Return Quantity",
          "Before GST",
          "IGST Amount",
          "CGST Amount",
          "SGST Amount",
          "Net Amount"
        ]
      }
    ]
  };

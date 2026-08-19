/* Tab + section layout for Customers.

   Matched to the deployed page at erp.orbiteerp.com/admin/contact/customer/add:
     - three tabs, and the second is "Sales Details" (not "Purchase Details",
       which is the Supplier wording)
     - no Contact Type (2), no Allow Login / User Name / Password
     - Prefix and Gender render without a label above them
     - identity row is 4 across; the name row and both address blocks are
       6 across, via each section's `cols`
   Supplier and Agent keep their own wider form - only this file changed.

   OPEN QUESTION - Business Type options. The deployed page shows
   "Un-Registered" pre-selected, but that value is not in this project's option
   list (8 legal-entity types: Proprietorship, Partnership, LLP, ...). It has
   been added at the top and set as the default so the deployed default
   renders. If the deployed dropdown is actually a GST status list
   (Registered / Un-Registered) rather than entity types, replace `opts` below
   with that list - the screenshot only reveals the selected value. */

export const TABS = [
    {
      "key": "basic",
      "label": "Basic Information",
      "sections": [
        {
          "title": "",
          "cols": 4,
          "fields": [
            {
              "k": "typeId",
              "label": "Type",
              "type": "ref",
              "ref": "contact-type",
              "req": true
            },
            {
              "k": "businessType",
              "label": "Business Type",
              "type": "select",
              "req": true,
              "placeholder": "--Select--",
              "opts": [
                {
                  "v": "Un-Registered",
                  "l": "Un-Registered"
                },
                {
                  "v": "Proprietorship",
                  "l": "Proprietorship"
                },
                {
                  "v": "Partnership",
                  "l": "Partnership"
                },
                {
                  "v": "Private Limited",
                  "l": "Private Limited"
                },
                {
                  "v": "Public Limited",
                  "l": "Public Limited"
                },
                {
                  "v": "LLP",
                  "l": "LLP"
                },
                {
                  "v": "HUF",
                  "l": "HUF"
                },
                {
                  "v": "Trust",
                  "l": "Trust"
                },
                {
                  "v": "Individual",
                  "l": "Individual"
                }
              ],
              "def": "Un-Registered"
            },
            {
              "k": "gstNo",
              "label": "GST NO",
              "type": "text",
              "placeholder": "ex: 22AAAAA0000A1Z5"
            },
            {
              "k": "businessName",
              "label": "Business Name",
              "ph": true,
              "type": "text",
              "span": 2
            },
            {
              "k": "shortName",
              "label": "Short Name",
              "ph": true,
              "type": "text",
              "span": 2
            }
          ]
        },
        {
          "title": "",
          "cols": 6,
          "fields": [
            {
              "k": "prefix",
              "label": "Prefix",
              "type": "select",
              "def": "Mr.",
              "opts": [
                {
                  "v": "Mr.",
                  "l": "Mr."
                },
                {
                  "v": "Mrs.",
                  "l": "Mrs."
                },
                {
                  "v": "Ms.",
                  "l": "Ms."
                },
                {
                  "v": "Dr.",
                  "l": "Dr."
                },
                {
                  "v": "M/s.",
                  "l": "M/s."
                }
              ],
              "ph": true
            },
            {
              "k": "firstName",
              "label": "First Name*",
              "ph": true,
              "type": "text",
              "req": true
            },
            {
              "k": "middleName",
              "label": "Middle Name",
              "ph": true,
              "type": "text"
            },
            {
              "k": "lastName",
              "label": "Last Name",
              "ph": true,
              "type": "text"
            },
            {
              "k": "dob",
              "label": "DOB",
              "ph": true,
              "type": "date"
            },
            {
              "k": "gender",
              "label": "Gender",
              "type": "select",
              "placeholder": "--Select Gender--",
              "opts": [
                {
                  "v": "Male",
                  "l": "Male"
                },
                {
                  "v": "Female",
                  "l": "Female"
                },
                {
                  "v": "Other",
                  "l": "Other"
                }
              ],
              "ph": true
            }
          ]
        },
        {
          "title": "Billing Details",
          "fields": [
            {
              "k": "billingAddressLine1",
              "label": "Address line 1",
              "ph": true,
              "type": "text",
              "span": 3
            },
            {
              "k": "billingAddressLine2",
              "label": "Address line 2",
              "ph": true,
              "type": "text",
              "span": 3
            },
            {
              "k": "billingCity",
              "label": "City",
              "ph": true,
              "type": "city"
            },
            {
              "k": "billingState",
              "label": "State",
              "ph": true,
              "type": "text"
            },
            {
              "k": "billingCountry",
              "label": "Country",
              "ph": true,
              "type": "text"
            },
            {
              "k": "billingDistrict",
              "label": "District",
              "ph": true,
              "type": "text"
            },
            {
              "k": "billingZipCode",
              "label": "Zip Code",
              "ph": true,
              "type": "text"
            },
            {
              "k": "billingMobile",
              "label": "Mobile*",
              "ph": true,
              "type": "text",
              "req": true
            },
            {
              "k": "billingAlternateContactNumber",
              "label": "Alternate Contact Number",
              "ph": true,
              "type": "text"
            },
            {
              "k": "billingLandline",
              "label": "Landline",
              "ph": true,
              "type": "text"
            },
            {
              "k": "billingFax",
              "label": "Fax",
              "ph": true,
              "type": "text"
            },
            {
              "k": "billingEmail",
              "label": "Email",
              "ph": true,
              "type": "text"
            },
            {
              "k": "billingEmail2",
              "label": "Email 2",
              "ph": true,
              "type": "text"
            },
            {
              "k": "billingWebsiteUrl",
              "label": "Website URL",
              "ph": true,
              "type": "text"
            }
          ],
          "cols": 6
        },
        {
          "title": "Shipping Details",
          "toggle": {
            "k": "sameAsBilling",
            "label": "Same as Billing Address"
          },
          "fields": [
            {
              "k": "shippingAddressLine1",
              "label": "Address line 1",
              "ph": true,
              "type": "text",
              "span": 3
            },
            {
              "k": "shippingAddressLine2",
              "label": "Address line 2",
              "ph": true,
              "type": "text",
              "span": 3
            },
            {
              "k": "shippingCity",
              "label": "Select City",
              "ph": true,
              "type": "city"
            },
            {
              "k": "shippingState",
              "label": "State",
              "ph": true,
              "type": "text"
            },
            {
              "k": "shippingCountry",
              "label": "Country",
              "ph": true,
              "type": "text"
            },
            {
              "k": "shippingDistrict",
              "label": "District",
              "ph": true,
              "type": "text"
            },
            {
              "k": "shippingZipCode",
              "label": "Zip Code",
              "ph": true,
              "type": "text"
            },
            {
              "k": "shippingMobile",
              "label": "Mobile",
              "ph": true,
              "type": "text",
              "req": false
            },
            {
              "k": "shippingAlternateContactNumber",
              "label": "Alternate Contact Number",
              "ph": true,
              "type": "text"
            },
            {
              "k": "shippingLandline",
              "label": "Landline",
              "ph": true,
              "type": "text"
            },
            {
              "k": "shippingFax",
              "label": "Fax",
              "ph": true,
              "type": "text"
            },
            {
              "k": "shippingEmail",
              "label": "Email",
              "ph": true,
              "type": "text"
            },
            {
              "k": "shippingEmail2",
              "label": "Email 2",
              "ph": true,
              "type": "text"
            },
            {
              "k": "shippingWebsiteUrl",
              "label": "Website URL",
              "ph": true,
              "type": "text"
            }
          ],
          "cols": 6
        }
      ]
    },
    {
      "key": "sales",
      "label": "Sales Details",
      "sections": [
        {
          "title": "Price Calculation Setup",
          "fields": [
            {
              "k": "markupPriceCalculation",
              "label": "Markup Price Calculation",
              "type": "select",
              "req": true,
              "def": "Purchase Rate",
              "opts": [
                {
                  "v": "Purchase Rate",
                  "l": "Purchase Rate"
                },
                {
                  "v": "MRP",
                  "l": "MRP"
                },
                {
                  "v": "Landing Cost",
                  "l": "Landing Cost"
                }
              ]
            },
            {
              "k": "discountType",
              "label": "Discount Type",
              "type": "select",
              "placeholder": "--Select--",
              "opts": [
                {
                  "v": "Amount",
                  "l": "Amount"
                },
                {
                  "v": "Percentage",
                  "l": "Percentage"
                }
              ]
            },
            {
              "k": "discount",
              "label": "Discount",
              "type": "number"
            },
            {
              "k": "markUpOnCostRsp",
              "label": "Mark Up on Cost RSP",
              "type": "number"
            },
            {
              "k": "rspRoundOff",
              "label": "RSP Round Off",
              "type": "number"
            },
            {
              "k": "markUpOnCostWsp",
              "label": "Mark Up on Cost WSP",
              "type": "number"
            },
            {
              "k": "wspRoundOff",
              "label": "WSP Round Off",
              "type": "number"
            },
            {
              "k": "markUpOnCostDp",
              "label": "Mark Up on Cost DP",
              "type": "number"
            },
            {
              "k": "dpRoundOff",
              "label": "Dp Round Off",
              "type": "number"
            }
          ]
        },
        {
          "title": "Agent Setup",
          "fields": [
            {
              "k": "agentId",
              "label": "Agent Name",
              "type": "ref",
              "ref": "supplier",
              "placeholder": "Select Supplier"
            },
            {
              "k": "commissionPercent",
              "label": "Commission %",
              "type": "number"
            },
            {
              "k": "paymentLedgerId",
              "label": "Payment Ledger",
              "type": "ref",
              "ref": "ledger"
            }
          ]
        },
        {
          "title": "Purchase Order Setup",
          "fields": [
            {
              "k": "orderDeliveryEstimatedDays",
              "label": "Order Delivery Estimated(Days)",
              "type": "number"
            },
            {
              "k": "orderAcceptedDelaysDays",
              "label": "Order Accepted Delays(Days)",
              "type": "number"
            },
            {
              "k": "orderAdvanceLimit",
              "label": "Order Advance Limit",
              "type": "number"
            }
          ]
        },
        {
          "title": "Payment Setup",
          "fields": [
            {
              "k": "paymentWithinDays",
              "label": "Payment within (Days)",
              "type": "number"
            },
            {
              "k": "paymentDateType",
              "label": "Payment Date Type",
              "type": "select",
              "placeholder": "--Select--",
              "opts": [
                {
                  "v": "Invoice Date",
                  "l": "Invoice Date"
                },
                {
                  "v": "GRC Date",
                  "l": "GRC Date"
                },
                {
                  "v": "Month End",
                  "l": "Month End"
                }
              ]
            },
            {
              "k": "discountAllowWithinPercent",
              "label": "Discount Allow Within %",
              "type": "number"
            },
            {
              "k": "discountAllowInDays",
              "label": "In Days",
              "type": "number"
            }
          ]
        },
        {
          "title": "Tax Other Setup",
          "fields": [
            {
              "k": "purchaseTermsId",
              "label": "Purchase Terms",
              "type": "ref",
              "ref": "purchase/master/term"
            },
            {
              "k": "logisticsTerms",
              "label": "Logistics Terms",
              "type": "select",
              "placeholder": "--Select--",
              "opts": [
                {
                  "v": "To Pay",
                  "l": "To Pay"
                },
                {
                  "v": "Paid",
                  "l": "Paid"
                },
                {
                  "v": "Self Pickup",
                  "l": "Self Pickup"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "key": "financial",
      "label": "Financial Details",
      "sections": [
        {
          "title": "Supplier Ledger Mapping",
          "fields": [
            {
              "k": "supplierType",
              "label": "Supplier Type",
              "type": "select",
              "placeholder": "--Select--",
              "opts": [
                {
                  "v": "Sundry Creditors",
                  "l": "Sundry Creditors"
                },
                {
                  "v": "Sundry Debtors",
                  "l": "Sundry Debtors"
                }
              ]
            },
            {
              "k": "openingBalance",
              "label": "Opening Balance",
              "type": "number",
              "req": true,
              "def": 0
            }
          ]
        },
        {
          "title": "Puchase Ledger Mapping",
          "fields": [
            {
              "k": "purchasesLedgerId",
              "label": "Purchases",
              "hint": "(Group Mapping: Purchases Accounts)",
              "type": "ref",
              "ref": "ledger"
            },
            {
              "k": "purchasesReturnLedgerId",
              "label": "Purchases Return",
              "hint": "(Group Mapping: Purchases Return)",
              "type": "ref",
              "ref": "ledger"
            },
            {
              "k": "consignmentPurchases",
              "label": "Consignment Purchases",
              "type": "select",
              "placeholder": "--Select--",
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
            }
          ]
        },
        {
          "title": "Company Reg. Details",
          "fields": [
            {
              "k": "pan",
              "label": "PAN (ex: AAAAA1234A)",
              "type": "text"
            },
            {
              "k": "cin",
              "label": "CIN",
              "type": "text"
            },
            {
              "k": "gstType",
              "label": "GST Type",
              "type": "select",
              "placeholder": "--Select--",
              "opts": [
                {
                  "v": "Registered",
                  "l": "Registered"
                },
                {
                  "v": "Unregistered",
                  "l": "Unregistered"
                },
                {
                  "v": "Composition",
                  "l": "Composition"
                },
                {
                  "v": "SEZ",
                  "l": "SEZ"
                }
              ]
            },
            {
              "k": "gstRegDate",
              "label": "Gst Reg. Date",
              "type": "date"
            },
            {
              "k": "ssiNo",
              "label": "SSI No",
              "type": "text"
            },
            {
              "k": "ssiRegDate",
              "label": "SSI Reg. Date",
              "type": "date"
            },
            {
              "k": "msmeNo",
              "label": "MSME No",
              "type": "text"
            },
            {
              "k": "msmeRegDate",
              "label": "MSME Reg. Date",
              "type": "date"
            }
          ]
        },
        {
          "title": "TDS Setup",
          "fields": [
            {
              "k": "tdsLedgerId",
              "label": "TDS Ledger",
              "type": "ref",
              "ref": "ledger"
            },
            {
              "k": "tdsPercent",
              "label": "TDS Percent (%)",
              "type": "number"
            },
            {
              "k": "tdsName",
              "label": "TDS Name",
              "type": "text"
            },
            {
              "k": "tdsSection",
              "label": "TDS Section",
              "type": "text"
            }
          ]
        },
        {
          "title": "Supplier Bank Details",
          "fields": [
            {
              "k": "bankAccountName",
              "label": "Supplier Name as Per Bank",
              "type": "text"
            },
            {
              "k": "bankName",
              "label": "Bank Name",
              "type": "text"
            },
            {
              "k": "accountNo",
              "label": "Account No.",
              "type": "text"
            },
            {
              "k": "ifsc",
              "label": "IFSC",
              "type": "text"
            },
            {
              "k": "swiftCode",
              "label": "Swift Code",
              "type": "text"
            }
          ]
        }
      ]
    }
  ];

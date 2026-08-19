/* Form fields for Doc Setups.
   Lives beside the pages that use it - not in a global registry. */

export const FIELDS = [
    { k: "documentName", label: "Document Name", type: "text", req: true },
    { k: "documentType", label: "Document Type", type: "select", req: true, opts: [{"v":"Goods Receipt Challan","l":"Goods Receipt Challan"},{"v":"Purchase Invoice","l":"Purchase Invoice"},{"v":"Inter Company Sales Invoice","l":"Inter Company Sales Invoice"},{"v":"Inter Company Sales Return","l":"Inter Company Sales Return"},{"v":"Inter Company Delivery Challan","l":"Inter Company Delivery Challan"},{"v":"Stock Transfer Received","l":"Stock Transfer Received"},{"v":"Stock Transfer Location","l":"Stock Transfer Location"},{"v":"Stock Adjustment","l":"Stock Adjustment"},{"v":"Debit Note","l":"Debit Note"},{"v":"GRT","l":"GRT"},{"v":"Item Split","l":"Item Split"},{"v":"Delivery Challan","l":"Delivery Challan"},{"v":"Sales Invoice","l":"Sales Invoice"},{"v":"Sales Return","l":"Sales Return"},{"v":"Credit Note","l":"Credit Note"}] },
    { k: "description", label: "Description", type: "text" },
    { k: "prefix", label: "Prefix", type: "text", req: true },
    { k: "suffix", label: "Suffix", type: "text" },
    { k: "autoNumberLength", label: "Auto Number Length", type: "number", req: true },
    { k: "startFrom", label: "Start From", type: "number", req: true },
    { k: "sample", label: "Sample", type: "text", req: true },
    { k: "validity", label: "Validity", type: "select", req: true, placeholder: "--Select--", opts: [{"v":"Never","l":"Never"},{"v":"Daily","l":"Daily"},{"v":"Monthly","l":"Monthly"},{"v":"Yearly","l":"Yearly"}] },
    { k: "finYear", label: "Financial Year", type: "text" },
  ];

export const NOTE = ["* Prefix Short Code: [MMM]=Short Month, [YY]=Short Year, [YYYY]= Year, [FYY]=Short Year-Year, [FYYYY]=Year-Year","* Ex. [MMM]=Feb, [YY]=21, [YYYY]=2021, [FYY]=21-22, [FYYYY]=2021-2022","* Sample: Maximum 16 characters are allowed"];

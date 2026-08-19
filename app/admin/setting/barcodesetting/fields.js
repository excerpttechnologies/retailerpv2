/* Form fields for Barcode Settings.
   Lives beside the pages that use it - not in a global registry. */

export const FIELDS = [
    { k: "type", label: "Barcode Type", type: "radio", req: true, def: "Periodic", opts: [{"v":"Periodic","l":"Periodic"},{"v":"Item Wise","l":"Item Wise"}] },
    { k: "subType", label: "Barcode Sub Type", type: "radio", req: true, def: "Monthly", opts: [{"v":"Monthly","l":"Monthly"},{"v":"Quarterly","l":"Quarterly"},{"v":"Yearly","l":"Yearly"}] },
  ];

export const PERIOD_FIELDS = [
    { k: "prefix", label: "Prefix", type: "text" },
    { k: "suffix", label: "Suffix", type: "text" },
    { k: "startNumber", label: "Start Number", type: "number", req: true },
    { k: "numberLenght", label: "Number Lenght", type: "number", req: true },
    { k: "sampleBarcode", label: "Sample Barcode", type: "text", req: true },
    { k: "effectiveDate", label: "Effective Date", type: "date", req: true },
    { k: "expiryDate", label: "Expiry Date", type: "date", req: true },
  ];

export const NOTE = ["Copy & Clear buttons helps you avoid repetitive data entry.","* Copy Button to copy barcode settings from the first period to all remaining periods. (Prefix, Suffix, Length, Start Number, Sample Barcode)","* Clear Button to clear these settings for all periods.","* This option is available only for Monthly and Quarterly barcode configurations."];

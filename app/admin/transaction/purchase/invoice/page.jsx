'use client';
import ListView from '@/components/ListView';

/* Purchase Invoices - list. Columns declared here, not fetched from a registry. */

const CONFIG = {
  title: "Purchase Invoices",
  basePath: '/admin/',
  slugPath: "transaction/purchase/invoice",
  endpoint: '/api/purchase-invoice',
  scope: ["business","location","finYear"],
  filters: [
    { k: "startDate", label: "Start Date", type: "date" },
    { k: "endDate", label: "End Date", type: "date" },
  ],
  columns: [
    { k: "purchaseInvoiceNo", t: "Purchase Invoice" },
    { k: "purchaseDate", t: "Purchase Date", f: "date" },
    { k: "supplierId", t: "Supplier Name", f: "ref" },
    { k: "grcNumber", t: "GRC NO" },
    { k: "netPurchaseAmt", t: "Net Purchase Amt", f: "amount" },
    { k: "totalPayable", t: "Total Payable", f: "amount" },
  ],
};

export default function TransactionPurchaseInvoiceListPage() {
  return <ListView cfg={CONFIG} />;
}

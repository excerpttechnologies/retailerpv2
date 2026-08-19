'use client';
import ListView from '@/components/ListView';

/* POS Returns - list. Columns declared here, not fetched from a registry. */

const CONFIG = {
  title: "POS Returns",
  basePath: '/admin/',
  slugPath: "transaction/sell/pos-return",
  endpoint: '/api/sell-pos-return',
  scope: ["business","location","finYear"],
  showAdd: false,
  actionPosition: "left",
  actionVariant: "dropdown",
  columns: [
    { k: "date", t: "Date", f: "date" },
    { k: "invoiceNo", t: "Invoice No" },
    { k: "parentInvoice", t: "Parent Invoice" },
    { k: "customerId", t: "Customer Name", f: "ref" },
    { k: "paymentStatus", t: "Payment Status" },
    { k: "totalAmount", t: "Total Amount", f: "amount" },
    { k: "locationId", t: "Location", f: "ref" },
  ],
};

export default function TransactionSellPosreturnListPage() {
  return <ListView cfg={CONFIG} />;
}

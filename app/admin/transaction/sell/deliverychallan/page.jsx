'use client';
import ListView from '@/components/ListView';

/* Delivery Challans - list. Columns declared here, not fetched from a registry. */

const CONFIG = {
  title: "Delivery Challans",
  basePath: '/admin/',
  slugPath: "transaction/sell/deliverychallan",
  endpoint: '/api/sell-deliverychallan',
  scope: ["business","location","finYear"],
  filters: [
    { k: "startDate", label: "Start Date", type: "date" },
    { k: "endDate", label: "End Date", type: "date" },
  ],
  columns: [
    { k: "deliveryChallanNo", t: "Delivery Challan No" },
    { k: "customerId", t: "Customer Name", f: "ref" },
    { k: "customerMobile", t: "Customer Mobile" },
    { k: "customerGstn", t: "Customer GST No" },
    { k: "createdAt", t: "Creadted On", f: "date" },
    { k: "logisticId", t: "Logistic No", f: "ref" },
  ],
};

export default function TransactionSellDeliverychallanListPage() {
  return <ListView cfg={CONFIG} />;
}

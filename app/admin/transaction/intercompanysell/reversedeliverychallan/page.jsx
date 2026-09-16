'use client';
import ListView from '@/components/ListView';

/* Inter Company Reverse Delivery Challans - list.
   Same columns as the Delivery Challan list; the number column is RDC No. */

const CONFIG = {
  title: 'Inter Company Reverse Delivery Challans',
  basePath: '/admin/transaction/intercompanysell/',
  slugPath: 'reversedeliverychallan',
  endpoint: '/api/ic-reverse-delivery-challan',
  scope: ['business', 'location', 'finYear'],
  addTitle: 'Inter Company Reverse Delivery Challan',
  actionIcons: ['view', 'edit', 'print'],
  filters: [
    { k: 'toBusinessId', label: 'To Business', type: 'ref', ref: 'business', placeholder: 'Select Business' },
    { k: 'startDate', label: 'Start Date', type: 'date' },
    { k: 'endDate', label: 'End Date', type: 'date' },
  ],
  columns: [
    { k: 'toBusinessId', t: 'Customer Name', f: 'ref' },
    { k: 'rdcNo', t: 'RDC No' },
    { k: 'dcDate', t: 'RDC Date', f: 'date' },
    { k: 'toLocationId', t: 'To Location', f: 'ref' },
    { k: 'stockPointId', t: 'Stock Point', f: 'ref' },
    { k: 'totalQty', t: 'Total Qty', f: 'amount' },
    { k: 'createdAt', t: 'Creadted On', f: 'date' },
    { k: 'netValue', t: 'Total Value', f: 'amount' },
  ],
};

export default function IcReverseDeliveryChallanListPage() {
  return <ListView cfg={CONFIG} />;
}

 'use client';

import ListView from '@/components/ListView';

const CONFIG = {
  title: 'Transfer Stock Locations',
  basePath: '/admin/transaction/stocktransfers/',
  slugPath: 'transferstocklocation',
  endpoint: '/api/stock-transfer-location',
  scope: ['business', 'location', 'finYear'],
  addTitle: 'Transfer Stock Location',
  columns: [
    { k: 'locationNo', t: 'Location No' },
    { k: 'transferFromLocationId', t: 'Transfer From', f: 'ref' },
    { k: 'transferToLocationId', t: 'Transfer To', f: 'ref' },
    { k: 'transferDate', t: 'Transfer Date', f: 'date' },
  ],
};

export default function TransferStockLocationPage() {
  return <ListView cfg={CONFIG} />;
}

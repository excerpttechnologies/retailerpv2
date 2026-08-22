 'use client';

import ListView from '@/components/ListView';

const CONFIG = {
  title: 'Transfer Stock Packet',
  basePath: '/admin/transaction/stocktransfers/',
  slugPath: 'transferstockpacket',
  endpoint: '/api/stock-transfer-packet',
  scope: ['business', 'location', 'finYear'],
  addTitle: 'Transfer Stock Packet',
  columns: [
    { k: 'transferDate', t: 'Transfer Date', f: 'date' },
    { k: 'transferFromLocationId', t: 'Transfer From', f: 'ref' },
    { k: 'transferToLocationId', t: 'Transfer To', f: 'ref' },
    { k: 'packetNo', t: 'Packet No' },
    { k: 'createdAt', t: 'Created On', f: 'date' },
  ],
};

export default function TransferStockPacketPage() {
  return <ListView cfg={CONFIG} />;
}

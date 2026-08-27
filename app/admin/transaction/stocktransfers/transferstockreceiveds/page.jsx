'use client';
import IcInboxView from '@/components/IcInboxView';

/* Transfer Stock Received - /admin/transaction/stocktransfers/transferstockreceiveds

   Two lists on one screen. The top one holds Stock Transfer Locations raised
   BY ANOTHER LOCATION and addressed to this one that have not been received
   yet; receiving one writes a Stock Transfer Received record and moves the
   row to the list below.

   Receiving is all-or-nothing today, so Received Qty always equals Sent Qty
   and Pending Qty is zero. The three columns are shown because the deployed
   screen shows them, and because the fields are already stored - switching to
   partial receipt later is a change to the accept action, not to the data.

   ("Recieved Transfers" is the deployed screen's spelling of Received. Kept
   as-is so the two apps read the same.) */

const PENDING = {
  title: 'Pending Transfer Stock',
  endpoint: '/api/stock-transfer-location',
  file: 'pending-transfer-stock',
  /* transfers addressed to MY LOCATION, not yet received */
  inboxParam: 'inbox',
  inboxScope: 'location',
  inboxKeepScope: true,
  unconvertedParam: 'receivedId',
  actionEndpoint: '/api/stock-transfer-received',
  actionKey: 'stockTransferLocationId',
  actionLabel: 'Receive',
  confirm: 'Receive this stock transfer into this location?',
  columns: [
    { k: 'packetNo', t: 'Packet No' },
    { k: 'fromLocationId', t: 'Transfer From', f: 'ref' },
    { k: 'toLocationId', t: 'Transfer To', f: 'ref' },
    { k: 'stlDate', t: 'Date', f: 'date' },
    { k: 'totalQty', t: 'Sent Qty', f: 'amount' },
    /* nothing is received until the action is taken, so these two are
       derived rather than stored on the pending document */
    { k: 'receivedQty', t: 'Received Qty', f: 'amount', value: () => 0 },
    { k: 'pendingQty', t: 'Pending Qty', f: 'amount', value: (r) => r.totalQty },
  ],
};

const RECEIVED = {
  title: 'Recieved Transfers',
  endpoint: '/api/stock-transfer-received',
  file: 'stock-transfer-received',
  columns: [
    { k: 'strCode', t: 'STR Code' },
    { k: 'strDate', t: 'STR Date', f: 'date' },
    { k: 'fromLocationId', t: 'Transfer From', f: 'ref' },
    { k: 'toLocationId', t: 'Transfer To', f: 'ref' },
    { k: 'createdAt', t: 'Created On', f: 'date' },
  ],
};

export default function StockTransferReceivedPage() {
  return <IcInboxView pending={PENDING} actioned={RECEIVED} />;
}

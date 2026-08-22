export const FORM = {
  title: 'Transfer Stock Packet',
  cards: [
    {
      type: 'transferHeader',
      groups: [
        {
          title: 'Transfer From',
          fields: [
            { k: 'transferFromLocationId', label: 'Location Name', type: 'ref', ref: 'companylocations', req: true },
            { k: 'transferFromLocationGstn', label: 'Location GSTN', type: 'text', readOnly: true },
            { k: 'transferFromLocationAddress', label: 'Location Address', type: 'textarea', readOnly: true },
          ],
        },
        {
          title: 'Transfer To',
          fields: [
            { k: 'transferToLocationId', label: 'Location Name', type: 'ref', ref: 'companylocations', req: true },
            { k: 'transferToLocationGstn', label: 'Location GSTN', type: 'text' },
            { k: 'transferToLocationAddress', label: 'Location Address', type: 'textarea' },
            { k: 'stockPointId', label: 'Stock Point', type: 'ref', ref: 'stockpoint' },
          ],
        },
        {
          title: 'Packet No',
          fields: [
            { k: 'packetNo', label: 'Packet No', type: 'text', readOnly: true },
            { k: 'transferDate', label: 'STP Date', type: 'date', req: true, def: 'today' },
            { k: 'waybill', label: 'Stock Transfer Waybill', type: 'text' },
          ],
        },
      ],
    },
    {
      type: 'scanTabs',
      title: 'Items',
      tabs: [{ k: 'Transfer', label: 'Transfer Items' }],
      empty: 'No items added',
      cols: ['Item Code', 'Item Name', 'HSN', 'GST', 'QTY', 'Net Rate', 'Net Amount'],
    },
  ],
};

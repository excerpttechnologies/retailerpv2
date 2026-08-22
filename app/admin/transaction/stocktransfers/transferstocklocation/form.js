export const FORM = {
  title: 'Transfer Stock Location',
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
            { k: 'locationNo', label: 'Packet No', type: 'text', readOnly: true },
            { k: 'transferDate', label: 'STL Date', type: 'date', req: true, def: 'today' },
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
      cols: ['Item Code', 'Item Name', 'QTY', 'Net Rate', 'Net Amount'],
    },
  ],
};

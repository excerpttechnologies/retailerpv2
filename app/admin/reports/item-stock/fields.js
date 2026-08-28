/* Item Stock Report - spec.

   Opening, inward, outward and closing stock, three ways. All three tabs
   share one set of filters.

   HOW THE NUMBERS ARE DERIVED (there is no stock ledger in this project):
     inward   barcode rows created inside the window
     opening  barcode rows created before it
     outward  quantity sold in the window - reads 0.00 until the Sell screens
              capture line quantities
     close    opening + inward - outward

   So Close Qty currently equals everything ever received. It reads high for
   anything that has moved through the sell side. Same compromise the scan
   boxes' "(Max: n)" hint makes. */

/* the five movement columns every tab shows */
const MOVEMENT = [
  { k: 'open', t: 'Open Qty', f: 'amount', total: true },
  { k: 'inward', t: 'Inward Qty', f: 'amount', total: true },
  { k: 'outward', t: 'Outward Qty', f: 'amount', total: true },
  { k: 'closeQty', t: 'Close Qty', f: 'amount', total: true },
  { k: 'closeValue', t: 'Close Value', f: 'amount', total: true },
];

export const REPORT = {
  slug: 'item-stock',
  title: 'Item Stock Report',
  subtitle: 'Opening, inward, outward and closing stock, by group or by item code.',
  filterTitle: 'Item Stock Report Filters',
  hint: 'Opening, inward, outward and closing stock for the selected window. The tabs share these filters.',
  perPage: 15,

  filters: [
    { k: 'location', label: 'Business Location', type: 'ref', ref: 'companylocations', all: 'All Locations' },
    { k: 'fromDate', label: 'Date From', type: 'date', req: true, def: '-1month' },
    { k: 'toDate', label: 'Date To', type: 'date', req: true, def: 'today' },
  ],

  tiles: [
    { k: 'totalGroups', label: 'Total Groups', icon: 'grid', cls: 'bg-[#a9dfe8]', f: 'count' },
    { k: 'openQty', label: 'Total Open Qty', icon: 'box', cls: 'bg-[#f4a7bb]' },
    { k: 'inwardQty', label: 'Total Inward Qty', icon: 'plus', cls: 'bg-[#90ddc4]' },
    { k: 'outwardQty', label: 'Total Outward Qty', icon: 'shuffle', cls: 'bg-[#f3a898]' },
    { k: 'closeQty', label: 'Total Close Qty', icon: 'bag', cls: 'bg-[#e3c765]' },
    { k: 'closeValue', label: 'Total Close Value', icon: 'register', cls: 'bg-[#c9b6e4]' },
  ],

  tabs: [
    {
      k: 'groupwise',
      label: 'Group Wise Summary',
      sections: [{
        key: 'groupwise',
        title: 'Group Wise Summary',
        totalsRow: true,
        columns: [
          { k: 'location', t: 'Location Name' },
          { k: 'group', t: 'Group Name' },
          ...MOVEMENT,
        ],
      }],
    },
    {
      k: 'detailed',
      label: 'Group Wise Detailed',
      sections: [{
        key: 'detailed',
        title: 'Group Wise Detailed',
        totalsRow: true,
        columns: [
          { k: 'location', t: 'Location Name' },
          { k: 'group', t: 'Group Name' },
          { k: 'code', t: 'Item Code' },
          { k: 'itemName', t: 'Item Name' },
          ...MOVEMENT,
        ],
      }],
    },
    {
      k: 'itemwise',
      label: 'Item Wise Summary',
      sections: [{
        key: 'itemwise',
        title: 'Item Wise Summary',
        totalsRow: true,
        columns: [
          { k: 'code', t: 'Item Code' },
          { k: 'itemName', t: 'Item Name' },
          { k: 'group', t: 'Group Name' },
          ...MOVEMENT,
        ],
      }],
    },
  ],
};

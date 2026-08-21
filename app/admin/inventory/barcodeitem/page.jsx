// 'use client';
// import ListView from '@/components/ListView';

// /* Barcode Items - list. Columns declared here, not fetched from a registry. */

// const CONFIG = {
//   title: "Barcode Items",
//   basePath: '/admin/inventory/',
//   slugPath: "barcodeitem",
//   endpoint: '/api/barcodeitem',
//   scope: ["business","location"],
//   showAdd: false,
//   searchOnly: true,
//   filters: [
//     { k: "groupId", label: "Group Name", type: "ref", ref: "product/group", placeholder: "Select Group" },
//     { k: "subGroupId", label: "Subgroup Name", type: "ref", ref: "product/group", placeholder: "Select Subgroup" },
//     { k: "itemId", label: "Items", type: "ref", ref: "item", placeholder: "Select Items" },
//     { k: "supplierId", label: "Supplier", type: "ref", ref: "supplier", placeholder: "Select Supplier" },
//     { k: "rspStart", label: "RSP Filter", type: "text", placeholder: "Start" },
//     { k: "rspEnd", label: " ", type: "text", placeholder: "End" },
//     { k: "cpStart", label: "CP Filter", type: "text", placeholder: "Start" },
//     { k: "cpEnd", label: " ", type: "text", placeholder: "End" },
//     { k: "barcodeStart", label: "Barcode No", type: "text", placeholder: "Start" },
//     { k: "barcodeEnd", label: " ", type: "text", placeholder: "End" },
//     { k: "grcNo", label: "GRC No", type: "text", placeholder: "GRC No" },
//   ],
//   columns: [
//     { k: "barcodeNo", t: "Barcode No" },
//     { k: "itemId", t: "Item", f: "ref" },
//     { k: "rsp", t: "RSP", f: "amount" },
//     { k: "cp", t: "CP", f: "amount" },
//     { k: "grcNo", t: "GRC No" },
//   ],
// };

// export default function BarcodeitemListPage() {
//   return <ListView cfg={CONFIG} />;
// }



















///////////////////






'use client';
import ListView from '@/components/ListView';

/* Barcode Items - list. Columns declared here, not fetched from a registry. */

const CONFIG = {
  title: "Barcode Items",
  basePath: '/admin/inventory/',
  slugPath: "barcodeitem",
  endpoint: '/api/inventory-barcode-list',
  scope: ["business","location"],
  showAdd: false,
  /* false = load immediately on scope change, like every other list.
     Set back to true if you want the table to stay empty until the
     person applies at least one filter. */
  searchOnly: false,
 // filters: [
    // { k: "groupId", label: "Group Name", type: "ref", ref: "product/group", placeholder: "Select Group" },
    // { k: "subGroupId", label: "Subgroup Name", type: "ref", ref: "product/group", placeholder: "Select Subgroup" },
    // { k: "itemId", label: "Items", type: "ref", ref: "item", placeholder: "Select Items" },
    // { k: "supplierId", label: "Supplier", type: "ref", ref: "supplier", placeholder: "Select Supplier" },
    // { k: "rspStart", label: "RSP Filter", type: "text", placeholder: "Start" },
    // { k: "rspEnd", label: " ", type: "text", placeholder: "End" },
    // { k: "cpStart", label: "CP Filter", type: "text", placeholder: "Start" },
    // { k: "cpEnd", label: " ", type: "text", placeholder: "End" },
   // { k: "barcodeStart", label: "Barcode No", type: "text", placeholder: "Start" },
    // { k: "barcodeEnd", label: " ", type: "text", placeholder: "End" },
    // { k: "grcNo", label: "GRC No", type: "text", placeholder: "GRC No" },
  //],
  columns: [
    { k: "barcodeNo", t: "Barcode No" },
    { k: "itemId", t: "Item" },
    { k: "rsp", t: "RSP", f: "amount" },
    { k: "cp", t: "CP", f: "amount" },
    { k: "grcNo", t: "GRC No" },
  ],
};

export default function BarcodeitemListPage() {
  return <ListView cfg={CONFIG} />;
}
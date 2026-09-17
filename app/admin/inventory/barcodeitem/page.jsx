
'use client';

import ListView from '@/components/ListView';
import { canonicalBarcodeValue } from '@/lib/barcodeValue';

/* Barcode Items - list.
   Data should NOT load until the user applies a filter/search.
*/
const CONFIG = {
  title: "Barcode Items",

  basePath: '/admin/inventory/',
  slugPath: "barcodeitem",

  endpoint: '/api/inventory-barcode-list',

  scope: ["business", "location"],

  showAdd: false,

  // IMPORTANT:
  // Do not load any data when the page opens.
  // API should be called only after the user applies a filter/search.
  searchOnly: true,

  filters: [
    {
      k: "groupId",
      label: "Group Name",
      type: "ref",
      ref: "product/group",
      placeholder: "Select Group"
    },

    {
      k: "subGroupId",
      label: "Subgroup Name",
      type: "ref",
      ref: "product/group",
      placeholder: "Select Subgroup"
    },

    {
      k: "itemId",
      label: "Items",
      type: "ref",
      ref: "item",
      placeholder: "Select Items"
    },

    {
      k: "supplierId",
      label: "Supplier",
      type: "ref",
      ref: "supplier",
      placeholder: "Select Supplier"
    },

    {
      k: "rspStart",
      label: "RSP Filter",
      type: "text",
      placeholder: "Start"
    },

    {
      k: "rspEnd",
      label: " ",
      type: "text",
      placeholder: "End"
    },

    {
      k: "cpStart",
      label: "CP Filter",
      type: "text",
      placeholder: "Start"
    },

    {
      k: "cpEnd",
      label: " ",
      type: "text",
      placeholder: "End"
    },

    {
      k: "barcodeStart",
      label: "Barcode No",
      type: "text",
      placeholder: "Start"
    },

    {
      k: "barcodeEnd",
      label: " ",
      type: "text",
      placeholder: "End"
    },

    {
      k: "grcNo",
      label: "GRC No",
      type: "text",
      placeholder: "GRC No"
    }
  ],

  columns: [
    {
      k: "productImageUrl",
      t: "Image",
      f: "image"
    },
    {
      k: "barcodeNo",
      t: "Barcode No",
      // The API fills this from the stored barcodeGenerated
      // ("G1318 * 05178 * 1 * 1"); shown in the spelling the label prints
      // ("G1318*05178*1*1"). A counter number comes back unchanged.
      value: (row) => canonicalBarcodeValue(row.barcodeNo)
    },

    {
      k: "itemId",
      t: "Item"
    },

    {
      k: "rsp",
      t: "RSP",
      f: "amount"
    },

    {
      k: "cp",
      t: "CP",
      f: "amount"
    },

    {
      k: "grcNo",
      t: "GRC No"
    }
  ],
};

export default function BarcodeitemListPage() {
  return <ListView cfg={CONFIG} />;
}
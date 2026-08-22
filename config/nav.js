// // // /* The only file left in config/.
// // //    Sidebar labels and hrefs, nothing else - the same role Kisan Partner's
// // //    config/menu.config.ts plays. Pages are no longer generated from here;
// // //    every entry points at a real folder with its own page.jsx. */

// // // export const NAV = [
// // //   { label: 'Dashboard', icon: 'gauge', href: '/admin' },

// // //   {
// // //     label: 'Masters', icon: 'gear', children: [
// // //       { label: 'Business Masters', href: '/admin/setting/business' },
// // //       { label: 'Company Locations', href: '/admin/setting/companylocations' },
// // //       { label: 'Ledger Group', href: '/admin/setting/ledgergroups' },
// // //       { label: 'Ledger', href: '/admin/setting/ledger' },
// // //       { label: 'Ledger Mapping', href: '/admin/setting/ledgergroupmapping' },
// // //       { label: 'Voucher Settings', href: '/admin/setting/voucher-setting' },
// // //       { label: 'Doc Setup', href: '/admin/setting/docsetup' },
// // //       { label: 'Purchase Group Master', href: '/admin/setting/purchasegroup' },
// // //       { label: 'Stock Point Master', href: '/admin/setting/stockpoint' },
// // //       { label: 'Pos Counter Master', href: '/admin/setting/poscounter' },
// // //       { label: 'Barcode Settings', href: '/admin/setting/barcodesetting' },
// // //       { label: 'Split Barcode Settings', href: '/admin/setting/split-barcode-setting' },
// // //       { label: 'Barcode Label Settings', href: '/admin/setting/barcode-label-setting' },
// // //       { label: 'Payment Method Master', href: '/admin/setting/paymentmethod' },
// // //       { label: 'Tax Master', href: '/admin/setting/tax' },
// // //       { label: 'HSN Master', href: '/admin/setting/hsn' },
// // //       { label: 'City Group Master', href: '/admin/setting/citygroup' },
// // //       { label: 'Purchase Charge Master', href: '/admin/setting/purchase/master/charge' },
// // //       { label: 'Purchase Term Master', href: '/admin/setting/purchase/master/term' },
// // //       { label: 'Sales Term Master', href: '/admin/setting/sales/master/term' },
// // //       { label: 'Loyalty Point', href: '/admin/setting/loyaltypoint' },
// // //       { label: 'Login Security', href: '/admin/setting/login-security' },
// // //       { label: 'Pos Settings', href: '/admin/setting/pos_setting' },
// // //       { label: 'Ecom Settings', href: '/admin/setting/ecom_setting' },
// // //       { label: 'Invoice Layout Setting', href: '/admin/setting/invoice-layout-setting' },
// // //       { label: 'General Setting (Location)', href: '/admin/setting/location-setting' },
// // //       { label: 'Business Contact', href: '/admin/setting/business-contact' },
// // //     ],
// // //   },

// // //   {
// // //     label: 'Inventory', icon: 'grid', children: [
// // //       { label: 'Filter', href: '/admin/inventory/product/filter' },
// // //       { label: 'Group', href: '/admin/inventory/product/group' },
// // //       { label: 'Unit of Measurement', href: '/admin/inventory/uom' },
// // //       { label: 'Attribute Addons', href: '/admin/inventory/attribute-addon' },
// // //       { label: 'Item', href: '/admin/inventory/item' },
// // //       { label: 'Print Label', href: '/admin/inventory/barcode-print' },
// // //       { label: 'Barcode Item', href: '/admin/inventory/barcodeitem' },
// // //       { label: 'Stock Adjustment', href: '/admin/inventory/stock-adjustment' },
// // //     ],
// // //   },

// // //   {
// // //     label: 'Contacts', icon: 'users', children: [
// // //       { label: 'Contact Types', href: '/admin/contact/contact-type' },
// // //       { label: 'Suppliers', href: '/admin/contact/supplier' },
// // //       { label: 'Agents', href: '/admin/contact/agent' },
// // //       { label: 'Customers', href: '/admin/contact/customer' },
// // //     ],
// // //   },

// // //   // { label: 'Logistic', icon: 'truck', href: '/admin/logistic' },

// // //   {
// // //     label: 'Purchase', icon: 'bag', children: [
// // //       { label: 'Goods Receipt Challan', href: '/admin/transaction/purchase/grc' },
// // //       { label: 'Purchase Invoice', href: '/admin/transaction/purchase/invoice' },
// // //       { label: 'Goods Return Note', href: '/admin/transaction/purchase/grt' },
// // //       { label: 'Debit Note', href: '/admin/transaction/purchase/debitnote' },
// // //     ],
// // //   },

// // //   // {
// // //   //   label: 'Sell', icon: 'box', children: [
// // //   //     { label: 'Delivery Challan', href: '/admin/transaction/sell/deliverychallan' },
// // //   //     { label: 'Sales Invoice', href: '/admin/transaction/sell/salesinvoice' },
// // //   //     { label: 'Sales Return', href: '/admin/transaction/sell/salereturn' },
// // //   //     { label: 'Credit Note', href: '/admin/transaction/sell/creditnote' },
// // //   //     { label: 'POS', href: '/admin/transaction/sell/pos' },
// // //   //     { label: 'POS Return', href: '/admin/transaction/sell/pos-return' },
// // //   //     { label: 'B2B Invoice', href: '/admin/transaction/sell/b2binvoice' },
// // //   //   ],
// // //   // },

// // //   /* Staff Management pages are NOT built - these three links 404 today.
// // //      Kept commented rather than shipping dead links in the sidebar. */
// // //   // {
// // //   //   label: 'Staff Management', icon: 'staff', children: [
// // //   //     { label: 'Roles & Permissions', href: '/admin/staff-management/roles-permissions' },
// // //   //     { label: 'Staffs', href: '/admin/staff-management/staff' },
// // //   //     { label: 'Sales Persons', href: '/admin/staff-management/staff/salesperson' },
// // //   //   ],
// // //   // },

// // //   // { label: 'Stock Transfers', icon: 'shuffle', children: [] },
// // //   // { label: 'Inter Company Sell', icon: 'home', children: [] },
// // //   // { label: 'Reports', icon: 'chart', children: [] },
// // //   // { label: 'Communication', icon: 'mail', children: [] },
// // //   // { label: 'Tools', icon: 'tools', children: [] },
// // //   // { label: 'Cash Register', icon: 'register', children: [] },
// // //   // { label: 'Voucher', icon: 'voucher', children: [] },
// // //   // { label: 'Ledger Transaction', icon: 'ledger', children: [] },
// // //   // { label: 'E-commerce', icon: 'cart', children: [] },
// // //   // { label: 'Accounts', icon: 'accounts', children: [] },
// // //    { label: 'Logout', icon: 'logout', href: '/logout' },
// // // ];














// // import {
// //   LuGauge,
// //   LuSettings,
// //   LuBuilding2,
// //   LuMapPin,
// //   LuLayers3,
// //   LuBookOpen,
// //   LuGitBranch,
// //   LuSlidersHorizontal,
// //   LuFileCog,
// //   LuShoppingBag,
// //   LuWarehouse,
// //   LuMonitor,
// //   LuBarcode,
// //   LuSplit,
// //   LuTag,
// //   LuCreditCard,
// //   LuPercent,
// //   LuReceipt,
// //   LuMap,
// //   LuBadgeIndianRupee,
// //   LuFileText,
// //   LuHeart,
// //   LuShieldCheck,
// //   LuMonitorCog,
// //   LuShoppingCart,
// //   LuPanelTop,
// //   LuMapPinned,
// //   LuContact,
// //   LuGrid3X3,
// //   LuFilter,
// //   LuPackage,
// //   LuRuler,
// //   LuPuzzle,
// //   LuBox,
// //   LuPrinter,
// //   LuScanBarcode,
// //   LuClipboardList,
// //   LuUsers,
// //   LuUserCog,
// //   LuTruck,
// //   LuUserRound,
// //   LuContactRound,
// //   LuShoppingBasket,
// //   LuUndo2,
// //   LuFileMinus,
// //   LuFilePlus,
// //   LuShuffle,
// //   LuHouse,
// //   LuChartNoAxesColumn,
// //   LuMail,
// //   LuWrench,
// //   LuCircleDollarSign,
// //   LuFileCheck,
// //   LuBookMarked,
// //   LuStore,
// //   LuShoppingBag as LuEcommerce,
// //   LuWalletCards,
// //   LuLogOut,
// // } from 'react-icons/lu';

// // export const NAV = [

// //   {
// //     label: 'Dashboard',
// //     icon: LuGauge,
// //     href: '/admin',
// //   },

// //   {
// //     label: 'Masters',
// //     icon: LuSettings,
// //     children: [
// //       {
// //         label: 'Business Masters',
// //         icon: LuBuilding2,
// //         href: '/admin/setting/business',
// //       },
// //       {
// //         label: 'Company Locations',
// //         icon: LuMapPin,
// //         href: '/admin/setting/companylocations',
// //       },
// //       {
// //         label: 'Ledger Group',
// //         icon: LuLayers3,
// //         href: '/admin/setting/ledgergroups',
// //       },
// //       {
// //         label: 'Ledger',
// //         icon: LuBookOpen,
// //         href: '/admin/setting/ledger',
// //       },
// //       {
// //         label: 'Ledger Mapping',
// //         icon: LuGitBranch,
// //         href: '/admin/setting/ledgergroupmapping',
// //       },
// //       {
// //         label: 'Voucher Settings',
// //         icon: LuSlidersHorizontal,
// //         href: '/admin/setting/voucher-setting',
// //       },
// //       {
// //         label: 'Doc Setup',
// //         icon: LuFileCog,
// //         href: '/admin/setting/docsetup',
// //       },
// //       {
// //         label: 'Purchase Group Master',
// //         icon: LuShoppingBag,
// //         href: '/admin/setting/purchasegroup',
// //       },
// //       {
// //         label: 'Stock Point Master',
// //         icon: LuWarehouse,
// //         href: '/admin/setting/stockpoint',
// //       },
// //       {
// //         label: 'Pos Counter Master',
// //         icon: LuMonitor,
// //         href: '/admin/setting/poscounter',
// //       },
// //       {
// //         label: 'Barcode Settings',
// //         icon: LuBarcode,
// //         href: '/admin/setting/barcodesetting',
// //       },
// //       {
// //         label: 'Split Barcode Settings',
// //         icon: LuSplit,
// //         href: '/admin/setting/split-barcode-setting',
// //       },
// //       {
// //         label: 'Barcode Label Settings',
// //         icon: LuTag,
// //         href: '/admin/setting/barcode-label-setting',
// //       },
// //       {
// //         label: 'Payment Method Master',
// //         icon: LuCreditCard,
// //         href: '/admin/setting/paymentmethod',
// //       },
// //       {
// //         label: 'Tax Master',
// //         icon: LuPercent,
// //         href: '/admin/setting/tax',
// //       },
// //       {
// //         label: 'HSN Master',
// //         icon: LuReceipt,
// //         href: '/admin/setting/hsn',
// //       },
// //       {
// //         label: 'City Group Master',
// //         icon: LuMap,
// //         href: '/admin/setting/citygroup',
// //       },
// //       {
// //         label: 'Purchase Charge Master',
// //         icon: LuBadgeIndianRupee,
// //         href: '/admin/setting/purchase/master/charge',
// //       },
// //       {
// //         label: 'Purchase Term Master',
// //         icon: LuFileText,
// //         href: '/admin/setting/purchase/master/term',
// //       },
// //       {
// //         label: 'Sales Term Master',
// //         icon: LuFileText,
// //         href: '/admin/setting/sales/master/term',
// //       },
// //       {
// //         label: 'Loyalty Point',
// //         icon: LuHeart,
// //         href: '/admin/setting/loyaltypoint',
// //       },
// //       {
// //         label: 'Login Security',
// //         icon: LuShieldCheck,
// //         href: '/admin/setting/login-security',
// //       },
// //       {
// //         label: 'Pos Settings',
// //         icon: LuMonitorCog,
// //         href: '/admin/setting/pos_setting',
// //       },
// //       {
// //         label: 'Ecom Settings',
// //         icon: LuShoppingCart,
// //         href: '/admin/setting/ecom_setting',
// //       },
// //       {
// //         label: 'Invoice Layout Setting',
// //         icon: LuPanelTop,
// //         href: '/admin/setting/invoice-layout-setting',
// //       },
// //       {
// //         label: 'General Setting (Location)',
// //         icon: LuMapPinned,
// //         href: '/admin/setting/location-setting',
// //       },
// //       {
// //         label: 'Business Contact',
// //         icon: LuContact,
// //         href: '/admin/setting/business-contact',
// //       },
// //     ],
// //   },

// //   {
// //     label: 'Inventory',
// //     icon: LuGrid3X3,
// //     children: [
// //       {
// //         label: 'Filter',
// //         icon: LuFilter,
// //         href: '/admin/inventory/product/filter',
// //       },
// //       {
// //         label: 'Group',
// //         icon: LuLayers3,
// //         href: '/admin/inventory/product/group',
// //       },
// //       {
// //         label: 'Unit of Measurement',
// //         icon: LuRuler,
// //         href: '/admin/inventory/uom',
// //       },
// //       {
// //         label: 'Attribute Addons',
// //         icon: LuPuzzle,
// //         href: '/admin/inventory/attribute-addon',
// //       },
// //       {
// //         label: 'Item',
// //         icon: LuBox,
// //         href: '/admin/inventory/item',
// //       },
// //       {
// //         label: 'Print Label',
// //         icon: LuPrinter,
// //         href: '/admin/inventory/barcode-print',
// //       },
// //       {
// //         label: 'Barcode Item',
// //         icon: LuScanBarcode,
// //         href: '/admin/inventory/barcodeitem',
// //       },
// //       {
// //         label: 'Stock Adjustment',
// //         icon: LuClipboardList,
// //         href: '/admin/inventory/stock-adjustment',
// //       },
// //     ],
// //   },

// //   {
// //     label: 'Contacts',
// //     icon: LuUsers,
// //     children: [
// //       {
// //         label: 'Contact Types',
// //         icon: LuContactRound,
// //         href: '/admin/contact/contact-type',
// //       },
// //       {
// //         label: 'Suppliers',
// //         icon: LuTruck,
// //         href: '/admin/contact/supplier',
// //       },
// //       {
// //         label: 'Agents',
// //         icon: LuUserCog,
// //         href: '/admin/contact/agent',
// //       },
// //       {
// //         label: 'Customers',
// //         icon: LuUserRound,
// //         href: '/admin/contact/customer',
// //       },
// //     ],
// //   },

 
// //   {
// //     label: 'Logistic',
// //     icon: LuTruck,
// //     href: '/admin/logistic',
// //   },
 

// //   {
// //     label: 'Purchase',
// //     icon: LuShoppingBasket,
// //     children: [
// //       {
// //         label: 'Goods Receipt Challan',
// //         icon: LuFileCheck,
// //         href: '/admin/transaction/purchase/grc',
// //       },
// //       {
// //         label: 'Purchase Invoice',
// //         icon: LuFileText,
// //         href: '/admin/transaction/purchase/invoice',
// //       },
// //       {
// //         label: 'Goods Return Note',
// //         icon: LuUndo2,
// //         href: '/admin/transaction/purchase/grt',
// //       },
// //       {
// //         label: 'Debit Note',
// //         icon: LuFileMinus,
// //         href: '/admin/transaction/purchase/debitnote',
// //       },
// //     ],
// //   },

 
// //   {
// //     label: 'Sell',
// //     icon: LuShoppingBag,
// //     children: [
// //       {
// //         label: 'Delivery Challan',
// //         icon: LuFileCheck,
// //         href: '/admin/transaction/sell/deliverychallan',
// //       },
// //       {
// //         label: 'Sales Invoice',
// //         icon: LuFileText,
// //         href: '/admin/transaction/sell/salesinvoice',
// //       },
// //       {
// //         label: 'Sales Return',
// //         icon: LuUndo2,
// //         href: '/admin/transaction/sell/salereturn',
// //       },
// //       {
// //         label: 'Credit Note',
// //         icon: LuFilePlus,
// //         href: '/admin/transaction/sell/creditnote',
// //       },
// //       {
// //         label: 'POS',
// //         icon: LuMonitor,
// //         href: '/admin/transaction/sell/pos',
// //       },
// //       {
// //         label: 'POS Return',
// //         icon: LuUndo2,
// //         href: '/admin/transaction/sell/pos-return',
// //       },
// //       {
// //         label: 'B2B Invoice',
// //         icon: LuFileText,
// //         href: '/admin/transaction/sell/b2binvoice',
// //       },
// //     ],
// //   },
 

 
// //   {
// //     label: 'Staff Management',
// //     icon: LuUsers,
// //     children: [
// //       {
// //         label: 'Roles & Permissions',
// //         icon: LuShieldCheck,
// //         href: '/admin/staff-management/roles-permissions',
// //       },
// //       {
// //         label: 'Staffs',
// //         icon: LuUsers,
// //         href: '/admin/staff-management/staff',
// //       },
// //       {
// //         label: 'Sales Persons',
// //         icon: LuUserRound,
// //         href: '/admin/staff-management/staff/salesperson',
// //       },
// //     ],
// //   },
  

// //   {
// //     label: 'Stock Transfers',
// //     icon: LuShuffle,
// //     children: [],
// //   },

// //   {
// //     label: 'Inter Company Sell',
// //     icon: LuHouse,
// //     children: [],
// //   },

// //   {
// //     label: 'Reports',
// //     icon: LuChartNoAxesColumn,
// //     children: [],
// //   },

// //   {
// //     label: 'Communication',
// //     icon: LuMail,
// //     children: [],
// //   },

// //   {
// //     label: 'Tools',
// //     icon: LuWrench,
// //     children: [],
// //   },

// //   {
// //     label: 'Cash Register',
// //     icon: LuCircleDollarSign,
// //     children: [],
// //   },

// //   {
// //     label: 'Voucher',
// //     icon: LuFileCheck,
// //     children: [],
// //   },

// //   {
// //     label: 'Ledger Transaction',
// //     icon: LuBookMarked,
// //     children: [],
// //   },

// //   {
// //     label: 'E-commerce',
// //     icon: LuStore,
// //     children: [],
// //   },

// //   {
// //     label: 'Accounts',
// //     icon: LuWalletCards,
// //     children: [],
// //   },

// //   {
// //     label: 'Logout',
// //     icon: LuLogOut,
// //     href: '/logout',
// //   },

// // ];














// ///sagar


// // /* The only file left in config/.
// //    Sidebar labels and hrefs, nothing else - the same role Kisan Partner's
// //    config/menu.config.ts plays. Pages are no longer generated from here;
// //    every entry points at a real folder with its own page.jsx. */

// // export const NAV = [
// //   { label: 'Dashboard', icon: 'gauge', href: '/admin' },

// //   {
// //     label: 'Masters', icon: 'gear', children: [
// //       { label: 'Business Masters', href: '/admin/setting/business' },
// //       { label: 'Company Locations', href: '/admin/setting/companylocations' },
// //       { label: 'Ledger Group', href: '/admin/setting/ledgergroups' },
// //       { label: 'Ledger', href: '/admin/setting/ledger' },
// //       { label: 'Ledger Mapping', href: '/admin/setting/ledgergroupmapping' },
// //       { label: 'Voucher Settings', href: '/admin/setting/voucher-setting' },
// //       { label: 'Doc Setup', href: '/admin/setting/docsetup' },
// //       { label: 'Purchase Group Master', href: '/admin/setting/purchasegroup' },
// //       { label: 'Stock Point Master', href: '/admin/setting/stockpoint' },
// //       { label: 'Pos Counter Master', href: '/admin/setting/poscounter' },
// //       { label: 'Barcode Settings', href: '/admin/setting/barcodesetting' },
// //       { label: 'Split Barcode Settings', href: '/admin/setting/split-barcode-setting' },
// //       { label: 'Barcode Label Settings', href: '/admin/setting/barcode-label-setting' },
// //       { label: 'Payment Method Master', href: '/admin/setting/paymentmethod' },
// //       { label: 'Tax Master', href: '/admin/setting/tax' },
// //       { label: 'HSN Master', href: '/admin/setting/hsn' },
// //       { label: 'City Group Master', href: '/admin/setting/citygroup' },
// //       { label: 'Purchase Charge Master', href: '/admin/setting/purchase/master/charge' },
// //       { label: 'Purchase Term Master', href: '/admin/setting/purchase/master/term' },
// //       { label: 'Sales Term Master', href: '/admin/setting/sales/master/term' },
// //       { label: 'Loyalty Point', href: '/admin/setting/loyaltypoint' },
// //       { label: 'Login Security', href: '/admin/setting/login-security' },
// //       { label: 'Pos Settings', href: '/admin/setting/pos_setting' },
// //       { label: 'Ecom Settings', href: '/admin/setting/ecom_setting' },
// //       { label: 'Invoice Layout Setting', href: '/admin/setting/invoice-layout-setting' },
// //       { label: 'General Setting (Location)', href: '/admin/setting/location-setting' },
// //       { label: 'Business Contact', href: '/admin/setting/business-contact' },
// //     ],
// //   },

// //   {
// //     label: 'Inventory', icon: 'grid', children: [
// //       { label: 'Filter', href: '/admin/inventory/product/filter' },
// //       { label: 'Group', href: '/admin/inventory/product/group' },
// //       { label: 'Unit of Measurement', href: '/admin/inventory/uom' },
// //       { label: 'Attribute Addons', href: '/admin/inventory/attribute-addon' },
// //       { label: 'Item', href: '/admin/inventory/item' },
// //       { label: 'Print Label', href: '/admin/inventory/barcode-print' },
// //       { label: 'Barcode Item', href: '/admin/inventory/barcodeitem' },
// //       { label: 'Stock Adjustment', href: '/admin/inventory/stock-adjustment' },
// //     ],
// //   },

// //   {
// //     label: 'Contacts', icon: 'users', children: [
// //       { label: 'Contact Types', href: '/admin/contact/contact-type' },
// //       { label: 'Suppliers', href: '/admin/contact/supplier' },
// //       { label: 'Agents', href: '/admin/contact/agent' },
// //       { label: 'Customers', href: '/admin/contact/customer' },
// //     ],
// //   },

// //   // { label: 'Logistic', icon: 'truck', href: '/admin/logistic' },

// //   {
// //     label: 'Purchase', icon: 'bag', children: [
// //       { label: 'Goods Receipt Challan', href: '/admin/transaction/purchase/grc' },
// //       { label: 'Purchase Invoice', href: '/admin/transaction/purchase/invoice' },
// //       { label: 'Goods Return Note', href: '/admin/transaction/purchase/grt' },
// //       { label: 'Debit Note', href: '/admin/transaction/purchase/debitnote' },
// //     ],
// //   },

// //   // {
// //   //   label: 'Sell', icon: 'box', children: [
// //   //     { label: 'Delivery Challan', href: '/admin/transaction/sell/deliverychallan' },
// //   //     { label: 'Sales Invoice', href: '/admin/transaction/sell/salesinvoice' },
// //   //     { label: 'Sales Return', href: '/admin/transaction/sell/salereturn' },
// //   //     { label: 'Credit Note', href: '/admin/transaction/sell/creditnote' },
// //   //     { label: 'POS', href: '/admin/transaction/sell/pos' },
// //   //     { label: 'POS Return', href: '/admin/transaction/sell/pos-return' },
// //   //     { label: 'B2B Invoice', href: '/admin/transaction/sell/b2binvoice' },
// //   //   ],
// //   // },

// //   /* Staff Management pages are NOT built - these three links 404 today.
// //      Kept commented rather than shipping dead links in the sidebar. */
// //   // {
// //   //   label: 'Staff Management', icon: 'staff', children: [
// //   //     { label: 'Roles & Permissions', href: '/admin/staff-management/roles-permissions' },
// //   //     { label: 'Staffs', href: '/admin/staff-management/staff' },
// //   //     { label: 'Sales Persons', href: '/admin/staff-management/staff/salesperson' },
// //   //   ],
// //   // },

// //   // { label: 'Stock Transfers', icon: 'shuffle', children: [] },
// //   // { label: 'Inter Company Sell', icon: 'home', children: [] },
// //   // { label: 'Reports', icon: 'chart', children: [] },
// //   // { label: 'Communication', icon: 'mail', children: [] },
// //   // { label: 'Tools', icon: 'tools', children: [] },
// //   // { label: 'Cash Register', icon: 'register', children: [] },
// //   // { label: 'Voucher', icon: 'voucher', children: [] },
// //   // { label: 'Ledger Transaction', icon: 'ledger', children: [] },
// //   // { label: 'E-commerce', icon: 'cart', children: [] },
// //   // { label: 'Accounts', icon: 'accounts', children: [] },
// //    { label: 'Logout', icon: 'logout', href: '/logout' },
// // ];














// // import {
// //   LuGauge,
// //   LuSettings,
// //   LuBuilding2,
// //   LuMapPin,
// //   LuLayers3,
// //   LuBookOpen,
// //   LuGitBranch,
// //   LuSlidersHorizontal,
// //   LuFileCog,
// //   LuShoppingBag,
// //   LuWarehouse,
// //   LuMonitor,
// //   LuBarcode,
// //   LuSplit,
// //   LuTag,
// //   LuCreditCard,
// //   LuPercent,
// //   LuReceipt,
// //   LuMap,
// //   LuBadgeIndianRupee,
// //   LuFileText,
// //   LuHeart,
// //   LuShieldCheck,
// //   LuMonitorCog,
// //   LuShoppingCart,
// //   LuPanelTop,
// //   LuMapPinned,
// //   LuContact,
// //   LuGrid3X3,
// //   LuFilter,
// //   LuPackage,
// //   LuRuler,
// //   LuPuzzle,
// //   LuBox,
// //   LuPrinter,
// //   LuScanBarcode,
// //   LuClipboardList,
// //   LuUsers,
// //   LuUserCog,
// //   LuTruck,
// //   LuUserRound,
// //   LuContactRound,
// //   LuShoppingBasket,
// //   LuUndo2,
// //   LuFileMinus,
// //   LuFilePlus,
// //   LuShuffle,
// //   LuHouse,
// //   LuChartNoAxesColumn,
// //   LuMail,
// //   LuWrench,
// //   LuCircleDollarSign,
// //   LuFileCheck,
// //   LuBookMarked,
// //   LuStore,
// //   LuShoppingBag as LuEcommerce,
// //   LuWalletCards,
// //   LuLogOut,
// //   LuBus,
// //   LuIdCard,
// //   LuRoute,
// //   LuSend,
// //   LuPackageCheck,
// // } from 'react-icons/lu';

// // export const NAV = [

// //   {
// //     label: 'Dashboard',
// //     icon: LuGauge,
// //     href: '/admin',
// //   },

// //   {
// //     label: 'Masters',
// //     icon: LuSettings,
// //     children: [
// //       {
// //         label: 'Business Masters',
// //         icon: LuBuilding2,
// //         href: '/admin/setting/business',
// //       },
// //       {
// //         label: 'Company Locations',
// //         icon: LuMapPin,
// //         href: '/admin/setting/companylocations',
// //       },
// //       {
// //         label: 'Ledger Group',
// //         icon: LuLayers3,
// //         href: '/admin/setting/ledgergroups',
// //       },
// //       {
// //         label: 'Ledger',
// //         icon: LuBookOpen,
// //         href: '/admin/setting/ledger',
// //       },
// //       {
// //         label: 'Ledger Mapping',
// //         icon: LuGitBranch,
// //         href: '/admin/setting/ledgergroupmapping',
// //       },
// //       {
// //         label: 'Voucher Settings',
// //         icon: LuSlidersHorizontal,
// //         href: '/admin/setting/voucher-setting',
// //       },
// //       {
// //         label: 'Doc Setup',
// //         icon: LuFileCog,
// //         href: '/admin/setting/docsetup',
// //       },
// //       {
// //         label: 'Purchase Group Master',
// //         icon: LuShoppingBag,
// //         href: '/admin/setting/purchasegroup',
// //       },
// //       {
// //         label: 'Stock Point Master',
// //         icon: LuWarehouse,
// //         href: '/admin/setting/stockpoint',
// //       },
// //       {
// //         label: 'Pos Counter Master',
// //         icon: LuMonitor,
// //         href: '/admin/setting/poscounter',
// //       },
// //       {
// //         label: 'Barcode Settings',
// //         icon: LuBarcode,
// //         href: '/admin/setting/barcodesetting',
// //       },
// //       {
// //         label: 'Split Barcode Settings',
// //         icon: LuSplit,
// //         href: '/admin/setting/split-barcode-setting',
// //       },
// //       {
// //         label: 'Barcode Label Settings',
// //         icon: LuTag,
// //         href: '/admin/setting/barcode-label-setting',
// //       },
// //       {
// //         label: 'Payment Method Master',
// //         icon: LuCreditCard,
// //         href: '/admin/setting/paymentmethod',
// //       },
// //       {
// //         label: 'Tax Master',
// //         icon: LuPercent,
// //         href: '/admin/setting/tax',
// //       },
// //       {
// //         label: 'HSN Master',
// //         icon: LuReceipt,
// //         href: '/admin/setting/hsn',
// //       },
// //       {
// //         label: 'City Group Master',
// //         icon: LuMap,
// //         href: '/admin/setting/citygroup',
// //       },
// //       {
// //         label: 'Purchase Charge Master',
// //         icon: LuBadgeIndianRupee,
// //         href: '/admin/setting/purchase/master/charge',
// //       },
// //       {
// //         label: 'Purchase Term Master',
// //         icon: LuFileText,
// //         href: '/admin/setting/purchase/master/term',
// //       },
// //       {
// //         label: 'Sales Term Master',
// //         icon: LuFileText,
// //         href: '/admin/setting/sales/master/term',
// //       },
// //       {
// //         label: 'Loyalty Point',
// //         icon: LuHeart,
// //         href: '/admin/setting/loyaltypoint',
// //       },
// //       {
// //         label: 'Login Security',
// //         icon: LuShieldCheck,
// //         href: '/admin/setting/login-security',
// //       },
// //       {
// //         label: 'Pos Settings',
// //         icon: LuMonitorCog,
// //         href: '/admin/setting/pos_setting',
// //       },
// //       {
// //         label: 'Ecom Settings',
// //         icon: LuShoppingCart,
// //         href: '/admin/setting/ecom_setting',
// //       },
// //       {
// //         label: 'Invoice Layout Setting',
// //         icon: LuPanelTop,
// //         href: '/admin/setting/invoice-layout-setting',
// //       },
// //       {
// //         label: 'General Setting (Location)',
// //         icon: LuMapPinned,
// //         href: '/admin/setting/location-setting',
// //       },
// //       {
// //         label: 'Business Contact',
// //         icon: LuContact,
// //         href: '/admin/setting/business-contact',
// //       },
// //     ],
// //   },

// //   {
// //     label: 'Inventory',
// //     icon: LuGrid3X3,
// //     children: [
// //       {
// //         label: 'Filter',
// //         icon: LuFilter,
// //         href: '/admin/inventory/product/filter',
// //       },
// //       {
// //         label: 'Group',
// //         icon: LuLayers3,
// //         href: '/admin/inventory/product/group',
// //       },
// //       {
// //         label: 'Unit of Measurement',
// //         icon: LuRuler,
// //         href: '/admin/inventory/uom',
// //       },
// //       {
// //         label: 'Attribute Addons',
// //         icon: LuPuzzle,
// //         href: '/admin/inventory/attribute-addon',
// //       },
// //       {
// //         label: 'Item',
// //         icon: LuBox,
// //         href: '/admin/inventory/item',
// //       },
// //       {
// //         label: 'Print Label',
// //         icon: LuPrinter,
// //         href: '/admin/inventory/barcode-print',
// //       },
// //       {
// //         label: 'Barcode Item',
// //         icon: LuScanBarcode,
// //         href: '/admin/inventory/barcodeitem',
// //       },
// //       {
// //         label: 'Stock Adjustment',
// //         icon: LuClipboardList,
// //         href: '/admin/inventory/stock-adjustment',
// //       },
// //     ],
// //   },

// //   {
// //     label: 'Contacts',
// //     icon: LuUsers,
// //     children: [
// //       {
// //         label: 'Contact Types',
// //         icon: LuContactRound,
// //         href: '/admin/contact/contact-type',
// //       },
// //       {
// //         label: 'Suppliers',
// //         icon: LuTruck,
// //         href: '/admin/contact/supplier',
// //       },
// //       {
// //         label: 'Agents',
// //         icon: LuUserCog,
// //         href: '/admin/contact/agent',
// //       },
// //       {
// //         label: 'Customers',
// //         icon: LuUserRound,
// //         href: '/admin/contact/customer',
// //       },
// //     ],
// //   },

 
// //   // {
// //   //   label: 'Logistic',
// //   //   icon: LuTruck,
// //   //   href: '/admin/logistic',
// //   // },
 

// //   // {
// //   //   label: 'Transportation',
// //   //   icon: LuTruck,
// //   //   children: [
// //   //     {
// //   //       label: 'Transport Master',
// //   //       icon: LuTruck,
// //   //       href: '/admin/transport/transporter',
// //   //     },
// //   //     {
// //   //       label: 'Delivery',
// //   //       icon: LuPackageCheck,
// //   //       href: '/admin/transport/delivery',
// //   //     },
// //   //     {
// //   //       label: 'Vehicle Master',
// //   //       icon: LuBus,
// //   //       href: '/admin/transport/vehicle',
// //   //     },
// //   //     {
// //   //       label: 'Driver Master',
// //   //       icon: LuIdCard,
// //   //       href: '/admin/transport/driver',
// //   //     },
// //   //     {
// //   //       label: 'Route Master',
// //   //       icon: LuRoute,
// //   //       href: '/admin/transport/route',
// //   //     },
// //   //     {
// //   //       label: 'Dispatch',
// //   //       icon: LuSend,
// //   //       href: '/admin/transport/dispatch',
// //   //     },
// //   //   ],
// //   // },

// //   {
// //     label: 'Purchase',
// //     icon: LuShoppingBasket,
// //     children: [
// //       {
// //         label: 'Goods Receipt Challan',
// //         icon: LuFileCheck,
// //         href: '/admin/transaction/purchase/grc',
// //       },
// //       {
// //         label: 'Purchase Invoice',
// //         icon: LuFileText,
// //         href: '/admin/transaction/purchase/invoice',
// //       },
// //       {
// //         label: 'Goods Return Note',
// //         icon: LuUndo2,
// //         href: '/admin/transaction/purchase/grt',
// //       },
// //       {
// //         label: 'Debit Note',
// //         icon: LuFileMinus,
// //         href: '/admin/transaction/purchase/debitnote',
// //       },
// //     ],
// //   },

 
// //   {
// //     label: 'Sell',
// //     icon: LuShoppingBag,
// //     children: [
// //       {
// //         label: 'Delivery Challan',
// //         icon: LuFileCheck,
// //         href: '/admin/transaction/sell/deliverychallan',
// //       },
// //       {
// //         label: 'Sales Invoice',
// //         icon: LuFileText,
// //         href: '/admin/transaction/sell/salesinvoice',
// //       },
// //       {
// //         label: 'Sales Return',
// //         icon: LuUndo2,
// //         href: '/admin/transaction/sell/salereturn',
// //       },
// //       {
// //         label: 'Credit Note',
// //         icon: LuFilePlus,
// //         href: '/admin/transaction/sell/creditnote',
// //       },
// //       {
// //         label: 'POS',
// //         icon: LuMonitor,
// //         href: '/admin/transaction/sell/pos',
// //       },
// //       {
// //         label: 'POS Return',
// //         icon: LuUndo2,
// //         href: '/admin/transaction/sell/pos-return',
// //       },
// //       {
// //         label: 'B2B Invoice',
// //         icon: LuFileText,
// //         href: '/admin/transaction/sell/b2binvoice',
// //       },
// //     ],
// //   },
 

 
// //   // {
// //   //   label: 'Staff Management',
// //   //   icon: LuUsers,
// //   //   children: [
// //   //     {
// //   //       label: 'Roles & Permissions',
// //   //       icon: LuShieldCheck,
// //   //       href: '/admin/staff-management/roles-permissions',
// //   //     },
// //   //     {
// //   //       label: 'Staffs',
// //   //       icon: LuUsers,
// //   //       href: '/admin/staff-management/staff',
// //   //     },
// //   //     {
// //   //       label: 'Sales Persons',
// //   //       icon: LuUserRound,
// //   //       href: '/admin/staff-management/staff/salesperson',
// //   //     },
// //   //   ],
// //   // },
  

// //   // {
// //   //   label: 'Stock Transfers',
// //   //   icon: LuShuffle,
// //   //   children: [],
// //   // },

// //   // {
// //   //   label: 'Inter Company Sell',
// //   //   icon: LuHouse,
// //   //   children: [],
// //   // },

// //   // {
// //   //   label: 'Reports',
// //   //   icon: LuChartNoAxesColumn,
// //   //   children: [],
// //   // },

// //   // {
// //   //   label: 'Communication',
// //   //   icon: LuMail,
// //   //   children: [],
// //   // },

// //   // {
// //   //   label: 'Tools',
// //   //   icon: LuWrench,
// //   //   children: [],
// //   // },

// //   // {
// //   //   label: 'Cash Register',
// //   //   icon: LuCircleDollarSign,
// //   //   children: [],
// //   // },

// //   // {
// //   //   label: 'Voucher',
// //   //   icon: LuFileCheck,
// //   //   children: [],
// //   // },

// //   // {
// //   //   label: 'Ledger Transaction',
// //   //   icon: LuBookMarked,
// //   //   children: [],
// //   // },

// //   // {
// //   //   label: 'E-commerce',
// //   //   icon: LuStore,
// //   //   children: [],
// //   // },

// //   // {
// //   //   label: 'Accounts',
// //   //   icon: LuWalletCards,
// //   //   children: [],
// //   // },

// //   {
// //     label: 'Logout',
// //     icon: LuLogOut,
// //     href: '/logout',
// //   },

// // ];















// ///sagar

// import {
//   LuGauge,
//   LuSettings,
//   LuBuilding2,
//   LuMapPin,
//   LuLayers3,
//   LuBookOpen,
//   LuGitBranch,
//   LuSlidersHorizontal,
//   LuFileCog,
//   LuShoppingBag,
//   LuWarehouse,
//   LuMonitor,
//   LuBarcode,
//   LuSplit,
//   LuTag,
//   LuCreditCard,
//   LuPercent,
//   LuReceipt,
//   LuMap,
//   LuBadgeIndianRupee,
//   LuFileText,
//   LuHeart,
//   LuShieldCheck,
//   LuMonitorCog,
//   LuShoppingCart,
//   LuPanelTop,
//   LuMapPinned,
//   LuContact,
//   LuGrid3X3,
//   LuFilter,
//   LuPackage,
//   LuRuler,
//   LuPuzzle,
//   LuBox,
//   LuPrinter,
//   LuScanBarcode,
//   LuClipboardList,
//   LuUsers,
//   LuUserCog,
//   LuTruck,
//   LuUserRound,
//   LuContactRound,
//   LuShoppingBasket,
//   LuUndo2,
//   LuFileMinus,
//   LuFilePlus,
//   LuShuffle,
//   LuHouse,
//   LuChartNoAxesColumn,
//   LuMail,
//   LuWrench,
//   LuCircleDollarSign,
//   LuFileCheck,
//   LuBookMarked,
//   LuStore,
//   LuShoppingBag as LuEcommerce,
//   LuWalletCards,
//   LuLogOut,
//   LuBus,
//   LuIdCard,
//   LuRoute,
//   LuSend,
//   LuPackageCheck,
//   LuPackageMinus,
// } from 'react-icons/lu';
 
// export const NAV = [
 
//   {
//     label: 'Dashboard',
//     icon: LuGauge,
//     href: '/admin',
//   },
 
//   {
//     label: 'Masters',
//     icon: LuSettings,
//     children: [
//       {
//         label: 'Business Masters',
//         icon: LuBuilding2,
//         href: '/admin/setting/business',
//       },
//       {
//         label: 'Company Locations',
//         icon: LuMapPin,
//         href: '/admin/setting/companylocations',
//       },
//       {
//         label: 'Ledger Group',
//         icon: LuLayers3,
//         href: '/admin/setting/ledgergroups',
//       },
//       {
//         label: 'Ledger',
//         icon: LuBookOpen,
//         href: '/admin/setting/ledger',
//       },
//       {
//         label: 'Ledger Mapping',
//         icon: LuGitBranch,
//         href: '/admin/setting/ledgergroupmapping',
//       },
//       {
//         label: 'Voucher Settings',
//         icon: LuSlidersHorizontal,
//         href: '/admin/setting/voucher-setting',
//       },
//       {
//         label: 'Doc Setup',
//         icon: LuFileCog,
//         href: '/admin/setting/docsetup',
//       },
//       {
//         label: 'Purchase Group Master',
//         icon: LuShoppingBag,
//         href: '/admin/setting/purchasegroup',
//       },
//       {
//         label: 'Stock Point Master',
//         icon: LuWarehouse,
//         href: '/admin/setting/stockpoint',
//       },
//       {
//         label: 'Pos Counter Master',
//         icon: LuMonitor,
//         href: '/admin/setting/poscounter',
//       },
//       {
//         label: 'Barcode Settings',
//         icon: LuBarcode,
//         href: '/admin/setting/barcodesetting',
//       },
//       {
//         label: 'Split Barcode Settings',
//         icon: LuSplit,
//         href: '/admin/setting/split-barcode-setting',
//       },
//       {
//         label: 'Barcode Label Settings',
//         icon: LuTag,
//         href: '/admin/setting/barcode-label-setting',
//       },
//       {
//         label: 'Payment Method Master',
//         icon: LuCreditCard,
//         href: '/admin/setting/paymentmethod',
//       },
//       {
//         label: 'Tax Master',
//         icon: LuPercent,
//         href: '/admin/setting/tax',
//       },
//       {
//         label: 'HSN Master',
//         icon: LuReceipt,
//         href: '/admin/setting/hsn',
//       },
//       {
//         label: 'City Group Master',
//         icon: LuMap,
//         href: '/admin/setting/citygroup',
//       },
//       {
//         label: 'Purchase Charge Master',
//         icon: LuBadgeIndianRupee,
//         href: '/admin/setting/purchase/master/charge',
//       },
//       {
//         label: 'Purchase Term Master',
//         icon: LuFileText,
//         href: '/admin/setting/purchase/master/term',
//       },
//       {
//         label: 'Sales Term Master',
//         icon: LuFileText,
//         href: '/admin/setting/sales/master/term',
//       },
//       {
//         label: 'Loyalty Point',
//         icon: LuHeart,
//         href: '/admin/setting/loyaltypoint',
//       },
//       {
//         label: 'Login Security',
//         icon: LuShieldCheck,
//         href: '/admin/setting/login-security',
//       },
//       {
//         label: 'Pos Settings',
//         icon: LuMonitorCog,
//         href: '/admin/setting/pos_setting',
//       },
//       {
//         label: 'Ecom Settings',
//         icon: LuShoppingCart,
//         href: '/admin/setting/ecom_setting',
//       },
//       {
//         label: 'Invoice Layout Setting',
//         icon: LuPanelTop,
//         href: '/admin/setting/invoice-layout-setting',
//       },
//       {
//         label: 'General Setting (Location)',
//         icon: LuMapPinned,
//         href: '/admin/setting/location-setting',
//       },
//       {
//         label: 'Business Contact',
//         icon: LuContact,
//         href: '/admin/setting/business-contact',
//       },
//     ],
//   },
 
//   {
//     label: 'Inventory',
//     icon: LuGrid3X3,
//     children: [
//       {
//         label: 'Filter',
//         icon: LuFilter,
//         href: '/admin/inventory/product/filter',
//       },
//       {
//         label: 'Group',
//         icon: LuLayers3,
//         href: '/admin/inventory/product/group',
//       },
//       {
//         label: 'Unit of Measurement',
//         icon: LuRuler,
//         href: '/admin/inventory/uom',
//       },
//       {
//         label: 'Attribute Addons',
//         icon: LuPuzzle,
//         href: '/admin/inventory/attribute-addon',
//       },
//       {
//         label: 'Item',
//         icon: LuBox,
//         href: '/admin/inventory/item',
//       },
//       {
//         label: 'Print Label',
//         icon: LuPrinter,
//         href: '/admin/inventory/barcode-print',
//       },
//       {
//         label: 'Barcode Item',
//         icon: LuScanBarcode,
//         href: '/admin/inventory/barcodeitem',
//       },
//       {
//         label: 'Stock Adjustment',
//         icon: LuClipboardList,
//         href: '/admin/inventory/stock-adjustment',
//       },
//     ],
//   },
 
//   {
//     label: 'Contacts',
//     icon: LuUsers,
//     children: [
//       {
//         label: 'Contact Types',
//         icon: LuContactRound,
//         href: '/admin/contact/contact-type',
//       },
//       {
//         label: 'Suppliers',
//         icon: LuTruck,
//         href: '/admin/contact/supplier',
//       },
//       {
//         label: 'Agents',
//         icon: LuUserCog,
//         href: '/admin/contact/agent',
//       },
//       {
//         label: 'Customers',
//         icon: LuUserRound,
//         href: '/admin/contact/customer',
//       },
//     ],
//   },
 
 
//   // {
//   //   label: 'Logistic',
//   //   icon: LuTruck,
//   //   href: '/admin/logistic',
//   // },
 
 
//   // {
//   //   label: 'Transportation',
//   //   icon: LuTruck,
//   //   children: [
//   //     {
//   //       label: 'Transport Master',
//   //       icon: LuTruck,
//   //       href: '/admin/transport/transporter',
//   //     },
//   //     {
//   //       label: 'Delivery',
//   //       icon: LuPackageCheck,
//   //       href: '/admin/transport/delivery',
//   //     },
//   //     {
//   //       label: 'Vehicle Master',
//   //       icon: LuBus,
//   //       href: '/admin/transport/vehicle',
//   //     },
//   //     {
//   //       label: 'Driver Master',
//   //       icon: LuIdCard,
//   //       href: '/admin/transport/driver',
//   //     },
//   //     {
//   //       label: 'Route Master',
//   //       icon: LuRoute,
//   //       href: '/admin/transport/route',
//   //     },
//   //     {
//   //       label: 'Dispatch',
//   //       icon: LuSend,
//   //       href: '/admin/transport/dispatch',
//   //     },
//   //   ],
//   // },
 
//   {
//     label: 'Purchase',
//     icon: LuShoppingBasket,
//     children: [
//       {
//         label: 'Goods Receipt Challan',
//         icon: LuFileCheck,
//         href: '/admin/transaction/purchase/grc',
//       },
//       {
//         label: 'Purchase Invoice',
//         icon: LuFileText,
//         href: '/admin/transaction/purchase/invoice',
//       },
//       {
//         label: 'Goods Return Note',
//         icon: LuUndo2,
//         href: '/admin/transaction/purchase/grt',
//       },
//       {
//         label: 'Debit Note',
//         icon: LuFileMinus,
//         href: '/admin/transaction/purchase/debitnote',
//       },
//     ],
//   },
 
 
//   {
//     label: 'Sell',
//     icon: LuShoppingBag,
//     children: [
//       {
//         label: 'Delivery Challan',
//         icon: LuFileCheck,
//         href: '/admin/transaction/sell/deliverychallan',
//       },
//       {
//         label: 'Sales Invoice',
//         icon: LuFileText,
//         href: '/admin/transaction/sell/salesinvoice',
//       },
//       {
//         label: 'Sales Return',
//         icon: LuUndo2,
//         href: '/admin/transaction/sell/salereturn',
//       },
//       {
//         label: 'Credit Note',
//         icon: LuFilePlus,
//         href: '/admin/transaction/sell/creditnote',
//       },
//       {
//         label: 'POS',
//         icon: LuMonitor,
//         href: '/admin/transaction/sell/pos',
//       },
//       {
//         label: 'POS Return',
//         icon: LuUndo2,
//         href: '/admin/transaction/sell/pos-return',
//       },
//       {
//         label: 'B2B Invoice',
//         icon: LuFileText,
//         href: '/admin/transaction/sell/b2binvoice',
//       },
//     ],
//   },
 
//   {
//     label: 'Inter Company Sell',
//     icon: LuHouse,
//     children: [
//       { label: 'Delivery Challan', icon: LuFileCheck,
//         href: '/admin/transaction/intercompanysell/deliverychallan' },
//       { label: 'Sales Invoice', icon: LuFileText,
//         href: '/admin/transaction/intercompanysell/salesinvoice' },
//       { label: 'Auto Purchases Received', icon: LuPackageCheck,
//         href: '/admin/transaction/intercompanysell/auto-purchases-received' },
//       { label: 'Auto Purchases Return', icon: LuPackageMinus,
//         href: '/admin/transaction/intercompanysell/auto-purchases-return' },
//       { label: 'Sales Return', icon: LuUndo2,
//         href: '/admin/transaction/intercompanysell/salereturn' },
//     ],
//   },
 
 
 
//   // {
//   //   label: 'Staff Management',
//   //   icon: LuUsers,
//   //   children: [
//   //     {
//   //       label: 'Roles & Permissions',
//   //       icon: LuShieldCheck,
//   //       href: '/admin/staff-management/roles-permissions',
//   //     },
//   //     {
//   //       label: 'Staffs',
//   //       icon: LuUsers,
//   //       href: '/admin/staff-management/staff',
//   //     },
//   //     {
//   //       label: 'Sales Persons',
//   //       icon: LuUserRound,
//   //       href: '/admin/staff-management/staff/salesperson',
//   //     },
//   //   ],
//   // },
  
 
//   // {
//   //   label: 'Stock Transfers',
//   //   icon: LuShuffle,
//   //   children: [],
//   // },
 
//   // {
//   //   label: 'Inter Company Sell',
//   //   icon: LuHouse,
//   //   children: [],
//   // },
 
//   // {
//   //   label: 'Reports',
//   //   icon: LuChartNoAxesColumn,
//   //   children: [],
//   // },
 
//   // {
//   //   label: 'Communication',
//   //   icon: LuMail,
//   //   children: [],
//   // },
 
//   // {
//   //   label: 'Tools',
//   //   icon: LuWrench,
//   //   children: [],
//   // },
 
//   // {
//   //   label: 'Cash Register',
//   //   icon: LuCircleDollarSign,
//   //   children: [],
//   // },
 
//   // {
//   //   label: 'Voucher',
//   //   icon: LuFileCheck,
//   //   children: [],
//   // },
 
//   // {
//   //   label: 'Ledger Transaction',
//   //   icon: LuBookMarked,
//   //   children: [],
//   // },
 
//   // {
//   //   label: 'E-commerce',
//   //   icon: LuStore,
//   //   children: [],
//   // },
 
//   // {
//   //   label: 'Accounts',
//   //   icon: LuWalletCards,
//   //   children: [],
//   // },
 
//   {
//     label: 'Logout',
//     icon: LuLogOut,
//     href: '/logout',
//   },
 
// ];
























import {
  LuGauge,
  LuSettings,
  LuBuilding2,
  LuMapPin,
  LuLayers3,
  LuBookOpen,
  LuGitBranch,
  LuSlidersHorizontal,
  LuFileCog,
  LuShoppingBag,
  LuWarehouse,
  LuMonitor,
  LuBarcode,
  LuSplit,
  LuTag,
  LuCreditCard,
  LuPercent,
  LuReceipt,
  LuMap,
  LuBadgeIndianRupee,
  LuFileText,
  LuHeart,
  LuShieldCheck,
  LuMonitorCog,
  LuShoppingCart,
  LuPanelTop,
  LuMapPinned,
  LuContact,
  LuGrid3X3,
  LuFilter,
  LuPackage,
  LuRuler,
  LuPuzzle,
  LuBox,
  LuPrinter,
  LuScanBarcode,
  LuClipboardList,
  LuUsers,
  LuUserCog,
  LuTruck,
  LuUserRound,
  LuContactRound,
  LuShoppingBasket,
  LuUndo2,
  LuFileMinus,
  LuFilePlus,
  LuShuffle,
  LuHouse,
  LuChartNoAxesColumn,
  LuMail,
  LuWrench,
  LuCircleDollarSign,
  LuFileCheck,
  LuBookMarked,
  LuStore,
  LuShoppingBag as LuEcommerce,
  LuWalletCards,
  LuLogOut,
  LuBus,
  LuIdCard,
  LuRoute,
  LuSend,
  LuPackageCheck,
  LuPackageMinus,
} from 'react-icons/lu';
 
export const NAV = [
 
  {
    label: 'Dashboard',
    icon: LuGauge,
    href: '/admin',
  },
 
  {
    label: 'Masters',
    icon: LuSettings,
    children: [
      {
        label: 'Business Masters',
        icon: LuBuilding2,
        href: '/admin/setting/business',
      },
      {
        label: 'Company Locations',
        icon: LuMapPin,
        href: '/admin/setting/companylocations',
      },
      {
        label: 'Ledger Group',
        icon: LuLayers3,
        href: '/admin/setting/ledgergroups',
      },
      {
        label: 'Ledger',
        icon: LuBookOpen,
        href: '/admin/setting/ledger',
      },
      {
        label: 'Ledger Mapping',
        icon: LuGitBranch,
        href: '/admin/setting/ledgergroupmapping',
      },
      {
        label: 'Voucher Settings',
        icon: LuSlidersHorizontal,
        href: '/admin/setting/voucher-setting',
      },
      {
        label: 'Doc Setup',
        icon: LuFileCog,
        href: '/admin/setting/docsetup',
      },
      {
        label: 'Purchase Group Master',
        icon: LuShoppingBag,
        href: '/admin/setting/purchasegroup',
      },
      {
        label: 'Stock Point Master',
        icon: LuWarehouse,
        href: '/admin/setting/stockpoint',
      },
      {
        label: 'Pos Counter Master',
        icon: LuMonitor,
        href: '/admin/setting/poscounter',
      },
      {
        label: 'Barcode Settings',
        icon: LuBarcode,
        href: '/admin/setting/barcodesetting',
      },
      {
        label: 'Split Barcode Settings',
        icon: LuSplit,
        href: '/admin/setting/split-barcode-setting',
      },
      {
        label: 'Barcode Label Settings',
        icon: LuTag,
        href: '/admin/setting/barcode-label-setting',
      },
      {
        label: 'Payment Method Master',
        icon: LuCreditCard,
        href: '/admin/setting/paymentmethod',
      },
      {
        label: 'Tax Master',
        icon: LuPercent,
        href: '/admin/setting/tax',
      },
      {
        label: 'HSN Master',
        icon: LuReceipt,
        href: '/admin/setting/hsn',
      },
      {
        label: 'City Group Master',
        icon: LuMap,
        href: '/admin/setting/citygroup',
      },
      {
        label: 'Purchase Charge Master',
        icon: LuBadgeIndianRupee,
        href: '/admin/setting/purchase/master/charge',
      },
      {
        label: 'Purchase Term Master',
        icon: LuFileText,
        href: '/admin/setting/purchase/master/term',
      },
      {
        label: 'Sales Term Master',
        icon: LuFileText,
        href: '/admin/setting/sales/master/term',
      },
      {
        label: 'Loyalty Point',
        icon: LuHeart,
        href: '/admin/setting/loyaltypoint',
      },
      {
        label: 'Login Security',
        icon: LuShieldCheck,
        href: '/admin/setting/login-security',
      },
      {
        label: 'Pos Settings',
        icon: LuMonitorCog,
        href: '/admin/setting/pos_setting',
      },
      {
        label: 'Ecom Settings',
        icon: LuShoppingCart,
        href: '/admin/setting/ecom_setting',
      },
      {
        label: 'Invoice Layout Setting',
        icon: LuPanelTop,
        href: '/admin/setting/invoice-layout-setting',
      },
      {
        label: 'General Setting (Location)',
        icon: LuMapPinned,
        href: '/admin/setting/location-setting',
      },
      {
        label: 'Business Contact',
        icon: LuContact,
        href: '/admin/setting/business-contact',
      },
    ],
  },
 
  {
    label: 'Inventory',
    icon: LuGrid3X3,
    children: [
      {
        label: 'Filter',
        icon: LuFilter,
        href: '/admin/inventory/product/filter',
      },
      {
        label: 'Group',
        icon: LuLayers3,
        href: '/admin/inventory/product/group',
      },
      {
        label: 'Unit of Measurement',
        icon: LuRuler,
        href: '/admin/inventory/uom',
      },
      {
        label: 'Attribute Addons',
        icon: LuPuzzle,
        href: '/admin/inventory/attribute-addon',
      },
      {
        label: 'Item',
        icon: LuBox,
        href: '/admin/inventory/item',
      },
      // {
      //   label: 'Print Label',
      //   icon: LuPrinter,
      //   href: '/admin/inventory/barcode-print',
      // },
      {
        label: 'Barcode Item',
        icon: LuScanBarcode,
        href: '/admin/inventory/barcodeitem',
      },
      {
        label: 'Stock Adjustment',
        icon: LuClipboardList,
        href: '/admin/inventory/stock-adjustment',
      },
    ],
  },
 
  {
    label: 'Contacts',
    icon: LuUsers,
    children: [
      {
        label: 'Contact Types',
        icon: LuContactRound,
        href: '/admin/contact/contact-type',
      },
      {
        label: 'Suppliers',
        icon: LuTruck,
        href: '/admin/contact/supplier',
      },
      {
        label: 'Agents',
        icon: LuUserCog,
        href: '/admin/contact/agent',
      },
      {
        label: 'Customers',
        icon: LuUserRound,
        href: '/admin/contact/customer',
      },
    ],
  },
 
 
  // {
  //   label: 'Logistic',
  //   icon: LuTruck,
  //   href: '/admin/logistic',
  // },
 
 
  {
    label: 'Transportation',
    icon: LuTruck,
    children: [
      {
        label: 'Transport Master',
        icon: LuTruck,
        href: '/admin/transport/transporter',
      },
      {
        label: 'Delivery',
        icon: LuPackageCheck,
        href: '/admin/transport/delivery',
      },
      {
        label: 'Vehicle Master',
        icon: LuBus,
        href: '/admin/transport/vehicle',
      },
      {
        label: 'Driver Master',
        icon: LuIdCard,
        href: '/admin/transport/driver',
      },
      {
        label: 'Route Master',
        icon: LuRoute,
        href: '/admin/transport/route',
      },
      {
        label: 'Dispatch',
        icon: LuSend,
        href: '/admin/transport/dispatch',
      },
    ],
  },
 
  {
    label: 'Purchase',
    icon: LuShoppingBasket,
    children: [
      {
        label: 'Goods Receipt Challan',
        icon: LuFileCheck,
        href: '/admin/transaction/purchase/grc',
      },
      {
        label: 'Purchase Invoice',
        icon: LuFileText,
        href: '/admin/transaction/purchase/invoice',
      },
      {
        label: 'Goods Return Note',
        icon: LuUndo2,
        href: '/admin/transaction/purchase/grt',
      },
      {
        label: 'Debit Note',
        icon: LuFileMinus,
        href: '/admin/transaction/purchase/debitnote',
      },
    ],
  },
 
 
  {
    label: 'Sell',
    icon: LuShoppingBag,
    children: [
      {
        label: 'Delivery Challan',
        icon: LuFileCheck,
        href: '/admin/transaction/sell/deliverychallan',
      },
      {
        label: 'Sales Invoice',
        icon: LuFileText,
        href: '/admin/transaction/sell/salesinvoice',
      },
      {
        label: 'Sales Return',
        icon: LuUndo2,
        href: '/admin/transaction/sell/salereturn',
      },
      {
        label: 'Credit Note',
        icon: LuFilePlus,
        href: '/admin/transaction/sell/creditnote',
      },
      {
        label: 'POS',
        icon: LuMonitor,
        href: '/admin/transaction/sell/pos',
      },
      {
        label: 'POS Return',
        icon: LuUndo2,
        href: '/admin/transaction/sell/pos-return',
      },
      {
        label: 'B2B Invoice',
        icon: LuFileText,
        href: '/admin/transaction/sell/b2binvoice',
      },
    ],
  },
 
  {
    label: 'Inter Company Sell',
    icon: LuHouse,
    children: [
      { label: 'Delivery Challan', icon: LuFileCheck,
        href: '/admin/transaction/intercompanysell/deliverychallan' },
      { label: 'Sales Invoice', icon: LuFileText,
        href: '/admin/transaction/intercompanysell/salesinvoice' },
      { label: 'Auto Purchases Received', icon: LuPackageCheck,
        href: '/admin/transaction/intercompanysell/auto-purchases-received' },
      { label: 'Auto Purchases Return', icon: LuPackageMinus,
        href: '/admin/transaction/intercompanysell/auto-purchases-return' },
      { label: 'Sales Return', icon: LuUndo2,
        href: '/admin/transaction/intercompanysell/salereturn' },
    ],
  },

  {
    label: 'Stock Transfers',
    icon: LuShuffle,
    children: [
      {
        label: 'Transfer Stock Packet',
        icon: LuPackage,
        href: '/admin/transaction/stocktransfers/transferstockpacket',
      },
      {
        label: 'Transfer Stock Location',
        icon: LuMapPin,
        href: '/admin/transaction/stocktransfers/transferstocklocation',
      },
      {
        label: 'Transfer Stock Received',
        icon: LuPackageCheck,
        href: '/admin/transaction/stocktransfers/transferstockreceived',
      },
    ],
  },
 
 
 
  // {
  //   label: 'Staff Management',
  //   icon: LuUsers,
  //   children: [
  //     {
  //       label: 'Roles & Permissions',
  //       icon: LuShieldCheck,
  //       href: '/admin/staff-management/roles-permissions',
  //     },
  //     {
  //       label: 'Staffs',
  //       icon: LuUsers,
  //       href: '/admin/staff-management/staff',
  //     },
  //     {
  //       label: 'Sales Persons',
  //       icon: LuUserRound,
  //       href: '/admin/staff-management/staff/salesperson',
  //     },
  //   ],
  // },
  
 
  // {
  //   label: 'Stock Transfers',
  //   icon: LuShuffle,
  //   children: [],
  // },
 
  // {
  //   label: 'Inter Company Sell',
  //   icon: LuHouse,
  //   children: [],
  // },
 
  // {
  //   label: 'Reports',
  //   icon: LuChartNoAxesColumn,
  //   children: [],
  // },
 
  // {
  //   label: 'Communication',
  //   icon: LuMail,
  //   children: [],
  // },
 
  // {
  //   label: 'Tools',
  //   icon: LuWrench,
  //   children: [],
  // },
 
  // {
  //   label: 'Cash Register',
  //   icon: LuCircleDollarSign,
  //   children: [],
  // },
 
  // {
  //   label: 'Voucher',
  //   icon: LuFileCheck,
  //   children: [],
  // },
 
  // {
  //   label: 'Ledger Transaction',
  //   icon: LuBookMarked,
  //   children: [],
  // },
 
  // {
  //   label: 'E-commerce',
  //   icon: LuStore,
  //   children: [],
  // },
 
  // {
  //   label: 'Accounts',
  //   icon: LuWalletCards,
  //   children: [],
  // },
 
  {
    label: 'Ledger Transaction',
    icon: LuBookMarked,
    href: '/admin/ledger-transaction',
  },
 
  {
    label: 'Logout',
    icon: LuLogOut,
    href: '/logout',
  },
 
];
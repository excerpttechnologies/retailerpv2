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
        label: 'Transport Master',
        icon: LuTruck,
        href: '/admin/transport/transporter',
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
      {
        label: 'Print Label',
        icon: LuPrinter,
        href: '/admin/inventory/barcode-print',
      },
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
 
 
  {
    label: 'Logistic',
    icon: LuTruck,
    href: '/admin/logistic',
  },
 
 
  {
    label: 'Transportation',
    icon: LuTruck,
    children: [
      
      
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
        label: 'Goods Received',
        icon: LuPackageCheck,
        href: '/admin/transport/delivery',
      },
      {
        label: 'Goods Receipt Challan',
        icon: LuFileCheck,
        href: '/admin/transaction/purchase/grc',
      },
      // {
      //   label: 'Purchase Invoice',
      //   icon: LuFileText,
      //   href: '/admin/transaction/purchase/invoice',
      // },
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
      // {
      //   label: 'Delivery Challan',
      //   icon: LuFileCheck,
      //   href: '/admin/transaction/sell/deliverychallan',
      // },
      // {
      //   label: 'Sales Invoice',
      //   icon: LuFileText,
      //   href: '/admin/transaction/sell/salesinvoice',
      // },
      // {
      //   label: 'Sales Return',
      //   icon: LuUndo2,
      //   href: '/admin/transaction/sell/salereturn',
      // },
      // {
      //   label: 'Credit Note',
      //   icon: LuFilePlus,
      //   href: '/admin/transaction/sell/creditnote',
      // },
      {
        label: 'POS',
        icon: LuMonitor,
        href: '/admin/transaction/sell/pos',
      },
      // {
      //   label: 'POS Return',
      //   icon: LuUndo2,
      //   href: '/admin/transaction/sell/pos-return',
      // },
      // {
      //   label: 'B2B Invoice',
      //   icon: LuFileText,
      //   href: '/admin/transaction/sell/b2binvoice',
      // },
    ],
  },
 
  {
    label: 'Stock Transfers',
    icon: LuShuffle,
    children: [
      { label: 'Transfer Stock Packet', icon: LuPackage,
        href: '/admin/transaction/stocktransfers/transferstockpacket' },
      { label: 'Transfer Stock Location', icon: LuMapPinned,
        href: '/admin/transaction/stocktransfers/transferstocklocation' },
      { label: 'Transfer Stock Received', icon: LuPackageCheck,
        href: '/admin/transaction/stocktransfers/transferstockreceiveds' },
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
    label: 'Reports',
    icon: LuChartNoAxesColumn,
    children: [
      { label: 'Barcode Report', icon: LuBarcode,
        href: '/admin/reports/barcode-report' },
      { label: 'Receipt Voucher Report', icon: LuBadgeIndianRupee,
        href: '/admin/reports/receipt-voucher-report' },
      { label: 'Payment Voucher Report', icon: LuWalletCards,
        href: '/admin/reports/payment-voucher-report' },
      { label: 'Sales Analysis', icon: LuChartNoAxesColumn,
        href: '/admin/reports/sales-analysis' },
      { label: 'Sales Report', icon: LuFileText,
        href: '/admin/reports/sales-report' },
      { label: 'Sales Person', icon: LuUserRound,
        href: '/admin/reports/sales-person' },
      { label: 'POS Summary', icon: LuMonitor,
        href: '/admin/reports/pos-summary' },
      { label: 'POS Report', icon: LuStore,
        href: '/admin/reports/pos-report' },
      { label: 'POS Credit Note', icon: LuFileMinus,
        href: '/admin/reports/pos-credit-note' },
      { label: 'Item Stock', icon: LuWarehouse,
        href: '/admin/reports/item-stock' },
      { label: 'Supplier Bill Report', icon: LuReceipt,
        href: '/admin/reports/supplier-bill' },
      { label: 'Supplier Outstanding Report', icon: LuCreditCard,
        href: '/admin/reports/supplier-outstanding' },
      { label: 'Customer Outstanding Report', icon: LuContactRound,
        href: '/admin/reports/customer-outstanding' },
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
  //   label: 'Accounts',
  //   icon: LuWalletCards,
  //   children: [],
  // },
 
  {
    label: 'Cash Register',
    icon: LuCircleDollarSign,
    children: [
      { label: 'Cash Registers', icon: LuCircleDollarSign, href: '/admin/cashregister' },
      { label: 'Open Register', icon: LuFileCheck, href: '/admin/cashregister/open' },
    ],
  },

  {
    label: 'Voucher',
    icon: LuFileCheck,
    children: [
      { label: 'Receipt Vouchers', icon: LuBadgeIndianRupee, href: '/admin/voucher/receipt-vouchers' },
      { label: 'Contra Vouchers', icon: LuShuffle, href: '/admin/voucher/contra-vouchers' },
      { label: 'Payment Vouchers', icon: LuWalletCards, href: '/admin/voucher/payment-vouchers' },
    ],
  },

  {
    label: 'Ledger Transaction',
    icon: LuBookMarked,
    href: '/admin/ledger-transaction',
  },

  {
    label: 'E-commerce',
    icon: LuShoppingCart,
    children: [
      { label: 'Products', icon: LuTag, href: '/admin/ecommerce/product' },
      /* Orders and Coupons are on the deployed sidebar but have no screen
         here yet. Left out rather than shipped as dead links - the same call
         Staff Management's three entries got. */
    ],
  },

  {
    label: 'Logout',
    icon: LuLogOut,
    href: '/logout',
  },
 
];
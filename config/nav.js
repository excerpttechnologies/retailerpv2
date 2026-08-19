/* The only file left in config/.
   Sidebar labels and hrefs, nothing else - the same role Kisan Partner's
   config/menu.config.ts plays. Pages are no longer generated from here;
   every entry points at a real folder with its own page.jsx. */

export const NAV = [
  { label: 'Dashboard', icon: 'gauge', href: '/admin' },

  {
    label: 'Masters', icon: 'gear', children: [
      { label: 'Business Masters', href: '/admin/setting/business' },
      { label: 'Company Locations', href: '/admin/setting/companylocations' },
      { label: 'Ledger Group', href: '/admin/setting/ledgergroups' },
      { label: 'Ledger', href: '/admin/setting/ledger' },
      { label: 'Ledger Mapping', href: '/admin/setting/ledgergroupmapping' },
      { label: 'Voucher Settings', href: '/admin/setting/voucher-setting' },
      { label: 'Doc Setup', href: '/admin/setting/docsetup' },
      { label: 'Purchase Group Master', href: '/admin/setting/purchasegroup' },
      { label: 'Stock Point Master', href: '/admin/setting/stockpoint' },
      { label: 'Pos Counter Master', href: '/admin/setting/poscounter' },
      { label: 'Barcode Settings', href: '/admin/setting/barcodesetting' },
      { label: 'Split Barcode Settings', href: '/admin/setting/split-barcode-setting' },
      { label: 'Barcode Label Settings', href: '/admin/setting/barcode-label-setting' },
      { label: 'Payment Method Master', href: '/admin/setting/paymentmethod' },
      { label: 'Tax Master', href: '/admin/setting/tax' },
      { label: 'HSN Master', href: '/admin/setting/hsn' },
      { label: 'City Group Master', href: '/admin/setting/citygroup' },
      { label: 'Purchase Charge Master', href: '/admin/setting/purchase/master/charge' },
      { label: 'Purchase Term Master', href: '/admin/setting/purchase/master/term' },
      { label: 'Sales Term Master', href: '/admin/setting/sales/master/term' },
      { label: 'Loyalty Point', href: '/admin/setting/loyaltypoint' },
      { label: 'Login Security', href: '/admin/setting/login-security' },
      { label: 'Pos Settings', href: '/admin/setting/pos_setting' },
      { label: 'Ecom Settings', href: '/admin/setting/ecom_setting' },
      { label: 'Invoice Layout Setting', href: '/admin/setting/invoice-layout-setting' },
      { label: 'General Setting (Location)', href: '/admin/setting/location-setting' },
      { label: 'Business Contact', href: '/admin/setting/business-contact' },
    ],
  },

  {
    label: 'Inventory', icon: 'grid', children: [
      { label: 'Filter', href: '/admin/inventory/product/filter' },
      { label: 'Group', href: '/admin/inventory/product/group' },
      { label: 'Unit of Measurement', href: '/admin/inventory/uom' },
      { label: 'Attribute Addons', href: '/admin/inventory/attribute-addon' },
      { label: 'Item', href: '/admin/inventory/item' },
      { label: 'Print Label', href: '/admin/inventory/barcode-print' },
      { label: 'Barcode Item', href: '/admin/inventory/barcodeitem' },
      { label: 'Stock Adjustment', href: '/admin/inventory/stock-adjustment' },
    ],
  },

  {
    label: 'Contacts', icon: 'users', children: [
      { label: 'Contact Types', href: '/admin/contact/contact-type' },
      { label: 'Suppliers', href: '/admin/contact/supplier' },
      { label: 'Agents', href: '/admin/contact/agent' },
      { label: 'Customers', href: '/admin/contact/customer' },
    ],
  },

  // { label: 'Logistic', icon: 'truck', href: '/admin/logistic' },

  {
    label: 'Purchase', icon: 'bag', children: [
      { label: 'Goods Receipt Challan', href: '/admin/transaction/purchase/grc' },
      { label: 'Purchase Invoice', href: '/admin/transaction/purchase/invoice' },
      { label: 'Goods Return Note', href: '/admin/transaction/purchase/grt' },
      { label: 'Debit Note', href: '/admin/transaction/purchase/debitnote' },
    ],
  },

  // {
  //   label: 'Sell', icon: 'box', children: [
  //     { label: 'Delivery Challan', href: '/admin/transaction/sell/deliverychallan' },
  //     { label: 'Sales Invoice', href: '/admin/transaction/sell/salesinvoice' },
  //     { label: 'Sales Return', href: '/admin/transaction/sell/salereturn' },
  //     { label: 'Credit Note', href: '/admin/transaction/sell/creditnote' },
  //     { label: 'POS', href: '/admin/transaction/sell/pos' },
  //     { label: 'POS Return', href: '/admin/transaction/sell/pos-return' },
  //     { label: 'B2B Invoice', href: '/admin/transaction/sell/b2binvoice' },
  //   ],
  // },

  /* Staff Management pages are NOT built - these three links 404 today.
     Kept commented rather than shipping dead links in the sidebar. */
  // {
  //   label: 'Staff Management', icon: 'staff', children: [
  //     { label: 'Roles & Permissions', href: '/admin/staff-management/roles-permissions' },
  //     { label: 'Staffs', href: '/admin/staff-management/staff' },
  //     { label: 'Sales Persons', href: '/admin/staff-management/staff/salesperson' },
  //   ],
  // },

  // { label: 'Stock Transfers', icon: 'shuffle', children: [] },
  // { label: 'Inter Company Sell', icon: 'home', children: [] },
  // { label: 'Reports', icon: 'chart', children: [] },
  // { label: 'Communication', icon: 'mail', children: [] },
  // { label: 'Tools', icon: 'tools', children: [] },
  // { label: 'Cash Register', icon: 'register', children: [] },
  // { label: 'Voucher', icon: 'voucher', children: [] },
  // { label: 'Ledger Transaction', icon: 'ledger', children: [] },
  // { label: 'E-commerce', icon: 'cart', children: [] },
  // { label: 'Accounts', icon: 'accounts', children: [] },
   { label: 'Logout', icon: 'logout', href: '/logout' },
];

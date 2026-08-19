'use client';
import ListView from '@/components/ListView';

/* Suppliers - list. Columns declared here, not fetched from a registry. */

const CONFIG = {
  title: "Suppliers",
  basePath: '/admin/contact/',
  slugPath: "supplier",
  endpoint: '/api/supplier',
  scope: ["business"],
  formMode: "tabs",
  actionPosition: "left",
  actionVariant: "dropdown",
  columns: [
    { k: "businessName", t: "Business Name" },
    { k: "contactId", t: "Contact ID" },
    { k: "firstName", t: "Name" },
    { k: "billingMobile", t: "Mobile" },
    { k: "billingEmail", t: "Email" },
    { k: "billingAddressLine1", t: "Address" },
  ],
};

export default function SupplierListPage() {
  return <ListView cfg={CONFIG} />;
}

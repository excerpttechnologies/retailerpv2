'use client';
import TabbedFormView from '@/components/TabbedFormView';
import { TABS } from '../tabs';

/* Add Suppliers - four tabs, one Submit per tab. */

export default function AddSupplierPage() {

  return (
    <TabbedFormView
      cfg={{
        title: "Suppliers",
        addTitle: "Add Suppliers",
        basePath: '/admin/contact/',
        slugPath: "supplier",
        endpoint: '/api/supplier',
        scope: ["business"],
        contactKind: "Supplier",
        tabs: TABS,
      }}
    />
  );
}

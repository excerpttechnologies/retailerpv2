'use client';
import { use } from 'react';
import TabbedFormView from '@/components/TabbedFormView';
import { TABS } from '../tabs';

/* Edit Suppliers - four tabs, one Submit per tab. */

export default function EditSupplierPage({ params }) {
  const { id } = use(params);

  return (
    <TabbedFormView
      id={id}
      cfg={{
        title: "Suppliers",
        addTitle: "Edit Suppliers",
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

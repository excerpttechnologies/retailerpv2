'use client';
import TabbedFormView from '@/components/TabbedFormView';
import { TABS } from '../tabs';

/* Add Customers - four tabs, one Submit per tab. */

export default function AddCustomerPage() {

  return (
    <TabbedFormView
      cfg={{
        title: "Customers",
        addTitle: "Add Customers",
        basePath: '/admin/contact/',
        slugPath: "customer",
        endpoint: '/api/customer',
        scope: ["business"],
        contactKind: "Customer",
        tabs: TABS,
      }}
    />
  );
}

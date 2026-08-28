'use client';
import TabbedFormView from '@/components/TabbedFormView';
import { AGENT_QUICK_FIELDS, TABS } from '../tabs';

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
        quickAdds: {
          agentId: {
            label: 'Add Agent', title: 'Add Agent', slug: 'agent', ref: 'agent',
            endpoint: '/api/agent', fields: AGENT_QUICK_FIELDS,
            prepareData: (data) => ({ ...data, openingBalance: 0 }),
          },
        },
      }}
    />
  );
}

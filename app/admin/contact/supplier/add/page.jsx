'use client';
import TabbedFormView from '@/components/TabbedFormView';
import SupplierImportPanel from '@/components/SupplierImportPanel';
import { AGENT_QUICK_FIELDS, FIELD_LABELS, TABS } from '../tabs';

/* Add Suppliers - a five step wizard: Basic, Billing, Shipping, Purchase,
   Financial. The supplier is created by the Submit on the last step and
   nowhere else, so abandoning the form half way leaves no partial record -
   which is what the old per-tab save did. */

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
        wizard: true,
        renderStepExtras: ({ tab, data, applyPatch }) => (
          tab.key === 'basic'
            ? <SupplierImportPanel data={data} labels={FIELD_LABELS} onApply={applyPatch} />
            : null
        ),
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

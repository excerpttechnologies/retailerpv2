'use client';
import { use } from 'react';
import TabbedFormView from '@/components/TabbedFormView';
import SupplierImportPanel from '@/components/SupplierImportPanel';
import { FIELD_LABELS, TABS } from '../tabs';

/* Edit Suppliers - a five step wizard: Basic, Billing, Shipping, Purchase,
   Financial. Next only validates and moves on; the record is written once,
   by the Submit on the last step. The id below is what makes that a PUT
   rather than a POST, so editing never creates a second supplier. */

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
        wizard: true,
        /* GST / Excel import belongs with the identity fields it fills, so it
           is rendered on step 1 only. applyPatch writes into the wizard's
           shared state - nothing reaches the API until Submit. */
        renderStepExtras: ({ tab, data, applyPatch }) => (
          tab.key === 'basic'
            ? <SupplierImportPanel data={data} labels={FIELD_LABELS} onApply={applyPatch} />
            : null
        ),
      }}
    />
  );
}

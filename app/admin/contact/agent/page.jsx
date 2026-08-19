'use client';
import ListView from '@/components/ListView';

/* Agents - list. Columns declared here, not fetched from a registry. */

const CONFIG = {
  title: "Agents",
  basePath: '/admin/contact/',
  slugPath: "agent",
  endpoint: '/api/agent',
  scope: ["business"],
  formMode: "tabs",
  columns: [
    { k: "businessName", t: "Name" },
    { k: "contactId", t: "Contact ID" },
    { k: "billingMobile", t: "Mobile" },
    { k: "billingEmail", t: "Email" },
    { k: "billingAddressLine1", t: "Address" },
  ],
};

export default function AgentListPage() {
  return <ListView cfg={CONFIG} />;
}

'use client';
import FormView from '@/components/FormView';
import { FIELDS } from './fields';

/* Barcode Settings - one record per scope. This file IS the page. */

const CONFIG = {
  title: "Barcode Settings",
  basePath: '/admin/setting/',
  slugPath: "barcodesetting",
  endpoint: '/api/barcode-setting',
  scope: ["business","finYear"],
  columns: [
    { k: "type", t: "Type" },
    { k: "subType", t: "Sub Type" },
    { k: "prefix", t: "Prefix" },
    { k: "suffix", t: "Suffix" },
    { k: "startNumber", t: "Start Number" },
    { k: "sampleBarcode", t: "Sample Barcode" },
    { k: "effectiveDate", t: "Effective Date", f: "date" },
    { k: "expiryDate", t: "Expiry Date", f: "date" },
    { k: "finYear", t: "Financial Year" },
  ],
  fields: FIELDS,
};

export default function BarcodesettingPage() {
  return <FormView cfg={CONFIG} />;
}

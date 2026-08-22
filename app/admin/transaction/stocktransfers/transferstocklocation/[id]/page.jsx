'use client';

import { use } from 'react';
import TransactionFormView from '@/components/TransactionFormView';
import { FORM } from '../form';

export default function ViewTransferStockLocationPage({ params }) {
  const { id } = use(params);
  return <TransactionFormView id={id} cfg={{
    title: 'Transfer Stock Locations',
    addTitle: 'Edit Transfer Stock Location',
    basePath: '/admin/transaction/stocktransfers/',
    slugPath: 'transferstocklocation',
    endpoint: '/api/stock-transfer-location',
    scope: ['business', 'location', 'finYear'],
    docType: 'Stock Transfer Location',
    form: FORM,
  }} />;
  /* return (
    <div className="rounded-xl border border-[#dfe6ee] bg-[#f6f8fb] p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#1d2433]">Transfer Stock Location</h2>
        <Link href="/admin/transaction/stocktransfers/transferstocklocation" className="rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#374151]">
          Back to list
        </Link>
      </div>

      <div className="rounded-xl border border-[#dfe6ee] bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151]">Packet No</label>
            <input value="WH/26/00037" className="w-full rounded-md border border-[#d1d5db] bg-[#f3f4f6] px-3 py-2" readOnly />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151]">Transfer Date</label>
            <input value="20-08-2026" className="w-full rounded-md border border-[#d1d5db] bg-[#f3f4f6] px-3 py-2" readOnly />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151]">Transfer From</label>
            <input value="Temple Fabrics Warehouse" className="w-full rounded-md border border-[#d1d5db] bg-[#f3f4f6] px-3 py-2" readOnly />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151]">Transfer To</label>
            <input value="TEMPLE FABRIC JNR" className="w-full rounded-md border border-[#d1d5db] bg-[#f3f4f6] px-3 py-2" readOnly />
          </div>
        </div>
      </div>
    </div>
  ); */
}

'use client';
import TransactionFormView from '@/components/TransactionFormView';
import { FORM } from '../form';

export default function AddTransferStockPacketPage() {
  return <TransactionFormView cfg={{
    title: 'Transfer Stock Packets',
    addTitle: 'Transfer Stock Packet',
    basePath: '/admin/transaction/stocktransfers/',
    slugPath: 'transferstockpacket',
    endpoint: '/api/stock-transfer-packet',
    scope: ['business', 'location', 'finYear'],
    docType: 'Stock Transfer Packet',
    form: FORM,
  }} />;
}
/*
    <div className="rounded-xl border border-[#dfe6ee] bg-[#f6f8fb] p-4 shadow-sm">
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[#d9e8ff] bg-white p-4 shadow-sm lg:col-span-1">
          <h3 className="mb-4 text-xl font-bold text-[#1d2433]">Transfer From</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Location Name</label>
              <input value="Temple Fabrics Warehouse" className="w-full rounded-md border border-[#d1d5db] bg-[#f3f4f6] px-3 py-2" readOnly />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Location GSTN</label>
              <input value="29AANFT6295P1ZW" className="w-full rounded-md border border-[#d1d5db] bg-[#f3f4f6] px-3 py-2" readOnly />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Location Address</label>
              <textarea value="kms arcade, 2nd floor, 4th block." className="min-h-[80px] w-full rounded-md border border-[#d1d5db] bg-[#f3f4f6] px-3 py-2" readOnly />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#d9e8ff] bg-white p-4 shadow-sm lg:col-span-1">
          <h3 className="mb-4 text-xl font-bold text-[#1d2433]">Transfer To</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Location Name *</label>
              <select className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-[#374151]">
                <option>--Select--</option>
                <option>Temple Fabrics Warehouse</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Location GSTN</label>
              <input className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2" placeholder="Location GSTN" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Location Address</label>
              <textarea className="min-h-[80px] w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2" placeholder="Location Address" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Stock Point</label>
              <select className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-[#374151]">
                <option>--Select--</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#d9e8ff] bg-white p-4 shadow-sm lg:col-span-1">
          <h3 className="mb-4 text-xl font-bold text-[#1d2433]">Packet No</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">STP Date *</label>
              <input type="date" className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2" defaultValue="2026-08-21" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Stock Transfer Waybill</label>
              <input className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2" placeholder="No file chosen" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Packet No</label>
              <input className="w-full rounded-md border border-[#d1d5db] bg-[#f3f4f6] px-3 py-2" value="" readOnly />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-[#bfe5f5] bg-[#dff5ff] px-4 py-3 text-[#0f172a]">
        <div className="mb-1 font-bold text-[#0f172a]">Info</div>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>1. Stock Transfer Packets: Lists stock transfer packets for the selected from location that have not yet been converted into stock transfer location.</li>
          <li>2. Multiple Stock Transfer Packet Selection: You can select multiple stock transfer packets for creating a consolidated stock transfer location.</li>
        </ol>
      </div>

      <div className="rounded-xl border border-[#dfe6ee] bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-md bg-[#f9d8d8] px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[#b42318]">Shortcut: Press Enter</span>
          <span className="rounded-md bg-[#f9d8d8] px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[#b42318]">F9</span>
          <span className="rounded-md bg-[#f9d8d8] px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[#b42318]">Tab</span>
        </div>

        <div className="mb-4 flex">
          <input className="flex-1 rounded-l-md border border-[#d1d5db] bg-white px-3 py-2" placeholder="Enter item code" />
          <button className="rounded-r-md bg-[#1a1c32] px-4 py-2 text-white">Search</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#eef2f7] text-[#3d485a]">
                <th className="border border-[#e5e7eb] px-3 py-2">Sl No</th>
                <th className="border border-[#e5e7eb] px-3 py-2">Item Code</th>
                <th className="border border-[#e5e7eb] px-3 py-2">Item Name</th>
                <th className="border border-[#e5e7eb] px-3 py-2">HSN</th>
                <th className="border border-[#e5e7eb] px-3 py-2">GST</th>
                <th className="border border-[#e5e7eb] px-3 py-2">Qty</th>
                <th className="border border-[#e5e7eb] px-3 py-2">Net Rate</th>
                <th className="border border-[#e5e7eb] px-3 py-2">Net Amount</th>
                <th className="border border-[#e5e7eb] px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={9} className="border border-[#e5e7eb] bg-[#f8fafc] px-3 py-8 text-center text-[#6b7280]">No item added</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Link href="/admin/transaction/stocktransfers/transferstockpacket" className="rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-sm text-[#374151]">Cancel</Link>
          <button className="rounded-md bg-[#2f6ae8] px-4 py-2 text-sm font-medium text-white">Save</button>
        </div>
      </div>
    </div>
  );
} */

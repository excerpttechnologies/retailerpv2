'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useScope } from '@/components/ScopeContext';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB');
}

export default function TransferStockReceivedPage() {
  const scope = useScope();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams({
      page: '1',
      perPage: '100',
      business: scope.business || '',
      location: scope.location || '',
      finYear: scope.finYear || '',
    });

    setLoading(true);
    fetch('/api/stock-transfer-received?' + qs)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load received transfers');
        return data;
      })
      .then((data) => { setRows(data.rows || []); setError(''); })
      .catch((loadError) => { setRows([]); setError(loadError.message); })
      .finally(() => setLoading(false));
  }, [scope.business, scope.location, scope.finYear]);

  return (
    <div className="rounded-xl border border-[#dfe6ee] bg-[#f6f8fb] p-4 shadow-sm">
      <div className="rounded-xl border border-[#dfe6ee] bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[22px] font-bold text-[#1d2433]">Received Transfers</h2>
          <Link href="/admin/transaction/stocktransfers/transferstockpacket" className="text-sm text-[#2f6ae8]">View packets</Link>
        </div>
        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead><tr className="bg-[#eef2f7] text-[#3d485a]">
              <th className="border border-[#e5e7eb] px-3 py-2.5">Received No</th>
              <th className="border border-[#e5e7eb] px-3 py-2.5">Received Date</th>
              <th className="border border-[#e5e7eb] px-3 py-2.5">Sent Qty</th>
              <th className="border border-[#e5e7eb] px-3 py-2.5">Received Qty</th>
              <th className="border border-[#e5e7eb] px-3 py-2.5">Pending Qty</th>
              <th className="border border-[#e5e7eb] px-3 py-2.5">Status</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-3 py-8 text-center">Loading...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-[#6b7280]">No received transfers found</td></tr>}
              {!loading && rows.map((row) => (
                <tr key={row._id} className="bg-white hover:bg-[#f9fbff]">
                  <td className="border border-[#e5e7eb] px-3 py-2.5">{row.receivedNo || row._id}</td>
                  <td className="border border-[#e5e7eb] px-3 py-2.5">{formatDate(row.receivedDate)}</td>
                  <td className="border border-[#e5e7eb] px-3 py-2.5">{row.sentQty || 0}</td>
                  <td className="border border-[#e5e7eb] px-3 py-2.5">{row.receivedQty || 0}</td>
                  <td className="border border-[#e5e7eb] px-3 py-2.5">{row.pendingQty || 0}</td>
                  <td className="border border-[#e5e7eb] px-3 py-2.5">{row.status || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

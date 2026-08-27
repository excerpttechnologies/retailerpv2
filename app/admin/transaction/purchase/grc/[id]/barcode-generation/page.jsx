'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GCRBarcodeGeneration from '@/components/GCRBarcodeGeneration';

export default function GrcBarcodeGenerationPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/grc/${id}`)
      .then((response) => response.json())
      .then((result) => {
        if (result.error) throw new Error(result.error);
        setData(result);
      })
      .catch((loadError) => setError(loadError.message || 'Failed to load GRC'));
  }, [id]);

  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!data) return <div className="p-6 text-sm text-slate-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button type="button" className="btn" onClick={() => router.push(`/admin/transaction/purchase/grc/${id}`)}>
          Back to GRC
        </button>
        <div className="text-sm font-semibold">Barcode Generation - {data.grc.grcNumber}</div>
      </div>
      <GCRBarcodeGeneration grcId={id} initialRows={data.rows} editMode />
    </div>
  );
}

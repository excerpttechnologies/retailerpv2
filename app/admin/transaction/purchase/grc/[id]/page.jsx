// 'use client';
// import { use } from 'react';
// import TransactionFormView from '@/components/TransactionFormView';
// import { FORM } from '../form';

// /* Edit Goods Receiptc Challans */

// export default function EditTransactionPurchaseGrcPage({ params }) {
//   const { id } = use(params);

//   return (
//     <TransactionFormView
//       id={id}
//       cfg={{
//         title: "Goods Receiptc Challans",
//         addTitle: "Edit Goods Receiptc Challans",
//         basePath: '/admin/',
//         slugPath: "transaction/purchase/grc",
//         endpoint: '/api/purchase-grc',
//         scope: ["business","location","finYear"],
//         docType: "Goods Receipt Challan",
//         form: FORM,
//       }}
//     />
//   );
// }




//sagara

'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Field from '@/components/Field';
import { FORM } from '../form';
import { useScope } from '@/components/ScopeContext';

const fields = FORM.cards.flatMap((card) => card.fields || []);
const number = (value) => Number(value) || 0;

export default function EditTransactionPurchaseGrcPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const scope = useScope();
  const [data, setData] = useState({});
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState(searchParams.get('tab') === 'summary' ? 'summary' : 'items');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/grc/${id}`)
      .then((response) => response.json())
      .then((result) => {
        if (result.error) throw new Error(result.error);
        const next = {};
        fields.forEach((field) => {
          const value = result.grc[field.k];
          next[field.k] = value == null ? '' : field.type === 'ref' ? String(value) : value;
        });
        setData(next);
        setRows(result.rows || []);
      })
      .catch((error) => setStatus(error.message || 'Failed to load GRC'));
  }, [id]);

  const summary = useMemo(() => rows.reduce((result, row) => {
    const qty = number(row.qty);
    const value = number(row.finalNet || row.purRate) * qty;
    result.quantity += qty;
    result.taxable += value;
    result.gst += number(row.gst);
    result.net += value + number(row.gst);
    result.items[row.itemCode || ''] = result.items[row.itemCode || ''] || { qty: 0, value: 0 };
    result.items[row.itemCode || ''].qty += qty;
    result.items[row.itemCode || ''].value += value;
    return result;
  }, { quantity: 0, taxable: 0, gst: 0, net: 0, items: {} }), [rows]);

  async function submit() {
    setSaving(true);
    setStatus('');
    try {
      const response = await fetch(`/api/grc/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, business: scope.business, location: scope.location, finYear: scope.finYear }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Update failed');
      setStatus('GRC updated');
    } catch (error) {
      setStatus(error.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  const openBarcode = () => router.push(`/admin/transaction/purchase/grc/${id}/barcode-generation`);
  const set = (key, value) => setData((current) => ({ ...current, [key]: value }));
  const cell = (value) => value || '-';

  if (!data.grcNumber && !status) return <div className="p-6 text-sm text-slate-500">Loading...</div>;

  return (
    <div className="mx-auto max-w-full p-4 text-slate-800">
      <div className="card">
        <div className="card-head flex items-center justify-between gap-3">
          <span className="card-title">Edit Goods Receipt Challan</span>
          <button type="button" onClick={openBarcode} className="btn btn-primary">Barcode Generation</button>
        </div>
        <div className="card-body">
          {status && <div className="mb-3 text-sm text-slate-600">{status}</div>}
          <div className="form-grid-4">
            {fields.map((field) => <Field key={field.k} f={field} value={data[field.k]} onChange={set} />)}
          </div>
          <button type="button" className="btn btn-primary mx-auto mt-4 flex w-full max-w-[390px] justify-center" onClick={submit} disabled={saving}>
            {saving ? 'Saving...' : 'Update'}
          </button>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-head flex gap-2">
          {['items', 'summary'].map((key) => (
            <button key={key} type="button" onClick={() => setTab(key)} className={`btn ${tab === key ? 'btn-primary' : ''}`}>
              {key === 'items' ? 'Item With Barcode' : 'Item Summary'}
            </button>
          ))}
        </div>
        <div className="card-body overflow-x-auto">
          {tab === 'items' ? (
            <table className="dt min-w-[1500px]"><thead><tr>{['Item Code', 'Batch/Unique', 'Bill Sl No', 'Supplier Description', 'Qty', 'UOM', 'HSN', 'Pur Rate', 'Final Net', 'GST %', 'Retail Price', 'Offer Price', 'Barcode Generated', ''].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>
              {rows.length === 0 && <tr><td colSpan={14} className="dt-empty">No barcode items yet.</td></tr>}
              {rows.map((row) => <tr key={row._id}><td>{cell(row.itemCode)}</td><td>{cell(row.batchUnique)}</td><td>{cell(row.billSlNo)}</td><td>{cell(row.supplierDescription)}</td><td>{cell(row.qty)}</td><td>{cell(row.uom)}</td><td>{cell(row.hsn)}</td><td>{cell(row.purRate)}</td><td>{cell(row.finalNet)}</td><td>{cell(row.gst)}</td><td>{cell(row.retailPrice)}</td><td>{cell(row.offerPrice)}</td><td>{cell(row.barcodeGenerated)}</td><td><button type="button" className="text-brand-link underline" onClick={openBarcode}>Edit</button></td></tr>)}
            </tbody></table>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                {[['Total Quantity', summary.quantity], ['Total Taxable Value', summary.taxable], ['Total GST Amount', summary.gst], ['Total Net Amount', summary.net]].map(([label, value]) => <div key={label} className="border border-line p-3"><div className="text-xs text-cell">{label}</div><div className="mt-1 text-lg font-semibold">{value.toFixed(2)}</div></div>)}
              </div>
              <table className="dt mt-4"><thead><tr><th>Item Code</th><th>Total Qty</th><th>Total Value</th></tr></thead><tbody>{Object.entries(summary.items).map(([itemCode, item]) => <tr key={itemCode}><td>{cell(itemCode)}</td><td>{item.qty}</td><td>{item.value.toFixed(2)}</td></tr>)}</tbody></table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
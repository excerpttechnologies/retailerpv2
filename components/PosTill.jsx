'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/components/Icon';
import MultiSelect from '@/components/MultiSelect';

const PAYMENT_MODES = ['Cash', 'Credit', 'Export', 'COD'];
const CUSTOMER_DEFAULTS = {
  typeId: '', businessType: 'Un-Registered', gstNo: '', businessName: '', prefix: 'Mr.',
  firstName: '', middleName: '', lastName: '', billingAddressLine1: '', billingZipCode: '',
  billingCity: '', billingMobile: '', billingWebsiteUrl: '', billingEmail: '',
};
const money = (value) => Number(value || 0).toFixed(2);

function CustomerForm({ values, setValues, typeOptions, onClose, onSave, saving }) {
  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const fields = [
    ['businessName', 'Business Name'], ['firstName', 'First Name *'], ['middleName', 'Middle Name'],
    ['lastName', 'Last Name'], ['billingAddressLine1', 'Address'], ['billingZipCode', 'Zip Code'],
    ['billingCity', 'City'], ['billingMobile', 'Phone Number *'], ['billingWebsiteUrl', 'Website URL'],
    ['billingEmail', 'Email'],
  ];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <form className="w-full max-w-4xl rounded bg-white p-5 shadow-xl" onSubmit={onSave}>
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <h2 className="text-lg font-semibold">Add Customer</h2>
          <button type="button" aria-label="Close" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="field-label">Customer Type *<select className="f-input" value={values.typeId} onChange={(e) => set('typeId', e.target.value)} required>
            <option value="">Select type</option>{typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select></label>
          <label className="field-label">Business Type *<select className="f-input" value={values.businessType} onChange={(e) => set('businessType', e.target.value)} required>
            <option>Registered</option><option>Un-Registered</option>
          </select></label>
          <label className="field-label">GSTIN<input className="f-input" value={values.gstNo} onChange={(e) => set('gstNo', e.target.value)} /></label>
          <label className="field-label">Prefix<select className="f-input" value={values.prefix} onChange={(e) => set('prefix', e.target.value)}><option>Mr.</option><option>Mrs.</option><option>Ms.</option><option>Dr.</option></select></label>
          {fields.map(([key, label]) => <label className="field-label" key={key}>{label}<input className="f-input" value={values[key]} onChange={(e) => set(key, e.target.value)} required={key === 'firstName' || key === 'billingMobile'} /></label>)}
        </div>
        <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={saving}><Icon name="save" size={14} /> {saving ? 'Saving...' : 'Add Customer'}</button></div>
      </form>
    </div>
  );
}

export default function PosTill() {
  const router = useRouter();
  const sp = useSearchParams();
  const business = sp.get('business') || '';
  const initialLocation = sp.get('location') || '';
  const [now, setNow] = useState(null);
  const [saleDate, setSaleDate] = useState('');
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState(initialLocation);
  const [counters, setCounters] = useState([]);
  const [counter, setCounter] = useState('');
  const [salesPeople, setSalesPeople] = useState([]);
  const [salesPerson, setSalesPerson] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [customerOptions, setCustomerOptions] = useState([{ value: 'walkin', label: 'Walk-in Customer' }]);
  const [customer, setCustomer] = useState('walkin');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTypes, setCustomerTypes] = useState([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerForm, setCustomerForm] = useState(CUSTOMER_DEFAULTS);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [items, setItems] = useState([]);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [cashier, setCashier] = useState('');
  const [exempted, setExempted] = useState(false);
  const [isReturn, setIsReturn] = useState(false);

  useEffect(() => {
    const current = new Date();
    setNow(current);
    setSaleDate(current.toISOString().slice(0, 10));
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const json = (url) => fetch(url).then((r) => r.json());
    json('/api/auth/me').then((d) => setCashier(d.user ? `${d.user.name} (Cashier)` : '')).catch(() => {});
    json(`/api/company-location?perPage=500&business=${business}`).then((d) => {
      const rows = d.rows || [];
      setLocations(rows.map((r) => ({ value: String(r._id), label: r.name || r.businessPrintName || 'Unnamed location' })));
      if (!location && rows[0]) setLocation(String(rows[0]._id));
    }).catch(() => {});
    json(`/api/options?ref=contact-type-customer&business=${business}`).then((d) => setCustomerTypes(d.options || [])).catch(() => {});
    json(`/api/agent?perPage=200&business=${business}`).then((d) => setSalesPeople((d.rows || []).map((r) => ({ value: String(r._id), label: r.businessName || `${r.firstName || ''} ${r.lastName || ''}`.trim() })))).catch(() => {});
  }, [business]);

  useEffect(() => {
    fetch(`/api/pos-counter?perPage=200&business=${business}&location=${location}`).then((r) => r.json()).then((d) => setCounters((d.rows || []).map((r) => ({ value: String(r._id), label: r.counterName })))).catch(() => {});
  }, [business, location]);

  useEffect(() => {
    if (!customerSearch.trim()) { setCustomerOptions([{ value: 'walkin', label: 'Walk-in Customer' }]); return undefined; }
    const timer = setTimeout(() => fetch(`/api/customer?perPage=30&business=${business}&search=${encodeURIComponent(customerSearch)}`).then((r) => r.json()).then((d) => setCustomerOptions((d.rows || []).map((r) => ({ value: String(r._id), label: [r.businessName, r.firstName, r.lastName, r.billingMobile].filter(Boolean).join(' - '), customer: r })))).catch(() => {}), 250);
    return () => clearTimeout(timer);
  }, [business, customerSearch]);

  function updateItem(index, key, value) {
    setItems((rows) => rows.map((row, i) => i === index ? { ...row, [key]: value } : row));
  }

  async function scan() {
    const query = code.trim();
    if (!query) return;
    try {
      const response = await fetch(`/api/item?perPage=10&business=${business}&search=${encodeURIComponent(query)}`);
      const data = await response.json();
      const hit = (data.rows || [])[0];
      if (!hit) { setMsg(`No item found for "${query}"`); return; }
      const detail = await fetch(`/api/item/${hit._id}/detail`).then((r) => r.json()).catch(() => ({}));
      const item = detail.item || {};
      setItems((rows) => [...rows, {
        itemId: hit._id, code: item.itemCode || hit.itemCode || hit.name, name: item.name || hit.name,
        hsn: item.hsnCode || '', gst: Number(item.slabs?.[0]?.igst || 0), qty: 1,
        rsp: Number(item.rsp ?? hit.rsp ?? 0), discountPct: 0, image: hit.image || '',
      }]);
      setCode(''); setMsg('');
    } catch { setMsg('Item lookup failed'); }
  }

  async function saveCustomer(event) {
    event.preventDefault();
    if (!customerForm.typeId) { setMsg('Create a customer type in Customer Type master first.'); return; }
    setSavingCustomer(true);
    try {
      const response = await fetch('/api/customer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business, quick: true, data: customerForm }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).join(', ') : data.error || 'Unable to save customer');
      const option = { value: data.id, label: [customerForm.businessName, customerForm.firstName, customerForm.lastName, customerForm.billingMobile].filter(Boolean).join(' - ') };
      setCustomerOptions((rows) => [option, ...rows.filter((row) => row.value !== 'walkin')]); setCustomer(data.id); setCustomerSearch(option.label); setShowCustomerForm(false); setCustomerForm({ ...CUSTOMER_DEFAULTS, typeId: customerForm.typeId }); setMsg('');
    } catch (error) { setMsg(error.message); } finally { setSavingCustomer(false); }
  }

  const rows = items.map((row) => ({ ...row, discountAmount: Number(row.rsp || 0) * Number(row.qty || 0) * Number(row.discountPct || 0) / 100, lineTotal: Number(row.rsp || 0) * Number(row.qty || 0) * (1 - Number(row.discountPct || 0) / 100) }));
  const qty = rows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  const billValue = rows.reduce((sum, row) => sum + row.lineTotal, 0);
  const tax = exempted ? 0 : rows.reduce((sum, row) => sum + row.lineTotal * Number(row.gst || 0) / 100, 0);
  const timeStr = now ? now.toTimeString().slice(0, 5) : '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-auto bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[13.5px]"><span className="text-inkmuted">Location:</span><select className="f-input w-64" value={location} onChange={(e) => setLocation(e.target.value)}><option value="">Select location</option>{locations.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><span className="flex items-center gap-1.5 text-cell"><Icon name="refresh" size={15} /> {timeStr}</span><span className="flex-1" />{['refresh', 'voucher', 'register', 'cart', 'ledger', 'chevL'].map((ic, i) => <button key={i} aria-label={ic} className={'flex h-8 w-9 items-center justify-center rounded ' + (i === 0 ? 'bg-[#dbe6f7] text-brand' : 'bg-brand text-white')}><Icon name={ic} size={15} /></button>)}</div>
      <div className="grid grid-cols-1 gap-2 px-4 md:grid-cols-5"><input className="f-input" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /><select className="f-input" value={payMode} onChange={(e) => setPayMode(e.target.value)}>{PAYMENT_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select><div className="flex gap-1.5 md:col-span-2"><div className="flex-1"><MultiSelect mode="single" options={customerOptions} value={customer} placeholder="Walk-in Customer / phone number" onSearch={setCustomerSearch} onChange={(value) => { setCustomer(value); const option = customerOptions.find((row) => row.value === value); if (option) setCustomerSearch(option.label); }} /></div><button type="button" title="Add new customer" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white" onClick={() => setShowCustomerForm(true)}><Icon name="plus" size={15} /></button></div><input className="f-input" value={cashier} readOnly /></div>
      <div className="mt-2 grid grid-cols-1 items-start gap-2 px-4 md:grid-cols-5"><MultiSelect mode="single" options={salesPeople} value={salesPerson} placeholder="Sales Person" onChange={setSalesPerson} /><div className="md:col-span-2"><input className="f-input" placeholder="Enter Product Name / SKU / Scan Bar Code" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (['Enter', 'F9', 'Tab'].includes(e.key)) { e.preventDefault(); scan(); } }} /></div><select className="f-input" value={counter} onChange={(e) => setCounter(e.target.value)}><option value="">Select Cash Counter</option>{counters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><div className="flex items-center gap-5"><label><input type="checkbox" checked={exempted} onChange={(e) => setExempted(e.target.checked)} /> Exempted</label><label className="text-danger"><input type="checkbox" checked={isReturn} onChange={(e) => setIsReturn(e.target.checked)} /> Is Return?</label></div></div>
      {msg && <div className="mx-4 mt-2 flash flash-err">{msg}</div>}
      <div className="mt-3 flex-1 overflow-x-auto px-4"><table className="dt"><thead><tr>{['#', 'Item Code', 'Item', 'HSN', 'GST%', 'Qty', 'RSP Price', 'Disc %', 'Disc Amt', 'Line Total', 'Image', ''].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan="12" className="dt-empty">No Items Added</td></tr> : rows.map((row, index) => <tr key={`${row.itemId}-${index}`}><td>{index + 1}</td><td>{row.code}</td><td>{row.name}</td><td>{row.hsn}</td><td>{money(row.gst)}</td><td><input className="f-input w-20" type="number" min="0" value={row.qty} onChange={(e) => updateItem(index, 'qty', e.target.value)} /></td><td><input className="f-input w-24" type="number" min="0" value={row.rsp} onChange={(e) => updateItem(index, 'rsp', e.target.value)} /></td><td><input className="f-input w-20" type="number" min="0" value={row.discountPct} onChange={(e) => updateItem(index, 'discountPct', e.target.value)} /></td><td>{money(row.discountAmount)}</td><td>{money(row.lineTotal)}</td><td>{row.image ? <img src={row.image} alt={row.name} className="h-10 w-10 object-cover" /> : '-'}</td><td><button type="button" className="act-btn bg-danger" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Icon name="x" size={12} /></button></td></tr>)}</tbody></table></div>
      <div className="border-t border-line px-4 pt-2"><div className="grid grid-cols-2 gap-2 text-[13px] md:grid-cols-6"><div><div className="text-cell">Qty</div><div>{qty}</div></div><div><div className="text-cell">Bill Value</div><div>{money(rows.reduce((sum, row) => sum + Number(row.rsp || 0) * Number(row.qty || 0), 0))}</div></div><div><div className="text-cell">Total Discount</div><div>{money(rows.reduce((sum, row) => sum + row.discountAmount, 0))}</div></div><div><div className="text-cell">Sub Total</div><div>{money(billValue)}</div></div><div><div className="text-cell">Tax</div><div>{money(tax)}</div></div><div><div className="text-cell">Net Amount</div><div className="font-bold text-danger">{money(billValue + tax)}</div></div></div></div>
      <div className="mt-2 flex flex-wrap items-center gap-3 bg-[#eef1f7] px-4 py-3"><button type="button" className="btn bg-[#17a2b8] text-white"><Icon name="register" size={14} /> Hold</button><span className="text-[15px] font-bold">Total Payable: <span className="text-okgreen">{money(billValue + tax)}</span></span><button type="button" className="btn bg-[#f2a19b] text-white" onClick={() => setItems([])}><Icon name="x" size={14} /> Clear Screen</button><span className="flex-1" /><button type="button" className="btn btn-primary" onClick={() => router.push('/admin/transaction/sell/pos')}>Recent Transactions</button></div>
      {showCustomerForm && <CustomerForm values={customerForm} setValues={setCustomerForm} typeOptions={customerTypes} onClose={() => setShowCustomerForm(false)} onSave={saveCustomer} saving={savingCustomer} />}
    </div>
  );
}

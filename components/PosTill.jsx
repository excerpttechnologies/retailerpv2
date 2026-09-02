'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/components/Icon';
import Field from '@/components/Field';
import MultiSelect from '@/components/MultiSelect';
import ProductImage from '@/components/ProductImage';
import CustomerProfilePanel from '@/components/CustomerProfilePanel';
import { useScanner, useBarcodeLookup, useScanSound } from '@/components/useScanner';

const PAYMENT_MODES = ['Cash', 'Credit', 'Export', 'COD'];
const MULTI_PAYMENT_METHODS = ['Cash', 'PayTM', 'Bank Deposit'];
const CUSTOMER_DEFAULTS = {
  typeId: '', businessType: 'Un-Registered', gstNo: '', businessName: '', prefix: 'Mr.',
  firstName: '', middleName: '', lastName: '', billingAddressLine1: '', billingZipCode: '',
  billingCity: '', billingState: '', billingCountry: '', billingDistrict: '', billingTaluk: '',
  billingMobile: '', billingWebsiteUrl: '', billingEmail: '',
};
const money = (value) => Number(value || 0).toFixed(2);
const customerLabel = (customer) => {
  const name = [customer.businessName, customer.firstName, customer.middleName, customer.lastName]
    .filter(Boolean).join(' ').trim();
  return [name || 'Unnamed Customer', customer.billingMobile].filter(Boolean).join(' - ');
};

/* The read-only CustomerInfoPanel that used to live here has been replaced by
   components/CustomerProfilePanel.jsx, which shows the same master fields on
   its Details tab and adds the purchase and return history the counter
   actually asks for. */

function MultiplePay({ totalItems, totalPayable, onClose, onSubmit }) {
  const [payments, setPayments] = useState(() => MULTI_PAYMENT_METHODS.map((method) => ({ method, amount: '', note: '' })));
  const [sellNote, setSellNote] = useState('');
  const [staffNote, setStaffNote] = useState('');
  const totalPaying = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const changeReturn = Math.max(0, totalPaying - totalPayable);
  const balance = Math.max(0, totalPayable - totalPaying);

  function updatePayment(index, key, value) {
    setPayments((current) => current.map((payment, i) => i === index ? { ...payment, [key]: value } : payment));
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-5xl rounded-lg bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 className="text-lg font-semibold">Multiple Payment</h2>
          <button type="button" aria-label="Close payment" className="flex h-8 w-8 items-center justify-center rounded-full bg-danger text-white" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="grid gap-4 pt-3 md:grid-cols-[1fr_220px]">
          <div>
            <div className="mb-3 text-[12px] text-danger">Enter payment amounts across one or more methods. The totals update automatically.</div>
            <div className="grid grid-cols-[1fr_1fr_1.5fr] border-b border-line px-2 py-2 text-[12px] font-semibold text-inkmuted"><span>Method</span><span>Amount</span><span>Payment note</span></div>
            {payments.map((payment, index) => <div className="grid grid-cols-[1fr_1fr_1.5fr] items-center gap-2 border-b border-line px-2 py-2" key={payment.method}><span className="text-[13px] font-semibold">{payment.method}</span><input className="f-input" type="number" min="0" step="0.01" placeholder="Enter amount" value={payment.amount} onChange={(event) => updatePayment(index, 'amount', event.target.value)} /><input className="f-input" placeholder="Payment note" value={payment.note} onChange={(event) => updatePayment(index, 'note', event.target.value)} /></div>)}
            <div className="mt-3 grid gap-2 md:grid-cols-2"><label className="field-label">Sell note<input className="f-input" value={sellNote} onChange={(event) => setSellNote(event.target.value)} /></label><label className="field-label">Staff note<input className="f-input" value={staffNote} onChange={(event) => setStaffNote(event.target.value)} /></label></div>
            <button type="button" className="btn btn-primary mx-auto mt-4 flex min-w-52 justify-center" onClick={() => onSubmit({ payments, sellNote, staffNote })}>Submit</button>
          </div>
          <div className="rounded-lg bg-[#ffc400] p-4 text-ink shadow-inner"><div className="border-b border-black/15 pb-3"><div className="text-[12px] font-semibold">Total Items:</div><div className="text-xl font-bold">{totalItems}</div></div><div className="border-b border-black/15 py-3"><div className="text-[12px] font-semibold">Total Payable:</div><div className="text-xl font-bold">{money(totalPayable)}</div></div><div className="border-b border-black/15 py-3"><div className="text-[12px] font-semibold">Total Paying:</div><div className="text-xl font-bold">{money(totalPaying)}</div></div><div className="border-b border-black/15 py-3"><div className="text-[12px] font-semibold">Change Return:</div><div className="text-xl font-bold text-danger">{money(changeReturn)}</div></div><div className="pt-3"><div className="text-[12px] font-semibold">Balance:</div><div className="text-xl font-bold">{money(balance)}</div></div></div>
        </div>
      </div>
    </div>
  );
}

function CustomerForm({ values, setValues, typeOptions, onClose, onSave, saving }) {
  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const fields = [
    ['businessName', 'Business Name'], ['firstName', 'First Name *'], ['middleName', 'Middle Name'],
    ['lastName', 'Last Name'], ['billingAddressLine1', 'Address'],
    ['billingCity', 'City'], ['billingState', 'State'], ['billingDistrict', 'District'],
    ['billingTaluk', 'Taluk'], ['billingCountry', 'Country'], ['billingMobile', 'Phone Number *'],
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
          {fields.slice(0, 5).map(([key, label]) => <label className="field-label" key={key}>{label}<input className="f-input" value={values[key]} onChange={(e) => set(key, e.target.value)} required={key === 'firstName'} /></label>)}
          <label className="field-label">Zip Code<Field f={{ k: 'billingZipCode', label: 'Zip Code', type: 'zip', fill: { city: 'billingCity', state: 'billingState', country: 'billingCountry', district: 'billingDistrict', taluk: 'billingTaluk' } }} value={values.billingZipCode} onChange={set} /></label>
          {fields.slice(5).map(([key, label]) => <label className="field-label" key={key}>{label}<input className="f-input" value={values[key]} onChange={(e) => set(key, e.target.value)} required={key === 'billingMobile'} /></label>)}
        </div>
        <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={saving}><Icon name="save" size={14} /> {saving ? 'Saving...' : 'Add Customer'}</button></div>
      </form>
    </div>
  );
}

export default function PosTill() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialBusiness = sp.get('business') || '';
  const initialLocation = sp.get('location') || '';
  const finYear = sp.get('finYear') || '2026-2027';
  const [business, setBusiness] = useState(initialBusiness);
  const [businesses, setBusinesses] = useState([]);
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
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTypes, setCustomerTypes] = useState([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerForm, setCustomerForm] = useState(CUSTOMER_DEFAULTS);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [items, setItems] = useState([]);
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [showMultiplePay, setShowMultiplePay] = useState(false);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [cashier, setCashier] = useState('');
  const [exempted, setExempted] = useState(false);

  /* Scanner plumbing. intent SELL makes the server apply the till's rules -
     in stock, at THIS location, not already sold. */
  const beep = useScanSound();
  const { lookup: lookupBarcode, busy: scanBusy } = useBarcodeLookup({
    business, location, intent: 'SELL',
  });

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
    json('/api/options?ref=business').then((d) => {
      const options = d.options || [];
      setBusinesses(options);
      if (!business) setBusiness(options.find((option) => option.isDefault)?.value || options[0]?.value || '');
    }).catch(() => {});
    json(`/api/options?ref=companylocations&business=${business}`).then((d) => {
      const options = d.options || [];
      setLocations(options);
      if (!location && options[0]) setLocation(options[0].value);
    }).catch(() => {});
    json(`/api/options?ref=contact-type-customer&business=${business}`).then((d) => setCustomerTypes(d.options || [])).catch(() => {});
    json(`/api/agent?perPage=200&business=${business}`).then((d) => {
      const options = (d.rows || []).map((r) => ({ value: String(r._id), label: r.businessName || `${r.firstName || ''} ${r.lastName || ''}`.trim() })).filter((o) => o.label);
      setSalesPeople(options.length ? options : ['Suresh', 'Mahesh', 'Mohan'].map((name) => ({ value: name, label: name })));
    }).catch(() => setSalesPeople(['Suresh', 'Mahesh', 'Mohan'].map((name) => ({ value: name, label: name }))));
  }, [business]);

  function changeBusiness(value) {
    setBusiness(value);
    setLocation('');
    setCustomer('walkin');
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerOptions([{ value: 'walkin', label: 'Walk-in Customer' }]);
  }

  useEffect(() => {
    fetch(`/api/pos-counter?perPage=200&business=${business}&location=${location}`).then((r) => r.json()).then((d) => setCounters((d.rows || []).map((r) => ({ value: String(r._id), label: r.counterName })))).catch(() => {});
  }, [business, location]);

  useEffect(() => {
    if (!customerSearch.trim()) {
      if (customer && customer !== 'walkin') return undefined;
      setCustomerOptions([{ value: 'walkin', label: 'Walk-in Customer' }]);
      return undefined;
    }
    const timer = setTimeout(() => fetch(`/api/customer?perPage=30&business=${business}&search=${encodeURIComponent(customerSearch)}`).then((r) => r.json()).then((d) => {
      const rows = d.rows || [];
      setCustomerOptions(rows.length
        ? rows.map((r) => ({ value: String(r._id), label: customerLabel(r), customer: r }))
        : [{ value: 'add-customer', label: 'Add Customer', addCustomer: true }]);
    }).catch(() => {}), 250);
    return () => clearTimeout(timer);
  }, [business, customerSearch, customer]);

  useEffect(() => {
    const query = code.trim();
    if (!query || !business || !location) { setItemSuggestions([]); return undefined; }
    const timer = setTimeout(() => fetch(`/api/inventory-barcode-list?perPage=10&business=${business}&location=${location}&search=${encodeURIComponent(query)}`)
      .then((r) => r.json()).then((d) => setItemSuggestions(d.rows || [])).catch(() => setItemSuggestions([])), 250);
    return () => clearTimeout(timer);
  }, [business, location, code]);

  function updateItem(index, key, value) {
    setItems((rows) => rows.map((row, i) => i === index ? { ...row, [key]: value } : row));
  }

  /* ==================================================== scanning ========

     A scan now goes to /api/barcode/scan with intent SELL, so the SERVER
     decides whether the unit may be sold: it refuses one that is already
     sold, one that is in transit on a transfer, and one held at another
     location, and says which. The till previously searched the barcode LIST
     and took the first row, which reported none of that - a barcode already
     billed at the next counter came back looking perfectly sellable.

     Falls back to the item master only when the code is not a barcode at
     all, which is how a loose item or a search by name still reaches the
     bill.
     ==================================================================== */
  const scannedCodes = useMemo(
    () => items.map((row) => row.barcodeNo).filter(Boolean),
    [items]
  );

  const addScanned = useCallback(async (raw) => {
    const query = String(raw || '').trim();
    if (!query) return;

    if (!business || !location) {
      setMsg('Choose the business and location before scanning.');
      beep('err');
      return;
    }

    const res = await lookupBarcode(query, scannedCodes);

    if (res.ok) {
      addBarcodeUnit(res.unit);
      return;
    }

    /* A code the barcode engine does not recognise may still be an item
       code or a product name - fall through to the item master. Anything
       else is a real refusal and must be shown, not swallowed. */
    if (res.code !== 'BARCODE_NOT_FOUND') {
      setMsg(res.error);
      beep('err');
      return;
    }

    try {
      const response = await fetch(`/api/item?perPage=10&business=${business}&search=${encodeURIComponent(query)}`);
      const data = await response.json();
      const hit = (data.rows || [])[0];
      if (!hit) { setMsg(`No item or barcode found for "${query}"`); beep('err'); return; }

      const detail = await fetch(`/api/item/${hit._id}/detail`).then((r) => r.json()).catch(() => ({}));
      const item = detail.item || {};
      const product = {
        itemId: hit._id, barcodeNo: '', barcode: '',
        code: item.itemCode || hit.itemCode || hit.name,
        itemCode: item.itemCode || hit.itemCode || '',
        name: item.name || hit.name,
        description: item.description || hit.description || item.name || hit.name,
        hsn: item.hsnCode || '', gst: Number(item.slabs?.[0]?.igst || 0), qty: 1,
        rsp: Number(item.rsp ?? hit.rsp ?? 0), discountPct: 0, image: hit.image || '',
        uom: item.uom || '', salesPerson: salesPerson || '',
      };
      setItems((rows) => [product, ...rows]);
      setSelectedProduct(product);
      setCode(''); setMsg('');
      beep('ok');
    } catch {
      setMsg('Item lookup failed');
      beep('err');
    }
  }, [business, location, lookupBarcode, scannedCodes, salesPerson, beep]);

  /* The physical scanner: listens on the window, so it works with focus
     anywhere on the till - which is the requirement that the operator should
     not have to click into the search box first. */
  useScanner(addScanned, { enabled: Boolean(business && location) });

  /* Kept as the name the search box and the suggestion list already call. */
  function scan() { return addScanned(code); }

  /* Adds a unit the server has just validated. Newest first, so the item the
     operator has this second scanned is the top row of the table. */
  function addBarcodeUnit(unit) {
    const product = {
      itemId: unit._id,
      barcodeNo: unit.barcodeNo,
      barcode: unit.barcodeNo,
      code: unit.itemCode || unit.itemName,
      itemCode: unit.itemCode || '',
      name: unit.itemName || unit.description || unit.itemCode,
      itemName: unit.itemName || unit.description || unit.itemCode,
      description: unit.description || unit.itemName || '',
      hsn: unit.hsn || '',
      gst: Number(unit.gst || 0),
      uom: unit.uom || '',
      uomType: unit.uomType || '',
      batchType: unit.batchType || '',
      /* A batch barcode stands for its whole quantity; a unique one is a
         single unit. Defaulting to the unit's own quantity is what makes a
         5-metre batch label bill as 5 metres rather than as 1. */
      qty: Number(unit.qty) || 1,
      rsp: Number(unit.offerPrice || unit.rsp || 0),
      discountPct: 0,
      image: unit.image || '',
      grcNo: unit.grcNo || '',
      salesPerson: salesPerson || '',
    };
    setItems((rows) => [product, ...rows]);
    setSelectedProduct(product);
    setItemSuggestions([]);
    setCode('');
    setMsg('');
    beep('ok');
  }

  /* The suggestion list hands over a row from the barcode list, which is a
     display shape rather than a validated unit - so it goes back through the
     same scan path instead of being trusted. */
  function addBarcodeItem(barcodeHit) {
    return addScanned(barcodeHit.barcodeNo || barcodeHit.itemCode);
  }

  async function saveCustomer(event) {
    event.preventDefault();
    if (!customerForm.typeId) { setMsg('Create a customer type in Customer Type master first.'); return; }
    setSavingCustomer(true);
    try {
      const response = await fetch('/api/customer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business, quick: true, data: customerForm }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).join(', ') : data.error || 'Unable to save customer');
      const savedCustomer = { ...customerForm, contactId: data.customer?.contactId || '', _id: data.id };
      const option = { value: data.id, label: customerLabel(savedCustomer), customer: savedCustomer };
      setCustomerOptions((rows) => [option, ...rows.filter((row) => row.value !== 'walkin' && row.value !== data.id)]); setCustomer(data.id); setSelectedCustomer(savedCustomer); setCustomerSearch(''); setShowCustomerForm(false); setCustomerForm({ ...CUSTOMER_DEFAULTS, typeId: customerForm.typeId }); setMsg('');
    } catch (error) { setMsg(error.message); } finally { setSavingCustomer(false); }
  }

  function selectCustomer(value) {
    const option = customerOptions.find((row) => row.value === value);
    if (option?.addCustomer) {
      setCustomer('walkin');
      setCustomerForm((current) => ({ ...CUSTOMER_DEFAULTS, typeId: current.typeId || customerTypes[0]?.value || '', billingMobile: customerSearch.trim() }));
      setShowCustomerForm(true);
      return;
    }
    if (!value) {
      setCustomer('walkin');
      setSelectedCustomer(null);
      setCustomerSearch('');
      return;
    }
    setCustomer(value);
    setSelectedCustomer(option?.customer || null);
    setCustomerSearch('');
  }

  const rows = items.map((row) => ({ ...row, discountAmount: Number(row.rsp || 0) * Number(row.qty || 0) * Number(row.discountPct || 0) / 100, lineTotal: Number(row.rsp || 0) * Number(row.qty || 0) * (1 - Number(row.discountPct || 0) / 100) }));
  const qty = rows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  const billValue = rows.reduce((sum, row) => sum + row.lineTotal, 0);
  const tax = exempted ? 0 : rows.reduce((sum, row) => sum + row.lineTotal * Number(row.gst || 0) / 100, 0);
  const timeStr = now ? now.toTimeString().slice(0, 5) : '';

  async function submitPayment(paymentData) {
    if (!items.length || billValue + tax <= 0) { setMsg('Add an item before submitting payment.'); return; }
    try {
      const paid = paymentData.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const customerRecord = selectedCustomer || customerOptions.find((option) => option.value === customer)?.customer;
      const response = await fetch('/api/sell-pos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business, location, finYear, data: { date: saleDate, finYear, customerId: customer === 'walkin' ? null : customer, customerContact: customerRecord?.billingMobile || '', customerSnapshot: customer === 'walkin' ? null : customerRecord || null, counterId: counter || null, billingType: payMode, exempted: exempted ? 'YES' : 'NO', items, payments: paymentData.payments, sellNote: paymentData.sellNote, staffNote: paymentData.staffNote, totalAmount: billValue + tax, paid } }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save POS invoice');
      setShowMultiplePay(false);
      router.push('/admin/transaction/sell/pos');
    } catch (error) { setMsg(error.message); }
  }

  return (
    <div className="pos-till fixed inset-0 z-50 flex flex-col overflow-auto bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[13.5px]"><span className="text-inkmuted">Business:</span><select className="f-input w-64" value={business} onChange={(e) => changeBusiness(e.target.value)}><option value="">Select business</option>{businesses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><span className="text-inkmuted">Location:</span><select className="f-input w-64" value={location} onChange={(e) => setLocation(e.target.value)} disabled={!business}><option value="">Select location</option>{locations.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><span className="flex items-center gap-1.5 text-cell"><Icon name="refresh" size={15} /> {timeStr}</span><span className="flex-1" />{selectedProduct && <div className="flex items-center gap-3 border-l border-line pl-3"><span className="max-w-40 truncate text-[12px] font-semibold">{selectedProduct.barcode || selectedProduct.code}</span><ProductImage src={selectedProduct.image} alt={selectedProduct.name} size={72} onOpen={() => setPreviewImage({ src: selectedProduct.image, alt: selectedProduct.name })} /></div>}{['refresh', 'voucher', 'register', 'cart', 'ledger', 'chevL'].map((ic, i) => <button key={i} aria-label={ic} className={'flex h-8 w-9 items-center justify-center rounded ' + (i === 0 ? 'bg-[#dbe6f7] text-brand' : 'bg-brand text-white')}><Icon name={ic} size={15} /></button>)}</div>
      <div className="grid grid-cols-1 gap-2 px-4 md:grid-cols-5"><input className="f-input" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /><select className="f-input" value={payMode} onChange={(e) => setPayMode(e.target.value)}>{PAYMENT_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select><div className="md:col-span-2"><MultiSelect mode="single" options={customerOptions} value={customer} placeholder="Walk-in Customer / phone number" onSearch={setCustomerSearch} onChange={selectCustomer} /></div><input className="f-input" value={cashier} readOnly /></div>
      <div className="mt-2 grid grid-cols-1 items-start gap-2 px-4 md:grid-cols-5"><MultiSelect mode="single" options={salesPeople} value={salesPerson} placeholder="Sales Person" onChange={setSalesPerson} /><div className="relative md:col-span-2"><input data-scan-target="" className="f-input" placeholder="Scan barcode, or type a product name / SKU" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (['Enter', 'F9', 'Tab'].includes(e.key)) { e.preventDefault(); scan(); } }} />{scanBusy && <span className="absolute right-2 top-2 text-[11px] text-inkmuted">checking...</span>}{itemSuggestions.length > 0 && <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded border border-line bg-white shadow-lg">{itemSuggestions.map((item) => <button type="button" key={item._id} className="flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left text-[12px] hover:bg-[#f4f7fb]" onClick={() => addBarcodeItem(item)}><ProductImage src={item.productImageUrl} alt={item.itemId || item.itemCode} size={44} /><span className="min-w-0 flex-1"><b className="block truncate">{item.itemId || item.description || item.itemCode}</b><span className="text-inkmuted">{item.barcodeNo} · RSP {money(item.rsp)}</span></span></button>)}</div>}</div><select className="f-input" value={counter} onChange={(e) => setCounter(e.target.value)}><option value="">Select Cash Counter</option>{counters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><div className="flex items-center gap-5"><label><input type="checkbox" checked={exempted} onChange={(e) => setExempted(e.target.checked)} /> Exempted</label><button type="button" className="btn bg-danger px-2 py-1 text-white" title="Process a customer return against a previous bill" onClick={() => router.push(`/admin/transaction/sell/pos-return/add?business=${business}&location=${location}&finYear=${finYear}`)}><Icon name="undo" size={13} /> Return / Refund</button></div></div>
      <CustomerProfilePanel
        customerId={customer}
        business={business}
        fallbackCustomer={selectedCustomer}
      />
      {previewImage && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-6" onClick={() => setPreviewImage(null)}><div className="relative max-h-full max-w-4xl rounded bg-white p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}><button type="button" aria-label="Close image preview" className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white" onClick={() => setPreviewImage(null)}><Icon name="x" size={16} /></button><img src={previewImage.src} alt={previewImage.alt} className="max-h-[80vh] max-w-[80vw] object-contain" /></div></div>}
      {msg && <div className="mx-4 mt-2 flash flash-err">{msg}</div>}
      <div className="mt-3 flex-1 overflow-x-auto px-4"><table className="dt"><thead><tr>{['#', 'Barcode No', 'Item Code', 'Item / Description', 'HSN', 'GST%', 'Qty', 'RSP Price', 'Disc %', 'Disc Amt', 'Line Total', 'Sales Person', 'Image', ''].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan="14" className="dt-empty">No Items Added</td></tr> : rows.map((row, index) => <tr key={`${row.itemId}-${index}`} className="cursor-pointer" onClick={() => setSelectedProduct(row)}><td>{index + 1}</td><td>{row.barcode || '-'}</td><td>{row.code}</td><td>{row.description || row.name}</td><td>{row.hsn}</td><td>{money(row.gst)}</td><td><input className="f-input w-20" type="number" min="0" value={row.qty} onChange={(e) => updateItem(index, 'qty', e.target.value)} /></td><td><input className="f-input w-24" type="number" min="0" value={row.rsp} onChange={(e) => updateItem(index, 'rsp', e.target.value)} /></td><td><input className="f-input w-20" type="number" min="0" value={row.discountPct} onChange={(e) => updateItem(index, 'discountPct', e.target.value)} /></td><td>{money(row.discountAmount)}</td><td>{money(row.lineTotal)}</td><td><select className="f-input min-w-28" value={row.salesPerson || ''} onChange={(e) => updateItem(index, 'salesPerson', e.target.value)}><option value="">Select...</option>{salesPeople.map((person) => <option key={person.value} value={person.value}>{person.label}</option>)}</select></td><td><ProductImage src={row.image} alt={row.name} size={56} onOpen={() => { setSelectedProduct(row); setPreviewImage({ src: row.image, alt: row.name }); }} /></td><td><button type="button" className="act-btn bg-danger" onClick={(e) => { e.stopPropagation(); setItems((current) => current.filter((_, itemIndex) => itemIndex !== index)); if (selectedProduct?.itemId === row.itemId) setSelectedProduct(null); }}><Icon name="x" size={12} /></button></td></tr>)}</tbody></table></div>
      <div className="border-t border-line px-4 pt-2"><div className="grid grid-cols-2 gap-2 text-[13px] md:grid-cols-6"><div><div className="text-cell">Qty</div><div>{qty}</div></div><div><div className="text-cell">Bill Value</div><div>{money(rows.reduce((sum, row) => sum + Number(row.rsp || 0) * Number(row.qty || 0), 0))}</div></div><div><div className="text-cell">Total Discount</div><div>{money(rows.reduce((sum, row) => sum + row.discountAmount, 0))}</div></div><div><div className="text-cell">Sub Total</div><div>{money(billValue)}</div></div><div><div className="text-cell">Tax</div><div>{money(tax)}</div></div><div><div className="text-cell">Net Amount</div><div className="font-bold text-danger">{money(billValue + tax)}</div></div></div></div>
      <div className="mt-2 flex flex-wrap items-center gap-3 bg-[#eef1f7] px-4 py-3"><button type="button" className="btn bg-[#17a2b8] text-white"><Icon name="register" size={14} /> Hold</button><button type="button" className="btn bg-[#2563a9] text-white" onClick={() => setShowMultiplePay(true)}><Icon name="register" size={14} /> Multiple Pay</button><span className="text-[15px] font-bold">Total Payable: <span className="text-okgreen">{money(billValue + tax)}</span></span><button type="button" className="btn bg-[#f2a19b] text-white" onClick={() => setItems([])}><Icon name="x" size={14} /> Clear Screen</button><span className="flex-1" /><button type="button" className="btn btn-primary" onClick={() => router.push('/admin/transaction/sell/pos')}>Recent Transactions</button></div>
      {showMultiplePay && <MultiplePay totalItems={qty} totalPayable={billValue + tax} onClose={() => setShowMultiplePay(false)} onSubmit={submitPayment} />}
      {showCustomerForm && <CustomerForm values={customerForm} setValues={setCustomerForm} typeOptions={customerTypes} onClose={() => setShowCustomerForm(false)} onSave={saveCustomer} saving={savingCustomer} />}
    </div>
  );
}

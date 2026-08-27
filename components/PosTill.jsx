'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/components/Icon';
import MultiSelect from '@/components/MultiSelect';

/* ==========================================================================
   Create POS - the full-screen till.
   The original renders this with NO sidebar and NO top bar, so this page is a
   fixed overlay covering the admin shell rather than a page inside it.
   ========================================================================== */

const COLS = ['SL No.', 'Item Code', 'Item', 'HSN', 'GST%', 'Qty(QoH)', 'RSP Price', 'Disc(%)',
  'Disc (Amt)', 'Disc Amt', 'RSP (Offer Price)', 'RSP (Sales Price)', 'Sales Person', 'Image'];

export default function PosTill() {
  const router = useRouter();
  const sp = useSearchParams();
  const business = sp.get('business') || '';
  const location = sp.get('location') || '';

  const [now, setNow] = useState(null);
  const [items, setItems] = useState([]);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [exempted, setExempted] = useState(false);
  const [isReturn, setIsReturn] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [counters, setCounters] = useState([]);
  const [counter, setCounter] = useState('');
  const [salesPeople, setSalesPeople] = useState([]);
  const [salesPerson, setSalesPerson] = useState('');
  const [lineDiscPct, setLineDiscPct] = useState('');
  const [lineDiscAmt, setLineDiscAmt] = useState('');
  const [cashier, setCashier] = useState('');

  /* the cashier chip was hardcoded to one user */
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setCashier(d.user ? d.user.name + ' (Casher)' : ''))
      .catch(() => {});
  }, []);

  /* clock is client-only so the server render can't mismatch */
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const asOptions = (rows, label) =>
      (rows || []).map((r) => ({ value: String(r._id), label: String(r[label] ?? '') }));

    fetch('/api/pos-counter?perPage=200&business=' + business)
      .then((r) => r.json())
      .then((d) => setCounters(asOptions(d.rows, 'counterName')))
      .catch(() => {});

    /* Sales Persons properly belong to Staff Management (not built yet);
       agents stand in until that module lands. */
    fetch('/api/agent?perPage=200&business=' + business)
      .then((r) => r.json())
      .then((d) => setSalesPeople(asOptions(d.rows, 'businessName')))
      .catch(() => {});

    /* the location name was hardcoded to one tenant's warehouse */
    if (location) {
      fetch('/api/company-location/' + location)
        .then((r) => r.json())
        .then((d) => setLocationName(d.doc?.name || ''))
        .catch(() => {});
    }
  }, [business, location]);

  async function scan() {
    if (!code.trim()) return;
    try {
      const r = await fetch('/api/item?perPage=1&search=' + encodeURIComponent(code));
      const d = await r.json();
      const hit = (d.rows || [])[0];
      if (!hit) { setMsg('No item found for "' + code + '"'); return; }
      setMsg('');
      setItems((rows) => [...rows, { code: hit.itemCode || hit.name, name: hit.name, qty: 1, rsp: 0 }]);
      setCode('');
    } catch { setMsg('Lookup failed'); }
  }

  const qty = items.reduce((s, r) => s + Number(r.qty || 0), 0);
  const billValue = items.reduce((s, r) => s + Number(r.rsp || 0) * Number(r.qty || 0), 0);
  const money = (n) => Number(n || 0).toFixed(2);

  const dateStr = now ? now.toLocaleDateString('en-GB').replace(/\//g, '/') : '';
  const timeStr = now ? now.toTimeString().slice(0, 5) : '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-auto bg-white">
      {/* location / clock strip */}
      <div className="flex items-center gap-3 px-4 py-2.5 text-[13.5px]">
        <span className="text-inkmuted">Location:</span>
        <span className="rounded border border-linestrong px-2 py-1">{locationName || '\u2014'}</span>
        <span className="flex items-center gap-1.5 text-cell"><Icon name="cal" size={15} /> {dateStr}</span>
        <span className="flex items-center gap-1.5 text-cell"><Icon name="refresh" size={15} /> {timeStr}</span>
        <span className="flex-1" />
        {['refresh', 'voucher', 'register', 'cart', 'ledger', 'chevL'].map((ic, i) => (
          <button key={i} className={'flex h-8 w-9 items-center justify-center rounded ' + (i === 0 ? 'bg-[#dbe6f7] text-brand' : 'bg-brand text-white')}>
            <Icon name={ic} size={15} />
          </button>
        ))}
      </div>

      {/* entry rows */}
      <div className="grid grid-cols-1 gap-2 px-4 md:grid-cols-5">
        <input className="f-input" defaultValue={dateStr} readOnly />
        <select className="f-input" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
          {['Cash', 'Card', 'UPI', 'Credit'].map((m) => <option key={m}>{m}</option>)}
        </select>
        <div className="flex gap-1.5 md:col-span-2">
          <div className="flex-1"><MultiSelect mode="single" options={[{ value: 'walkin', label: 'Walk In Customer - Karnataka' }]} value="walkin" onChange={() => {}} /></div>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white"><Icon name="plus" size={15} /></button>
        </div>
        <input className="f-input" value={cashier} readOnly />
      </div>

      <div className="mt-2 grid grid-cols-1 items-start gap-2 px-4 md:grid-cols-5">
        <MultiSelect mode="single" options={salesPeople} value={salesPerson} placeholder="Sales Person *" onChange={setSalesPerson} />
        <div className="md:col-span-2">
          <input
            className="f-input"
            placeholder="Enter Product Name / SKU / Scan Bar Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => { if (['Enter', 'F9', 'Tab'].includes(e.key)) { e.preventDefault(); scan(); } }}
          />
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[#c07b2a]">
            Press <span className="kbd">Enter</span>/<span className="kbd">F9</span>
            <span className="kbd">Tab</span> to add item &amp; and <b>box must be in focus</b>.
          </div>
        </div>
        <select className="f-input" value={counter} onChange={(e) => setCounter(e.target.value)}>
          <option value="">--Select Counter --</option>
          {counters.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <div className="flex items-center gap-5">
          <label className="flex items-center gap-2 text-[13px] text-brand-link">
            <input type="checkbox" checked={exempted} onChange={(e) => setExempted(e.target.checked)} /> Exempted
          </label>
          <label className="flex items-center gap-2 text-[13px] text-danger">
            <input type="checkbox" checked={isReturn} onChange={(e) => setIsReturn(e.target.checked)} /> Is Return?
          </label>
        </div>
      </div>

      {msg && <div className="mx-4 mt-2 flash flash-err">{msg}</div>}

      {/* item grid */}
      <div className="mt-3 flex-1 overflow-x-auto px-4">
        <table className="dt">
          <thead>
            <tr>
              {COLS.map((c) => <th key={c}>{c}</th>)}
              <th><Icon name="x" size={13} /></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={COLS.length + 1} className="dt-empty">No Items Added</td></tr>}
            {items.map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td><td>{r.code}</td><td>{r.name}</td>
                <td /><td /><td>{r.qty}</td><td>{money(r.rsp)}</td>
                <td /><td /><td /><td /><td /><td /><td />
                <td>
                  <button className="act-btn bg-danger" onClick={() => setItems((rows) => rows.filter((_, x) => x !== i))}>
                    <Icon name="x" size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* totals strip */}
      <div className="border-t border-line px-4 pt-2">
        <div className="grid grid-cols-2 gap-2 text-[13px] md:grid-cols-7">
          {[['Qty', qty], ['Bill Value', money(billValue)], ['Total Discount Amt', '0.00'],
            ['Sub Total', money(billValue)], ['Round Off', '0.00']].map(([l, v]) => (
            <div key={l}><div className="text-cell">{l}</div><div>{v}</div></div>
          ))}
          <div><div className="text-cell">Net Amt</div><div className="font-bold text-danger">{money(billValue)}</div></div>
          <div><div className="text-cell">Total Taxable Amt</div><div>{money(billValue)}</div></div>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="text-[12.5px] text-cell">Line Wise Discount %</div>
            <input className="f-input h-8" value={lineDiscPct} onChange={(e) => setLineDiscPct(e.target.value)} />
          </div>
          <div>
            <div className="text-[12.5px] text-cell">Line Wise Discount Amt</div>
            <input className="f-input h-8" value={lineDiscAmt} onChange={(e) => setLineDiscAmt(e.target.value)} />
          </div>
          <div className="pt-4 text-[13px]">Shipping <span className="text-brand-link">&#9432;</span> ( + ) 0.00</div>
          <div className="pt-4 text-[12.5px] text-danger">Tax: 0.00 (inclusive)</div>
        </div>
      </div>

      {/* fixed footer */}
      <div className="mt-2 flex flex-wrap items-center gap-3 bg-[#eef1f7] px-4 py-3">
        <button className="btn bg-[#17a2b8] text-white"><Icon name="register" size={14} /> Hold</button>
        <button className="btn bg-[#3c4a63] text-white"><Icon name="register" size={14} /> Multiple Pay (Esc)</button>
        <span className="text-[15px] font-bold">Total Payable: <span className="text-okgreen">{money(billValue)}</span></span>
        <button className="btn bg-[#f2a19b] text-white" onClick={() => { setItems([]); setCode(''); }}>
          <Icon name="x" size={14} /> Clear Screen
        </button>
        <span className="flex-1" />
        <button className="btn btn-primary" onClick={() => router.push('/admin/transaction/sell/pos')}>
          <Icon name="refresh" size={14} /> Recent Transactions
        </button>
      </div>
    </div>
  );
}

'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import Field from './Field';
import MultiSelect from './MultiSelect';
import { useScope } from './ScopeContext';
import { fmt } from '@/lib/format';

/* Renders the Purchase add screens from the registry `form.cards` spec:
   fields | info | scan | source | grid | totals   (see purchaseRegistry.js) */

function InfoBox({ items }) {
  return (
    <div className="info-box">
      <div className="mb-1.5 flex items-center gap-1.5 font-bold underline"><Icon name="eye" size={14} /> Info</div>
      <ol className="list-decimal pl-5">
        {items.map((t, i) => <li key={i} dangerouslySetInnerHTML={{ __html: t }} />)}
      </ol>
    </div>
  );
}

function ScanRow({ onFound }) {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  async function search() {
    if (!code.trim()) return;
    /* resolves against the Item master at /api/item */
    try {
      const r = await fetch('/api/item?perPage=1&search=' + encodeURIComponent(code));
      const d = await r.json();
      const hit = (d.rows || [])[0];
      if (!hit) { setMsg('No item found for "' + code + '"'); return; }
      setMsg('');
      onFound(hit);
      setCode('');
    } catch {
      setMsg('Item master not available yet');
    }
  }

  return (
    <>
      <div className="kbd-hint">
        <Icon name="eye" size={13} /> Shortcut: Press <span className="kbd">Enter</span> /
        <span className="kbd">F9</span> / <span className="kbd">Tab</span>
        to add item &amp; and <b>box must be in focus</b>.
      </div>
      <div className="mb-3 flex">
        <input
          className="f-input rounded-r-none"
          placeholder="Enter item code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (['Enter', 'F9', 'Tab'].includes(e.key)) { e.preventDefault(); search(); } }}
        />
        <button type="button" className="btn btn-dark rounded-l-none" onClick={search}>
          <Icon name="search" size={14} /> Search
        </button>
      </div>
      {msg && <div className="flash flash-err">{msg}</div>}
    </>
  );
}

function SourceSelect({ card, supplierId, value, onChange }) {
  const [options, setOptions] = useState([]);
  const scope = useScope();

  useEffect(() => {
    const qs = new URLSearchParams({
      perPage: '200', unconverted: card.unconvertedBy || '',
      business: scope.business || '', location: scope.location || '', finYear: scope.finYear || '',
    });
    if (card.withSupplier && supplierId) qs.set('supplierId', supplierId);
    fetch(card.endpoint + '?' + qs)
      .then((r) => r.json())
      .then((d) => setOptions((d.rows || []).map((r) => ({
        value: r._id,
        label: r.grcNumber || r.grtNo || r._id,
      }))))
      .catch(() => setOptions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.endpoint, supplierId, scope.business, scope.location, scope.finYear]);

  return (
    <div>
      <label className="f-label">{card.label}{card.req && <span className="f-req">*</span>}</label>
      <MultiSelect
        mode={card.multi ? 'multi' : 'single'}
        options={options}
        value={card.multi ? (value || []) : (value || '')}
        onChange={onChange}
      />
    </div>
  );
}

function Grid({ card, rows, onRemove }) {
  return (
    <div className="overflow-x-auto">
      <table className="dt">
        <thead>
          <tr>
            {card.cols.map((c) => <th key={c}>{c}</th>)}
            {card.removable && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={card.cols.length + (card.removable ? 1 : 0)} className="dt-empty">{card.empty}</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={i}>
              {card.cols.map((c, ci) => (
                <td key={c}>
                  {/* only a real serial-number column shows the row index;
                      otherwise the first column's own value was being lost */}
                  {ci === 0 && /^(sl\s*no|s\.?\s*no|#)$/i.test(c) ? i + 1 : (r[c] ?? '')}
                </td>
              ))}
              {card.removable && (
                <td>
                  <button className="act-btn bg-danger" onClick={() => onRemove(i)}><Icon name="x" size={12} /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScanTabs({ card, tab, setTab, rows, onFound, onRemove }) {
  return (
    <>
      <div className="mb-3 flex gap-1 border-b border-line">
        {card.tabs.map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setTab(t.k)}
            className={
              'rounded-t-md px-4 py-2 text-[13.5px] ' +
              (tab === t.k ? 'border border-b-0 border-line bg-white font-bold' : 'text-brand-link')
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <ScanRow onFound={onFound} />
      <Grid card={{ ...card, removable: true }} rows={rows} onRemove={onRemove} />
    </>
  );
}

function Totals({ card, data, onChange }) {
  return (
    <table className="w-full border-collapse text-[13.5px]">
      <tbody>
        {card.rows.map((r) => (
          <tr key={r.label} className="border-b border-line">
            <td className="w-[38%] py-2 pr-3 text-right text-cell">{r.label}</td>
            <td className="w-[22%]" />
            <td className="w-[18%] px-2">
              {r.input && (
                <input
                  type="number"
                  className="f-input h-8 text-center"
                  value={data[r.input] ?? 0}
                  onChange={(e) => onChange(r.input, Number(e.target.value))}
                />
              )}
            </td>
            <td className="w-[4%] text-center text-[#c07b2a]">{r.op || ''}</td>
            <td className="py-2 pr-3 text-right">{Number(data[r.value] || 0).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TransferHeader({ card, data, errors, onChange }) {
  const fromId = data.transferFromLocationId;
  const toId = data.transferToLocationId;

  useEffect(() => {
    const locations = [
      { id: fromId, gstn: 'transferFromLocationGstn', address: 'transferFromLocationAddress' },
      { id: toId, gstn: 'transferToLocationGstn', address: 'transferToLocationAddress' },
    ].filter((location) => location.id);

    locations.forEach(({ id, gstn, address }) => {
      fetch('/api/company-location/' + id)
        .then((response) => response.json())
        .then(({ doc }) => {
          if (!doc) return;
          const addressText = [doc.addressLine1, doc.addressLine2, doc.landmark, doc.city, doc.state, doc.zipCode]
            .filter(Boolean)
            .join(', ');
          onChange(gstn, doc.gstin || '');
          onChange(address, addressText);
        })
        .catch(() => {});
    });
  }, [fromId, toId]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {(card.groups || []).map((group) => (
        <fieldset key={group.title} className="min-w-0 rounded-md border border-[#2da9e8] px-3 pb-3 pt-1">
          <legend className="px-2 text-lg font-medium text-ink">{group.title}</legend>
          <div className="space-y-3">
            {(group.fields || []).map((f) => (
              <Field key={f.k} f={f} value={data[f.k]} error={errors[f.k]} onChange={onChange} />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function SourceTable({ card, partyId, selected, onToggle }) {
  const [rows, setRows] = useState([]);
  const scope = useScope();

  useEffect(() => {
    const qs = new URLSearchParams({
      unconverted: card.unconvertedBy || '', perPage: '100',
      business: scope.business || '', location: scope.location || '', finYear: scope.finYear || '',
    });
    if (card.byCustomer && partyId) qs.set('customerId', partyId);
    fetch(card.endpoint + '?' + qs)
      .then((r) => r.json())
      .then((d) => setRows(d.rows || []))
      .catch(() => setRows([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.endpoint, partyId, scope.business, scope.location, scope.finYear]);

  return (
    <>
      <label className="f-label">{card.label}{card.req && <span className="f-req">*</span>}</label>
      <div className="overflow-x-auto">
        <table className="dt">
          <thead>
            <tr>
              <th>#</th><th>Select</th>
              {card.cols.map((c) => <th key={c.k}>{c.t}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={card.cols.length + 2} className="dt-empty">{card.empty}</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={r._id}>
                <td>{i + 1}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={(selected || []).includes(r._id)}
                    onChange={() => onToggle(r._id)}
                  />
                </td>
                {card.cols.map((c) => <td key={c.k}>{fmt(c.f, r[c.k])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function TransactionFormView({ cfg, id, slug }) {
  const router = useRouter();
  const scope = useScope();
  const cards = cfg.form?.cards || [];
  const slugPath = cfg.slugPath || slug;
  const listUrl = (cfg.basePath || '/admin/') + slugPath;
  const allFields = useMemo(
    () => cards.flatMap((c) => c.type === 'fields'
      ? (c.fields || [])
      : c.type === 'transferHeader'
        ? (c.groups || []).flatMap((g) => g.fields || [])
        : []),
    [cards]
  );

  const [data, setData] = useState(() => {
    const d = {};
    allFields.forEach((f) => {
      d[f.k] = f.def === 'today' ? new Date().toISOString().slice(0, 10) : (f.def !== undefined ? f.def : '');
    });
    return d;
  });
  const [source, setSource] = useState(null);
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState((cards.find((c) => c.type === 'scanTabs')?.tabs || [{ k: '' }])[0].k);
  const [errors, setErrors] = useState({});
  const [flash, setFlash] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(cfg.endpoint + '/' + id)
      .then((r) => r.json())
      .then((d) => {
        if (!d.doc) return;
        setData((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((k) => {
            const v = d.doc[k];
            if (v === null || v === undefined) return;
            next[k] = allFields.find((f) => f.k === k)?.type === 'ref' ? String(v) : v;
          });
          return next;
        });
        setItems(d.doc.items || []);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, slugPath]);

  useEffect(() => {
    if (!id && scope.location && allFields.some((f) => f.k === 'transferFromLocationId')) {
      setData((prev) => prev.transferFromLocationId ? prev : { ...prev, transferFromLocationId: scope.location });
    }
  }, [allFields, id, scope.location]);

  const set = (k, v) => { setData((d) => ({ ...d, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  async function submit() {
    setSaving(true); setFlash(null);
    try {
      const payload = {
        data: { ...data, items, sourceIds: source, ...(tab ? { type: tab } : {}) },
        business: scope.business, location: scope.location, finYear: scope.finYear,
      };

      const r = await fetch(cfg.endpoint + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (r.status === 422) { setErrors(d.errors || {}); setFlash({ type: 'err', msg: 'Please correct the highlighted fields.' }); return; }
      if (!r.ok) { setFlash({ type: 'err', msg: d.error || 'Save failed' }); return; }
      router.push(listUrl);
    } finally { setSaving(false); }
  }

  return (
    <>
      {cards.map((card, i) => {
        if (card.type === 'transferHeader') {
          return (
            <div className="card" key={i}>
              {cfg.form.title && i === 0 && (
                <div className="card-head"><span className="card-title">{cfg.form.title}</span></div>
              )}
              <div className="card-body">
                {flash && i === 0 && <div className={'flash ' + (flash.type === 'err' ? 'flash-err' : 'flash-ok')}>{flash.msg}</div>}
                <TransferHeader card={card} data={data} errors={errors} onChange={set} />
              </div>
            </div>
          );
        }

        if (card.type === 'fields') {
          return (
            <div className="card" key={i}>
              {cfg.form.title && i === 0 && (
                <div className="card-head"><span className="card-title">{cfg.form.title}</span></div>
              )}
              <div className="card-body">
                {flash && i === 0 && <div className={'flash ' + (flash.type === 'err' ? 'flash-err' : 'flash-ok')}>{flash.msg}</div>}
                <div className="form-grid-4">
                  {(card.fields || []).map((f) => (
                    <Field key={f.k} f={f} value={data[f.k]} error={errors[f.k]} onChange={set} />
                  ))}
                </div>
                {card.preview && (
                  <div className="mt-3">
                    <button type="button" className="btn w-full max-w-[380px] justify-center bg-[#7f9fd6] text-white">
                      Preview
                    </button>
                  </div>
                )}
                {card.attachmentButtons && (
                  <div className="mt-3 flex gap-3">
                    {card.attachmentButtons.map((b) => (
                      <button key={b.k} type="button" className="btn border-[#f0a9a4] bg-[#f2a19b] text-white">
                        <Icon name="file" size={14} /> {b.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (card.type === 'info') return <div className="card" key={i}><div className="card-body"><InfoBox items={card.items} /></div></div>;

        if (card.type === 'scan') {
          return (
            <div className="card" key={i}>
              <div className="card-body">
                <ScanRow onFound={(hit) => setItems((rows) => [...rows, { 'Item Code': hit.itemCode || hit.name, 'Item Name': hit.name }])} />
              </div>
            </div>
          );
        }

        if (card.type === 'source') {
          return (
            <div className="card" key={i}>
              <div className="card-body">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <SourceSelect
                    card={card}
                    supplierId={data.supplierId}
                    value={source}
                    onChange={setSource}
                  />
                  {card.info && <InfoBox items={card.info} />}
                </div>
              </div>
            </div>
          );
        }

        if (card.type === 'scanTabs') {
          return (
            <div className="card" key={i}>
              <div className="card-head"><span className="card-title">{card.title}</span></div>
              <div className="card-body">
                <ScanTabs
                  card={card}
                  tab={tab}
                  setTab={setTab}
                  rows={items.filter((r) => !r.__tab || r.__tab === tab)}
                  onFound={(hit) => setItems((rows) => [...rows, {
                    __tab: tab,
                    'Item Code': hit.itemCode || hit.name,
                    'Item Name': hit.name,
                  }])}
                  onRemove={(ri) => setItems((rows) => rows.filter((_, x) => x !== ri))}
                />
              </div>
            </div>
          );
        }

        if (card.type === 'sourceTable') {
          return (
            <div className="card" key={i}>
              <div className="card-body">
                <SourceTable
                  card={card}
                  partyId={data.customerId || data.supplierId}
                  selected={Array.isArray(source) ? source : (source ? [source] : [])}
                  onToggle={(rid) => setSource((cur) => {
                    const list = Array.isArray(cur) ? cur : (cur ? [cur] : []);
                    return list.includes(rid) ? list.filter((x) => x !== rid) : [...list, rid];
                  })}
                />
              </div>
            </div>
          );
        }

        if (card.type === 'totals') {
          return (
            <div className="card" key={i}>
              <div className="card-body">
                <Totals card={card} data={data} onChange={set} />
              </div>
            </div>
          );
        }

        if (card.type === 'grid') {
          return (
            <div className="card" key={i}>
              <div className="card-body">
                <Grid card={card} rows={items} onRemove={(ri) => setItems((rows) => rows.filter((_, x) => x !== ri))} />
                {card.paginated && (
                  <div className="flex items-center pt-3 text-[13px] text-cell">
                    <span>Page <b className="text-brand-link">{items.length ? 1 : 0}</b> of {items.length ? 1 : 0}</span>
                    <span className="flex-1" />
                    <span className="flex gap-2">
                      <button className="btn" disabled>Previous</button>
                      <button className="btn" disabled>Next</button>
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        }

        return null;
      })}

      <button type="button" className="btn btn-primary mx-auto mt-2 flex h-[38px] w-full max-w-[390px] justify-center" onClick={submit} disabled={saving}>
        {saving ? <span className="spin" /> : <Icon name="save" size={14} />} Submit
      </button>
    </>
  );
}

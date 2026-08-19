'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import Field from './Field';
import { useScope } from './ScopeContext';

/* Supplier / Customer / Agent add form: four tabs across the top, each with its
   own grey-headed sections and its own Submit (the original saves per tab). */
export default function TabbedFormView({ cfg, id, slug }) {
  const router = useRouter();
  const scope = useScope();
  const tabs = cfg.tabs || [];
  const slugPath = cfg.slugPath || slug;
  const listUrl = (cfg.basePath || '/admin/contact/') + slugPath;
  const [active, setActive] = useState(0);
  const [recordId, setRecordId] = useState(id || null);
  const [errors, setErrors] = useState({});
  const [flash, setFlash] = useState(null);
  const [saving, setSaving] = useState(false);

  const allFields = tabs.flatMap((t) => (t.sections || []).flatMap((s) => s.fields || []));

  const [data, setData] = useState(() => {
    const d = {};
    allFields.forEach((f) => { d[f.k] = f.def !== undefined ? f.def : (f.type === 'checkbox' ? false : ''); });
    tabs.forEach((t) => (t.sections || []).forEach((s) => { if (s.toggle) d[s.toggle.k] = false; }));
    return d;
  });

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
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, slugPath]);

  const set = (k, v) => { setData((d) => ({ ...d, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  /* "Same as Billing Address" copies the billing block into shipping */
  function copyBillingToShipping(on) {
    set('sameAsBilling', on);
    if (!on) return;
    setData((d) => {
      const next = { ...d };
      Object.keys(d).forEach((k) => {
        if (k.startsWith('billing')) next['shipping' + k.slice('billing'.length)] = d[k];
      });
      next.sameAsBilling = true;
      return next;
    });
  }

  async function submit() {
    setSaving(true); setFlash(null);
    try {
      /* contactKind is NOT sent - the API stamps it server-side so the
         supplier/agent/customer discriminator can't be spoofed */
      const payload = {
        data,
        business: scope.business, location: scope.location, finYear: scope.finYear,
      };

      const r = await fetch(cfg.endpoint + (recordId ? '/' + recordId : ''), {
        method: recordId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (r.status === 422) {
        setErrors(d.errors || {});
        /* jump to the first tab that actually has an error */
        const bad = Object.keys(d.errors || {})[0];
        const idx = tabs.findIndex((t) => (t.sections || []).some((s) => (s.fields || []).some((f) => f.k === bad)));
        if (idx >= 0) setActive(idx);
        setFlash({ type: 'err', msg: 'Please correct the highlighted fields.' });
        return;
      }
      setRecordId(d.id);
      if (active === tabs.length - 1) router.push(listUrl);
      else { setFlash({ type: 'ok', msg: 'Saved. Continue with the next tab.' }); setActive((a) => a + 1); }
    } finally { setSaving(false); }
  }

  const tab = tabs[active];

  return (
    <div className="card">
      {/* tab bar - column count follows tabs.length, so a page with 3 tabs
          (Supplier, Agent) doesn't leave an empty 4th cell. Driven by the
          --tab-count custom property, with the rule in globals.css: a
          dynamically built `md:grid-cols-${n}` class would never be generated,
          since there is no Tailwind safelist in this project. */}
      <div className="tabstrip border-b border-line" style={{ '--tab-count': tabs.length }}>
        {tabs.map((t, i) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(i)}
            className={
              'py-3 text-center text-[13.5px] ' +
              (i === active ? 'bg-brand font-bold text-white' : 'bg-white text-brand-link hover:bg-[#f5f8fd]')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card-body">
        {flash && <div className={'flash ' + (flash.type === 'err' ? 'flash-err' : 'flash-ok')}>{flash.msg}</div>}

        {(tab.sections || []).map((s, si) => (
          <div key={si} className="mb-4">
            {(s.title || s.toggle) && (
              <div className="mb-3 flex items-center border-b border-line bg-[#f7f9fc] px-3 py-2">
                <span className="text-[14px] font-bold">{s.title}</span>
                <span className="flex-1" />
                {s.toggle && (
                  <label className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={!!data[s.toggle.k]}
                      onChange={(e) => copyBillingToShipping(e.target.checked)}
                    />
                    {s.toggle.label}
                  </label>
                )}
              </div>
            )}
            {/* column count per section: the Customer page needs a 4-across
                identity row above 6-across name and address rows */}
            <div className={s.cols === 6 ? 'form-grid-6' : 'form-grid-4'}>
              {(s.fields || []).map((f) => (
                <Field key={f.k} f={f} value={data[f.k]} error={errors[f.k]} onChange={set} />
              ))}
            </div>
          </div>
        ))}

        <button type="button" className="btn btn-primary mt-2 flex h-[38px] w-full max-w-[390px] justify-center" onClick={submit} disabled={saving}>
          {saving ? <span className="spin" /> : <Icon name="save" size={14} />} Submit
        </button>
      </div>
    </div>
  );
}

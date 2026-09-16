'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import Field from './Field';
import ModalForm from './ModalForm';
import { refreshOptions } from './useOptions';
import { useScope } from './ScopeContext';

/* Supplier / Customer / Agent add form: four tabs across the top, each with its
   own grey-headed sections and its own Submit (the original saves per tab).

   `onSaved` lets this be embedded in a dialog rather than owning the page:
   when it is supplied, finishing the last tab calls it instead of navigating
   to the list. That is how the Delivery / LR screen offers the full supplier
   form inline without the user losing the consignment they were booking. */
export default function TabbedFormView({ cfg, id, slug, onSaved }) {
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
  const [quickAddField, setQuickAddField] = useState(null);
  const [gstMatch, setGstMatch] = useState(null);
  const [gstChecking, setGstChecking] = useState(false);

  useEffect(() => {
    if (tabs.length && active >= tabs.length) setActive(tabs.length - 1);
  }, [active, tabs.length]);

  const allFields = tabs.flatMap((t) => (t.sections || []).flatMap((s) => s.fields || []));

  const [data, setData] = useState(() => {
    const d = {};
    /* a composite (`f.parts`) holds nothing of its own - see joinParts below -
       so it is kept out of the state and therefore out of the payload */
    allFields.forEach((f) => {
      if (f.parts) return;
      d[f.k] = f.def !== undefined ? f.def : (f.type === 'checkbox' ? false : '');
    });
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

  /* COMPOSITE FIELDS - opt in with `parts` on a field.

     One input standing in for two real columns: Address over
     billingAddressLine1 + billingAddressLine2. Nothing new is stored and no
     schema changes - the value shown is joined from the parts on every
     render and split back into them on every keystroke, so the payload, the
     API field list and the collection keep the exact keys they always had.

     The parts stay in the tab definition marked `hidden`, which is what keeps
     them in the API's field list while taking their inputs off the form. A
     form that declares no `parts` anywhere (Customers) never reaches any of
     this. */
  const PART_SEP = ', ';
  const joinParts = (f) => (f.parts || [])
    .map((k) => String(data[k] ?? '').trim())
    .filter(Boolean)
    .join(PART_SEP);

  /* Split on the FIRST separator only. That makes the round trip stable:
     "Shop 5" + "Ring Road, Surat" shows as "Shop 5, Ring Road, Surat" and
     comes back apart exactly as it went in, so opening a supplier and saving
     without touching the address rewrites the same two values it read. */
  function setParts(f, v) {
    const [head, tail] = f.parts;
    const text = String(v);
    const at = text.indexOf(PART_SEP);
    const patch = at === -1
      ? { [head]: text, [tail]: '' }
      : { [head]: text.slice(0, at), [tail]: text.slice(at + PART_SEP.length) };
    setData((d) => ({ ...d, ...patch }));
    setErrors((e) => ({ ...e, [f.k]: undefined, [head]: undefined, [tail]: undefined }));
  }

  /* STEP FLOW - opt in with cfg.wizard.

     Only the footer changes. The tab strip above stays exactly as it is, so
     the page keeps the look it shares with every other contact form; what
     this switches is Submit-on-every-tab for Next / Back+Next / Back+Submit.

     Without it the component behaves as it always has: a Submit on each tab
     that saves that tab. The Agent form and the supplier dialog embedded in
     the LR screen both rely on that, so the old path is left untouched and
     the new behaviour is switched on per page.

     With it: Next validates the current step and moves on WITHOUT saving, so
     the API is called once, from Submit on the last step. `data` is one
     shared state across all tabs, so stepping back and forth cannot lose
     anything. */
  const wizard = cfg.wizard === true;
  const isLastStep = active === tabs.length - 1;

  /* Required fields of ONE step. Deliberately not the whole form: Next must
     not complain about a field two steps ahead that the user has not reached.
     The full check still happens server-side on Submit, and the 422 handler
     below jumps to whichever step holds the offending field. */
  function validateStep(index) {
    const t = tabs[index];
    if (!t) return {};
    const found = {};
    (t.sections || []).forEach((s) => (s.fields || []).forEach((fld) => {
      if (!fld.req) return;
      if (cfg.isFieldVisible && !cfg.isFieldVisible(fld, data)) return;
      /* the server drops this requirement for the same callers, so the client
         must not block on a field the API would have accepted blank */
      if (fld.k === 'firstName' && cfg.allowBlankFirstName === true) return;
      const v = data[fld.k];
      const empty = v === undefined || v === null
        || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');
      if (empty) found[fld.k] = (fld.label || fld.k) + ' is required.';
    }));
    return found;
  }

  function goNext() {
    const found = validateStep(active);
    if (Object.keys(found).length) {
      setErrors((e) => ({ ...e, ...found }));
      setFlash({ type: 'err', msg: 'Please complete the highlighted fields before continuing.' });
      return;
    }
    setFlash(null);
    setActive((a) => Math.min(a + 1, tabs.length - 1));
  }

  function goBack() {
    /* no validation on the way back - the point of Back is to fix something */
    setFlash(null);
    setActive((a) => Math.max(a - 1, 0));
  }

  /* Every step at once, for Submit. Steps the operator skipped by clicking
     the tab strip have never been through goNext, so without this the only
     thing standing between them and a 422 is the server. Returns the first
     failing step so the form can land them on it. */
  function validateAll() {
    const found = {};
    let firstBad = -1;
    tabs.forEach((_, i) => {
      const step = validateStep(i);
      if (Object.keys(step).length && firstBad === -1) firstBad = i;
      Object.assign(found, step);
    });
    return { found, firstBad };
  }

  /* Used by the import panel: merge reviewed values into the shared state.
     Only the keys the operator ticked arrive here, so a field they typed by
     hand and did not tick is not in the patch and is left alone. */
  function applyPatch(patch, source) {
    const keys = Object.keys(patch || {});
    if (!keys.length) return;
    setData((d) => ({ ...d, ...patch }));
    setErrors((e) => { const next = { ...e }; keys.forEach((k) => { next[k] = undefined; }); return next; });
    setFlash({ type: 'ok', msg: `${keys.length} field${keys.length === 1 ? '' : 's'} filled from ${source}. Review them, then Submit.` });
  }

  useEffect(() => {
    if (!cfg.gstLookup || recordId || !String(data.gstNo || '').trim()) {
      setGstMatch(null);
      setGstChecking(false);
      return undefined;
    }
    const gstNo = String(data.gstNo).trim().toUpperCase();
    let cancelled = false;
    setGstChecking(true);
    fetch(`${cfg.endpoint}?gstNo=${encodeURIComponent(gstNo)}&business=${scope.business || ''}`)
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled) setGstMatch(result.doc || null);
      })
      .catch(() => {
        if (!cancelled) setGstMatch(null);
      })
      .finally(() => {
        if (!cancelled) setGstChecking(false);
      });
    return () => { cancelled = true; };
  }, [cfg.endpoint, cfg.gstLookup, data.gstNo, recordId, scope.business]);

  function useExistingSupplier() {
    if (!gstMatch) return;
    const next = { ...data };
    allFields.forEach((f) => {
      const value = gstMatch[f.k];
      if (value !== null && value !== undefined) next[f.k] = f.type === 'ref' ? String(value) : value;
    });
    setData(next);
    setRecordId(String(gstMatch._id));
    setGstMatch(null);
    setFlash({ type: 'ok', msg: 'Existing supplier details loaded.' });
  }

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
    /* the whole form, before anything is sent. The server still re-checks -
       this only saves a round trip and lands the operator on the right tab. */
    if (wizard) {
      const { found, firstBad } = validateAll();
      if (firstBad >= 0) {
        setErrors((e) => ({ ...e, ...found }));
        setActive(firstBad);
        setFlash({ type: 'err', msg: 'Please complete the highlighted fields before submitting.' });
        return;
      }
    }
    setSaving(true); setFlash(null);
    try {
      /* contactKind is NOT sent - the API stamps it server-side so the
         supplier/agent/customer discriminator can't be spoofed */
      const payload = {
        data,
        business: scope.business, location: scope.location, finYear: scope.finYear,
        allowBlankFirstName: cfg.allowBlankFirstName === true,
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
      if (wizard || active === tabs.length - 1) {
        /* embedded in a dialog: hand the new record back rather than leaving
           the page the caller was in the middle of */
        if (onSaved) onSaved(d);
        else router.push(listUrl);
      }
      else { setFlash({ type: 'ok', msg: 'Saved. Continue with the next tab.' }); setActive((a) => a + 1); }
    } finally { setSaving(false); }
  }

  const tab = tabs[active] || tabs[0];

  const quickAdd = quickAddField ? cfg.quickAdds?.[quickAddField] : null;

  if (!tab) return null;

  return (
    <>
      {quickAdd && (
        <ModalForm
          cfg={quickAdd}
          slug={quickAdd.slug || quickAddField}
          onClose={() => setQuickAddField(null)}
          onSaved={(result) => {
            setQuickAddField(null);
            set(quickAddField, result.id);
            refreshOptions(quickAdd.ref || quickAdd.slug || quickAddField);
          }}
        />
      )}
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
            onClick={() => { setFlash(null); setActive(i); }}
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

        {/* Per-step extras supplied by the page - the supplier form puts its
            GST / Excel import panel on step 1 through here, so this component
            stays unaware of anything supplier-specific. */}
        {cfg.renderStepExtras?.({ tab, index: active, data, applyPatch })}

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
            {/* `.form-grid` is already the 3-across variant, so cols: 3 needs
                no new CSS. Written as literal class strings because Tailwind
                scans source text - a built-up `xl:grid-cols-${n}` would never
                be generated. */}
            <div
              className={
                s.cols === 6 ? 'form-grid-6'
                  : s.cols === 3 ? 'form-grid'
                    : s.cols === 1 ? 'grid grid-cols-1 gap-x-[22px] gap-y-3.5'
                      : 'form-grid-4'
              }
            >
              {(s.fields || []).filter((f) => !f.hidden && (!cfg.isFieldVisible || cfg.isFieldVisible(f, data))).map((f) => {
                const add = cfg.quickAdds?.[f.k];
                /* cfg.isFieldReadOnly is the sibling of cfg.isFieldVisible:
                   the page decides, this component only asks. The Supplier
                   form uses it to freeze the GST-registered billing address.
                   A page that supplies neither hook is unaffected. */
                const locked = cfg.isFieldReadOnly?.(f, data) === true;
                const shown = locked ? { ...f, readOnly: true } : f;
                return (
                  <div key={f.k} className={add ? 'flex items-end gap-1.5' : ''}>
                    <div className={add ? 'min-w-0 flex-1' : ''}>
                      <Field
                        f={shown}
                        value={f.parts ? joinParts(f) : data[f.k]}
                        error={f.parts ? (errors[f.k] || f.parts.map((k) => errors[k]).find(Boolean)) : errors[f.k]}
                        onChange={f.parts ? ((_k, v) => setParts(f, v)) : set}
                        onOptionChange={(option) => {
                          const patch = cfg.onOptionChange?.(f, option, data) || {};
                          setData((current) => ({
                            ...current,
                            ...patch,
                            ...(f.k === 'typeId' ? { _supplierTypeLabel: option?.label || '' } : {}),
                          }));
                        }}
                      />
                      {f.k === 'gstNo' && cfg.gstLookup && gstChecking && (
                        <div className="mt-1 text-xs text-inkmuted">Checking GST...</div>
                      )}
                      {f.k === 'gstNo' && cfg.gstLookup && gstMatch && (
                        <button
                          type="button"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-danger hover:underline"
                          onClick={useExistingSupplier}
                        >
                          <Icon name="check" size={14} /> GST already exists. Fetch all details
                        </button>
                      )}
                    </div>
                    {add && !locked && (
                      <button
                        type="button"
                        title={add.label || 'Add'}
                        aria-label={add.label || 'Add'}
                        className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand text-white hover:opacity-90"
                        onClick={() => setQuickAddField(f.k)}
                      >
                        <Icon name="plus" size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {wizard ? (
          /* Exactly one Submit in the whole flow, and it is on the last step.
             Next never touches the API - it only validates and advances - so
             an abandoned wizard leaves no half-written supplier behind, which
             is what the per-tab save used to do. */
          <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
            {active > 0 && (
              <button type="button" className="btn" onClick={goBack} disabled={saving}>
                <Icon name="back" size={14} /> Back
              </button>
            )}
            <span className="flex-1" />
            {isLastStep ? (
              <button type="button" className="btn btn-primary flex h-[38px] min-w-[160px] justify-center" onClick={submit} disabled={saving || gstChecking || !!gstMatch}>
                {saving ? <span className="spin" /> : <Icon name="save" size={14} />} Submit
              </button>
            ) : (
              <button type="button" className="btn btn-primary flex h-[38px] min-w-[160px] justify-center" onClick={goNext} disabled={saving}>
                Next <span aria-hidden="true">&rarr;</span>
              </button>
            )}
          </div>
        ) : (
          <button type="button" className="btn btn-primary mt-2 flex h-[38px] w-full max-w-[390px] justify-center" onClick={submit} disabled={saving || gstChecking || !!gstMatch}>
            {saving ? <span className="spin" /> : <Icon name="save" size={14} />} Submit
          </button>
        )}
      </div>
      </div>
    </>
  );
}

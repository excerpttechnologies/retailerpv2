// 'use client';
// import MultiSelect from './MultiSelect';
// import { useOptions, useCities } from './useOptions';

// function Label({ f }) {
//   /* ph = placeholder-only field: the original shows no label above these,
//      the text sits inside the input instead (Basic Information tab). */
//   if (f.ph) return null;
//   return (
//     <label className="f-label">
//       {f.label}
//       {f.req && !/\*$/.test(f.label) && <span className="f-req">*</span>}
//       {f.hint && <span className="f-hint">{f.hint}</span>}
//       {f.info && <span className="ml-1 text-brand-link">&#9432;</span>}
//     </label>
//   );
// }

// function RefField({ f, value, onChange, multi }) {
//   const { options, loading } = useOptions(f.ref);
//   return (
//     <MultiSelect
//       mode={multi ? 'multi' : 'single'}
//       options={options}
//       loading={loading}
//       value={multi ? (value || []) : (value || '')}
//       placeholder={f.placeholder || 'Select...'}
//       onChange={onChange}
//     />
//   );
// }

// function CityField({ f, value, onChange, multi }) {
//   /* cities come from /api/cities, not the ref map */
//   const options = useCities('');
//   return (
//     <MultiSelect
//       mode={multi ? 'multi' : 'single'}
//       options={options}
//       value={multi ? (value || []) : (value || '')}
//       placeholder={f.placeholder || 'Select City'}
//       onChange={onChange}
//     />
//   );
// }

// export default function Field({ f, value, error, onChange }) {
//   /* Written as literal class strings: Tailwind scans source text, so a class
//      assembled at runtime (`md:col-span-${n}`) would never be generated. */
//   const SPAN = { 2: 'md:col-span-2', 3: 'md:col-span-2 xl:col-span-3', all: 'col-span-full' };
//   const span = SPAN[f.span] || '';
//   const set = (v) => onChange(f.k, v);

//   let control = null;

//   switch (f.type) {
//     case 'textarea':
//       control = (
//         <textarea className="f-input f-textarea" value={value ?? ''} onChange={(e) => set(e.target.value)} />
//       );
//       break;

//     case 'select':
//       control = (
//         <select className="f-input" value={value ?? ''} onChange={(e) => set(e.target.value)}>
//           <option value="">{f.placeholder || 'Select...'}</option>
//           {(f.opts || []).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
//         </select>
//       );
//       break;

//     case 'radio':
//       control = (
//         <div className="f-radio-row">
//           {(f.opts || []).map((o) => (
//             <label key={o.v} className="f-radio">
//               <input
//                 type="radio"
//                 name={f.k}
//                 checked={(value ?? '') === o.v}
//                 onChange={() => set(o.v)}
//               />
//               {o.l}
//             </label>
//           ))}
//         </div>
//       );
//       break;

//     case 'ref':
//       control = <RefField f={f} value={value} onChange={set} />;
//       break;

//     case 'multiref':
//       control = <RefField f={f} value={value} onChange={set} multi />;
//       break;

//     case 'city':
//       control = <CityField f={f} value={value} onChange={set} />;
//       break;

//     case 'multicity':
//       control = <CityField f={f} value={value} onChange={set} multi />;
//       break;

//     case 'date':
//       control = (
//         <input
//           type="date" className="f-input"
//           value={value ? String(value).slice(0, 10) : ''}
//           onChange={(e) => set(e.target.value)}
//         />
//       );
//       break;

//     case 'number':
//       control = (
//         <input
//           type="number" className="f-input" value={value ?? ''}
//           onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))}
//         />
//       );
//       break;

//     case 'file':
//       control = (
//         <div className="flex h-9 items-center gap-2 rounded-md border border-linestrong bg-white px-1 text-[13px]">
//           <span className="rounded bg-[#eff2f7] px-2 py-1">Choose Files</span>
//           <span className="text-inkmuted">{value ? String(value) : 'No file chosen'}</span>
//           <input type="file" className="hidden" onChange={(e) => set(e.target.files?.[0]?.name || '')} />
//         </div>
//       );
//       break;

//     case 'checkbox':
//       control = (
//         <label className="f-radio-row gap-2 text-[13.5px]">
//           <input type="checkbox" checked={!!value} onChange={(e) => set(e.target.checked)} />
//           {f.label}
//         </label>
//       );
//       break;

//     case 'password':
//       control = (
//         <input
//           type="password" className="f-input" value={value ?? ''}
//           placeholder={f.placeholder || (f.ph ? f.label : '')}
//           onChange={(e) => set(e.target.value)}
//         />
//       );
//       break;

//     default:
//       control = (
//         <input
//           type="text" className="f-input" value={value ?? ''}
//           readOnly={!!f.readOnly} placeholder={f.placeholder || (f.ph ? f.label : '')}
//           onChange={(e) => set(e.target.value)}
//         />
//       );
//   }

//   return (
//     <div className={span}>
//       <Label f={f} />
//       {control}
//       {error && <div className="f-err">{error}</div>}
//     </div>
//   );
// }









'use client';
import { useState, useEffect, useRef } from 'react';
import MultiSelect from './MultiSelect';
import { useOptions, useCities } from './useOptions';
import { compressImage, prettyBytes } from '@/lib/imageFile';

function Label({ f }) {
  /* ph = placeholder-only field: the original shows no label above these,
     the text sits inside the input instead (Basic Information tab). */
  if (f.ph) return null;
  return (
    <label className="f-label">
      {f.label}
      {f.req && !/\*$/.test(f.label) && <span className="f-req">*</span>}
      {f.hint && <span className="f-hint">{f.hint}</span>}
      {f.info && <span className="ml-1 text-brand-link">&#9432;</span>}
    </label>
  );
}

function RefField({ f, value, onChange, multi }) {
  const { options, loading } = useOptions(f.ref);
  return (
    <MultiSelect
      mode={multi ? 'multi' : 'single'}
      options={options}
      loading={loading}
      value={multi ? (value || []) : (value || '')}
      placeholder={f.placeholder || 'Select...'}
      onChange={onChange}
    />
  );
}

/* ==========================================================================
   File / image picker.

   The old version rendered a styled span next to a `hidden` <input type=
   "file"> with nothing connecting the two - no <label>, no ref, no click
   handler - so the button was decorative and the picker never opened. It
   also stored only `file.name`, discarding the file itself.

   Wrapping the input in a <label> fixes both the mouse and the keyboard,
   and needs no ref.

   The file is POSTed to /api/upload, which writes it to disk and returns a
   short URL; that URL is what gets stored in the record, so Item.image and
   the waybill fields keep their existing String type. Images are downscaled
   first (lib/imageFile.js) - that is bandwidth and disk, not storage policy.

   Values that are already data URIs still preview, so anything saved before
   server-side storage existed keeps rendering.
   ========================================================================== */
function FileField({ f, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [meta, setMeta] = useState(null); // { name, size } for this session

  const wantsImage = String(f.accept || '').includes('image');
  const stored = typeof value === 'string' ? value : '';
  const isUploaded = stored.startsWith('/api/files/');
  const isLegacyDataUrl = stored.startsWith('data:image/');
  const canPreview = isLegacyDataUrl || (isUploaded && /\.(jpg|png|webp|gif)$/i.test(stored));

  async function upload(blob, filename) {
    const body = new FormData();
    body.append('file', blob, filename);
    const r = await fetch('/api/upload', { method: 'POST', body });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Upload failed.');
    return d;
  }

  async function pick(e) {
    const file = e.target.files?.[0];
    /* let the same file be chosen again after a Remove */
    e.target.value = '';
    if (!file) return;

    setErr('');
    setBusy(true);
    try {
      let blob = file;
      let name = file.name;

      if (wantsImage) {
        const out = await compressImage(file, {
          maxDim: f.maxDim,
          maxBytes: f.maxKb ? f.maxKb * 1024 : undefined,
        });
        blob = out.blob;
        /* the canvas re-encodes to JPEG, so the name must follow or the
           server picks the extension from a type that no longer matches */
        if (out.type === 'image/jpeg' && !/\.jpe?g$/i.test(name)) {
          name = name.replace(/\.[^.]+$/, '') + '.jpg';
        }
      }

      const saved = await upload(blob, name);
      onChange(saved.url);
      setMeta({ name: file.name, size: saved.size });
    } catch (ex) {
      setErr(ex.message || 'Could not upload that file.');
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    /* only the reference is dropped. The file itself is content-addressed
       and may be shared with another record, so it is left on disk - see
       the note on orphans in lib/uploads.js. */
    onChange('');
    setMeta(null);
    setErr('');
  }

  const caption = meta
    ? meta.name + (meta.size ? ' (' + prettyBytes(meta.size) + ')' : '')
    : isUploaded
      ? 'Stored file'
      : isLegacyDataUrl
        ? 'Embedded image'
        : stored || 'No file chosen';

  return (
    <div>
      <div className="flex items-center gap-2">
        <label
          className={
            'flex h-9 flex-1 items-center gap-2 overflow-hidden rounded-md border border-linestrong bg-white px-1 text-[13px] '
            + (busy ? 'cursor-wait opacity-60' : 'cursor-pointer hover:border-brand')
          }
        >
          <span className="shrink-0 rounded bg-[#eff2f7] px-2 py-1">
            {busy ? 'Uploading...' : wantsImage ? 'Choose Image' : 'Choose File'}
          </span>
          <span className="truncate text-inkmuted">{caption}</span>
          <input
            type="file"
            className="hidden"
            accept={f.accept || undefined}
            disabled={busy}
            onChange={pick}
          />
        </label>

        {stored && !busy && (
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded border border-linestrong px-2 py-1 text-[12px] text-inkmuted hover:border-danger hover:text-danger"
          >
            Remove
          </button>
        )}
      </div>

      {canPreview && (
        /* eslint-disable-next-line @next/next/no-img-element -- these are
           session-gated app routes, not something next/image can optimise */
        <img
          src={stored}
          alt=""
          className="mt-2 h-20 w-20 rounded border border-line object-cover"
        />
      )}

      {isUploaded && !canPreview && (
        <a
          href={stored}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-[12px] text-brand-link hover:underline"
        >
          Open attachment
        </a>
      )}

      {err && <div className="f-err">{err}</div>}
    </div>
  );
}

function CityField({ f, value, onChange, multi }) {
  /* cities come from /api/cities, not the ref map */
  const options = useCities('');
  return (
    <MultiSelect
      mode={multi ? 'multi' : 'single'}
      options={options}
      value={multi ? (value || []) : (value || '')}
      placeholder={f.placeholder || 'Select City'}
      onChange={onChange}
    />
  );
}

/* PIN code with address lookup - `type: 'zip'`.

   f.fill maps what /api/pincode returns onto this form's own keys:
     fill: { city: 'billingCity', state: 'billingState',
             country: 'billingCountry', district: 'billingDistrict' }
   Only the keys listed in f.fill are written, so the Shipping block points the
   same control at its own four fields. Without f.fill this is a plain digits
   box and no lookup runs.

   Nothing is fetched until six digits are present, and the call is debounced,
   so typing "560001" fires one request rather than one per keystroke. */
function PincodeField({ f, value, onChange, patch }) {
  const [status, setStatus] = useState(null);
  const latest = useRef(0);

  const pin = String(value ?? '').trim();

  useEffect(() => {
    if (!f.fill) return;
    if (!/^\d{6}$/.test(pin)) { setStatus(null); return; }

    const ticket = ++latest.current;
    setStatus({ text: 'Looking up ' + pin + '…' });

    const t = setTimeout(() => {
      fetch('/api/pincode?pin=' + encodeURIComponent(pin))
        .then((r) => r.json())
        .then((d) => {
          /* a slow earlier request must not land on top of a newer one */
          if (ticket !== latest.current) return;
          if (!d.found) { setStatus({ err: true, text: d.reason || 'Not found.' }); return; }

          const next = {};
          Object.entries(f.fill).forEach(([from, key]) => {
            if (d[from]) next[key] = d[from];
          });
          patch(next);
          setStatus({ text: [d.district, d.state].filter(Boolean).join(', ') || 'Found' });
        })
        .catch(() => {
          if (ticket === latest.current) setStatus({ err: true, text: 'Lookup failed.' });
        });
    }, 450);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        className="f-input"
        value={value ?? ''}
        placeholder={f.placeholder || (f.ph ? f.label : '')}
        /* digits only - the lookup keys off exactly six of them */
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />
      {status && (
        <div className={'mt-1 text-[11.5px] ' + (status.err ? 'text-danger' : 'text-inkmuted')}>
          {status.text}
        </div>
      )}
    </>
  );
}

export default function Field({ f, value, error, onChange }) {
  /* Written as literal class strings: Tailwind scans source text, so a class
     assembled at runtime (`md:col-span-${n}`) would never be generated. */
  const SPAN = { 2: 'md:col-span-2', 3: 'md:col-span-2 xl:col-span-3', all: 'col-span-full' };
  /* f.row forces this field to open a new grid row instead of flowing on after
     the previous one. The Agent Basic tab needs it: Type sits alone above Short
     Name, which sits alone above the six-across name row, and none of those
     three rows fills its track count. */
  const span = (SPAN[f.span] || '') + (f.row ? ' xl:col-start-1' : '');
  const set = (v) => onChange(f.k, v);
  /* the PIN code lookup writes City / State / Country / District in one go.
     No parent had to change for this: every consumer of Field passes an
     onChange of (key, value) backed by a functional setState, so back-to-back
     calls merge instead of clobbering each other. */
  const patch = (obj) => Object.entries(obj).forEach(([k, v]) => onChange(k, v));

  let control = null;

  switch (f.type) {
    case 'textarea':
      control = (
        <textarea className="f-input f-textarea" value={value ?? ''} onChange={(e) => set(e.target.value)} />
      );
      break;

    case 'select':
      control = (
        <select className="f-input" value={value ?? ''} onChange={(e) => set(e.target.value)}>
          <option value="">{f.placeholder || 'Select...'}</option>
          {(f.opts || []).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      );
      break;

    case 'radio':
      control = (
        <div className="f-radio-row">
          {(f.opts || []).map((o) => (
            <label key={o.v} className="f-radio">
              <input
                type="radio"
                name={f.k}
                checked={(value ?? '') === o.v}
                onChange={() => set(o.v)}
              />
              {o.l}
            </label>
          ))}
        </div>
      );
      break;

    case 'ref':
      control = <RefField f={f} value={value} onChange={set} />;
      break;

    case 'multiref':
      control = <RefField f={f} value={value} onChange={set} multi />;
      break;

    case 'zip':
      control = <PincodeField f={f} value={value} onChange={set} patch={patch} />;
      break;

    case 'city':
      control = <CityField f={f} value={value} onChange={set} />;
      break;

    case 'multicity':
      control = <CityField f={f} value={value} onChange={set} multi />;
      break;

    case 'date':
      control = (
        <input
          type="date" className="f-input"
          value={value ? String(value).slice(0, 10) : ''}
          onChange={(e) => set(e.target.value)}
        />
      );
      break;

    case 'number':
      control = (
        <input
          type="number" className="f-input" value={value ?? ''}
          onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))}
        />
      );
      break;

    case 'file':
      control = <FileField f={f} value={value} onChange={set} />;
      break;

    case 'checkgroup': {
      /* several fixed options, any number tickable - Freight, Auto Charges
         Mode and Tips Mode on the Transporter form */
      const picked = Array.isArray(value) ? value : [];
      control = (
        <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-md border border-linestrong bg-white px-3 py-2">
          {(f.opts || []).map((o) => (
            <label key={o.v} className="flex cursor-pointer items-center gap-1.5 text-[13px]">
              <input
                type="checkbox"
                checked={picked.includes(o.v)}
                onChange={() =>
                  set(picked.includes(o.v) ? picked.filter((x) => x !== o.v) : [...picked, o.v])
                }
              />
              {o.l}
            </label>
          ))}
        </div>
      );
      break;
    }

    case 'checkbox':
      control = (
        <label className="f-radio-row gap-2 text-[13.5px]">
          <input type="checkbox" checked={!!value} onChange={(e) => set(e.target.checked)} />
          {f.label}
        </label>
      );
      break;

    case 'password':
      control = (
        <input
          type="password" className="f-input" value={value ?? ''}
          placeholder={f.placeholder || (f.ph ? f.label : '')}
          onChange={(e) => set(e.target.value)}
        />
      );
      break;

    default:
      control = (
        <input
          type="text" className="f-input" value={value ?? ''}
          readOnly={!!f.readOnly} placeholder={f.placeholder || (f.ph ? f.label : '')}
          onChange={(e) => set(e.target.value)}
        />
      );
  }

  return (
    <div className={span}>
      <Label f={f} />
      {control}
      {error && <div className="f-err">{error}</div>}
    </div>
  );
}
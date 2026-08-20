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
import MultiSelect from './MultiSelect';
import { useOptions, useCities } from './useOptions';

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

export default function Field({ f, value, error, onChange }) {
  /* Written as literal class strings: Tailwind scans source text, so a class
     assembled at runtime (`md:col-span-${n}`) would never be generated. */
  const SPAN = { 2: 'md:col-span-2', 3: 'md:col-span-2 xl:col-span-3', all: 'col-span-full' };
  const span = SPAN[f.span] || '';
  const set = (v) => onChange(f.k, v);

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
      control = (
        <div className="flex h-9 items-center gap-2 rounded-md border border-linestrong bg-white px-1 text-[13px]">
          <span className="rounded bg-[#eff2f7] px-2 py-1">Choose Files</span>
          <span className="text-inkmuted">{value ? String(value) : 'No file chosen'}</span>
          <input type="file" className="hidden" onChange={(e) => set(e.target.files?.[0]?.name || '')} />
        </div>
      );
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
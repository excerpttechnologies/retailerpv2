'use client';
import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Icon from './Icon';

/* Import Supplier Data - GSTIN lookup and Excel, sharing one review step.

   Both sources end at the same confirmation table rather than writing into the
   form directly. That is what keeps the promise in the brief: a value the
   operator typed by hand is never replaced without them agreeing to it. A row
   whose field is still empty is ticked by default (nothing to lose); a row that
   would overwrite something is left UNticked, so applying it is a deliberate
   act. Untouched fields are not in the patch at all.

   Nothing here saves. The chosen values land in the form's state and the
   supplier is written only when the wizard's final Submit runs. */

/* GSTIN -> supplier form. The right-hand side is a real key in the supplier
   TABS; anything the form has no home for (state code, registration date,
   taxpayer type) is shown in the review table as read-only context. */
const GST_TO_FIELD = {
  gstin: 'gstNo',
  legalName: 'businessName',
  tradeName: 'shortName',
  addressLine1: 'billingAddressLine1',
  addressLine2: 'billingAddressLine2',
  city: 'billingCity',
  state: 'billingState',
  country: 'billingCountry',
  pincode: 'billingZipCode',
  mobile: 'billingMobile',
  email: 'billingEmail',
};

const GST_CONTEXT_ONLY = [
  ['stateCode', 'State Code'],
  ['taxpayerType', 'Taxpayer Type'],
  ['registrationDate', 'Registration Date'],
  ['status', 'Status'],
];

/* Excel headers -> supplier form. Matched on a squashed lowercase form of the
   header, so "Contact Number", "contact_number" and "CONTACT NUMBER" are the
   same column. Several spellings map to one field because these sheets come
   from different vendors. */
const EXCEL_ALIASES = {
  businessName: ['suppliername', 'supplier', 'businessname', 'name', 'partyname', 'legalname'],
  shortName: ['shortname', 'tradename', 'alias'],
  gstNo: ['gstin', 'gstno', 'gst', 'gstnumber'],
  billingAddressLine1: ['address', 'addressline1', 'address1', 'billingaddress'],
  billingAddressLine2: ['addressline2', 'address2'],
  billingCity: ['city', 'town', 'district'],
  billingState: ['state'],
  billingZipCode: ['pincode', 'pin', 'zipcode', 'zip', 'postalcode'],
  billingCountry: ['country'],
  billingMobile: ['contactnumber', 'mobile', 'mobileno', 'phone', 'phoneno', 'contact'],
  billingAlternateContactNumber: ['alternatecontactnumber', 'alternatecontact', 'altcontact', 'alternatemobile'],
  billingEmail: ['email', 'emailid', 'emailaddress'],
  billingEmail2: ['email2', 'alternateemail', 'secondaryemail'],
  billingWebsiteUrl: ['website', 'websiteurl', 'url', 'web'],
  billingLandline: ['landline', 'telephone'],
  billingFax: ['fax'],
  pan: ['pan', 'panno', 'pannumber'],
};

const squash = (v) => String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const FIELD_BY_HEADER = (() => {
  const map = new Map();
  Object.entries(EXCEL_ALIASES).forEach(([field, aliases]) => {
    aliases.forEach((a) => { if (!map.has(a)) map.set(a, field); });
  });
  return map;
})();

function readWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) throw new Error('That workbook has no sheets.');
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
        const headers = (rows.shift() || []).map((h) => String(h ?? '').trim());
        if (!headers.some(Boolean)) throw new Error('The first row must contain column headings.');
        const body = rows.filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
        if (!body.length) throw new Error('The sheet has headings but no data rows.');
        resolve({ headers, rows: body });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsArrayBuffer(file);
  });
}

/* One sheet row -> {field: value}, plus the headings we could not place, so
   the review step can say what was ignored instead of dropping it silently. */
function mapExcelRow(headers, row) {
  const values = {};
  const unmapped = [];
  headers.forEach((header, i) => {
    const raw = String(row[i] ?? '').trim();
    const field = FIELD_BY_HEADER.get(squash(header));
    if (!field) { if (header && raw) unmapped.push(header); return; }
    if (raw && !values[field]) values[field] = raw;
  });
  return { values, unmapped };
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className={'flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-lg bg-white shadow-xl ' + (wide ? 'max-w-[760px]' : 'max-w-[460px]')}>
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3">
          <span className="text-[15px] font-bold uppercase tracking-wide">{title}</span>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-inkmuted" aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function SupplierImportPanel({ data = {}, labels = {}, onApply }) {
  const [mode, setMode] = useState(null);          // 'gst' | 'excel' | null
  const [gstin, setGstin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState(null);      // { source, rows, context, unmapped }
  const [chosen, setChosen] = useState({});        // field -> boolean
  const fileRef = useRef(null);

  const labelFor = (k) => labels[k] || k;
  const close = () => { setMode(null); setError(''); setReview(null); setChosen({}); setGstin(''); };

  /* Build the review table from a {field: value} patch. A row is pre-ticked
     only when the form field is currently empty - see the note at the top. */
  function openReview(source, values, context = [], unmapped = []) {
    const rows = Object.entries(values)
      .filter(([, v]) => String(v ?? '').trim() !== '')
      .map(([field, incoming]) => {
        const current = String(data[field] ?? '');
        return { field, incoming: String(incoming), current, conflict: current.trim() !== '' && current !== String(incoming) };
      })
      .filter((r) => r.current !== r.incoming);

    if (!rows.length) {
      setError('Nothing new to import - the form already holds these values.');
      return;
    }
    setChosen(Object.fromEntries(rows.map((r) => [r.field, !r.conflict])));
    setReview({ source, rows, context, unmapped });
    setError('');
  }

  async function fetchGst() {
    const code = gstin.trim().toUpperCase();
    if (!code) { setError('Enter a GSTIN.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/gst/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin: code }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.requires
          ? `${payload.error} Ask your administrator to set ${payload.requires.join(' and ')} on the server.`
          : (payload.error || 'GST lookup failed.'));
        return;
      }
      const values = {};
      Object.entries(GST_TO_FIELD).forEach(([from, field]) => {
        const v = payload.data?.[from];
        if (v) values[field] = v;
      });
      const context = GST_CONTEXT_ONLY
        .map(([k, label]) => [label, payload.data?.[k]])
        .filter(([, v]) => v);
      openReview('GST', values, context);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  async function pickExcel(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try {
      const { headers, rows } = await readWorkbook(file);
      /* one supplier per import - this panel fills the form in front of the
         user, so the first data row is the one being edited */
      const { values, unmapped } = mapExcelRow(headers, rows[0]);
      if (!Object.keys(values).length) {
        setError('None of the column headings matched a supplier field. Expected headings such as Supplier Name, GSTIN, Address, City, State, Pincode.');
        return;
      }
      const context = rows.length > 1
        ? [['Note', `The sheet has ${rows.length} rows; the first one is shown. Import the rest from the supplier list.`]]
        : [];
      openReview('Excel', values, context, unmapped);
    } catch (e) {
      setError(e.message || 'Could not read that workbook.');
    } finally {
      setBusy(false);
    }
  }

  function applyChosen() {
    const patch = {};
    review.rows.forEach((r) => { if (chosen[r.field]) patch[r.field] = r.incoming; });
    onApply(patch, review.source);
    close();
  }

  const chosenCount = review ? review.rows.filter((r) => chosen[r.field]).length : 0;

  return (
    <div className="mb-4">
      <div className="mb-3 flex items-center border-b border-line bg-[#f7f9fc] px-3 py-2">
        <span className="text-[14px] font-bold">Import Supplier Data</span>
      </div>
      <div className="flex flex-wrap gap-2 px-3">
        <button type="button" className="btn" onClick={() => { setMode('gst'); setError(''); }}>
          <Icon name="search" size={14} /> Import from GST
        </button>
        <button type="button" className="btn" onClick={() => { setMode('excel'); setError(''); fileRef.current?.click(); }}>
          <Icon name="file" size={14} /> Import from Excel
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={pickExcel} className="hidden" />
      </div>

      {/* GSTIN entry - only until the review table takes over */}
      {mode === 'gst' && !review && (
        <Modal title="Import from GST" onClose={close}>
          <div className="p-5">
            <label className="mb-1 block text-[13px] font-semibold">GSTIN</label>
            <input
              value={gstin}
              autoFocus
              placeholder="Enter GSTIN, e.g. 22AAAAA0000A1Z5"
              maxLength={15}
              onChange={(e) => { setGstin(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchGst(); } }}
              className="h-9 w-full rounded-md border border-linestrong px-2.5 text-[13.5px] uppercase"
            />
            {error && <div className="flash flash-err mt-3">{error}</div>}
            <button type="button" className="btn btn-primary mt-4 flex h-[38px] w-full justify-center" onClick={fetchGst} disabled={busy}>
              {busy ? <span className="spin" /> : <Icon name="search" size={14} />} Fetch Details
            </button>
          </div>
        </Modal>
      )}

      {/* Excel picker is the OS dialog, so only an error needs a surface */}
      {mode === 'excel' && !review && error && (
        <Modal title="Import from Excel" onClose={close}>
          <div className="p-5">
            <div className="flash flash-err">{error}</div>
            <button type="button" className="btn mt-3 flex h-[38px] w-full justify-center" onClick={() => fileRef.current?.click()}>
              <Icon name="file" size={14} /> Choose another file
            </button>
          </div>
        </Modal>
      )}

      {review && (
        <Modal title={review.source + ' Import Preview'} onClose={close} wide>
          <div className="flex-1 overflow-y-auto p-5">
            <p className="mb-3 text-[13px] text-inkmuted">
              Tick the values to bring into the form. Rows that would replace something you already
              entered are left unticked. Nothing is saved until you Submit on the last step.
            </p>

            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f7f9fc] text-left">
                  <th className="border border-line px-2 py-2 w-10"> </th>
                  <th className="border border-line px-2 py-2">Field</th>
                  <th className="border border-line px-2 py-2">Current</th>
                  <th className="border border-line px-2 py-2">Incoming</th>
                </tr>
              </thead>
              <tbody>
                {review.rows.map((r) => (
                  <tr key={r.field} className={r.conflict ? 'bg-[#fff8e6]' : ''}>
                    <td className="border border-line px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!chosen[r.field]}
                        onChange={(e) => setChosen((c) => ({ ...c, [r.field]: e.target.checked }))}
                        aria-label={'Import ' + labelFor(r.field)}
                      />
                    </td>
                    <td className="border border-line px-2 py-2 font-semibold">
                      {labelFor(r.field)}
                      {r.conflict && <span className="ml-1 text-[11px] font-normal text-danger">(will replace)</span>}
                    </td>
                    <td className="border border-line px-2 py-2 text-inkmuted">{r.current || '—'}</td>
                    <td className="border border-line px-2 py-2">{r.incoming}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {review.context.length > 0 && (
              <div className="mt-4">
                <div className="mb-1 text-[13px] font-bold">Also returned</div>
                <table className="w-full border-collapse text-[13px]">
                  <tbody>
                    {review.context.map(([label, value]) => (
                      <tr key={label}>
                        <td className="border border-line px-2 py-1.5 font-semibold">{label}</td>
                        <td className="border border-line px-2 py-1.5">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-1 text-[12px] text-inkmuted">Shown for reference - the supplier form has no field for these.</p>
              </div>
            )}

            {review.unmapped?.length > 0 && (
              <p className="mt-3 text-[12px] text-inkmuted">
                Ignored columns: {review.unmapped.join(', ')} - no matching supplier field.
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-5 py-3">
            <button type="button" className="btn" onClick={close}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={applyChosen} disabled={chosenCount === 0}>
              <Icon name="check" size={14} /> Import {chosenCount} field{chosenCount === 1 ? '' : 's'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

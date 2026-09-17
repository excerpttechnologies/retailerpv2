'use client';
import { Fragment, useCallback, useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { useScope } from '@/components/ScopeContext';

/* Inter Company Sell -> Receive Delivery Challan.

   The INBOX of whichever branch is selected in the top bar: challans another
   branch raised and addressed HERE, each with one button to accept it.

   Not a ListView. This screen creates nothing - there is no ADD - and its row
   action is "Receive", which ListView has no hook for. Bending a component
   every other list depends on, for one screen, is the worse trade; this calls
   /api/ic-receive-delivery-challan directly instead.

   Changing Business or Location in the top bar changes whose inbox this is.

   Receiving records ACCEPTANCE only - no stock is moved. See the note on the
   API route for why. */

const money = (v) => Number(v || 0).toFixed(2);
const day = (v) => (v ? new Date(v).toLocaleDateString('en-GB') : '-');

export default function ReceiveDeliveryChallanPage() {
  const scope = useScope();

  const [rows, setRows] = useState([]);
  const [labels, setLabels] = useState({});
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);
  const [openRow, setOpenRow] = useState(null);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState('pending');

  const label = (id) => labels[String(id)] || '-';

  const load = useCallback(async () => {
    if (!scope.business) { setRows([]); return; }
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        business: scope.business,
        location: scope.location || '',
        finYear: scope.finYear || '',
        received: tab === 'received' ? 'yes' : 'no',
        perPage: '100',
      });
      const r = await fetch('/api/ic-receive-delivery-challan?' + qs, { cache: 'no-store' });
      const d = await r.json();
      setRows(Array.isArray(d.rows) ? d.rows : []);
      setLabels(d.labels || {});
    } catch {
      setRows([]);
      setFlash({ type: 'err', msg: 'Could not load incoming challans.' });
    } finally {
      setLoading(false);
    }
  }, [scope.business, scope.location, scope.finYear, tab]);

  useEffect(() => { load(); }, [load]);

  async function receive(row) {
    setBusy(row._id);
    setFlash(null);
    try {
      const r = await fetch('/api/ic-receive-delivery-challan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row._id, business: scope.business }),
      });
      const d = await r.json();
      if (!r.ok) {
        setFlash({ type: 'err', msg: d.error || 'Could not receive this challan.' });
        return;
      }
      setFlash({ type: 'ok', msg: 'Challan ' + (row.dcNo || '') + ' received.' });
      setOpenRow(null);
      load();
    } catch {
      setFlash({ type: 'err', msg: 'Could not receive this challan.' });
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center border-b border-line pb-2">
        <span className="card-title">Receive Delivery Challans</span>
        <span className="flex-1" />
        <button type="button" className="btn" onClick={load}>
          <Icon name="refresh" size={14} /> Refresh
        </button>
      </div>

      {flash && (
        <div
          className={'mb-3 rounded border px-3 py-2 text-[13px] '
            + (flash.type === 'ok'
              ? 'border-green-300 bg-green-50 text-green-800'
              : 'border-danger bg-[#fdf1f1] text-danger')}
        >
          {flash.msg}
        </div>
      )}

      <div className="mb-3 flex gap-2">
        {[['pending', 'To Receive'], ['received', 'Received']].map(([key, text]) => (
          <button
            key={key}
            type="button"
            className={'btn h-8 px-3 text-[12px] ' + (tab === key ? 'btn-primary' : '')}
            onClick={() => { setTab(key); setOpenRow(null); }}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="dt">
          <thead>
            <tr>
              <th>#</th>
              <th>From Business</th>
              <th>DC No</th>
              <th>DC Date</th>
              <th>From Location</th>
              <th className="whitespace-nowrap text-center">Total Qty</th>
              <th className="whitespace-nowrap text-center">Total Value</th>
              <th>{tab === 'received' ? 'Received On' : 'Action'}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="dt-empty">Loading...</td></tr>}

            {!loading && !scope.business && (
              <tr><td colSpan={8} className="dt-empty">
                Select a Business in the top bar to see what is addressed to it.
              </td></tr>
            )}

            {!loading && scope.business && !rows.length && (
              <tr><td colSpan={8} className="dt-empty">
                {tab === 'received' ? 'Nothing received yet.' : 'Nothing to receive.'}
              </td></tr>
            )}

            {!loading && rows.map((row, i) => (
              <Fragment key={row._id}>
                <tr>
                  <td className="text-center">{i + 1}</td>
                  <td>
                    {/* the business name opens the lines - "show the detail
                        to receive" */}
                    <button
                      type="button"
                      className="text-brand-link hover:underline"
                      onClick={() => setOpenRow(openRow === row._id ? null : row._id)}
                    >
                      {label(row.businessId)}
                    </button>
                  </td>
                  <td>{row.dcNo || '-'}</td>
                  <td>{day(row.dcDate)}</td>
                  <td>{label(row.locationId)}</td>
                  <td className="whitespace-nowrap px-3 text-center">{money(row.totalQty)}</td>
                  <td className="whitespace-nowrap px-3 text-center">{money(row.netValue)}</td>
                  <td>
                    {tab === 'received' ? day(row.receivedAt) : (
                      <button
                        type="button"
                        className="btn btn-primary h-7 px-3 text-[12px]"
                        disabled={busy === row._id}
                        onClick={() => receive(row)}
                      >
                        {busy === row._id
                          ? <span className="spin" />
                          : <Icon name="check" size={12} />} Receive
                      </button>
                    )}
                  </td>
                </tr>

                {openRow === row._id && (
                  <tr>
                    <td colSpan={8} className="bg-[#f7f9fc] p-3">
                      <table className="dt">
                        <thead>
                          <tr>
                            <th>Sl No.</th>
                            <th>Barcode</th>
                            <th>Qty</th>
                            <th>UOM</th>
                            <th>HSN</th>
                            <th>Item Name / Description</th>
                            <th>RSP Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!(row.items || []).length && (
                            <tr><td colSpan={7} className="dt-empty">No items on this challan.</td></tr>
                          )}
                          {(row.items || []).map((line, n) => (
                            <tr key={n}>
                              <td className="text-center">{n + 1}</td>
                              <td>{line.barcodeNo || '-'}</td>
                              <td className="text-center">{money(line.qty)}</td>
                              <td>{line.uom || '-'}</td>
                              <td>{line.hsn || '-'}</td>
                              <td>{line.itemName || '-'}</td>
                              <td className="text-center">{money(line.unitRate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/session';
import { BarcodeLabel } from '@/lib/barcodeLabel';
import Item from '@/models/Item';
import ProductGroup from '@/models/ProductGroup';
import CompanyLocation from '@/models/CompanyLocation';
import {
  json, num, r2, scopeOf, pageOf, paged, salesDocuments,
  linesOf, lineItemCode, lineQty,
} from '@/lib/reports';

/* /api/reports/item-stock - read-only.

   Opening, inward, outward and closing stock for a window, three ways.

   HOW STOCK IS WORKED OUT. This project has no stock ledger - no model holds
   a running balance - so the movement is derived:

     inward   barcode rows created INSIDE the window (Barcode Generation is
              the only thing that puts stock in)
     opening  barcode rows created BEFORE the window
     outward  quantity sold in the window
     close    opening + inward - outward

   Outward reads 0.00 until the Sell screens capture line quantities, so
   closing stock currently equals everything ever received. That is the same
   compromise `availableQty` makes on the scan boxes, and it reads high for
   anything that has moved through the sell side.

   BarcodeLabel stores its scope as plain strings and its locationId is often
   blank, so a chosen location matches that location OR an unassigned one -
   filtering strictly would hide real stock. */

const rateOf = (r) => num(r.finalNet) || num(r.purRate);

export async function GET(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const sp = new URL(req.url).searchParams;
  await dbConnect();

  const scope = scopeOf(sp);
  const { page, perPage } = pageOf(sp);
  const tab = ['detailed', 'itemwise'].includes(sp.get('tab')) ? sp.get('tab') : 'groupwise';

  const from = sp.get('fromDate');
  const to = sp.get('toDate');
  if (!from || !to) return json({ error: 'Date From and Date To are required.' }, 422);

  const filter = {};
  if (scope.businessId) filter.businessId = String(scope.businessId);
  if (scope.finYear) filter.finYear = scope.finYear;
  if (scope.locationId) filter.locationId = { $in: [String(scope.locationId), '', null] };

  const rows = await BarcodeLabel.find(filter).limit(20000).lean();

  const start = new Date(from);
  const end = new Date(to + 'T23:59:59.999');

  /* ------------------------------------------------- outward, by item -- */
  const { sales } = await salesDocuments(sp, scope);
  const soldByCode = new Map();
  sales.forEach((d) => linesOf(d).forEach((l) => {
    const code = lineItemCode(l);
    if (!code) return;
    soldByCode.set(code, r2((soldByCode.get(code) || 0) + lineQty(l)));
  }));

  /* --------------------------------------------- inward and opening ---- */
  const byItem = new Map();
  const touch = (code) => {
    if (!byItem.has(code)) {
      byItem.set(code, {
        code, name: '', locationId: '', open: 0, inward: 0, rate: 0, rateN: 0,
      });
    }
    return byItem.get(code);
  };

  rows.forEach((r) => {
    const code = String(r.itemCode || '').trim();
    if (!code) return;
    const row = touch(code);
    if (!row.name) row.name = r.printDescription || r.supplierDescription || '';
    if (!row.locationId && r.locationId) row.locationId = String(r.locationId);

    const qty = num(r.qty) || 1;
    const when = r.createdAt ? new Date(r.createdAt) : null;

    if (!when || when < start) row.open += qty;
    else if (when <= end) row.inward += qty;

    /* average received rate, used to value closing stock */
    const rate = rateOf(r);
    if (rate) { row.rate += rate; row.rateN += 1; }
  });

  /* ------------------------------------------- resolve item and group -- */
  const codes = [...byItem.keys()];
  const items = codes.length
    ? await Item.find({
      itemCode: { $in: codes },
      ...(scope.businessId ? { businessId: scope.businessId } : {}),
    }).select('itemCode name subGroupId').lean()
    : [];
  const itemByCode = new Map(items.map((i) => [String(i.itemCode), i]));

  const groupIds = [...new Set(items.map((i) => i.subGroupId).filter(Boolean).map(String))];
  const groups = groupIds.length
    ? await ProductGroup.find({ _id: { $in: groupIds } }).select('name').lean()
    : [];
  const groupName = new Map(groups.map((g) => [String(g._id), g.name || '']));

  const locIds = [...new Set([...byItem.values()].map((r) => r.locationId).filter(Boolean))];
  const locs = locIds.length
    ? await CompanyLocation.find({ _id: { $in: locIds } }).select('name').lean()
    : [];
  const locName = new Map(locs.map((l) => [String(l._id), l.name || '']));

  /* ------------------------------------------------------- finish up --- */
  const finished = [...byItem.values()].map((r) => {
    const item = itemByCode.get(r.code);
    const outward = soldByCode.get(r.code) || 0;
    const close = r2(r.open + r.inward - outward);
    const rate = r.rateN ? r2(r.rate / r.rateN) : 0;
    return {
      code: r.code,
      itemName: item?.name || r.name || r.code,
      group: (item && groupName.get(String(item.subGroupId))) || '(ungrouped)',
      location: locName.get(r.locationId) || '(unassigned)',
      open: r2(r.open),
      inward: r2(r.inward),
      /* outward prints negative, as the deployed tile does */
      outward: r2(-outward),
      closeQty: close,
      closeValue: r2(close * rate),
    };
  });

  const sum = (list, k) => r2(list.reduce((a, x) => a + x[k], 0));

  /* ---------------------------------------------------------- shape ---- */
  const roll = (keyOf, extra) => {
    const acc = new Map();
    finished.forEach((r) => {
      const key = keyOf(r);
      if (!acc.has(key)) {
        acc.set(key, {
          _id: key, ...extra(r),
          open: 0, inward: 0, outward: 0, closeQty: 0, closeValue: 0,
        });
      }
      const row = acc.get(key);
      row.open += r.open;
      row.inward += r.inward;
      row.outward += r.outward;
      row.closeQty += r.closeQty;
      row.closeValue += r.closeValue;
    });
    return [...acc.values()].map((r) => ({
      ...r,
      open: r2(r.open), inward: r2(r.inward), outward: r2(r.outward),
      closeQty: r2(r.closeQty), closeValue: r2(r.closeValue),
    }));
  };

  let list;
  if (tab === 'itemwise') {
    list = finished.map((r) => ({ _id: r.code, ...r })).sort((a, b) => b.closeValue - a.closeValue);
  } else if (tab === 'detailed') {
    list = finished
      .map((r) => ({ _id: r.location + ':' + r.code, ...r }))
      .sort((a, b) => a.group.localeCompare(b.group) || b.closeValue - a.closeValue);
  } else {
    list = roll(
      (r) => r.location + '|' + r.group,
      (r) => ({ location: r.location, group: r.group })
    ).sort((a, b) => a.location.localeCompare(b.location) || a.group.localeCompare(b.group));
  }

  const groupCount = new Set(finished.map((r) => r.group)).size;
  const p = paged(list, page, perPage);

  return json({
    tiles: {
      totalGroups: groupCount,
      openQty: sum(finished, 'open'),
      inwardQty: sum(finished, 'inward'),
      outwardQty: sum(finished, 'outward'),
      closeQty: sum(finished, 'closeQty'),
      closeValue: sum(finished, 'closeValue'),
    },
    sections: [{
      rows: p.rows,
      count: p.total,
      totals: {
        open: sum(list, 'open'), inward: sum(list, 'inward'),
        outward: sum(list, 'outward'), closeQty: sum(list, 'closeQty'),
        closeValue: sum(list, 'closeValue'),
      },
    }],
    total: p.total,
    pages: p.pages,
    page,
    perPage,
  });
}

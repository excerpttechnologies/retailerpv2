import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import CompanyLocation from '@/models/CompanyLocation';
import { requireSession } from '@/lib/session';
import { allowedDestinations, isHub } from '@/lib/icRouting';

/* /api/ic-destinations?business=<the branch I am standing in>

   The branches this one may send inter company goods to, shaped like
   /api/options so a form can drop `options` straight into a <select>.

   Every other branch is offered - a child may name a sibling as the
   destination. The main branch's warehouse mediates that transfer, which is
   a property of the ROUTE, stamped on save; it is not a destination the
   operator picks. See lib/icRouting.js.

   `mediator` describes that warehouse so the screen can say so.

   `lockedLocation` applies only when the destination chosen IS the main
   branch: one of its locations is flagged as the mediator and only that one
   takes inter company goods, so the form pins Location to it rather than
   offering a list. The form applies it by comparing the picked destination
   against `hubBusinessId`. */

const json = (d, s = 200) => Response.json(d, {
  status: s,
  headers: { 'Cache-Control': 'no-store' },
});

export async function GET(req) {
  const session = await requireSession();
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const sp = new URL(req.url).searchParams;
  const business = sp.get('business');
  if (!business || !isValidObjectId(business)) return json({ role: 'unknown', options: [] });

  await dbConnect();

  const { role, hub, options } = await allowedDestinations(business);

  /* Only relevant when the main branch is itself the destination. The form
     checks the picked business against hubBusinessId before applying it -
     a sibling destination has its own locations and is picked as usual. */
  let lockedLocation = null;
  if (hub.location && !isHub(hub, business)) {
    lockedLocation = { value: String(hub.location._id), label: hub.location.name || '' };
  }

  /* Said plainly so the screen can explain itself rather than just offering
     one option with no reason. */
  const notes = [];
  if (!hub.business) notes.push('No main branch is configured.');
  else if (role === 'child') {
    notes.push('Pick the branch the goods are ultimately for. A transfer to another'
      + ' branch is routed through ' + (hub.location ? hub.location.name : 'the main branch warehouse')
      + ', which is recorded on the challan.');
    if (!hub.location) {
      notes.push('No location on ' + (hub.business.name || 'the main branch')
        + ' is marked as the Inter Company Mediator, so a transfer between two'
        + ' branches cannot be saved. Set one on Settings > Company Locations.');
    }
  }

  /* Fallback: the hub has locations but none is flagged yet. Offer them all
     rather than blocking the screen. */
  let hubLocations = [];
  if (role === 'child' && hub.business && !hub.location) {
    const rows = await CompanyLocation.find({ businessId: hub.business._id })
      .select('_id name').sort({ name: 1 }).lean();
    hubLocations = rows.map((l) => ({ value: String(l._id), label: l.name || '' }));
  }

  return json({
    role,
    options,
    lockedLocation,
    hubLocations,
    hubBusinessId: hub.business ? String(hub.business._id) : '',
    isStandingInHub: isHub(hub, business),
    mediator: hub.location
      ? { businessName: hub.business.name || '', locationName: hub.location.name || '' }
      : null,
    notes,
  });
}

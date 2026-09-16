import Business from '@/models/Business';
import CompanyLocation from '@/models/CompanyLocation';

/* ==========================================================================
   INTER COMPANY ROUTING — every transfer is mediated by the main branch.

   The rule the business works to:

     child  ──► MAIN BRANCH WAREHOUSE ──► child

   A child branch never ships STRAIGHT to another child: the goods pass
   through the main branch's warehouse, so the main branch's books see every
   movement between branches and there is one place that knows where stock
   actually is.

   WHAT THE SENDER PICKS. The sender names the branch the goods are ultimately
   for - SUVARNA raising a challan for OMSHREE picks OMSHREE. It does NOT pick
   the warehouse. The warehouse is not a destination anyone chooses; it is the
   mediator every transfer is routed through, and this module stamps it onto
   the document as `viaBusinessId` / `viaLocationId`.

   That is a change from the first cut of this module, which offered a child
   ONLY the main branch and made the operator raise the second leg by hand.
   The destination and the route are different questions, and conflating them
   meant the document never recorded where the goods were actually going.

   WHERE THE HIERARCHY COMES FROM. models/Business.js already carries
   `isMainBranch` and `parentBusinessId`, stamped by scripts/seed.mjs and by
   app/api/business/route.js and never accepted from a client. Until now
   nothing read them at runtime. This is the first module that does.

   WHICH LOCATION MEDIATES. The main branch has several locations and only one
   of them - the warehouse - takes inter company goods. That is flagged on
   models/CompanyLocation.js as `isMediator`, rather than matched by name, so
   renaming the warehouse cannot quietly break routing.
   ========================================================================== */

/* The main branch, and the location that mediates for it.
   `location` is null when no location has been flagged yet - the caller
   decides whether that is fatal. */
export async function resolveHub() {
  const business = await Business.findOne({ isMainBranch: true })
    .select('_id name gstin').lean();
  if (!business) return { business: null, location: null };

  const location = await CompanyLocation.findOne({
    businessId: business._id,
    isMediator: 'Yes',
  }).select('_id name').lean();

  return { business, location: location || null };
}

export const isHub = (hub, businessId) =>
  Boolean(hub.business && String(hub.business._id) === String(businessId));

/* Who `businessId` may send inter company goods to.

     standing in the MAIN branch -> every child
     standing in a CHILD        -> every OTHER branch, siblings included

   A sibling is a legitimate destination; it is simply not a legitimate direct
   ROUTE, which is what routeVia() below handles. The main branch itself stays
   on a child's list because sending goods up to the warehouse to sit there is
   an ordinary transfer in its own right.

   Returns rows shaped like /api/options so a form can drop them straight into
   a <select>. */
export async function allowedDestinations(businessId) {
  const hub = await resolveHub();
  if (!hub.business || !businessId) return { role: 'unknown', hub, options: [] };

  const standingInHub = isHub(hub, businessId);

  const others = await Business.find({ _id: { $ne: businessId } })
    .select('_id name').sort({ name: 1 }).lean();

  return {
    role: standingInHub ? 'hub' : 'child',
    hub,
    options: others.map((b) => ({ value: String(b._id), label: b.name || '(unnamed)' })),
  };
}

/* The mediator leg for a given pair.

   Returns null when the pair needs no mediator - one end already IS the main
   branch, so the goods move in a single hop. Otherwise returns the warehouse
   the transfer passes through, to be stamped on the document.

   Sibling-to-sibling is no longer refused. It is recorded as what it is:
   a transfer routed through the warehouse. */
export async function routeVia(fromBusinessId, toBusinessId) {
  const hub = await resolveHub();
  if (!hub.business) return null;
  if (isHub(hub, fromBusinessId) || isHub(hub, toBusinessId)) return null;

  return {
    viaBusinessId: hub.business._id,
    viaLocationId: hub.location ? hub.location._id : null,
    viaBusinessName: hub.business.name || '',
    viaLocationName: hub.location ? hub.location.name || '' : '',
  };
}

/* The guard the write routes call.

   Returns null when the pair is allowed, or a { error, code } object to be
   sent back as 422. Enforced on the SERVER as well as in the dropdown because
   every route in this module takes businessId and toBusinessId straight from
   the request body - a restricted <select> stops an honest mistake, not a
   crafted request. */
export async function checkHubRoute(fromBusinessId, toBusinessId) {
  if (!fromBusinessId || !toBusinessId) {
    return { error: 'Both the sending and receiving branch are required.', code: 'BAD_ROUTE' };
  }
  if (String(fromBusinessId) === String(toBusinessId)) {
    return { error: 'A branch cannot send inter company goods to itself.', code: 'SAME_BRANCH' };
  }

  const hub = await resolveHub();
  if (!hub.business) {
    return { error: 'No main branch is configured, so inter company routing cannot be checked.', code: 'NO_HUB' };
  }

  /* Sibling-to-sibling used to be refused here. It is now allowed and
     MEDIATED - routeVia() names the warehouse it passes through, and the
     write routes stamp that onto the document. So there is nothing left for
     this guard to reject beyond the two cases above.

     A main branch with no location flagged as the Inter Company Mediator is
     deliberately NOT fatal: the mediating BRANCH is still known, so the
     transfer is recorded and routed and only the warehouse's location id is
     left blank. Refusing the save instead would block every branch-to-branch
     transfer until somebody ticked a checkbox they have never been told
     about. */
  return null;
}

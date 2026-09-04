// 'use client';
// import { createContext, useContext, useEffect, useState } from 'react';

// /* The three top-bar selectors scope every query in the app:
//    business -> location -> financial year. */
// const ScopeContext = createContext(null);

// export const FIN_YEARS = ['2026-2027', '2025-2026', '2024-2025', '2023-2024'];

// export function ScopeProvider({ children }) {
//   const [businesses, setBusinesses] = useState([]);
//   const [locations, setLocations] = useState([]);
//   const [business, setBusiness] = useState('');
//   const [location, setLocation] = useState('');
//   const [finYear, setFinYear] = useState(FIN_YEARS[0]);
//   const [user, setUser] = useState(null);

//   useEffect(() => {
//     fetch('/api/auth/me')
//       .then((r) => (r.ok ? r.json() : { user: null }))
//       .then((d) => setUser(d.user))
//       .catch(() => {});
//   }, []);

//   useEffect(() => {
//     fetch('/api/options?ref=business')
//       .then((r) => r.json())
//       .then((d) => {
//         const list = d.options || [];
//         setBusinesses(list);
//         const saved = localStorage.getItem('orbit.business');
//         const pick = list.find((o) => o.value === saved) ? saved : list[0]?.value || '';
//         setBusiness(pick);
//       })
//       .catch(() => {});
//   }, []);

//   useEffect(() => {
//     if (!business) { setLocations([]); setLocation(''); return; }
//     localStorage.setItem('orbit.business', business);
//     fetch('/api/options?ref=companylocations&business=' + business)
//       .then((r) => r.json())
//       .then((d) => {
//         const list = d.options || [];
//         setLocations(list);
//         const saved = localStorage.getItem('orbit.location');
//         const pick = list.find((o) => o.value === saved) ? saved : list[0]?.value || '';
//         setLocation(pick);
//       })
//       .catch(() => {});
//   }, [business]);

//   useEffect(() => { if (location) localStorage.setItem('orbit.location', location); }, [location]);

//   const value = {
//     user,
//     businesses, locations, business, location, finYear,
//     setBusiness, setLocation, setFinYear,
//     // appended to every list/save request
//     query: () => new URLSearchParams({ business, location, finYear }).toString(),
//   };
//   return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
// }

// export function useScope() {
//   const ctx = useContext(ScopeContext);
//   if (!ctx) throw new Error('useScope must be used inside <ScopeProvider>');
//   return ctx;
// }












'use client';
import { createContext, useContext, useEffect, useState } from 'react';

/* The three top-bar selectors scope every query in the app:
   business -> location -> financial year. */
const ScopeContext = createContext(null);

export const FIN_YEARS = ['2026-2027', '2025-2026', '2024-2025', '2023-2024'];

export function ScopeProvider({ children }) {
  const [businesses, setBusinesses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [business, setBusiness] = useState('');
  const [location, setLocation] = useState('');
  const [finYear, setFinYear] = useState(FIN_YEARS[0]);
  const [user, setUser] = useState(null);

  /* Both selectors are filled in from /api/options one tick after mount, so
     `business` and `location` are '' on the first render of every screen.
     A consumer cannot tell that empty-because-still-loading apart from
     empty-because-there-is-none, and the two mean opposite things: the first
     must not be queried with, the second is a final answer. `businessReady`
     flips once /api/options?ref=business has settled (resolved or failed).

     Location is tracked as "which business the current location belongs to"
     rather than a plain boolean. A boolean set inside the effect is still
     true for the OLD business during the render that follows a business
     change - the effect has not run yet - and a consumer reading it then
     fires a request with a location that no longer applies. Comparing against
     `business` is correct on that very first render. */
  const [businessReady, setBusinessReady] = useState(false);
  const [locationsFor, setLocationsFor] = useState(null);
  const locationReady = locationsFor === business;

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/options?ref=business')
      .then((r) => r.json())
      .then((d) => {
        const list = d.options || [];
        setBusinesses(list);
        /* Every load starts on the main branch. /api/options flags it with
           isDefault and sorts it first; the fallback only matters on a
           database that hasn't been seeded, where no branch is marked main.

           The previously remembered choice is deliberately not restored -
           without that, the selector opened on whichever business sorted
           first alphabetically. */
        const main = list.find((o) => o.isDefault);
        setBusiness(main?.value || list[0]?.value || '');
      })
      .catch(() => {})
      .finally(() => setBusinessReady(true));
  }, []);

  useEffect(() => {
    if (!business) { setLocations([]); setLocation(''); setLocationsFor(business); return; }
    fetch('/api/options?ref=companylocations&business=' + business)
      .then((r) => r.json())
      .then((d) => {
        const list = d.options || [];
        setLocations(list);
        const saved = localStorage.getItem('orbit.location');
        
        /* Auto-select TEMPLE FABRICS WAREHOUSE on first load, but allow
           switching to other locations. The saved location is restored if
           it exists in the current business's location list. Otherwise,
           default to TEMPLE FABRICS WAREHOUSE if available, or fall back
           to the first location. */
        let pick = '';
        if (saved && list.find((o) => o.value === saved)) {
          pick = saved;
        } else {
          const warehouse = list.find((o) => 
            o.label && o.label.toUpperCase().includes('TEMPLE FABRICS WAREHOUSE')
          );
          pick = warehouse?.value || list[0]?.value || '';
        }
        setLocation(pick);
      })
      .catch(() => {})
      .finally(() => setLocationsFor(business));
  }, [business]);

  useEffect(() => { if (location) localStorage.setItem('orbit.location', location); }, [location]);

  const value = {
    user,
    businesses, locations, business, location, finYear,
    businessReady, locationReady,
    setBusiness, setLocation, setFinYear,
    // appended to every list/save request
    query: () => new URLSearchParams({ business, location, finYear }).toString(),
  };
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

export function useScope() {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error('useScope must be used inside <ScopeProvider>');
  return ctx;
}
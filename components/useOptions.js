'use client';
import { useEffect, useState } from 'react';
import { useScope } from './ScopeContext';

/* Loads {value,label} options for a ref name. Hits /api/options, which maps
   the name to a model - no page registry involved. */

export function useOptions(ref) {
  const { business, location } = useScope();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ref) return;
    setLoading(true);

    const qs = new URLSearchParams({ ref, business: business || '', location: location || '' });
    fetch('/api/options?' + qs)
      .then((r) => r.json())
      .then((d) => setOptions(d.options || []))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [ref, business, location]);

  return { options, loading };
}

export function useCities(term) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    const qs = new URLSearchParams({ q: term || '' });
    fetch('/api/cities?' + qs)
      .then((r) => r.json())
      .then((d) => setOptions(d.options || []))
      .catch(() => setOptions([]));
  }, [term]);

  return options;
}

import { useEffect, useState } from 'react';
import { brandsApi } from '../api/siteApi.js';

/**
 * Loads every brand (GET /brands: id = UUID, name, status) for the product form's Brand dropdown.
 * The API returns at most 100 per page, so it pages through. Only the brand's id is sent to the API (as brand_id).
 */
export default function useBrandOptions(enabled = true) {
  const [state, setState] = useState({ brands: [], loading: false, error: '' });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: '' }));
    (async () => {
      try {
        const all = [];
        let page = 1;
        let totalPages = 1;
        do {
          // eslint-disable-next-line no-await-in-loop
          const res = await brandsApi.list({ page, limit: 100 });
          all.push(...res.data);
          totalPages = res.meta?.totalPages || 1;
          page += 1;
        } while (page <= totalPages && page <= 50);
        all.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        if (!cancelled) setState({ brands: all.map((b) => ({ id: b.id, name: b.name, active: Number(b.status) === 1 })), loading: false, error: '' });
      } catch (err) {
        if (!cancelled) setState({ brands: [], loading: false, error: err.message || 'Could not load brands' });
      }
    })();
    return () => { cancelled = true; };
  }, [enabled]);

  return state;
}
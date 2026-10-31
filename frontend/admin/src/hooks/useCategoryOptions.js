import { useEffect, useState } from 'react';
import { listCategories } from '../api/categoryApi.js';

/** Loads every category (id + name) for dropdowns. The API returns at most 100 per page, so it pages through. */
export default function useCategoryOptions(reloadKey = 0) {
  const [state, setState] = useState({ categories: [], loading: true, error: '' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = [];
        let page = 1;
        let totalPages = 1;
        do {
          // eslint-disable-next-line no-await-in-loop
          const res = await listCategories({ page, limit: 100 });
          all.push(...res.data);
          totalPages = res.meta.totalPages;
          page += 1;
        } while (page <= totalPages && page <= 50);
        all.sort((a, b) => a.category_name.localeCompare(b.category_name));
        if (!cancelled) setState({ categories: all.map((c) => ({ id: c.id, name: c.category_name })), loading: false, error: '' });
      } catch (err) {
        if (!cancelled) setState({ categories: [], loading: false, error: err.message });
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  return state;
}
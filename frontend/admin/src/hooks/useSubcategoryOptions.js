import { useEffect, useState } from 'react';
import { listSubcategories } from '../api/subcategoryApi.js';

/**
 * Loads the subcategories of ONE category (id + name + brands) for dropdowns, straight from GET /subcategories?category_id=.
 * Nothing is loaded while no category is chosen. The API returns at most 100 per page, so it pages through.
 */
export default function useSubcategoryOptions(categoryId) {
  const [state, setState] = useState({ subcategories: [], loading: false, error: '' });

  useEffect(() => {
    if (!categoryId) {
      setState({ subcategories: [], loading: false, error: '' });
      return undefined;
    }
    let cancelled = false;
    setState({ subcategories: [], loading: true, error: '' });
    (async () => {
      try {
        const all = [];
        let page = 1;
        let totalPages = 1;
        do {
          // eslint-disable-next-line no-await-in-loop
          const res = await listSubcategories({ page, limit: 100, category_id: categoryId });
          all.push(...res.data);
          totalPages = res.meta.totalPages;
          page += 1;
        } while (page <= totalPages && page <= 50);
        all.sort((a, b) => a.subcategory_name.localeCompare(b.subcategory_name));
        if (!cancelled) {
          setState({
            subcategories: all.map((s) => ({ id: s.id, name: s.subcategory_name, brands: s.brand_names || [], active: Number(s.status) === 1 })),
            loading: false,
            error: '',
          });
        }
      } catch (err) {
        if (!cancelled) setState({ subcategories: [], loading: false, error: err.message });
      }
    })();
    return () => { cancelled = true; };
  }, [categoryId]);

  return state;
}

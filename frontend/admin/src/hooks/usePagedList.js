import { useCallback, useEffect, useState } from 'react';
import useDebounce from './useDebounce.js';

/** Search + filters + pagination state for an admin list. `list(params, signal)` must return { data, meta }. */
export default function usePagedList(list, { limit = 10 } = {}) {
  const [search, setSearch] = useState('');
  const dSearch = useDebounce(search);
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [key, setKey] = useState(0);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => setPage(1), [dSearch, filters]);
  useEffect(() => {
    const ctl = new AbortController();
    setLoading(true); setError('');
    list({ page, limit, search: dSearch, ...filters }, ctl.signal).then(
      (r) => { setRows(r.data); setMeta(r.meta); setLoading(false); },
      (e) => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false); } },
    );
    return () => ctl.abort();
  }, [list, page, limit, dSearch, filters, key]);

  return {
    rows, meta, loading, error, search, setSearch, filters, page, setPage,
    setFilter: (k, v) => setFilters((f) => ({ ...f, [k]: v })),
    reload: useCallback(() => setKey((k) => k + 1), []),
    patchRow: (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    hasFilters: Boolean(dSearch) || Object.values(filters).some(Boolean),
  };
}

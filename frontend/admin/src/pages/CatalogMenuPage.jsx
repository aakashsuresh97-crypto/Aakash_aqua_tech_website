import { useCallback, useEffect, useState } from 'react';
import Spinner from '../components/Spinner.jsx';
import ToastContainer from '../components/ToastContainer.jsx';
import { Badge, ListState, PageHeader } from '../components/ui.jsx';
import { RefreshIcon } from '../components/Icons.jsx';
import useToasts from '../hooks/useToasts.js';
import { listCatalogNodes, saveCatalogNode } from '../api/siteApi.js';

function Row({ node, type, indent, onSaved, toasts }) {
  const [v, setV] = useState({ slug: node.slug, sort_order: node.sort_order, show_in_menu: node.show_in_menu });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const dirty = v.slug !== node.slug || Number(v.sort_order) !== node.sort_order || v.show_in_menu !== node.show_in_menu;
  const id = `${type}-${node.id}`;
  async function save() {
    setBusy(true); setErr('');
    try {
      await saveCatalogNode(type, node.id, { slug: v.slug, sort_order: Number(v.sort_order), show_in_menu: v.show_in_menu });
      toasts.success(`“${node.name}” saved.`); onSaved();
    } catch (e) { setErr([e.message, ...(e.errors || [])].join(' ')); } finally { setBusy(false); }
  }
  return (
    <div className={`grid items-end gap-3 border-b border-slate-100 px-4 py-3 sm:grid-cols-[1fr_14rem_6rem_auto_auto] ${indent ? 'bg-slate-50/50 sm:pl-10' : ''}`}>
      <div className="min-w-0"><p className="truncate font-medium text-slate-900">{node.name}</p>
        {Number(node.status) !== 1 && <Badge>inactive</Badge>}{!node.has_custom_slug && <span className="ml-1 text-xs text-slate-400">auto slug</span>}</div>
      <div><label htmlFor={`${id}-slug`} className="mb-1 block text-xs text-slate-500">URL slug</label><input id={`${id}-slug`} className="input py-1.5" value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} /></div>
      <div><label htmlFor={`${id}-ord`} className="mb-1 block text-xs text-slate-500">Menu order</label><input id={`${id}-ord`} type="number" className="input py-1.5" value={v.sort_order} onChange={(e) => setV({ ...v, sort_order: e.target.value })} /></div>
      <label className="flex items-center gap-2 pb-2 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600" checked={v.show_in_menu} onChange={(e) => setV({ ...v, show_in_menu: e.target.checked })} /> In menu</label>
      <button type="button" className="btn-primary px-3 py-1.5" disabled={!dirty || busy} onClick={save}>{busy && <Spinner className="h-4 w-4" />} Save</button>
      {err && <p role="alert" className="text-xs text-red-600 sm:col-span-5">{err}</p>}
    </div>
  );
}

export default function CatalogMenuPage() {
  const toasts = useToasts();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);
  const reload = useCallback(() => setKey((k) => k + 1), []);
  useEffect(() => {
    let live = true;
    setLoading(true); setError('');
    listCatalogNodes().then((r) => { if (live) { setData(r.data); setLoading(false); } }, (e) => { if (live) { setError(e.message); setLoading(false); } });
    return () => { live = false; };
  }, [key]);

  return (
    <section aria-labelledby="menu-title">
      <PageHeader title={<span id="menu-title">Menu settings</span>} subtitle="URL slug, order and visibility of categories and subcategories on the public site's menu.">
        <button type="button" className="btn-secondary" onClick={reload} aria-label="Refresh menu settings"><RefreshIcon className="h-4 w-4" /></button>
      </PageHeader>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <ListState loading={loading} error={error} empty={!data || !data.categories.length} emptyText="No categories yet. Create categories first." onRetry={reload}>
          {data && data.categories.slice().sort((a, b) => a.sort_order - b.sort_order).map((c) => (
            <div key={c.id}>
              <Row node={c} type="categories" onSaved={reload} toasts={toasts} />
              {data.subcategories.filter((s) => s.category_id === c.id).sort((a, b) => a.sort_order - b.sort_order).map((s) => (
                <Row key={s.id} node={s} type="subcategories" indent onSaved={reload} toasts={toasts} />
              ))}
            </div>
          ))}
        </ListState>
      </div>
      <ToastContainer toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </section>
  );
}

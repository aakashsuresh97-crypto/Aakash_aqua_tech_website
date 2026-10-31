import { useCallback, useEffect, useState } from 'react';
import { ListState, PageHeader, money } from '../components/ui.jsx';
import { RefreshIcon } from '../components/Icons.jsx';
import { getDashboard } from '../api/siteApi.js';

function Card({ label, value, href, hint }) {
  return (
    <a href={href} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </a>
  );
}

export default function DashboardPage() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);
  const reload = useCallback(() => setKey((k) => k + 1), []);
  useEffect(() => {
    const ctl = new AbortController();
    setLoading(true); setError('');
    getDashboard(ctl.signal).then((r) => { setD(r.data); setLoading(false); }, (e) => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false); } });
    return () => ctl.abort();
  }, [key]);

  return (
    <section aria-labelledby="dash-title">
      <PageHeader title={<span id="dash-title">Dashboard</span>} subtitle="What needs attention today.">
        <button type="button" className="btn-secondary" onClick={reload} aria-label="Refresh dashboard"><RefreshIcon className="h-4 w-4" /></button>
      </PageHeader>
      <ListState loading={loading} error={error} empty={!d} onRetry={reload}>
        {d && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Card label="Leads today" value={d.today_leads} href="#/leads" hint={`${d.new_leads} new in total`} />
              <Card label="Orders today" value={d.today_orders} href="#/orders" hint={`Revenue ${money(d.today_revenue)}`} />
              <Card label="Orders to process" value={d.pending_orders} href="#/orders" hint="Placed, paid or COD" />
              <Card label="Service requests today" value={d.today_service_requests} href="#/service-requests" hint={`${d.open_service_requests} open`} />
              <Card label="Low stock" value={d.low_stock_products} href="#/products" />
              <Card label="Out of stock" value={d.out_of_stock_products} href="#/products" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Orders by status</h3>
                {Object.keys(d.orders_by_status).length === 0 ? <p className="text-sm text-slate-500">No orders yet.</p> : (
                  <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    {Object.entries(d.orders_by_status).map(([s, n]) => (
                      <div key={s} className="rounded-lg bg-slate-50 px-3 py-2"><dt className="capitalize text-slate-500">{s}</dt><dd className="font-semibold text-slate-900">{n}</dd></div>
                    ))}
                  </dl>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Low-stock products</h3>
                {d.low_stock_list.length === 0 ? <p className="text-sm text-slate-500">All products are above their low-stock level.</p> : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {d.low_stock_list.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                        <a href="#/products" className="min-w-0 truncate font-medium text-indigo-700 hover:underline" title="Open the Products screen and search for it">{p.product_name}</a>
                        <span className="shrink-0 text-xs text-slate-500">{p.sku || ''} · <span className={p.stock_quantity === 0 ? 'font-semibold text-red-600' : 'font-semibold text-amber-700'}>{p.stock_quantity} left</span> (alert at {p.low_stock_threshold})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </ListState>
    </section>
  );
}

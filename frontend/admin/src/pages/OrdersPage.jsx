import { useEffect, useState } from 'react';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import ToastContainer from '../components/ToastContainer.jsx';
import { Badge, DataTable, ErrorList, FilterBar, ListState, PageHeader, fmtDateTime, money } from '../components/ui.jsx';
import { EyeIcon, RefreshIcon } from '../components/Icons.jsx';
import usePagedList from '../hooks/usePagedList.js';
import useToasts from '../hooks/useToasts.js';
import { useIsAdmin } from '../auth/UserContext.js';
import { downloadInvoice, getOrder, listOrders, refundOrder, setOrderStatus } from '../api/siteApi.js';

const STATUSES = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PAY = ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'];
// Same flow as the server (placed -> confirmed -> shipped -> delivered; cancel before shipping)
const NEXT = { placed: ['confirmed', 'cancelled'], confirmed: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
const STATUS_TONE = { placed: 'blue', confirmed: 'indigo', shipped: 'amber', delivered: 'green', cancelled: 'slate' };
const PAY_TONE = { pending: 'amber', paid: 'green', failed: 'red', refunded: 'slate', partially_refunded: 'amber' };
const lbl = (s) => String(s).replace('_', ' ');
const FILTERS = [
  { name: 'status', label: 'Order status', options: STATUSES.map((s) => [s, s]) },
  { name: 'payment_status', label: 'Payment', options: PAY.map((s) => [s, lbl(s)]) },
  { name: 'payment_method', label: 'Method', options: [['razorpay', 'Razorpay'], ['cod', 'Cash on delivery']] },
  { name: 'from', label: 'From', type: 'date' },
  { name: 'to', label: 'To', type: 'date' },
];

function OrderDetail({ orderId, onClose, onChanged, toasts }) {
  const isAdmin = useIsAdmin();
  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);
  const [tracking, setTracking] = useState('');
  const [notes, setNotes] = useState('');
  const [refund, setRefund] = useState({ amount: '', reason: '' });

  // load once when opened
  useEffect(() => {
    let live = true;
    getOrder(orderId).then((r) => { if (live) { setOrder(r.data); setTracking(r.data.tracking_info || ''); setNotes(r.data.admin_notes || ''); } }, (e) => { if (live) setLoadError(e.message); });
    return () => { live = false; };
  }, [orderId]);

  const apply = (r, msg) => { setOrder(r.data); setTracking(r.data.tracking_info || ''); setNotes(r.data.admin_notes || ''); toasts.success(msg || r.message); onChanged(); };
  async function run(name, fn) { setBusy(name); setError(null); try { await fn(); } catch (e) { setError(e); } finally { setBusy(''); } }

  const move = (status) => run(status, async () => apply(await setOrderStatus(order.id, { status, tracking_info: tracking, admin_notes: notes })));
  const saveNotes = () => run('notes', async () => apply(await setOrderStatus(order.id, { status: order.status, tracking_info: tracking, admin_notes: notes }), 'Notes saved.'));
  const doRefund = (e) => {
    e.preventDefault();
    const body = {}; if (refund.amount) body.amount = Number(refund.amount); if (refund.reason) body.reason = refund.reason;
    return run('refund', async () => { apply(await refundOrder(order.id, body)); setRefund({ amount: '', reason: '' }); });
  };
  const invoice = () => run('invoice', () => downloadInvoice(order));

  if (loadError) return <p role="alert" className="text-sm text-red-700">{loadError}</p>;
  if (!order) return <div className="flex justify-center py-10"><Spinner className="h-6 w-6" label="Loading order" /></div>;

  const next = NEXT[order.status].filter((s) => !(s === 'confirmed' && order.payment_method === 'razorpay' && order.payment_status !== 'paid'));
  const a = order.shipping_address;
  const remaining = order.total - order.refund_amount;
  const canRefund = isAdmin && ['paid', 'partially_refunded'].includes(order.payment_status) && remaining > 0;
  return (
    <div className="space-y-5 text-sm">
      <ErrorList error={error} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
        <Badge tone={PAY_TONE[order.payment_status]}>{lbl(order.payment_status)}</Badge>
        <span className="text-slate-500">{order.payment_method === 'cod' ? 'Cash on delivery' : 'Razorpay'} · placed {fmtDateTime(order.placed_at)}</span>
        <button type="button" className="btn-secondary ml-auto px-3 py-1.5" onClick={invoice} disabled={!order.invoice_available || busy === 'invoice'} title={order.invoice_available ? '' : 'The invoice is issued when the order is confirmed'}>
          {busy === 'invoice' && <Spinner className="h-4 w-4" />} Invoice PDF{order.invoice_number ? ` (${order.invoice_number})` : ''}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div><h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">Ship to</h3>
          <address className="not-italic text-slate-800">{a.full_name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} {a.pin_code}<br />
            <a className="text-indigo-700 hover:underline" href={`tel:${a.mobile}`}>{a.mobile}</a></address>
          {order.customer_notes && <p className="mt-2 rounded bg-amber-50 p-2 text-amber-900"><span className="font-medium">Customer note:</span> {order.customer_notes}</p>}
        </div>
        <div><h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">Totals</h3>
          <dl className="space-y-0.5">
            <div className="flex justify-between"><dt>Subtotal (MRP)</dt><dd>{money(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Discount</dt><dd>−{money(order.discount_total)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{money(order.shipping_total)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold"><dt>Total</dt><dd>{money(order.total)}</dd></div>
            {order.refund_amount > 0 && <div className="flex justify-between text-red-700"><dt>Refunded</dt><dd>{money(order.refund_amount)}</dd></div>}
          </dl>
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">Items</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 text-xs text-slate-500"><tr><th scope="col" className="px-3 py-2">Product</th><th scope="col" className="px-3 py-2">Qty</th><th scope="col" className="px-3 py-2">Unit</th><th scope="col" className="px-3 py-2 text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((i) => (
                <tr key={i.product_id + i.name}><td className="px-3 py-2">{i.name}{i.sku && <span className="block text-xs text-slate-500">SKU {i.sku}</span>}</td><td className="px-3 py-2">{i.quantity}</td><td className="px-3 py-2">{money(i.unit_price)}</td><td className="px-3 py-2 text-right">{money(i.line_total)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(order.payments.length > 0 || order.refunds.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div><h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">Payments</h3>
            <ul className="space-y-1">{order.payments.map((p) => (
              <li key={p.id} className="rounded border border-slate-200 px-2 py-1.5"><span className="font-medium">{money(p.amount)}</span> · <span className="capitalize">{p.status}</span>{p.signature_verified && ' · verified'}
                {p.provider_payment_id && <span className="block break-all text-xs text-slate-500">{p.provider_payment_id}</span>}{p.error_message && <span className="block text-xs text-red-600">{p.error_message}</span>}</li>))}</ul></div>
          <div><h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">Refunds</h3>
            {order.refunds.length === 0 ? <p className="text-slate-500">None.</p> : <ul className="space-y-1">{order.refunds.map((r) => (
              <li key={r.id} className="rounded border border-slate-200 px-2 py-1.5"><span className="font-medium">{money(r.amount)}</span> · {r.status}<span className="block text-xs text-slate-500">{fmtDateTime(r.created_at)}{r.reason ? ` · ${r.reason}` : ''}</span></li>))}</ul>}</div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Fulfilment</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="ord-track" className="mb-1 block font-medium text-slate-700">Tracking info</label><input id="ord-track" className="input" maxLength={255} value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Courier + tracking number" /></div>
          <div><label htmlFor="ord-notes" className="mb-1 block font-medium text-slate-700">Internal notes</label><textarea id="ord-notes" rows={2} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {next.map((s) => (
            <button key={s} type="button" className={s === 'cancelled' ? 'btn-secondary text-red-600 hover:bg-red-50' : 'btn-primary'} disabled={!!busy}
              onClick={() => { if (s !== 'cancelled' || window.confirm('Cancel this order? Stock is returned and an online payment is refunded.')) move(s); }}>
              {busy === s && <Spinner className="h-4 w-4" />} Mark as {s}
            </button>
          ))}
          {next.length === 0 && <span className="text-slate-500">This order is {order.status}; no further steps.</span>}
          {order.payment_method === 'razorpay' && order.status === 'placed' && order.payment_status !== 'paid' && <span className="text-xs text-amber-700">Waiting for online payment before it can be confirmed.</span>}
          <button type="button" className="btn-secondary ml-auto" onClick={saveNotes} disabled={!!busy}>{busy === 'notes' && <Spinner className="h-4 w-4" />} Save notes / tracking</button>
        </div>
      </div>

      {canRefund && (
        <form onSubmit={doRefund} className="rounded-lg border border-slate-200 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Refund (admin only) — up to {money(remaining)}</h3>
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
            <div><label htmlFor="ref-amt" className="mb-1 block font-medium text-slate-700">Amount (₹)</label><input id="ref-amt" type="number" min="0.01" step="0.01" max={remaining} className="input" value={refund.amount} onChange={(e) => setRefund((r) => ({ ...r, amount: e.target.value }))} placeholder="Full" /></div>
            <div><label htmlFor="ref-reason" className="mb-1 block font-medium text-slate-700">Reason</label><input id="ref-reason" className="input" maxLength={255} value={refund.reason} onChange={(e) => setRefund((r) => ({ ...r, reason: e.target.value }))} /></div>
            <button type="submit" className="btn-danger" disabled={!!busy} onClick={(e) => { if (!window.confirm(`Refund ${refund.amount ? money(refund.amount) : `the full remaining ${money(remaining)}`}? Online payments are returned through Razorpay.`)) e.preventDefault(); }}>
              {busy === 'refund' && <Spinner className="h-4 w-4" />} Refund</button>
          </div>
          <p className="mt-1 text-xs text-slate-500">Leave the amount empty to refund everything that is left.</p>
        </form>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const toasts = useToasts();
  const list = usePagedList(listOrders, { limit: 15 });
  const [openId, setOpenId] = useState(null);
  return (
    <section aria-labelledby="orders-title">
      <PageHeader title={<span id="orders-title">Orders</span>} subtitle="Customer orders from the storefront.">
        <button type="button" className="btn-secondary" onClick={list.reload} aria-label="Refresh orders"><RefreshIcon className="h-4 w-4" /></button>
      </PageHeader>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <FilterBar search={list.search} onSearch={list.setSearch} searchPlaceholder="Order no., name, mobile, invoice…" filters={FILTERS} values={list.filters} onChange={list.setFilter} />
        <ListState loading={list.loading} error={list.error} empty={!list.rows.length} emptyText={list.hasFilters ? 'No orders match your filters.' : 'No orders yet.'} onRetry={list.reload}>
          <div className={list.loading ? 'opacity-60' : ''} aria-busy={list.loading}>
            <DataTable rows={list.rows} columns={[
              { key: 'order_number', label: 'Order', render: (o) => <><span className="font-medium text-slate-900">{o.order_number}</span><span className="block text-xs text-slate-500">{fmtDateTime(o.placed_at)}</span></> },
              { key: 'customer', label: 'Customer', render: (o) => <>{o.shipping_address.full_name}<span className="block text-xs text-slate-500">{o.shipping_address.city} · {o.shipping_address.mobile}</span></> },
              { key: 'total', label: 'Total', render: (o) => money(o.total) },
              { key: 'payment_method', label: 'Method', render: (o) => (o.payment_method === 'cod' ? 'COD' : 'Razorpay') },
              { key: 'payment_status', label: 'Payment', render: (o) => <Badge tone={PAY_TONE[o.payment_status]}>{lbl(o.payment_status)}</Badge> },
              { key: 'status', label: 'Status', render: (o) => <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge> },
            ]} actions={(o) => <button type="button" className="btn-secondary px-2.5 py-1.5" onClick={() => setOpenId(o.id)} aria-label={`View order ${o.order_number}`}><EyeIcon className="h-4 w-4" /></button>} />
            <Pagination meta={list.meta} onPage={list.setPage} disabled={list.loading} />
          </div>
        </ListState>
      </div>
      <Modal open={!!openId} onClose={() => setOpenId(null)} title="Order details" size="lg">
        {openId && <OrderDetail key={openId} orderId={openId} onClose={() => setOpenId(null)} onChanged={list.reload} toasts={toasts} />}
      </Modal>
      <ToastContainer toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </section>
  );
}

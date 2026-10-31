import { useState } from 'react';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import ToastContainer from '../components/ToastContainer.jsx';
import { Badge, DataTable, DeleteDialogBody, ErrorList, FilterBar, ListState, PageHeader, fmtDate, fmtDateTime } from '../components/ui.jsx';
import { PencilIcon, RefreshIcon, TrashIcon } from '../components/Icons.jsx';
import usePagedList from '../hooks/usePagedList.js';
import useToasts from '../hooks/useToasts.js';
import { useIsAdmin } from '../auth/UserContext.js';
import { serviceRequestsApi } from '../api/siteApi.js';

const STATUSES = ['new', 'assigned', 'in_progress', 'completed', 'cancelled'];
const TYPES = [['installation', 'Installation'], ['repair', 'Repair'], ['amc', 'AMC'], ['filter_change', 'Filter change'], ['other', 'Other']];
const TONE = { new: 'blue', assigned: 'indigo', in_progress: 'amber', completed: 'green', cancelled: 'slate' };
const label = (s) => s.replace('_', ' ');
const FILTERS = [
  { name: 'status', label: 'Status', options: STATUSES.map((s) => [s, label(s)]) },
  { name: 'service_type', label: 'Type', options: TYPES },
];

export default function ServiceRequestsPage() {
  const isAdmin = useIsAdmin();
  const toasts = useToasts();
  const list = usePagedList(serviceRequestsApi.list, { limit: 15 });
  const [req, setReq] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const open = (r) => { setReq(r); setForm({ status: r.status, assigned_to: r.assigned_to || '', admin_notes: r.admin_notes || '' }); setError(null); };
  async function save(e) {
    e.preventDefault(); setSaving(true); setError(null);
    try { await serviceRequestsApi.update(req.id, form); toasts.success('Service request saved.'); setReq(null); list.reload(); } catch (err) { setError(err); } finally { setSaving(false); }
  }
  async function del() {
    setDeleting(true);
    try { await serviceRequestsApi.remove(toDelete.id); toasts.success('Service request deleted.'); setToDelete(null); list.reload(); } catch (e) { toasts.error(e.message); setToDelete(null); } finally { setDeleting(false); }
  }

  return (
    <section aria-labelledby="sr-title">
      <PageHeader title={<span id="sr-title">Service requests</span>} subtitle="Installation, repair, AMC and filter-change requests from customers.">
        <button type="button" className="btn-secondary" onClick={list.reload} aria-label="Refresh service requests"><RefreshIcon className="h-4 w-4" /></button>
      </PageHeader>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <FilterBar search={list.search} onSearch={list.setSearch} searchPlaceholder="Name, mobile, city, assigned to…" filters={FILTERS} values={list.filters} onChange={list.setFilter} />
        <ListState loading={list.loading} error={list.error} empty={!list.rows.length} emptyText={list.hasFilters ? 'No requests match your filters.' : 'No service requests yet.'} onRetry={list.reload}>
          <div className={list.loading ? 'opacity-60' : ''} aria-busy={list.loading}>
            <DataTable rows={list.rows} columns={[
              { key: 'created_at', label: 'Received', render: (r) => <span className="whitespace-nowrap text-xs">{fmtDateTime(r.created_at)}</span> },
              { key: 'name', label: 'Customer', render: (r) => <><span className="font-medium text-slate-900">{r.name}</span><span className="block text-xs text-slate-500">{r.city}</span></> },
              { key: 'mobile', label: 'Mobile', render: (r) => <a className="text-indigo-700 hover:underline" href={`tel:${r.mobile}`}>{r.mobile}</a> },
              { key: 'service_type', label: 'Type', render: (r) => <span className="capitalize">{label(r.service_type)}</span> },
              { key: 'preferred_date', label: 'Preferred', render: (r) => fmtDate(r.preferred_date) },
              { key: 'assigned_to', label: 'Assigned to' },
              { key: 'status', label: 'Status', render: (r) => <Badge tone={TONE[r.status]}>{label(r.status)}</Badge> },
            ]} actions={(r) => (
              <div className="flex justify-end gap-1">
                <button type="button" className="btn-secondary px-2.5 py-1.5" onClick={() => open(r)} aria-label={`Open request from ${r.name}`}><PencilIcon className="h-4 w-4" /></button>
                {isAdmin && <button type="button" className="btn-secondary px-2.5 py-1.5 text-red-600 hover:bg-red-50" onClick={() => setToDelete(r)} aria-label={`Delete request from ${r.name}`}><TrashIcon className="h-4 w-4" /></button>}
              </div>
            )} />
            <Pagination meta={list.meta} onPage={list.setPage} disabled={list.loading} />
          </div>
        </ListState>
      </div>

      <Modal open={!!req} onClose={() => setReq(null)} title="Service request" size="lg" closeDisabled={saving}
        footer={<><button type="button" className="btn-secondary" onClick={() => setReq(null)} disabled={saving}>Cancel</button>
          <button type="submit" form="sr-form" className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4" />}Save</button></>}>
        {req && (
          <form id="sr-form" onSubmit={save}>
            <ErrorList error={error} />
            <dl className="mb-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {[['Customer', req.name], ['Mobile', req.mobile], ['Email', req.email], ['City / PIN', `${req.city || ''} ${req.pin_code || ''}`], ['Type', label(req.service_type)], ['Product', req.product_note], ['Preferred date', fmtDate(req.preferred_date)], ['Received', fmtDateTime(req.created_at)]].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="break-words text-slate-900">{v || '—'}</dd></div>
              ))}
              {req.address && <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Address</dt><dd className="text-slate-900">{req.address}</dd></div>}
              {req.description && <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Problem / notes from customer</dt><dd className="whitespace-pre-wrap text-slate-900">{req.description}</dd></div>}
            </dl>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="sr-status" className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select id="sr-status" className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></div>
              <div><label htmlFor="sr-assigned" className="mb-1 block text-sm font-medium text-slate-700">Assigned to</label>
                <input id="sr-assigned" className="input" maxLength={100} value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)} placeholder="Technician name" />
                <p className="mt-1 text-xs text-slate-500">Assigning a new request moves it to “assigned”.</p></div>
              <div className="sm:col-span-2"><label htmlFor="sr-notes" className="mb-1 block text-sm font-medium text-slate-700">Internal notes</label>
                <textarea id="sr-notes" rows={4} className="input" value={form.admin_notes} onChange={(e) => set('admin_notes', e.target.value)} /></div>
            </div>
          </form>
        )}
      </Modal>
      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete service request" size="sm" closeDisabled={deleting}
        footer={<><button type="button" className="btn-secondary" onClick={() => setToDelete(null)} disabled={deleting}>Cancel</button><button type="button" className="btn-danger" onClick={del} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button></>}>
        {toDelete && <DeleteDialogBody name={`the request from ${toDelete.name}`} />}
      </Modal>
      <ToastContainer toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </section>
  );
}

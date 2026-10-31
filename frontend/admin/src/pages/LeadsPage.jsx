import { useState } from 'react';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import ToastContainer from '../components/ToastContainer.jsx';
import { Badge, DataTable, DeleteDialogBody, ErrorList, FilterBar, ListState, PageHeader, fmtDateTime } from '../components/ui.jsx';
import { PencilIcon, RefreshIcon, TrashIcon } from '../components/Icons.jsx';
import usePagedList from '../hooks/usePagedList.js';
import useToasts from '../hooks/useToasts.js';
import { useIsAdmin } from '../auth/UserContext.js';
import { leadsApi } from '../api/siteApi.js';

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'closed', 'spam'];
const TONE = { new: 'blue', contacted: 'amber', qualified: 'indigo', converted: 'green', closed: 'slate', spam: 'red' };
const INTERESTS = ['Water Purifier', 'Water Softener', 'AMC-Service', 'Other'];
const opt = (a) => a.map((v) => [v, v]);
const FILTERS = [
  { name: 'status', label: 'Status', options: opt(LEAD_STATUSES) },
  { name: 'interest', label: 'Interest', options: opt(INTERESTS) },
  { name: 'source', label: 'Source', options: [['demo', 'Demo popup'], ['contact', 'Contact form'], ['other', 'Other']] },
  { name: 'from', label: 'From', type: 'date' },
  { name: 'to', label: 'To', type: 'date' },
];
const fullName = (l) => [l.first_name, l.last_name].filter(Boolean).join(' ');

export default function LeadsPage() {
  const isAdmin = useIsAdmin();
  const toasts = useToasts();
  const list = usePagedList(leadsApi.list, { limit: 15 });
  const [lead, setLead] = useState(null);
  const [form, setForm] = useState({ status: 'new', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function quickStatus(l, status) {
    try { await leadsApi.update(l.id, { status }); list.patchRow(l.id, { status }); toasts.success('Status updated.'); } catch (e) { toasts.error(e.message); list.reload(); }
  }
  const open = (l) => { setLead(l); setForm({ status: l.status, notes: l.notes || '' }); setError(null); };
  async function save(e) {
    e.preventDefault(); setSaving(true); setError(null);
    try { await leadsApi.update(lead.id, form); toasts.success('Lead saved.'); setLead(null); list.reload(); } catch (err) { setError(err); } finally { setSaving(false); }
  }
  async function del() {
    setDeleting(true);
    try { await leadsApi.remove(toDelete.id); toasts.success('Lead deleted.'); setToDelete(null); list.reload(); } catch (e) { toasts.error(e.message); setToDelete(null); } finally { setDeleting(false); }
  }

  return (
    <section aria-labelledby="leads-title">
      <PageHeader title={<span id="leads-title">Leads</span>} subtitle="Demo-popup and contact-form enquiries from the public site.">
        <button type="button" className="btn-secondary" onClick={list.reload} aria-label="Refresh leads"><RefreshIcon className="h-4 w-4" /></button>
      </PageHeader>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <FilterBar search={list.search} onSearch={list.setSearch} searchPlaceholder="Name, mobile, email, city, PIN…" filters={FILTERS} values={list.filters} onChange={list.setFilter} />
        <ListState loading={list.loading} error={list.error} empty={!list.rows.length} emptyText={list.hasFilters ? 'No leads match your filters.' : 'No leads yet. They appear here when visitors use the demo popup or contact form.'} onRetry={list.reload}>
          <div className={list.loading ? 'opacity-60' : ''} aria-busy={list.loading}>
            <DataTable rows={list.rows} columns={[
              { key: 'created_at', label: 'Received', render: (l) => <span className="whitespace-nowrap text-xs">{fmtDateTime(l.created_at)}</span> },
              { key: 'name', label: 'Name', render: (l) => <><span className="font-medium text-slate-900">{fullName(l)}</span><span className="block text-xs text-slate-500">{l.city}{l.pin_code ? ` – ${l.pin_code}` : ''}</span></> },
              { key: 'mobile', label: 'Contact', render: (l) => <><a className="text-indigo-700 hover:underline" href={`tel:${l.mobile}`}>{l.mobile}</a>{l.email && <span className="block text-xs text-slate-500">{l.email}</span>}</> },
              { key: 'interest', label: 'Interest' },
              { key: 'source', label: 'Source', render: (l) => <Badge>{l.source}</Badge> },
              { key: 'status', label: 'Status', render: (l) => (
                <select aria-label={`Status of ${fullName(l)}`} className="input w-auto py-1" value={l.status} onChange={(e) => quickStatus(l, e.target.value)}>
                  {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) },
            ]} actions={(l) => (
              <div className="flex justify-end gap-1">
                <button type="button" className="btn-secondary px-2.5 py-1.5" onClick={() => open(l)} aria-label={`Open ${fullName(l)}`}><PencilIcon className="h-4 w-4" /></button>
                {isAdmin && <button type="button" className="btn-secondary px-2.5 py-1.5 text-red-600 hover:bg-red-50" onClick={() => setToDelete(l)} aria-label={`Delete ${fullName(l)}`}><TrashIcon className="h-4 w-4" /></button>}
              </div>
            )} />
            <Pagination meta={list.meta} onPage={list.setPage} disabled={list.loading} />
          </div>
        </ListState>
      </div>

      <Modal open={!!lead} onClose={() => setLead(null)} title="Lead details" size="lg" closeDisabled={saving}
        footer={<><button type="button" className="btn-secondary" onClick={() => setLead(null)} disabled={saving}>Cancel</button>
          <button type="submit" form="lead-form" className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4" />}Save</button></>}>
        {lead && (
          <form id="lead-form" onSubmit={save}>
            <ErrorList error={error} />
            <dl className="mb-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {[['Name', fullName(lead)], ['Mobile', lead.mobile], ['Email', lead.email], ['City / PIN', `${lead.city || ''} ${lead.pin_code || ''}`], ['Interest', lead.interest], ['Source', lead.source], ['Received', fmtDateTime(lead.created_at)], ['Page', lead.page_url]].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="break-words text-slate-900">{v || '—'}</dd></div>
              ))}
              {lead.address && <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Address</dt><dd className="text-slate-900">{lead.address}</dd></div>}
              {lead.message && <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Message</dt><dd className="whitespace-pre-wrap text-slate-900">{lead.message}</dd></div>}
            </dl>
            <div className="grid gap-4">
              <div><label htmlFor="lead-status" className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select id="lead-status" className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>{LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label htmlFor="lead-notes" className="mb-1 block text-sm font-medium text-slate-700">Internal notes</label>
                <textarea id="lead-notes" rows={4} className="input" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g. Called, demo booked for Friday" /></div>
            </div>
          </form>
        )}
      </Modal>
      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete lead" size="sm" closeDisabled={deleting}
        footer={<><button type="button" className="btn-secondary" onClick={() => setToDelete(null)} disabled={deleting}>Cancel</button><button type="button" className="btn-danger" onClick={del} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button></>}>
        {toDelete && <DeleteDialogBody name={fullName(toDelete)} />}
      </Modal>
      <ToastContainer toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </section>
  );
}

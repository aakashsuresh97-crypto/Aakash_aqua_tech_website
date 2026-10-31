import { useCallback, useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import Pagination from './Pagination.jsx';
import Spinner from './Spinner.jsx';
import ToastContainer from './ToastContainer.jsx';
import FormField, { fromLocalInput, toLocalInput } from './FormField.jsx';
import { DataTable, DeleteDialogBody, ErrorList, FilterBar, ListState, PageHeader } from './ui.jsx';
import { PencilIcon, PlusIcon, RefreshIcon, TrashIcon } from './Icons.jsx';
import useDebounce from '../hooks/useDebounce.js';
import useToasts from '../hooks/useToasts.js';
import { useIsAdmin } from '../auth/UserContext.js';

const PAGE_SIZE = 10;

const blankFor = (fields) => Object.fromEntries(fields.map((f) => [f.name, f.default !== undefined ? f.default : f.type === 'status' ? 1 : '']));
const fromRow = (fields, row) => Object.fromEntries(fields.map((f) => {
  let v = row[f.name];
  if (f.type === 'datetime') v = toLocalInput(v);
  else if (v === null || v === undefined) v = f.type === 'status' ? 1 : '';
  return [f.name, v];
}));
const toPayload = (fields, values) => Object.fromEntries(fields.map((f) => {
  let v = values[f.name];
  if (f.type === 'datetime') v = fromLocalInput(v);
  if (f.type === 'number' && v !== '') v = Number(v);
  return [f.name, v];
}));

/**
 * Config-driven list + create/edit modal + delete confirm for a simple content resource.
 *   config = { title, subtitle, singular, api, columns, fields, filters?, searchPlaceholder?, nameField, emptyText? }
 * Staff accounts can create and edit; only admins see Delete (the API enforces the same).
 */
export default function CrudPage({ config }) {
  const { title, subtitle, singular, api, columns, fields, filters = [], searchPlaceholder, nameField, emptyText } = config;
  const isAdmin = useIsAdmin();
  const toasts = useToasts();
  const [search, setSearch] = useState('');
  const dSearch = useDebounce(search);
  const [filterValues, setFilterValues] = useState({});
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState(null); // { row|null, values }
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setPage(1), [dSearch, filterValues]);

  useEffect(() => {
    const ctl = new AbortController();
    setLoading(true); setError('');
    api.list({ page, limit: PAGE_SIZE, search: dSearch, ...filterValues }, ctl.signal).then(
      (res) => { setRows(res.data); setMeta(res.meta); setLoading(false); },
      (err) => { if (err.name === 'AbortError') return; setError(err.message); setLoading(false); },
    );
    return () => ctl.abort();
  }, [api, page, dSearch, filterValues, refreshKey]);

  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);
  const openCreate = () => { setFormError(null); setForm({ row: null, values: blankFor(fields) }); };
  const openEdit = (row) => { setFormError(null); setForm({ row, values: fromRow(fields, row) }); };
  const setValue = (name, v) => setForm((f) => ({ ...f, values: { ...f.values, [name]: v } }));

  async function save(e) {
    e.preventDefault();
    setSaving(true); setFormError(null);
    try {
      const payload = toPayload(fields, form.values);
      if (form.row) await api.update(form.row.id, payload); else await api.create(payload);
      toasts.success(`${singular} ${form.row ? 'updated' : 'created'}.`);
      try { localStorage.setItem('catalogue-updated', String(Date.now())); } catch { /* private mode */ }
      setForm(null); reload();
    } catch (err) { setFormError(err); } finally { setSaving(false); }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.remove(toDelete.id);
      try { localStorage.setItem('catalogue-updated', String(Date.now())); } catch { /* private mode */ }
      toasts.success(`${singular} deleted.`);
      setToDelete(null);
      if (rows.length === 1 && page > 1) setPage(page - 1); else reload();
    } catch (err) { toasts.error(err.message); setToDelete(null); } finally { setDeleting(false); }
  }

  return (
    <section aria-labelledby="crud-heading">
      <PageHeader title={<span id="crud-heading">{title}</span>} subtitle={subtitle}>
        <button type="button" className="btn-secondary" onClick={reload} aria-label={`Refresh ${title}`}><RefreshIcon className="h-4 w-4" /></button>
        <button type="button" className="btn-primary" onClick={openCreate}><PlusIcon className="h-4 w-4" /> Add {singular.toLowerCase()}</button>
      </PageHeader>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <FilterBar search={search} onSearch={setSearch} searchPlaceholder={searchPlaceholder || `Search ${title.toLowerCase()}…`} filters={filters} values={filterValues}
          onChange={(k, v) => setFilterValues((f) => ({ ...f, [k]: v }))} />
        <ListState loading={loading} error={error} empty={!rows.length} emptyText={emptyText || (dSearch || Object.values(filterValues).some(Boolean) ? 'No matches for your search or filters.' : `No ${title.toLowerCase()} yet. Use “Add ${singular.toLowerCase()}” to create the first one.`)} onRetry={reload}>
          <div className={loading ? 'opacity-60 transition' : 'transition'} aria-busy={loading}>
            <DataTable columns={columns} rows={rows} actions={(r) => (
              <div className="flex justify-end gap-1">
                <button type="button" className="btn-secondary px-2.5 py-1.5" onClick={() => openEdit(r)} aria-label={`Edit ${r[nameField]}`}><PencilIcon className="h-4 w-4" /></button>
                {isAdmin && <button type="button" className="btn-secondary px-2.5 py-1.5 text-red-600 hover:bg-red-50" onClick={() => setToDelete(r)} aria-label={`Delete ${r[nameField]}`}><TrashIcon className="h-4 w-4" /></button>}
              </div>
            )} />
            <Pagination meta={meta} onPage={setPage} disabled={loading} />
          </div>
        </ListState>
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.row ? `Edit ${singular.toLowerCase()}` : `Add ${singular.toLowerCase()}`} size="lg" closeDisabled={saving}
        footer={<>
          <button type="button" className="btn-secondary" onClick={() => setForm(null)} disabled={saving}>Cancel</button>
          <button type="submit" form="crud-form" className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4" />}{saving ? 'Saving…' : 'Save'}</button>
        </>}>
        {form && (
          <form id="crud-form" onSubmit={save} noValidate>
            <ErrorList error={formError} />
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => <FormField key={f.name} field={f} value={form.values[f.name]} onChange={setValue} disabled={saving} idPrefix="crud" />)}
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title={`Delete ${singular.toLowerCase()}`} size="sm" closeDisabled={deleting}
        footer={<>
          <button type="button" className="btn-secondary" onClick={() => setToDelete(null)} disabled={deleting}>Cancel</button>
          <button type="button" className="btn-danger" onClick={confirmDelete} disabled={deleting}>{deleting && <Spinner className="h-4 w-4" />}{deleting ? 'Deleting…' : 'Delete'}</button>
        </>}>
        {toDelete && <DeleteDialogBody name={toDelete[nameField]} />}
      </Modal>
      <ToastContainer toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </section>
  );
}
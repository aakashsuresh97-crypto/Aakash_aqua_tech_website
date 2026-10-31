import { useCallback, useEffect, useState } from 'react';
import { createCategory, deleteCategory, listCategories, updateCategory } from '../api/categoryApi.js';
import useDebounce from '../hooks/useDebounce.js';
import useToasts from '../hooks/useToasts.js';
import CategoryTable from '../components/CategoryTable.jsx';
import CategoryForm from '../components/CategoryForm.jsx';
import CategoryDetails from '../components/CategoryDetails.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ToastContainer from '../components/ToastContainer.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import { ExclamationIcon, PlusIcon, RefreshIcon, SearchIcon, TagIcon, XIcon } from '../components/Icons.jsx';

const PAGE_SIZE = 10;

export default function CategoriesPage() {
  const toasts = useToasts();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(''); // '' | '1' | '0'
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState({ type: null, category: null });
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const closeModal = useCallback(() => setModal({ type: null, category: null }), []);

  // Back to page 1 whenever the search text changes
  useEffect(() => setPage(1), [debouncedSearch]);

  // Load the table from the API
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listCategories({ page, limit: PAGE_SIZE, status, search: debouncedSearch }, controller.signal)
      .then((res) => {
        // Deleted the last row of the last page: step back one page
        if (res.data.length === 0 && res.meta.page > 1) {
          setPage(Math.max(1, res.meta.totalPages));
          return;
        }
        setRows(res.data);
        setMeta(res.meta);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });
    return () => controller.abort();
  }, [page, status, debouncedSearch, refreshKey]);

  async function handleSave(values, onProgress) {
    if (modal.type === 'edit') {
      await updateCategory(modal.category.id, values, onProgress);
      toasts.success('Category updated successfully');
    } else {
      await createCategory(values, onProgress);
      toasts.success('Category created successfully');
      setPage(1);
    }
    closeModal();
    refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteCategory(modal.category.id);
      toasts.success(`“${modal.category.category_name}” deleted`);
      closeModal();
    } catch (err) {
      toasts.error(err.message);
    } finally {
      setDeleting(false);
      refresh();
    }
  }

  const filtersActive = Boolean(search || status);
  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPage(1);
  };
  const initialLoad = loading && rows.length === 0 && !meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Category management</h2>
          <p className="text-sm text-slate-500">Create, edit and organise your product categories.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setModal({ type: 'create', category: null })}>
          <PlusIcon className="h-5 w-5" /> Add category
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              aria-label="Search categories"
              placeholder="Search by name or description…"
              className="input pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select aria-label="Filter by status" className="input md:w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
          {filtersActive && (
            <button type="button" className="btn-secondary" onClick={clearFilters}>
              <XIcon className="h-4 w-4" /> Clear
            </button>
          )}
        </div>

        {error && (
          <div role="alert" className="m-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-sm text-red-700">
              <ExclamationIcon className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" className="btn-secondary shrink-0" onClick={refresh}><RefreshIcon className="h-4 w-4" /> Retry</button>
          </div>
        )}

        {initialLoad ? (
          <div className="flex items-center justify-center gap-3 py-20 text-slate-500">
            <Spinner className="h-6 w-6 text-indigo-600" /> Loading categories…
          </div>
        ) : (
          <div className={`relative transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
            {loading && <div className="absolute right-4 top-3 z-10 text-indigo-600"><Spinner className="h-5 w-5" /></div>}
            {rows.length > 0 ? (
              <CategoryTable
                categories={rows}
                onView={(c) => setModal({ type: 'view', category: c })}
                onEdit={(c) => setModal({ type: 'edit', category: c })}
                onDelete={(c) => setModal({ type: 'delete', category: c })}
              />
            ) : (
              !error && !loading && (
                <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><TagIcon className="h-6 w-6" /></div>
                  <p className="font-medium text-slate-900">{filtersActive ? 'No categories match your filters' : 'No categories yet'}</p>
                  <p className="text-sm text-slate-500">{filtersActive ? 'Try a different search or status.' : 'Add your first category to get started.'}</p>
                  {filtersActive ? (
                    <button type="button" className="btn-secondary" onClick={clearFilters}>Clear filters</button>
                  ) : (
                    <button type="button" className="btn-primary" onClick={() => setModal({ type: 'create', category: null })}><PlusIcon className="h-5 w-5" /> Add category</button>
                  )}
                </div>
              )
            )}
          </div>
        )}

        <Pagination meta={meta} onPage={setPage} disabled={loading} />
      </section>

      <CategoryForm open={modal.type === 'create' || modal.type === 'edit'} category={modal.type === 'edit' ? modal.category : null} onClose={closeModal} onSubmit={handleSave} />
      <CategoryDetails open={modal.type === 'view'} categoryId={modal.type === 'view' ? modal.category?.id : null} onClose={closeModal} onEdit={(c) => setModal({ type: 'edit', category: c })} />
      <ConfirmDialog open={modal.type === 'delete'} category={modal.category} busy={deleting} onCancel={closeModal} onConfirm={handleDelete} />
      <ToastContainer toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </div>
  );
}

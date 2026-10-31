import { useCallback, useEffect, useState } from 'react';
import { createSubcategory, deleteSubcategory, listSubcategories, updateSubcategory } from '../api/subcategoryApi.js';
import useCategoryOptions from '../hooks/useCategoryOptions.js';
import useDebounce from '../hooks/useDebounce.js';
import useToasts from '../hooks/useToasts.js';
import SubcategoryTable from '../components/SubcategoryTable.jsx';
import SubcategoryForm from '../components/SubcategoryForm.jsx';
import SubcategoryDetails from '../components/SubcategoryDetails.jsx';
import SubcategoryConfirmDialog from '../components/SubcategoryConfirmDialog.jsx';
import ToastContainer from '../components/ToastContainer.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import { ExclamationIcon, PlusIcon, RefreshIcon, SearchIcon, TagIcon, XIcon } from '../components/Icons.jsx';

const PAGE_SIZE = 10;

export default function SubcategoriesPage() {
  const toasts = useToasts();
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategoryOptions();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState(''); // '' | '1' | '0'
  const debouncedName = useDebounce(name);
  const debouncedBrand = useDebounce(brand);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState({ type: null, item: null });
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const closeModal = useCallback(() => setModal({ type: null, item: null }), []);

  // Back to page 1 whenever a text filter changes
  useEffect(() => setPage(1), [debouncedName, debouncedBrand]);

  // Load the table from the API (filters are applied on the server)
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listSubcategories({ page, limit: PAGE_SIZE, category_id: categoryId, name: debouncedName, brand: debouncedBrand, status }, controller.signal)
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
  }, [page, categoryId, status, debouncedName, debouncedBrand, refreshKey]);

  async function handleSave(values) {
    if (modal.type === 'edit') {
      await updateSubcategory(modal.item.id, values);
      toasts.success('Subcategory updated successfully');
    } else {
      await createSubcategory(values);
      toasts.success('Subcategory created successfully');
      setPage(1);
    }
    closeModal();
    refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteSubcategory(modal.item.id);
      toasts.success(`“${modal.item.subcategory_name}” deleted`);
      closeModal();
    } catch (err) {
      toasts.error(err.message);
    } finally {
      setDeleting(false);
      refresh();
    }
  }

  const filtersActive = Boolean(name || brand || categoryId || status);
  const clearFilters = () => {
    setName('');
    setBrand('');
    setCategoryId('');
    setStatus('');
    setPage(1);
  };
  const initialLoad = loading && rows.length === 0 && !meta;
  const noCategories = !categoriesLoading && !categoriesError && categories.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Subcategory management</h2>
          <p className="text-sm text-slate-500">Organise each category into subcategories and list their brands.</p>
        </div>
        <button type="button" className="btn-primary" disabled={noCategories} title={noCategories ? 'Create a category first' : undefined} onClick={() => setModal({ type: 'create', item: null })}>
          <PlusIcon className="h-5 w-5" /> Add subcategory
        </button>
      </div>

      {categoriesError && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Could not load categories for the dropdowns: {categoriesError}</div>
      )}
      {noCategories && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          There are no categories yet. <a className="font-medium text-indigo-600 hover:underline" href="#/categories">Create a category</a> first, then add subcategories to it.
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_14rem_10rem_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="search" aria-label="Filter by subcategory name" placeholder="Subcategory name…" className="input pl-10" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="search" aria-label="Filter by brand name" placeholder="Brand name…" className="input pl-10" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <select aria-label="Filter by category" className="input" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select aria-label="Filter by status" className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
          {filtersActive && (
            <button type="button" className="btn-secondary" onClick={clearFilters}><XIcon className="h-4 w-4" /> Clear</button>
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
            <Spinner className="h-6 w-6 text-indigo-600" /> Loading subcategories…
          </div>
        ) : (
          <div className={`relative transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
            {loading && <div className="absolute right-4 top-3 z-10 text-indigo-600"><Spinner className="h-5 w-5" /></div>}
            {rows.length > 0 ? (
              <SubcategoryTable
                subcategories={rows}
                onView={(s) => setModal({ type: 'view', item: s })}
                onEdit={(s) => setModal({ type: 'edit', item: s })}
                onDelete={(s) => setModal({ type: 'delete', item: s })}
              />
            ) : (
              !error && !loading && (
                <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><TagIcon className="h-6 w-6" /></div>
                  <p className="font-medium text-slate-900">{filtersActive ? 'No subcategories match your filters' : 'No subcategories yet'}</p>
                  <p className="text-sm text-slate-500">{filtersActive ? 'Try a different name, brand, category or status.' : 'Add your first subcategory to get started.'}</p>
                  {filtersActive ? (
                    <button type="button" className="btn-secondary" onClick={clearFilters}>Clear filters</button>
                  ) : (
                    !noCategories && <button type="button" className="btn-primary" onClick={() => setModal({ type: 'create', item: null })}><PlusIcon className="h-5 w-5" /> Add subcategory</button>
                  )}
                </div>
              )
            )}
          </div>
        )}

        <Pagination meta={meta} onPage={setPage} disabled={loading} />
      </section>

      <SubcategoryForm
        open={modal.type === 'create' || modal.type === 'edit'}
        subcategory={modal.type === 'edit' ? modal.item : null}
        categories={categories}
        categoriesLoading={categoriesLoading}
        defaultCategoryId={categoryId}
        onClose={closeModal}
        onSubmit={handleSave}
      />
      <SubcategoryDetails open={modal.type === 'view'} subcategoryId={modal.type === 'view' ? modal.item?.id : null} onClose={closeModal} onEdit={(s) => setModal({ type: 'edit', item: s })} />
      <SubcategoryConfirmDialog open={modal.type === 'delete'} subcategory={modal.item} busy={deleting} onCancel={closeModal} onConfirm={handleDelete} />
      <ToastContainer toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </div>
  );
}
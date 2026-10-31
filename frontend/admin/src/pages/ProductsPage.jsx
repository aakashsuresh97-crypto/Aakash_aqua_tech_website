import { useCallback, useEffect, useState } from 'react';
import { checkAddToCart, checkBuyNow, createProduct, deleteProduct, listProducts, updateProduct } from '../api/productApi.js';
import useCategoryOptions from '../hooks/useCategoryOptions.js';
import useSubcategoryOptions from '../hooks/useSubcategoryOptions.js';
import useCart from '../hooks/useCart.js';
import useDebounce from '../hooks/useDebounce.js';
import useToasts from '../hooks/useToasts.js';
import ProductTable, { canBuy } from '../components/ProductTable.jsx';
import ProductForm from '../components/ProductForm.jsx';
import ProductDetails from '../components/ProductDetails.jsx';
import ProductConfirmDialog from '../components/ProductConfirmDialog.jsx';
import CheckoutSummaryModal from '../components/CheckoutSummaryModal.jsx';
import ToastContainer from '../components/ToastContainer.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import { CubeIcon, ExclamationIcon, PlusIcon, RefreshIcon, SearchIcon, XIcon } from '../components/Icons.jsx';

const PAGE_SIZE = 10;

// One dropdown for sorting on small screens; the table headers on desktop drive the same state.
const SORT_OPTIONS = [
  { value: '', label: 'Newest first (default)' },
  { value: 'product_name:asc', label: 'Name A–Z' },
  { value: 'product_name:desc', label: 'Name Z–A' },
  { value: 'selling_price:asc', label: 'Price: low to high' },
  { value: 'selling_price:desc', label: 'Price: high to low' },
  { value: 'stock_quantity:asc', label: 'Stock: low to high' },
  { value: 'stock_quantity:desc', label: 'Stock: high to low' },
  { value: 'sku:asc', label: 'SKU A–Z' },
  { value: 'brand:asc', label: 'Brand A–Z' },
  { value: 'mrp:desc', label: 'MRP: high to low' },
  { value: 'discount_percent:desc', label: 'Biggest discount' },
  { value: 'updated_at:desc', label: 'Recently updated' },
];

export default function ProductsPage({ onOpenCart }) {
  const toasts = useToasts();
  const cart = useCart();
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategoryOptions();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [status, setStatus] = useState(''); // '' | 'published' | 'draft' | 'inactive'
  const [stock, setStock] = useState(''); // '' | 'in' | 'low' | 'out'
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const dMin = useDebounce(minPrice);
  const dMax = useDebounce(maxPrice);
  const [sort, setSort] = useState({ by: '', order: 'asc' });
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  // The subcategory filter lists only the chosen category's subcategories.
  const { subcategories: filterSubs, loading: filterSubsLoading } = useSubcategoryOptions(categoryId);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState({ type: null, item: null });
  const [deleting, setDeleting] = useState(''); // '' | 'archive' | 'delete'
  const [checkout, setCheckout] = useState(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const closeModal = useCallback(() => setModal({ type: null, item: null }), []);

  // Back to page 1 whenever the search text changes
  useEffect(() => setPage(1), [debouncedSearch]);

  // Load the table from the API (search, filters, sorting and paging are applied on the server)
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listProducts(
      { page, limit: PAGE_SIZE, search: debouncedSearch.trim(), category_id: categoryId, subcategory_id: subcategoryId, publish_status: status, stock, min_price: dMin, max_price: dMax, sort_by: sort.by, sort_order: sort.order },
      controller.signal
    )
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
  }, [page, debouncedSearch, categoryId, subcategoryId, status, stock, dMin, dMax, sort, refreshKey]);

  async function handleSave(values) {
    if (modal.type === 'edit') {
      await updateProduct(modal.item.id, values);
      toasts.success('Product updated successfully');
    } else {
      await createProduct(values);
      toasts.success('Product created successfully');
      setPage(1);
    }
    try { localStorage.setItem('catalogue-updated', String(Date.now())); } catch { /* private mode */ }
    closeModal();
    refresh();
  }

  async function handleDelete(mode) {
    setDeleting(mode);
    try {
      await deleteProduct(modal.item.id, mode);
      toasts.success(mode === 'archive' ? `“${modal.item.product_name}” archived (inactive)` : `“${modal.item.product_name}” deleted`);
      try { localStorage.setItem('catalogue-updated', String(Date.now())); } catch { /* private mode */ }
      closeModal();
    } catch (err) {
      toasts.error(err.message);
    } finally {
      setDeleting('');
      refresh();
    }
  }

  // Clicking a column header: first click ascending, second descending, and so on.
  const handleSort = (field) => {
    setSort((s) => (s.by === field ? { by: field, order: s.order === 'asc' ? 'desc' : 'asc' } : { by: field, order: 'asc' }));
    setPage(1);
  };

  // Add to cart / Buy now ask the API first (POST /products/:id/add-to-cart | buy-now): it checks status, stock and quantity.
  async function addToCart(product, qty = 1) {
    if (!canBuy(product)) return toasts.error(`“${product.product_name}” is not available`);
    try {
      await checkAddToCart(product.id, qty);
    } catch (err) {
      return toasts.error(err.errors?.length ? `${err.message}: ${err.errors.join('; ')}` : err.message);
    }
    const inCart = cart.items.find((i) => i.id === product.id)?.qty || 0;
    const now = cart.add(product, qty);
    if (now === inCart) return toasts.error(`Only ${product.actions?.add_to_cart?.max_quantity ?? now} of “${product.product_name}” in stock: already in your cart`);
    toasts.success(`Added “${product.product_name}” to the cart (${now} in cart)`);
    return now;
  }
  async function buyNow(product, qty = 1) {
    if (!canBuy(product)) return toasts.error(`“${product.product_name}” is not available`);
    try {
      const res = await checkBuyNow(product.id, qty);
      closeModal();
      setCheckout(res.data);
    } catch (err) {
      toasts.error(err.errors?.length ? `${err.message}: ${err.errors.join('; ')}` : err.message);
    }
    return undefined;
  }

  const filtersActive = Boolean(search || categoryId || subcategoryId || status || stock || minPrice || maxPrice || sort.by);
  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
    setSubcategoryId('');
    setStatus('');
    setStock('');
    setMinPrice('');
    setMaxPrice('');
    setSort({ by: '', order: 'asc' });
    setPage(1);
  };
  const initialLoad = loading && rows.length === 0 && !meta;
  const noCategories = !categoriesLoading && !categoriesError && categories.length === 0;
  const sortValue = sort.by ? `${sort.by}:${sort.order}` : '';
  const sortOptions = SORT_OPTIONS.some((o) => o.value === sortValue) ? SORT_OPTIONS : [...SORT_OPTIONS, { value: sortValue, label: `${sort.by.replace('_', ' ')} (${sort.order})` }];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Product management</h2>
          <p className="text-sm text-slate-500">Create, price and stock the products in each category and subcategory.</p>
        </div>
        <button type="button" className="btn-primary" disabled={noCategories} title={noCategories ? 'Create a category and subcategory first' : undefined} onClick={() => setModal({ type: 'create', item: null })}>
          <PlusIcon className="h-5 w-5" /> Add product
        </button>
      </div>

      {categoriesError && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Could not load categories for the dropdowns: {categoriesError}</div>
      )}
      {noCategories && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          There are no categories yet. <a className="font-medium text-indigo-600 hover:underline" href="#/categories">Create a category</a> and a <a className="font-medium text-indigo-600 hover:underline" href="#/subcategories">subcategory</a> first, then add products.
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="relative sm:col-span-2 lg:col-span-3 xl:col-span-2">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="search" aria-label="Search products" placeholder="Search name, SKU, brand, description…" className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select aria-label="Filter by category" className="input" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId(''); setPage(1); }}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select aria-label="Filter by subcategory" className="input" value={subcategoryId} disabled={!categoryId || filterSubsLoading} onChange={(e) => { setSubcategoryId(e.target.value); setPage(1); }}>
            <option value="">{!categoryId ? 'Pick a category first' : filterSubsLoading ? 'Loading…' : 'All subcategories'}</option>
            {filterSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select aria-label="Filter by status" className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="inactive">Inactive</option>
          </select>
          <select aria-label="Filter by stock" className="input" value={stock} onChange={(e) => { setStock(e.target.value); setPage(1); }}>
            <option value="">Any stock level</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
            <option value="onbackorder">On backorder</option>
          </select>
          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
            <input type="number" min="0" step="0.01" aria-label="Minimum price" placeholder="Min ₹" className="input" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} />
            <span className="text-slate-400">–</span>
            <input type="number" min="0" step="0.01" aria-label="Maximum price" placeholder="Max ₹" className="input" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} />
          </div>
          <select aria-label="Sort products" className="input sm:col-span-1 lg:col-span-2 xl:col-span-2" value={sortValue}
            onChange={(e) => { const [by, order] = e.target.value.split(':'); setSort(by ? { by, order } : { by: '', order: 'asc' }); setPage(1); }}>
            {sortOptions.map((o) => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
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
            <Spinner className="h-6 w-6 text-indigo-600" /> Loading products…
          </div>
        ) : (
          <div className={`relative transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
            {loading && <div className="absolute right-4 top-3 z-10 text-indigo-600"><Spinner className="h-5 w-5" /></div>}
            {rows.length > 0 ? (
              <ProductTable
                products={rows}
                sort={sort}
                onSort={handleSort}
                onView={(p) => setModal({ type: 'view', item: p })}
                onEdit={(p) => setModal({ type: 'edit', item: p })}
                onDelete={(p) => setModal({ type: 'delete', item: p })}
                onAddToCart={(p) => addToCart(p, 1)}
              />
            ) : (
              !error && !loading && (
                <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><CubeIcon className="h-6 w-6" /></div>
                  <p className="font-medium text-slate-900">{filtersActive ? 'No products match your filters' : 'No products yet'}</p>
                  <p className="text-sm text-slate-500">{filtersActive ? 'Try a different search, category, subcategory, status or stock level.' : 'Add your first product to get started.'}</p>
                  {filtersActive ? (
                    <button type="button" className="btn-secondary" onClick={clearFilters}>Clear filters</button>
                  ) : (
                    !noCategories && <button type="button" className="btn-primary" onClick={() => setModal({ type: 'create', item: null })}><PlusIcon className="h-5 w-5" /> Add product</button>
                  )}
                </div>
              )
            )}
          </div>
        )}

        <Pagination meta={meta} onPage={setPage} disabled={loading} />
      </section>

      <ProductForm
        open={modal.type === 'create' || modal.type === 'edit'}
        product={modal.type === 'edit' ? modal.item : null}
        categories={categories}
        categoriesLoading={categoriesLoading}
        defaultCategoryId={categoryId}
        defaultSubcategoryId={subcategoryId}
        onClose={closeModal}
        onSubmit={handleSave}
      />
      <ProductDetails
        open={modal.type === 'view'}
        productId={modal.type === 'view' ? modal.item?.id : null}
        onClose={closeModal}
        onEdit={(p) => setModal({ type: 'edit', item: p })}
        onAddToCart={addToCart}
        onBuyNow={buyNow}
      />
      <ProductConfirmDialog open={modal.type === 'delete'} product={modal.item} busy={deleting} onCancel={closeModal} onConfirm={handleDelete} />
      <CheckoutSummaryModal open={Boolean(checkout)} result={checkout} onClose={() => setCheckout(null)} />
      <ToastContainer toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </div>
  );
}
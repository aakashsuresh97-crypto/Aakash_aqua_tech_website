import { clearInflight, request, sharedGet } from './categoryApi.js';

// Client for /api/v1/products. The backend field names are used as they are (no renaming layer):
// product_name, sku, slug, mrp, selling_price (= regular price), sale_price, effective_price, gst_percent,
// publish_status (draft | published | inactive), stock_status, shipping{}, seo{}, actions{add_to_cart, buy_now}, ...
const BASE_PATH = '/v1/products';
const idPath = (id) => `${BASE_PATH}/${encodeURIComponent(String(id))}`;

const withSpecs = (p) => (p && typeof p === 'object' ? { ...p, specifications: normalizeSpecs(p.specifications) } : p);
const withData = (res) => {
  if (!res) return res;
  if (Array.isArray(res.data)) return { ...res, data: res.data.map(withSpecs) };
  if (res.data && !res.data.item && !res.data.items) return { ...res, data: withSpecs(res.data) };
  return res;
};

/**
 * Filters (all optional): search, category_id, subcategory_id, publish_status, stock (in | low | out | onbackorder),
 * min_price, max_price, sort_by, sort_order. Paging, filtering and sorting happen on the server.
 */
export function listProducts({ page = 1, limit = 10, search, category_id, subcategory_id, publish_status, stock, min_price, max_price, sort_by, sort_order } = {}, signal) {
  const qs = new URLSearchParams({ page, limit });
  if (search) qs.set('search', search);
  if (category_id) qs.set('category_id', category_id);
  if (subcategory_id) qs.set('subcategory_id', subcategory_id);
  if (publish_status) qs.set('publish_status', publish_status);
  if (stock) qs.set('stock', stock);
  if (min_price !== undefined && min_price !== '') qs.set('min_price', min_price);
  if (max_price !== undefined && max_price !== '') qs.set('max_price', max_price);
  if (sort_by) {
    qs.set('sort_by', sort_by);
    qs.set('sort_order', sort_order === 'desc' ? 'desc' : 'asc');
  }
  return sharedGet(`${BASE_PATH}/page?${qs}`, signal).then(withData);
}

export const getProduct = (id, signal) => request(idPath(id), { signal }).then(withData);

export const createProduct = (data) => {
  clearInflight();
  return request(BASE_PATH, { method: 'POST', body: data }).then(withData);
};

// PUT: the API merges what is sent over the stored product, so sending the whole form is fine.
export const updateProduct = (id, data) => {
  clearInflight();
  return request(idPath(id), { method: 'PUT', body: data }).then(withData);
};

/** mode 'delete' removes the product for good; mode 'archive' keeps it but takes it off sale (publish_status = inactive). */
export const deleteProduct = (id, mode = 'delete') => {
  clearInflight();
  return request(`${idPath(id)}?mode=${mode === 'archive' ? 'archive' : 'delete'}`, { method: 'DELETE' }).then(withData);
};

// The backend only validates stock/quantity and returns the cart line / checkout summary; it does not store a cart or an order.
export const checkAddToCart = (id, quantity = 1) => request(`${idPath(id)}/add-to-cart`, { method: 'POST', body: { quantity } });
export const checkBuyNow = (id, quantity = 1) => request(`${idPath(id)}/buy-now`, { method: 'POST', body: { quantity } });

export function normalizeSpecs(raw) {
  let v = raw;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return [];
    try { v = JSON.parse(s); } catch { return [{ name: 'Details', value: s }]; }
  }
  if (Array.isArray(v)) {
    return v
      .map((x) => (x && typeof x === 'object' ? { name: String(x.name ?? x.key ?? ''), value: String(x.value ?? '') } : null))
      .filter((x) => x && (x.name || x.value));
  }
  if (v && typeof v === 'object') return Object.entries(v).map(([name, value]) => ({ name, value: String(value ?? '') }));
  return [];
}

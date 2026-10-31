// Thin client for the Subcategory API. Reuses the request helpers (base URL, errors, upload progress) of categoryApi.js.
import { clearInflight, request, sharedGet } from './categoryApi.js';

const idPath = (id) => `/subcategories/${encodeURIComponent(String(id))}`;

/** Filters: category_id, name (contains), brand (contains), status ('1' | '0' | ''), page, limit. */
export function listSubcategories({ page = 1, limit = 10, category_id, name, brand, status } = {}, signal) {
  const qs = new URLSearchParams({ page, limit });
  if (category_id) qs.set('category_id', category_id);
  if (name) qs.set('name', name);
  if (brand) qs.set('brand', brand);
  if (status !== undefined && status !== '') qs.set('status', status);
  return sharedGet(`/subcategories?${qs}`, signal);
}

export const getSubcategory = (id, signal) => request(idPath(id), { signal });

// `data` is plain JSON: { category_id, subcategory_name, brand_names: [], description, image: '<url>' | null, status }.
// Images are uploaded first with uploadImage() from categoryApi.js; only the returned URL string is sent here.
export const createSubcategory = (data) => {
  clearInflight();
  return request('/subcategories', { method: 'POST', body: data });
};
export const updateSubcategory = (id, data) => {
  clearInflight();
  return request(idPath(id), { method: 'PUT', body: data });
};
export const deleteSubcategory = (id) => {
  clearInflight();
  return request(idPath(id), { method: 'DELETE' });
};
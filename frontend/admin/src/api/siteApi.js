// Client for the storefront / sales / content endpoints. Same auth + 401 handling as categoryApi.request.
import { request, sharedGet, clearInflight, ApiRequestError } from './categoryApi.js';
import { expireSession, getToken } from '../auth/session.js';

const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export const qs = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.set(k, v); });
  const s = q.toString();
  return s ? `?${s}` : '';
};

/** Generic CRUD client for a content resource ("banners", "faqs", ...). */
/* list() uses sharedGet: while one GET for a URL is in flight, an identical call (React StrictMode runs every effect twice in `npm run dev`)
   shares it instead of sending a second request. After a write the shared requests are forgotten so the refresh that follows asks the server. */
const write = (path, opts) => { clearInflight(); return request(path, opts); };
export const resourceApi = (path) => ({
  list: (params, signal) => sharedGet(`/${path}${qs(params)}`, signal),
  get: (id) => request(`/${path}/${encodeURIComponent(id)}`),
  create: (body) => write(`/${path}`, { method: 'POST', body }),
  update: (id, body) => write(`/${path}/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  remove: (id) => write(`/${path}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
});

export const bannersApi = resourceApi('banners');
export const testimonialsApi = resourceApi('testimonials');
export const brandsApi = resourceApi('brands');
export const faqsApi = resourceApi('faqs');
export const zonesApi = resourceApi('zones');
export const pagesApi = resourceApi('pages');
export const blogApi = resourceApi('blog-posts');
export const amcPlansApi = resourceApi('amc-plans');
export const leadsApi = resourceApi('leads');
export const serviceRequestsApi = resourceApi('service-requests');

export const getDashboard = (signal) => sharedGet('/dashboard/summary', signal);

// orders
export const listOrders = (params, signal) => sharedGet(`/orders${qs(params)}`, signal);
export const getOrder = (id, signal) => sharedGet(`/orders/${encodeURIComponent(id)}`, signal);
export const setOrderStatus = (id, body) => write(`/orders/${encodeURIComponent(id)}/status`, { method: 'PATCH', body });
export const refundOrder = (id, body) => write(`/orders/${encodeURIComponent(id)}/refund`, { method: 'POST', body: body || {} });

/** Downloads the invoice PDF (needs the Authorization header, so a plain link cannot be used) and opens the save dialog. */
export async function downloadInvoice(order) {
  let res;
  try {
    res = await fetch(`${BASE}/orders/${encodeURIComponent(order.id)}/invoice`, { headers: { Authorization: `Bearer ${getToken()}` } });
  } catch {
    throw new ApiRequestError('Cannot reach the API server.');
  }
  if (!res.ok) {
    if (res.status === 401) expireSession();
    let msg = `Could not download the invoice (${res.status})`;
    try { msg = (await res.json()).message || msg; } catch { /* not JSON */ }
    throw new ApiRequestError(msg, { status: res.status });
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${order.order_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// catalogue menu settings
export const listCatalogNodes = () => sharedGet('/catalog-nodes');
export const saveCatalogNode = (type, id, body) => write(`/catalog-nodes/${type}/${encodeURIComponent(id)}`, { method: 'PUT', body });

export { clearInflight };

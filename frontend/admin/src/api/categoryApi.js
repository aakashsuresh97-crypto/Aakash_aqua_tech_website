// Thin client for the Category CRUD API. Base URL comes from VITE_API_BASE_URL.
import { expireSession, getToken } from '../auth/session.js';

const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

// npm run dev: never reuse a stored copy, so every call is a full 200. Production build: browser default (a 304 answer is tiny).
const FETCH_CACHE = import.meta.env.DEV ? 'no-store' : 'default';

// Every request carries the admin token; a 401 anywhere means the session ended, so the app returns to the login page.
const authHeader = () => (getToken() ? { Authorization: `Bearer ${getToken()}` } : {});

export class ApiRequestError extends Error {
  constructor(message, { status, errors } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.errors = errors || [];
  }
}

/**
 * multipart/form-data upload with real progress events (fetch cannot report upload progress).
 * The browser sets the multipart Content-Type + boundary itself - never set it manually.
 */
function uploadRequest(path, { method, body, onProgress, skipAuthExpiry }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${BASE}${path}`);
    Object.entries(authHeader()).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new ApiRequestError('Cannot reach the API server. Check that the backend is running and VITE_API_BASE_URL is correct.'));
    xhr.ontimeout = () => reject(new ApiRequestError('The upload timed out. Please try again.'));
    xhr.onabort = () => reject(new ApiRequestError('Upload cancelled.'));
    xhr.onload = () => {
      let payload = xhr.response;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch { payload = null; }
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(payload);
      if (xhr.status === 401 && !skipAuthExpiry) expireSession();
      reject(new ApiRequestError(payload?.message || `Request failed (${xhr.status})`, { status: xhr.status, errors: payload?.errors }));
    };
    xhr.timeout = 120000;
    xhr.send(body);
  });
}

export async function request(path, { method = 'GET', body, signal, onProgress, skipAuthExpiry = false } = {}) {
  if (body instanceof FormData) return uploadRequest(path, { method, body, onProgress, skipAuthExpiry });

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...authHeader() },
      body: body ? JSON.stringify(body) : undefined,
      signal,
      cache: FETCH_CACHE,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiRequestError('Cannot reach the API server. Check that the backend is running and VITE_API_BASE_URL is correct.');
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    if (res.status === 401 && !skipAuthExpiry) expireSession();
    throw new ApiRequestError(payload?.message || `Request failed (${res.status})`, { status: res.status, errors: payload?.errors });
  }
  return payload;
}

/*
 * Duplicate-request protection for list GETs.
 * React.StrictMode (development only) mounts components twice, which would fire the same GET twice
 * (the first one shows as "canceled"). While a GET for a given URL is still in flight, any identical
 * call shares that one request instead of sending another. Each caller can still cancel its own
 * wait through its AbortSignal without cancelling the shared network request.
 */
const inflight = new Map();

export const clearInflight = () => inflight.clear();

function withSignal(promise, signal) {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    if (signal.aborted) return onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

export function sharedGet(path, signal) {
  let shared = inflight.get(path);
  if (!shared) {
    shared = request(path).finally(() => inflight.delete(path));
    inflight.set(path, shared);
  }
  return withSignal(shared, signal);
}

export function listCategories({ page = 1, limit = 10, status, search } = {}, signal) {
  const qs = new URLSearchParams({ page, limit });
  if (status !== undefined && status !== '') qs.set('status', status);
  if (search) qs.set('search', search);
  return sharedGet(`/categories?${qs}`, signal);
}

// Category ids are UUID strings (e.g. 36a8b30f-e1bc-4118-918d-b7834393e55f); keep them as strings.
const idPath = (id) => `/categories/${encodeURIComponent(String(id))}`;

export const getCategory = (id, signal) => request(idPath(id), { signal });

// After any change, forget in-flight list requests so the refresh that follows always asks the server.
// `data` is a plain object (JSON) or a FormData (multipart, used when an image file is attached).
// `onProgress(percent)` is called during multipart uploads.
export const createCategory = (data, onProgress) => {
  inflight.clear();
  return request('/categories', { method: 'POST', body: data, onProgress });
};
export const updateCategory = (id, data, onProgress) => {
  inflight.clear();
  return request(idPath(id), { method: 'PUT', body: data, onProgress });
};
export const deleteCategory = (id) => {
  inflight.clear();
  return request(idPath(id), { method: 'DELETE' });
};

// Resolve a category from a {"metaProdCateEnty": "<uuid>"} reference (POST /categories/lookup).
export const lookupCategory = (metaProdCateEnty) => request('/categories/lookup', { method: 'POST', body: { metaProdCateEnty } });

// Step 1 of attaching an image: send ONLY the file (multipart/form-data) to POST /uploads/images.
// Resolves with { data: { url, filename, size, mimetype } }. The URL is then sent as a normal string in the
// `image` field of createCategory / updateCategory (JSON). `onProgress(percent)` reports the upload.
export const uploadImage = (file, onProgress) => {
  const body = new FormData();
  body.append('image', file);
  return request('/uploads/images', { method: 'POST', body, onProgress });
};

// Discards an uploaded image that was never saved on a category (best effort; refused if it is in use).
export const deleteUploadedImage = (url) => {
  const filename = String(url).split('?')[0].split('/').pop();
  return request(`/uploads/images/${encodeURIComponent(filename)}`, { method: 'DELETE' });
};
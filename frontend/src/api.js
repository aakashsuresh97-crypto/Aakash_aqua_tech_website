/* Public-site API client. Base URL: VITE_API_BASE_URL (default "/api"; Vite proxies it in development).
   Every response uses the backend envelope { success, message, data, errors, meta }. */
const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
export const TOKEN_KEY = 'aakash-customer-token'

export class ApiError extends Error {
  constructor(status, message, errors = []) {
    super(message)
    this.status = status
    this.errors = errors
  }
  /* the most useful text for a form: first field error, else the message */
  get friendly() {
    return (this.errors && this.errors[0]) || this.message
  }
}

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export const setToken = (t) => {
  try {
    t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private mode: the login lasts for this tab only */
  }
}

/* ---------- one request per identical GET ----------
   While a GET for a URL is still running, every other caller for the same URL (same token, same cache mode) waits for THAT request instead of
   sending another one. This removes duplicates whatever their source (start-up + page effect, a double render, two components asking for the same data)
   without hiding them. Writes (POST / PATCH / PUT / DELETE) and file downloads are never shared. */
const inflight = new Map()
const shared = (key, run) => {
  let p = inflight.get(key)
  if (!p) {
    p = run().finally(() => inflight.delete(key))
    inflight.set(key, p)
  }
  return p
}

/* The raw envelope { success, message, data, errors, meta }. Throws ApiError for a failed call. */
async function send(path, { method = 'GET', body, token, timeout = 15000, blob = false, cache, own = false }) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  let res
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
      cache: cache || (token || method !== 'GET' ? 'no-store' : 'default'),
    })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Please check your connection and try again.')
  }
  if (blob && res.ok) return res.blob()
  let json = null
  try {
    json = await res.json()
  } catch {
    /* not JSON */
  }
  if (!res.ok || (json && json.success === false)) {
    /* only a rejected CUSTOMER token ends the customer's session (an admin token checked on its own never does) */
    if (res.status === 401 && token && !own) window.dispatchEvent(new Event('customer:session-expired'))
    throw new ApiError(res.status, (json && json.message) || `Request failed (${res.status})`, (json && json.errors) || [])
  }
  return json
}

/* cache: 'default'  = the browser may reuse a copy while the server's Cache-Control says it is fresh (content: banners, FAQs ...)
            'no-cache' = reuse the copy only after the server confirms with a tiny 304 answer (products: prices / stock stay exact)
            'no-store' = never keep a copy (login, cart, orders: anything private or changing) - the default for those
   token: send this bearer token instead of the customer's (the admin token, for GET /auth/me). */
const request = (path, opts = {}) => {
  const { method = 'GET', auth = false, token: own, blob = false, cache } = opts
  const token = own || (auth ? getToken() : null)
  const run = () => send(path, { ...opts, token, own: Boolean(own) })
  return method === 'GET' && !blob ? shared(`GET ${path}|${token || ''}|${cache || ''}`, run) : run()
}

export async function api(path, opts = {}) {
  const json = await request(path, opts)
  if (opts.blob) return json
  return json ? json.data : null
}

/* like api() but also returns meta (lists) */
export async function apiList(path, opts = {}) {
  const json = await request(path, { cache: 'no-cache', ...opts })
  return { data: json.data, meta: json.meta }
}

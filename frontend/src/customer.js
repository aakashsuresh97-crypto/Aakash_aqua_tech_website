/* Customer session (email + password login; an admin account is sent on to the admin panel) + helpers for the server-side cart and Razorpay. Tiny external store, no library. */
import { useEffect, useState } from 'react'
import { api, getToken, setToken } from './api.js'
import { pidOf, site } from './site.js'
import { products } from './data.js'
import { spares } from './sparesData.js'

const state = { customer: null, checked: false }
const subs = new Set()
const emit = () => subs.forEach((f) => f())

/* The admin panel (/admin/) is a separate app on the same origin; it keeps its own token under this key (see admin/src/auth/session.js). */
const ADMIN_TOKEN_KEY = 'admin_token'
const setAdminToken = (t) => {
  try {
    t ? localStorage.setItem(ADMIN_TOKEN_KEY, t) : localStorage.removeItem(ADMIN_TOKEN_KEY)
  } catch {
    /* private mode */
  }
}

let ready
const sessionReady = new Promise((r) => (ready = r))
const markChecked = () => {
  state.checked = true
  ready()
  emit()
}

export async function restoreSession() {
  if (!getToken()) return markChecked()
  try {
    state.customer = await api('/customer/me', { auth: true })
  } catch (e) {
    /* only a rejected token logs the shopper out; a network hiccup keeps the saved login for the next try */
    if (e.status === 401 || e.status === 403) {
      setToken(null)
      state.customer = null
    }
  }
  markChecked()
}
window.addEventListener('customer:session-expired', () => {
  setToken(null)
  state.customer = null
  emit()
})

/* Stores what register / login returned. An admin account also gets the admin panel's token.
   Only the server decides who is an admin: this reads the answer (role / is_admin), it never sends or trusts a role of its own. */
export const isAdminReply = (d) => Boolean(d) && (d.role === 'admin' || d.is_admin === true)
/* where an admin goes after login: only a path inside /admin/ is accepted (a redirect_to pointing anywhere else is ignored) */
export const adminTarget = (d) => (d && typeof d.redirect_to === 'string' && /^\/admin(\/|$)/.test(d.redirect_to) ? d.redirect_to : '/admin/')

function startSession(d) {
  setToken(d.token)
  state.customer = d.customer
  /* role 'customer' / is_admin false (0) for a shopper, role 'admin' / is_admin true (1) for an admin */
  if (isAdminReply(d) && d.admin && d.admin.token) setAdminToken(d.admin.token)
  else setAdminToken(null)
  emit()
  return d
}

/* ---------- hidden admin entry (double-click on the logo) ----------
   Hiding the entry point is not security: this only decides whether to SHOW the panel. The panel and every admin API check the token on the server.
   Nothing is sent unless an admin token is stored; with one, the server (GET /auth/me) says whether it is still valid and belongs to an admin account. */
const ADMIN_ROLES = ['admin', 'staff']
export async function canOpenAdmin() {
  let token = null
  try {
    token = localStorage.getItem(ADMIN_TOKEN_KEY)
  } catch {
    /* storage blocked */
  }
  if (!token) return false
  try {
    const me = await api('/auth/me', { token })
    return Boolean(me) && ADMIN_ROLES.includes(me.role)
  } catch (e) {
    if (e.status === 401 || e.status === 403) setAdminToken(null) /* expired / revoked: forget it */
    return false
  }
}

/* POST /customer/auth/register  { name, email, password }  -> signed in at once */
export const register = async (name, email, password) => startSession(await api('/customer/auth/register', { method: 'POST', body: { name, email, password } }))
/* POST /customer/auth/login  { email, password } */
export const login = async (email, password) => startSession(await api('/customer/auth/login', { method: 'POST', body: { email, password } }))

export function logout() {
  api('/customer/auth/logout', { method: 'POST' }).catch(() => {})
  setToken(null)
  setAdminToken(null)
  state.customer = null
  emit()
}
export const updateProfile = async (body) => {
  state.customer = await api('/customer/me', { method: 'PATCH', body, auth: true })
  emit()
}

/* Runs fn now when somebody is logged in; otherwise opens the login / register window and runs fn after a successful login.
   Always asks for a login (also while the catalogue is the built-in one): accounts live in the database, not in the catalogue. */
export async function requireLogin(fn) {
  await sessionReady
  if (state.customer) return fn()
  window.dispatchEvent(new CustomEvent('aakash:login', { detail: { onDone: fn } }))
}

export function useCustomer() {
  const [, bump] = useState(0)
  useEffect(() => {
    const f = () => bump((n) => n + 1)
    subs.add(f)
    return () => subs.delete(f)
  }, [])
  return { customer: state.customer, checked: state.checked }
}

/* ---------- server cart <-> local cart ---------- */
const lineFor = (it) => {
  const pid = pidOf(it)
  return pid ? { product_id: pid, quantity: it.qty } : null
}
export const onlineLines = (items) => items.filter((i) => pidOf(i))
export const enquiryLines = (items) => items.filter((i) => !pidOf(i))

/* the cart item the local cart uses for a server cart line */
const localItem = (l) => {
  const p = products.find((x) => x.pid === l.product_id)
  if (p) return { id: p.slug, name: p.name, img: p.img, price: l.unit_price, mrp: l.mrp, url: '/product/' + p.slug, qty: l.quantity }
  const s = spares.find((x) => x.pid === l.product_id)
  if (s) return { id: 'sp-' + s.name, name: s.name, img: s.img, price: l.unit_price, mrp: l.mrp, qty: l.quantity }
  return null
}

/* ---------- Add to Cart through the API ----------
   A logged-in shopper's cart lives in the database: every add / quantity change / remove is sent to /customer/cart.
   Lines that cannot be bought online (option / variant / quote-on-request items, see pidOf) stay in this browser only. */
const serverPid = (item) => (state.customer ? pidOf(item) : null)
const quiet = (p) => p.catch(() => {}) /* checkout re-syncs the whole cart, so a failed change here is not fatal */
const addingNow = new Map() /* product uuid -> the add that is still running */
export const serverCart = {
  /* POST /customer/cart/items { product_id, quantity }. Rejects with the API's message when the product is out of stock / not available.
     Resolves with the cart the server returns (lines, subtotal, total), or null when this item is not an online product.
     A second click on the same product while its first add is still running is the same add (one request, one quantity step). */
  add(item, qty) {
    const pid = serverPid(item)
    if (!pid) return Promise.resolve(null)
    if (addingNow.has(pid)) return addingNow.get(pid)
    const p = api('/customer/cart/items', { method: 'POST', auth: true, body: { product_id: pid, quantity: qty } }).finally(() => addingNow.delete(pid))
    addingNow.set(pid, p)
    return p
  },
  setQty(item, qty) {
    const pid = serverPid(item)
    return pid ? quiet(api('/customer/cart/items/' + pid, { method: 'PATCH', auth: true, body: { quantity: qty } })) : Promise.resolve()
  },
  remove(item) {
    const pid = serverPid(item)
    return pid ? quiet(api('/customer/cart/items/' + pid, { method: 'DELETE', auth: true })) : Promise.resolve()
  },
  clear() {
    return state.customer ? quiet(api('/customer/cart', { method: 'DELETE', auth: true })) : Promise.resolve()
  },
}

/* after login: guest items go to the server cart; items saved on another device come into this one */
export async function syncCartAfterLogin(cart) {
  if (!site.live) return
  const lines = cart.items.map(lineFor).filter(Boolean)
  try {
    const d = lines.length ? await api('/customer/cart/merge', { method: 'POST', auth: true, body: { items: lines } }) : await api('/customer/cart', { auth: true })
    for (const l of d.items) {
      const it = localItem(l)
      if (it && !cart.items.some((x) => x.id === it.id)) cart.add(it, it.qty)
    }
  } catch {
    /* the local cart still works; checkout syncs again */
  }
}

/* before checkout: the server cart becomes exactly the online lines of the local cart */
export async function pushCart(items) {
  await api('/customer/cart', { method: 'DELETE', auth: true })
  const lines = items.map(lineFor).filter(Boolean)
  if (!lines.length) return { items: [], summary: { total: 0, item_count: 0 }, skipped: [] }
  return api('/customer/cart/merge', { method: 'POST', auth: true, body: { items: lines } })
}

/* ---------- Razorpay Checkout ---------- */
let rzpLoading
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve()
  rzpLoading =
    rzpLoading ||
    new Promise((res, rej) => {
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.onload = res
      s.onerror = () => {
        rzpLoading = null
        rej(new Error('Could not load the payment window. Please check your connection and try again.'))
      }
      document.head.appendChild(s)
    })
  return rzpLoading
}

/* Opens the Razorpay window for an order created by the server. Resolves with the paid order, or rejects (message for the user). */
export async function payOrder(orderId, params) {
  await loadRazorpay()
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: params.key_id,
      order_id: params.razorpay_order_id,
      amount: params.amount,
      currency: params.currency,
      name: params.name,
      description: params.description,
      prefill: params.prefill || {},
      theme: { color: '#0b3f66' },
      /* UPI, cards and net banking are what the account enables; nothing is forced here */
      handler: async (r) => {
        try {
          resolve(await api(`/customer/orders/${orderId}/payment/verify`, { method: 'POST', auth: true, body: r }))
        } catch (e) {
          reject(e)
        }
      },
      modal: { ondismiss: () => reject(Object.assign(new Error('Payment was not completed.'), { dismissed: true })) },
    })
    rzp.on('payment.failed', (r) => {
      api(`/customer/orders/${orderId}/payment/failed`, { method: 'POST', auth: true, body: { reason: (r.error && r.error.description) || 'Payment failed' } }).catch(() => {})
    })
    rzp.open()
  })
}

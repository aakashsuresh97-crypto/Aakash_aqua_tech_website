/* Customer-facing shop pages: email + password login / sign-up, checkout (Razorpay / Cash on Delivery), order page, account, service request form.
   Classes are prefixed st- (styles in store.css); the page frame reuses the cart page look (ct-page / ct-card / ct-btn). */
import { useEffect, useMemo, useRef, useState } from 'react'
import { api, ApiError } from './api.js'
import { WA, inr } from './data.js'
import { navigate } from './router.js'
import { track } from './track.js'
import { site, ensureSection, PAYMENTS_ENABLED, RAZORPAY_ENABLED } from './site.js'
import { adminTarget, enquiryLines, isAdminReply, login, logout, onlineLines, payOrder, pushCart, register, updateProfile, useCustomer, syncCartAfterLogin } from './customer.js'

/* ------------------------------------------------------------------ login */
export const openLogin = (onDone) => window.dispatchEvent(new CustomEvent('aakash:login', { detail: { onDone } }))

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/* the same rules the server enforces (utils/password.js in the API) */
const PW_RULES = [
  ['At least 10 characters', (p) => p.length >= 10],
  ['A lower case letter', (p) => /[a-z]/.test(p)],
  ['An upper case letter', (p) => /[A-Z]/.test(p)],
  ['A number', (p) => /[0-9]/.test(p)],
  ['A symbol (! @ # $ ...)', (p) => /[^A-Za-z0-9]/.test(p)],
]

export function LoginModal({ cart }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('login') /* 'login' | 'register' */
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const done = useRef(null)
  const first = useRef(null)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  useEffect(() => {
    const h = (e) => {
      done.current = e.detail && e.detail.onDone
      setMode('login')
      setF((s) => ({ ...s, password: '', confirm: '' }))
      setShow(false)
      setErr('')
      setOpen(true)
    }
    window.addEventListener('aakash:login', h)
    return () => window.removeEventListener('aakash:login', h)
  }, [])
  useEffect(() => {
    if (!open) return undefined
    const t = setTimeout(() => first.current && first.current.focus(), 50)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', esc)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', esc)
    }
  }, [open, mode])

  if (!open) return null
  const switchTo = (m) => {
    setMode(m)
    setErr('')
    setF((s) => ({ ...s, password: '', confirm: '' }))
  }
  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const email = f.email.trim()
    if (mode === 'register' && f.name.trim().length < 2) return setErr('Enter your name.')
    if (!EMAIL_RE.test(email)) return setErr('Enter a valid email address.')
    if (mode === 'register') {
      if (!PW_RULES.every(([, ok]) => ok(f.password))) return setErr('Please choose a password that meets all the rules below.')
      if (f.password !== f.confirm) return setErr('The two passwords do not match.')
    } else if (!f.password) return setErr('Enter your password.')
    setBusy(true)
    setErr('')
    try {
      const d = mode === 'register' ? await register(f.name.trim(), email, f.password) : await login(email, f.password)
      track(mode === 'register' ? 'sign_up' : 'login', {})
      setF({ name: '', email: '', password: '', confirm: '' })
      if (isAdminReply(d)) {
        /* the server says this account is an admin (role "admin", is_admin true / users.is_admin = 1): straight to the admin panel, which
           reads the token stored by login(). A customer (role "customer", is_admin false) stays on the website. */
        window.location.assign(adminTarget(d))
        return
      }
      await syncCartAfterLogin(cart)
      setOpen(false)
      const next = done.current
      done.current = null
      next && next()
    } catch (x) {
      setErr(x.friendly || x.message)
    }
    setBusy(false)
  }
  const reg = mode === 'register'
  return (
    <div className="modal" onClick={() => setOpen(false)}>
      <div className="glass pad box st-login" role="dialog" aria-modal="true" aria-labelledby="st-lh" onClick={(e) => e.stopPropagation()}>
        <button className="x" aria-label="Close" onClick={() => setOpen(false)}>
          ×
        </button>
        <h3 id="st-lh">{reg ? 'Create your account' : 'Log in'}</h3>
        <form onSubmit={submit} noValidate>
          <p className="st-hint">{reg ? 'Sign up once, then log in with your email and password whenever you shop.' : 'Log in to add items to your cart and place orders.'}</p>
          {reg && (
            <>
              <label className="st-lbl" htmlFor="st-name">
                Full name
              </label>
              <input id="st-name" ref={first} autoComplete="name" maxLength={100} placeholder="Your name" value={f.name} onChange={set('name')} />
            </>
          )}
          <label className="st-lbl" htmlFor="st-email">
            Email
          </label>
          <input id="st-email" ref={reg ? undefined : first} type="email" inputMode="email" autoComplete="email" maxLength={190} placeholder="you@example.com" value={f.email} onChange={set('email')} />
          <label className="st-lbl" htmlFor="st-pw">
            Password
          </label>
          <div className="st-pwrow">
            <input id="st-pw" type={show ? 'text' : 'password'} autoComplete={reg ? 'new-password' : 'current-password'} maxLength={72} placeholder={reg ? 'Create a password' : 'Your password'} value={f.password} onChange={set('password')} />
            <button type="button" className="st-link" onClick={() => setShow((v) => !v)} aria-pressed={show}>
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          {reg && (
            <>
              <ul className="st-rules" aria-label="Password rules">
                {PW_RULES.map(([label, ok]) => (
                  <li key={label} className={ok(f.password) ? 'ok' : ''}>
                    {ok(f.password) ? '✓' : '○'} {label}
                  </li>
                ))}
              </ul>
              <label className="st-lbl" htmlFor="st-pw2">
                Confirm password
              </label>
              <input id="st-pw2" type={show ? 'text' : 'password'} autoComplete="new-password" maxLength={72} placeholder="Type the password again" value={f.confirm} onChange={set('confirm')} />
            </>
          )}
          {err && (
            <p className="form-err" role="alert">
              {err}
            </p>
          )}
          <button className="btn" disabled={busy}>
            {busy ? (reg ? 'Creating account…' : 'Logging in…') : reg ? 'Create account' : 'Log in'}
          </button>
        </form>
        <p className="st-switch">
          {reg ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" className="st-link" onClick={() => switchTo(reg ? 'login' : 'register')}>
            {reg ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ helpers */
const EMPTY = { full_name: '', mobile: '', line1: '', line2: '', city: '', state: 'Tamil Nadu', pin_code: '' }
const STATES = ['Andhra Pradesh', 'Karnataka', 'Kerala', 'Puducherry', 'Tamil Nadu', 'Telangana', 'Other']
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '')
const money = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Field({ id, label, error, children }) {
  return (
    <div className={'st-f' + (error ? ' bad' : '')}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <small role="alert">{error}</small>}
    </div>
  )
}

function AddressFields({ v, set, errs = {} }) {
  const inp = (k, label, extra = {}) => (
    <Field id={'st-a-' + k} label={label} error={errs[k]}>
      <input id={'st-a-' + k} value={v[k] || ''} onChange={(e) => set({ ...v, [k]: extra.digits ? e.target.value.replace(/\D/g, '') : e.target.value })} {...extra.attrs} />
    </Field>
  )
  return (
    <>
      {inp('full_name', 'Full name *', { attrs: { autoComplete: 'name' } })}
      {inp('mobile', 'Mobile number *', { digits: true, attrs: { inputMode: 'numeric', maxLength: 10, autoComplete: 'tel-national' } })}
      {inp('line1', 'Street address *', { attrs: { autoComplete: 'address-line1', placeholder: 'House number and street name' } })}
      {inp('line2', 'Apartment, landmark (optional)', { attrs: { autoComplete: 'address-line2' } })}
      <div className="st-two">
        {inp('city', 'Town / City *', { attrs: { autoComplete: 'address-level2' } })}
        {inp('pin_code', 'PIN code *', { digits: true, attrs: { inputMode: 'numeric', maxLength: 6, autoComplete: 'postal-code' } })}
      </div>
      <Field id="st-a-state" label="State *" error={errs.state}>
        <select id="st-a-state" value={v.state || ''} onChange={(e) => set({ ...v, state: e.target.value })}>
          {STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
    </>
  )
}

const checkAddress = (a) => {
  const e = {}
  if (!a.full_name.trim()) e.full_name = 'Enter the name'
  if (!/^[6-9]\d{9}$/.test(a.mobile)) e.mobile = 'Enter a valid 10-digit mobile number'
  if (!a.line1.trim()) e.line1 = 'Enter the street address'
  if (!a.city.trim()) e.city = 'Enter the city'
  if (!/^[1-9]\d{5}$/.test(a.pin_code)) e.pin_code = 'Enter a 6-digit PIN code'
  if (!a.state.trim()) e.state = 'Choose the state'
  return e
}

const NeedLogin = ({ text }) => (
  <div className="ct-page">
    <section className="ct-card ct-empty st-need">
      <h2>Please log in</h2>
      <p>{text}</p>
      <button className="ct-btn" onClick={() => openLogin()}>
        Log in / Sign up
      </button>
    </section>
  </div>
)

/* ------------------------------------------------------------------ checkout */
export function CheckoutPage({ cart }) {
  const { customer, checked } = useCustomer()
  const [server, setServer] = useState(null)
  const [loadErr, setLoadErr] = useState('')
  const [addrs, setAddrs] = useState([])
  const [pick, setPick] = useState('new')
  const [addr, setAddr] = useState(EMPTY)
  const [errs, setErrs] = useState({})
  const [save, setSave] = useState(true)
  const [method, setMethod] = useState(RAZORPAY_ENABLED ? 'razorpay' : 'cod')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const lines = useMemo(() => onlineLines(cart.items), [cart.items])
  const enquiry = useMemo(() => enquiryLines(cart.items), [cart.items])

  useEffect(() => {
    if (!customer) return
    let live = true
    ;(async () => {
      try {
        const [a, c] = await Promise.all([api('/customer/addresses', { auth: true }), pushCart(cart.items)])
        if (!live) return
        setAddrs(a)
        const def = a.find((x) => x.is_default) || a[0]
        if (def) setPick(def.id)
        else setAddr((s) => ({ ...s, full_name: customer.name || '', mobile: customer.mobile || '' }))
        setServer(c)
      } catch (e) {
        live && setLoadErr(e.friendly || e.message)
      }
    })()
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer && customer.id])

  if (!PAYMENTS_ENABLED)
    return (
      <div className="ct-page">
        <section className="ct-card ct-empty">
          <h2>Online ordering is switched off</h2>
          <p>Please send your order from the cart page and our team will confirm it.</p>
          <a className="ct-btn" href="/cart">Back to cart</a>
        </section>
      </div>
    )
  if (!checked) return <div className="ct-page"><p>Loading…</p></div>
  if (!customer) return <NeedLogin text="Log in or create an account to place your order. Your cart will be kept." />
  if (!lines.length)
    return (
      <div className="ct-page">
        <section className="ct-card ct-empty">
          <h2>Nothing to check out</h2>
          <p>{enquiry.length ? 'The items in your cart are quoted on request. Please send the enquiry from the cart page.' : 'Your cart is empty.'}</p>
          <a className="ct-btn" href="/cart">Back to cart</a>
        </section>
      </div>
    )

  const issues = server ? server.items.filter((i) => i.issue) : []
  const place = async (e) => {
    e.preventDefault()
    setMsg('')
    let body = { payment_method: method, notes: notes.trim() || undefined }
    if (pick !== 'new') body.address_id = pick
    else {
      const er = checkAddress(addr)
      setErrs(er)
      if (Object.keys(er).length) return setMsg('Please correct the highlighted fields.')
      body = { ...body, address: addr, save_address: save }
    }
    if (issues.length) return setMsg('Please remove the unavailable items from your cart first.')
    setBusy(true)
    track('begin_checkout', { method })
    try {
      const d = await api('/customer/orders', { method: 'POST', auth: true, body })
      const id = d.order.id
      /* the server emptied its own cart when it created the order; this browser's copy is cleared once the payment step is over
         (not before, so a closed tab or a blocked payment script does not lose the items) */
      const clearLines = () => lines.forEach((l) => (cart.removeLocal || cart.remove)(l.id))
      if (method === 'cod') {
        clearLines()
        track('purchase', { method: 'cod', value: d.order.total })
        return navigate(`/order/${id}?placed=1`)
      }
      try {
        await payOrder(id, d.payment)
        clearLines()
        track('purchase', { method: 'razorpay', value: d.order.total })
        navigate(`/order/${id}?paid=1`)
      } catch (x) {
        clearLines()
        navigate(`/order/${id}?unpaid=${x.dismissed ? 'cancelled' : 'failed'}`)
      }
    } catch (x) {
      setMsg(x instanceof ApiError ? [x.message, ...(x.errors || [])].filter(Boolean).join(' – ') : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="ct-page st-co">
      <div className="ct-head">
        <h1>Checkout</h1>
        <p>Logged in as {customer.email}</p>
      </div>
      {loadErr && <p className="form-err" role="alert">{loadErr}</p>}
      <form className="st-grid" onSubmit={place} noValidate>
        <section className="ct-card st-box" aria-labelledby="st-bill">
          <h2 id="st-bill">Delivery details</h2>
          {addrs.length > 0 && (
            <fieldset className="st-saved">
              <legend className="sr">Saved addresses</legend>
              {addrs.map((a) => (
                <label key={a.id} className={'st-addr' + (pick === a.id ? ' on' : '')}>
                  <input type="radio" name="addr" checked={pick === a.id} onChange={() => setPick(a.id)} />
                  <span>
                    <b>{a.full_name}</b> · {a.mobile}
                    <br />
                    {a.line1}
                    {a.line2 ? ', ' + a.line2 : ''}, {a.city}, {a.state} {a.pin_code}
                  </span>
                </label>
              ))}
              <label className={'st-addr' + (pick === 'new' ? ' on' : '')}>
                <input type="radio" name="addr" checked={pick === 'new'} onChange={() => setPick('new')} />
                <span>Use a new address</span>
              </label>
            </fieldset>
          )}
          {pick === 'new' && (
            <>
              <AddressFields v={addr} set={setAddr} errs={errs} />
              <label className="st-chk">
                <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /> Save this address for next time
              </label>
            </>
          )}
          <Field id="st-notes" label="Order notes (optional)">
            <textarea id="st-notes" rows="3" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions, preferred installation time…" />
          </Field>
        </section>

        <aside className="ct-card st-box st-order" aria-labelledby="st-yo">
          <h2 id="st-yo">Your order</h2>
          <table className="st-tbl">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(server ? server.items : []).map((i) => (
                <tr key={i.product_id}>
                  <td>
                    {i.name} <b>× {i.quantity}</b>
                    {i.issue && <small className="st-bad"> {i.issue}</small>}
                  </td>
                  <td>{inr(i.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Shipping</th>
                <td>Free</td>
              </tr>
              <tr>
                <th scope="row">Total</th>
                <td><b>{server ? inr(server.summary.total) : '…'}</b> <small>(incl. GST)</small></td>
              </tr>
            </tfoot>
          </table>
          {enquiry.length > 0 && (
            <p className="st-note">
              {enquiry.length} item{enquiry.length > 1 ? 's' : ''} in your cart {enquiry.length > 1 ? 'are' : 'is'} quoted on request and not part of this order.{' '}
              <a href="/cart">See cart</a>
            </p>
          )}

          <fieldset className="st-pay">
            <legend className="sr">Payment method</legend>
            {RAZORPAY_ENABLED && (
              <label className={'st-pm' + (method === 'razorpay' ? ' on' : '')}>
                <input type="radio" name="pm" checked={method === 'razorpay'} onChange={() => setMethod('razorpay')} />
                <span>Pay by Razorpay</span>
              </label>
            )}
            {method === 'razorpay' && <p className="st-pmnote">Pay securely via UPI, Credit/Debit Card, or Internet Banking through Razorpay.</p>}
            <label className={'st-pm' + (method === 'cod' ? ' on' : '')}>
              <input type="radio" name="pm" checked={method === 'cod'} onChange={() => setMethod('cod')} />
              <span>Cash on delivery</span>
            </label>
            {method === 'cod' && <p className="st-pmnote">Pay in cash when your order is delivered.</p>}
          </fieldset>
          <p className="st-priv">
            Your personal data will be used to process your order and support your experience on this website, as described in our{' '}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">privacy policy</a>.
          </p>
          {msg && <p className="form-err" role="alert">{msg}</p>}
          <button className="st-place" disabled={busy || !server}>
            {busy ? 'Placing order…' : 'Place order'}
          </button>
        </aside>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ one order */
const STEPS = ['placed', 'confirmed', 'shipped', 'delivered']
export function OrderPage({ id }) {
  const { customer, checked } = useCustomer()
  const [o, setO] = useState(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const q = new URLSearchParams(window.location.search)

  const load = () => api('/customer/orders/' + id, { auth: true }).then(setO).catch((e) => setErr(e.friendly || e.message))
  useEffect(() => {
    if (customer) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer && customer.id, id])
  useEffect(() => {
    if (q.get('unpaid')) setMsg(q.get('unpaid') === 'cancelled' ? 'The payment window was closed. Your order is saved – you can pay now.' : 'The payment did not go through. You can try again.')
    if (q.get('paid')) setMsg('Payment successful. Thank you!')
    if (q.get('placed')) setMsg('Order placed. Our team will call you to confirm it.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!checked) return <div className="ct-page"><p>Loading…</p></div>
  if (!customer) return <NeedLogin text="Log in to see your order." />
  if (err) return <div className="ct-page"><p className="form-err" role="alert">{err}</p><a href="/account">My account</a></div>
  if (!o) return <div className="ct-page"><p>Loading order…</p></div>

  const payNow = async () => {
    setBusy(true)
    setMsg('')
    try {
      const p = await api(`/customer/orders/${o.id}/payment`, { auth: true })
      await payOrder(o.id, p)
      setMsg('Payment successful. Thank you!')
    } catch (x) {
      setMsg(x.dismissed ? 'The payment window was closed.' : x.friendly || x.message)
    }
    await load()
    setBusy(false)
  }
  const cancel = async () => {
    if (!window.confirm('Cancel this order?')) return
    setBusy(true)
    try {
      setO(await api(`/customer/orders/${o.id}/cancel`, { method: 'POST', auth: true }))
      setMsg('Order cancelled.')
    } catch (x) {
      setMsg(x.friendly || x.message)
    }
    setBusy(false)
  }
  const invoice = async () => {
    try {
      const b = await api(`/customer/orders/${o.id}/invoice`, { auth: true, blob: true })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = `invoice-${o.order_number}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    } catch (x) {
      setMsg(x.friendly || x.message)
    }
  }
  const at = STEPS.indexOf(o.status)
  const a = o.shipping_address
  return (
    <div className="ct-page st-co">
      <div className="ct-head">
        <h1>Order {o.order_number}</h1>
        <p>Placed {when(o.placed_at)}</p>
      </div>
      {msg && <p className="st-banner" role="status">{msg}</p>}
      <div className="st-grid">
        <section className="ct-card st-box">
          {o.status === 'cancelled' ? (
            <p className="st-bad"><b>Cancelled</b> {when(o.cancelled_at)}</p>
          ) : (
            <ol className="st-steps" aria-label="Order progress">
              {STEPS.map((s, i) => (
                <li key={s} className={i <= at ? 'on' : ''}>{s}</li>
              ))}
            </ol>
          )}
          {o.tracking_info && <p><b>Tracking:</b> {o.tracking_info}</p>}
          <table className="st-tbl">
            <thead><tr><th scope="col">Product</th><th scope="col">Total</th></tr></thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.product_id || i.name}><td>{i.name} <b>× {i.quantity}</b></td><td>{money(i.line_total)}</td></tr>
              ))}
            </tbody>
            <tfoot>
              <tr><th scope="row">Shipping</th><td>Free</td></tr>
              <tr><th scope="row">Total</th><td><b>{money(o.total)}</b></td></tr>
              <tr><th scope="row">Payment</th><td>{o.payment_method === 'cod' ? 'Cash on delivery' : 'Razorpay'} – {o.payment_status.replace('_', ' ')}</td></tr>
              {o.refund_amount > 0 && <tr><th scope="row">Refunded</th><td>{money(o.refund_amount)}</td></tr>}
            </tfoot>
          </table>
        </section>
        <aside className="ct-card st-box">
          <h2>Delivery address</h2>
          <address>{a.full_name}<br />{a.line1}{a.line2 ? ', ' + a.line2 : ''}<br />{a.city}, {a.state} {a.pin_code}<br />📞 {a.mobile}</address>
          <div className="st-actions">
            {o.can_pay && <button className="st-place" onClick={payNow} disabled={busy}>Pay {money(o.total)} now</button>}
            {o.invoice_available && <button className="ct-btn ghost" onClick={invoice}>Download invoice</button>}
            {o.can_cancel && <button className="ct-btn ghost" onClick={cancel} disabled={busy}>Cancel order</button>}
            <a className="ct-btn ghost" href={WA} target="_blank" rel="noopener noreferrer">Need help? WhatsApp us</a>
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ account */
export function AccountPage({ cart }) {
  const { customer, checked } = useCustomer()
  const [tab, setTab] = useState('orders')
  if (!checked) return <div className="ct-page"><p>Loading…</p></div>
  if (!customer) return <NeedLogin text="Log in to see your orders, saved addresses and service requests." />
  return (
    <div className="ct-page st-co">
      <div className="ct-head">
        <h1>My account</h1>
        <p>{customer.name ? customer.name + ' · ' : ''}{customer.email}</p>
        {customer.is_admin && (
          <p>
            <a href="/admin/" className="st-link">Open the admin panel</a>
          </p>
        )}
      </div>
      <div role="tablist" className="st-tabs" aria-label="Account sections">
        {[['orders', 'Orders'], ['addresses', 'Addresses'], ['service', 'Service requests'], ['profile', 'Profile']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
        <button className="st-out" onClick={() => { logout(); cart && (cart.clearLocal || cart.clear)(); navigate('/') }}>Log out</button>
      </div>
      <section className="ct-card st-box" role="tabpanel">
        {tab === 'orders' && <Orders />}
        {tab === 'addresses' && <Addresses />}
        {tab === 'service' && <MyService />}
        {tab === 'profile' && <Profile customer={customer} />}
      </section>
    </div>
  )
}

function useLoad(path) {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const reload = () => api(path, { auth: true }).then(setD).catch((e) => setErr(e.friendly || e.message))
  useEffect(() => { reload() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [path])
  return [d, err, reload]
}

function Orders() {
  const [d, err] = useLoad('/customer/orders?limit=50')
  if (err) return <p className="form-err">{err}</p>
  if (!d) return <p>Loading…</p>
  if (!d.length) return <p>You have not placed any orders yet. <a href="/shop/domestic/ro">Browse purifiers</a></p>
  return (
    <ul className="st-list">
      {d.map((o) => (
        <li key={o.id}>
          <a href={'/order/' + o.id}>
            <b>{o.order_number}</b>
            <span>{when(o.placed_at)} · {o.items.map((i) => i.name).join(', ').slice(0, 80)}</span>
            <span className={'st-chip ' + o.status}>{o.status}</span>
            <b>{money(o.total)}</b>
          </a>
        </li>
      ))}
    </ul>
  )
}

function Addresses() {
  const [d, err, reload] = useLoad('/customer/addresses')
  const [edit, setEdit] = useState(null)
  const [errs, setErrs] = useState({})
  const [msg, setMsg] = useState('')
  if (err) return <p className="form-err">{err}</p>
  if (!d) return <p>Loading…</p>
  const saveIt = async (e) => {
    e.preventDefault()
    const er = checkAddress(edit)
    setErrs(er)
    if (Object.keys(er).length) return
    try {
      const body = { full_name: edit.full_name, mobile: edit.mobile, line1: edit.line1, line2: edit.line2 || undefined, city: edit.city, state: edit.state, pin_code: edit.pin_code, is_default: Boolean(edit.is_default) }
      await api(edit.id ? '/customer/addresses/' + edit.id : '/customer/addresses', { method: edit.id ? 'PUT' : 'POST', auth: true, body })
      setEdit(null)
      setMsg('')
      reload()
    } catch (x) {
      setMsg(x.friendly || x.message)
    }
  }
  const del = async (a) => {
    if (!window.confirm('Delete this address?')) return
    await api('/customer/addresses/' + a.id, { method: 'DELETE', auth: true }).catch(() => {})
    reload()
  }
  if (edit)
    return (
      <form onSubmit={saveIt} noValidate>
        <h2>{edit.id ? 'Edit address' : 'New address'}</h2>
        <AddressFields v={edit} set={setEdit} errs={errs} />
        <label className="st-chk"><input type="checkbox" checked={Boolean(edit.is_default)} onChange={(e) => setEdit({ ...edit, is_default: e.target.checked })} /> Make this my default address</label>
        {msg && <p className="form-err" role="alert">{msg}</p>}
        <div className="st-row"><button className="ct-btn">Save address</button><button type="button" className="ct-btn ghost" onClick={() => setEdit(null)}>Cancel</button></div>
      </form>
    )
  return (
    <>
      {!d.length && <p>No saved addresses yet.</p>}
      <ul className="st-list">
        {d.map((a) => (
          <li key={a.id}>
            <div>
              <b>{a.full_name}</b> {a.is_default ? <span className="st-chip confirmed">default</span> : null}
              <br />{a.line1}{a.line2 ? ', ' + a.line2 : ''}, {a.city}, {a.state} {a.pin_code} · {a.mobile}
            </div>
            <div className="st-row"><button className="st-link" onClick={() => setEdit({ ...a })}>Edit</button><button className="st-link" onClick={() => del(a)}>Delete</button></div>
          </li>
        ))}
      </ul>
      <button className="ct-btn" onClick={() => { setErrs({}); setEdit({ ...EMPTY }) }}>Add a new address</button>
    </>
  )
}

function MyService() {
  const [d, err] = useLoad('/customer/service-requests')
  if (err) return <p className="form-err">{err}</p>
  if (!d) return <p>Loading…</p>
  return (
    <>
      {!d.length ? <p>No service requests yet.</p> : (
        <ul className="st-list">
          {d.map((s) => (
            <li key={s.id}><div><b>{s.service_type}</b> · {when(s.created_at)}<br />{s.product_note || s.description || ''}</div><span className={'st-chip ' + s.status}>{s.status}</span></li>
          ))}
        </ul>
      )}
      <p><a href="/service#request">Book a service or AMC</a></p>
    </>
  )
}

function Profile({ customer }) {
  const [f, setF] = useState({ name: customer.name || '', mobile: customer.mobile || '' })
  const [msg, setMsg] = useState('')
  const go = async (e) => {
    e.preventDefault()
    setMsg('')
    if (f.name.trim().length < 2) return setMsg('Enter your name.')
    if (f.mobile && !/^[6-9]\d{9}$/.test(f.mobile)) return setMsg('Enter a valid 10-digit mobile number, or leave it empty.')
    try {
      await updateProfile({ name: f.name.trim(), mobile: f.mobile || null })
      setMsg('Saved.')
    } catch (x) {
      setMsg(x.friendly || x.message)
    }
  }
  return (
    <form onSubmit={go} noValidate>
      <Field id="st-pn" label="Name"><input id="st-pn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></Field>
      <Field id="st-pe" label="Email (your login)"><input id="st-pe" type="email" value={customer.email || ''} readOnly autoComplete="email" /></Field>
      <Field id="st-pm" label="Mobile number (optional)"><input id="st-pm" inputMode="numeric" maxLength={10} value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value.replace(/\D/g, '') })} autoComplete="tel-national" /></Field>
      {msg && <p role="status">{msg}</p>}
      <button className="ct-btn">Save profile</button>
    </form>
  )
}

/* ------------------------------------------------------------------ service / AMC request (used on the Service page) */
export function ServiceRequestForm() {
  const { customer } = useCustomer()
  const [f, setF] = useState({ name: '', mobile: '', city: '', service_type: 'repair', amc_plan_id: '', product_note: '', description: '', company_website: '' })
  const [st, setSt] = useState('idle')
  const [err, setErr] = useState('')
  useEffect(() => {
    if (customer) setF((s) => ({ ...s, name: s.name || customer.name || '', mobile: s.mobile || customer.mobile || '' }))
  }, [customer])
  useEffect(() => {
    if (f.service_type === 'amc') ensureSection('amcPlans')
  }, [f.service_type])
  const set = (k) => (e) => setF({ ...f, [k]: k === 'mobile' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    if (f.name.trim().length < 2) return setErr('Please enter your name.')
    if (!/^[6-9]\d{9}$/.test(f.mobile)) return setErr('Enter a valid 10-digit mobile number.')
    setSt('sending')
    setErr('')
    try {
      const body = { ...f }
      if (!body.amc_plan_id) delete body.amc_plan_id
      await api('/public/service-requests', { method: 'POST', body, auth: true })
      track('service_request', { type: f.service_type })
      setSt('done')
    } catch (x) {
      setErr(x.friendly || x.message)
      setSt('idle')
    }
  }
  if (st === 'done') return <div className="st-banner" role="status"><b>Request received.</b> Our service team will call you shortly. You can also reach us on <a href={WA} target="_blank" rel="noopener noreferrer">WhatsApp</a>.</div>
  return (
    <form className="st-sr" id="request" onSubmit={submit} noValidate>
      <h3>Book a service or AMC</h3>
      <div className="st-two">
        <Field id="sr-name" label="Name *"><input id="sr-name" value={f.name} onChange={set('name')} autoComplete="name" /></Field>
        <Field id="sr-mob" label="Mobile number *"><input id="sr-mob" value={f.mobile} onChange={set('mobile')} inputMode="numeric" autoComplete="tel-national" /></Field>
      </div>
      <div className="st-two">
        <Field id="sr-city" label="City"><input id="sr-city" value={f.city} onChange={set('city')} autoComplete="address-level2" /></Field>
        <Field id="sr-type" label="I need">
          <select id="sr-type" value={f.service_type} onChange={set('service_type')}>
            <option value="repair">Repair / breakdown</option>
            <option value="installation">Installation</option>
            <option value="filter_change">Filter / membrane change</option>
            <option value="amc">AMC (annual maintenance)</option>
            <option value="other">Other</option>
          </select>
        </Field>
      </div>
      {f.service_type === 'amc' && site.amcPlans.length > 0 && (
        <Field id="sr-plan" label="AMC plan">
          <select id="sr-plan" value={f.amc_plan_id} onChange={set('amc_plan_id')}>
            <option value="">Not sure yet</option>
            {site.amcPlans.map((p) => <option key={p.id} value={p.id}>{p.name} – {inr(Number(p.price))}</option>)}
          </select>
        </Field>
      )}
      <Field id="sr-prod" label="Your purifier (brand / model)"><input id="sr-prod" value={f.product_note} onChange={set('product_note')} /></Field>
      <Field id="sr-desc" label="What is the problem?"><textarea id="sr-desc" rows="3" value={f.description} onChange={set('description')} /></Field>
      <input className="st-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="company_website" value={f.company_website} onChange={set('company_website')} />
      {err && <p className="form-err" role="alert">{err}</p>}
      <button className="ct-btn" disabled={st === 'sending'}>{st === 'sending' ? 'Sending…' : 'Request service'}</button>
    </form>
  )
}

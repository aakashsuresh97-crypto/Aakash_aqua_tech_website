/* Cart page – sand-cream card + deep-blue → teal pill button (same look as the Home "About us" card).
   Every class is prefixed ct- (styles in cart.css). */
import { useEffect, useRef, useState } from 'react'
import { WA, inr, hrefOf } from './data.js'
import { navigate } from './router.js'
import { site, PAYMENTS_ENABLED } from './site.js'
import { enquiryLines, onlineLines, requireLogin, useCustomer } from './customer.js'
import { openLogin } from './Store.jsx'

/* number that rolls from its old value to the new one */
function useCountUp(target, ms = 700) {
  const [v, setV] = useState(0)
  const cur = useRef(0)
  useEffect(() => {
    const a = cur.current
    const t0 = performance.now()
    let raf
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms)
      cur.current = a + (target - a) * (1 - Math.pow(1 - k, 3))
      setV(cur.current)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12h17m-6-6 6 6-6 6" />
  </svg>
)

const ORBS = [
  ['-14px', '8%', '30px', '7s'],
  ['96%', '3%', '46px', '9s'],
  ['101%', '46%', '26px', '6s'],
  ['34%', '98%', '34px', '8s'],
  ['-18px', '70%', '22px', '10s'],
]

export default function CartPage({ cart }) {
  const { items, setQty, remove, clear, count, total } = cart
  const [out, setOut] = useState([])
  const [burst, setBurst] = useState(0)
  const shown = useCountUp(total)

  const del = (id) => {
    setOut((o) => [...o, id])
    setTimeout(() => {
      remove(id)
      setOut((o) => o.filter((x) => x !== id))
    }, 380)
  }

  const { customer } = useCustomer()
  const online = onlineLines(items)
  const enquiry = enquiryLines(items)
  const onlineTotal = online.reduce((n, x) => n + x.qty * x.price, 0)
  /* live shop: items with a fixed price are paid online; option / quote-on-request items go to WhatsApp */
  const checkout = () => {
    setBurst((b) => b + 1)
    customer ? navigate('/checkout') : openLogin(() => navigate('/checkout'))
  }
  const order = (list = items) => {
    setBurst((b) => b + 1)
    const lines = list.map(
      (x, i) => `${i + 1}. ${x.name}${x.opt ? ' (' + x.opt + ')' : ''} x${x.qty} - ${inr(x.price * x.qty)}`,
    )
    const text = `I want to order:\n${lines.join('\n')}\nTotal: ${inr(list.reduce((n, x) => n + x.qty * x.price, 0))}`
    window.open(`${WA}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  return (
    <div className="ct-page">
      {ORBS.map(([x, y, s, t], i) => (
        <span key={i} className="ct-orb" style={{ '--x': x, '--y': y, '--s': s, '--t': t }} aria-hidden="true" />
      ))}

      <div className="ct-head">
        <h1>Your Cart</h1>
        <p>{count ? `${count} item${count > 1 ? 's' : ''} ready for free installation` : 'Nothing here yet'}</p>
      </div>

      {!items.length ? (
        <section className="ct-card ct-empty">
          <div className="ct-drop" aria-hidden="true">
            <i style={{ '--k': 0 }} />
            <i style={{ '--k': 1 }} />
            <svg viewBox="0 0 24 24">
              <defs>
                <linearGradient id="ctg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#0b3f66" />
                  <stop offset="1" stopColor="#0d8d97" />
                </linearGradient>
              </defs>
              <path d="M12 2.5S5 10 5 14.5a7 7 0 0 0 14 0C19 10 12 2.5 12 2.5z" fill="url(#ctg)" />
            </svg>
          </div>
          <h2>Your cart is empty</h2>
          <p>Add a purifier or a spare part and it will show up here.</p>
          <a className="ct-btn" href={hrefOf('ro')}>
            Browse purifiers <Arrow />
          </a>
        </section>
      ) : (
        <div className="ct-grid">
          <section className="ct-card ct-list" aria-label="Cart items">
            {items.map((x, i) => (
              <article className={'ct-row' + (out.includes(x.id) ? ' out' : '')} style={{ '--i': i }} key={x.id}>
                <div className="ct-img">
                  <img src={x.img} alt={x.name} loading="lazy" />
                </div>
                <div className="ct-info">
                  <h3>{x.url ? <a href={x.url}>{x.name}</a> : x.name}</h3>
                  {x.opt && <small>{x.opt}</small>}
                  <span className="ct-each">
                    {inr(x.price)}
                    {x.mrp > x.price && <s>{inr(x.mrp)}</s>}
                  </span>
                  <div className="ct-qty">
                    <button aria-label="Decrease quantity" onClick={() => setQty(x.id, x.qty - 1)}>
                      −
                    </button>
                    <b key={x.qty}>{x.qty}</b>
                    <button aria-label="Increase quantity" onClick={() => setQty(x.id, x.qty + 1)}>
                      +
                    </button>
                  </div>
                </div>
                <div className="ct-side">
                  <b key={x.qty} className="ct-line">
                    {inr(x.price * x.qty)}
                  </b>
                  <button className="ct-rm" onClick={() => del(x.id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
            <button className="ct-clear" onClick={clear}>
              Clear cart
            </button>
          </section>

          <aside className="ct-card ct-sum" aria-label="Order summary">
            <h2>Order summary</h2>
            <dl>
              <div>
                <dt>Subtotal ({count})</dt>
                <dd>{inr(Math.round(shown))}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd className="ok">Free</dd>
              </div>
              <div>
                <dt>Installation</dt>
                <dd className="ok">Free</dd>
              </div>
            </dl>
            <div className="ct-total">
              <span>Total</span>
              <b>{inr(Math.round(shown))}</b>
            </div>
            <small className="ct-tax">Inclusive of all taxes</small>

            <div className="ct-cta">
              {PAYMENTS_ENABLED && site.live && online.length > 0 ? (
                <>
                  <button className="ct-btn pulse" onClick={checkout}>
                    Proceed to order{enquiry.length ? ` (${online.length} item${online.length > 1 ? 's' : ''}, ${inr(onlineTotal)})` : ''} <Arrow />
                  </button>
                  {enquiry.length > 0 && (
                    <button className="ct-btn ghost" onClick={() => order(enquiry)}>
                      Enquire about {enquiry.length} other item{enquiry.length > 1 ? 's' : ''} on WhatsApp
                    </button>
                  )}
                </>
              ) : (
                <button className="ct-btn pulse" onClick={() => requireLogin(() => order())}>
                  Proceed to order <Arrow />
                </button>
              )}
              {burst > 0 && (
                <span className="ct-burst" key={burst} aria-hidden="true">
                  {Array.from({ length: 14 }, (_, i) => (
                    <i key={i} style={{ '--a': i * (360 / 14) + 'deg', '--d': 70 + (i % 3) * 26 + 'px' }} />
                  ))}
                </span>
              )}
            </div>
            <a className="ct-btn ghost" href={hrefOf('ro')}>
              Continue shopping
            </a>
            <ul className="ct-trust">
              <li>Free installation</li>
              <li>Free shipping</li>
              <li>Easy EMI</li>
            </ul>
          </aside>
        </div>
      )}
    </div>
  )
}
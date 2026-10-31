/* Spare part detail page (opens when a product is clicked on the Spares page, URL: /spare-product/<slug>).
   Same layout and CSS classes (sp-*) as the normal product page in Shop.jsx, so it looks identical. */
import { useEffect, useState } from 'react'
import payImg from './assets/pay-methods.png'
import { TrustStrip } from './Cro.jsx'
import ShareButton from './ShareButton.jsx'
import { PHONE, WA, inr, why } from './data.js'
import { mrpFor, saveOf } from './pricing.js'
import { spares, spareBySlug } from './sparesData.js'

const priceText = (p) => (p.price == null ? 'Price on request' : inr(p.price) + (p.max ? ' – ' + inr(p.max) : ''))
const model = (name) => name.split(' - ')[0]

export default function SpareDetail({ slug, addCart, buyNow }) {
  const p = spareBySlug(slug)
  const [q, setQ] = useState(1)
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const [img, setImg] = useState(p ? p.big : '')

  useEffect(() => {
    if (p) document.title = p.name + ' | Aakash Pure Aqua Tech'
  }, [p])

  if (!p)
    return (
      <div className="sp-page sp-empty">
        <h3>Product not found</h3>
        <a className="sp-btn" href="/shop/spares">
          Back to spares
        </a>
      </div>
    )

  const mrp = p.price != null ? mrpFor(p.name, p.price) : 0
  const save = saveOf(p.price, mrp)
  const features = [
    'Genuine spare part supplied by Aakash Pure Aqua Tech',
    'Compatible with ' + model(p.name) + ' RO water purifiers',
    'Free installation support and 24 hours service',
    'Affordable AMC plans',
  ]
  const specs = [
    ['Model', p.name],
    ['Brand', 'Olivar'],
    ['Category', p.type],
    ['Price', priceText(p) + (p.price != null ? ' (inclusive of all taxes)' : ' — call ' + PHONE)],
    ['Installation', 'Free installation by Aakash Pure Aqua Tech'],
  ]
  const cartItem = { id: 'sp-' + p.name, name: p.name, img: p.img, price: p.price, mrp, url: '/spare-product/' + p.slug }
  const related = spares.filter((s) => s.cat === p.cat && s.slug !== p.slug).concat(spares.filter((s) => s.cat !== p.cat && s.slug !== p.slug)).slice(0, 4)

  return (
    <div className="sp-page sp-pd">
      <div className="sp-crumb">
        <a href="/">Home</a> › <a href="/shop/spares">Spares</a> › <span>{p.name}</span>
      </div>
      <div className="sp-pdl">
        <div className="sp-left">
          <div className="sp-pimg">
            <img
              src={img}
              alt={p.name}
              width="600"
              height="600"
              decoding="async"
              onError={() => img !== p.img && setImg(p.img)}
            />
          </div>
        </div>

        <div className="sp-pinfo">
          <div className="shr-row">
            <h1>{p.name}</h1>
            <ShareButton title={p.name} text={p.name + ' – Aakash Pure Aqua Tech'} />
          </div>
          <p className="sp-desc">
            {p.name} is a genuine Olivar RO purifier spare ({p.type.toLowerCase()}), supplied by Aakash Pure Aqua Tech for safe,
            healthy and great-tasting drinking water.
          </p>
          <h2>Best Features</h2>
          <ul className="sp-bf">
            {features.map((f) => (
              <li key={f}>
                <span>✦</span>
                {f}
              </li>
            ))}
          </ul>

          <div className="sp-buybox">
            <h3>{p.name}</h3>
            <div className="sp-bp">
              <b>{priceText(p)}</b>
              {save > 0 && (
                <>
                  <s>MRP: {inr(mrp)}</s>
                  <em>Save {save}%</em>
                </>
              )}
            </div>
            <small>Tax included.</small>
            {p.max && <p className="sp-msg">Multiple variants available — call {PHONE} to choose the right option.</p>}
            <div className="sp-emi">
              <b>Easy EMI options available</b>
              <span>Call {PHONE} for exclusive offers</span>
            </div>
            <label className="sp-chk">
              Check Availability
              <span>
                <input
                  placeholder="Enter Pincode"
                  aria-label="Pincode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={pin}
                  maxLength={6}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                />
                <button
                  onClick={() =>
                    setMsg(
                      pin.length === 6
                        ? 'Delivery available — free shipping & free installation. Our team will confirm the date.'
                        : 'Please enter a valid 6-digit pincode',
                    )
                  }
                >
                  Check
                </button>
              </span>
            </label>
            {msg && <p className="sp-msg">{msg}</p>}
            <details>
              <summary>Product Features</summary>
              <ul>
                {features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </details>

            {p.price == null ? (
              <a
                className="sp-btn full"
                href={`${WA}?text=${encodeURIComponent('Enquiry: ' + p.name)}`}
                target="_blank"
                rel="noreferrer"
              >
                Enquire on WhatsApp
              </a>
            ) : (
              <>
                <div className="sp-qty">
                  <span>Quantity</span>
                  <div>
                    <button aria-label="Decrease quantity" onClick={() => setQ(Math.max(1, q - 1))}>
                      −
                    </button>
                    <b>{q}</b>
                    <button aria-label="Increase quantity" onClick={() => setQ(q + 1)}>
                      +
                    </button>
                  </div>
                </div>
                <p className="sp-call">
                  For exclusive offers and product inquiries, call us now at <b>{PHONE}</b>
                </p>
                <button className="sp-btn full" disabled={p.oos} onClick={() => buyNow(cartItem, q)}>
                  Buy it now
                </button>
              </>
            )}
            <div className="sp-pay">
              <span>Safe &amp; Secure Checkout</span>
              <img src={payImg} alt="Google Pay, PhonePe, Mastercard, Visa, Paytm, Cash on Delivery" width="535" height="80" loading="lazy" />
            </div>
            <TrustStrip />
            {p.price != null && (
              <button className="sp-btn ghost full" disabled={p.oos} onClick={() => addCart(cartItem, q)}>
                Add to cart
              </button>
            )}
            <a className="sp-btn ghost full" href={WA} target="_blank" rel="noreferrer">
              Request a call back
            </a>
            <details>
              <summary>How to use</summary>
              <p>Free installation by our technicians. Water quality &amp; TDS testing is done at your place.</p>
            </details>
            <details>
              <summary>Shipping &amp; Return policy</summary>
              <p>Free shipping on all orders over TN. Money guarantee and 24 hours service support.</p>
            </details>
          </div>

          <div className="sp-abt">
            <h2>About Product</h2>
            <p>
              {p.name} is part of our range of genuine Olivar spares for RO water purifiers. Replace it on time to keep your
              purifier delivering clean, safe and healthy water.
            </p>
            <h2>Technical Details</h2>
            <div className="sp-tablewrap">
              <table className="sp-spec">
                <tbody>
                  {specs.map(([a, b]) => (
                    <tr key={a}>
                      <th>{a}</th>
                      <td>{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h2>Why buy from Aakash Pure Aqua Tech</h2>
            <ul className="sp-bf">
              {why.map((w) => (
                <li key={w}>
                  <span>✔</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="sp-related" aria-labelledby="sprel-h">
          <h2 id="sprel-h">You may also like</h2>
          <div className="sp-rel-grid">
            {related.map((r) => (
              <a className="sp-rel" key={r.slug} href={'/spare-product/' + r.slug}>
                <img src={r.img} alt={r.name} width="300" height="300" loading="lazy" decoding="async" />
                <b>{r.name}</b>
                <span>{priceText(r)}</span>
                <small>{r.type}</small>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
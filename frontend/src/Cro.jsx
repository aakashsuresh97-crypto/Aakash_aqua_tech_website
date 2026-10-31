/* Conversion helpers: sticky mobile action bar, trust badges, related products. */
import { PHONE, WA, products, inr, cats } from './data.js'

const Svg = ({ d, ...p }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path d={d} />
  </svg>
)
const PHONE_D =
  'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z'
const CHAT_D = 'M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z'

/* Fixed bar at the bottom of phones: Call · WhatsApp · Book demo (product pages: price + Buy now). */
export function StickyBar({ product, onDemo }) {
  const price = product && !product.np ? inr(product.price) + (product.max ? '+' : '') : null
  const msg = product ? `I want to buy ${product.name}` : 'Hi, I want to know about your water purifiers'
  return (
    <div className="cro-bar" role="region" aria-label="Quick contact">
      <a className="cro-call" href={`tel:${PHONE.replace(/\s/g, '')}`}>
        <Svg d={PHONE_D} />
        <span>Call</span>
      </a>
      <a className="cro-wa" href={`${WA}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">
        <Svg d={CHAT_D} />
        <span>WhatsApp</span>
      </a>
      {product && !product.np ? (
        /* the product page buys what is selected there; it asks for a login first (see Detail in Shop.jsx) */
        <button className="cro-main" type="button" onClick={() => window.dispatchEvent(new Event('aakash:buy-now'))}>
          {price ? <small>{price}</small> : null}
          <b>Buy now</b>
        </button>
      ) : product ? (
        <a
          className="cro-main"
          href={`${WA}?text=${encodeURIComponent('I want to buy ' + product.name)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <b>Enquire</b>
        </a>
      ) : (
        <button className="cro-main" type="button" onClick={onDemo} data-cta="demo_open_bar">
          <b>Free Demo</b>
        </button>
      )}
    </div>
  )
}

const TRUST = ['Free installation', 'Easy EMI options', '24 hours service', 'Money guarantee', 'Free shipping']
export const TrustStrip = () => (
  <ul className="sp-trust" aria-label="Why customers buy from us">
    {TRUST.map((t) => (
      <li key={t}>
        <span aria-hidden="true">✔</span>
        {t}
      </li>
    ))}
  </ul>
)

/* "You may also like": same brand first, then same category. */
export function Related({ product }) {
  const same = products.filter((p) => p.cat === product.cat && p.slug !== product.slug)
  const list = [
    ...same.filter((p) => p.brand === product.brand),
    ...same.filter((p) => p.brand !== product.brand),
  ].slice(0, 4)
  if (!list.length) return null
  return (
    <section className="sp-related" aria-labelledby="rel-h">
      <h2 id="rel-h">You may also like</h2>
      <div className="sp-rel-grid">
        {list.map((p) => (
          <a className="sp-rel" key={p.slug} href={'/product/' + p.slug}>
            <img src={p.big || p.img} alt={p.name} width="300" height="300" loading="lazy" decoding="async" />
            <b>{p.name}</b>
            <span>
              {p.np ? (
                'Price on request'
              ) : (
                <>
                  {p.save > 0 && <s>{inr(p.mrp)}</s>} {inr(p.price) + (p.max ? ' – ' + inr(p.max) : '')}
                </>
              )}
            </span>
            <small>{cats[p.cat] ? cats[p.cat][0] : ''}</small>
          </a>
        ))}
      </div>
    </section>
  )
}
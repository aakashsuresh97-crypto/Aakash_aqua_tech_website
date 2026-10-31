/* Shop pages (category list, product detail, contact) – structure from "Updated Product Page",
   styled in the sand-cream theme (see shop.css). Every class is prefixed sp- so nothing clashes with the Home/About CSS. */
import { useEffect, useMemo, useRef, useState } from 'react'
import payImg from './assets/pay-methods.png'
import { TrustStrip, Related } from './Cro.jsx'
import ShareButton from './ShareButton.jsx'
import {
  u,
  PHONE,
  WA,
  inr,
  cats,
  groups,
  catGroup,
  catBrands,
  catAll,
  defBrand,
  brandInfo,
  brandName,
  hrefOf,
  blocks,
  products,
  stages,
  replaceGuide,
  why,
  faq,
} from './data.js'
import { mrpFor, saveOf } from './pricing.js'
import { refreshProduct, refreshCategory } from './site.js'

const pr = (p) => (p.np ? 'Price on request' : inr(p.price) + (p.max ? ' – ' + inr(p.max) : ''))
export const CatImg = ({ k }) =>
  cats[k][1] ? <img src={u(cats[k][1])} alt="" /> : <span className="sp-ph">{cats[k][3]}</span>

/* ---------------- category / brand list ---------------- */
export function Shop({ g, cat, brand: pickedBrand, addCart, buyNow }) {
  const brand = pickedBrand || defBrand[cat] // RO Water Purifiers opens on Aakash
  const grp = groups[g],
    bks = catBrands[cat] || []
  const needBrand = bks.length > 0 && !brand && !catAll.includes(cat)
  const all = products.filter((p) => p.cat === cat && (!brand || p.brand === brand))
  const top = Math.max(1000, Math.ceil(Math.max(0, ...all.map((p) => p.max || p.price)) / 1000) * 1000)
  const [sort, setSort] = useState(''),
    [lo, setLo] = useState(0),
    [hi, setHi] = useState(top)
  const [sortOpen, setSortOpen] = useState(true),
    [priceOpen, setPriceOpen] = useState(true)
  useEffect(() => {
    setSort('')
    setLo(0)
    setHi(top)
  }, [cat, brand, top])
  /* when this category (or brand) opens: category tree -> brands (ids) -> this category's products, from the API */
  useEffect(() => {
    refreshCategory(cat, brand)
  }, [cat, brand])
  const list = useMemo(() => {
    const l = all.filter((p) => p.price >= lo && p.price <= hi)
    const s = {
      lh: (a, b) => a.price - b.price,
      hl: (a, b) => b.price - a.price,
      az: (a, b) => a.name.localeCompare(b.name),
      za: (a, b) => b.name.localeCompare(a.name),
    }[sort]
    return s ? [...l].sort(s) : l
  }, [all, sort, lo, hi])
  const base = grp ? `/shop/${g}/${cat}` : `/shop/${cat}`
  const live = (brand && cat === 'ro' && brandInfo[brand]?.[2]) || cats[cat][2]
  return (
    <div className="sp-page">
      <div className="sp-head">
        <h1>{cats[cat][0]}</h1>
        <div className="sp-crumb">
          <a href="/">Home</a> ›{' '}
          {grp && (
            <>
              <a href={'/shop/' + g}>{grp.t}</a> ›{' '}
            </>
          )}
          <a href={base}>{cats[cat][0]}</a>
          {brand && (
            <>
              {' '}
              › <span>{brandName(brand)}</span>
            </>
          )}
        </div>
      </div>
      {blocks.find((b) => b[0] === cat) && <p className="sp-intro">{blocks.find((b) => b[0] === cat)[2]}</p>}
      {grp && (
        <nav className="sp-tiles" aria-label={grp.t + ' categories'}>
          {grp.bar.map((k) => (
            <a key={k} href={hrefOf(k)} className={'sp-tile' + (k === cat ? ' on' : '')}>
              <CatImg k={k} />
              <b>{cats[k][0]}</b>
            </a>
          ))}
        </nav>
      )}
      {bks.length > 0 && (
        <div className="sp-brands">
          <h3>{cats[cat][0]}</h3>
          <i className="sp-ul" />
          <nav className="sp-tabs" aria-label="Brands">
            {catAll.includes(cat) && (
              <a href={base} className={!brand ? 'on' : ''}>
                All
              </a>
            )}
            {bks.map((k) => (
              <a key={k} href={base + '/' + k} className={k === brand ? 'on' : ''}>
                {brandName(k)}
              </a>
            ))}
          </nav>
          {needBrand && <p className="sp-hint">Select a brand to see its products</p>}
        </div>
      )}
      {!needBrand &&
        (!all.length ? (
          <div className="sp-empty">
            <h3>{brand ? brandName(brand) : cats[cat][0]}</h3>
            <p>Products for this range are listed on our main website.</p>
            {live && (
              <a className="sp-btn" href={live} target="_blank" rel="noreferrer">
                View on aakashaquatech.in
              </a>
            )}
          </div>
        ) : (
          <>
            <p className="sp-count">
              Showing {list.length} of {all.length} products
            </p>
            <div className="sp-lay">
              <aside className="sp-filters">
                <div className="sp-fb">
                  <h4 onClick={() => setSortOpen(!sortOpen)}>Sort By</h4>
                  {sortOpen &&
                    [
                      ['lh', 'Price, low to high'],
                      ['hl', 'Price, high to low'],
                      ['az', 'Alphabetically, A-Z'],
                      ['za', 'Alphabetically, Z-A'],
                    ].map(([v, t]) => (
                      <label key={v}>
                        <input type="radio" name="s" checked={sort === v} onChange={() => setSort(v)} />
                        <i />
                        {t}
                      </label>
                    ))}
                </div>
                <div className="sp-fb">
                  <h4 onClick={() => setPriceOpen(!priceOpen)}>
                    Price <span>{priceOpen ? '⌃' : '⌄'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setLo(0)
                        setHi(top)
                      }}
                    >
                      Reset
                    </button>
                  </h4>
                  {priceOpen && (
                    <>
                      <div className="sp-dual">
                        <div className="sp-trk">
                          <div style={{ left: (lo / top) * 100 + '%', right: 100 - (hi / top) * 100 + '%' }} />
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={top}
                          step="100"
                          value={lo}
                          onChange={(e) => setLo(Math.min(+e.target.value, hi - 500))}
                        />
                        <input
                          type="range"
                          min="0"
                          max={top}
                          step="100"
                          value={hi}
                          onChange={(e) => setHi(Math.max(+e.target.value, lo + 500))}
                        />
                      </div>
                      <div className="sp-pin">
                        <label>
                          ₹<input type="number" value={lo} onChange={(e) => setLo(+e.target.value || 0)} />
                        </label>
                        —
                        <label>
                          ₹<input type="number" value={hi} onChange={(e) => setHi(+e.target.value || 0)} />
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </aside>
              <div className="sp-grid">
                {list.map((p) => (
                  <article className="sp-card" key={p.slug}>
                    {p.save > 0 && <span className="sp-badge">Save {p.save}%</span>}
                    <a className="sp-pic" href={'/product/' + p.slug}>
                      <img
                        src={p.max || p.cat !== 'ro' ? p.img : p.big}
                        alt={p.name}
                        width="600"
                        height="600"
                        loading="lazy"
                        decoding="async"
                      />
                    </a>
                    <h3>
                      <a href={'/product/' + p.slug}>{p.name}</a>
                    </h3>
                    <p className="sp-sm">{p.summary}</p>
                    <div className="sp-pr">
                      <b>{p.np ? pr(p) : (p.max ? 'Price' : 'Best Price') + ' : ' + pr(p)}</b>
                      {p.save > 0 && (
                        <span>
                          MRP <s>{inr(p.mrp)}</s> <small>(Inclusive of all taxes)</small>
                        </span>
                      )}
                      {p.save === 0 && !p.np && <small>Inclusive of all taxes</small>}
                    </div>
                    <div className="sp-act">
                      {p.max || p.v ? (
                        <>
                          <a className="sp-btn" href={'/product/' + p.slug}>
                            View Product
                          </a>
                          {p.v ? (
                            <a className="sp-btn ghost" href={'/product/' + p.slug}>
                              Select Options
                            </a>
                          ) : (
                            <a
                              className="sp-btn ghost"
                              href={`${WA}?text=${encodeURIComponent('I want to know about ' + p.name)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Enquire
                            </a>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            className="sp-btn"
                            disabled={p.oos}
                            onClick={() =>
                              buyNow({
                                id: p.slug,
                                name: p.name,
                                img: p.max || p.cat !== 'ro' ? p.img : p.big,
                                price: p.price,
                                mrp: p.mrp,
                                url: '/product/' + p.slug,
                              })
                            }
                          >
                            Buy Now
                          </button>
                          <button
                            className="sp-btn ghost"
                            disabled={p.oos}
                            onClick={() =>
                              addCart({
                                id: p.slug,
                                name: p.name,
                                img: p.max || p.cat !== 'ro' ? p.img : p.big,
                                price: p.price,
                                mrp: p.mrp,
                                url: '/product/' + p.slug,
                              })
                            }
                          >
                            {p.oos ? 'Out of stock' : 'Add to Cart'}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
                {!list.length && <p className="sp-none">No products match these filters.</p>}
              </div>
            </div>
          </>
        ))}
    </div>
  )
}

/* ---------------- product detail ---------------- */
/* Rows of the specification table for the selected option (Membrane / Model):
   the option itself becomes the first row, and an option may override or add rows via option.spec = [[label, value], ...] */
const withOption = (rows, label, o) => {
  const norm = (t) => t.trim().toLowerCase()
  const over = new Map((o.spec || []).map((r) => [norm(r[0]), r]))
  const merged = rows
    .filter((r) => norm(r[0]) !== norm(label))
    .map((r) => (over.has(norm(r[0])) ? [r[0], over.get(norm(r[0]))[1]] : r))
  const extra = (o.spec || []).filter((r) => !rows.some((x) => norm(x[0]) === norm(r[0])) && norm(r[0]) !== norm(label))
  return [[label, o.name], ...merged, ...extra]
}

export function Detail({ slug, addCart, buyNow }) {
  useEffect(() => {
    refreshProduct(slug) /* fresh data for this product, requested the moment the page opens */
  }, [slug])
  const p = products.find((x) => x.slug === slug)
  // option groups shown under the image: Commercial RO has several (Membrane / Panel / Pump), dispensers have one (Model)
  const groups = p ? p.configs || (p.variants ? [p.variants] : []) : []
  const keyOf = (g) => g.label.toLowerCase().replace(/\s+/g, '-')
  const [sel, setSel] = useState(() => {
    const qs = new URLSearchParams(window.location.search)
    const init = {}
    groups.forEach((g, i) => {
      const wanted = qs.get(keyOf(g)) || (i === 0 ? qs.get('opt') : null)
      init[g.label] = g.options.some((o) => o.name === wanted) ? wanted : g.options[0].name
    })
    return init
  })
  // the chosen option of every group (falls back to the first option, so a stale selection can never break the page)
  const chosen = groups.map((g) => g.options.find((o) => o.name === sel[g.label]) || g.options[0])
  const hasOpt = groups.length > 0
  const pickOpt = (g, name) => {
    setSel((s) => ({ ...s, [g.label]: name }))
    try {
      const qs = new URLSearchParams(window.location.search)
      qs.delete('opt')
      qs.set(keyOf(g), name)
      window.history.replaceState(null, '', window.location.pathname + '?' + qs.toString())
    } catch (e) {
      /* ignore */
    }
  }
  const [q, setQ] = useState(1),
    [pin, setPin] = useState(''),
    [msg, setMsg] = useState('')
  const buyRef = useRef(null)
  useEffect(() => {
    /* the fixed bar on phones (Cro.jsx StickyBar) asks this page to buy what is selected */
    const f = () => buyRef.current && buyRef.current()
    window.addEventListener('aakash:buy-now', f)
    return () => window.removeEventListener('aakash:buy-now', f)
  }, [])
  if (!p)
    return (
      <div className="sp-page sp-empty">
        <h3>Product not found</h3>
        <a className="sp-btn" href={hrefOf('ro')}>
          Back to products
        </a>
      </div>
    )
  const baseRows = p.tech || [
    ['Model', p.name],
    ...(p.brand ? [['Brand', brandName(p.brand)]] : []),
    ['Category', cats[p.cat] ? cats[p.cat][0] : p.cat],
    ...(p.p
      ? [
          ['Purification Process', p.p],
          ['Suitable For', 'Borewell, municipal, tanker or mixed water supply, depending on the TDS level'],
        ]
      : []),
    ['Price', p.np ? 'On request — call ' + PHONE : pr(p) + ' (inclusive of all taxes)'],
    ['Installation', 'Free installation by Aakash Pure Aqua Tech'],
  ]
  // every selected option becomes a row of the spec table and may override / add rows (applied last-to-first so Membrane stays on top)
  const rows = groups
    .map((g, i) => [g, chosen[i]])
    .reverse()
    .reduce((r, [g, o]) => withOption(r, g.label, o), baseRows)
  // an option can carry its own price / MRP; otherwise the product price (or range) is shown
  const priced = chosen.filter((o) => o.price).pop()
  const pv = priced
    ? {
        ...p,
        price: priced.price,
        max: priced.max || 0,
        np: false,
        mrp: mrpFor(p.slug + '|' + priced.name, priced.price, priced.mrp) || priced.price,
        save: saveOf(priced.price, mrpFor(p.slug + '|' + priced.name, priced.price, priced.mrp)),
      }
    : p
  const mainImg = ([...chosen].reverse().find((o) => o.image) || {}).image || p.big
  /* the cart line for what is on screen (same shape for "Add to cart", "Buy it now" and the mobile bar's "Buy now") */
  const cartItem = {
    id: p.slug + '|' + chosen.map((o) => o.name).join('|'),
    name: p.name,
    opt: groups.map((g, i) => `${g.label}: ${chosen[i].name}`).join(' · '),
    img: mainImg,
    price: pv.price,
    mrp: pv.mrp,
    url: '/product/' + p.slug,
  }
  const buyThis = () => buyNow(cartItem, q)
  buyRef.current = buyThis
  return (
    <div className="sp-page sp-pd">
      <div className="sp-crumb">
        <a href="/">Home</a> › <a href={hrefOf(p.cat)}>{cats[p.cat] ? cats[p.cat][0] : p.cat}</a> › <span>{p.name}</span>
      </div>
      <div className="sp-pdl">
        <div className={'sp-left' + (hasOpt ? ' has-opt' : '')} style={{ '--n': groups.length }}>
          <div className="sp-pimg">
            <img src={mainImg} alt={p.name} width="600" height="600" fetchpriority="high" decoding="async" />
          </div>
          {hasOpt && (
            <div className="sp-opt">
              {groups.map((g, i) => (
                <div className="sp-optg" key={g.label}>
                  <label htmlFor={'sp-opt-sel-' + i}>{g.label}</label>
                  <div className="sp-selwrap">
                    <select id={'sp-opt-sel-' + i} value={chosen[i].name} onChange={(e) => pickOpt(g, e.target.value)}>
                      <option value="" disabled>
                        Choose an option
                      </option>
                      {g.options.map((o) => (
                        <option key={o.name} value={o.name}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {chosen[i].code && <p className="sp-opt-code">{chosen[i].code}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="sp-pinfo">
          <div className="shr-row">
            <h1>{p.name}</h1>
            <ShareButton title={p.name} text={p.name + ' – Aakash Pure Aqua Tech'} />
          </div>
          <p className="sp-desc">{p.summary}</p>
          <h2>Best Features</h2>
          <ul className="sp-bf">
            {(p.features || []).map((f) => (
              <li key={f}>
                <span>✦</span>
                {f}
              </li>
            ))}
          </ul>

          <div className="sp-buybox">
            <h3>{p.name}</h3>
            <div className="sp-bp">
              <b>{pr(pv)}</b>
              {pv.save > 0 && (
                <>
                  <s>MRP: {inr(pv.mrp)}</s>
                  <em>Save {pv.save}%</em>
                </>
              )}
            </div>
            <small>Tax included.</small>
            {groups.map((g, i) => (
              <p className="sp-opt-line" key={g.label}>
                {g.label}: <b>{chosen[i].name}</b>
              </p>
            ))}
            {hasOpt && !priced && (
              <p className="sp-msg">
                Specifications below are for your selected {groups.map((g) => g.label.toLowerCase()).join(' / ')}. Call{' '}
                {PHONE} to confirm the exact price of this configuration.
              </p>
            )}
            {!hasOpt && (p.max || p.v) && (
              <p className="sp-msg">Multiple variants available — call {PHONE} to choose the right option.</p>
            )}
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
                {(p.features || []).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </details>
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
            <button className="sp-btn full" disabled={p.oos} onClick={buyThis}>
              Buy it now
            </button>
            <div className="sp-pay">
              <span>Safe &amp; Secure Checkout</span>
              <img
                src={payImg}
                alt="Google Pay, PhonePe, Mastercard, Visa, Paytm, Cash on Delivery"
                width="535"
                height="80"
                loading="lazy"
              />
            </div>
            <TrustStrip />
            <button
              className="sp-btn ghost full"
              disabled={p.oos}
              onClick={() => addCart(cartItem, q)}
            >
              Add to cart
            </button>
            <a className="sp-btn ghost full" href={WA} target="_blank" rel="noreferrer">
              Request a call back
            </a>
            <details>
              <summary>How to use</summary>
              <p>Free installation by our technicians. Water quality & TDS testing is done at your place.</p>
            </details>
            <details>
              <summary>Shipping & Return policy</summary>
              <p>Free shipping on all orders over TN. Money guarantee and 24 hours service support.</p>
            </details>
          </div>

          <div className="sp-abt">
            <h2>About Product</h2>
            {(p.about || [p.summary]).map((t, i) => (
              <p key={i}>{t}</p>
            ))}
            {p.p && (
              <>
                <h2>Purification Stages</h2>
                <div className="sp-stages">
                  {stages(p.p).map(([n, d]) => (
                    <div key={n}>
                      <b>{n}</b>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <h2>Technical Details</h2>
            <div className="sp-tablewrap">
              <table className="sp-spec">
                <tbody>
                  {rows.map(([a, b]) => (
                    <tr key={a}>
                      <th>{a}</th>
                      <td>{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!p.tech && (
              <p className="sp-specnote">
                Complete specification sheet for this model is available on request — call {PHONE}.
              </p>
            )}
            {catGroup[p.cat] === 'domestic' && (
              <>
                <h2>Filter Replacement Guide</h2>
                <table className="sp-spec">
                  <tbody>
                    {replaceGuide.map(([a, b]) => (
                      <tr key={a}>
                        <th>{a}</th>
                        <td>{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <h2>Why buy from Aakash Pure Aqua Tech</h2>
            <ul className="sp-bf">
              {why.map((w) => (
                <li key={w}>
                  <span>✔</span>
                  {w}
                </li>
              ))}
            </ul>
            <h2>Frequently Asked Questions</h2>
            {faq.map(([qq, an]) => (
              <details className="sp-faq" key={qq}>
                <summary>{qq}</summary>
                <p>{an}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
      <Related product={p} />
    </div>
  )
}

/* ---------------- contact / service ---------------- */
export function ContactPage({ onDemo }) {
  return (
    <div className="sp-page sp-empty">
      <h1>Contact us</h1>
      <p>
        <a href="tel:9655577666">{PHONE}</a> · <a href="mailto:ceo@aakashaquatech.in">ceo@aakashaquatech.in</a>
      </p>
      <address>
        10/62C, Brindavan Road, 1st Cross (Behind Dr. Sudamani Hospital), Fairlands, Salem - 636016, Tamil Nadu
      </address>
      <button className="sp-btn" onClick={onDemo}>
        Book Your Free Demo
      </button>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="sp-page sp-empty">
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist or has moved.</p>
      <a className="sp-btn" href="/">
        Back to home
      </a>
      <a className="sp-btn ghost" href={hrefOf('ro')}>
        Browse water purifiers
      </a>
    </div>
  )
}
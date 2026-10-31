/* =====================================================================
   SHIPPING & CANCELLATION POLICY PAGE – opens inside the app at /shipping-and-cancellation
   Full-width banner (title is live text on the banner) -> animated logo + heading -> numbered cards with bullet points.
   Re-uses privacy.css (.pp …) + terms.css (.tc … cards, bullets, timeline) + shipping.css (banner title). Keep all three imported in main.jsx.
   Colours: sandal + cream.
===================================================================== */
import { useEffect, useRef } from 'react'
import banner from './assets/legal/shipping-banner.webp'
import logo from './assets/footer-logo.png'

const C = 'Aakash Aqua Tech Private Limited'
const S = 'https://aakashaquatech.in/'
const BANNER_TITLE = '' /* text shown on the banner band – set '' if your banner image already has its own title */

const I = {
  truck: <><path d="M2 6h11v10H2zM13 10h4l4 3v3h-8" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  cancel: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>,
  box: <><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></>,
  wallet: <><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M5 7l11-3.5V7M16 13.5h2.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" /></>,
}
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {I[name]}
  </svg>
)

/* the site address -> link */
const rich = (t) =>
  t.split(S).reduce((out, part, i, arr) => {
    out.push(part)
    if (i < arr.length - 1)
      out.push(
        <a key={i} href={S} target="_blank" rel="noopener noreferrer">{S}</a>,
      )
    return out
  }, [])

const INTRO = `${C} aims to provide a smooth and reliable delivery experience for all customers. Shipping, delivery, and cancellation terms depend on product availability, customer location, order confirmation, and logistics support.`

const SECTIONS = [
  {
    id: 'shipping', icon: 'truck', title: 'Shipping',
    bullets: [
      'Customers must provide accurate contact and delivery address details to avoid delays.',
      'Delivery charges and timelines, if applicable, may vary depending on the product and delivery location.',
    ],
  },
  {
    id: 'cancellation', icon: 'cancel', title: 'Cancellation',
    bullets: [
      'Customers should submit cancellation requests as early as possible before dispatch or installation processing begins.',
      'Once dispatch or installation work has started, cancellation approval will depend on the order status and applicable company policy.',
    ],
  },
  {
    id: 'damaged', icon: 'box', title: 'Damaged or Incorrect Items',
    bullets: [
      `If a customer receives a damaged or incorrect product, they should contact ${C} with the order details and supporting photographs for review and assistance.`,
    ],
  },
  {
    id: 'refund', icon: 'wallet', title: 'Refund Timeline',
    bullets: [
      'Approved refunds, where applicable, will be processed through the original or mutually agreed payment method within the applicable processing timeline.',
    ],
  },
  {
    id: 'contact', icon: 'globe', title: 'Contact Us',
    bullets: [
      `For shipping, cancellation, or refund-related enquiries, please contact ${C} through our website:`,
      S,
    ],
  },
]

export default function ShippingPage() {
  const root = useRef(null)

  /* scroll reveal – kept inside the page because the page itself is lazy-loaded */
  useEffect(() => {
    const els = root.current ? root.current.querySelectorAll('.pp-rv') : []
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
      { threshold: 0.06, rootMargin: '0px 0px -6% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="pp tc sc" ref={root}>
      <span className="pp-drop d1" aria-hidden="true" />
      <span className="pp-drop d2" aria-hidden="true" />
      <span className="pp-drop d3" aria-hidden="true" />

      {/* ------------------------------------------------ full-width banner */}
      <section className="pp-banner">
        <img src={banner} alt="Shipping and Cancellation Policy" width="1920" height="640" fetchpriority="high" decoding="async" />
        {BANNER_TITLE && <span className="pp-banner-title" aria-hidden="true">{BANNER_TITLE}</span>}
      </section>

      <section className="pp-body">
        {/* ------------------------------------------------ heading + animated logo */}
        <div className="pp-head">
          <div className="pp-emblem" aria-hidden="true">
            <i className="r r1" />
            <i className="r r2" />
            <i className="r r3" />
            <svg className="orbit" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="56" />
            </svg>
            <img src={logo} alt="" />
            <span className="shield">
              <Icon name="truck" />
            </span>
          </div>
          <div className="pp-head-txt">
            <span className="pp-badge">
              <i /> Delivery · Cancellation · Refunds
            </span>
            <h1 className="pp-title">Shipping and Cancellation Policy</h1>
            <p className="pp-intro">{INTRO}</p>
          </div>
        </div>

        {/* ------------------------------------------------ numbered cards with bullets */}
        <div className="tc-list">
          {SECTIONS.map((s, i) => (
            <article className="pp-item pp-rv tc-sec" id={s.id} key={s.id} style={{ '--d': '0ms' }}>
              <span className="tc-node" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <header className="tc-hd">
                <span className="pp-ico"><Icon name={s.icon} /></span>
                <h2>{s.title}</h2>
              </header>
              <ul className="tc-ul">
                {s.bullets.map((b, j) => (
                  <li key={j} style={{ '--i': j }}>{rich(b)}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
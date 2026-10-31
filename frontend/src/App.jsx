import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import heroOlivar from './assets/hero/olivar.webp'
import heroAakash from './assets/hero/aakash.webp'
import heroSarwan from './assets/hero/sarwan.webp'
import heroEra from './assets/hero/era.webp'
import heroEnviro from './assets/hero/enviro.webp'
import heroSand from './assets/hero/sandfilter.webp'
import heroRoPlant from './assets/hero/roplant.webp'

import { FeaturedProducts, ProductScroll, PRODUCT_EXTRA } from './ProductSections.jsx'
import Brands from './Brands.jsx'
import heroBg from './assets/hero/hero-bg.webp'
import officePhoto from './assets/office/office.webp' // <- put your office photo here (same file name)
import footerLogo from './assets/footer-logo.png'
import { getPath, navigate } from './router.js'
import { findPost } from './blogData.js'
import { buildSeo, useSeo } from './seo.js'
import { track } from './track.js'
import { StickyBar } from './Cro.jsx'
import { useCart } from './cartStore.js'
import { menu, hrefOf, groups, cats, WA, u as dataImg, localImg } from './data.js'
import ErrorBoundary from './ErrorBoundary.jsx'
/* route-level code splitting: the shop / about / contact code loads only when a visitor opens those pages */
const AboutPage = lazy(() => import('./AboutPage.jsx'))
const BlogPage = lazy(() => import('./BlogPage.jsx'))
const ZonesPage = lazy(() => import('./ZonesPage.jsx'))
const ServicePage = lazy(() => import('./ServicePage.jsx'))
const TestimonialsPage = lazy(() => import('./TestimonialsPage.jsx'))
const PrivacyPage = lazy(() => import('./PrivacyPage.jsx'))
const TermsPage = lazy(() => import('./TermsPage.jsx'))
const DisclaimerPage = lazy(() => import('./DisclaimerPage.jsx'))
const ShippingPage = lazy(() => import('./ShippingPage.jsx'))
const BlogPost = lazy(() => import('./BlogPost.jsx'))
const Shop = lazy(() => import('./Shop.jsx').then((m) => ({ default: m.Shop })))
const Spares = lazy(() => import('./Spares.jsx'))
const SpareDetail = lazy(() => import('./SpareDetail.jsx'))
const CartPage = lazy(() => import('./CartPage.jsx'))
const Detail = lazy(() => import('./Shop.jsx').then((m) => ({ default: m.Detail })))
const ContactPage = lazy(() => import('./ContactPage.jsx'))
const NotFound = lazy(() => import('./Shop.jsx').then((m) => ({ default: m.NotFound })))
import { products as ALL_PRODUCTS } from './data.js'
import { api } from './api.js'
import { PAYMENTS_ENABLED, pidOf, site, subscribeSite, refreshCatalogue, ensureSection } from './site.js'
import { canOpenAdmin, requireLogin, restoreSession, serverCart, useCustomer } from './customer.js'
import { LoginModal, openLogin, CheckoutPage, OrderPage, AccountPage } from './Store.jsx'
import './store.css'
const PRODUCT_FOR_BAR = (slug) => ALL_PRODUCTS.find((x) => x.slug === slug) || null
const groupsOf = (k) => groups[k] || null
const catsOf = (k) => cats[k]

const U = 'https://aakashaquatech.in/'
const IMG = (p) => localImg(U + 'wp-content/uploads/' + p) /* local copy in public/img/wp when it exists (npm run images:localize) */
const LOGO = IMG('2026/07/IMG_5770-1003x1024.png')
const href = (h) => (h.startsWith('http') || h.startsWith('/') ? h : U + h) /* '/blog' stays inside the app */

const PRODUCTS = [
  [
    'RO Water Purifiers',
    'Trusted by thousands of customers, Aakash Pure Aqua Tech Pvt. Ltd. provides high-quality RO water purifiers that make your drinking water pure and safe. With RO + UV + UF and Live TDS Display, our systems purify effectively while retaining essential minerals with Alkaline & Copper technology.',
    '2026/08/IMG_7780-scaled.png',
    'ro-water-purifier-brand/',
  ],
  [
    'UV Water Purifiers',
    'Advanced UV water purifiers with storage. UV and UF purification removes harmful bacteria, viruses and cysts, ensuring safe and healthy drinking water for your family.',
    '2026/08/IMG_7787-scaled-e1785863931797.png',
    'uv-water-purifier-brands/',
  ],
  [
    'Gravity Water Purifiers',
    'Non-electric gravity purifiers that use the natural force of gravity to remove suspended impurities, bacteria and cysts. Ideal for areas with limited electricity.',
    '2026/08/IMG_7788-1024x1024.png',
    'product-category/domestic-ro/gravity/',
  ],
  [
    'Home Water Structuring Device',
    'A fully automatic, maintenance-free water conditioning solution that reduces the scale-forming properties of hard water. No electricity, chemicals, salt, filters or replacement parts.',
    '2026/08/IMG_7790-1024x1024.png',
    'softner/',
  ],
  [
    'SS Dispenser',
    'Trusted by Foxconn, Qualcomm, Hyundai, Yamaha, Ola, MRF, Amara Raja, Ford, LGB, TVS Group and Ashok Leyland. Installed at 5 ISRO centres and 16 international airports. India’s only water dispenser manufacturer with a BIS License across its entire range.',
    '2026/08/IMG_7782-1024x1024.png',
    'product-category/ss-water-dispenser-2/',
  ],
  [
    'Alkaline Water Filter Pitcher',
    'Zerob Alkaline Water Filter Pitchers turn regular drinking water into healthy alkaline water with enhanced mineral balance, raising pH up to 9.5.',
    '2026/08/IMG_7784-1024x1024.png',
    'product-category/alkaline/',
  ],
  [
    'Under Sink',
    'Pure drinking water while staying hidden beneath your kitchen sink. RO, UV and UF technologies remove contaminants, bacteria and viruses, delivered through a dedicated faucet. Ideal for borewell, tanker or municipal water.',
    '2026/08/IMG_7778-1024x562.png',
    'product-category/under-sink/',
  ],
]

const PRODUCT_ITEMS = PRODUCTS.map(([title, desc, p], i) => ({
  title,
  desc,
  img: IMG(p),
  href: hrefOf(['ro', 'uv', 'gravity', 'softner', 'dispenser', 'alkaline', 'undersink'][i]),
  ...PRODUCT_EXTRA[i],
}))

const STATS = [
  [35, '+', 'years of water treatment expertise'],
  [3, '', 'branches: Salem, Coimbatore, Dharmapuri'],
  [100, '+', 'custom dispenser solutions'],
  [16, '', 'international airports served'],
]

const FAQ_STATIC = [
  [
    'Why should I choose an RO water purifier?',
    'An RO (Reverse Osmosis) water purifier removes dissolved salts, heavy metals, chemicals, bacteria, viruses and other harmful impurities, providing clean, safe and great-tasting drinking water.',
  ],
  [
    'How do I know if I need an RO water purifier?',
    'If your water TDS is above 500 ppm, or if you use borewell, tanker or hard water, an RO purifier is recommended. Our experts provide a free water quality check to help you choose the right purifier.',
  ],
  [
    'What is TDS?',
    'TDS (Total Dissolved Solids) measures the concentration of dissolved minerals, salts and impurities present in water.',
  ],
  [
    'How often should RO filters be replaced?',
    'Sediment filter every 3–6 months, carbon filter every 6–12 months, RO membrane every 12–24 months.',
  ],
  [
    'Does RO purification remove essential minerals?',
    'Modern RO systems with Mineralizer, Alkaline Filter or TDS Controller restore essential minerals like calcium and magnesium.',
  ],
  [
    'Why choose AAKASH PURE AQUA TECH PVT LTD?',
    'Premium RO purifiers, free water quality and TDS testing, professional installation, genuine spare parts and filters, affordable AMC plans, fast after-sales support, and domestic, commercial and industrial solutions.',
  ],
]

/* FAQs edited in the admin replace the built-in list as soon as there is at least one */
/* invisible marker: asks the API for a section only when it is about to scroll into view */
function LoadWhenNear({ name }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return ensureSection(name) && undefined
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (io.disconnect(), ensureSection(name)), { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [name])
  return <span ref={ref} aria-hidden="true" />
}
const faqList = () => (site.faqs.length ? site.faqs.map((f) => [f.question, f.answer]) : FAQ_STATIC)

/* History-API router (see router.js): URL path = route, e.g. /shop/domestic/ro, /product/<slug>, /about */
const getHash = getPath
const routeOf = (h) =>
  h === '/'
    ? 'home'
    : h.startsWith('/about')
      ? 'about'
      : h.startsWith('/spare-product/')
      ? 'spare'
      : h.startsWith('/shop')
        ? 'shop'
        : h.startsWith('/cart')
          ? 'cart'
        : h.startsWith('/checkout')
          ? 'checkout'
        : h.startsWith('/order/')
          ? 'order'
        : h.startsWith('/account')
          ? 'account'
        : h.startsWith('/product')
          ? 'product'
          : h.startsWith('/contact')
            ? 'contact'
            : h.startsWith('/service')
              ? 'service'
            : h.startsWith('/zones-we-serve')
              ? 'zones'
              : h.startsWith('/testimonials')
              ? 'testimonials'
              : h.startsWith('/privacy-policy')
              ? 'privacy'
              : h.startsWith('/terms-and-conditions')
              ? 'terms'
              : h.startsWith('/disclaimer')
              ? 'disclaimer'
              : h.startsWith('/shipping-and-cancellation')
              ? 'shipping'
              : h.startsWith('/blog')
              ? 'blog'
              : findPost(h)
                ? 'post' /* blog article opened inside the app, e.g. /benefits-of-amc-for-ro-water-purifier-maintenance */
                : 'notfound'
const go = (e, path, after) => {
  e.preventDefault()
  navigate(path)
  after && after()
}

function useReveal(route) {
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
      { threshold: 0.15 },
    )
    const watch = (root) => {
      if (root.nodeType !== 1) return
      if (root.matches('.rv:not(.in)')) io.observe(root)
      root.querySelectorAll('.rv:not(.in)').forEach((el) => io.observe(el))
    }
    watch(document.body)
    /* lazy-loaded pages (About, Shop, ...) mount AFTER the route changes, when Suspense swaps its fallback for the page.
       Watch the DOM so those late .rv elements are revealed too – otherwise they stay at opacity:0 until the chunk is cached. */
    const mo = new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach(watch)))
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      mo.disconnect()
      io.disconnect()
    }
  }, [route])
}

function useRipple() {
  useEffect(() => {
    const fn = (e) => {
      const b = e.target.closest('.btn, .sp-btn')
      if (!b) return
      const r = b.getBoundingClientRect()
      const s = document.createElement('span')
      s.className = 'ripple'
      const d = Math.max(r.width, r.height)
      s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`
      b.appendChild(s)
      setTimeout(() => s.remove(), 650)
    }
    document.addEventListener('click', fn)
    return () => document.removeEventListener('click', fn)
  }, [])
}

function Tilt({ className = '', style, children }) {
  const ref = useRef(null)
  const move = (e) => {
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    ref.current.style.setProperty('--ry', x * 10 + 'deg')
    ref.current.style.setProperty('--rx', -y * 10 + 'deg')
    ref.current.style.setProperty('--mx', (x + 0.5) * 100 + '%')
    ref.current.style.setProperty('--my', (y + 0.5) * 100 + '%')
  }
  const leave = () => ['--rx', '--ry'].forEach((v) => ref.current.style.setProperty(v, '0deg'))
  return (
    <div ref={ref} style={style} className={'glass tilt ' + className} onMouseMove={move} onMouseLeave={leave}>
      {children}
    </div>
  )
}

function Counter({ to, suffix }) {
  const [n, setN] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const tick = (t) => {
        const p = Math.min((t - t0) / 1600, 1)
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [to])
  return (
    <b ref={ref}>
      {n}
      {suffix}
    </b>
  )
}

function splash(x, y) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const box = document.createElement('div')
  box.className = 'splash'
  box.style.left = x + 'px'
  box.style.top = y + 'px'
  const add = (cls, w, h) => {
    const el = document.createElement('i')
    el.className = cls
    if (w) {
      el.style.width = w + 'px'
      el.style.height = h + 'px'
    }
    box.appendChild(el)
    return el
  }
  // 3 flattened ripple rings spreading over the "surface"
  for (let i = 0; i < 3; i++) {
    add('ring').animate(
      [
        { transform: 'translate(-50%,-50%) scale(.2)', opacity: 0.95 },
        { transform: `translate(-50%,-50%) scale(${3.5 + i * 1.6})`, opacity: 0 },
      ],
      { duration: 800 + i * 180, delay: i * 110, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' },
    )
  }
  // 16 droplets thrown up and out, pulled down by gravity
  const g = 1100
  for (let i = 0; i < 16; i++) {
    const a = (Math.random() - 0.5) * 1.5
    const v = 130 + Math.random() * 250
    const vx = Math.sin(a) * v
    const vy = Math.cos(a) * v
    const T = ((2 * vy) / g) * 1.25
    const s = 5 + Math.random() * 9
    const el = add('dp', s, s * (1 + Math.random() * 0.5))
    const kf = []
    for (let k = 0; k <= 10; k++) {
      const t = (k / 10) * T
      kf.push({
        transform: `translate(${vx * t - s / 2}px,${-vy * t + 0.5 * g * t * t}px) scale(${1 - (0.5 * k) / 10})`,
        opacity: k > 7 ? 1 - (k - 7) / 3 : 1,
      })
    }
    el.animate(kf, { duration: T * 1000, easing: 'linear', fill: 'both' })
  }
  document.body.appendChild(box)
  setTimeout(() => box.remove(), 1500)
}

function useWater() {
  useEffect(() => {
    const root = document.documentElement
    const mv = (e) => {
      root.style.setProperty('--cx', e.clientX + 'px')
      root.style.setProperty('--cy', e.clientY + 'px')
    }
    const sc = () => {
      const h = root.scrollHeight - window.innerHeight
      root.style.setProperty('--sp', h > 0 ? window.scrollY / h : 0)
    }
    const drop = (e) => splash(e.clientX, e.clientY)
    window.addEventListener('mousemove', mv)
    window.addEventListener('scroll', sc)
    window.addEventListener('click', drop)
    sc()
    return () => {
      window.removeEventListener('mousemove', mv)
      window.removeEventListener('scroll', sc)
      window.removeEventListener('click', drop)
    }
  }, [])
}

function Water() {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 16 }, () => ({
        s: 8 + Math.random() * 26,
        l: Math.random() * 100,
        d: 12 + Math.random() * 16,
        y: -Math.random() * 20,
        x: (Math.random() - 0.5) * 120,
      })),
    [],
  )
  return (
    <>
      <div className="bg">
        <i className="blob b1" />
        <i className="blob b2" />
        <i className="blob b3" />
      </div>
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="bubble"
          style={{
            width: b.s,
            height: b.s,
            left: b.l + '%',
            animationDuration: b.d + 's',
            animationDelay: b.y + 's',
            '--dx': b.x + 'px',
          }}
        />
      ))}
    </>
  )
}

/* ---------------- HERO : light layout + auto-sliding avatar + changing content ---------------- */
// Each slide = image + its own text. Add / remove / reorder slides here – everything adapts automatically.
// title = 3 lines; a line written as ['plain ', 'highlighted'] shows the 2nd part in blue gradient.
const HERO_SLIDES = [
  {
    img: heroAakash,
    alt: 'Aakash Pure H2O and Fonix Pure H2O water purifiers',
    badge: 'India’s Advanced Mineral RO™ Purifiers',
    title: ['Pure, Healthy Water for', ['100% ', 'Pure Alkaline'], 'Living'],
    lead: 'Advanced 10-Stage Multi-Stage RO + UV + UF Filtration infused with Active Copper & essential natural minerals. Tested and certified for 99.9% purity with zero water wastage.',
    chips: [
      ['Aakash Pure H2O', 'Micro Controller Display', '#ef8a8a'],
      ['Fonix Pure H2O', 'High-Flow Purification', '#bfeaf2'],
    ],
  },
  {
    img: heroOlivar,
    alt: 'Olivar S1 and Olivar Volcano water purifiers',
    badge: 'Olivar · S1 & Volcano Series',
    title: ['Smart Touch Control,', ['Copper + Zinc ', 'Alkaline'], 'Water'],
    lead: 'Olivar S1 and Volcano bring a smart touch display, LED indicators and Copper + Zinc Alkaline purification to your kitchen, in a modern design that suits every home.',
    chips: [
      ['Olivar S1', 'Smart Touch Display', '#f0a15c'],
      ['Olivar Volcano', 'Copper Zinc Alkaline', '#bfeaf2'],
    ],
  },
  {
    img: heroSarwan,
    alt: "Sarwan's Wave Krystal Copper and Digital water purifiers",
    badge: 'Sarwan’s Wave · Krystal Series',
    title: ['See Every Stage of', ['Your Water ', 'Purification'], 'Clearly'],
    lead: 'Watch the filters at work through the transparent Krystal body, with a digital TDS display and ISI-marked quality backed by 25 years of excellence.',
    chips: [
      ['Wave Krystal Copper', 'Transparent Body', '#8cc4f0'],
      ['Wave Krystal Digital', 'Digital TDS Display', '#bfeaf2'],
    ],
  },
  {
    img: heroEra,
    alt: 'Aqua Era Silk Series water purifier',
    badge: 'Aqua Era · Silk Series',
    title: ['Silk-Smooth Design,', ['Pure Water ', 'On Time'], 'Every Time'],
    lead: 'The Aqua Era Silk Series pairs a premium ribbed see-through tank with simple Power, Full and Purify indicators, so pure water is always ready.',
    chips: [
      ['Aqua Era', 'Silk Series', '#d9d2c7'],
      ['Drink on time', 'Power · Full · Purify', '#bfeaf2'],
    ],
  },
  {
    img: heroEnviro,
    alt: 'Enviro Water Structuring Units with EMF technology',
    badge: 'Enviro · Water Structuring Unit',
    title: ['Soften Hard Water', ['Naturally, ', 'No Salt'], 'No Electricity'],
    lead: 'Enviro Water Structuring Units use EMF technology to reduce the scale-forming properties of hard water, with no electricity, chemicals, salt, filters or replacement parts.',
    chips: [
      ['Enviro Water Structuring', 'EMF Technology', '#9ad65c'],
      ['Enviro Natural Softener', 'ISO 9001-2015', '#bfeaf2'],
    ],
  },
  {
    img: heroSand,
    alt: 'Aakash sand filter with pre-filter housing and multiport valve',
    badge: 'Aakash · Sand Filter',
    title: ['Say Goodbye to', ['Dirt & ', 'Turbidity'], 'in Your Water'],
    lead: 'Our sand filters remove suspended particles, silt and turbidity from borewell, tanker and municipal water, protecting your RO purifier and plumbing.',
    // 4th value (optional) = custom chip position, e.g. { top: '10%', right: '0%' } or { top: '50%', left: '0%' }
    chips: [
      ['Aakash Sand Filter', 'FRP Pressure Vessel', '#8cc4f0', { top: '8%', right: '0%' }],
      ['Pre-Filter Housing', 'Sediment Protection', '#bfeaf2', { top: '52%', left: '0%' }],
    ],
  },
  {
    img: heroRoPlant,
    alt: 'Aakash commercial RO plant with digital controller and flow meters',
    badge: 'Aakash · Industrial RO Plant',
    title: ['Industrial RO Plants', ['Built for ', 'Heavy Use'], 'Every Day'],
    lead: 'Stainless-steel RO plants with a digital controller, input/output pressure gauges and reject/permeate flow meters, backed by 35 years of water treatment expertise.',
    chips: [
      ['Aakash RO Plant', 'Digital Controller', '#8cc4f0', { top: '2%', left: '0%' }],
      ['Flow Meters', 'Reject · Permeate', '#bfeaf2', { top: '56%', left: '0%' }],
    ],
  },
]
const HERO_MS = 5000

const Ic = ({ children, className }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
)

/* a banner added in the admin with placement "Hero slide" -> one more hero slide (same shape as HERO_SLIDES) */
const bannerSlide = (b) => ({
  img: b.image_url,
  alt: b.title || '',
  badge: b.subtitle || '',
  title: [b.title],
  lead: b.description || '',
  chips: [],
  href: b.link_url || '',
  btn: b.button_text || 'Learn more',
})

/* Product showcase (the image + text rows). A banner replaces a built-in product row instead of being added at the end:
   - Display order 1-7 replaces that numbered row (1 = the first product, 2 = the second ...)
   - Display order 0 (or a number already taken) takes the first row that is still free, oldest banner first
   - more banners than rows: the extra ones are added at the end */
const showcaseItems = (items, banners) => {
  const toItem = (b) => ({ title: b.title, sub: b.subtitle || '', desc: b.description || '', img: b.image_url, href: b.link_url || '#', btn: b.button_text })
  const out = [...items]
  const taken = new Set()
  const waiting = []
  const oldestFirst = [...banners].sort((x, y) => new Date(x.created_at) - new Date(y.created_at))
  for (const b of oldestFirst) {
    const n = Number(b.display_order)
    if (n >= 1 && n <= items.length && !taken.has(n - 1)) {
      out[n - 1] = toItem(b)
      taken.add(n - 1)
    } else waiting.push(b)
  }
  let slot = 0
  for (const b of waiting) {
    while (taken.has(slot)) slot += 1
    if (slot < items.length) {
      out[slot] = toItem(b)
      taken.add(slot)
    } else out.push(toItem(b))
  }
  return out
}

function Hero({ onDemo }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const slides = [...HERO_SLIDES, ...site.heroBanners.map(bannerSlide)]
  const n = slides.length
  const cur = slides[i] || slides[0]
  const next = () => setI((v) => (v + 1) % n)

  // auto-advance; the timer restarts every time the slide changes (auto, Next button or dot click)
  useEffect(() => {
    if (paused) return
    const t = setTimeout(next, HERO_MS)
    return () => clearTimeout(t)
  }, [i, paused, n])

  return (
    <section className="hx" style={{ '--hx-bg': `url(${heroBg})` }}>
      <span className="hx-bub" />
      <div className="hx-in">
        <div className="hx-copy">
          {/* this block re-mounts on every slide change, so its text animates in again */}
          <div className="hx-txt" key={i} aria-live="polite">
            {cur.badge && <span className="hx-badge" style={{ '--d': 0 }}>
              <Ic>
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              </Ic>
              {cur.badge} <i />
            </span>}

            <h1 className="hx-title" style={{ '--d': 1 }}>
              {cur.title.map((l, k) =>
                Array.isArray(l) ? (
                  <span key={k}>
                    {l[0]}
                    <em>{l[1]}</em>
                  </span>
                ) : (
                  <span key={k}>{l}</span>
                ),
              )}
            </h1>

            <p className="hx-lead" style={{ '--d': 2 }}>
              {cur.lead}
            </p>
          </div>

          <div className="hx-cta" style={{ '--d': 3 }}>
            <button className="btn hx-btn pri" onClick={onDemo}>
              Book Free Water Test / Order
              <Ic>
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </Ic>
            </button>
            {cur.href ? (
              <a className="btn hx-btn sec" href={cur.href}>
                {cur.btn}
              </a>
            ) : (
              <a
                className="btn hx-btn sec"
                href="/catalog/index.html"
                onClick={(e) => {
                  e.preventDefault()
                  window.location.assign('/catalog/index.html')
                }}
              >
                View Catalog
              </a>
            )}
          </div>

          <div className="hx-trust" style={{ '--d': 4 }}>
            <span>
              <Ic>
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                <path d="m9 12 2 2 4-4" />
              </Ic>
              1 Year Warranty
            </span>
            <span>
              <Ic>
                <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
                <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
              </Ic>
              Free Installation
            </span>
            <span>
              <Ic className="star">
                <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" />
              </Ic>
              4.9/5 Rating (25K+ Homes)
            </span>
          </div>
        </div>

        <div className="hx-stage-wrap" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <div className="hx-stage">
            {slides.map((s, k) => (
              <div
                key={k}
                className={'hx-slide' + (k === i ? ' on' : k === (i - 1 + n) % n ? ' out' : '')}
                aria-hidden={k !== i}
              >
                <img src={s.img} alt={s.alt} draggable="false" decoding="async" />
                {s.chips.map(([t, sub, c, pos], j) => (
                  <span
                    key={t}
                    className={'hx-chip ' + (j ? 'r' : 'l')}
                    style={pos && { top: 'auto', left: 'auto', right: 'auto', ...pos }}
                  >
                    <i style={{ background: c }} />
                    <span>
                      <b>{t}</b>
                      <small>{sub}</small>
                    </span>
                  </span>
                ))}
              </div>
            ))}
            <span className="hx-cert">
              <Ic>
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              </Ic>
              Certified 99.9% Hospital-Grade Purity
            </span>
          </div>
          <div className="hx-dots" role="tablist" aria-label="Product slides">
            {slides.map((_, k) => (
              <button
                key={k}
                className={k === i ? 'on' : ''}
                role="tab"
                aria-selected={k === i}
                aria-label={'Show slide ' + (k + 1)}
                onClick={() => setI(k)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* NEXT button – right corner. Changes image + content together */}
      <div className="hx-nav">
        <span className="hx-count">
          <b>{String(i + 1).padStart(2, '0')}</b> / {String(n).padStart(2, '0')}
        </span>
        <button className="hx-next" aria-label="Next product" onClick={next}>
          <Ic>
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </Ic>
        </button>
      </div>
    </section>
  )
}

function AccountLink({ onClick }) {
  const { customer } = useCustomer()
  return customer ? (
    <a className="cartp cartp-acct" href="/account" onClick={onClick} aria-label="My account">
      👤
    </a>
  ) : (
    <button type="button" className="cartp cartp-acct" aria-label="Log in" onClick={() => openLogin()}>
      👤
    </button>
  )
}

/* banners managed in the admin (Content > Banners); nothing is shown when there are none */
function HomeBanners() {
  const list = site.banners
  const [i, setI] = useState(0)
  useEffect(() => {
    if (list.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const t = setInterval(() => setI((n) => (n + 1) % list.length), 5500)
    return () => clearInterval(t)
  }, [list.length])
  if (!list.length) return null
  return (
    <section className="st-banners" aria-roledescription="carousel" aria-label="Offers">
      {list.map((b, k) => {
        const inner = (
          <>
            <img src={b.image_url} alt={b.title || ''} loading={k ? 'lazy' : 'eager'} decoding="async" />
            {(b.title || b.button_text) && <figcaption>{b.title}{b.button_text ? ' – ' + b.button_text : ''}</figcaption>}
          </>
        )
        return b.link_url ? (
          <a key={b.id} href={b.link_url} className={k === i ? 'on' : ''} aria-hidden={k !== i} tabIndex={k === i ? 0 : -1}>{inner}</a>
        ) : (
          <div key={b.id} className={'slide' + (k === i ? ' on' : '')} aria-hidden={k !== i}>{inner}</div>
        )
      })}
      {list.length > 1 && (
        <div className="st-dots">
          {list.map((b, k) => (
            <button key={b.id} className={k === i ? 'on' : ''} aria-label={'Show offer ' + (k + 1)} onClick={() => setI(k)} />
          ))}
        </div>
      )}
    </section>
  )
}

function Header({ onDemo, route, hash, cart }) {
  const [open, setOpen] = useState(false)
  const [dd, setDd] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', f)
    return () => window.removeEventListener('scroll', f)
  }, [])
  const close = () => {
    setOpen(false)
    setDd(null)
  }
  /* Double-click on the logo (a single click still goes home): opens /admin/ only when the server confirms a valid admin token.
     For a customer or a visitor nothing happens and no request is sent. The admin pages and APIs check the token again on the server. */
  const openAdmin = () => {
    canOpenAdmin().then((ok) => ok && window.location.assign('/admin/'))
  }
  const active = (n) =>
    n.h === '/'
      ? route === 'home'
      : n.h === '/about'
        ? route === 'about'
        : n.t === 'Contact Us'
          ? route === 'contact'
          : n.h === '/blog'
            ? route === 'blog' || route === 'post'
          : n.h === '/service'
              ? route === 'service'
              : hash.startsWith(n.h)
  return (
    <header className={'hdr glass' + (scrolled ? ' sc' : '')}>
      <a href="/" className="logo" onClick={(e) => go(e, '/', close)} onDoubleClick={openAdmin} aria-label="Aakash Pure Aqua Tech – home">
        <img src={LOGO} alt="Aakash Pure Aqua Tech" width="52" height="53" />
      </a>
      <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <i />
        <i />
        <i />
      </button>
      <nav className={open ? 'open' : ''} aria-label="Main">
        {menu.map((n, i) => (
          <div key={n.t} className={'ni' + (n.kids ? ' dd' : '') + (dd === i ? ' o' : '')}>
            <a
              href={n.h}
              className={active(n) ? 'act' : undefined}
              aria-current={active(n) ? 'page' : undefined}
              onClick={(e) => {
                if (n.kids && window.innerWidth < 1360) {
                  e.preventDefault()
                  setDd(dd === i ? null : i)
                  return
                } // phone: open the sub-menu first
                if (n.h === '/') go(e, '/', close)
                else close()
              }}
            >
              {n.t}
              {n.kids && <span className="car">▾</span>}
            </a>
            {n.kids && (
              <div className="menu imgmenu glass">
                <a className="only-m" href={n.h} onClick={close}>
                  <b>All {n.t}</b>
                </a>
                {n.kids.map((k) => (
                  <a key={k.t} href={k.h} onClick={close}>
                    <img src={dataImg(k.img)} alt="" />
                    <b>{k.t}</b>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        <AccountLink onClick={close} />
        <a className="cartp" href="/cart" onClick={close} aria-label="Cart">
          🛒 <b key={cart} className="cartp-n">{cart}</b>
        </a>
        <button className="btn sm" onClick={onDemo}>
          Book a Demo
        </button>
      </nav>
    </header>
  )
}

export default function App() {
  const [demo, setDemo] = useState(false)
  const openDemo = () => {
    track('demo_open')
    setDemo(true)
  }
  const [done, setDone] = useState(false)
  const [faq, setFaq] = useState(0)
  const [top, setTop] = useState(false)
  const [hash, setHash] = useState(getHash)
  const route = routeOf(hash)
  const cartStore = useCart()
  const [, setLive] = useState(0)
  useEffect(() => {
    restoreSession()
    const onVisible = () => document.visibilityState === 'visible' && refreshCatalogue()
    const onStorage = (e) => e.key === 'catalogue-updated' && refreshCatalogue(true)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('storage', onStorage)
    const unsub = subscribeSite(() => setLive((n) => n + 1))
    return () => {
      unsub()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('storage', onStorage)
    }
  }, [])
  useEffect(() => {
    if (/^\/?#?\/?shop/.test(hash) || /^\/shop(\/|$)/.test(window.location.pathname)) refreshCatalogue() /* product pages ask for their own product (Detail in Shop.jsx) */
  }, [hash])
  const [demoBusy, setDemoBusy] = useState(false)
  /* Add to Cart and Buy Now need a login: guests get the login / sign-up window first, and the action runs right after they sign in. */
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!notice) return undefined
    const t = setTimeout(() => setNotice(''), 6000)
    return () => clearTimeout(t)
  }, [notice])
  /* The cart the pages use: the local cart (kept in localStorage) plus the same change sent to the API (POST/PATCH/DELETE /customer/cart).
     removeLocal / clearLocal change only this browser (used after an order was placed, when the server has already emptied its cart). */
  const cart = {
    ...cartStore,
    setQty: (id, qty) => {
      cartStore.setQty(id, qty)
      serverCart.setQty({ id }, Math.min(99, Math.max(1, qty)))
    },
    remove: (id) => {
      cartStore.remove(id)
      serverCart.remove({ id })
    },
    clear: () => {
      cartStore.clear()
      serverCart.clear()
    },
    removeLocal: cartStore.remove,
    clearLocal: cartStore.clear,
  }
  /* Add to Cart / Buy Now: log in first, then the product is added through the API (the API checks price and stock); only when it accepts
     the item does it appear in the cart. If it refuses (out of stock ...) the shopper is told why. */
  const adding = useRef(new Set())
  const addToServerCart = async (item, qty) => {
    const key = String(item.id).replace(/\|+$/, '')
    if (adding.current.has(key)) return false /* the same click repeated while its add is still running */
    adding.current.add(key)
    try {
      let reply
      try {
        reply = await serverCart.add(item, qty)
      } catch (e) {
        setNotice(e.friendly || e.message)
        return false
      }
      /* the cart the API returned decides the price and the quantity (the page's copy may be stale) */
      const line = reply && Array.isArray(reply.items) ? reply.items.find((l) => l.product_id === pidOf(item)) : null
      const price = line && Number(line.unit_price) > 0 ? Number(line.unit_price) : item.price
      const mrp = line && Number(line.mrp) > 0 ? Number(line.mrp) : item.mrp
      cartStore.add({ ...item, price, ...(mrp ? { mrp } : {}) }, qty)
      if (line && Number(line.quantity) > 0) cartStore.setQty(key, Number(line.quantity))
      return true
    } finally {
      adding.current.delete(key)
    }
  }
  const addCart = (item, qty = 1) => requireLogin(() => addToServerCart(item, qty))
  const buyNow = (item, qty = 1) =>
    requireLogin(async () => {
      if (await addToServerCart(item, qty)) navigate(PAYMENTS_ENABLED && pidOf(item) ? '/checkout' : '/cart')
    })
  const [, , b, c2, c3] = hash.split('/')
  const grp = groupsOf(b),
    cat = grp ? (c2 && catsOf(c2) ? c2 : grp.bar[0]) : catsOf(b) ? b : 'ro',
    brand = grp ? c3 : c2
  useReveal(route)
  useRipple()
  useWater()
  useEffect(() => {
    const f = () => {
      setHash(getHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('popstate', f)
    window.addEventListener('locationchange', f)
    return () => {
      window.removeEventListener('popstate', f)
      window.removeEventListener('locationchange', f)
    }
  }, [])
  const [formErr, setFormErr] = useState('')
  const sendDemo = async (e) => {
    e.preventDefault()
    const f = e.currentTarget
    const d = Object.fromEntries(new FormData(f))
    if (!/^[6-9]\d{9}$/.test(d.phone || '')) return setFormErr('Please enter a valid 10-digit mobile number.')
    if (!/^\d{6}$/.test(d.pin || '')) return setFormErr('Please enter a valid 6-digit pin code.')
    if (!f.checkValidity()) return f.reportValidity()
    setFormErr('')
    setDemoBusy(true)
    try {
      await api('/public/leads', {
        method: 'POST',
        body: {
          first_name: d.first, last_name: d.last, mobile: d.phone, city: d.city, pin_code: d.pin, address: d.address,
          interest: d.need === 'AMC / Service' ? 'AMC-Service' : d.need, terms_accepted: Boolean(d.terms), company_website: d.company_website || '',
        },
      })
      track('demo_submit', { need: d.need, city: d.city })
      setDone(true)
    } catch (x) {
      setFormErr(x.status === 0 || x.status >= 500 ? 'We could not send your request right now. Please call us or use WhatsApp.' : x.friendly || x.message)
    }
    setDemoBusy(false)
  }
  const group = grp ? b : null
  useSeo(buildSeo({ route, path: hash, cat, brand, group, slug: b, faq: faqList() }))
  useEffect(() => {
    const f = () => setTop(window.scrollY > 600)
    window.addEventListener('scroll', f)
    return () => window.removeEventListener('scroll', f)
  }, [])

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Water />
      <div className="glow" />
      <div className="prog" />
      <Header onDemo={openDemo} route={route} hash={hash} cart={cartStore.count} />
      <main id="main" tabIndex={-1}>
        <ErrorBoundary key={hash}>
        <Suspense
          fallback={
            <div className="route-loading" role="status" aria-busy="true">
              Loading…
            </div>
          }
        >
          {route === 'about' ? (
            <AboutPage img={IMG} stats={STATS} Counter={Counter} onDemo={openDemo} />



                      ) : route === 'shop' && cat === 'spares' ? (
            <Spares addCart={addCart} key={hash} />
          ) : route === 'shop' ? (
            <Shop g={grp ? b : null} cat={cat} brand={brand} addCart={addCart} buyNow={buyNow} key={hash} />


            
          ) : route === 'shop' ? (
            <Shop g={grp ? b : null} cat={cat} brand={brand} addCart={addCart} buyNow={buyNow} key={hash} />
          ) : route === 'cart' ? (
            <CartPage cart={cart} />
          ) : route === 'checkout' ? (
            <CheckoutPage cart={cart} />
          ) : route === 'order' ? (
            <OrderPage id={hash.split('/')[2]} key={hash} />
          ) : route === 'account' ? (
            <AccountPage cart={cart} />
          ) : route === 'spare' ? (
            <SpareDetail slug={b} addCart={addCart} buyNow={buyNow} key={hash} />
          ) : route === 'product' ? (
            <Detail slug={b} addCart={addCart} buyNow={buyNow} key={hash} />
          ) : route === 'contact' ? (
            <ContactPage onDemo={openDemo} />
          ) : route === 'service' ? (
            <ServicePage onDemo={openDemo} />
          ) : route === 'zones' ? (
            <ZonesPage onDemo={openDemo} />
          ) : route === 'testimonials' ? (
            <TestimonialsPage onDemo={openDemo} />
          ) : route === 'privacy' ? (
            <PrivacyPage />
          ) : route === 'terms' ? (
            <TermsPage />
          ) : route === 'disclaimer' ? (
            <DisclaimerPage />
          ) : route === 'shipping' ? (
            <ShippingPage />
          ) : route === 'blog' ? (
            <BlogPage />
          ) : route === 'post' ? (
            <BlogPost path={hash} onDemo={openDemo} key={hash} />
          ) : route === 'notfound' ? (
            <NotFound />
          ) : (
            <>
              <Hero onDemo={openDemo} />
              <HomeBanners />

              <section className="wrap about rv">
                <div className="glass pad about-g">
                  <img src={officePhoto} alt="Aakash Pure Aqua Tech office" loading="lazy" />
                  <div>
                    <h2>About us</h2>
                    <p>
                      An RO expert with over 35 years of expertise in water and waste water treatment. Aakash Pure Aqua
                      Tech Pvt Ltd is the most professionally managed environmental engineering firm in the state, with
                      its head office founded in 2004 at Salem and branches at Coimbatore and Dharmapuri. Acknowledged
                      as the leading No.1 multi-brand store in the RO water purifier category for sales and service, we
                      pioneered Reverse Osmosis technology in South India.
                    </p>
                    <a className="btn" href="/about" onClick={(e) => go(e, '/about')}>
                      Learn More About us
                    </a>
                  </div>
                </div>
              </section>

              <section className="wrap stats">
                {STATS.map(([n, s, l]) => (
                  <div key={l} className="glass stat rv">
                    <Counter to={n} suffix={s} />
                    <span>{l}</span>
                  </div>
                ))}
              </section>

              {/* Featured Products carousel + scroll-driven product showcase (see ProductSections.jsx) */}
              <div className="pz">
                <FeaturedProducts items={PRODUCT_ITEMS} />
                <ProductScroll items={showcaseItems(PRODUCT_ITEMS, site.showcaseBanners)} />
              </div>

              <section className="wrap faq">
                <LoadWhenNear name="faqs" />
                <h2 className="rv">Everything You Need to Know</h2>
                <p className="rv sub">
                  Answers about our RO water purifiers, maintenance, installation and after-sales service.
                </p>

                {faqList().map(([q, a], i) => (
                  <div key={q} className="rv">
                    <div className={'glass fq' + (faq === i ? ' o' : '')}>
                      <button onClick={() => setFaq(faq === i ? -1 : i)} aria-expanded={faq === i}>
                        {q}
                        <span>+</span>
                      </button>
                      <div className="fa">
                        <p>{a}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </section>

              <Brands />
            </>
          )}
        </Suspense>
        </ErrorBoundary>
      </main>

      <footer className="ftr">
        <div className="wrap ft">
          <div className="ft-brand">
            <a href="/" className="ft-logo" onClick={(e) => go(e, '/')}>
              <img src={footerLogo} alt="Aakash Pure Aqua Tech" />
            </a>
            <p>
              Aakash AquaTech delivers reliable water purification solutions designed to provide clean, safe, and
              healthy water for every home and business.
              <br />
              We offer quality water purifiers and advanced filtration solutions tailored to meet your everyday needs.
            </p>
          </div>
          <div className="ft-col">
            <h3>Contact us</h3>
            <ul className="ft-contact">
              <li>
                <i>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
                  </svg>
                </i>
                <a href="tel:9655577666">96555 77666</a>
              </li>
              <li>
                <i>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1.5 2 7.5 5.4L19.5 7z" />
                  </svg>
                </i>
                <a href="mailto:ceo@aakashaquatech.in">ceo@aakashaquatech.in</a>
              </li>
              <li>
                <i>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
                  </svg>
                </i>
                <address>
                  10/62C, Brindavan Road, 1st Cross (Behind Dr. Sudamani Hospital), Fairlands, Salem - 636016, Tamil
                  Nadu
                </address>
              </li>
            </ul>
          </div>
          <div className="ft-col">
            <h3>Quick Links</h3>
            <ul className="ft-links" aria-label="Quick links">
              <li>
                <a href="/" onClick={(e) => go(e, '/')}>
                  Home
                </a>
              </li>
              <li>
                <a href="/about" onClick={(e) => go(e, '/about')}>
                  About us
                </a>
              </li>
              <li>
                <a href="/contact">Contact us</a>
              </li>
              {['Zone we serve:/zones-we-serve', 'Testimonials:/testimonials', 'Blog:/blog'].map((x) => {
                const [t, h] = x.split(':')
                return (
                  <li key={t}>
                    <a href={href(h)}>{t}</a>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="ft-col">
            <h3>Follow us</h3>
            <div className="ft-soc">
              <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.2C16.7 2.1 15.7 2 14.6 2 12.2 2 10.5 3.5 10.5 6.2v2.3H8V12h2.5v10H14V12h2.7l.4-3.5z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect
                    x="3.5"
                    y="3.5"
                    width="17"
                    height="17"
                    rx="5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle cx="17.2" cy="6.8" r="1.2" />
                </svg>
              </a>
              <a href="https://www.youtube.com/" target="_blank" rel="noreferrer" aria-label="YouTube">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="wrap ft-bot">
          <p className="ft-copy">
          © 2026 <b>Aakash Pure Aqua Tech Pvt Ltd</b>. All rights reserved.
          </p>
          <p className="ft-legal">
            {[
              'Privacy Policy:/privacy-policy',
              'Terms and Conditions:/terms-and-conditions',
              'Shipping and Cancellation:/shipping-and-cancellation',
              'Disclaimer:/disclaimer',
            ].map((x, i) => {
              const [t, h] = x.split(':')
              return (
                <span key={t}>
                  {i > 0 && ' | '}
                  <a href={href(h)}>{t}</a>
                </span>
              )
            })}
          </p>
        </div>
      </footer>

      <a className="wa btn" href={WA} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
        WhatsApp
      </a>
      {notice && (
        <div className="st-banner" role="alert" style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 1000, maxWidth: 'min(92vw, 520px)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>{notice}</span>
          <button type="button" aria-label="Close" onClick={() => setNotice('')} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
      )}
      <LoginModal cart={cartStore} />
      <StickyBar product={route === 'product' ? PRODUCT_FOR_BAR(b) : null} onDemo={openDemo} />
      <button
        className={'totop' + (top ? ' show' : '')}
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        ↑
      </button>

      {demo && (
        <div
          className="modal"
          onClick={() => {
            setDemo(false)
            setDone(false)
          }}
        >
          <div className="glass pad box" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button
              className="x"
              aria-label="Close"
              onClick={() => {
                setDemo(false)
                setDone(false)
              }}
            >
              ×
            </button>
            {done ? (
              <>
                <h3>Almost done!</h3>
                <p>
                  Thank you! We have received your request and our team will call you shortly to confirm your free
                  demo. Prefer to talk now?{' '}
                  <a href={WA} target="_blank" rel="noopener noreferrer">
                    Chat with us on WhatsApp
                  </a>
                  .
                </p>
              </>
            ) : (
              <form onSubmit={sendDemo} noValidate>
                <h3>Book Your Free Demo</h3>
                <div className="g2">
                  <input
                    required
                    name="first"
                    placeholder="First Name*"
                    autoComplete="given-name"
                    aria-label="First name"
                  />
                  <input
                    required
                    name="last"
                    placeholder="Last Name*"
                    autoComplete="family-name"
                    aria-label="Last name"
                  />
                </div>
                <div className="g2">
                  <input
                    required
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[6-9][0-9]{9}"
                    maxLength={10}
                    placeholder="Mobile Number* (10 digits)"
                    autoComplete="tel-national"
                    aria-label="Mobile number"
                  />
                  <input required name="city" placeholder="City*" autoComplete="address-level2" aria-label="City" />
                </div>
                <div className="g2">
                  <input
                    required
                    name="pin"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="Pin Code*"
                    autoComplete="postal-code"
                    aria-label="Pin code"
                  />
                  <select name="need" defaultValue="Water Purifier" aria-label="I am interested in">
                    <option>Water Purifier</option>
                    <option>Water Softener</option>
                    <option>AMC / Service</option>
                    <option>Other</option>
                  </select>
                </div>
                <textarea
                  required
                  name="address"
                  rows="3"
                  placeholder="Address*"
                  autoComplete="street-address"
                  aria-label="Address"
                />
                {formErr && (
                  <p className="form-err" role="alert">
                    {formErr}
                  </p>
                )}
                <label className="chk">
                  <input required type="checkbox" name="terms" /> I agree to the{' '}
                  <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer">
                    terms &amp; conditions
                  </a>
                </label>
                <input className="st-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="company_website" />
                <button className="btn" data-cta="demo_submit_click" disabled={demoBusy}>
                  {demoBusy ? 'Sending…' : 'Book my free demo'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
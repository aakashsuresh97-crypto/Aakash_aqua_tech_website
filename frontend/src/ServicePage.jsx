/* =====================================================================
   SERVICE PAGE  (sv-*)  – opens inside the app at /service
   Content = https://aakashaquatech.in/service/  (word for word)
   Props from App.jsx:  onDemo()
   v2: working Type I / II / III tabs (animated beaker), animated hero,
       capacity marquee, count-up numbers, spotlight + tilt cards.
===================================================================== */
import { useEffect, useRef, useState } from 'react'
import { ServiceRequestForm } from './Store.jsx'

/* ---------- line icons (24x24, stroke = currentColor) ---------- */
const ICONS = {
  drop: ['M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z'],
  home: ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  shop: ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'],
  factory: ['M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z', 'M17 18h1M12 18h1M7 18h1'],
  flask: ['M9 3h6', 'M10 3v6L4.5 19a1.6 1.6 0 0 0 1.4 2.4h12.2a1.6 1.6 0 0 0 1.4-2.4L14 9V3', 'M7.5 14h9'],
  layers: ['m12 2 10 5-10 5L2 7z', 'm2 12 10 5 10-5', 'm2 17 10 5 10-5'],
  filter: ['M22 3H2l8 9.5V19l4 2v-8.5z'],
  cog: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
  check: ['M20 6 9 17l-5-5'],
  arrow: ['M5 12h14', 'm12 5 7 7-7 7'],
  phone: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M9 13h6M9 17h6'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'm9 12 2 2 4-4'],
}
const Icon = ({ n, className = '' }) => (
  <svg className={'sv-ic ' + className} viewBox="0 0 24 24" aria-hidden="true">
    {ICONS[n].map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
)

/* ---------- content (from aakashaquatech.in/service) ---------- */
const CATEGORIES = [
  ['drinking', 'Drinking Water Treatment Unit', 'drop'],
  ['domestic', 'Domestic Water Treatment Plant', 'home'],
  ['commercial', 'Commercial Water Treatment Plant', 'shop'],
  ['industrial', 'Industrial Water Treatment Plant', 'factory'],
]
const PLANTS = [
  { id: 'drinking', icon: 'drop', title: 'Drinking Water Treatment Units',
    text: 'We offer customized drinking water treatment units for domestic use that provide a high flow of purified water.',
    caps: [[150], [250], [500]] },
  { id: 'domestic', icon: 'home', title: 'Domestic Water Treatment Plants',
    text: 'Our domestic water treatment plants are ideal for individual homes, villas, apartments, and homestays.',
    caps: [[1000], [2000]] },
  { id: 'commercial', icon: 'shop', title: 'Commercial Water Treatment Plants',
    text: 'Designed for restaurants, schools, institutions, offices, and commercial establishments.',
    caps: [[3000]] },
  { id: 'industrial', icon: 'factory', title: 'Industrial Water Treatment Plants',
    text: 'Our industrial water treatment systems are suitable for factories, hospitals, resorts, hotels, and industries requiring large-scale purified water supply.',
    caps: [[5000], [7500], [10000], [15000], [20000], [25000, ' & Above']] },
]
const EXTRA = [
  ['Water Softener Plants', 'layers'],
  ['Demineralization Plants', 'filter'],
  ['Reverse Osmosis (RO) Systems', 'cog'],
]
const LAB = [
  { tab: 'Type I', title: 'Type I – Water Analysis (Testing Kits)',
    items: ['pH', 'TDS', 'Hardness', 'Dissolved Oxygen', 'Fluorides', 'Turbidity', 'Iron', 'Total Bacterial Count', 'E. Coli'] },
  { tab: 'Type II', title: 'Type II – Water Analysis',
    items: ['Colour', 'Odour', 'Turbidity', 'Conductivity', 'pH', 'TDS', 'Dissolved Oxygen', 'Total Hardness', 'Calcium', 'Magnesium', 'Chloride', 'Sulphate', 'Fluoride', 'Nitrate', 'Iron', 'Total Coliforms', 'Coli'] },
  { tab: 'Type III', title: 'Type III – Waste Water Analysis',
    items: ['pH', 'TDS', 'Suspended Solids', 'Sulphide', 'Oil & Grease', 'COD', 'BOD', 'Ammonia', 'Total Nitrogen', 'Ammoniacal Nitrogen'] },
]
/* how the page text describes the process (re-worded from the intro paragraph) */
const STEPS = [
  ['file', 'Water Analysis Report', 'Our water treatment plants are specially designed based on the customer’s water analysis report.'],
  ['user', 'Expert Recommendation', 'Our expert team recommends the most suitable filtration system for your water.'],
  ['shield', 'Clean, Safe Water', 'High-quality water from any source, with reliable service and long-lasting performance.'],
]
const ALL_CAPS = PLANTS.flatMap((p) => p.caps)
const BUBBLES = Array.from({ length: 18 }, (_, i) => ({
  l: 3 + ((i * 41) % 94), s: 8 + ((i * 7) % 20), d: (i * 1.1) % 8, t: 8 + ((i * 5) % 8),
}))

/* full-width wave: the path repeats across 2880 units, the svg is 200% wide and slides exactly one half (-50%),
   so the wave always reaches both screen edges and the loop has no jump.  `period` must divide 1440. */
const wavePath = (y, amp, period) => {
  let d = `M0 ${y}`
  for (let x = 0; x < 2880; x += period) {
    d += `c${period / 6} ${-amp} ${period / 3} ${-amp} ${period / 2} 0s${period / 3} ${amp} ${period / 2} 0`
  }
  return d + 'V120H0z'
}

/* bar length for a capacity (square-root scale so 150 LPH is still visible next to 25000) */
const barPct = (n) => Math.round(16 + 84 * Math.sqrt(n / 25000))

/* ---------- small hooks / helpers ---------- */
function useInView(th = 0.25) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) return setSeen(true)
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true)
        io.disconnect()
      }
    }, { threshold: th })
    io.observe(el)
    return () => io.disconnect()
  }, [th])
  return [ref, seen]
}

/* number that counts up when it scrolls into view (or when `to` changes) */
function Num({ to, dur = 1400, now = false }) {
  const [ref, seen] = useInView(0.3)
  const [v, setV] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    if (!now && !seen) return
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setV(to)
    let raf
    const a = from.current
    const s = performance.now()
    const tick = (t) => {
      const k = Math.min(1, (t - s) / dur)
      const val = Math.round(a + (to - a) * (1 - Math.pow(1 - k, 3)))
      from.current = val
      setV(val)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, seen, now, dur])
  return <span ref={ref}>{v}</span>
}

/* 3D tilt + moving light spot on mouse move (desktop only) */
const tilt = {
  onMouseMove: (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    const s = e.currentTarget.style
    s.setProperty('--rx', ((0.5 - y) * 8).toFixed(2) + 'deg')
    s.setProperty('--ry', ((x - 0.5) * 10).toFixed(2) + 'deg')
    s.setProperty('--mx', (x * 100).toFixed(1) + '%')
    s.setProperty('--my', (y * 100).toFixed(1) + '%')
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.setProperty('--rx', '0deg')
    e.currentTarget.style.setProperty('--ry', '0deg')
  },
}

/* ---------- animated beaker (level + colour follow the active lab tab) ---------- */
function Beaker({ level, tab }) {
  const t = 134 - 128 * level /* liquid surface: 154 (empty) … 26 (full) */
  return (
    <svg className={'sv-beaker t' + tab} viewBox="0 0 140 190" aria-hidden="true">
      <defs>
        <clipPath id="svClip">
          <path d="M30 18h80v8h-6v106a22 22 0 0 1-22 22H58a22 22 0 0 1-22-22V26h-6z" />
        </clipPath>
        <linearGradient id="svLiq" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--c1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--c2)' }} />
        </linearGradient>
      </defs>
      <g clipPath="url(#svClip)">
        <rect width="140" height="190" fill="rgba(255,255,255,.55)" />
        <g className="sv-liq" style={{ transform: `translateY(${t}px)` }}>
          <path className="wv a" d="M-140 20q35-14 70 0t70 0 70 0 70 0 70 0V220H-140z" fill="url(#svLiq)" opacity=".5" />
          <path className="wv b" d="M-140 20q35-14 70 0t70 0 70 0 70 0 70 0V220H-140z" fill="url(#svLiq)" />
          {[44, 62, 78, 94, 52].map((x, i) => (
            <circle key={i} className="bub" cx={x} cy={150} r={2 + (i % 3)} style={{ animationDelay: i * 0.6 + 's' }} />
          ))}
        </g>
        <path d="M40 30v110" stroke="#fff" strokeOpacity=".7" strokeWidth="5" strokeLinecap="round" />
      </g>
      <path d="M30 18h80v8h-6v106a22 22 0 0 1-22 22H58a22 22 0 0 1-22-22V26h-6z" fill="none" stroke="var(--deep)" strokeWidth="3" strokeLinejoin="round" />
      {[50, 74, 98, 122].map((y) => (
        <path key={y} d={`M104 ${y}h-12`} stroke="var(--deep)" strokeWidth="2" strokeLinecap="round" opacity=".55" />
      ))}
    </svg>
  )
}

export default function ServicePage({ onDemo }) {
  const root = useRef(null)
  const hero = useRef(null)
  const [lab, setLab] = useState(0)

  /* scroll-reveal for every .sv-rv (safe: also shows everything after 4s if the observer never fires) */
  useEffect(() => {
    const els = root.current.querySelectorAll('.sv-rv')
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.06, rootMargin: '0px 0px -4% 0px' },
    )
    els.forEach((el) => io.observe(el))
    const safe = setTimeout(() => els.forEach((el) => el.classList.add('in')), 4000)
    return () => {
      io.disconnect()
      clearTimeout(safe)
    }
  }, [])

  /* mouse parallax in the hero */
  const onHeroMove = (e) => {
    const r = hero.current.getBoundingClientRect()
    hero.current.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
    hero.current.style.setProperty('--py', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
  }

  const jump = (id) => document.getElementById('sv-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  /* lab tabs: click + arrow keys */
  const onTabKey = (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const n = (lab + d + LAB.length) % LAB.length
    setLab(n)
    document.getElementById('svt' + n)?.focus()
  }
  const L = LAB[lab]
  const level = 0.1 + (0.85 * L.items.length) / 17

  return (
    <div className="sv" ref={root}>
      {/* ============ HERO ============ */}
      <header className="sv-hero" ref={hero} onMouseMove={onHeroMove}>
        <div className="sv-bubs" aria-hidden="true">
          {BUBBLES.map((b, i) => (
            <b key={i} style={{ left: b.l + '%', width: b.s, height: b.s, animationDelay: b.d + 's', animationDuration: b.t + 's' }} />
          ))}
        </div>
        <div className="sv-wrap sv-hero-grid">
          <div className="sv-hero-in">
            <span className="sv-eyebrow sv-rv">
              <Icon n="drop" /> Aakash Water Purifier
            </span>
            <h1 className="sv-rv" style={{ '--i': 1 }}>
              <span>Service</span>
            </h1>
            <h2 className="sv-sub sv-rv" style={{ '--i': 2 }}>
              Aakash Water Purifier – <em>Water Treatment Services</em>
            </h2>
            <p className="sv-rv" style={{ '--i': 3 }}>
              At <strong>Aakash Water Purifier</strong>, our water treatment plants are specially designed based on the customer’s water analysis report. Our expert team recommends the most suitable filtration system to ensure clean, safe, and high-quality water from any source.
            </p>
            <p className="sv-rv" style={{ '--i': 4 }}>
              We provide advanced and customized water treatment solutions for residential, commercial, and industrial applications with reliable service and long-lasting performance.
            </p>
            <div className="sv-cta sv-rv" style={{ '--i': 5 }}>
              <button type="button" className="sv-btn" onClick={onDemo}>
                Book a Demo <Icon n="arrow" />
              </button>
              <a className="sv-btn ghost" href="tel:9655599666">
                <Icon n="phone" /> +91 9655599666
              </a>
            </div>
            <ul className="sv-stats sv-rv" style={{ '--i': 6 }}>
              <li><b><Num to={4} dur={900} /></b><span>Plant Categories</span></li>
              <li><b><Num to={25000} dur={1800} />+</b><span>Liters Per Hour</span></li>
              <li><b><Num to={3} dur={900} /></b><span>Water Analysis Types</span></li>
            </ul>
          </div>

          {/* animated droplet + orbiting capacities */}
          <div className="sv-orb sv-rv" style={{ '--i': 3 }} aria-hidden="true">
            <i className="sv-ring r1" />
            <i className="sv-ring r2" />
            <i className="sv-ring r3" />
            <svg className="sv-drop" viewBox="0 0 200 250">
              <defs>
                <linearGradient id="svDrop" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#f3e9da" />
                  <stop offset=".45" stopColor="#0d8d97" />
                  <stop offset="1" stopColor="#0b3f66" />
                </linearGradient>
              </defs>
              <path d="M100 12C100 12 22 98 22 158a78 78 0 0 0 156 0C178 98 100 12 100 12z" fill="url(#svDrop)" />
              <path d="M58 150c0-26 14-48 30-70" stroke="#fff" strokeOpacity=".75" strokeWidth="9" strokeLinecap="round" fill="none" />
            </svg>
            <div className="sv-orbit">
              {['150', '1000', '5000', '25000+'].map((t, i) => (
                <span key={t} style={{ '--a': i * 90 + 'deg' }}>
                  <em>
                    <b>{t}</b>
                    <small>LPH</small>
                  </em>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="sv-wave" aria-hidden="true">
          <svg className="sv-wave-in a" viewBox="0 0 2880 120" preserveAspectRatio="none">
            <path d={wavePath(60, 40, 720)} />
          </svg>
          <svg className="sv-wave-in b" viewBox="0 0 2880 120" preserveAspectRatio="none">
            <path d={wavePath(80, 30, 480)} />
          </svg>
        </div>
      </header>

      {/* ============ CAPACITY MARQUEE ============ */}
      <div className="sv-marq" aria-hidden="true">
        <div className="sv-marq-t">
          {[0, 1].map((k) =>
            ALL_CAPS.map(([n, suf]) => (
              <span key={k + '-' + n}>
                <Icon n="drop" /> {n} Liters Per Hour{suf || ''}
              </span>
            )),
          )}
        </div>
      </div>

      {/* ============ CATEGORIES ============ */}
      <section className="sv-wrap sv-sec" aria-labelledby="sv-cat">
        <div className="sv-sec-h sv-rv">
          <Icon n="layers" className="sv-sec-ic" />
          <h2 id="sv-cat">Our Water Treatment Plant Categories</h2>
        </div>
        <ul className="sv-cats">
          {CATEGORIES.map(([id, t, ic], i) => (
            <li key={id} className="sv-rv" style={{ '--i': i }}>
              <button type="button" className="sv-cat" onClick={() => jump(id)} {...tilt}>
                <span className="sv-num">0{i + 1}</span>
                <span className="sv-cat-ic">
                  <Icon n={ic} />
                </span>
                <b>{t}</b>
                <Icon n="arrow" className="sv-go" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* ============ HOW WE DESIGN (from the intro text) ============ */}
      <section className="sv-wrap sv-sec" aria-label="How we design your plant">
        <ol className="sv-steps">
          {STEPS.map(([ic, t, d], i) => (
            <li key={t} className="sv-rv" style={{ '--i': i }}>
              <span className="sv-step-n">{i + 1}</span>
              <span className="sv-step-ic">
                <Icon n={ic} />
              </span>
              <h3>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ============ PLANT TYPES + CAPACITIES ============ */}
      <section className="sv-wrap sv-plants">
        {PLANTS.map((p, k) => (
          <article key={p.id} id={'sv-' + p.id} className={'sv-plant sv-rv' + (k % 2 ? ' flip' : '')} {...tilt}>
            <span className="sv-ghost" aria-hidden="true">0{k + 1}</span>
            <div className="sv-plant-txt">
              <span className="sv-plant-ic">
                <Icon n={p.icon} />
              </span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
            <ul className="sv-caps">
              {p.caps.map(([n, suf], i) => (
                <li key={n} style={{ '--i': i, '--w': barPct(n) + '%' }}>
                  <span className="sv-cap-l">
                    <Icon n="check" />
                    <span>
                      <Num to={n} dur={1500} /> Liters Per Hour{suf || ''}
                    </span>
                  </span>
                  <i className="sv-bar">
                    <u />
                  </i>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      {/* ============ ADDITIONAL SOLUTIONS ============ */}
      <section className="sv-wrap sv-sec" aria-labelledby="sv-add">
        <div className="sv-sec-h sv-rv">
          <Icon n="cog" className="sv-sec-ic" />
          <h2 id="sv-add">Additional Water Treatment Solutions</h2>
        </div>
        <ul className="sv-extra">
          {EXTRA.map(([t, ic], i) => (
            <li key={t} className="sv-rv" style={{ '--i': i }}>
              <div className="sv-xcard" {...tilt}>
                <span className="sv-xic">
                  <Icon n={ic} />
                </span>
                <b>{t}</b>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ============ LABORATORY  (working tabs) ============ */}
      <section className="sv-lab" aria-labelledby="sv-labh">
        <div className="sv-wrap">
          <div className="sv-sec-h sv-rv">
            <Icon n="flask" className="sv-sec-ic" />
            <h2 id="sv-labh">Aakash Water Purifier Water Analytical Laboratory &amp; Research Center</h2>
          </div>

          <div className="sv-tabs" role="tablist" aria-label="Water analysis types" style={{ '--n': LAB.length, '--k': lab }} onKeyDown={onTabKey}>
            <i className="sv-tabs-pill" />
            {LAB.map((t, i) => (
              <button key={t.tab} id={'svt' + i} type="button" role="tab" aria-selected={lab === i} aria-controls="svp" tabIndex={lab === i ? 0 : -1} className={lab === i ? 'on' : ''} onClick={() => setLab(i)}>
                {t.tab}
                <small>{t.items.length}</small>
              </button>
            ))}
          </div>

          <div className="sv-labbox" id="svp" role="tabpanel" aria-labelledby={'svt' + lab}>
            <div className="sv-lab-vis">
              <Beaker level={level} tab={lab} />
              <div className="sv-lab-count">
                <b>
                  <Num to={L.items.length} dur={700} now />
                </b>
                <span>tests</span>
              </div>
            </div>
            <div className="sv-lab-body" key={lab}>
              <h3>{L.title}</h3>
              <ul className="sv-chips">
                {L.items.map((x, i) => (
                  <li key={x + i} style={{ '--i': i }}>
                    <Icon n="check" /> {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="sv-wrap" aria-label="Book a service">
        <ServiceRequestForm />
      </section>

      {/* ============ CALL TO ACTION ============ */}
      <section className="sv-wrap sv-end sv-rv">
        <div className="sv-end-in">
          <div className="sv-bubs" aria-hidden="true">
            {BUBBLES.slice(0, 9).map((b, i) => (
              <b key={i} style={{ left: b.l + '%', width: b.s, height: b.s, animationDelay: b.d + 's', animationDuration: b.t + 's' }} />
            ))}
          </div>
          <h2>Clean, safe, high-quality water – from any source</h2>
          <p>Tell us your water source and we will recommend the right plant.</p>
          <div className="sv-cta">
            <button type="button" className="sv-btn" onClick={onDemo}>
              Book a Demo <Icon n="arrow" />
            </button>
            <a className="sv-btn ghost" href="https://wa.me/919655599666" target="_blank" rel="noopener noreferrer">
              WhatsApp us
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
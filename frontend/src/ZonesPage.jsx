/* =====================================================================
   ZONES WE SERVE PAGE  (zn-*)  – opens inside the app at /zones-we-serve
   1) full-width illustrated amenities map (animated)   2) who we serve (11 cards)
   3) cities we serve (animated route map + list)        4) call-to-action
   Props from App.jsx:  onDemo()
===================================================================== */
import { useEffect, useRef, useState } from 'react'
// import mapImg from './assets/zones/city-amenities-map.webp'
import mapImg from './assets/zones/zones-bg.webp'

/* ---------- line icons (24x24, stroke = currentColor) ---------- */
const ICONS = {
  apartments: ['M3 21h18', 'M5 21V7l8-4v18', 'M19 21V11l-6-4', 'M9 9v.01M9 12v.01M9 15v.01M9 18v.01'],
  hotels: ['M2 4v16', 'M2 8h18a2 2 0 0 1 2 2v10', 'M2 17h20', 'M6 8v9'],
  hospitals: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M12 8v8M8 12h8'],
  education: ['M22 10 12 5 2 10l10 5 10-5z', 'M6 12v5c3 3 9 3 12 0v-5', 'M22 10v6'],
  malls: ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'],
  clubs: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  factories: ['M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z', 'M17 18h1M12 18h1M7 18h1'],
  pharma: ['m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z', 'm8.5 8.5 7 7'],
  pools: [
    'M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1',
    'M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1',
    'M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1',
  ],
  breweries: [
    'M17 11h1a3 3 0 0 1 0 6h-1',
    'M9 12v6M13 12v6',
    'M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5z',
    'M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8',
  ],
  residences: ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  pin: ['M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z', 'M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  drop: ['M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z'],
  phone: [
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
  ],
  arrow: ['M5 12h14', 'm12 5 7 7-7 7'],
}
const Icon = ({ n, className = '' }) => (
  <svg className={'zn-ic ' + className} viewBox="0 0 24 24" aria-hidden="true">
    {ICONS[n].map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
)

/* ---------- content (edit freely) ---------- */
const AMENITIES = [
  ['apartments', 'Apartments and Villas', 'Community RO plants and softeners for towers, gated layouts and villas.'],
  ['hotels', 'Hotels and Resorts', 'Safe, great-tasting water for guest rooms, kitchens and dining halls.'],
  ['hospitals', 'Hospitals', 'Dependable, hygienic drinking water for wards, kitchens and staff areas.'],
  ['education', 'Educational Institutions', 'Clean drinking-water points for campuses, hostels and canteens.'],
  ['malls', 'Shopping Malls', 'Water solutions for food courts, restrooms and visitor dispensers.'],
  ['clubs', 'Club Houses', 'Pure water for lounges, gyms, cafés and community facilities.'],
  ['factories', 'Factories', 'Drinking and process water treatment for plants and their workforce.'],
  ['pharma', 'Pharmaceuticals', 'Water treatment support for production, laboratories and hygiene areas.'],
  ['pools', 'Pools and Spas', 'Fresh, well-treated water for pools, spas and wellness centres.'],
  ['breweries', 'Breweries and Distilleries', 'Consistent-quality process water for brewing and distilling.'],
  ['residences', 'Residences', 'RO, UV and UF purifiers for every home kitchen, installed and serviced.'],
]

/* ---------- locations ----------
   x / y = schematic position (rough geography, not to scale) inside the 900 x 560 SVG
   lab   = label side: r / l / t / b
   br    = true -> sandal-cream pin (head office + branches); every other location is navy */
const CITIES = [
  { n: 'Salem', tag: 'Head Office', br: true, hub: true, x: 430, y: 282, lab: 'r' },
  { n: 'Coimbatore', tag: 'Branch', br: true, x: 225, y: 392, lab: 'l' },
  { n: 'Dharmapuri', tag: 'Branch', br: true, x: 440, y: 205, lab: 'r' },
  { n: 'Hosur', tag: 'Service area', x: 425, y: 95, lab: 'l' },
  { n: 'Bangalore', tag: 'Service area', x: 372, y: 52, lab: 'l' },
  { n: 'Krishnagiri', tag: 'Service area', x: 462, y: 145, lab: 'r' },
  { n: 'Mettur', tag: 'Service area', x: 330, y: 245, lab: 'l' },
  { n: 'Rasipuram', tag: 'Service area', x: 470, y: 335, lab: 'r' },
  { n: 'Namakkal', tag: 'Service area', x: 478, y: 395, lab: 'r' },
  { n: 'Paramathi Velur', tag: 'Service area', x: 408, y: 428, lab: 'l' },
  { n: 'Karur', tag: 'Service area', x: 432, y: 475, lab: 'r' },
  { n: 'Dindigul', tag: 'Service area', x: 408, y: 528, lab: 'r' },
  { n: 'Palani', tag: 'Service area', x: 325, y: 520, lab: 'l' },
  { n: 'Trichy', tag: 'Service area', x: 560, y: 462, lab: 'b' },
  { n: 'Perambalur', tag: 'Service area', x: 630, y: 395, lab: 'r' },
  { n: 'Attur', tag: 'Service area', x: 545, y: 292, lab: 't' },
  { n: 'Kallakurichi', tag: 'Service area', x: 650, y: 245, lab: 'r' },
  { n: 'Chennai', tag: 'Service area', x: 830, y: 95, lab: 'l' },
  { n: 'Erode', tag: 'Service area', x: 345, y: 335, lab: 'l' },
  { n: 'Palakkad', tag: 'Service area', x: 165, y: 445, lab: 'r' },
  { n: 'Thrissur', tag: 'Service area', x: 105, y: 505, lab: 'r' },
  { n: 'Guruvayur', tag: 'Service area', x: 55, y: 450, lab: 't' },
  { n: 'Tiruppur', tag: 'Service area', x: 300, y: 405, lab: 't' },
  { n: 'Pollachi', tag: 'Service area', x: 250, y: 475, lab: 'r' },
]
const BY = Object.fromEntries(CITIES.map((c) => [c.n, c]))
const HUB = BY.Salem

/* ---------- ROUTE MAP ----------
   Each row is one chain: the line runs through the cities in this order (edit the order to change the flow).
   A water drop travels along every chain from its first city to its last. */
const ROUTES = [
  ['Salem', 'Rasipuram', 'Namakkal'],
  ['Namakkal', 'Paramathi Velur', 'Karur', 'Dindigul', 'Palani'],
  ['Namakkal', 'Trichy', 'Perambalur'],
  ['Salem', 'Attur', 'Kallakurichi', 'Chennai'],
  ['Salem', 'Erode', 'Coimbatore'],
  ['Coimbatore', 'Palakkad', 'Thrissur', 'Guruvayur'],
  ['Coimbatore', 'Tiruppur'],
  ['Coimbatore', 'Pollachi'],
  ['Salem', 'Mettur'],
  ['Salem', 'Dharmapuri', 'Krishnagiri', 'Hosur', 'Bangalore'],
]
/* smooth curve through the cities of one chain (Catmull-Rom -> cubic bezier) */
const smooth = (pts) => {
  if (pts.length === 2) {
    const [p, q] = pts
    return `M${p.x} ${p.y} Q${(p.x + q.x) / 2 - (q.y - p.y) * 0.1} ${(p.y + q.y) / 2 + (q.x - p.x) * 0.1} ${q.x} ${q.y}`
  }
  let d = `M${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    d += ` C${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6} ${p2.x} ${p2.y}`
  }
  return d
}
const ROUTE_PATHS = ROUTES.map((r) => ({ cities: r, d: smooth(r.map((n) => BY[n])) }))
const BUBBLES = Array.from({ length: 14 }, (_, i) => ({
  l: 4 + ((i * 37) % 92),
  s: 8 + ((i * 7) % 16),
  d: (i * 1.3) % 9,
  t: 7 + ((i * 5) % 7),
}))

export default function ZonesPage({ onDemo }) {
  const root = useRef(null)
  const [active, setActive] = useState(null)

  /* scroll-reveal for every .zn-rv */
  useEffect(() => {
    const els = root.current.querySelectorAll('.zn-rv')
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
      { threshold: 0.14 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="zn" ref={root}>
      {/* ============ 1. FULL-WIDTH MAP ============ */}
      <section className="zn-map" aria-label="Places we serve">
        <div className="zn-map-in">
          <img src={mapImg} alt="Illustrated map of the places Aakash Pure Aqua Tech serves: apartments, hotels, hospitals, schools, malls, factories, temples and more" width="2054" height="766" fetchpriority="high" />
          <i className="zn-sweep" />
          <span className="zn-ripple" style={{ '--d': '0s' }} />
          <span className="zn-ripple" style={{ '--d': '1.1s' }} />
          <span className="zn-ripple" style={{ '--d': '2.2s' }} />
          {BUBBLES.map((b, i) => (
            <b key={i} className="zn-bub" style={{ left: b.l + '%', width: b.s, height: b.s, animationDelay: b.d + 's', animationDuration: b.t + 's' }} />
          ))}
        </div>
      </section>

      {/* ============ HEADLINE ============ */}
      <header className="zn-head zn-wrap">
        <span className="zn-eyebrow zn-rv">
          <Icon n="pin" /> Zones we serve
        </span>
        <h1 className="zn-rv" style={{ '--i': 1 }}>
          Pure water for every <em>place</em> you live, work &amp; celebrate
        </h1>
        <p className="zn-rv" style={{ '--i': 2 }}>
          From family homes to hospitals, hotels and heavy industry, Aakash Pure Aqua Tech installs and services water purification systems across Tamil Nadu.
        </p>
        <span className="zn-line zn-rv" style={{ '--i': 3 }} />
      </header>

      {/* ============ 2. WHO WE SERVE ============ */}
      <section className="zn-wrap zn-sec" aria-labelledby="zn-who">
        <div className="zn-sec-h zn-rv">
          <Icon n="drop" className="zn-sec-ic" />
          <h2 id="zn-who">Who we serve</h2>
        </div>
        <ul className="zn-grid">
          {AMENITIES.map(([ic, t, d], i) => (
            <li key={t} className="zn-card zn-rv" style={{ '--i': i % 4 }}>
              <span className="zn-card-ic">
                <Icon n={ic} />
              </span>
              <h3>{t}</h3>
              <p>{d}</p>
              <span className="zn-card-no">{String(i + 1).padStart(2, '0')}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* scrolling city strip */}
      <div className="zn-strip" aria-hidden="true">
        <div className="zn-strip-t">
          {[...CITIES, ...CITIES, ...CITIES, ...CITIES].map((c, i) => (
            <span key={i}>
              <Icon n="pin" /> {c.n}
            </span>
          ))}
        </div>
      </div>

      {/* ============ 3. CITIES ============ */}
      <section className="zn-wrap zn-sec" aria-labelledby="zn-where">
        <div className="zn-sec-h zn-rv">
          <Icon n="pin" className="zn-sec-ic" />
          <h2 id="zn-where">Locations we serve</h2>
        </div>
        <div className="zn-loc">
          {/* animated schematic map */}
          <div className="zn-rv zn-svgbox">
            <svg viewBox="0 0 900 560" role="img" aria-label={`Route map of the ${CITIES.length} locations we serve, with the head office in Salem`}>
              <defs>
                <radialGradient id="znHub" cx="50%" cy="50%" r="50%">
                  <stop offset="0" stopColor="#0d8d97" stopOpacity=".28" />
                  <stop offset="1" stopColor="#0d8d97" stopOpacity="0" />
                </radialGradient>
              </defs>
              {/* soft dotted grid */}
              <g className="zn-dots">
                {Array.from({ length: 14 }).map((_, r) =>
                  Array.from({ length: 21 }).map((__, c) => <circle key={r + '-' + c} cx={30 + c * 44} cy={30 + r * 42} r="1.6" />),
                )}
              </g>
              {/* radar rings from the head office */}
              <circle className="zn-ring" cx={HUB.x} cy={HUB.y} r="40" />
              <circle className="zn-ring" cx={HUB.x} cy={HUB.y} r="40" style={{ animationDelay: '1.3s' }} />
              <circle cx={HUB.x} cy={HUB.y} r="150" fill="url(#znHub)" />
              {/* routes: one connected line per chain + a travelling water drop */}
              {ROUTE_PATHS.map((r, i) => (
                <g key={i} className={active && r.cities.includes(active) ? 'on' : ''}>
                  <path className="zn-route" d={r.d} />
                  <circle className="zn-drop" r="4.5">
                    <animateMotion dur={(r.cities.length - 1) * 2.6 + 's'} begin={i * 0.7 + 's'} repeatCount="indefinite" path={r.d} />
                  </circle>
                </g>
              ))}
              {/* pins */}
              {CITIES.map((c, i) => {
                const lx = c.lab === 'r' ? 15 : c.lab === 'l' ? -15 : 0
                const ly = c.lab === 't' ? -38 : c.lab === 'b' ? 20 : -13
                const anchor = c.lab === 'r' ? 'start' : c.lab === 'l' ? 'end' : 'middle'
                return (
                  <g
                    key={c.n}
                    className={'zn-pin' + (c.br ? ' branch' : '') + (c.hub ? ' hub' : '') + (active === c.n ? ' on' : '')}
                    transform={`translate(${c.x} ${c.y})`}
                    onMouseEnter={() => setActive(c.n)}
                    onMouseLeave={() => setActive(null)}
                  >
                    <ellipse className="zn-pp" cx="0" cy="0" rx="10" ry="4" style={{ animationDelay: i * 0.35 + 's' }} />
                    <g className="zn-bob" style={{ animationDelay: i * 0.25 + 's' }}>
                      <g transform="scale(.72)">
                        <path d="M0 0C-8-12-16-18-16-28a16 16 0 1 1 32 0C16-18 8-12 0 0z" />
                        <circle cx="0" cy="-28" r="6" />
                      </g>
                    </g>
                    <text x={lx} y={ly} textAnchor={anchor}>
                      {c.n}
                    </text>
                  </g>
                )
              })}
            </svg>
            <small>Route map · not to scale</small>
          </div>

          {/* city list */}
          <ul className="zn-cities">
            {CITIES.map((c, i) => (
              <li
                key={c.n}
                className={'zn-city zn-rv' + (c.br ? ' branch' : '')}
                data-on={active === c.n ? 'true' : undefined}
                style={{ '--i': i % 6 }}
                onMouseEnter={() => setActive(c.n)}
                onMouseLeave={() => setActive(null)}
              >
                <span className="zn-city-ic">
                  <Icon n="pin" />
                </span>
                <div>
                  <b>{c.n}</b>
                  <small>{c.tag}</small>
                </div>
                <Icon n="arrow" className="zn-city-ar" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ 4. CTA ============ */}
      <section className="zn-wrap zn-sec">
        <div className="zn-cta zn-rv">
          <i className="zn-cta-b" style={{ left: '8%' }} />
          <i className="zn-cta-b" style={{ left: '46%', animationDelay: '1.4s' }} />
          <i className="zn-cta-b" style={{ left: '82%', animationDelay: '2.6s' }} />
          <div>
            <h2>Not sure we reach your area?</h2>
            <p>Tell us where you are – we’ll confirm service, installation and AMC availability for your location.</p>
          </div>
          <div className="zn-cta-btns">
            <button type="button" className="zn-btn" onClick={onDemo}>
              Book a free demo <Icon n="arrow" />
            </button>
            <a className="zn-btn ghost" href="tel:+919655577666">
              <Icon n="phone" /> 96555 77666
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
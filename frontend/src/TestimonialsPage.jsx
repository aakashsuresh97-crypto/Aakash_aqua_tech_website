/* =====================================================================
   TESTIMONIALS PAGE (zt-*)  – opens inside the app at /testimonials
   Tilted, stacked review cards (same structure as the reference picture):
   big letter avatar · name · "Customer · town" · star pill · review text.
   Colours: sandal + cream (accent cards alternate with white cards).
   The 60 real reviews live in ./testimonialsData.js (copied from the old website).
   Prop from App.jsx:  onDemo()
===================================================================== */
import { useEffect, useRef, useState } from 'react'
import { TESTIMONIALS, CITY_COUNTS, INTRO } from './testimonialsData.js'
import { ensureSection } from './site.js'

const SHOW_STARS = true /* old site has no star ratings; set false to hide the star pill */
const STEP = 12 /* cards shown first, and added by each "Load more" click */

const TILT = [-2.6, 2.1, -1.9, 2.5, -2.2, 1.8]

const Star = ({ i }) => (
  <svg className="zt-star" style={{ '--s': i }} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m12 2.5 2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9z" />
  </svg>
)
const Leaf = () => (
  <svg className="zt-leaf" viewBox="0 0 28 28" aria-hidden="true">
    <path d="M5 25C11 19 15 13 23 4" />
    <path d="M10 20c-3.5-.6-5-3.4-5-6 3.4 0 5.3 2.4 5 6z" />
    <path d="M15 14c-1-3.4.4-6 3-7.2 1.4 3 .4 5.8-3 7.2z" />
    <path d="M13 17c3-.4 5.6.8 6.8 3.4-3 1-5.8 0-6.8-3.4z" />
  </svg>
)
const Sparkle = ({ className, style }) => (
  <svg className={'zt-sp ' + className} style={style} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 0c.8 6.4 5.6 11.2 12 12-6.4.8-11.2 5.6-12 12-.8-6.4-5.6-11.2-12-12 6.4-.8 11.2-5.6 12-12z" />
  </svg>
)
const Quote = () => (
  <svg className="zt-q" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 7H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h3v1a3 3 0 0 1-3 3M20 7h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h3v1a3 3 0 0 1-3 3" />
  </svg>
)

const Pin = () => (
  <svg className="zt-pin" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
/* number that counts up from 0 (own component, so the page does not re-render every frame) */
function Count({ n }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 1600)
      setV(Math.round(n * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [n])
  return <b>{v}</b>
}

const BUBBLES = Array.from({ length: 12 }, (_, i) => ({
  l: 3 + ((i * 41) % 94),
  s: 10 + ((i * 7) % 18),
  d: (i * 1.7) % 10,
  t: 9 + ((i * 3) % 9),
}))

export default function TestimonialsPage({ onDemo }) {
  const root = useRef(null)
  const [city, setCity] = useState('All')
  const [shown, setShown] = useState(STEP)
  useEffect(() => {
    ensureSection('testimonials') /* fetched only when this page opens (App re-renders when it arrives) */
  }, [])

  const list = city === 'All' ? TESTIMONIALS : TESTIMONIALS.filter((t) => t.place === city)
  const visible = list.slice(0, shown)

  /* scroll reveal – adds class "in" to every not-yet-revealed .zt-rv / .zt-item once visible */
  useEffect(() => {
    const els = root.current.querySelectorAll('.zt-rv:not(.in), .zt-item:not(.in)')
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
      { threshold: 0.15 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [city, shown])

  return (
    <div className="zt" ref={root}>
      {/* ----- animated background ----- */}
      <div className="zt-bg" aria-hidden="true">
        <svg className="zt-arc a1" viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="190" />
        </svg>
        <svg className="zt-arc a2" viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="190" />
        </svg>
        <i className="zt-dots d1" />
        <i className="zt-dots d2" />
        <i className="zt-dots d3" />
        <i className="zt-dots d4" />
        {BUBBLES.map((b, i) => (
          <b key={i} className="zt-bub" style={{ left: b.l + '%', width: b.s, height: b.s, animationDelay: b.d + 's', animationDuration: b.t + 's' }} />
        ))}
      </div>

      {/* ----- heading ----- */}
      <header className="zt-head">
        <Sparkle className="s1" />
        <Sparkle className="s2" />
        <Sparkle className="s3" />
        <p className="zt-script">Customers Testimonials</p>
        <h1 aria-label="What They Say?">
          {'What They Say?'.split(' ').map((w, wi) => (
            <span className="zt-word" key={wi} aria-hidden="true">
              {w.split('').map((ch, ci) => (
                <span key={ci} style={{ '--c': wi * 5 + ci }}>
                  {ch}
                </span>
              ))}
            </span>
          ))}
        </h1>
        <span className="zt-uline" />
        <p className="zt-intro">{INTRO}</p>
        <div className="zt-count">
          <Count n={TESTIMONIALS.length} /> <span>happy customer reviews</span>
        </div>
      </header>

      {/* ----- city filter ----- */}
      <div className="zt-chips zt-rv" role="tablist" aria-label="Filter reviews by town">
        {[['All', TESTIMONIALS.length], ...CITY_COUNTS].map(([c, n], i) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={city === c}
            className={'zt-chip' + (city === c ? ' on' : '')}
            style={{ '--i': i }}
            onClick={() => {
              setCity(c)
              setShown(STEP)
            }}
          >
            {c !== 'All' && <Pin />}
            {c} <em>{n}</em>
          </button>
        ))}
      </div>

      {/* ----- tilted review cards ----- */}
      <div className="zt-list">
        {visible.map((t, i) => {
          const side = i % 2 === 0 ? -1 : 1
          return (
            <article
              key={city + '-' + t.id}
              className={'zt-item ' + (i % 2 === 0 ? 'sand' : 'cream')}
              style={{ '--rot': TILT[i % TILT.length] + 'deg', '--fx': side * 140 + 'px', '--n': i % 2 }}
            >
              <div className="zt-card">
                <Quote />
                <div className="zt-top">
                  <div className="zt-who">
                    <span className="zt-av">
                      <b>{t.name.trim().charAt(0).toUpperCase()}</b>
                      <Leaf />
                    </span>
                    <div>
                      <h3>{t.name}</h3>
                      <small>
                        Customer · <Pin /> {t.place}
                      </small>
                    </div>
                  </div>
                  {SHOW_STARS && (
                    <div className="zt-stars" role="img" aria-label="5 out of 5 stars">
                      {[0, 1, 2, 3, 4].map((s) => (
                        <Star key={s} i={s} />
                      ))}
                    </div>
                  )}
                </div>
                <p>{t.text}</p>
              </div>
            </article>
          )
        })}
      </div>

      {/* ----- load more ----- */}
      <div className="zt-more">
        <small>
          Showing {visible.length} of {list.length} reviews
        </small>
        {shown < list.length && (
          <div className="zt-more-b">
            <button type="button" className="zt-btn alt" onClick={() => setShown((n) => n + STEP)}>
              Load more reviews
            </button>
            <button type="button" className="zt-btn ghost" onClick={() => setShown(list.length)}>
              Show all
            </button>
          </div>
        )}
      </div>

      {/* ----- closing ----- */}
      <section className="zt-end zt-rv">
        <h2>Happy with our service?</h2>
        <p>Tell us about your experience – or book a free water test and demo at your place.</p>
        <button type="button" className="zt-btn" onClick={onDemo}>
          Book a free demo
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
        <a className="zt-url" href="https://aakashaquatech.in">
          www.aakashaquatech.in
        </a>
      </section>
    </div>
  )
}

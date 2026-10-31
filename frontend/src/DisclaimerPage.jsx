

/* =====================================================================
   DISCLAIMER PAGE – opens inside the app at /disclaimer
   Full-width banner -> animated logo + heading -> numbered cards with bullet points.
   Re-uses the look of privacy.css (.pp …) and terms.css (.tc … cards, bullets, timeline) – keep both imported in main.jsx.
   Colours: sandal + cream.
===================================================================== */
import { useEffect, useRef } from 'react'
import banner from './assets/legal/disclaimer-banner.webp'
import logo from './assets/footer-logo.png'

const C = 'Aakash Aqua Tech Private Limited'

const I = {
  alert: <><path d="M12 3 2.5 20h19z" /><path d="M12 10v5M12 17.5v.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" /></>,
  shield: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z M9 12l2 2 4-4" />,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.7 2.7L16 9.5" /></>,
}
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {I[name]}
  </svg>
)

const SECTIONS = [
  {
    id: 'as-is', icon: 'globe', title: 'Provided "as is"',
    bullets: [
      'The Site, and all content, materials, information, and services provided on the Site, are provided on an "as is" and "as available" basis.',
    ],
  },
  {
    id: 'warranties', icon: 'shield', title: 'Warranties',
    bullets: [
      `${C} explicitly disclaims all warranties of any kind, whether express or implied, including, but not limited to, the implied warranties of fitness for a particular purpose and non-infringement, to the extent permitted by applicable law.`,
    ],
  },
  {
    id: 'accuracy', icon: 'check', title: 'Accuracy of information',
    bullets: [
      `Though utmost care has been taken to ensure the authenticity and accuracy of the information provided, ${C} does not guarantee that all information is entirely accurate, complete, or error-free.`,
      'The company shall not be liable for inaccuracies or omissions to the extent permitted by applicable law.',
    ],
  },
]

export default function DisclaimerPage() {
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
    <div className="pp tc" ref={root}>
      <span className="pp-drop d1" aria-hidden="true" />
      <span className="pp-drop d2" aria-hidden="true" />
      <span className="pp-drop d3" aria-hidden="true" />

      {/* ------------------------------------------------ full-width banner */}
      <section className="pp-banner">
        <img src={banner} alt="Disclaimer" width="1920" height="640" fetchpriority="high" decoding="async" />
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
              <Icon name="alert" />
            </span>
          </div>
          <div className="pp-head-txt">
            <span className="pp-badge">
              <i /> Important information
            </span>
            <h1 className="pp-title">Disclaimer</h1>
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
                  <li key={j} style={{ '--i': j }}>{b}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
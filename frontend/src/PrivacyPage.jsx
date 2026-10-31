/* =====================================================================
   PRIVACY POLICY PAGE (pp-*) – opens inside the app at /privacy-policy
   Full-width banner  ->  animated logo emblem + heading  ->  policy cards  ->  contact card.
   Colours: sandal + cream (see privacy.css).  Text = Aakash Aqua Tech Private Limited policy.
===================================================================== */
import { useEffect, useRef } from 'react'
import banner from './assets/legal/privacy-banner.webp'
import logo from './assets/footer-logo.png'

const COMPANY = 'Aakash Aqua Tech Private Limited'
const WEBSITE = 'https://aakashaquatech.in/'
const EMAIL = 'ceo@aakashaquatech.in' /* <- change to your official privacy e-mail if different */

/* small line icons (stroke = currentColor) */
const I = {
  shield: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z M9 12l2 2 4-4" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1.3" /></>,
  cookie: <><path d="M21 12.5A9 9 0 1 1 11.5 3a4 4 0 0 0 5 5 3.5 3.5 0 0 0 4.5 4.5z" /><circle cx="9" cy="10" r="1" /><circle cx="14" cy="15" r="1" /><circle cx="8.5" cy="15" r=".8" /></>,
  safe: <><path d="M12 2.5 4 6v6c0 4.6 3.2 8 8 9.5 4.8-1.5 8-4.9 8-9.5V6z" /><path d="M9 12.2l2.2 2.2L15.5 10" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.5-4.2L4 8.5" /><path d="M4 4v4.5h4.5" /><path d="M4 13a8 8 0 0 0 14.5 4.2L20 15.5" /><path d="M20 20v-4.5h-4.5" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" /></>,
  building: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4" /></>,
}
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {I[name]}
  </svg>
)

const INTRO = `${COMPANY} respects your privacy and is committed to protecting your personal information.`

const POLICY = [
  {
    icon: 'user',
    title: 'Information we collect',
    text: 'When you contact us through our website, we may collect your name, phone number, email address, and enquiry details to respond to your requests and provide information about our products and services.',
  },
  {
    icon: 'lock',
    title: 'Sharing of information',
    text: 'We do not sell your personal information to third parties. We may share information with service providers when necessary to operate our website or when required by law.',
  },
  {
    icon: 'cookie',
    title: 'Cookies & analytics',
    text: 'Our website may use cookies or analytics tools to improve website performance and user experience. The use of such technologies will depend on the services enabled on our website.',
  },
  {
    icon: 'safe',
    title: 'Security & retention',
    text: 'We take reasonable steps to protect your personal information and retain it only as long as necessary for business or legal purposes.',
  },
  {
    icon: 'refresh',
    title: 'Policy updates',
    text: 'We may update this Privacy Policy from time to time. Any changes will be published on this page.',
  },
]

export default function PrivacyPage() {
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
      { threshold: 0.12 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="pp" ref={root}>
      {/* floating water drops (decoration) */}
      <span className="pp-drop d1" aria-hidden="true" />
      <span className="pp-drop d2" aria-hidden="true" />
      <span className="pp-drop d3" aria-hidden="true" />

      {/* ------------------------------------------------ full-width banner */}
      <section className="pp-banner">
        <img src={banner} alt="Privacy Policy" width="1920" height="640" fetchpriority="high" decoding="async" />
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
              <Icon name="shield" />
            </span>
          </div>
          <div className="pp-head-txt">
            <span className="pp-badge">
              <i /> Your data is safe with us
            </span>
            <h1 className="pp-title">Privacy Policy</h1>
            <p className="pp-intro">{INTRO}</p>
          </div>
        </div>

        {/* ------------------------------------------------ policy cards */}
        <div className="pp-grid">
          {POLICY.map((p, i) => (
            <article className="pp-item pp-rv" style={{ '--d': `${i * 90}ms` }} key={p.title}>
              <span className="pp-ico">
                <Icon name={p.icon} />
              </span>
              <span className="pp-num">{String(i + 1).padStart(2, '0')}</span>
              <h2>{p.title}</h2>
              <p>{p.text}</p>
            </article>
          ))}

          {/* contact card */}
          <article className="pp-item pp-contact pp-rv" style={{ '--d': `${POLICY.length * 90}ms` }}>
            <span className="pp-ico">
              <Icon name="mail" />
            </span>
            <h2>Contact us</h2>
            <p>
              For questions or privacy-related requests, please contact us at{' '}
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
            </p>
            <ul>
              <li>
                <Icon name="building" />
                <span>
                  <b>Company:</b> {COMPANY}
                </span>
              </li>
              <li>
                <Icon name="globe" />
                <span>
                  <b>Website:</b>{' '}
                  <a href={WEBSITE} target="_blank" rel="noopener noreferrer">
                    {WEBSITE}
                  </a>
                </span>
              </li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  )
}
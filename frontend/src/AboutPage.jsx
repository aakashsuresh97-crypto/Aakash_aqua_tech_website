/* =====================================================================
   ABOUT US PAGE  (opens inside the app – no redirect to the old WordPress page)
   Content = the text of https://aakashaquatech.in/about-us/ (wording unchanged),
   only the layout / look is new:  hero colours (navy · teal · Outfit) + cream/tan of the product page.
   Props come from App.jsx:  img(path), stats, Counter, onDemo, heroBg
===================================================================== */
import mdPhoto from './assets/team/md.webp'
import ceoPhoto from './assets/team/ceo.webp'
import aboutBg from './assets/office/about-bg.webp'

const Arrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
)
const Pin = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const Shield = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

/* branches mentioned in the text: "head office founded in 2004 at Salem and Branches at Coimbatore, Dharmapuri" */
const PLACES = [
  ['Salem', 'Head office'],
  ['Coimbatore', 'Branch'],
  ['Dharmapuri', 'Branch'],
]
const MOTTO = ['Drink Pure', 'Breath pure', 'Eat pure', 'Live pure']

export default function AboutPage({ stats, Counter, onDemo }) {
  const founder = mdPhoto
  const ceo = ceoPhoto

  return (
    <div className="ap">
      {/* ---------------------------------------------------------- HERO */}
      <section className="ap-hero" style={{ '--ap-bg': `url(${aboutBg})` }}>
        <span className="ap-bub" aria-hidden="true" />
        <div className="ap-hero-in">
          <div className="ap-copy">
            <nav className="ap-crumb" aria-label="Breadcrumb">
              <a href="/">Home</a>
              <i>/</i>
              <span>About us</span>
            </nav>
            <span className="ap-badge">
              <i />
              Our Team
            </span>
            <h1 className="ap-title">
              About <em>us</em>
            </h1>
            <p className="ap-lead">Meet our Founder and Managing Director Mr.P.Suresh.</p>
            <p className="ap-sub">
              An RO expert with over <b>35 years</b> of expertise in the field of water and waste water treatment.
            </p>
            <div className="ap-cta">
              <button className="btn ap-btn pri" onClick={onDemo}>
                Book a Demo <Arrow />
              </button>
              <a
                className="btn ap-btn sec"
                href="#ap-team"
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById('ap-team')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                Our Team
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- STATS (same numbers as the home page) */}
      <section className="ap-stats" aria-label="Aakash Pure Aqua Tech in numbers">
        {stats.map(([n, s, l], i) => (
          <div key={l} className="ap-stat" style={{ transitionDelay: i * 90 + 'ms' }}>
            <Counter to={n} suffix={s} />
            <span>{l}</span>
          </div>
        ))}
      </section>

      {/* ---------------------------------------------------------- STORY + TEAM (cream card, like the product page) */}
      <section className="ap-band">
        <div className="ap-story">
          <aside className="ap-side">
            <div className="ap-year">
              <small>Head office founded in</small>
              <b>2004</b>
              <span>at Salem</span>
            </div>
            <ul className="ap-places">
              {PLACES.map(([c, k]) => (
                <li key={c}>
                  <Pin />
                  <b>{c}</b>
                  <em>{k}</em>
                </li>
              ))}
            </ul>
            <div className="ap-cert">
              <Shield />
              <span>
                Certified brand by <b>NSF</b> &amp; <b>WQA</b> of USA
              </span>
            </div>
          </aside>

          <div className="ap-tl">
            <p className="ap-p big">
              The entrepreneur who grew Aakash pure aqua tech pvt Ltd from a start up to <b>millions in annual sales</b>{' '}
              through effective business planning, creative sales techniques and innovative marketing.
            </p>
            <p className="ap-p">
              Aakash pure aqua tech pvt Ltd is the <b>most professionally managed environmental engineering firm</b> in
              the state with its head office founded in <b>2004 at Salem</b> and Branches at{' '}
              <b>Coimbatore , Dharmapuri</b>.
            </p>
            <p className="ap-p">
              Unanimously acknowledged as the leading <b>No.1 multi brand store</b> in RO water purifier category for
              sales, And service. We pioneered in bringing the revolutionary in{' '}
              <b>Reverse Osmosis Technology to South India</b>., Equipped with the vision for a healthier world and the
              technological expertise to come up with Innovative solutions, It has been a remarkable journey, strewn
              with milestones.
            </p>
            <p className="ap-p">
              While the brand has brought the technology, of <b>live TDS Display Water purifiers</b> while retaining
              natural minerals with <b>alkaline &amp; copper technology</b>, while helps to retain the purity of pure
              water which are essential for a healthy life.
            </p>
            <p className="ap-p">
              Technological advancements from the store of We have been recognized all over South India and proud to say
              that we are one of the only water purifier company tied up with to be certified brand by some of the most
              prestigious Certifying agencies of India and abroad like <b>NSF &amp; WQA of USA</b>.
            </p>
            <p className="ap-p">
              With <b>millions of satisfied customers</b>, Is the, most trusted one in the category, across India. The
              largest <b>Multi Brand Dealer &amp; Distributor of RO water Purifiers</b>, we have diversified its product
              portfolio, over the years.
            </p>
            <p className="ap-p">
              We now offer a wide range of <b>Sand filter, Industrial RO, Range of kitchen Appliances</b>. The name has
              become synonymous with offering purity. The brand has come to be known for its innovative use of next-gen
              technology towards enhancing quality of everyday living. We are constantly innovating and providing
              solutions to protect People from harmful diseases. Driven by the purpose to offer good health to one and
              all we are, without a doubt, the best guardian of your family’s health and lets you drink Pure, breath
              pure, eat pure &amp; live pure.
            </p>
          </div>
        </div>

        <div className="ap-team" id="ap-team">
          <h2 className="ap-h2">Our Team</h2>
          <div className="ap-cards">
            {[
              [founder, 'P.Suresh', 'Managing director'],
              [ceo, 'Aakash Suresh', 'CEO'],
            ].map(([src, name, role], i) => (
              <article key={name} className="ap-card" style={{ transitionDelay: i * 140 + 'ms' }}>
                <div className="ap-card-img">
                  <img src={src} alt={name} loading="lazy" />
                </div>
                <div className="ap-card-txt">
                  <h3>{name}</h3>
                  <span>{role}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- CLOSING BAND (hero button colours) */}
      <section className="ap-end">
        <span className="ap-end-bub b1" aria-hidden="true" />
        <span className="ap-end-bub b2" aria-hidden="true" />
        <div className="ap-motto">
          {MOTTO.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        <p>
          Aakash AquaTech delivers reliable water purification solutions designed to provide clean, safe, and healthy
          water for every home and business.
        </p>
        <button className="btn ap-btn light" onClick={onDemo}>
          Book a Demo <Arrow />
        </button>
      </section>
    </div>
  )
}
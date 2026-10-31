/* =====================================================================
   TERMS & CONDITIONS PAGE (tc-*) – opens inside the app at /terms-and-conditions
   Full-width banner -> animated logo + heading -> quick-jump chips -> numbered cards with bullet points.
   Re-uses the base look of the Privacy page (privacy.css: .pp, .pp-banner, .pp-emblem …) + terms.css.
   Colours: sandal + cream.  Wording = Aakash Aqua Tech Private Limited terms (only split into bullets).
===================================================================== */
import { useEffect, useRef } from 'react'
import banner from './assets/legal/terms-banner.webp'
import logo from './assets/footer-logo.png'

const C = 'Aakash Aqua Tech Private Limited'
const S = 'https://aakashaquatech.in/'
const EMAIL = 'ceo@aakashaquatech.in' /* <- your official e-mail */
const JURISDICTION = 'Salem' /* <- court city for "courts in [Your Jurisdiction]" – confirm with your lawyer */
const ADDRESS = ['10/62C, Brindavan Road, 1st Cross (Behind Dr. Sudamani Hospital),', 'Fairlands, Salem - 636016, Tamil Nadu'] /* <- registered office */

const I = {
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
  scale: <><path d="M12 3v18M6 21h12M5 7h14" /><path d="m5 7-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0z" /></>,
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5M9 8h6" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
  copy: <><circle cx="12" cy="12" r="9" /><path d="M14.8 9.2a3.5 3.5 0 1 0 0 5.6" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M16 7l3 3M14 9l2 2" /></>,
  edit: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
  truck: <><path d="M2 6h11v10H2zM13 10h4l4 3v3h-8" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  cloud: <><path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5 4 4 0 0 1 17.5 18z" /><path d="m11 13 2 2-2 2" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.5-4.2L4 8.5" /><path d="M4 4v4.5h4.5" /><path d="M4 13a8 8 0 0 0 14.5 4.2L20 15.5" /><path d="M20 20v-4.5h-4.5" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.7 2.7L16 9.5" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></>,
  alert: <><path d="M12 3 2.5 20h19z" /><path d="M12 10v5M12 17.5v.5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.5" /></>,
  shield: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z M9 12l2 2 4-4" />,
}
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {I[name]}
  </svg>
)

/* {EMAIL} -> mail link ; the site address -> link */
const rich = (t) =>
  t
    .split(/(\{EMAIL\}|https:\/\/aakashaquatech\.in\/)/)
    .map((p, i) =>
      p === '{EMAIL}' ? (
        <a key={i} href={`mailto:${EMAIL}`}>{EMAIL}</a>
      ) : p === S ? (
        <a key={i} href={S} target="_blank" rel="noopener noreferrer">{S}</a>
      ) : (
        p
      ),
    )

/* each section: lead (optional paragraph) · bullets · defs (term/definition) · after (closing paragraph) */
const SECTIONS = [
  {
    id: 'user-agreement', icon: 'doc', title: 'User Agreement',
    bullets: [
      `Welcome to ${C}. ${C} provides its services to you subject to the following terms and conditions.`,
      `If you access this web site or visit or shop at ${S}, you accept these Terms and Conditions of Use, as well as our other terms and conditions on this web site, such as our Privacy Policy, Cancellation and Refund Policy, Delivery policy and Disclaimer. Please read them carefully.`,
      `In addition, when you use any current or future ${C} service on this web site, you also will be subject to the guidelines and conditions applicable to such service.`,
      `All products /Services and information displayed on ${S} constitute "An invitation to offer". Your orders for purchase constitute your offer which shall be subject to the terms and conditions as listed below. ${S} reserves the right to accept or reject your offer.`,
    ],
  },
  {
    id: 'applicable-law', icon: 'scale', title: 'Applicable Law',
    bullets: [
      `This site is created and controlled by ${C}.`,
      `The laws of India shall apply and courts in ${JURISDICTION} only shall have jurisdiction in respect of all the terms, conditions and disclaimers.`,
      `${C} reserves the right to make changes to the web site and the terms, conditions and disclaimers at any time and without information to the customers/users of the services/web site of ${C}.`,
    ],
  },
  {
    id: 'definitions', icon: 'book', title: 'Definitions',
    defs: [
      ['"Agreement"', 'means the terms and conditions as detailed herein including all schedules, appendices, annexures, privacy policy etc., and will include the references to this agreement as amended, notated, supplemented, varied or replaced from time to time.'],
      [`"${S}" / "${C}" / "web site"`, `means the online shopping platform and the services provided by it owned and operated by ${C} which provides a venue to the users of ${S} to buy the products listed on ${S}.`],
      ['"Vendor" / "seller" / "affiliates"', `shall mean the person or any legal entity who offers for sale, sells the products on ${S}.`],
      ['"Customer" / "buyer"', `shall mean the person or any legal entity who makes the offer for sale on ${S} by placing an order for and or purchases any products through the platform of ${S}.`],
      ['"User" / "you"', 'means and includes any person or an entity or any legal entity using or accessing the services provided on this site.'],
      ['"Product/Products"', `means and includes any goods / merchandise / products / services / offers / display items that are uploaded /showcased/displayed on ${S} and the related description, information, procedure, processes, warranties, delivery schedule, etc.`],
    ],
  },
  {
    id: 'electronic-communication', icon: 'mail', title: 'Electronic Communication',
    bullets: [
      `When you visit ${S} or send e-mails to us, you are communicating with us electronically.`,
      'You consent to receive communications from us electronically. We will communicate with you by e-mail or by posting notices on this web site.',
      'You agree that all agreements, notices, disclosures and other communications that we provide to you electronically satisfy any legal requirement that such communications be in writing.',
    ],
  },
  {
    id: 'copyright', icon: 'copy', title: 'Copyright and Trademarks',
    bullets: [
      `Unless otherwise stated, copyright and all intellectual property rights in all material presented on the site (including but not limited to text, audio, video or graphical images), trademarks and logos appearing on this site are the property of ${C}, its parent, affiliates and associates and are protected under applicable Indian laws.`,
      `You agree not to use any framing techniques to enclose any trademark or logo or other proprietary information of ${C}.`,
      'Any infringement shall be vigorously defended and pursued to the fullest extent permitted by law.',
    ],
  },
  {
    id: 'site-access', icon: 'key', title: 'Permission and Site Access',
    bullets: [
      `${C} grants you a limited license to access and make personal use of this site and not to download or modify it, or any portion of it, except with express prior written consent of ${C}.`,
      'This license does not include any resale or commercial use of this site or its contents; any collection and use of any product listings, descriptions, or prices; any derivative use of this site or its contents; any downloading or copying of account information for the benefit of another merchant; or any use of data mining, robots, or similar data gathering and extraction tools.',
      `This site or any portion of this site may not be reproduced, duplicated, copied, sold, resold, visited, or otherwise exploited for any commercial purpose without prior express written consent of ${C}.`,
      `You may not frame or utilize framing techniques to enclose any trademark, logo, or other proprietary information (including images, text, page layout, or form) of ${C} and our affiliates without express written consent.`,
      `You may not use any meta tags or any other "hidden text" utilizing ${C}'s name or trademarks without the express written consent of ${C}.`,
      `Any unauthorized use terminates the permission or license granted by ${C}.`,
    ],
  },
  {
    id: 'product-changes', icon: 'edit', title: 'Changes / Product Description',
    bullets: [
      `${C} reserves the right to suspend / cancel, or discontinue any or all products or service at any time without notice, make modifications and alterations in any or all of the content, products and services contained on the site without prior notice.`,
      `If a product offered by ${S} is not as described, your sole remedy is to return it to us in unused condition within 7 days of delivery.`,
    ],
  },
  {
    id: 'user-account', icon: 'user', title: 'User Account',
    lead: `Notwithstanding other legal remedies that may be available to ${C}, ${C} may in its sole discretion limit user activity by immediately removing user listing either temporarily or indefinitely or suspend or terminate user membership, and/or refuse to provide user with access to the site:`,
    bullets: [
      `If the user is in breach any of the terms and conditions of this agreement and/or the terms and conditions of usage of ${C};`,
      'If the user has provided wrong, inaccurate, incomplete or incorrect information;',
      `If your actions may cause any harm, damage or loss to the other users or ${C}.`,
    ],
    after: `Illegal and/or unauthorized use of the service, including unauthorized framing of or linking to the ${C} site will be investigated, and appropriate legal action will be taken, including without limitation, civil, criminal and injunctive redress.`,
  },
  {
    id: 'risk-of-loss', icon: 'truck', title: 'Risk of Loss',
    bullets: [
      `All items purchased from ${S} are made pursuant to a shipment/dispatch contract.`,
      'This means that the risk of loss and title for such items pass to you upon our delivery to the carrier/courier.',
    ],
  },
  {
    id: 'force-majeure', icon: 'cloud', title: 'Force Majeure',
    bullets: [`${C} shall have no liability to you for any interruption or delay in access to the Site irrespective of the cause.`],
  },
  {
    id: 'policy-updates', icon: 'refresh', title: 'Policy Updates',
    bullets: [
      'We reserve the right to change or update this policy at any time by placing a prominent notice on our site. Such changes shall be effective immediately upon posting to this site.',
      'If any of the terms & conditions shall be deemed to be invalid, void or for any reason unenforceable, that term shall be deemed severable and shall not affect validity & enforceability of any remaining term & condition.',
    ],
  },
  {
    id: 'entire-agreement', icon: 'link', title: 'Entire Agreement',
    bullets: [
      'These Terms of Service constitute the entire agreement between the parties with respect to the subject matter hereof and supersedes and replaces all prior or contemporaneous understandings or agreements, written or oral, regarding such subject matter.',
      'The clauses as above shall survive the termination or expiry of this agreement.',
    ],
  },
  {
    id: 'general', icon: 'check', title: 'General',
    bullets: [
      'The waiver of a breach of any term hereof shall in no way be construed as a waiver of any other term or breach thereof.',
      'The person agreeing to these terms & conditions of use represents & warrants that such person is authorized to bind and thus bind his or her principal or employer and has adequate legal capacity to enter into these terms and conditions of use.',
    ],
  },
  { id: 'address', icon: 'pin', title: 'Our Address', address: true },
  {
    id: 'disclaimer', icon: 'alert', title: 'Disclaimer',
    bullets: [
      `This site is provided to you by ${C} on an "As is" and "As available" basis. ${C} does not warrant that this site, its servers or email sent from ${S} are free of viruses and other harmful components.`,
      `${C} makes every effort to present accurate and timely information regarding the products we have for sale. However it is possible that some discrepancies or inaccuracies may arise in which case please inform us at {EMAIL}.`,
      'All products displayed in our catalogues may not be readily available for sale due to product unavailability or for any other reason.',
    ],
  },
  {
    id: 'information-liability', icon: 'info', title: 'Information Liability',
    bullets: [
      `In no event shall ${S} or any of its sources be liable for any direct, special, incidental, indirect, or consequential damages whatsoever (including but not limited to: damages for loss of business profits, business interruption, loss of business information, or any other pecuniary loss) arising out of the use of the information made available on this web site.`,
      `Information on the ${S} web site may not be reproduced, copied, or altered without the express written consent of ${C} and its affiliates.`,
    ],
  },
]

export default function TermsPage() {
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

  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="pp tc" ref={root}>
      <span className="pp-drop d1" aria-hidden="true" />
      <span className="pp-drop d2" aria-hidden="true" />
      <span className="pp-drop d3" aria-hidden="true" />

      {/* ------------------------------------------------ full-width banner */}
      <section className="pp-banner">
        <img src={banner} alt="Terms and Conditions" width="1920" height="640" fetchpriority="high" decoding="async" />
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
              <Icon name="doc" />
            </span>
          </div>
          <div className="pp-head-txt">
            <span className="pp-badge">
              <i /> Please read carefully
            </span>
            <h1 className="pp-title">Terms &amp; Conditions</h1>
            <p className="pp-intro">
              Welcome to {C}. By using our website you agree to the terms below. Tap a topic to jump straight to it.
            </p>
          </div>
        </div>

        {/* ------------------------------------------------ quick-jump chips */}
        <nav className="tc-chips" aria-label="Terms sections">
          {SECTIONS.map((s, i) => (
            <button type="button" key={s.id} onClick={() => jump(s.id)} style={{ '--i': i }}>
              <b>{String(i + 1).padStart(2, '0')}</b> {s.title}
            </button>
          ))}
        </nav>

        {/* ------------------------------------------------ numbered cards with bullets */}
        <div className="tc-list">
          {SECTIONS.map((s, i) => (
            <article className="pp-item pp-rv tc-sec" id={s.id} key={s.id} style={{ '--d': '0ms' }}>
              <span className="tc-node" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <header className="tc-hd">
                <span className="pp-ico"><Icon name={s.icon} /></span>
                <h2>{s.title}</h2>
              </header>

              {s.lead && <p className="tc-lead">{s.lead}</p>}

              {s.bullets && (
                <ul className="tc-ul">
                  {s.bullets.map((b, j) => (
                    <li key={j} style={{ '--i': j }}>{rich(b)}</li>
                  ))}
                </ul>
              )}

              {s.defs && (
                <dl className="tc-defs">
                  {s.defs.map(([t, d], j) => (
                    <div key={t} style={{ '--i': j }}>
                      <dt>{t}</dt>
                      <dd>{rich(d)}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {s.after && <p className="tc-after">{s.after}</p>}

              {s.address && (
                <address className="tc-addr">
                  <b>{C}</b>
                  {ADDRESS.map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                  <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
                </address>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
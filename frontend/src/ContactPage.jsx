/* Contact page – sand-cream cards, animated form, real Tamil Nadu map (Leaflet) with 3 branch pins,
   and an office accordion that opens an exact-location Google map for each branch.
   Classes are prefixed cu- (styles in contact.css).  Needs:  npm i leaflet */
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PHONE, WA } from './data.js'
import { track } from './track.js'
import { api } from './api.js'

/* ================= EDIT HERE: the 3 offices =================
   ll    = [latitude, longitude]  -> position of the pin on the Tamil Nadu map AND of the small map in the accordion
   embed = (optional) paste the src="..." from Google Maps → Share → Embed a map; it overrides ll for the small map
   ⚠ Replace ll with the exact point: open Google Maps, right-click the shop, click the numbers at the top to copy. */
const BRANCHES = [
  {
    id: 'salem',
    city: 'Salem',
    name: 'Aakash Aqua Tech Pvt Ltd - Head Office',
    addr: '1st Cross, 10, 62C, Brindavan Rd, behind Dr. Sudamani Hospital, Fairlands, Salem, Tamil Nadu 636016',
    phone: ['096555 99666', '9655599666'],
    email: 'info@aakashaquatech.com',
    ll: [11.6643, 78.146],
    embed: '',
  },
  {
    id: 'coimbatore',
    city: 'Coimbatore',
    name: 'Aakash Aqua Tech Pvt Ltd - Coimbatore Branch',
    addr: '18, 2nd Cross Street (East), STV Nagar, Power House, Peelamedu, Coimbatore, Tamil Nadu 641004', // ← confirm
    phone: ['96555 77666', '9655577666'],
    email: 'info@aakashaquatech.com',
    ll: [11.021, 76.995],
    embed: '',
  },
  {
    id: 'dharmapuri',
    city: 'Dharmapuri',
    name: 'Aakash Pure Aqua Tech - Dharmapuri Branch',
    addr: '5/454, Salem Main Road, Opp. Collector Office, Dharmapuri, Tamil Nadu 636705', // ← confirm
    phone: ['96555 77666', '9655577666'],
    email: 'info@aakashaquatech.com',
    ll: [12.1211, 78.1582],
    embed: '',
  },
]
const BY = Object.fromEntries(BRANCHES.map((b) => [b.id, b]))
const TN = [
  [7.9, 76.1],
  [13.7, 80.5],
] /* bounds that frame the whole state */
const frameSrc = (b) => b.embed || `https://www.google.com/maps?q=${b.ll[0]},${b.ll[1]}&z=17&output=embed`
const openSrc = (b) => `https://www.google.com/maps/search/?api=1&query=${b.ll[0]},${b.ll[1]}`

const PinPath = 'M0 0C-8-12-16-18-16-28a16 16 0 1 1 32 0C16-18 8-12 0 0z'
const Pin = () => (
  <svg viewBox="-17 -46 34 48" aria-hidden="true">
    <path d={PinPath} />
    <circle cy="-28" r="6" />
  </svg>
)
const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12h17m-6-6 6 6-6 6" />
  </svg>
)

/* ---------------- Tamil Nadu map ---------------- */
function TnMap({ active, onPick }) {
  const el = useRef(null)
  const map = useRef(null)
  const marks = useRef({})
  const pick = useRef(onPick)
  pick.current = onPick

  useEffect(() => {
    const m = L.map(el.current, { zoomControl: false, scrollWheelZoom: false, minZoom: 6, maxBounds: [[4, 70], [18, 86]] })
    m.fitBounds(TN)
    L.control.zoom({ position: 'bottomright' }).addTo(m)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(m)
    BRANCHES.forEach((b, i) => {
      const icon = L.divIcon({
        className: 'cu-mk',
        iconSize: [34, 48],
        iconAnchor: [17, 48],
        html: `<span class="cu-mk-in" style="--d:${i * 0.4}s"><i class="cu-pulse"></i><svg viewBox="-17 -46 34 48"><path d="${PinPath}"/><circle cy="-28" r="6"/></svg><b>${b.city}</b></span>`,
      })
      marks.current[b.id] = L.marker(b.ll, { icon, title: b.city, keyboard: true, riseOnHover: true })
        .addTo(m)
        .on('click', () => pick.current(b.id))
    })
    /* wheel-zoom only after the visitor clicks the map, so the page can still scroll past it */
    m.on('click', () => m.scrollWheelZoom.enable())
    m.getContainer().addEventListener('mouseleave', () => m.scrollWheelZoom.disable())
    map.current = m
    return () => {
      m.remove()
      map.current = null
      marks.current = {}
    }
  }, [])

  useEffect(() => {
    const m = map.current
    if (!m) return
    Object.entries(marks.current).forEach(([id, mk]) => {
      const e = mk.getElement()
      e && e.classList.toggle('on', id === active)
    })
    if (active) m.flyTo(BY[active].ll, 12, { duration: 1.4 })
    else m.flyToBounds(TN, { duration: 1.2 })
  }, [active])

  return <div ref={el} id="tn-map" className="cu-leaf" role="region" aria-label="Map of Tamil Nadu with our Salem, Coimbatore and Dharmapuri offices" />
}

/* ---------------- floating-label field ---------------- */
function Field({ id, label, error, area, ...p }) {
  return (
    <div className={'cu-f' + (error ? ' bad' : '') + (area ? ' area' : '')}>
      {area ? <textarea id={id} placeholder=" " rows={4} {...p} /> : <input id={id} placeholder=" " {...p} />}
      <label htmlFor={id}>{label}</label>
      <i className="cu-bar" />
      {error && <small role="alert">{error}</small>}
    </div>
  )
}

export default function ContactPage({ onDemo }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', msg: '' })
  const [err, setErr] = useState({})
  const [shake, setShake] = useState(0)
  const [st, setSt] = useState('idle') /* idle | sending | done */
  const [open, setOpen] = useState(null)
  const [seen, setSeen] = useState([]) /* iframes are created on first open only */

  const set = (k) => (e) => {
    const v = k === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value
    setF((s) => ({ ...s, [k]: v }))
    setErr((x) => ({ ...x, [k]: '' }))
  }

  const submit = (e) => {
    e.preventDefault()
    const x = {}
    if (f.name.trim().length < 2) x.name = 'Please enter your name'
    if (!/^[6-9]\d{9}$/.test(f.phone)) x.phone = 'Enter a valid 10-digit mobile number'
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) x.email = 'Enter a valid email address'
    if (f.msg.trim().length < 5) x.msg = 'Tell us a little about what you need'
    setErr(x)
    if (Object.keys(x).length) return setShake((n) => n + 1)
    setSt('sending')
    track('contact_submit', {})
    api('/public/contact', { method: 'POST', body: { first_name: f.name.trim(), mobile: f.phone, email: f.email || undefined, message: f.msg.trim(), company_website: f.hp || '' } })
      .then(() => setSt('done'))
      .catch((x) => {
        setSt('idle')
        setErr({ msg: x.status === 0 || x.status >= 500 ? 'We could not send your message right now. Please call us or use WhatsApp.' : x.friendly || x.message })
      })
  }
  const again = () => {
    setF({ name: '', phone: '', email: '', msg: '' })
    setSt('idle')
  }

  const choose = (id) => {
    setOpen((o) => (o === id ? null : id))
    setSeen((s) => (s.includes(id) ? s : [...s, id]))
  }
  const fromMap = (id) => {
    setOpen(id)
    setSeen((s) => (s.includes(id) ? s : [...s, id]))
    if (window.innerWidth <= 900) {
      const n = document.getElementById('cu-acc-' + id)
      n && n.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const K = (k) => k + (err[k] ? shake : '') /* remount an invalid field so it shakes again */

  return (
    <div className="cu-page">
      <span className="cu-orb" style={{ '--x': '-1%', '--y': '9rem', '--s': '34px', '--t': '7s' }} aria-hidden="true" />
      <span className="cu-orb" style={{ '--x': '96%', '--y': '7rem', '--s': '48px', '--t': '9s' }} aria-hidden="true" />
      <span className="cu-orb" style={{ '--x': '48%', '--y': '34rem', '--s': '24px', '--t': '6s' }} aria-hidden="true" />

      <div className="cu-head">
        <h1>Contact us</h1>
        <p>Visit any of our three offices, call us, or send a message – we reply fast.</p>
        <div className="cu-quick">
          <a href="tel:9655577666">Call {PHONE}</a>
          <a href={WA} target="_blank" rel="noreferrer">
            WhatsApp us
          </a>
          <button type="button" onClick={onDemo}>
            Book a free demo
          </button>
        </div>
      </div>

      <div className="cu-grid">
        <div className="cu-col">
          {/* ---------- form ---------- */}
          <section className="cu-card cu-formcard" aria-labelledby="cu-fh">
            <h2 id="cu-fh">Send us a message</h2>
            {st === 'done' ? (
              <div className="cu-done" role="status">
                <svg viewBox="0 0 60 60" aria-hidden="true">
                  <circle cx="30" cy="30" r="26" />
                  <path d="M18 31l8 8 16-17" />
                </svg>
                <h3>Thank you, {f.name.split(' ')[0]}!</h3>
                <p>Your message is ready in WhatsApp. Our team will get back to you shortly.</p>
                <span className="cu-burst" aria-hidden="true">
                  {Array.from({ length: 12 }, (_, i) => (
                    <i key={i} style={{ '--a': i * 30 + 'deg', '--d': 80 + (i % 3) * 28 + 'px' }} />
                  ))}
                </span>
                <button type="button" className="cu-btn ghost" onClick={again}>
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <Field key={K('name')} id="cu-name" label="Name" value={f.name} onChange={set('name')} error={err.name} autoComplete="name" />
                <div className="cu-two">
                  <Field key={K('phone')} id="cu-phone" label="Phone number" value={f.phone} onChange={set('phone')} error={err.phone} inputMode="numeric" autoComplete="tel" />
                  <Field key={K('email')} id="cu-email" label="Email (optional)" type="email" value={f.email} onChange={set('email')} error={err.email} autoComplete="email" />
                </div>
                <input tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} value={f.hp || ''} onChange={set('hp')} />
                <Field key={K('msg')} id="cu-msg" label="Message" area value={f.msg} onChange={set('msg')} error={err.msg} />
                <button className={'cu-btn' + (st === 'sending' ? ' busy' : '')} type="submit" disabled={st === 'sending'}>
                  {st === 'sending' ? (
                    <>
                      <span className="cu-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      Send message <Arrow />
                    </>
                  )}
                </button>
              </form>
            )}
          </section>

          {/* ---------- office accordion ---------- */}
          <section className="cu-card cu-offices" aria-labelledby="cu-oh">
            <h2 id="cu-oh">Office address</h2>
            {BRANCHES.map((b) => {
              const on = open === b.id
              return (
                <div className={'cu-acc' + (on ? ' on' : '')} id={'cu-acc-' + b.id} key={b.id}>
                  <button type="button" className="cu-acc-h" aria-expanded={on} aria-controls={'cu-pn-' + b.id} onClick={() => choose(b.id)}>
                    <span className="cu-ico">
                      <Pin />
                    </span>
                    <span className="cu-nm">{b.name}</span>
                    <i className="cu-pm" aria-hidden="true" />
                  </button>
                  <div className="cu-acc-b" id={'cu-pn-' + b.id} role="region">
                    <div className="cu-acc-in">
                      <address>{b.addr}</address>
                      <p className="cu-lines">
                        <a href={'tel:' + b.phone[1]}>{b.phone[0]}</a>
                        <a href={'mailto:' + b.email}>{b.email}</a>
                      </p>
                      <a className="cu-btn ghost sm" href={openSrc(b)} target="_blank" rel="noreferrer">
                        Open {b.city} in Maps <Arrow />
                      </a>
                      <div className="cu-frame">
                        {seen.includes(b.id) && (
                          <iframe
                            title={'Map of ' + b.name}
                            src={frameSrc(b)}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            allowFullScreen
                            onLoad={(e) => e.currentTarget.classList.add('ok')}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </section>
        </div>

        {/* ---------- Tamil Nadu map ---------- */}
        <aside className="cu-col cu-mapcol">
          <section className="cu-card cu-mapcard" aria-labelledby="cu-mh">
            <h2 id="cu-mh">Location map</h2>
            <div className="cu-mapbox">
              <TnMap active={open} onPick={fromMap} />
              <div className="cu-note">
                <b>Tamil Nadu</b>
                <span>Tap a pin to see the exact office</span>
              </div>
            </div>
            <div className="cu-chips">
              {BRANCHES.map((b) => (
                <button type="button" key={b.id} className={open === b.id ? 'on' : ''} onClick={() => fromMap(b.id)}>
                  {b.city}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
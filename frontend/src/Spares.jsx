/* Spares page: option list on the left, glass product cards on the right.
   Classes are prefixed sps- so nothing clashes with the other pages. */
import { Fragment, useRef, useState } from 'react'
import { WA, inr } from './data.js'
import { mrpFor } from './pricing.js'
import { spareTabs, spares } from './sparesData.js'

const price = (p) => (p.price == null ? 'Price on request' : inr(p.price) + (p.max ? ' – ' + inr(p.max) : ''))

const Heart = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
    <path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 8 3.5 4.8 6.8 4.8c2 0 3.5 1.1 5.2 3 1.7-1.9 3.2-3 5.2-3 3.3 0 5.2 3.2 4 6.4-1.7 4.7-9.2 9.3-9.2 9.3z" />
  </svg>
)

/* Splits a label into words + letters so every letter can ripple like a wave (CSS: .sps-w / .sps-ch) */
const Label = ({ text }) => {
  let c = 0
  return (
    <span className="sps-lbl" aria-hidden="true">
      {text.split(' ').map((w, wi) => (
        <Fragment key={wi}>
          <span className="sps-w">
            {[...w].map((ch, ci) => (
              <span className="sps-ch" style={{ '--c': c++ }} key={ci}>
                {ch}
              </span>
            ))}
          </span>{' '}
        </Fragment>
      ))}
    </span>
  )
}

export default function Spares({ addCart }) {
  const [tab, setTab] = useState(spareTabs[0][0])
  const [liked, setLiked] = useState({})
  const [rip, setRip] = useState(null)
  const tabsRef = useRef(null)
  const list = spares.filter((s) => s.cat === tab)

  const pick = (e, k, idx) => {
    const r = e.currentTarget.getBoundingClientRect()
    setRip({
      k,
      id: Date.now(),
      x: e.detail ? e.clientX - r.left : r.width / 2,
      y: e.detail ? e.clientY - r.top : r.height / 2,
    })

    // splash: every option jolts sideways, the farther from the clicked one the later (a wave runs through the list)
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (k !== tab && !reduce && tabsRef.current) {
      const vertical = window.matchMedia('(max-width: 900px)').matches
      ;[...tabsRef.current.children].forEach((el, j) => {
        if (!el.animate) return
        const d = Math.abs(j - idx)
        const amp = Math.max(6, 20 - d * 2)
        el.animate(
          vertical
            ? [{ transform: 'translateY(0)' }, { transform: `translateY(${-amp}px)`, offset: 0.35 }, { transform: `translateY(${amp / 2}px)`, offset: 0.65 }, { transform: 'none' }]
            : [{ transform: 'translateX(0) skewX(0)' }, { transform: `translateX(${amp}px) skewX(-5deg)`, offset: 0.3 }, { transform: `translateX(${-amp / 2}px) skewX(3deg)`, offset: 0.62 }, { transform: 'none' }],
          { duration: 800, delay: d * 60, easing: 'cubic-bezier(.2,.8,.3,1)' }
        )
      })
    }
    setTab(k)
  }

  return (
    <div className="sp-page sps">
      <div className="sp-head">
        <h1>Spares</h1>
        <div className="sp-crumb">
          <a href="/">Home</a> › <span>Spares</span>
        </div>
      </div>

      <div className="sps-layout">
        {/* LEFT: option list – the rows themselves move as a wave */}
        <aside className="sps-side" aria-label="Spare categories">
          <div className="sps-tabs" ref={tabsRef}>
            {spareTabs.map(([k, t], i) => (
              <button
                key={k}
                type="button"
                style={{ '--i': i }}
                className={'sps-tab' + (tab === k ? ' on' : '')}
                aria-label={t}
                aria-pressed={tab === k}
                onClick={(e) => pick(e, k, i)}
              >
                <i className="sps-dot" aria-hidden="true" />
                <Label text={t} />
                <em className="sps-shine" aria-hidden="true" />
                {rip && rip.k === k && (
                  <span key={rip.id} className="sps-rip" style={{ left: rip.x, top: rip.y }} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* RIGHT: product cards */}
        <section className="sps-stage" aria-live="polite">
          <div className="sps-grid" key={tab}>
            {list.map((p) => (
              <article className="sps-card" key={p.name}>
                <span className="sps-tag">Spares</span>
                <button
                  type="button"
                  className={'sps-heart' + (liked[p.name] ? ' on' : '')}
                  aria-label="Save"
                  aria-pressed={!!liked[p.name]}
                  onClick={() => setLiked((l) => ({ ...l, [p.name]: !l[p.name] }))}
                >
                  <Heart />
                </button>

                <a className="sps-circle" href={'/spare-product/' + p.slug} aria-label={'View ' + p.name}>
                  <img src={p.img} alt={p.name} loading="lazy" />
                </a>

                <div className="sps-info">
                  <h3>
                    <a href={'/spare-product/' + p.slug}>{p.name}</a>
                  </h3>
                  <p>Olivar · RO purifier spare</p>
                  <div className="sps-row">
                    <span className="sps-pr">
                      {p.price != null && mrpFor(p.name, p.price) > 0 && <s>{inr(mrpFor(p.name, p.price))}</s>}
                      <b>{price(p)}</b>
                    </span>
                    {p.price == null ? (
                      <a
                        className="sps-add"
                        href={`${WA}?text=${encodeURIComponent('Enquiry: ' + p.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={'Enquire about ' + p.name}
                      >
                        ?
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="sps-add"
                        disabled={p.oos}
                        onClick={() => addCart({ id: 'sp-' + p.name, name: p.name, img: p.img, price: p.price, mrp: mrpFor(p.name, p.price) })}
                        aria-label={'Add ' + p.name + ' to cart'}
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
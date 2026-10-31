import { useEffect, useRef, useState } from 'react'

/* ---------------------------------------------------------------------------
   Extra copy for each product (same order as PRODUCTS in App.jsx).
   badge = label on the card, short = 1-line card text, sub = bold line in the scroll section.
   Edit freely – nothing else needs to change.
--------------------------------------------------------------------------- */
export const PRODUCT_EXTRA = [
  {
    badge: 'Best Seller',
    sub: 'RO + UV + UF + Live TDS',
    short: 'RO + UV + UF with Live TDS display and Alkaline & Copper technology.',
  },
  {
    badge: 'Popular',
    sub: 'Safe from bacteria & viruses',
    short: 'UV + UF purification with storage that removes bacteria, viruses and cysts.',
  },
  {
    badge: 'No Electricity',
    sub: 'Works without power',
    short: 'Non-electric purifier that removes suspended impurities, bacteria and cysts.',
  },
  {
    badge: 'New',
    sub: 'No salt · No electricity',
    short: 'Maintenance-free conditioning that reduces scale from hard water.',
  },
  {
    badge: 'Trusted',
    sub: 'BIS licensed range',
    short: 'BIS-licensed stainless-steel dispensers used at airports and ISRO centres.',
  },
  {
    badge: 'Trending',
    sub: 'pH up to 9.5',
    short: 'Turns regular water into mineral-rich alkaline water, pH up to 9.5.',
  },
  {
    badge: 'Space Saver',
    sub: 'Hidden under your sink',
    short: 'RO, UV and UF hidden under the sink with a dedicated faucet.',
  },
]

const ICONS = [
  <path key="a" d="M12 2.7c-3.5 4.5-6 7.4-6 10.6a6 6 0 0 0 12 0c0-3.2-2.5-6.1-6-10.6z" />,
  <path
    key="b"
    d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
  />,
  <path
    key="c"
    d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
  />,
  <path key="d" d="M13 2 4 14h7l-1 8 9-12h-7z" />,
]
const Icon = ({ i }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {ICONS[i % ICONS.length]}
  </svg>
)
const Arrow = ({ flip }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
)

/* =====================================================================
   1) FEATURED PRODUCTS  – cream cards, big centre card, arrows + dots
===================================================================== */
export function FeaturedProducts({ items }) {
  const n = items.length
  const half = Math.floor(n / 2)
  const [a, setA] = useState(Math.min(2, n - 1))
  const [liked, setLiked] = useState({})
  const sx = useRef(null)
  const go = (d) => setA((v) => (v + d + n) % n)

  return (
    <section className="wrap fp rv" aria-label="Featured products">
      <header className="fp-head">
        <span>Our Collection</span>
        <h2>Featured Products</h2>
        <p>Explore our most popular water purifiers and systems loved by customers.</p>
      </header>

      <div
        className="fp-stage"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') go(-1)
          if (e.key === 'ArrowRight') go(1)
        }}
        onPointerDown={(e) => {
          sx.current = e.clientX
        }}
        onPointerUp={(e) => {
          if (sx.current == null) return
          const dx = e.clientX - sx.current
          sx.current = null
          if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1)
        }}
      >
        <button className="fp-arr l" aria-label="Previous product" onClick={() => go(-1)}>
          <Arrow flip />
        </button>

        {items.map((it, i) => {
          const o = ((i - a + n + half) % n) - half
          const ab = Math.abs(o)
          return (
            <article
              key={it.title}
              className={'fp-card' + (o === 0 ? ' on' : '')}
              style={{ '--o': o, '--s': o === 0 ? 1.06 : ab === 1 ? 0.92 : 0.8, zIndex: 10 - ab }}
              data-far={ab > 2 ? '' : undefined}
              data-far1={ab > 1 ? '' : undefined}
              aria-hidden={ab > 2}
              onClick={() => o !== 0 && setA(i)}
            >
              <div className="fp-top">
                <span className="fp-badge">{it.badge}</span>
                <button
                  className={'fp-heart' + (liked[i] ? ' on' : '')}
                  aria-label="Save to favourites"
                  aria-pressed={!!liked[i]}
                  onClick={(e) => {
                    e.stopPropagation()
                    setLiked({ ...liked, [i]: !liked[i] })
                  }}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />
                  </svg>
                </button>
              </div>
              <div className="fp-img">
                <img src={it.img} alt={it.title} loading="lazy" draggable="false" />
              </div>
              <h3>{it.title}</h3>
              <p>{it.short}</p>
              <div className="fp-meta">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m5 12 5 5L20 7" />
                </svg>
                Free installation · 1 year warranty
              </div>
              <div className="fp-foot">
                <span>Free water test</span>
                <a className="fp-cta" href={it.href} tabIndex={o === 0 ? 0 : -1}>
                  Shop Now
                </a>
              </div>
            </article>
          )
        })}

        <button className="fp-arr r" aria-label="Next product" onClick={() => go(1)}>
          <Arrow />
        </button>
      </div>

      <div className="fp-dots" role="tablist" aria-label="Choose product">
        {items.map((it, i) => (
          <button
            key={it.title}
            role="tab"
            aria-selected={i === a}
            aria-label={it.title}
            className={i === a ? 'on' : ''}
            onClick={() => setA(i)}
          />
        ))}
      </div>
    </section>
  )
}

/* =====================================================================
   2) SCROLL SHOWCASE – same motion as the reference video
   2 rows on screen. The TOP slot is always  [ text | product ]  and the BOTTOM slot is always  [ product | text ].
   Every scroll step moves the list up by ONE product AND swaps its sides (criss-cross):
     • top row    : leaves upward, product goes right -> left, text goes left -> right
     • bottom row : moves up into the top slot, product goes left -> right, text goes right -> left
     • next row   : rises from below into the bottom slot (product from right -> left)
   All products keep the SAME size the whole time (no grow / shrink) – only position + fade change.
   Scrolling back plays the very same motion in reverse.
===================================================================== */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const win = (q, a, b) => clamp((q - a) / (b - a))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const STEP_SECONDS = 0.95 // length of one page change
// which side the product is on for a (fractional) slot: even slot (0,2..) = right (1), odd slot (1,3..) = left (0)
const side = (sl) => {
  const t = ((sl % 2) + 2) % 2
  return 1 - (t <= 1 ? t : 2 - t)
}

export function ProductScroll({ items }) {
  const sec = useRef(null)
  const stage = useRef(null)
  const count = useRef(null)
  const n = items.length

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sec.current.classList.add('static')
      return
    }
    const rows = [...stage.current.querySelectorAll('.ps-row')]
    const prods = rows.map((r) => r.querySelector('.ps-prod'))
    const txts = rows.map((r) => r.querySelector('.ps-txt'))
    let vis = 2,
      cross = true,
      rowH = 0,
      W = 0,
      top = 84,
      perStep = 0
    let P = [0],
      S = 0 // P = first visible row of every page, S = number of page changes
    let u = 0,
      lastU = -1,
      raf = 0,
      on = false,
      last = 0

    const measure = () => {
      vis = window.innerWidth < 860 ? 1 : 2
      cross = vis === 2 // phone layout (1 row, product above text): no side swap
      const sh = stage.current.clientHeight
      W = stage.current.clientWidth
      top = parseFloat(getComputedStyle(stage.current).top) || 0
      rowH = sh / vis
      P = []
      for (let x = 0; x <= Math.max(0, n - vis); x++) P.push(x) // every scroll step moves up by ONE product
      S = P.length - 1
      perStep = sh * 0.8 // page-scroll needed for one page change
      rows.forEach((r) => {
        r.style.height = rowH + 'px'
      })
      sec.current.style.height = sh + Math.max(S, 1) * perStep + 'px'
      lastU = -1
    }

    const render = (uu) => {
      const k = S ? Math.min(Math.floor(uu), S - 1) : 0
      const q = S ? uu - k : 0
      const a = P[k],
        b = S ? P[k + 1] : P[k]
      rows.forEach((r, i) => {
        const sa = i - a,
          sb = i - b // row slot before / after this page change
        const inA = sa >= 0 && sa <= vis - 1
        const inB = sb >= 0 && sb <= vis - 1
        let slot = sa,
          op = 0,
          blur = 0
        if (inA && inB) {
          // stays on screen – moves up one slot
          slot = sa + (sb - sa) * ease(win(q, 0.1, 0.9))
          op = 1
        } else if (inA) {
          // leaves upward
          const d0 = 0.08 * sa
          const e = ease(win(q, d0, 0.65 + d0))
          slot = sa + (sb - sa) * e
          op = 1 - e
          blur = e * 8
        } else if (inB) {
          // enters from below (same size, just rises + fades in)
          const e = ease(win(q, 0.15 + 0.14 * (sb - (vis - 1)), 1))
          const s0 = sb + 1 // starts just below the stage
          slot = s0 + (sb - s0) * e
          op = clamp(e * 1.8)
          blur = (1 - e) * 6
        }
        /* CRISS-CROSS: side of the product follows the row's slot, so every upward move also swaps the sides */
        const baseRight = i % 2 // side the row is drawn on by CSS (.flip = product right)
        const sd = cross ? side(slot) : baseRight // 1 = product right, 0 = product left
        const d = sd - baseRight // how far to shift from the CSS position
        const meet = cross ? 1 - Math.abs(sd * 2 - 1) : 0 // 1 when product and text pass each other in the middle
        r.style.transform = `translate3d(0,${slot * rowH}px,0)`
        r.style.opacity = op
        r.style.visibility = op < 0.01 ? 'hidden' : 'visible'
        r.style.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none'
        r.style.pointerEvents = op > 0.9 ? 'auto' : 'none'
        prods[i].style.transform = `translate3d(${d * 0.46 * W}px,0,0)` // product: 5% <-> 51% of the stage
        txts[i].style.transform = `translate3d(${-d * 0.42 * W}px,0,0)` // text:    53% <-> 11% of the stage
        txts[i].style.opacity = 1 - 0.8 * meet * meet // text dims while the two cross
      })
      if (count.current)
        count.current.textContent = String(
          Math.min(n, Math.round(((P[k] + (b - P[k]) * q) / Math.max(1, n - vis)) * (n - 1)) + 1),
        ).padStart(2, '0')
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000 || 0)
      last = now
      const p = clamp((top - sec.current.getBoundingClientRect().top) / (Math.max(S, 1) * perStep))
      const T = S ? Math.round(p * S) : 0 // page we should be showing
      const speed = (1 + 0.6 * Math.max(0, Math.abs(T - u) - 1)) / STEP_SECONDS
      if (u < T) u = Math.min(T, u + speed * dt)
      else if (u > T) u = Math.max(T, u - speed * dt)
      if (u !== lastU) {
        lastU = u
        render(u)
      }
    }

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !on) {
          on = true
          last = performance.now()
          raf = requestAnimationFrame(frame)
        }
        if (!e.isIntersecting && on) {
          on = false
          cancelAnimationFrame(raf)
        }
      },
      { rootMargin: '200px 0px' },
    )
    io.observe(sec.current)
    measure()
    render(0)
    window.addEventListener('resize', measure)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [n])

  return (
    <section className="ps" ref={sec} aria-label="Product highlights">
      <div className="ps-stage" ref={stage}>
        <span className="ps-count">
          <b ref={count}>01</b> / {String(n).padStart(2, '0')}
        </span>
        {items.map((it, i) => (
          <div key={it.title} className={'ps-row' + (i % 2 ? ' flip' : '')}>
            <div className="ps-prod">
              <img src={it.img} alt={it.title} loading="lazy" draggable="false" />
            </div>
            <div className="ps-txt">
              <h3>
                <Icon i={i} />
                {it.title}
              </h3>
              <b>{it.sub}</b>
              <p>{it.desc}</p>
              <a href={it.href}>
                {it.btn || 'Shop now'} <Arrow />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
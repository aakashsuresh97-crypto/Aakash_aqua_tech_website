/* =====================================================================
   BLOG PAGE  (/blog)  – opens inside the app, same sandal-cream theme as Home / About.
   Content = https://aakashaquatech.in/blog/  ("My Blogs" + the 6 posts, wording unchanged), see blogData.js.
   Only the look is new: animated hero, cursor-lit cards, scroll reveal.  Styles: blog.css
===================================================================== */
import { useEffect, useRef } from 'react'
import { BLOG_POSTS, BLOG_BRAND, postHref } from './blogData.js'
import { wipeNav } from './blogNav.js'
import { Icon } from './blogIcons.jsx'
import './blog.css'

function Card({ p, n }) {
  const ref = useRef(null)
  const href = postHref(p) /* in-app page when the post has a body, else the live site */
  const go = (e) => wipeNav(e, href)
  /* cursor-lit spotlight + soft 3D tilt (mouse only) */
  const move = (e) => {
    if (e.pointerType !== 'mouse') return
    const el = ref.current
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    el.style.setProperty('--mx', x + 'px')
    el.style.setProperty('--my', y + 'px')
    el.style.setProperty('--rx', ((y / r.height - 0.5) * -5).toFixed(2) + 'deg')
    el.style.setProperty('--ry', ((x / r.width - 0.5) * 5).toFixed(2) + 'deg')
  }
  const leave = () => ['--rx', '--ry'].forEach((v) => ref.current.style.setProperty(v, '0deg'))

  return (
    <li className="bl-item" style={{ '--d': n % 3 }}>
      <article className="bl-card" ref={ref} onPointerMove={move} onPointerLeave={leave}>
        <span className="bl-no" aria-hidden="true">
          {String(n + 1).padStart(2, '0')}
        </span>
        <span className="bl-ico">
          <Icon k={p.icon} />
        </span>
        <div className="bl-meta">
          <time className="bl-date" dateTime={p.iso}>
            <Icon k="cal" />
            {p.date}
          </time>
          <span className="bl-cm">
            <Icon k="chat" />
            No Comments
          </span>
        </div>
        <h3 className="bl-h">
          <a href={href} onClick={go}>
            {p.title} <span className="bl-brand">| {BLOG_BRAND}</span>
          </a>
        </h3>
        <p className="bl-ex">{p.excerpt}</p>
        <div className="bl-foot">
          <a className="bl-more" href={href} onClick={go} aria-label={`Read more: ${p.title}`}>
            Read More{' '}
            <span className="bl-raq" aria-hidden="true">
              »
            </span>
          </a>
        </div>
        <i className="bl-bb b1" aria-hidden="true" />
        <i className="bl-bb b2" aria-hidden="true" />
        <i className="bl-bb b3" aria-hidden="true" />
      </article>
    </li>
  )
}

export default function BlogPage() {
  const root = useRef(null)

  useEffect(() => {
    const el = root.current
    /* scroll reveal (own observer, because this page is lazy-loaded) */
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    el.querySelectorAll('.bl-item').forEach((i) => io.observe(i))
    /* gentle parallax for the hero art */
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        el.style.setProperty('--sy', Math.min(window.scrollY, 900))
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="bl" ref={root}>
      {/* ---------------------------------------------------------- HERO */}
      <section className="bl-hero">
        <span className="bl-blob a" aria-hidden="true" />
        <span className="bl-blob b" aria-hidden="true" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <span key={i} className={'bl-bub q' + i} aria-hidden="true" />
        ))}

        <div className="bl-hero-in">
          <div className="bl-copy">
            <nav className="bl-crumb" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => wipeNav(e, '/')}>
                Home
              </a>
              <i>/</i>
              <span aria-current="page">Blog</span>
            </nav>
            <span className="bl-badge">
              <i />
              Aakash Pure Aqua Tech
            </span>
            <h1 className="bl-title">
              <span className="bl-w">
                <span>My</span>
              </span>{' '}
              <span className="bl-w bl-em">
                <span className="bl-grad">Blogs</span>
                <svg className="bl-squig" viewBox="0 0 180 14" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3 8 Q 24 0 45 8 T 90 8 T 135 8 T 177 8" pathLength="1" />
                </svg>
              </span>
            </h1>
          </div>

          <div className="bl-art" aria-hidden="true">
            <span className="bl-ring r1" />
            <span className="bl-ring r2" />
            <span className="bl-ring r3" />
            <span className="bl-orbit">
              <i />
            </span>
            <div className="bl-orb">
              <svg viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="blDropG" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#0b3f66" />
                    <stop offset="1" stopColor="#0d8d97" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"
                  fill="url(#blDropG)"
                />
                <path d="M8.6 15.2a3.4 3.4 0 0 0 3 3.2" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* animated sand waves along the bottom edge */}
        <div className="bl-waves" aria-hidden="true">
          <svg viewBox="0 0 2880 120" preserveAspectRatio="none" className="w1">
            <path d="M0 60 C240 0 480 0 720 60 S1200 120 1440 60 C1680 0 1920 0 2160 60 S2640 120 2880 60 V120 H0Z" />
          </svg>
          <svg viewBox="0 0 2880 120" preserveAspectRatio="none" className="w2">
            <path d="M0 60 C240 0 480 0 720 60 S1200 120 1440 60 C1680 0 1920 0 2160 60 S2640 120 2880 60 V120 H0Z" />
          </svg>
        </div>
      </section>

      {/* ---------------------------------------------------------- POSTS */}
      <section className="bl-list" aria-label="Blog posts">
        <ul className="bl-grid">
          {BLOG_POSTS.map((p, i) => (
            <Card key={p.url} p={p} n={i} />
          ))}
        </ul>
      </section>
    </div>
  )
}

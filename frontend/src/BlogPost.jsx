/* =====================================================================
   BLOG POST PAGE  (/benefits-of-amc-for-ro-water-purifier-maintenance, and any post in blogData.js that has a `body`)
   Same sandal-cream theme + animations as /blog.  Styles: blog.css (bp-* classes, scoped under .bl)
===================================================================== */
import { Fragment, useEffect, useRef } from 'react'
import { BLOG_POSTS, BLOG_BRAND, findPost, postHref } from './blogData.js'
import { wipeNav } from './blogNav.js'
import { Icon } from './blogIcons.jsx'
import './blog.css'

export default function BlogPost({ path, onDemo }) {
  const post = findPost(path)
  const root = useRef(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    /* scroll reveal for each section */
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    el.querySelectorAll('.bp-rv').forEach((i) => io.observe(i))
    /* reading-progress bar */
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const a = el.querySelector('.bp-art')
        if (!a) return
        const r = a.getBoundingClientRect()
        const p = Math.min(1, Math.max(0, (window.innerHeight * 0.4 - r.top) / (r.height || 1)))
        el.style.setProperty('--read', p.toFixed(3))
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [path])

  if (!post) return null
  const { body } = post
  /* "more" = the next 3 posts after this one (wraps around), so every post links to different neighbours */
  const at = BLOG_POSTS.indexOf(post)
  const more = [1, 2, 3].map((k) => BLOG_POSTS[(at + k) % BLOG_POSTS.length])

  return (
    <div className="bl bp" ref={root}>
      <span className="bp-read" aria-hidden="true" />

      {/* ---------------------------------------------------------- HERO */}
      <section className="bl-hero bp-hero">
        <span className="bl-blob a" aria-hidden="true" />
        <span className="bl-blob b" aria-hidden="true" />
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={'bl-bub q' + i} aria-hidden="true" />
        ))}
        <div className="bp-hero-in">
          <div className="bp-copy">
            <nav className="bl-crumb" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => wipeNav(e, '/')}>
                Home
              </a>
              <i>/</i>
              <a href="/blog" onClick={(e) => wipeNav(e, '/blog')}>
                Blog
              </a>
              <i>/</i>
              <span aria-current="page">{post.title}</span>
            </nav>
            <span className="bl-badge">
              <i />
              {post.date}
            </span>
            <h1 className="bp-title" aria-label={`${post.title} | ${BLOG_BRAND}`}>
              {post.title.split(' ').map((w, i) => (
                <Fragment key={i}>
                  <span className="bp-w" aria-hidden="true">
                    <span style={{ '--i': i }}>{w}</span>
                  </span>{' '}
                </Fragment>
              ))}
              <span className="bl-brand" aria-hidden="true">
                | {BLOG_BRAND}
              </span>
            </h1>
            <p className="bp-lead">{body.lead}</p>
          </div>

          <div className="bl-art bp-art-hero" aria-hidden="true">
            <span className="bl-ring r1" />
            <span className="bl-ring r2" />
            <span className="bl-ring r3" />
            <span className="bl-orbit">
              <i />
            </span>
            <div className="bl-orb bp-orb">
              <Icon k={post.icon} />
            </div>
          </div>
        </div>
        <div className="bl-waves" aria-hidden="true">
          <svg viewBox="0 0 2880 120" preserveAspectRatio="none" className="w1">
            <path d="M0 60 C240 0 480 0 720 60 S1200 120 1440 60 C1680 0 1920 0 2160 60 S2640 120 2880 60 V120 H0Z" />
          </svg>
          <svg viewBox="0 0 2880 120" preserveAspectRatio="none" className="w2">
            <path d="M0 60 C240 0 480 0 720 60 S1200 120 1440 60 C1680 0 1920 0 2160 60 S2640 120 2880 60 V120 H0Z" />
          </svg>
        </div>
      </section>

      {/* ---------------------------------------------------------- ARTICLE */}
      <article className="bp-art">
        {post.image && (
          <figure className="bp-fig bp-rv">
            <img src={post.image} alt={post.title} width="1024" height="538" loading="eager" />
          </figure>
        )}

        {body.sections.map((s, i) => (
          <section key={s.h} className={'bp-sec bp-rv ' + (i % 2 ? 'r' : 'l')}>
            <span className="bp-n" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h2>{s.h}</h2>
            {s.p &&
              s.p.map((t) => (
                <p key={t}>{t}</p>
              ))}
            {s.list && (
              <div className="bp-lw">
                {s.listTitle && <h3 className="bp-lt">{s.listTitle}</h3>}
                <ul className="bp-list">
                  {s.list.map((t, k) => (
                    <li key={t} style={{ '--k': k }}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m7.5 12.5 3 3 6-7" pathLength="1" />
                      </svg>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}

        {body.closing && (
          <blockquote className="bp-quote bp-rv">
            <span aria-hidden="true">“</span>
            {body.closing}
          </blockquote>
        )}

        {/* call-to-action card */}
        <aside className="bp-cta bp-rv">
          {[1, 2, 3, 4, 5].map((n) => (
            <i key={n} className={'bp-cb c' + n} aria-hidden="true" />
          ))}
          <h2>{body.cta.h}</h2>
          <ul>
            {body.cta.list.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="bp-btns">
            <a className="bp-btn" href="/contact" onClick={(e) => wipeNav(e, '/contact')}>
              Contact Us <span aria-hidden="true">»</span>
            </a>
            <a className="bp-btn alt" href="/shop/domestic/ro" onClick={(e) => wipeNav(e, '/shop/domestic/ro')}>
              Domestic RO Purifiers <span aria-hidden="true">»</span>
            </a>
            {onDemo && (
              <button type="button" className="bp-btn alt" onClick={onDemo}>
                Book a Demo <span aria-hidden="true">»</span>
              </button>
            )}
          </div>
        </aside>

        <a className="bp-back" href="/blog" onClick={(e) => wipeNav(e, '/blog')}>
          <span aria-hidden="true">«</span> Back to all blogs
        </a>
      </article>

      {/* ---------------------------------------------------------- MORE POSTS */}
      <section className="bp-more" aria-label="More blog posts">
        <h2 className="bp-rv">More from our blog</h2>
        <ul>
          {more.map((p, i) => {
            const h = postHref(p)
            return (
              <li key={p.url} className="bp-rv" style={{ '--d': i }}>
                <a href={h} onClick={(e) => wipeNav(e, h)}>
                  <time dateTime={p.iso}>{p.date}</time>
                  <strong>{p.title}</strong>
                  <span className="bl-raq" aria-hidden="true">
                    »
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

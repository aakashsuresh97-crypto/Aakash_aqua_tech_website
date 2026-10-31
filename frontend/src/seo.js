/* Per-page SEO: <title>, meta description, canonical, Open Graph, robots and JSON-LD (breadcrumbs, product, FAQ, list). */
import { useEffect } from 'react'
import { cats, groups, brandInfo, products, blocks, hrefOf, u } from './data.js'
import { BLOG_POSTS, findPost } from './blogData.js'

export const SITE = (import.meta.env?.VITE_SITE_URL || 'https://aakashaquatech.in').replace(/\/$/, '')
const NAME = 'Aakash Pure Aqua Tech Pvt Ltd'
const LOGO = u('2026/07/IMG_5770-1003x1024.png')
const abs = (p) => (p.startsWith('http') ? p : SITE + p)
const clip = (t, n = 158) => (t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…')

const setTag = (selector, create, attrs) => {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement(create)
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
}
const meta = (key, content, attr = 'name') => setTag(`meta[${attr}="${key}"]`, 'meta', { [attr]: key, content })

const crumbs = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
})

/* Build everything the head needs for the current route. */
export const buildSeo = ({ route, path, cat, brand, group, slug, faq }) => {
  let title = `${NAME} | RO Water Purifier Dealer in Salem, Coimbatore & Dharmapuri`
  let description =
    'No.1 multi-brand RO water purifier store in Salem since 2004. Kent, A.O. Smith, ZeroB, Aquaguard and more with free installation, easy EMI and 24 hours service.'
  let image = LOGO
  let robots = 'index,follow,max-image-preview:large'
  const ld = []

  if (route === 'home') {
    if (faq?.length)
      ld.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(([q, a]) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      })
  } else if (route === 'about') {
    title = `About Us | ${NAME}, Salem`
    description =
      'An RO expert with over 35 years of experience in water and waste water treatment. Head office in Salem (2004) with branches at Coimbatore and Dharmapuri.'
    ld.push(
      crumbs([
        ['Home', '/'],
        ['About us', '/about'],
      ]),
    )
  } else if (route === 'contact') {
    title = `Contact Us & Book a Free Demo | ${NAME}`
    description =
      'Call 96555 77666 or email ceo@aakashaquatech.in. Visit us at Brindavan Road, Fairlands, Salem 636016 or book a free water test and demo.'
    ld.push(
      crumbs([
        ['Home', '/'],
        ['Contact us', '/contact'],
      ]),
    )
  } else if (route === 'service') {
    title = `Water Treatment Services & Water Analysis Lab | ${NAME}`
    description =
      'Customized drinking, domestic, commercial and industrial water treatment plants from 150 to 25000+ LPH, plus water analysis laboratory services in Salem.'
    ld.push(
      crumbs([
        ['Home', '/'],
        ['Service', '/service'],
      ]),
    )
  } else if (route === 'zones') {
    title = `Zones We Serve – Salem, Coimbatore, Chennai & more | ${NAME}`
    description =
      'RO and water treatment for apartments, hotels, hospitals, schools, malls, factories and homes across Salem, Coimbatore, Dharmapuri, Chennai, Namakkal and Erode.'
    ld.push(
      crumbs([
        ['Home', '/'],
        ['Zones we serve', '/zones-we-serve'],
      ]),
    )
  } else if (route === 'testimonials') {
    title = `Customer Testimonials – What Our Customers Say | ${NAME}`
    description =
      'Read what homes, hotels, hospitals and businesses say about Aakash Pure Aqua Tech RO water purifiers, installation and service in Salem, Coimbatore and Dharmapuri.'
    ld.push(
      crumbs([
        ['Home', '/'],
        ['Testimonials', '/testimonials'],
      ]),
    )
  } else if (route === 'privacy') {
    title = `Privacy Policy | ${NAME}`
    description =
      'Privacy Policy of Aakash Pure Aqua Tech Pvt Ltd: how we protect the personal information of visitors to our website.'
    ld.push(
      crumbs([
        ['Home', '/'],
        ['Privacy Policy', '/privacy-policy'],
      ]),
    )
       } else if (route === 'terms') {
     title = `Terms & Conditions | ${NAME}`
     description =
       'Terms and Conditions of Aakash Aqua Tech Private Limited: user agreement, applicable law, site access, product descriptions, risk of loss, disclaimer and liability.'
     ld.push(
       crumbs([
         ['Home', '/'],
         ['Terms & Conditions', '/terms-and-conditions'],
       ]),
     )
        } else if (route === 'disclaimer') {
     title = `Disclaimer | ${NAME}`
     description =
       'Disclaimer of Aakash Aqua Tech Private Limited: the website and its content are provided on an "as is" and "as available" basis.'
     ld.push(
       crumbs([
         ['Home', '/'],
         ['Disclaimer', '/disclaimer'],
       ]),
     )
        } else if (route === 'shipping') {
     title = `Shipping and Cancellation Policy | ${NAME}`
     description =
       'Shipping and Cancellation Policy of Aakash Aqua Tech Private Limited: delivery, cancellation requests, damaged or incorrect items and refund timeline.'
     ld.push(
       crumbs([
         ['Home', '/'],
         ['Shipping and Cancellation', '/shipping-and-cancellation'],
       ]),
     )
  } 
  else if (route === 'blog') {
    title = `Blog – RO Water Purifier Tips & Guides | ${NAME}`
    description =
      'Blog by Aakash Pure Aqua Tech: AMC benefits, why TDS matters, RO vs UV vs UF, signs your RO filter needs replacement, how often to service your purifier and tips to prevent waterborne diseases.'
    ld.push(
      crumbs([
        ['Home', '/'],
        ['Blog', '/blog'],
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: BLOG_POSTS.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: p.url, name: p.title })),
      },
    )
  } else if (route === 'post' && findPost(path)) {
    const bp = findPost(path)
    title = `${bp.title} | Aakash Water Purifier`
    description = clip(bp.excerpt)
    if (bp.image) image = bp.image
    ld.push(
      crumbs([
        ['Home', '/'],
        ['Blog', '/blog'],
        [bp.title, path],
      ]),
      { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: bp.title, datePublished: bp.iso, image, description },
    )
  } else if (route === 'shop') {
    const g = group ? groups[group] : null
    const c = cats[cat]
    const bName = brand && brandInfo[brand] ? brandInfo[brand][0] : ''
    title = `${c[0]}${bName ? ' – ' + bName : ''} in Salem | ${NAME}`
    const intro = blocks.find((b) => b[0] === cat)
    const lead = `${bName ? bName + ' ' : ''}${c[0]} at Aakash Pure Aqua Tech, Salem. Free installation, easy EMI, 24 hours service. `
    description = clip(lead + (intro ? intro[2] : 'Genuine brands and expert after-sales support.'))
    if (c[1]) image = u(c[1])
    const trail = [['Home', '/']]
    if (g) trail.push([g.t, '/shop/' + group])
    trail.push([c[0], hrefOf(cat)])
    if (bName) trail.push([bName, hrefOf(cat) + '/' + brand])
    ld.push(crumbs(trail))
    const list = products.filter((p) => p.cat === cat && (!brand || p.brand === brand)).slice(0, 24)
    if (list.length)
      ld.push({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: list.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: abs('/product/' + p.slug),
          name: p.name,
        })),
      })
  } else if (['cart', 'checkout', 'order', 'account'].includes(route)) {
    /* private / transactional pages: never indexed */
    title = `${{ cart: 'Your Cart', checkout: 'Checkout', order: 'Your Order', account: 'My Account' }[route]} | ${NAME}`
    description = 'Your cart, orders and account at Aakash Pure Aqua Tech.'
    robots = 'noindex,nofollow'
  } else if (route === 'product') {
    const p = products.find((x) => x.slug === slug)
    if (!p) {
      title = `Product not found | ${NAME}`
      robots = 'noindex,follow'
    } else {
      title = `${p.name} – Price, Features & Buy Online | ${NAME}`
      description = clip(
        p.summary.toLowerCase().startsWith(p.name.toLowerCase()) ? p.summary : `${p.name}: ${p.summary}`,
      )
      image = p.big || p.img
      ld.push(
        crumbs([
          ['Home', '/'],
          [cats[p.cat][0], hrefOf(p.cat)],
          [p.name, '/product/' + p.slug],
        ]),
      )
      const product = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: p.summary,
        image: [image],
        sku: p.slug,
        ...(p.brand && brandInfo[p.brand] ? { brand: { '@type': 'Brand', name: brandInfo[p.brand][0] } } : {}),
      }
      if (p.price)
        product.offers = {
          '@type': p.max ? 'AggregateOffer' : 'Offer',
          priceCurrency: 'INR',
          ...(p.max ? { lowPrice: p.price, highPrice: p.max } : { price: p.price }),
          availability: 'https://schema.org/InStock',
          url: abs('/product/' + p.slug),
          seller: { '@type': 'Organization', name: NAME },
        }
      ld.push(product)
    }
  } else {
    title = `Page not found | ${NAME}`
    description = 'The page you are looking for could not be found.'
    robots = 'noindex,follow'
  }
  return { title, description, image, robots, canonical: abs(path === '/' ? '/' : path), ld }
}

export const useSeo = (seo) => {
  const key = JSON.stringify([seo.title, seo.canonical, seo.description, seo.image, seo.robots, seo.ld.length])
  useEffect(() => {
    document.title = seo.title
    meta('description', seo.description)
    meta('robots', seo.robots)
    setTag('link[rel="canonical"]', 'link', { rel: 'canonical', href: seo.canonical })
    meta('og:title', seo.title, 'property')
    meta('og:description', seo.description, 'property')
    meta('og:url', seo.canonical, 'property')
    meta('og:image', seo.image, 'property')
    meta('twitter:title', seo.title)
    meta('twitter:description', seo.description)
    meta('twitter:image', seo.image)
    document.head.querySelectorAll('script[data-seo]').forEach((n) => n.remove())
    seo.ld.forEach((obj) => {
      const s = document.createElement('script')
      s.type = 'application/ld+json'
      s.dataset.seo = '1'
      s.textContent = JSON.stringify(obj)
      document.head.appendChild(s)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
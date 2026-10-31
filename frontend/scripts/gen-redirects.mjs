/* Old WordPress URL  ->  new URL map (301). Runs before `npm run build`; writes:
     vercel.json            (keeps the SPA rewrite, replaces "redirects")
     public/_redirects      (Netlify / Cloudflare Pages style)
     deploy/nginx-redirects.conf   (include it inside the nginx server block)
   Add extra lines to EXTRA below when you find more old URLs in Google Search Console. */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { cats, brandInfo, catGroup, hrefOf, products } from '../src/data.js'

const path = (url) => url.replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '') || '/'
const map = new Map()
const add = (from, to) => from && from !== to && !map.has(from) && map.set(from, to)

/* category + brand pages of the old site */
for (const [key, v] of Object.entries(cats)) if (v[2]) add(path(v[2]), hrefOf(key))
for (const [key, v] of Object.entries(brandInfo)) if (v[2]) add(path(v[2]), '/shop/domestic/ro/' + key)
/* WordPress product pages: /product/<slug>/ keeps working because the new URL is the same; nothing to map for those.
   Typical WordPress leftovers: */
const EXTRA = [
  ['/shop', '/shop/domestic'],
  ['/home', '/'],
  ['/about-us', '/about'],
  ['/contact-us', '/contact'],
  ['/zones', '/zones-we-serve'],
  ['/privacy', '/privacy-policy'],
  ['/terms', '/terms-and-conditions'],
  ['/shipping-policy', '/shipping-and-cancellation'],
  ['/product-category/domestic-ro', '/shop/domestic'],
  ['/product-category/water-treatment-plant', '/shop/wtp'],
  ['/my-account', '/account'],
  ['/checkout', '/checkout'],
]
EXTRA.forEach(([a, b]) => add(a, b))
void catGroup
void products

const list = [...map].filter(([a, b]) => a !== b)

/* vercel.json */
const vf = new URL('../vercel.json', import.meta.url)
const vercel = existsSync(vf) ? JSON.parse(readFileSync(vf, 'utf8')) : {}
vercel.redirects = list.flatMap(([source, destination]) => [{ source, destination, statusCode: 301 }, { source: source + '/', destination, statusCode: 301 }])
writeFileSync(vf, JSON.stringify(vercel, null, 2) + '\n')

/* Netlify-style file: redirects first, then the SPA fallback */
writeFileSync(new URL('../public/_redirects', import.meta.url), list.map(([a, b]) => `${a}  ${b}  301`).join('\n') + '\n/*  /index.html  200\n')

/* nginx */
mkdirSync(new URL('../deploy/', import.meta.url), { recursive: true })
writeFileSync(new URL('../deploy/nginx-redirects.conf', import.meta.url), list.map(([a, b]) => `location = ${a} { return 301 ${b}; }\nlocation = ${a}/ { return 301 ${b}; }`).join('\n') + '\n')
console.log(`Redirects: ${list.length} old URLs -> new URLs (vercel.json, public/_redirects, deploy/nginx-redirects.conf)`)

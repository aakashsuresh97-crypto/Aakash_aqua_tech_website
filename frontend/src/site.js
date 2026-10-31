/* Loads the live storefront content from the API once at start-up and lays it over the built-in data (data.js etc.).
   - API reachable and the catalogue imported  -> the database is the truth: prices, stock, hidden products, new products.
   - API down / catalogue still empty          -> the built-in data keeps the site working exactly as before.
   Nothing here throws: a failure just leaves the built-in data in place. */
import { api, apiList } from './api.js'
import { products, cats, groups, catGroup, menu, hrefOf, brandKey, localImg } from './data.js'
import { spares, spareTabs } from './sparesData.js'
import { mrpFor, saveOf } from './pricing.js'
import { TESTIMONIALS, CITY_COUNTS } from './testimonialsData.js'

export const site = {
  ready: false,
  live: false /* true when the database catalogue is in use */,
  banners: [] /* offer strip under the hero (placement home_hero) */,
  heroBanners: [] /* slides added to the hero carousel (placement hero_slide) */,
  showcaseBanners: [] /* rows added to the product showcase (placement home_showcase) */,
  testimonials: [],
  brands: [],
  faqs: [],
  zones: [],
  amcPlans: [],
  pages: {} /* slug -> page, filled on demand by loadPage() */,
  tree: null /* the last /public/catalog answer: { categories (with subcategories + ids), brands } */,
}
/* Online payment is switched off for now. While false: "Buy now" adds the item and opens the cart, and the cart's
   "Proceed to order" sends the order on WhatsApp. Set to true when Razorpay / checkout goes live. */
export const PAYMENTS_ENABLED = import.meta.env.VITE_PAYMENTS_ENABLED !== '0' /* orders go through the API (cart -> checkout); set VITE_PAYMENTS_ENABLED=0 only to fall back to WhatsApp ordering */
/* The "Pay by Razorpay" choice at checkout is shown only when this is 1 (the API needs RAZORPAY_KEY_ID / KEY_SECRET first). Cash on delivery is always offered. */
export const RAZORPAY_ENABLED = import.meta.env.VITE_RAZORPAY_ENABLED === '1'

const listeners = new Set()
export const subscribeSite = (f) => (listeners.add(f), () => listeners.delete(f))
const emit = () => listeners.forEach((f) => f())

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const spareSlug = (name) => slugify(name)

/* one /public/banners call; the placement decides where each banner is shown */
const splitBanners = (all) => ({
  heroBanners: all.filter((b) => b.placement === 'hero_slide'),
  showcaseBanners: all.filter((b) => b.placement === 'home_showcase'),
  banners: all.filter((b) => b.placement !== 'hero_slide' && b.placement !== 'home_showcase'),
})

/* npm run dev: never reuse a stored copy, so every call is a full 200. Production build: ask the server first (a 304 answer is tiny). */
const FETCH_CACHE = import.meta.env.DEV ? 'no-store' : 'no-cache'

const safe = async (fn, fallback) => {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

/* All products: page 1 tells how many pages there are, the other pages are then requested TOGETHER (not one after the other).
   Every request is "no-cache": the browser asks the server whether its copy is still current and gets a tiny 304 answer when it is. */
const PAGE = (n) => apiList(`/public/products?include=extra&limit=100&page=${n}`, { cache: FETCH_CACHE })
async function allProducts() {
  const first = await PAGE(1)
  const pages = Math.min((first.meta && first.meta.totalPages) || 1, 50) /* 50 x 100 = 5000 products; a larger catalogue needs paging on the shop pages */
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => PAGE(i + 2)))
  return [...first.data, ...rest.flatMap((r) => r.data)]
}

/* The shop pages know their categories by short keys (ro, uv, alkaline ...). A subcategory made in the admin gets the key from
   Menu settings (slug); if that was never set, match it by name ("RO Water Purifier" -> ro) so the product still shows up. */
const norm = (s) => slugify(s).replace(/s$/, '').replace(/-water-purifier$|-purifier$/, '')
/* Admin category names that differ from the shop page names (normalised name or slug -> shop key). Add more here if needed. */
const ALIAS = {
  'ss-dispenser': 'dispenser', 'ss-water-dispenser': 'dispenser', 'water-dispenser': 'dispenser',
  'commercial-ro': 'industrial', 'commercial-ro-system': 'industrial', 'industrial-ro': 'industrial', 'industrial-ro-system': 'industrial',
  'heat-pump': 'heatpump',
}
const catKey = (subcategory, category) => {
  const sub = subcategory || category /* a product may have no subcategory: then its category decides */
  if (cats[sub.slug]) return sub.slug
  const n = norm(sub.name)
  const found = ALIAS[sub.slug] || ALIAS[n] || Object.keys(cats).find((k) => norm(cats[k][0]) === n || k === n)
  if (found) return found
  /* a new subcategory under a one-page category (SS Water Dispenser, Commercial RO ...) lists its products on that category's page */
  if (subcategory && category && cats[category.slug] && !groups[category.slug]) return category.slug
  return sub.slug
}

/* Categories / subcategories made in the admin become real menu items and shop pages (the built-in ones stay as they are). */
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#efe6d4"/><text x="60" y="76" font-size="46" text-anchor="middle">💧</text></svg>')
/* A category made in the admin under another spelling of a built-in one ("Domestic Ro", "SS Dispenser", "Commercial Ro",
   "Water Treatment Plants") is the SAME menu entry, not a new one: otherwise the top menu lists it twice. */
const CAT_ALIAS = {
  domestic: 'domestic', 'domestic-ro': 'domestic', 'domestic-ro-water-purifier': 'domestic',
  dispenser: 'dispenser', 'ss-dispenser': 'dispenser', 'ss-water-dispenser': 'dispenser', 'water-dispenser': 'dispenser',
  industrial: 'industrial', 'commercial-ro': 'industrial', 'commercial-ro-system': 'industrial', 'industrial-ro': 'industrial', 'industrial-ro-system': 'industrial',
  wtp: 'wtp', 'water-treatment-plant': 'wtp', 'water-treatment-plants': 'wtp',
  heatpump: 'heatpump', 'heat-pump': 'heatpump', 'heat-pump-water-heater': 'heatpump',
  spares: 'spares', spare: 'spares', 'spare-parts': 'spares',
}
const builtinCategory = (c) => (groups[c.slug] || cats[c.slug] ? c.slug : CAT_ALIAS[c.slug] || CAT_ALIAS[slugify(c.name)] || c.slug)

function overlayCategories(tree, list) {
  const imgOf = (c) => localImg(c.image || (list.find((d) => d.subcategory && d.subcategory.slug === c.slug) || {}).image_url) || PLACEHOLDER
  const addSub = (c, grpKey) => {
    if (!cats[c.slug]) cats[c.slug] = [c.name, imgOf(c), '', '💧']
    if (grpKey) {
      catGroup[c.slug] = grpKey
      if (!groups[grpKey].bar.includes(c.slug)) groups[grpKey].bar.push(c.slug)
    }
  }
  const kidsOf = (key) => groups[key].bar.map((x) => ({ t: cats[x][0], h: hrefOf(x), img: cats[x][1] }))
  for (const c0 of tree) {
    if (c0.show_in_menu === false) continue
    const c = { ...c0, slug: builtinCategory(c0) } /* "domestic-ro" -> the built-in "domestic" */
    const subs = (c.subcategories || []).filter((s) => s.show_in_menu !== false)
    if (groups[c.slug]) { /* Domestic RO / Water Treatment Plant: add the new subcategories to the group */
      subs.filter((s) => !cats[s.slug] && catKey(s) === s.slug).forEach((s) => addSub(s, c.slug))
      const item = menu.find((m) => m.h === '/shop/' + c.slug)
      if (item) item.kids = kidsOf(c.slug)
    } else if (!cats[c.slug]) { /* a brand-new category */
      let item
      if (subs.length) {
        groups[c.slug] = { t: c.name, bar: [] }
        subs.forEach((s) => addSub(s, c.slug))
        item = { t: c.name, h: '/shop/' + c.slug, kids: kidsOf(c.slug) }
      } else {
        cats[c.slug] = [c.name, imgOf(c), '', '💧']
        item = { t: c.name, h: hrefOf(c.slug) }
      }
      if (!menu.some((m) => m.t === item.t)) menu.splice(Math.max(1, menu.findIndex((m) => m.h === '/service')), 0, item) /* just before "Service" */
    }
  }
}

/* DB product -> the shape the shop pages already understand (data.js products) */
const toShopProduct = (d, old) => {
  const x = d.extra || {}
  const price = Number(d.price) || 0
  const mrp = Number(d.mrp) > price ? Number(d.mrp) : price
  return {
    ...(old || {}),
    ...x,
    slug: d.slug,
    name: d.name,
    brand: brandKey(d.brand_slug, d.brand) || brandKey(x.brand), /* always a key the shop pages know ("ao-smith" -> "aosmith") */
    cat: catKey(d.subcategory, d.category),
    price: x.np ? 0 : price,
    mrp,
    save: saveOf(price, mrp),
    np: Boolean(x.np) || !price,
    img: localImg(d.image_url || x.img) || (old && old.img),
    big: localImg(x.big || d.image_url) || (old && old.big),
    summary: x.summary || d.short_description || (old && old.summary) || '',
    features: x.features || (old && old.features) || [],
    pid: d.id,
    brandId: d.brand_id || null /* UUID of the brand row (GET /public/brands) */,
    oos: !d.in_stock && !x.enquiry,
    maxQty: d.max_quantity,
    /* specifications typed in the admin become the product page's Technical Details table */
    ...(Array.isArray(d.specifications) && d.specifications.length ? { tech: d.specifications.map((r) => [r.name, r.value]) } : {}),
  }
}

function overlayCatalogue(list) {
  const shop = list.filter((d) => d.category.slug !== 'spares')
  const sp = list.filter((d) => d.category.slug === 'spares')
  const byslug = new Map(products.map((p) => [p.slug, p]))
  products.length = 0
  for (const d of shop) products.push(toShopProduct(d, byslug.get(d.slug)))

  const bySpare = new Map(sp.map((d) => [d.slug, d]))
  const kept = []
  for (const s of spares) {
    const d = bySpare.get(spareSlug(s.name))
    if (!d) continue
    bySpare.delete(spareSlug(s.name))
    kept.push(Object.assign(s, { price: d.extra && d.extra.np ? null : Number(d.price) || null, max: (d.extra && d.extra.max) || s.max, pid: d.id, oos: !d.in_stock && !(d.extra && d.extra.enquiry) }))
  }
  const tabKeys = new Set(spareTabs.map((t) => t[0]))
  for (const d of bySpare.values()) {
    const key = d.subcategory ? d.subcategory.slug.replace(/^spares-/, '') : spareTabs[0][0] /* no subcategory: first spares tab */
    if (!tabKeys.has(key)) continue
    kept.push({ cat: key, name: d.name, img: localImg(d.image_url), price: d.extra && d.extra.np ? null : Number(d.price) || null, max: (d.extra && d.extra.max) || undefined, url: '/product/' + d.slug, pid: d.id, oos: !d.in_stock && !(d.extra && d.extra.enquiry) })
  }
  spares.length = 0
  spares.push(...kept)
  void mrpFor
}

/* ONE catalogue job at a time: the start-up load and any refreshCatalogue() that arrives while it runs are the same job, so a page that renders
   before the start-up load has finished (main.jsx never waits longer than 1.5 s) does not send the same product requests again. */
let lastRefresh = 0
let pendingRefresh = null
const REFRESH_EVERY = 60 * 1000 /* opening shop pages / coming back to the tab re-reads the products at most once a minute */

export function loadSite() {
  if (pendingRefresh) return pendingRefresh
  lastRefresh = Date.now() /* counted from the START: nothing asks again while this is running or right after it */
  /* Start-up = 3 requests only (the home page needs just these): banners, products, catalogue tree (menu).
     Testimonials, FAQs, AMC plans, zones and brands are NOT loaded here; see ensureSection() below. */
  pendingRefresh = (async () => {
    const [banners, list, tree] = await Promise.all([
      safe(() => api('/public/banners', { timeout: 6000 }), []),
      safe(allProducts, []),
      safe(() => api('/public/catalog', { timeout: 6000 }), null),
    ])
    Object.assign(site, splitBanners(banners))
    if (tree) site.tree = tree
    if (list.length) {
      if (tree && tree.categories) overlayCategories(tree.categories, list)
      overlayCatalogue(list)
      site.live = true
    }
    site.ready = true
    emit()
  })().finally(() => { pendingRefresh = null })
  return pendingRefresh
}

/* ---------- page-specific content: fetched the first time something needs it, then kept ----------
   ensureSection('testimonials') -> /testimonials page      ensureSection('faqs') -> home FAQ block (when it scrolls into view)
   ensureSection('amcPlans')     -> service form (AMC)       ensureSection('zones' | 'brands') -> only if a page uses them */
const SECTIONS = {
  testimonials: ['/public/testimonials', (rows) => {
    if (!rows.length) return
    TESTIMONIALS.length = 0
    rows.forEach((t, id) => TESTIMONIALS.push({ id, name: t.customer_name, place: t.city || '', text: t.feedback }))
    CITY_COUNTS.length = 0
    CITY_COUNTS.push(...Object.entries(TESTIMONIALS.reduce((a, t) => ((a[t.place] = (a[t.place] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]))
  }],
  faqs: ['/public/faqs'],
  amcPlans: ['/public/amc-plans'],
  zones: ['/public/zones'],
  brands: ['/public/brands'],
}
const sectionJobs = new Map()
export function ensureSection(name) {
  const def = SECTIONS[name]
  if (!def) return Promise.resolve()
  if (!sectionJobs.has(name)) {
    sectionJobs.set(
      name,
      (async () => {
        const rows = await safe(() => api(def[0], { timeout: 6000 }), null)
        if (!rows) return sectionJobs.delete(name) /* failed: a later visit may try again */
        site[name] = rows
        if (def[1]) def[1](rows)
        emit()
      })(),
    )
  }
  return sectionJobs.get(name)
}

/* Re-reads the products from the API (called when a shop page opens, when the tab is focused again, or when the admin saves).
   One request at a time: a call made while another is running just waits for that one. */
export function refreshCatalogue(force = false) {
  if (force) productReadAt.clear()
  if (pendingRefresh) return pendingRefresh
  if (!force && Date.now() - lastRefresh < REFRESH_EVERY) return Promise.resolve()
  lastRefresh = Date.now()
  pendingRefresh = (async () => {
    /* banners change rarely: they are re-read only when the admin saved something (force), not on every visit to a shop page */
    const [list, banners] = await Promise.all([safe(allProducts, []), force ? safe(() => api('/public/banners', { timeout: 6000, cache: 'reload' }), null) : null])
    if (banners) Object.assign(site, splitBanners(banners))
    if (list.length) {
      overlayCatalogue(list)
      site.live = true
    }
    emit()
  })().finally(() => { pendingRefresh = null })
  return pendingRefresh
}

/* Product page: asks the API for this one product (GET /public/products/:slug) when the page opens, so its price, stock,
   images, GST, specifications and category come from the server. The page shows the data it already has meanwhile, then updates.
   - The API looks a public product up by its SLUG only (the product's UUID is used for the cart and orders, not for this URL).
   - One request per product: a second call while the first is running shares it, and a product read less than a minute ago is not read again. */
const PRODUCT_FRESH_MS = 60 * 1000
const productReadAt = new Map() /* product key (uuid or slug) -> time of the last successful read */
const pendingProduct = new Map()

const applyProduct = (d, slug) => {
  if (!d || (d.category && d.category.slug === 'spares')) return
  const i = products.findIndex((x) => x.slug === slug || x.pid === d.id)
  const item = toShopProduct(d, i >= 0 ? products[i] : undefined)
  if (i >= 0) products[i] = item
  else products.push(item)
  productReadAt.set(slug, Date.now())
  if (d.id) productReadAt.set(d.id, Date.now())
  emit()
}

export function refreshProduct(slug) {
  if (!site.live) return Promise.resolve()
  if (pendingProduct.has(slug)) return pendingProduct.get(slug)
  if (Date.now() - (productReadAt.get(slug) || 0) < PRODUCT_FRESH_MS) return Promise.resolve()
  const run = (async () => {
    /* ask the API by the product's id (uuid) when the product is already known; the page address keeps the readable slug */
    const known = products.find((x) => x.slug === slug)
    const key = (known && known.pid) || slug
    const d = await safe(() => api('/public/products/' + encodeURIComponent(key), { timeout: 8000, cache: FETCH_CACHE }), null)
    applyProduct(d, slug)
  })().finally(() => pendingProduct.delete(slug))
  pendingProduct.set(slug, run)
  return run
}

/* ---------- a category page: category -> brands -> products, requested when the page opens (and when the brand changes) ----------
   1) GET /public/catalog   the categories + subcategories with their UUIDs
   2) GET /public/brands    the brands with their UUIDs (brand_id)
   3) GET /public/products?subcategory=<uuid>|category=<uuid>[&brand=<slug>]   only the products of that category / brand
   The shop pages know a category by a short key (ro, uv ...): catKey() is the same function that gives every product its key, so the
   category / subcategory whose products carry this key are found by running it over the tree. The answers are merged into `products`;
   nothing is removed here (the full refresh in refreshCatalogue() still drops deleted / hidden products).
   One request set per category + brand: a second call while it runs is shared, and one made less than a minute ago is not repeated. */
const CATEGORY_FRESH_MS = 60 * 1000
const categoryReadAt = new Map() /* "key|brand" -> time of the last successful read */
const pendingCategory = new Map()

/* the tree nodes ({ subcategory: id } or { category: id }) whose products belong to the shop key */
const nodesForKey = (tree, key) => {
  const out = []
  for (const c of (tree && tree.categories) || []) {
    for (const s of c.subcategories || []) if (catKey(s, c) === key) out.push({ category: c.id, subcategory: s.id })
    if (catKey(null, c) === key) out.push({ category: c.id })
  }
  return out
}

/* all products of one filter (100 per page, further pages requested together) */
async function productsWhere(filter) {
  const url = (n) => '/public/products?' + new URLSearchParams({ ...filter, include: 'extra', limit: 100, page: n })
  const first = await apiList(url(1), { cache: FETCH_CACHE })
  const pages = Math.min((first.meta && first.meta.totalPages) || 1, 10)
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => apiList(url(i + 2), { cache: FETCH_CACHE })))
  return [...first.data, ...rest.flatMap((r) => r.data)]
}

/* the brand row (id, slug, name) for a shop brand key ("aosmith" -> the "ao-smith" brand) */
const brandRow = (key) => (key ? (site.brands || []).find((b) => brandKey(b.slug, b.name) === key) || null : null)

export function refreshCategory(key, brand) {
  if (!site.live || !key) return Promise.resolve()
  const mark = key + '|' + (brand || '')
  if (pendingCategory.has(mark)) return pendingCategory.get(mark)
  if (Date.now() - (categoryReadAt.get(mark) || 0) < CATEGORY_FRESH_MS) return Promise.resolve()
  const run = (async () => {
    /* 1 + 2: the category tree and the brands (with their UUIDs) */
    const [tree, brands] = await Promise.all([
      safe(() => api('/public/catalog', { timeout: 6000, cache: FETCH_CACHE }), null) /* asks the server each time (a 304 answer is tiny) */,
      safe(() => api('/public/brands', { timeout: 6000, cache: FETCH_CACHE }), null),
    ])
    if (tree) site.tree = tree
    if (brands) site.brands = brands
    const nodes = nodesForKey(site.tree, key)
    if (!nodes.length) return /* a built-in category that is not in the database: the built-in data stays */
    /* 3: the products of this category (and brand) */
    const row = brandRow(brand)
    const filter = row ? { brand: row.slug } : {}
    const lists = await Promise.all(nodes.map((n) => productsWhere({ ...n, ...filter })))
    let changed = false
    for (const d of lists.flat()) {
      if (!d || (d.category && d.category.slug === 'spares')) continue
      const i = products.findIndex((x) => x.slug === d.slug || x.pid === d.id)
      const item = toShopProduct(d, i >= 0 ? products[i] : undefined)
      if (i >= 0) products[i] = item
      else products.push(item)
      productReadAt.set(d.slug, Date.now())
      changed = true
    }
    categoryReadAt.set(mark, Date.now())
    if (changed) emit()
  })()
    .catch(() => {}) /* a failure leaves the products already on screen as they are */
    .finally(() => pendingCategory.delete(mark))
  pendingCategory.set(mark, run)
  return run
}

/* a static page edited in the admin ("Privacy policy" ...): null when there is none, so the built-in page shows */
export async function loadPage(slug) {
  if (slug in site.pages) return site.pages[slug]
  site.pages[slug] = await safe(() => api('/public/pages/' + slug, { timeout: 6000 }), null)
  return site.pages[slug]
}

/* The database id of what a cart line is, or null when it cannot be bought online (option/variant lines, enquiry-only products). */
export function pidOf(item) {
  if (!site.live) return null
  const id = String(item.id).replace(/\|+$/, '') /* a plain product is saved as "slug|" (empty option) */
  if (id.startsWith('sp-')) {
    const s = spares.find((x) => 'sp-' + x.name === id)
    return s && s.price && !s.max && s.pid ? s.pid : null
  }
  if (id.includes('|')) return null
  const p = products.find((x) => x.slug === id)
  return p && !p.np && !p.configs && !p.variants && !p.max ? p.pid || null : null
}
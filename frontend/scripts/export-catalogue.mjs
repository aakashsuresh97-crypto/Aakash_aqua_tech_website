/* Exports the built-in storefront data (src/data.js, sparesData.js, testimonialsData.js, blogData.js) to one JSON file that the
   backend's import script (npm run import:data) loads into the database.  Safe to run any number of times; it only writes the JSON.
     node scripts/export-catalogue.mjs [out.json]            (default: catalogue-export.json) */
import { createServer } from 'vite'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const out = resolve(process.argv[2] || 'catalogue-export.json')
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const d = await server.ssrLoadModule('/src/data.js')
  const sp = await server.ssrLoadModule('/src/sparesData.js')
  const te = await server.ssrLoadModule('/src/testimonialsData.js')
  const bl = await server.ssrLoadModule('/src/blogData.js')

  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const abs = (u) => (u ? (/^(https?:)?\/\//.test(u) ? u : u) : null)
  const upload = (p) => (p ? d.u(p) : null)

  /* ---- categories: the top menu entries; sub-categories: the "cat" keys the shop pages use ---- */
  const groupOf = (k) => d.catGroup[k]
  const categories = []
  let sort = 0
  const addCat = (c) => categories.push({ ...c, sort_order: (sort += 10), subs: c.subs })
  for (const m of d.menu) {
    if (['Home', 'Service', 'About us', 'Contact Us'].includes(m.t)) continue
    const href = m.h
    if (m.kids) {
      const g = href.split('/')[2]
      addCat({ slug: g, name: m.t, subs: d.groups[g].bar.map((k, i) => ({ slug: k, name: d.cats[k][0], image: upload(d.cats[k][1]), sort_order: (i + 1) * 10 })) })
    } else {
      const k = href.split('/')[2]
      addCat({ slug: k, name: m.t, subs: k === 'spares' ? sp.spareTabs.map(([key, label], i) => ({ slug: 'spares-' + key, name: label, sort_order: (i + 1) * 10 })) : [{ slug: k, name: d.cats[k][0], image: upload(d.cats[k][1]), sort_order: 10 }] })
    }
  }

  /* ---- brands ---- */
  const brands = Object.entries(d.brandInfo).map(([key, v], i) => ({ slug: key, name: v[0], logo_url: upload(v[1]), website_url: v[2] || null, display_order: (i + 1) * 10 }))

  /* ---- products ---- */
  const products = d.products.map((p) => {
    const { slug: s, name, price, mrp, img, summary, brand, cat, save, ...rest } = p
    const enquiry = Boolean(p.np || p.max || p.configs || p.variants)
    return {
      slug: s, name, category: groupOf(cat) || cat, subcategory: cat, brand: brand ? d.brandInfo[brand][0] : null,
      price: p.np ? 0 : price, mrp: mrp || price, image_url: abs(img), summary,
      extra: { ...rest, enquiry, big: abs(p.big) },
    }
  })
  /* ---- spares ---- */
  const spares = sp.spares.map((s) => ({
    slug: slug(s.name), name: s.name, category: 'spares', subcategory: 'spares-' + s.cat, brand: 'Olivar',
    price: s.price || 0, mrp: s.price || 0, image_url: s.img, summary: 'Olivar · RO purifier spare',
    extra: { enquiry: !s.price || Boolean(s.max), max: s.max || null, np: !s.price },
  }))

  const data = {
    generated_at: new Date().toISOString(),
    categories, brands, products, spares,
    testimonials: te.TESTIMONIALS.map((t) => ({ customer_name: t.name, city: t.place, feedback: t.text, rating: 5 })),
    faqs: d.faq.map(([question, answer], i) => ({ question, answer, display_order: (i + 1) * 10 })),
    blog_posts: bl.BLOG_POSTS.map((p) => ({ title: p.title, slug: bl.slugOf(p.url).replace(/^\//, ''), published_at: p.iso, excerpt: p.excerpt, image_url: p.image, body: p.body || null })),
  }
  writeFileSync(out, JSON.stringify(data, null, 1))
  console.log(`Wrote ${out}: ${categories.length} categories, ${products.length} products, ${spares.length} spares, ${data.testimonials.length} testimonials, ${data.faqs.length} FAQs, ${data.blog_posts.length} blog posts`)
} finally {
  await server.close()
}

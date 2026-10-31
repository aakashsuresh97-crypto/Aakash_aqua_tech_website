// Public (no login) catalogue API for the storefront: only active categories and PUBLISHED products are ever returned.
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const Product = require('../models/product.model');
const { slugify } = require('../utils/slug');
const { unavailableReason } = require('../utils/productActions');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const parseJson = (v) => { if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } } return v; };

/* The category tree and the brand list are read for every /public/products and /public/catalog call. They change only when the admin saves
   something, so they are kept in memory for a short time (PUBLIC_CACHE_SECONDS, default 30) and dropped by clearCatalogCache(), which app.js
   calls after every write request. With several server processes a change can take up to that many seconds to reach the others. */
const CACHE_MS = process.env.NODE_TEST_CONTEXT ? 0 : Math.max(0, Number(process.env.PUBLIC_CACHE_SECONDS ?? 30)) * 1000;
const cache = new Map();
function cached(key, load) {
  if (!CACHE_MS) return load();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const value = load().catch((err) => { cache.delete(key); throw err; });
  cache.set(key, { at: Date.now(), value });
  return value;
}
exports.clearCatalogCache = () => cache.clear();

const catalogTree = () => cached('tree', loadCatalogTree);
const brandSlugMap = () => cached('brands', async () => {
  const [rows] = await pool.execute('SELECT slug, name FROM brand WHERE status = 1');
  return new Map(rows.map((b) => [b.name.toLowerCase(), b.slug]));
});

/** Active categories with their active subcategories, each with a short URL slug (catalog_node, else the slugified name). */
async function loadCatalogTree() {
  const [cats] = await pool.execute(
    `SELECT c.id, c.category_name AS name, c.description, c.image, c.created_at, n.slug, n.sort_order, n.show_in_menu
       FROM category c LEFT JOIN catalog_node n ON n.entity_type = 'category' AND n.entity_id = c.id WHERE c.status = 1`);
  const [subs] = await pool.execute(
    `SELECT s.id, s.category_id, s.subcategory_name AS name, s.description, s.image, s.created_at, n.slug, n.sort_order, n.show_in_menu
       FROM subcategory s LEFT JOIN catalog_node n ON n.entity_type = 'subcategory' AND n.entity_id = s.id WHERE s.status = 1`);
  const shape = (r) => ({
    id: r.id, slug: r.slug || slugify(r.name), name: r.name, description: r.description, image: r.image,
    sort_order: r.sort_order === null ? 1000 : Number(r.sort_order), show_in_menu: r.show_in_menu === null ? true : Boolean(r.show_in_menu), created_at: r.created_at,
  });
  const by = (a, b) => a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at);
  const subsOf = new Map();
  subs.map((r) => ({ ...shape(r), category_id: r.category_id })).sort(by).forEach((s) => {
    if (!subsOf.has(s.category_id)) subsOf.set(s.category_id, []);
    subsOf.get(s.category_id).push(s);
  });
  return cats.map(shape).sort(by).map((c) => ({ ...c, subcategories: subsOf.get(c.id) || [] }));
}

const slugMaps = (tree) => {
  const cat = new Map(); const sub = new Map();
  tree.forEach((c) => { cat.set(c.id, c); c.subcategories.forEach((s) => sub.set(s.id, { ...s, category: c })); });
  return { cat, sub };
};

async function publicShape(rows, { tree, withExtra }) {
  const { cat, sub } = slugMaps(tree);
  let extras = new Map();
  if (withExtra && rows.length) {
    const [ex] = await pool.query('SELECT product_id, extra FROM product_extra WHERE product_id IN (?)', [rows.map((r) => r.id)]);
    extras = new Map(ex.map((e) => [e.product_id, parseJson(e.extra)]));
  }
  const brandSlug = await brandSlugMap();
  return rows.map((p) => {
    const c = cat.get(p.category_id); const s = sub.get(p.subcategory_id);
    const reason = unavailableReason(p);
    const limited = p.manage_stock && p.backorders === 'no';
    return {
      id: p.id, slug: p.slug, name: p.product_name, sku: p.sku, brand: p.brand, brand_id: p.brand_id || null, brand_slug: p.brand ? (brandSlug.get(p.brand.toLowerCase()) || slugify(p.brand)) : null,
      category: c ? { id: c.id, slug: c.slug, name: c.name } : { id: p.category_id, slug: slugify(p.category_name), name: p.category_name },
      subcategory: s ? { id: s.id, slug: s.slug, name: s.name } : (p.subcategory_id ? { id: p.subcategory_id, slug: slugify(p.subcategory_name), name: p.subcategory_name } : null),
      mrp: p.mrp, price: p.effective_price, regular_price: p.regular_price, sale_active: p.sale_active, discount_percent: p.effective_discount_percent, gst_percent: p.gst_percent,
      image_url: p.image_url, short_description: p.short_description, description: p.description, specifications: p.specifications,
      in_stock: reason === null, low_stock: p.low_stock, max_quantity: reason ? 0 : (limited ? p.stock_quantity : null),
      seo: p.seo, extra: extras.get(p.id) || null, created_at: p.created_at,
    };
  });
}

const SORTS = {
  newest: ['created_at', 'desc'], price_asc: ['selling_price', 'asc'], price_desc: ['selling_price', 'desc'], name_asc: ['product_name', 'asc'], name_desc: ['product_name', 'desc'],
};

// GET /api/public/catalog
exports.catalog = wrap(async (req, res) => {
  const [brands] = await pool.execute('SELECT id, slug, name, logo_url, website_url, display_order FROM brand WHERE status = 1 ORDER BY display_order, name');
  res.json({ success: true, data: { categories: await catalogTree(), brands } });
});

// GET /api/public/products?category=&subcategory=&brand=&min_price=&max_price=&stock=in&search=&sort=&page=&limit=&include=extra
exports.products = wrap(async (req, res) => {
  const q = req.query;
  const tree = await catalogTree();
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 24));
  const f = { page, limit, publish_status: 'published' };
  if (q.category) {
    const c = tree.find((x) => x.slug === String(q.category).toLowerCase() || x.id === q.category);
    if (!c) return res.json({ success: true, data: [], meta: { total: 0, page, limit, totalPages: 0 } });
    f.category_id = c.id;
  }
  if (q.subcategory) {
    const s = tree.flatMap((c) => c.subcategories).find((x) => x.slug === String(q.subcategory).toLowerCase() || x.id === q.subcategory);
    if (!s) return res.json({ success: true, data: [], meta: { total: 0, page, limit, totalPages: 0 } });
    f.subcategory_id = s.id;
  }
  if (q.brand) {
    const wanted = String(q.brand).split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
    const [bs] = await pool.execute('SELECT slug, name FROM brand');
    f.brands = wanted.map((w) => (bs.find((b) => b.slug === w.toLowerCase()) || { name: w }).name);
  }
  for (const k of ['min_price', 'max_price']) {
    if (q[k] === undefined || q[k] === '') continue;
    const n = Number(q[k]);
    if (!Number.isFinite(n) || n < 0) throw new ApiError(400, 'Validation failed', [`${k} must be a positive number`]);
    f[k] = n;
  }
  if (q.stock === 'in') f.stock_status = 'instock';
  else if (q.stock === 'out') f.stock_status = 'outofstock';
  if (typeof q.search === 'string' && q.search.trim()) f.search = q.search.trim().slice(0, 100);
  const [sortBy, sortOrder] = SORTS[q.sort] || SORTS.newest;
  f.sort_by = sortBy; f.sort_order = sortOrder;
  const { rows, total } = await Product.findPage(f);
  res.json({ success: true, data: await publicShape(rows, { tree, withExtra: q.include === 'extra' }), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// GET /api/public/products/:slug  -> product + related products (same subcategory)
exports.productBySlug = wrap(async (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  const [[row]] = await pool.execute(`SELECT id FROM product WHERE slug = ? AND publish_status = 'published'`, [slug]);
  if (!row) throw new ApiError(404, 'Product not found');
  const tree = await catalogTree();
  const product = await Product.findById(row.id);
  const [shaped] = await publicShape([product], { tree, withExtra: true });
  const [rel] = await pool.execute(
    `SELECT id FROM product WHERE ${product.subcategory_id ? 'subcategory_id' : 'category_id'} = ? AND id <> ? AND publish_status = 'published' ORDER BY (brand <=> ?) DESC, created_at DESC LIMIT 8`, [product.subcategory_id || product.category_id, product.id, product.brand]);
  const related = await Product.findByIds(rel.map((r) => r.id)); // one query, not one per related product
  res.json({ success: true, data: { ...shaped, related: await publicShape(related, { tree, withExtra: false }) } });
});

// GET /api/public/search?q=  -> quick suggestions
exports.search = wrap(async (req, res) => {
  const term = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (term.length < 2) return res.json({ success: true, data: { products: [], categories: [] } });
  const tree = await catalogTree();
  const { rows } = await Product.findPage({ page: 1, limit: Math.min(20, parseInt(req.query.limit, 10) || 8), publish_status: 'published', search: term, sort_by: 'product_name', sort_order: 'asc' });
  const t = term.toLowerCase();
  const categories = tree.flatMap((c) => [c, ...c.subcategories.map((s) => ({ ...s, parent: c.slug }))]).filter((x) => x.name.toLowerCase().includes(t)).slice(0, 5)
    .map((x) => ({ id: x.id, slug: x.slug, name: x.name, parent: x.parent || null, image: x.image }));
  res.json({ success: true, data: { products: await publicShape(rows, { tree, withExtra: false }), categories } });
});

/* Catalog data comes from the SAME backend as the website (category-api):
     GET /api/public/catalog   -> categories + subcategories + brands
     GET /api/public/products  -> published products (paged)
     GET /api/public/products/:slug -> one product with specs / extra details
     GET /api/public/banners   -> active banners
   So whatever the admin adds/edits (category, subcategory, brand, banner, product) shows up here and on the website.
   If the API cannot be reached the old static files (catalog.json, data/<slug>.json) are used as a fallback. */
const API = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const STATIC = import.meta.env.BASE_URL;

async function get(path) {
  const r = await fetch(API + path, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || j.success === false) throw new Error((j && j.message) || 'API error ' + r.status);
  return j;
}

/* images uploaded in dev are saved as http://localhost:3000/uploads/x.png -> use the same-origin /uploads path (the dev proxy serves it) */
export const fixUrl = u => (typeof u === 'string' ? u.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/uploads\/)/, '$1') : u);

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0 };
/* the importer stores "price on enquiry" items with a price of 1 */
const money = v => (num(v) > 1 ? num(v) : 0);

function mapCatalog(tree, brands, products, banners) {
  const categories = tree.categories.map((c, i) => ({
    id: c.slug, name: c.name, order: i, image: fixUrl(c.image),
    subs: (c.subcategories || []).map((s, j) => ({ id: s.slug, name: s.name, order: j, image: fixUrl(s.image) })),
  }));
  const list = products.map(p => ({
    id: p.id, slug: p.slug, name: p.name, brand: p.brand || '',
    categoryId: p.category?.slug || '', subIds: p.subcategory?.slug ? [p.subcategory.slug] : [],
    price: money(p.price), mrp: money(p.mrp), inStock: !!p.in_stock,
    image: fixUrl(p.image_url) || '', createdAt: p.created_at,
    url: '/product/' + p.slug,   // the same product on the main website
  }));
  const bn = banners.map(b => ({
    id: b.id, title: b.title, subtitle: b.subtitle, image: fixUrl(b.image_url), mobileImage: fixUrl(b.mobile_image_url),
    link: b.link_url, button: b.button_text,
  })).filter(b => b.image);
  return { categories, products: list, brands: brands || [], banners: bn };
}

async function loadAllProducts() {
  const first = await get('/public/products?limit=100&page=1');
  const pages = first.meta?.totalPages || 1;
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => get(`/public/products?limit=100&page=${i + 2}`)));
  return [first, ...rest].flatMap(r => r.data);
}

export async function loadCatalog() {
  try {
    const [tree, products, banners] = await Promise.all([
      get('/public/catalog'), loadAllProducts(), get('/public/banners').catch(() => ({ data: [] })),
    ]);
    return mapCatalog(tree.data, tree.data.brands, products, banners.data || []);
  } catch (e) {
    console.warn('[catalog] API unavailable, showing the saved offline copy:', e.message);
    const r = await fetch(STATIC + 'catalog.json');
    if (!r.ok) throw new Error('Failed to load catalog');
    return { ...(await r.json()), brands: [], banners: [], offline: true };
  }
}

/* full details of one product (specs, features ...) */
function mapDetail(p) {
  const ex = p.extra || {};
  const specs = (Array.isArray(p.specifications) ? p.specifications : []).filter(s => s && s.name).map(s => [String(s.name), String(s.value ?? '')]);
  const tech = Array.isArray(ex.tech) ? ex.tech : [];
  const rows = specs.length ? specs : tech.map(t => [String(t[0]), String(t[1] ?? '')]);
  const about = Array.isArray(ex.about) ? ex.about.join('\n\n') : '';
  const info = [['Model', p.name]];
  if (p.brand) info.push(['Brand', p.brand]);
  if (p.sku) info.push(['SKU', p.sku]);
  if (p.category?.name) info.push(['Category', p.category.name]);
  if (p.subcategory?.name) info.push(['Type', p.subcategory.name]);
  return {
    slug: p.slug, name: p.name,
    summary: p.short_description || '', intro: p.description || about,
    gallery: [fixUrl(p.image_url)].filter(Boolean),
    features: Array.isArray(ex.features) ? ex.features : [], benefits: Array.isArray(ex.benefits) ? ex.benefits : [], notes: Array.isArray(ex.notes) ? ex.notes : [],
    info, specs: rows.length ? { head: null, rows } : null, extra: [],
  };
}

const cache = new Map();
export function loadProduct(slug) {
  if (!cache.has(slug)) {
    cache.set(slug, get('/public/products/' + encodeURIComponent(slug)).then(j => mapDetail(j.data)).catch(async () => {
      const r = await fetch(`${STATIC}data/${encodeURIComponent(slug)}.json`);   // offline fallback
      if (!r.ok) throw new Error('missing');
      return r.json();
    }).catch(e => { cache.delete(slug); throw e }));
  }
  return cache.get(slug);
}

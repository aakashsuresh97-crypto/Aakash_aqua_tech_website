/* Loads the storefront catalogue and content (exported from the website's built-in data) into the database.
     node scripts/import-data.js <catalogue-export.json> [--dry-run] [--update] [--gst 18] [--skip-blog]
   Produce the JSON with the frontend:  node scripts/export-catalogue.mjs
   Safe to run again (idempotent): everything is matched by slug / name, existing rows are SKIPPED, nothing is deleted.
     --update   also refreshes names, images, descriptions and the storefront JSON of existing products (NEVER prices or stock)
     --dry-run  prints what would happen and writes nothing
   Imported products: fixed-price items are sold online with stock NOT tracked until you set quantities in the admin;
   "price on request", price-range and option products are imported as enquiry-only (out of stock for the cart, shown with WhatsApp / demo buttons). */
require('dotenv').config();
const fs = require('fs');
const { pool } = require('../src/config/db');
const Category = require('../src/models/category.model');
const Subcategory = require('../src/models/subcategory.model');
const Product = require('../src/models/product.model');
const { newUuid } = require('../src/utils/uuid');
const { cleanHtml } = require('../src/utils/fields');

const args = process.argv.slice(2);
const gstAt = args.indexOf('--gst');
const file = args.find((a, i) => !a.startsWith('--') && (gstAt < 0 || i !== gstAt + 1));
const flag = (n) => args.includes(`--${n}`);
const gst = (gstAt >= 0 && Number(args[gstAt + 1])) || 18;
const DRY = flag('dry-run');
const UPDATE = flag('update');
if (!file || !fs.existsSync(file)) { console.error('Usage: node scripts/import-data.js <catalogue-export.json> [--dry-run] [--update] [--gst 18] [--skip-blog]'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const stat = {};
const bump = (k) => { stat[k] = (stat[k] || 0) + 1; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function blogHtml(b) {
  if (!b) return '<p></p>';
  const parts = [];
  if (b.lead) parts.push(`<p>${esc(b.lead)}</p>`);
  for (const s of b.sections || []) {
    if (s.h) parts.push(`<h2>${esc(s.h)}</h2>`);
    for (const p of s.p || []) parts.push(`<p>${esc(p)}</p>`);
    if (s.listTitle) parts.push(`<h3>${esc(s.listTitle)}</h3>`);
    if (s.list && s.list.length) parts.push(`<ul>${s.list.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`);
  }
  return cleanHtml(parts.join('\n')) || '<p></p>';
}

async function nodeFor(type, id, slug, sort, menu = 1) {
  const [[have]] = await pool.execute('SELECT slug FROM catalog_node WHERE entity_type = ? AND entity_id = ?', [type, id]);
  if (have) { bump('catalog_node skipped'); return; }
  const [[clash]] = await pool.execute('SELECT entity_id FROM catalog_node WHERE entity_type = ? AND slug = ?', [type, slug]);
  if (clash) { console.warn(`  ! slug "${slug}" already used by another ${type}; left without a custom slug`); return; }
  if (!DRY) await pool.execute('INSERT INTO catalog_node (entity_type, entity_id, slug, sort_order, show_in_menu) VALUES (?, ?, ?, ?, ?)', [type, id, slug, sort, menu]);
  bump('catalog_node created');
}

async function main() {
  const subId = new Map(); // "<category slug>/<sub slug>" -> { cat, sub }
  for (const c of data.categories) {
    let [[row]] = await pool.execute('SELECT id FROM category WHERE category_name = ?', [c.name]);
    let catId = row && row.id;
    if (!catId) { catId = DRY ? newUuid() : (await Category.create({ category_name: c.name })).id; bump('categories created'); } else bump('categories skipped');
    await nodeFor('category', catId, c.slug, c.sort_order);
    for (const s of c.subs) {
      [[row]] = DRY && !row ? [[]] : await pool.execute('SELECT id FROM subcategory WHERE category_id = ? AND subcategory_name = ?', [catId, s.name]);
      let sid = row && row.id;
      if (!sid) { sid = DRY ? newUuid() : (await Subcategory.create({ category_id: catId, subcategory_name: s.name, image: s.image || null })).id; bump('subcategories created'); } else bump('subcategories skipped');
      await nodeFor('subcategory', sid, s.slug, s.sort_order);
      subId.set(`${c.slug}/${s.slug}`, { cat: catId, sub: sid });
    }
  }

  for (const b of data.brands) {
    const [[have]] = await pool.execute('SELECT id FROM brand WHERE slug = ? OR name = ?', [b.slug, b.name]);
    if (have) { bump('brands skipped'); continue; }
    if (!DRY) await pool.execute('INSERT INTO brand (id, slug, name, logo_url, website_url, display_order) VALUES (?, ?, ?, ?, ?, ?)', [newUuid(), b.slug, b.name, b.logo_url, b.website_url, b.display_order]);
    bump('brands created');
  }

  for (const p of [...data.products, ...data.spares]) {
    const ref = subId.get(`${p.category}/${p.subcategory}`);
    if (!ref) { console.warn(`  ! ${p.slug}: unknown category ${p.category}/${p.subcategory}, skipped`); bump('products unplaced'); continue; }
    const [[have]] = await pool.execute('SELECT id FROM product WHERE slug = ?', [p.slug]);
    const enquiry = Boolean(p.extra && p.extra.enquiry);
    const tech = p.extra && Array.isArray(p.extra.tech) ? p.extra.tech.map(([name, value]) => ({ name, value })) : undefined;
    const about = p.extra && Array.isArray(p.extra.about) ? p.extra.about.join('\n\n') : null;
    let id = have && have.id;
    if (!id) {
      const price = Number(p.price) > 0 ? Number(p.price) : 1;
      const mrp = Math.max(Number(p.mrp) || 0, price);
      const row = {
        category_id: ref.cat, subcategory_id: ref.sub, product_name: String(p.name).slice(0, 200), slug: p.slug, sku: p.slug.length <= 64 ? p.slug : null,
        brand: p.brand ? String(p.brand).slice(0, 100) : null, mrp, selling_price: price, gst_percent: gst,
        short_description: p.summary || null, description: about, image_url: p.image_url ? String(p.image_url).slice(0, 500) : null,
        specifications: tech, publish_status: 'published',
        ...(enquiry ? { manage_stock: true, stock_quantity: 0, backorders: 'no' } : { manage_stock: false, stock_quantity: 0, stock_status: 'instock' }),
      };
      id = DRY ? newUuid() : (await Product.create(row)).id;
      bump(enquiry ? 'products created (enquiry only)' : 'products created (sold online)');
    } else bump('products skipped');
    if ((!have || UPDATE) && !DRY) {
      await pool.execute('INSERT INTO product_extra (product_id, extra) VALUES (?, ?) ON DUPLICATE KEY UPDATE extra = VALUES(extra)', [id, JSON.stringify(p.extra || {})]);
      if (have) await pool.execute('UPDATE product SET product_name = ?, brand = ?, image_url = ?, short_description = ?, description = ? WHERE id = ?',
        [String(p.name).slice(0, 200), p.brand || null, p.image_url || null, p.summary || null, about, id]);
      if (have) bump('products refreshed (--update)');
    }
  }

  for (const t of data.testimonials || []) {
    const [[have]] = await pool.execute('SELECT id FROM testimonial WHERE customer_name = ? AND feedback = ?', [t.customer_name, t.feedback]);
    if (have) { bump('testimonials skipped'); continue; }
    if (!DRY) await pool.execute('INSERT INTO testimonial (id, customer_name, city, feedback, rating) VALUES (?, ?, ?, ?, ?)', [newUuid(), t.customer_name, t.city, t.feedback, t.rating || 5]);
    bump('testimonials created');
  }
  for (const f of data.faqs || []) {
    const [[have]] = await pool.execute('SELECT id FROM faq WHERE question = ?', [f.question]);
    if (have) { bump('faqs skipped'); continue; }
    if (!DRY) await pool.execute('INSERT INTO faq (id, question, answer, display_order) VALUES (?, ?, ?, ?)', [newUuid(), f.question, f.answer, f.display_order || 0]);
    bump('faqs created');
  }
  if (!flag('skip-blog')) {
    for (const b of data.blog_posts || []) {
      const [[have]] = await pool.execute('SELECT id FROM blog_post WHERE slug = ?', [b.slug]);
      if (have) { bump('blog posts skipped'); continue; }
      if (!DRY) await pool.execute(`INSERT INTO blog_post (id, slug, title, excerpt, content_html, image_url, status, published_at) VALUES (?, ?, ?, ?, ?, ?, 'published', ?)`,
        [newUuid(), b.slug, b.title, b.excerpt ? b.excerpt.slice(0, 500) : null, blogHtml(b.body), b.image_url || null, b.published_at ? new Date(b.published_at) : new Date()]);
      bump('blog posts created');
    }
  }
}

main()
  .then(() => {
    console.log(`${DRY ? 'DRY RUN - nothing written. ' : ''}Import finished:`);
    for (const [k, v] of Object.entries(stat).sort()) console.log(`  ${k}: ${v}`);
  })
  .catch((err) => { console.error('Import failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());

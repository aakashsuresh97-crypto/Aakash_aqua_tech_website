// The catalogue import script: creates everything, is idempotent, never touches prices/stock on re-run, --dry-run writes nothing.
const test = require('node:test');
const assert = require('node:assert');

if (process.env.RUN_DB_TESTS !== '1') {
  test('import DB tests (skipped: set RUN_DB_TESTS=1)', { skip: true }, () => {});
} else {
  const fs = require('fs'); const os = require('os'); const path = require('path'); const { execFileSync } = require('child_process');
  const { pool } = require('../src/config/db');
  const T = Math.random().toString(36).slice(2, 7);
  const fixture = {
    categories: [{ slug: `imp-${T}`, name: `Import Cat ${T}`, sort_order: 10, subs: [{ slug: `impsub-${T}`, name: `Import Sub ${T}`, sort_order: 10 }] }],
    brands: [{ slug: `impbrand-${T}`, name: `Imp Brand ${T}`, logo_url: null, website_url: null, display_order: 1 }],
    products: [
      { slug: `imp-fixed-${T}`, name: `Fixed ${T}`, category: `imp-${T}`, subcategory: `impsub-${T}`, brand: `Imp Brand ${T}`, price: 1000, mrp: 1500, image_url: null, summary: 'S', extra: { features: ['a'], tech: [['Model', 'X']], about: ['p1', 'p2'] } },
      { slug: `imp-quote-${T}`, name: `Quote ${T}`, category: `imp-${T}`, subcategory: `impsub-${T}`, brand: null, price: 0, mrp: 0, image_url: null, summary: 'Q', extra: { np: true, enquiry: true } },
    ],
    spares: [],
    testimonials: [{ customer_name: `Imp ${T}`, city: 'Salem', feedback: `Great ${T}`, rating: 5 }],
    faqs: [{ question: `Q ${T}?`, answer: 'A', display_order: 1 }],
    blog_posts: [{ title: `Post ${T}`, slug: `post-${T}`, published_at: '2026-01-02', excerpt: 'E', image_url: null, body: { lead: 'Lead <b>', sections: [{ h: 'H', p: ['para'], list: ['one'] }] } }],
  };
  const file = path.join(os.tmpdir(), `imp-${T}.json`);
  fs.writeFileSync(file, JSON.stringify(fixture));
  const run = (...a) => execFileSync('node', [path.join(__dirname, '..', 'scripts', 'import-data.js'), file, ...a], { encoding: 'utf8', env: process.env });
  const j = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
  const one = async (sql, p) => (await pool.execute(sql, p))[0][0];

  test.after(async () => {
    const q = (s, p) => pool.query(s, p).catch(() => {});
    await q('DELETE FROM product WHERE slug LIKE ?', [`imp-%-${T}`]);
    const [c] = await pool.query('SELECT id FROM category WHERE category_name = ?', [`Import Cat ${T}`]);
    if (c[0]) {
      await q('DELETE FROM catalog_node WHERE slug IN (?, ?)', [`imp-${T}`, `impsub-${T}`]);
      await q('DELETE FROM subcategory WHERE category_id = ?', [c[0].id]);
      await q('DELETE FROM category WHERE id = ?', [c[0].id]);
    }
    await q('DELETE FROM brand WHERE slug = ?', [`impbrand-${T}`]);
    await q('DELETE FROM testimonial WHERE customer_name = ?', [`Imp ${T}`]);
    await q('DELETE FROM faq WHERE question = ?', [`Q ${T}?`]);
    await q('DELETE FROM blog_post WHERE slug = ?', [`post-${T}`]);
    fs.rmSync(file, { force: true });
    await pool.end();
  });

  test('--dry-run reports but writes nothing', async () => {
    const out = run('--dry-run');
    assert.match(out, /DRY RUN/);
    assert.match(out, /products created \(sold online\): 1/);
    assert.equal(await one('SELECT id FROM product WHERE slug = ?', [`imp-fixed-${T}`]), undefined);
  });

  test('import creates categories, brand, products, content; fixed items are sold online, quote items are enquiry-only', async () => {
    const out = run();
    assert.match(out, /products created \(enquiry only\): 1/);
    const fixed = await one('SELECT * FROM product WHERE slug = ?', [`imp-fixed-${T}`]);
    assert.equal(Number(fixed.selling_price), 1000);
    assert.equal(Number(fixed.mrp), 1500);
    assert.equal(fixed.manage_stock, 0, 'stock is not tracked until the owner sets quantities');
    assert.equal(fixed.stock_status, 'instock');
    assert.equal(Number(fixed.gst_percent), 18);
    assert.deepEqual(j(fixed.specifications), [{ name: 'Model', value: 'X' }]);
    assert.equal(fixed.description, 'p1\n\np2');
    const quote = await one('SELECT * FROM product WHERE slug = ?', [`imp-quote-${T}`]);
    assert.equal(quote.stock_status, 'outofstock', 'cannot be bought through the cart API');
    const extra = await one('SELECT extra FROM product_extra WHERE product_id = ?', [quote.id]);
    assert.equal((typeof extra.extra === 'string' ? JSON.parse(extra.extra) : extra.extra).enquiry, true);
    assert.equal((await one('SELECT slug FROM catalog_node WHERE entity_type = "subcategory" AND slug = ?', [`impsub-${T}`])).slug, `impsub-${T}`);
    const blog = await one('SELECT content_html, status FROM blog_post WHERE slug = ?', [`post-${T}`]);
    assert.equal(blog.status, 'published');
    assert.match(blog.content_html, /<h2>H<\/h2>/);
    assert.ok(!blog.content_html.includes('<b>'), 'text from the data file is escaped');
  });

  test('running it again skips everything and leaves owner-edited prices and stock alone, even with --update', async () => {
    await pool.execute('UPDATE product SET selling_price = 1200, manage_stock = 1, stock_quantity = 7, stock_status = "instock" WHERE slug = ?', [`imp-fixed-${T}`]);
    const again = run();
    assert.match(again, /products skipped: 2/);
    assert.ok(!/created/.test(again.replace(/Import finished/, '')), again);
    run('--update');
    const p = await one('SELECT selling_price, stock_quantity, manage_stock FROM product WHERE slug = ?', [`imp-fixed-${T}`]);
    assert.equal(Number(p.selling_price), 1200);
    assert.equal(p.stock_quantity, 7);
    assert.equal(p.manage_stock, 1);
    assert.equal((await pool.execute('SELECT COUNT(*) AS n FROM product WHERE slug LIKE ?', [`imp-%-${T}`]))[0][0].n, 2);
  });
}

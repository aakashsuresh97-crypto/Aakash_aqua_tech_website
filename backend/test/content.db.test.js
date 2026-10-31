// Storefront content API against a real MySQL: banners, content tables, public catalogue, leads, service requests.
//   RUN_DB_TESTS=1 npm test
const test = require('node:test');
const assert = require('node:assert');

if (process.env.RUN_DB_TESTS !== '1') {
  test('content DB tests (skipped: set RUN_DB_TESTS=1)', { skip: true }, () => {});
} else {
  const h = require('./helpers/site');
  const { api, admin, staff, TAG } = h;
  const created = { categories: [], subcategories: [], products: [] };
  let cat; let sub; let sub2;

  const mkProduct = async (over = {}) => {
    const r = await api('POST', '/api/v1/products', { headers: admin, body: {
      category_id: cat.id, subcategory_id: sub.id, product_name: `Cat Prod ${TAG} ${Math.random().toString(36).slice(2, 6)}`, brand: `Brand${TAG}`,
      mrp: 20000, selling_price: 15000, gst_percent: 18, stock_quantity: 10, low_stock_threshold: 2, ...over } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    created.products.push(r.body.data.id);
    return r.body.data;
  };

  test.before(async () => {
    await h.start();
    const c = await api('POST', '/api/categories', { headers: admin, body: { category_name: `Domestic RO ${TAG}` } });
    cat = c.body.data; created.categories.push(cat.id);
    const s = await api('POST', '/api/subcategories', { headers: admin, body: { category_id: cat.id, subcategory_name: `RO ${TAG}` } });
    sub = s.body.data; created.subcategories.push(sub.id);
    const s2 = await api('POST', '/api/subcategories', { headers: admin, body: { category_id: cat.id, subcategory_name: `UV ${TAG}` } });
    sub2 = s2.body.data; created.subcategories.push(sub2.id);
  });

  test.after(async () => {
    for (const id of created.products) await api('DELETE', `/api/v1/products/${id}?permanent=true`, { headers: admin }).catch(() => {});
    await h.pool.query('DELETE FROM product WHERE id IN (?)', [created.products.length ? created.products : ['x']]);
    for (const id of created.subcategories) await api('DELETE', `/api/subcategories/${id}`, { headers: admin });
    for (const id of created.categories) await api('DELETE', `/api/categories/${id}`, { headers: admin });
    await h.pool.query(`DELETE FROM catalog_node WHERE slug LIKE ?`, [`%${TAG}%`]);
    await h.pool.query(`DELETE FROM leads WHERE first_name LIKE ?`, [`%${TAG}%`]);
    await h.pool.query(`DELETE FROM service_request WHERE name LIKE ?`, [`%${TAG}%`]);
    for (const [t, col] of [['banner', 'title'], ['testimonial', 'customer_name'], ['brand', 'name'], ['faq', 'question'], ['zone', 'name'], ['static_page', 'title'], ['blog_post', 'title'], ['amc_plan', 'name']]) {
      await h.pool.query(`DELETE FROM ${t} WHERE ${col} LIKE ?`, [`%${TAG}%`]);
    }
    await h.stop();
  });

  // ------------------------------------------------------------ auth on the admin side of every content module
  test('content: every admin write route needs a login; staff cannot delete', async () => {
    for (const path of ['banners', 'testimonials', 'brands', 'faqs', 'zones', 'pages', 'blog-posts', 'amc-plans']) {
      assert.equal((await api('POST', `/api/${path}`, { body: {} })).status, 401, path);
      assert.equal((await api('GET', `/api/${path}`)).status, 401, `${path} list is admin only`);
      assert.equal((await api('DELETE', `/api/${path}/36a8b30f-e1bc-4118-918d-b7834393e55f`, { headers: staff })).status, 403, path);
    }
    for (const path of ['leads', 'service-requests', 'orders', 'dashboard/summary', 'catalog-nodes']) assert.equal((await api('GET', `/api/${path}`)).status, 401, path);
  });

  // ------------------------------------------------------------ banners
  test('banner: create, validate, edit, schedule, public only shows live ones, delete', async () => {
    const bad = await api('POST', '/api/banners', { headers: admin, body: { title: '', image_url: 'javascript:alert(1)' } });
    assert.equal(bad.status, 400);
    assert.ok(bad.body.errors.length >= 2);

    const a = await api('POST', '/api/banners', { headers: staff, body: { title: `Diwali ${TAG}`, image_url: 'https://cdn.example.com/a.jpg', link_url: '/shop/domestic', display_order: 2, button_text: 'Shop now' } });
    assert.equal(a.status, 201);
    assert.match(a.body.data.id, /^[0-9a-f-]{36}$/);
    assert.equal(a.body.data.status, 1);
    const b = await api('POST', '/api/banners', { headers: admin, body: { title: `First ${TAG}`, image_url: '/uploads/categories/x.jpg', display_order: 1 } });
    const off = await api('POST', '/api/banners', { headers: admin, body: { title: `Off ${TAG}`, image_url: 'https://cdn.example.com/c.jpg', status: 0 } });
    const future = await api('POST', '/api/banners', { headers: admin, body: { title: `Future ${TAG}`, image_url: 'https://cdn.example.com/d.jpg', starts_at: new Date(Date.now() + 86400000).toISOString() } });
    const expired = await api('POST', '/api/banners', { headers: admin, body: { title: `Expired ${TAG}`, image_url: 'https://cdn.example.com/e.jpg', ends_at: new Date(Date.now() - 86400000).toISOString() } });
    assert.equal((await api('POST', '/api/banners', { headers: admin, body: { title: `X ${TAG}`, image_url: 'https://a/b.jpg', starts_at: '2030-01-02T00:00:00Z', ends_at: '2030-01-01T00:00:00Z' } })).status, 400);

    const pub = await api('GET', '/api/public/banners');
    const titles = pub.body.data.map((x) => x.title).filter((t) => t.includes(TAG));
    assert.deepEqual(titles, [`First ${TAG}`, `Diwali ${TAG}`], 'ordered by display_order; inactive / future / expired are hidden');

    const upd = await api('PATCH', `/api/banners/${a.body.data.id}`, { headers: admin, body: { title: `Diwali Sale ${TAG}`, status: 'inactive' } });
    assert.equal(upd.body.data.title, `Diwali Sale ${TAG}`);
    assert.equal(upd.body.data.status, 0);
    assert.equal((await api('PATCH', `/api/banners/${a.body.data.id}`, { headers: admin, body: {} })).status, 400);
    const list = await api('GET', '/api/banners', { headers: admin, query: { search: TAG, status: '0' } });
    assert.ok(list.body.meta.total >= 2 && list.body.data.every((x) => x.status === 0));
    assert.equal((await api('GET', '/api/banners/not-a-uuid', { headers: admin })).status, 400);
    assert.equal((await api('GET', '/api/banners/36a8b30f-e1bc-4118-918d-b7834393e55f', { headers: admin })).status, 404);
    assert.equal((await api('DELETE', `/api/banners/${b.body.data.id}`, { headers: admin })).status, 200);
    assert.equal((await api('DELETE', `/api/banners/${b.body.data.id}`, { headers: admin })).status, 404);
    void off; void future; void expired;
  });

  // ------------------------------------------------------------ content tables
  test('content: testimonials, brands (unique slug), FAQs, zones, AMC plans, with public reads', async () => {
    const t = await api('POST', '/api/testimonials', { headers: admin, body: { customer_name: `Ramesh ${TAG}`, city: 'Salem', feedback: 'Great service', rating: 5 } });
    assert.equal(t.status, 201);
    assert.equal((await api('POST', '/api/testimonials', { headers: admin, body: { customer_name: 'x', feedback: 'y', rating: 9 } })).status, 400);
    assert.ok((await api('GET', '/api/public/testimonials')).body.data.some((x) => x.id === t.body.data.id));

    const b = await api('POST', '/api/brands', { headers: admin, body: { name: `Kent ${TAG}`, logo_url: 'https://x.test/kent.png' } });
    assert.equal(b.status, 201);
    assert.equal(b.body.data.slug, `kent-${TAG}`, 'slug is generated from the name');
    const dup = await api('POST', '/api/brands', { headers: admin, body: { name: `Other ${TAG}`, slug: `kent-${TAG}` } });
    assert.equal(dup.status, 409);
    assert.match(dup.body.message, /slug/);
    assert.equal((await api('PATCH', `/api/brands/${b.body.data.id}`, { headers: admin, body: { name: `Kent ${TAG}`, slug: '' } })).body.data.slug, `kent-${TAG}`, 'an empty slug keeps the stored one');
    assert.equal((await api('PATCH', `/api/brands/${b.body.data.id}`, { headers: admin, body: { slug: 'Bad Slug!' } })).status, 400);

    const f = await api('POST', '/api/faqs', { headers: admin, body: { question: `Do I need RO? ${TAG}`, answer: 'Yes if TDS is high.', topic: 'ro' } });
    assert.equal(f.status, 201);
    assert.ok((await api('GET', '/api/public/faqs', { query: { topic: 'ro' } })).body.data.some((x) => x.id === f.body.data.id));

    const z = await api('POST', '/api/zones', { headers: admin, body: { name: `Salem ${TAG}`, state: 'Tamil Nadu', pin_codes: '636001,636002' } });
    assert.equal(z.status, 201);
    assert.equal((await api('POST', '/api/zones', { headers: admin, body: { name: `Salem ${TAG}` } })).status, 409);

    const p = await api('POST', '/api/amc-plans', { headers: admin, body: { name: `Gold ${TAG}`, price: '2499.00', duration_months: 12, features: 'Quarterly visits\nFree filters' } });
    assert.equal(p.status, 201);
    assert.equal(Number(p.body.data.price), 2499);
    assert.equal((await api('POST', '/api/amc-plans', { headers: admin, body: { name: `Bad ${TAG}`, price: -5 } })).status, 400);
    assert.ok((await api('GET', '/api/public/amc-plans')).body.data.some((x) => x.id === p.body.data.id));
  });

  test('content: static pages are sanitised and served by slug; inactive pages are hidden', async () => {
    const slug = `privacy-${TAG}`;
    const r = await api('POST', '/api/pages', { headers: admin, body: { slug, title: `Privacy ${TAG}`, content_html: '<h2 class="x">Hello</h2><script>alert(1)</script><p onclick="evil()">Text <a href="javascript:evil()">bad</a> <a href="https://ok.test">ok</a></p><img src="x" onerror="evil()">' } });
    assert.equal(r.status, 201);
    const html = r.body.data.content_html;
    assert.ok(!/script|onclick|onerror|javascript:/i.test(html), html);
    assert.ok(html.includes('<h2 class="x">Hello</h2>') && html.includes('https://ok.test') && html.includes('rel="noopener noreferrer"'));
    assert.equal((await api('POST', '/api/pages', { headers: admin, body: { slug, title: 'dup', content_html: '<p>x</p>' } })).status, 409);
    const pub = await api('GET', `/api/public/pages/${slug}`);
    assert.equal(pub.status, 200);
    assert.equal(pub.body.data.title, `Privacy ${TAG}`);
    await api('PATCH', `/api/pages/${r.body.data.id}`, { headers: admin, body: { status: 0 } });
    assert.equal((await api('GET', `/api/public/pages/${slug}`)).status, 404);
  });

  test('blog: drafts are private, publishing makes a post public, slug is generated, list omits the body', async () => {
    const r = await api('POST', '/api/blog-posts', { headers: admin, body: { title: `Benefits of AMC ${TAG}`, excerpt: 'Why AMC', content_html: '<p>Full body</p>', seo_title: 'AMC benefits' } });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.status, 'draft');
    assert.equal(r.body.data.slug, `benefits-of-amc-${TAG}`);
    assert.equal((await api('GET', `/api/public/blog/${r.body.data.slug}`)).status, 404, 'draft is hidden');
    const pubd = await api('PATCH', `/api/blog-posts/${r.body.data.id}`, { headers: admin, body: { status: 'published' } });
    assert.ok(pubd.body.data.published_at, 'publishing without a date uses now');
    const one = await api('GET', `/api/public/blog/${r.body.data.slug}`);
    assert.equal(one.status, 200);
    assert.ok(one.body.data.content_html.includes('Full body'));
    const list = await api('GET', '/api/public/blog');
    const item = list.body.data.find((x) => x.slug === r.body.data.slug);
    assert.ok(item && item.content_html === undefined, 'list view has no body');
    const second = await api('POST', '/api/blog-posts', { headers: admin, body: { title: `Benefits of AMC ${TAG}`, content_html: '<p>x</p>' } });
    assert.equal(second.body.data.slug, `benefits-of-amc-${TAG}-2`, 'same title gets the next free slug');
    const future = await api('POST', '/api/blog-posts', { headers: admin, body: { title: `Scheduled ${TAG}`, content_html: '<p>x</p>', status: 'published', published_at: new Date(Date.now() + 86400000).toISOString() } });
    assert.equal((await api('GET', `/api/public/blog/${future.body.data.slug}`)).status, 404, 'scheduled for the future');
  });

  // ------------------------------------------------------------ public catalogue
  test('public catalogue: tree with slugs, only published products, filters, sort, search, detail + related', async () => {
    const p1 = await mkProduct({ product_name: `Alpha ${TAG}`, selling_price: 10000, mrp: 12000 });
    const p2 = await mkProduct({ product_name: `Beta ${TAG}`, selling_price: 20000, mrp: 25000, brand: `Other${TAG}`, stock_quantity: 0 });
    const p3 = await mkProduct({ product_name: `Gamma ${TAG}`, subcategory_id: sub2.id, selling_price: 5000, mrp: 6000 });
    const draft = await mkProduct({ product_name: `Hidden ${TAG}`, publish_status: 'draft' });

    const tree = (await api('GET', '/api/public/catalog')).body.data.categories.find((c) => c.id === cat.id);
    assert.equal(tree.slug, `domestic-ro-${TAG}`);
    assert.equal(tree.subcategories.length, 2);

    const q = (query) => api('GET', '/api/public/products', { query: { category: tree.slug, ...query } });
    let r = await q({});
    assert.deepEqual(r.body.data.map((x) => x.name).sort(), [`Alpha ${TAG}`, `Beta ${TAG}`, `Gamma ${TAG}`], 'draft product is never public');
    assert.ok(!JSON.stringify(r.body).includes('stock_quantity'), 'raw stock numbers are not exposed');
    r = await q({ subcategory: tree.subcategories.find((s) => s.id === sub2.id).slug });
    assert.deepEqual(r.body.data.map((x) => x.name), [`Gamma ${TAG}`]);
    r = await q({ brand: `Other${TAG}` });
    assert.deepEqual(r.body.data.map((x) => x.name), [`Beta ${TAG}`]);
    r = await q({ min_price: 8000, max_price: 15000 });
    assert.deepEqual(r.body.data.map((x) => x.name), [`Alpha ${TAG}`]);
    r = await q({ stock: 'in' });
    assert.ok(!r.body.data.some((x) => x.name === `Beta ${TAG}`) && r.body.data.length === 2);
    r = await q({ sort: 'price_desc' });
    assert.deepEqual(r.body.data.map((x) => x.price), [20000, 10000, 5000]);
    r = await q({ search: 'gamma' });
    assert.deepEqual(r.body.data.map((x) => x.name), [`Gamma ${TAG}`]);
    assert.equal((await q({ min_price: 'abc' })).status, 400);
    assert.equal((await api('GET', '/api/public/products', { query: { category: 'nope' } })).body.data.length, 0);
    const paged = await q({ limit: 2, page: 2 });
    assert.equal(paged.body.data.length, 1);
    assert.equal(paged.body.meta.total, 3);

    const detail = await api('GET', `/api/public/products/${p1.slug}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.price, 10000);
    assert.equal(detail.body.data.in_stock, true);
    assert.equal(detail.body.data.category.slug, tree.slug);
    assert.deepEqual(detail.body.data.related.map((x) => x.name), [`Beta ${TAG}`].filter(() => true), 'related = same subcategory, not itself');
    assert.equal((await api('GET', `/api/public/products/${draft.slug}`)).status, 404);
    assert.equal((await api('GET', `/api/public/products/${p2.slug}`)).body.data.in_stock, false);

    const s = await api('GET', '/api/public/search', { query: { q: `alpha ${TAG}` } });
    assert.equal(s.body.data.products[0].slug, p1.slug);
    assert.equal((await api('GET', '/api/public/search', { query: { q: 'a' } })).body.data.products.length, 0, 'needs 2+ characters');
    const cs = await api('GET', '/api/public/search', { query: { q: `uv ${TAG}` } });
    assert.ok(cs.body.data.categories.some((c) => c.id === sub2.id));
    void p3;
  });

  test('public catalogue: extra JSON is returned with include=extra; catalog nodes control slug and order', async () => {
    const p = await mkProduct({ product_name: `Extra ${TAG}` });
    await h.pool.execute('INSERT INTO product_extra (product_id, extra) VALUES (?, ?)', [p.id, JSON.stringify({ features: ['Free installation'], tech: [['Model', 'X']] })]);
    const r = await api('GET', '/api/public/products', { query: { category: `domestic-ro-${TAG}`, search: `Extra ${TAG}`, include: 'extra' } });
    assert.deepEqual(r.body.data[0].extra.features, ['Free installation']);
    assert.equal((await api('GET', `/api/public/products/${p.slug}`)).body.data.extra.tech[0][1], 'X');

    const nodes = await api('GET', '/api/catalog-nodes', { headers: admin });
    assert.ok(nodes.body.data.categories.some((c) => c.id === cat.id));
    const set = await api('PUT', `/api/catalog-nodes/categories/${cat.id}`, { headers: staff, body: { slug: `ro-${TAG}`, sort_order: -5, show_in_menu: false } });
    assert.equal(set.status, 200, JSON.stringify(set.body));
    const tree = (await api('GET', '/api/public/catalog')).body.data.categories;
    assert.equal(tree[0].id, cat.id, 'sort_order -5 puts it first');
    assert.equal(tree[0].slug, `ro-${TAG}`);
    assert.equal(tree[0].show_in_menu, false);
    assert.equal((await api('GET', '/api/public/products', { query: { category: `ro-${TAG}` } })).body.meta.total > 0, true);
    assert.equal((await api('PUT', `/api/catalog-nodes/categories/${cat.id}`, { headers: admin, body: { slug: 'BAD SLUG' } })).status, 400);
    assert.equal((await api('PUT', `/api/catalog-nodes/categories/${cat.id}`, { body: { slug: 'x' } })).status, 401);
    const other = await api('PUT', `/api/catalog-nodes/subcategories/${sub.id}`, { headers: admin, body: { slug: `sub-${TAG}` } });
    assert.equal(other.status, 200);
    assert.equal((await api('PUT', `/api/catalog-nodes/subcategories/${sub2.id}`, { headers: admin, body: { slug: `sub-${TAG}` } })).status, 409, 'slugs are unique');
  });

  // ------------------------------------------------------------ leads
  const DEMO = { first_name: `Asha ${TAG}`, last_name: 'K', mobile: '+91 98765-43210', city: 'Salem', pin_code: '636016', interest: 'Water Purifier', address: '1 Main Rd', terms_accepted: true };

  test('leads: demo form validates, stores a clean record and fires the notification hook', async () => {
    const before = h.notifier.emitted.length;
    const ok = await api('POST', '/api/public/leads', { body: DEMO });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    const [[row]] = await h.pool.execute('SELECT * FROM leads WHERE id = ?', [ok.body.data.id]);
    assert.equal(row.mobile, '9876543210');
    assert.equal(row.source, 'demo');
    assert.equal(row.status, 'new');
    assert.equal(row.terms_accepted, 1);
    assert.ok(h.notifier.emitted.length > before && h.notifier.emitted.at(-1).event === 'lead.created');

    for (const [patch, msg] of [
      [{ first_name: '' }, /first_name/], [{ mobile: '12345' }, /mobile/], [{ pin_code: '12' }, /pin_code/], [{ interest: 'Pizza' }, /interest/],
      [{ terms_accepted: false }, /terms/], [{ city: '' }, /city/],
    ]) {
      const bad = await api('POST', '/api/public/leads', { body: { ...DEMO, ...patch } });
      assert.equal(bad.status, 400, JSON.stringify(patch));
      assert.ok(bad.body.errors.some((e) => msg.test(e)), `${JSON.stringify(patch)} -> ${bad.body.errors}`);
    }
  });

  test('leads: the honeypot field silently drops bot submissions; contact form works', async () => {
    const [[{ n0: before }]] = await h.pool.execute('SELECT COUNT(*) AS n0 FROM leads WHERE first_name LIKE ?', [`%${TAG}%`]);
    const bot = await api('POST', '/api/public/leads', { body: { ...DEMO, first_name: `Bot ${TAG}`, company_website: 'http://spam.example' } });
    assert.equal(bot.status, 201, 'the bot is told it worked');
    const [[{ n1: after }]] = await h.pool.execute('SELECT COUNT(*) AS n1 FROM leads WHERE first_name LIKE ?', [`%${TAG}%`]);
    assert.equal(after, before, 'but nothing was stored');
    const c = await api('POST', '/api/public/contact', { body: { first_name: `Meena ${TAG}`, mobile: '9123456780', email: 'm@example.com', message: 'Need a quote for an RO plant' } });
    assert.equal(c.status, 201);
    assert.equal((await api('POST', '/api/public/contact', { body: { first_name: 'x', mobile: '9123456780' } })).status, 400, 'message is required');
  });

  test('leads: admin list with filters, edit status and notes, delete (admin only)', async () => {
    const a = await api('POST', '/api/public/leads', { body: { ...DEMO, first_name: `Zed ${TAG}`, city: 'Coimbatore', interest: 'Water Softener' } });
    const list = await api('GET', '/api/leads', { headers: staff, query: { search: `Zed ${TAG}` } });
    assert.equal(list.body.meta.total, 1);
    assert.equal((await api('GET', '/api/leads', { headers: admin, query: { interest: 'Water Softener', status: 'new', source: 'demo', search: TAG } })).body.data.every((l) => l.interest === 'Water Softener'), true);
    const today = new Date().toISOString().slice(0, 10);
    assert.ok((await api('GET', '/api/leads', { headers: admin, query: { from: today, to: today, search: TAG } })).body.meta.total >= 1);
    assert.equal((await api('GET', '/api/leads', { headers: admin, query: { status: 'weird' } })).status, 400);
    const u = await api('PATCH', `/api/leads/${a.body.data.id}`, { headers: staff, body: { status: 'contacted', notes: 'Called, demo on Friday' } });
    assert.equal(u.body.data.status, 'contacted');
    assert.equal(u.body.data.notes, 'Called, demo on Friday');
    assert.equal((await api('PATCH', `/api/leads/${a.body.data.id}`, { headers: staff, body: { first_name: 'hack' } })).status, 400, 'only status and notes are editable');
    assert.equal((await api('DELETE', `/api/leads/${a.body.data.id}`, { headers: staff })).status, 403);
    assert.equal((await api('DELETE', `/api/leads/${a.body.data.id}`, { headers: admin })).status, 200);
    assert.equal((await api('GET', `/api/leads/${a.body.data.id}`, { headers: admin })).status, 404);
  });

  // ------------------------------------------------------------ service requests
  test('service requests: public form, honeypot, validation, AMC plan link, admin assignment moves it on', async () => {
    const plan = await api('POST', '/api/amc-plans', { headers: admin, body: { name: `Silver ${TAG}`, price: 1999 } });
    const ok = await api('POST', '/api/public/service-requests', { body: { name: `Kavi ${TAG}`, mobile: '9000011111', city: 'Salem', service_type: 'amc', product_note: 'Kent Grand', amc_plan_id: plan.body.data.id } });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    assert.equal((await api('POST', '/api/public/service-requests', { body: { name: `Kavi ${TAG}`, mobile: '123' } })).status, 400);
    assert.equal((await api('POST', '/api/public/service-requests', { body: { name: `Kavi ${TAG}`, mobile: '9000011111', preferred_date: '2001-01-01' } })).status, 400);
    assert.equal((await api('POST', '/api/public/service-requests', { body: { name: `Kavi ${TAG}`, mobile: '9000011111', amc_plan_id: '36a8b30f-e1bc-4118-918d-b7834393e55f' } })).status, 400);
    const bot = await api('POST', '/api/public/service-requests', { body: { name: `Bot ${TAG}`, mobile: '9000011111', company_website: 'x' } });
    assert.equal(bot.status, 201);
    assert.equal((await h.pool.execute('SELECT 1 FROM service_request WHERE name = ?', [`Bot ${TAG}`]))[0].length, 0);

    const asg = await api('PATCH', `/api/service-requests/${ok.body.data.id}`, { headers: staff, body: { assigned_to: 'Gubenthiran' } });
    assert.equal(asg.body.data.status, 'assigned');
    const done = await api('PATCH', `/api/service-requests/${ok.body.data.id}`, { headers: staff, body: { status: 'completed', admin_notes: 'Filters changed' } });
    assert.equal(done.body.data.status, 'completed');
    assert.equal((await api('GET', '/api/service-requests', { headers: admin, query: { status: 'completed', search: 'Gubenthiran' } })).body.meta.total, 1);
    assert.equal((await api('DELETE', `/api/service-requests/${ok.body.data.id}`, { headers: staff })).status, 403);
    assert.equal((await api('DELETE', `/api/service-requests/${ok.body.data.id}`, { headers: admin })).status, 200);
  });

  // ------------------------------------------------------------ images
  test('uploads: an image used by a banner is protected from the "discard upload" endpoint', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const fd = new FormData();
    fd.append('image', new Blob([png], { type: 'image/png' }), 'b.png');
    const up = await fetch(`${h.base}/api/uploads/images`, { method: 'POST', headers: admin, body: fd });
    assert.equal(up.status, 201);
    const { url, filename } = (await up.json()).data;
    const banner = await api('POST', '/api/banners', { headers: admin, body: { title: `Img ${TAG}`, image_url: url } });
    assert.equal(banner.status, 201);
    const del = await api('DELETE', `/api/uploads/images/${filename}`, { headers: admin });
    assert.equal(del.status, 409, 'still referenced by a banner');
    await api('DELETE', `/api/banners/${banner.body.data.id}`, { headers: admin });
    assert.equal((await api('DELETE', `/api/uploads/images/${filename}`, { headers: admin })).status, 200, 'unreferenced now');
  });

  test('dashboard: returns the counts the admin home screen needs', async () => {
    await mkProduct({ product_name: `Low ${TAG}`, stock_quantity: 1, low_stock_threshold: 3 });
    const r = await api('GET', '/api/dashboard/summary', { headers: staff });
    assert.equal(r.status, 200);
    for (const k of ['today_leads', 'today_orders', 'today_service_requests', 'low_stock_products', 'pending_orders', 'new_leads']) assert.equal(typeof r.body.data[k], 'number', k);
    assert.ok(r.body.data.today_leads >= 1 && r.body.data.low_stock_products >= 1);
    assert.ok(r.body.data.low_stock_list.some((p) => p.product_name === `Low ${TAG}`));
  });
}

// Integration tests of the Product API against your REAL MySQL database (.env).
// Opt-in so that `npm test` still works without a database:
//   Windows (cmd):  set RUN_DB_TESTS=1 && npm test
//   PowerShell:     $env:RUN_DB_TESTS=1; npm test
//   macOS/Linux:    RUN_DB_TESTS=1 npm test
// It creates its own categories/subcategories/products named "zz-test-..." and removes them at the end.
// Run `npm run migrate` and `node scripts/migrate-product.js` first so the tables exist.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { adminAuth } = require('./helpers/auth'); // sets JWT_SECRET (must come before ../src/app)

const RUN = process.env.RUN_DB_TESTS === '1';
if (!RUN) {
  test('product DB tests (skipped: set RUN_DB_TESTS=1 to run them against your database)', { skip: true }, () => {});
} else {
  process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'prod-uploads-'));
  const { pool } = require('../src/config/db');
  const app = require('../src/app');

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const tag = `zz-test-${Date.now().toString(36)}`;
  const P = '/api/v1/products';
  let server, base, catA, catB, subA, subA2, subB;
  const created = []; // every product id created here

  const call = async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...adminAuth }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  const stockOf = async (id) => Number((await pool.query('SELECT stock_quantity AS s FROM product WHERE id = ?', [id]))[0][0].s);

  const valid = (over = {}) => ({
    category_id: catA.id, subcategory_id: subA.id, product_name: `${tag}-purifier`, brand: 'Kent',
    mrp: 1000, selling_price: 800, gst_percent: 18, description: 'A test product', image_url: 'https://example.com/p.png',
    stock_quantity: 10, specifications: { Capacity: '8 L', Warranty: '1 year' }, ...over,
  });
  const make = async (over) => {
    const r = await call('POST', P, valid(over));
    assert.strictEqual(r.status, 201, JSON.stringify(r.body));
    created.push(r.body.data.id);
    return r.body.data;
  };

  test.before(async () => {
    await new Promise((r) => { server = app.listen(0, r); });
    base = `http://127.0.0.1:${server.address().port}`;
    catA = (await call('POST', '/api/categories', { category_name: `${tag}-A` })).body.data;
    catB = (await call('POST', '/api/categories', { category_name: `${tag}-B` })).body.data;
    subA = (await call('POST', '/api/subcategories', { category_id: catA.id, subcategory_name: `${tag}-A1` })).body.data;
    subA2 = (await call('POST', '/api/subcategories', { category_id: catA.id, subcategory_name: `${tag}-A2` })).body.data;
    subB = (await call('POST', '/api/subcategories', { category_id: catB.id, subcategory_name: `${tag}-B1` })).body.data;
  });

  test.after(async () => {
    await pool.query('DELETE FROM product WHERE category_id IN (?)', [[catA.id, catB.id]]);
    for (const s of [subA, subA2, subB]) await call('DELETE', `/api/subcategories/${s.id}`);
    await call('DELETE', `/api/categories/${catA.id}`);
    await call('DELETE', `/api/categories/${catB.id}`);
    await new Promise((r) => server.close(r));
    await pool.end();
    fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
  });

  // ------------------------------------------------------------------ create
  test('create: UUID id, joined names, calculated discount, ordered specifications, defaults', async () => {
    const r = await call('POST', P, valid({ mrp: 22000, selling_price: 18999.5, stock_quantity: 25, specifications: { Capacity: '8 L', Warranty: '1 year', Technology: 'RO+UV' } }));
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.success, true);
    assert.strictEqual(r.body.message, 'Product created successfully');
    const p = r.body.data;
    created.push(p.id);
    assert.match(p.id, UUID_RE);
    assert.strictEqual(typeof p.id, 'string');
    assert.deepStrictEqual([p.category_id, p.category_name, p.subcategory_id, p.subcategory_name], [catA.id, catA.category_name, subA.id, subA.subcategory_name]);
    assert.deepStrictEqual([p.mrp, p.selling_price, p.discount_amount, p.discount_percent, p.gst_percent], [22000, 18999.5, 3000.5, 13.64, 18]);
    assert.strictEqual(p.stock_quantity, 25);
    assert.strictEqual(p.in_stock, true);
    assert.strictEqual(p.status, 1);
    assert.strictEqual(p.image_url, 'https://example.com/p.png');
    assert.deepStrictEqual(p.specifications.map((s) => s.name), ['Capacity', 'Warranty', 'Technology']); // order kept
    assert.ok(p.created_at && p.updated_at);
  });

  test('create: every product gets a different UUID; a client-supplied id is ignored', async () => {
    const a = await make({ id: '11111111-1111-4111-8111-111111111111' });
    const b = await make();
    assert.notStrictEqual(a.id, b.id);
    assert.notStrictEqual(a.id, '11111111-1111-4111-8111-111111111111');
  });

  test('create: optional fields may be omitted; specifications accepted as an ordered list; numeric strings accepted', async () => {
    const r = await call('POST', P, { category_id: catA.id, subcategory_id: subA.id, product_name: `${tag}-minimal`, mrp: '500.50', selling_price: '500.50', gst_percent: '5', stock_quantity: '3', specifications: [{ name: 'Color', value: 'Blue' }, { name: 'Weight', value: 2 }] });
    assert.strictEqual(r.status, 201, JSON.stringify(r.body));
    created.push(r.body.data.id);
    const p = r.body.data;
    assert.deepStrictEqual([p.brand, p.description, p.image_url, p.discount_amount, p.discount_percent], [null, null, null, 0, 0]);
    assert.deepStrictEqual(p.specifications, [{ name: 'Color', value: 'Blue' }, { name: 'Weight', value: '2' }]);
    assert.strictEqual(p.stock_quantity, 3);
  });

  test('create: category and subcategory ids are validated against MySQL', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    let r = await call('POST', P, valid({ category_id: missing }));
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.errors.includes('category_id does not match any existing category'));

    r = await call('POST', P, valid({ subcategory_id: missing }));
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.errors.includes('subcategory_id does not match any existing subcategory'));

    // subcategory exists but belongs to another category
    r = await call('POST', P, valid({ category_id: catA.id, subcategory_id: subB.id }));
    assert.strictEqual(r.status, 400);
    assert.deepStrictEqual(r.body.errors, ['subcategory_id does not belong to the given category_id']);

    r = await call('POST', P, valid({ category_id: 'abc', subcategory_id: 12 }));
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.errors.includes('category_id must be a valid UUID') && r.body.errors.includes('subcategory_id must be a valid UUID'));
  });

  test('create: field validation', async () => {
    const bad = async (over, expected) => {
      const r = await call('POST', P, valid(over));
      assert.strictEqual(r.status, 400, `expected 400 for ${JSON.stringify(over)}`);
      assert.strictEqual(r.body.success, false);
      assert.strictEqual(r.body.message, 'Validation failed');
      assert.ok(r.body.errors.some((e) => e.includes(expected)), `${expected} not in ${JSON.stringify(r.body.errors)}`);
    };
    await bad({ product_name: 'x' }, 'product_name');
    await bad({ product_name: undefined }, 'product_name is required');
    await bad({ mrp: 0 }, 'mrp must be');
    await bad({ mrp: undefined }, 'mrp is required');
    await bad({ mrp: 10.999, selling_price: 5 }, 'mrp must be');
    await bad({ mrp: 'abc' }, 'mrp must be');
    await bad({ selling_price: 1500 }, 'selling_price cannot be greater than mrp');
    await bad({ selling_price: -1 }, 'selling_price must be');
    await bad({ gst_percent: 101 }, 'gst_percent must be');
    await bad({ gst_percent: undefined }, 'gst_percent is required');
    await bad({ stock_quantity: -1 }, 'stock_quantity must be');
    await bad({ stock_quantity: 1.5 }, 'stock_quantity must be');
    await bad({ stock_quantity: undefined }, 'stock_quantity is required');
    await bad({ discount_percent: 50 }, 'does not match mrp and selling_price');
    await bad({ status: 'maybe' }, 'status must be');
    await bad({ image_url: 'data:image/png;base64,AAAA' }, 'not embedded image data');
    await bad({ image_url: 'ftp://x/y.png' }, 'image_url must start with');
    await bad({ image_url: `https://example.com/${'a'.repeat(500)}` }, 'at most 500');
    await bad({ specifications: 'big' }, 'specifications must be');
    await bad({ specifications: [{ name: 'A', value: '1' }, { name: 'a', value: '2' }] }, 'more than once');
    await bad({ brand: 'x'.repeat(101) }, 'brand');
  });

  test('create: a matching discount_percent is accepted; malformed JSON and empty body are 400', async () => {
    const p = await make({ mrp: 1000, selling_price: 800, discount_percent: 20 });
    assert.strictEqual(p.discount_percent, 20);
    const res = await fetch(base + P, { method: 'POST', headers: { 'Content-Type': 'application/json', ...adminAuth }, body: '{bad' });
    assert.strictEqual(res.status, 400);
    const r = await call('POST', P, {});
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.errors.length >= 6); // subcategory is optional (migration 017), so an empty body has 6 errors
  });

  test('create: image is stored as a string (VARCHAR), not binary', async () => {
    const p = await make({ image_url: '/uploads/categories/36a8b30f-e1bc-4118-918d-b7834393e55f.png' });
    const [[col]] = await pool.query(`SELECT DATA_TYPE AS t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product' AND COLUMN_NAME = 'image_url'`);
    assert.strictEqual(col.t, 'varchar');
    assert.strictEqual(p.image_url, '/uploads/categories/36a8b30f-e1bc-4118-918d-b7834393e55f.png');
  });

  // ------------------------------------------------------------------ get by id
  test('get by id: full details + actions; 404 for unknown; 400 for bad id', async () => {
    const p = await make();
    const r = await call('GET', `${P}/${p.id}`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.success, true);
    assert.strictEqual(r.body.data.id, p.id);
    assert.strictEqual(r.body.data.category_name, catA.category_name);
    assert.strictEqual(r.body.data.actions.add_to_cart.enabled, true);

    // upper-case UUID is accepted (stored lower case)
    assert.strictEqual((await call('GET', `${P}/${p.id.toUpperCase()}`)).status, 200);

    const nf = await call('GET', `${P}/00000000-0000-4000-8000-000000000000`);
    assert.strictEqual(nf.status, 404);
    assert.strictEqual(nf.body.success, false);
    assert.match(nf.body.message, /not found/);

    const bad = await call('GET', `${P}/abc`);
    assert.strictEqual(bad.status, 400);
    assert.strictEqual(bad.body.message, 'Invalid product id');
  });

  // ------------------------------------------------------------------ page
  describe_page();
  function describe_page() {
    let items; // dataset for the page tests, created once

    test('page: set up a dataset', async () => {
      items = {
        a: await make({ product_name: `${tag} Alpha RO`, brand: `${tag}-Kent`, mrp: 20000, selling_price: 15000, stock_quantity: 5 }),
        b: await make({ product_name: `${tag} Beta UV`, brand: `${tag}-Aquaguard`, mrp: 12000, selling_price: 9000, stock_quantity: 8, subcategory_id: subA2.id, description: 'special-needle desc' }),
        c: await make({ product_name: `${tag} Gamma`, brand: `${tag}-kent`, mrp: 5000, selling_price: 4500, stock_quantity: 0 }), // out of stock, brand in other case
        d: await make({ product_name: `${tag} Delta`, brand: `${tag}-Pureit`, mrp: 3000, selling_price: 2500, stock_quantity: 4, status: 0 }), // inactive
        e: await make({ product_name: `${tag} 100%_off`, brand: `${tag}-Livpure`, mrp: 700, selling_price: 600, stock_quantity: 2 }),
        f: await make({ product_name: `${tag} Other category`, brand: `${tag}-Kent`, category_id: catB.id, subcategory_id: subB.id, mrp: 800, selling_price: 700, stock_quantity: 9 }),
      };
    });

    const page = async (qs) => {
      const r = await call('GET', `${P}/page?${qs}`);
      assert.strictEqual(r.status, 200, JSON.stringify(r.body));
      return r.body;
    };
    const mine = (qs) => page(`${qs}&search=${tag}`); // limit every query to this test run's data

    test('page: example request works and every product has all required details + actions', async () => {
      const body = await page('page=1&limit=20');
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.data) && body.data.length > 0);
      assert.deepStrictEqual(Object.keys(body.meta).sort(), ['limit', 'page', 'total', 'totalPages']);
      for (const p of body.data) {
        for (const k of ['id', 'category_id', 'category_name', 'subcategory_id', 'subcategory_name', 'product_name', 'brand', 'mrp', 'selling_price',
          'discount_amount', 'discount_percent', 'gst_percent', 'description', 'image_url', 'stock_quantity', 'in_stock', 'specifications', 'status', 'actions']) {
          assert.ok(k in p, `product is missing ${k}`);
        }
        assert.match(p.id, UUID_RE);
        assert.ok(p.actions.add_to_cart && p.actions.buy_now);
        for (const a of [p.actions.add_to_cart, p.actions.buy_now]) {
          assert.deepStrictEqual(Object.keys(a).sort(), ['body', 'default_quantity', 'disabled_reason', 'enabled', 'endpoint', 'label', 'max_quantity', 'method', 'min_quantity', 'visible', 'completes_purchase'].filter((k) => k !== 'completes_purchase' || a === p.actions.buy_now).sort());
          assert.strictEqual(a.method, 'POST');
        }
        assert.strictEqual(p.actions.add_to_cart.endpoint, `${P}/${p.id}/add-to-cart`);
        assert.strictEqual(p.actions.buy_now.endpoint, `${P}/${p.id}/buy-now`);
        assert.strictEqual(p.actions.buy_now.completes_purchase, false);
      }
    });

    test('page: pagination', async () => {
      const p1 = await mine('page=1&limit=4');
      assert.strictEqual(p1.data.length, 4);
      assert.deepStrictEqual(p1.meta, { total: p1.meta.total, page: 1, limit: 4, totalPages: Math.ceil(p1.meta.total / 4) });
      assert.ok(p1.meta.total >= 6);
      const p2 = await mine('page=2&limit=4');
      assert.strictEqual(p2.meta.page, 2);
      const ids1 = p1.data.map((p) => p.id);
      assert.ok(p2.data.every((p) => !ids1.includes(p.id)), 'pages must not overlap');
      const far = await mine('page=999&limit=4');
      assert.deepStrictEqual(far.data, []);
      assert.strictEqual(far.meta.total, p1.meta.total);
    });

    test('page: search (name, brand, description, category, subcategory) and literal % _', async () => {
      assert.deepStrictEqual((await page(`search=${tag} Alpha`)).data.map((p) => p.id), [items.a.id]);
      assert.deepStrictEqual((await page('search=special-needle')).data.map((p) => p.id), [items.b.id]); // description
      assert.deepStrictEqual((await page(`search=${tag}-Livpure&category_id=${catA.id}`)).data.map((p) => p.id), [items.e.id]); // brand
      assert.strictEqual((await page(`search=${encodeURIComponent(catB.category_name)}`)).data.length, 1); // category name
      assert.ok((await page(`search=${encodeURIComponent(subA2.subcategory_name)}`)).data.some((p) => p.id === items.b.id)); // subcategory name
      assert.deepStrictEqual((await page(`search=${encodeURIComponent('100%_off')}`)).data.map((p) => p.id), [items.e.id]); // wildcard chars are literal
      assert.strictEqual((await page(`search=${encodeURIComponent('%')}${tag}`)).data.length, 0);
      assert.strictEqual((await page('search=zz-no-such-product-xyz')).meta.total, 0);
    });

    test('page: filter by category, subcategory, brand (case-insensitive, multiple), price range, status', async () => {
      const ids = (b) => b.data.map((p) => p.id).sort();
      assert.deepStrictEqual(ids(await mine(`category_id=${catB.id}`)), [items.f.id]);
      assert.deepStrictEqual(ids(await mine(`category_id=${catA.id}&subcategory_id=${subA2.id}`)), [items.b.id]);
      assert.ok((await mine(`subcategory_id=${subA.id}`)).data.every((p) => p.subcategory_id === subA.id));
      // brand: exact (not a substring), case-insensitive
      assert.deepStrictEqual(ids(await mine(`brand=${tag}-Kent`)), [items.a.id, items.c.id, items.f.id].sort());
      assert.strictEqual((await mine(`brand=${tag}-Ken`)).meta.total, 0);
      assert.deepStrictEqual(ids(await mine(`brand=${tag}-Aquaguard,${tag}-Livpure`)), [items.b.id, items.e.id].sort());
      assert.deepStrictEqual(ids(await mine(`brand=${tag}-Aquaguard&brand=${tag}-Livpure`)), [items.b.id, items.e.id].sort()); // repeated param
      // price = selling_price
      assert.deepStrictEqual(ids(await mine('min_price=9000&max_price=15000')), [items.a.id, items.b.id].sort());
      assert.ok((await mine('min_price=4500')).data.every((p) => p.selling_price >= 4500));
      assert.ok((await mine('max_price=700')).data.every((p) => p.selling_price <= 700));
      // status
      assert.deepStrictEqual(ids(await mine('status=inactive')), [items.d.id]);
      assert.ok((await mine('status=active')).data.every((p) => p.status === 1));
      // combined
      assert.deepStrictEqual(ids(await mine(`category_id=${catA.id}&brand=${tag}-Kent&max_price=5000`)), [items.c.id]);
    });

    test('page: sorting', async () => {
      const prices = (b) => b.data.map((p) => p.selling_price);
      const asc = prices(await mine('sort_by=selling_price&sort_order=asc&limit=100'));
      assert.deepStrictEqual(asc, [...asc].sort((x, y) => x - y));
      const desc = prices(await mine('sort_by=selling_price&sort_order=desc&limit=100'));
      assert.deepStrictEqual(desc, [...asc].reverse());
      assert.deepStrictEqual(prices(await mine('sort_by=selling_price&limit=100')), asc); // default order with sort_by = asc
      const names = (await mine('sort_by=product_name&sort_order=asc&limit=100')).data.map((p) => p.product_name);
      assert.deepStrictEqual(names, [...names].sort((x, y) => x.localeCompare(y, 'en', { sensitivity: 'base' })));
      const disc = (await mine('sort_by=discount_percent&sort_order=desc&limit=100')).data.map((p) => p.discount_percent);
      assert.deepStrictEqual(disc, [...disc].sort((x, y) => y - x));
      // default: newest first
      const def = (await mine('limit=100')).data.map((p) => new Date(p.created_at).getTime());
      assert.deepStrictEqual(def, [...def].sort((x, y) => y - x));
    });

    test('page: action buttons reflect stock and status', async () => {
      const get = async (id) => (await call('GET', `${P}/${id}`)).body.data.actions;
      const inStock = await get(items.a.id);
      assert.deepStrictEqual([inStock.add_to_cart.enabled, inStock.add_to_cart.disabled_reason, inStock.add_to_cart.max_quantity], [true, null, 5]);
      assert.deepStrictEqual([inStock.buy_now.enabled, inStock.buy_now.max_quantity], [true, 5]);

      const out = await get(items.c.id);
      assert.deepStrictEqual([out.add_to_cart.enabled, out.add_to_cart.disabled_reason, out.add_to_cart.max_quantity], [false, 'OUT_OF_STOCK', 0]);
      assert.deepStrictEqual([out.buy_now.enabled, out.buy_now.disabled_reason], [false, 'OUT_OF_STOCK']);

      const inactive = await get(items.d.id);
      assert.deepStrictEqual([inactive.add_to_cart.enabled, inactive.add_to_cart.disabled_reason], [false, 'PRODUCT_INACTIVE']);

      // and the page returns the very same flags
      const fromPage = (await mine('limit=100')).data.find((p) => p.id === items.c.id);
      assert.strictEqual(fromPage.actions.buy_now.disabled_reason, 'OUT_OF_STOCK');
    });

    test('page: invalid query parameters are rejected with 400', async () => {
      const bad = async (qs, expected) => {
        const r = await call('GET', `${P}/page?${qs}`);
        assert.strictEqual(r.status, 400, qs);
        assert.strictEqual(r.body.message, 'Validation failed');
        assert.ok(r.body.errors.some((e) => e.includes(expected)), `${expected} not in ${JSON.stringify(r.body.errors)}`);
      };
      await bad('page=0', 'page must be');
      await bad('page=abc', 'page must be');
      await bad('limit=0', 'limit must be');
      await bad('limit=101', 'limit must be');
      await bad('category_id=abc', 'category_id must be');
      await bad('subcategory_id=123', 'subcategory_id must be');
      await bad('min_price=-5', 'min_price must be');
      await bad('max_price=abc', 'max_price must be');
      await bad('min_price=100&max_price=50', 'min_price cannot be greater');
      await bad('status=maybe', 'status filter');
      await bad('sort_by=password', 'sort_by must be one of');
      await bad('sort_by=selling_price&sort_order=sideways', 'sort_order must be');
      await bad(`search=${'x'.repeat(101)}`, 'search must be');
    });

    test('page: SQL injection attempts are treated as plain text', async () => {
      const r1 = await call('GET', `${P}/page?search=${encodeURIComponent("'; DROP TABLE product; --")}`);
      assert.strictEqual(r1.status, 200);
      assert.strictEqual(r1.body.meta.total, 0);
      const r2 = await call('GET', `${P}/page?brand=${encodeURIComponent("Kent' OR '1'='1")}`);
      assert.strictEqual(r2.status, 200);
      assert.strictEqual(r2.body.meta.total, 0);
      assert.strictEqual((await call('GET', `${P}/page?sort_by=${encodeURIComponent('created_at; DROP TABLE product')}`)).status, 400);
      assert.strictEqual((await call('GET', `${P}/page?limit=1`)).status, 200); // table still there
    });

    test('add_to_cart: validates stock and quantity, never changes stock', async () => {
      const id = items.a.id; // stock 5, price 15000, mrp 20000
      const before = await stockOf(id);

      let r = await call('POST', `${P}/${id}/add-to-cart`, { quantity: 2 });
      assert.strictEqual(r.status, 200, JSON.stringify(r.body));
      assert.strictEqual(r.body.success, true);
      assert.strictEqual(r.body.data.action, 'add_to_cart');
      const item = r.body.data.item;
      assert.deepStrictEqual([item.product_id, item.quantity, item.unit_price, item.mrp, item.line_total, item.stock_quantity], [id, 2, 15000, 20000, 30000, 5]);

      r = await call('POST', `${P}/${id}/add-to-cart`, { quantity: 5 }); // exactly the stock
      assert.strictEqual(r.status, 200);
      r = await call('POST', `${P}/${id}/add-to-cart`); // no body: quantity defaults to 1
      assert.strictEqual(r.status, 200);
      assert.strictEqual(r.body.data.item.quantity, 1);

      r = await call('POST', `${P}/${id}/add-to-cart`, { quantity: 6 });
      assert.strictEqual(r.status, 409);
      assert.strictEqual(r.body.success, false);
      assert.strictEqual(r.body.message, 'Insufficient stock');
      assert.deepStrictEqual(r.body.errors, ['Only 5 unit(s) available, requested 6']);

      for (const quantity of [0, -1, 1.5, 'abc', null, 100001, [], {}]) {
        r = await call('POST', `${P}/${id}/add-to-cart`, { quantity });
        assert.strictEqual(r.status, 400, `quantity ${JSON.stringify(quantity)}`);
        assert.match(r.body.errors[0], /quantity must be a whole number/);
      }

      r = await call('POST', `${P}/${items.c.id}/add-to-cart`, { quantity: 1 });
      assert.strictEqual(r.status, 409);
      assert.strictEqual(r.body.message, 'Product is out of stock');
      r = await call('POST', `${P}/${items.d.id}/add-to-cart`, { quantity: 1 });
      assert.strictEqual(r.status, 409);
      assert.strictEqual(r.body.message, 'Product is not available');
      assert.strictEqual((await call('POST', `${P}/00000000-0000-4000-8000-000000000000/add-to-cart`, { quantity: 1 })).status, 404);
      assert.strictEqual((await call('POST', `${P}/abc/add-to-cart`, { quantity: 1 })).status, 400);

      assert.strictEqual(await stockOf(id), before, 'add-to-cart must not change stock');
    });

    test('buy_now: returns a checkout summary, does not complete the purchase or touch stock', async () => {
      const id = items.b.id; // stock 8, price 9000, mrp 12000
      const before = await stockOf(id);

      let r = await call('POST', `${P}/${id}/buy-now`, { quantity: 3 });
      assert.strictEqual(r.status, 200, JSON.stringify(r.body));
      assert.strictEqual(r.body.message, 'Proceed to checkout');
      const d = r.body.data;
      assert.strictEqual(d.action, 'buy_now');
      assert.strictEqual(d.purchase_completed, false);
      assert.strictEqual(d.next_step, 'CHECKOUT');
      assert.strictEqual(d.items.length, 1);
      assert.deepStrictEqual([d.items[0].product_id, d.items[0].quantity, d.items[0].unit_price, d.items[0].line_total], [id, 3, 9000, 27000]);
      assert.deepStrictEqual(d.price_summary, { mrp_total: 36000, discount_total: 9000, total_payable: 27000 });

      r = await call('POST', `${P}/${id}/buy-now`); // defaults to quantity 1
      assert.strictEqual(r.body.data.items[0].quantity, 1);

      r = await call('POST', `${P}/${id}/buy-now`, { quantity: 9 });
      assert.strictEqual(r.status, 409);
      assert.strictEqual(r.body.message, 'Insufficient stock');
      assert.strictEqual((await call('POST', `${P}/${id}/buy-now`, { quantity: 0 })).status, 400);
      assert.strictEqual((await call('POST', `${P}/${items.c.id}/buy-now`, { quantity: 1 })).status, 409);
      assert.strictEqual((await call('POST', `${P}/${items.d.id}/buy-now`, { quantity: 1 })).status, 409);
      assert.strictEqual((await call('POST', `${P}/00000000-0000-4000-8000-000000000000/buy-now`, {})).status, 404);

      assert.strictEqual(await stockOf(id), before, 'buy-now must not change stock');
    });

    test('money totals are exact (no floating point drift)', async () => {
      const p = await make({ mrp: 199.99, selling_price: 149.99, stock_quantity: 100 });
      const r = await call('POST', `${P}/${p.id}/buy-now`, { quantity: 3 });
      assert.deepStrictEqual(r.body.data.price_summary, { mrp_total: 599.97, discount_total: 150, total_payable: 449.97 });
      assert.strictEqual(r.body.data.items[0].line_total, 449.97);
    });
  }

  // ------------------------------------------------------------------ integrity & existing APIs
  test('database integrity: foreign keys and CHECK constraints protect the data', async () => {
    const p = await make();
    // a category/subcategory that still has products cannot be deleted through the existing APIs (409, nothing deleted)
    const delSub = await call('DELETE', `/api/subcategories/${p.subcategory_id}`);
    assert.strictEqual(delSub.status, 409);
    const delCat = await call('DELETE', `/api/categories/${p.category_id}`);
    assert.strictEqual(delCat.status, 409);
    assert.strictEqual((await call('GET', `${P}/${p.id}`)).status, 200);
    assert.strictEqual((await call('GET', `/api/categories/${p.category_id}`)).status, 200);

    // CHECK constraints (MySQL 8.0.16+) reject bad rows even if the API is bypassed
    await assert.rejects(pool.query('UPDATE product SET selling_price = mrp + 1 WHERE id = ?', [p.id]));
    // discount columns are generated and cannot be written
    await assert.rejects(pool.query('UPDATE product SET discount_percent = 99 WHERE id = ?', [p.id]));
  });

  test('existing category and subcategory APIs still work unchanged', async () => {
    let r = await call('GET', `/api/categories?search=${tag}`);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.meta && Array.isArray(r.body.data));
    r = await call('GET', `/api/subcategories?category_id=${catA.id}`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.meta.total, 2);
    r = await call('GET', `/api/categories/${catA.id}/subcategories`);
    assert.strictEqual(r.status, 200);
    r = await call('POST', '/api/categories/lookup', { metaProdCateEnty: catA.id });
    assert.strictEqual(r.status, 200);
    assert.strictEqual((await call('GET', '/health')).body.success, true);
  });

  test('unknown product routes return the standard 404 JSON', async () => {
    const r = await call('GET', `${P}/page/extra/segments`);
    assert.strictEqual(r.status, 404);
    assert.strictEqual(r.body.success, false);
  });
}

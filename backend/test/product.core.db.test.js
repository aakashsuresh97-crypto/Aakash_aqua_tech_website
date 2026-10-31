// Phase 1 integration tests (SKU, slug, sale price, stock rules, shipping, SEO, publish status, update, delete/archive)
// against your REAL MySQL database. Opt-in like product.db.test.js:
//   PowerShell:     $env:RUN_DB_TESTS=1; npm test
//   macOS/Linux:    RUN_DB_TESTS=1 npm test
// Run `node scripts/migrate-product.js` first. It creates "zz-core-..." data and removes it at the end.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { adminAuth } = require('./helpers/auth'); // sets JWT_SECRET (must come before ../src/app)

if (process.env.RUN_DB_TESTS !== '1') {
  test('product core DB tests (skipped: set RUN_DB_TESTS=1)', { skip: true }, () => {});
} else {
  process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'prod-core-uploads-'));
  const { pool } = require('../src/config/db');
  const app = require('../src/app');

  const tag = `zz-core-${Date.now().toString(36)}`;
  const P = '/api/v1/products';
  let server, base, catA, catB, subA, subB;

  const call = async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...adminAuth }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  const valid = (over = {}) => ({
    category_id: catA.id, subcategory_id: subA.id, product_name: `${tag} Purifier`, mrp: 1000, selling_price: 800, gst_percent: 18, stock_quantity: 10, ...over,
  });
  const make = async (over) => {
    const r = await call('POST', P, valid(over));
    assert.strictEqual(r.status, 201, JSON.stringify(r.body));
    return r.body.data;
  };
  const day = 24 * 3600 * 1000;
  const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString();

  test.before(async () => {
    await new Promise((r) => { server = app.listen(0, r); });
    base = `http://127.0.0.1:${server.address().port}`;
    catA = (await call('POST', '/api/categories', { category_name: `${tag}-A` })).body.data;
    catB = (await call('POST', '/api/categories', { category_name: `${tag}-B` })).body.data;
    subA = (await call('POST', '/api/subcategories', { category_id: catA.id, subcategory_name: `${tag}-A1` })).body.data;
    subB = (await call('POST', '/api/subcategories', { category_id: catB.id, subcategory_name: `${tag}-B1` })).body.data;
  });
  test.after(async () => {
    await pool.query('DELETE FROM product WHERE category_id IN (?)', [[catA.id, catB.id]]);
    for (const s of [subA, subB]) await call('DELETE', `/api/subcategories/${s.id}`);
    await call('DELETE', `/api/categories/${catA.id}`);
    await call('DELETE', `/api/categories/${catB.id}`);
    await new Promise((r) => server.close(r));
    await pool.end();
    fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
  });

  test('create: defaults for the new fields (simple, published, slug generated, stock managed)', async () => {
    const p = await make();
    assert.strictEqual(p.slug, `${tag}-purifier`);
    assert.deepStrictEqual([p.sku, p.product_type, p.is_virtual, p.is_downloadable, p.publish_status, p.status], [null, 'simple', false, false, 'published', 1]);
    assert.deepStrictEqual([p.manage_stock, p.backorders, p.stock_status, p.in_stock, p.low_stock], [true, 'no', 'instock', true, false]);
    assert.deepStrictEqual([p.sale_price, p.sale_active, p.effective_price, p.tax_status], [null, false, 800, 'taxable']);
    assert.deepStrictEqual(p.shipping, { weight: null, length: null, width: null, height: null, shipping_class: null, requires_shipping: true });
    assert.deepStrictEqual(p.seo, { seo_title: null, meta_description: null, focus_keyword: null, additional_keywords: [], canonical_url: null });
  });

  test('create: every new field is stored and returned', async () => {
    const p = await make({
      product_name: `${tag} Full`, sku: `${tag}-SKU-1`, slug: `${tag}-full-product`, product_type: 'variable', is_downloadable: true,
      short_description: 'Short text', description: 'Long text', brand: 'Kent', tax_status: 'shipping',
      manage_stock: true, backorders: 'notify', low_stock_threshold: 3, stock_quantity: 2,
      shipping: { weight: 12.5, length: 40, width: 30.5, height: 55, shipping_class: 'heavy' },
      seo: { seo_title: 'Buy it', meta_description: 'Great purifier', focus_keyword: 'ro purifier', additional_keywords: ['ro', 'water', 'ro'], canonical_url: 'https://example.com/p' },
    });
    assert.deepStrictEqual([p.sku, p.slug, p.product_type, p.is_downloadable, p.short_description, p.tax_status], [`${tag}-SKU-1`, `${tag}-full-product`, 'variable', true, 'Short text', 'shipping']);
    assert.deepStrictEqual([p.backorders, p.low_stock_threshold, p.low_stock, p.stock_status], ['notify', 3, true, 'instock']);
    assert.deepStrictEqual(p.shipping, { weight: 12.5, length: 40, width: 30.5, height: 55, shipping_class: 'heavy', requires_shipping: true });
    assert.deepStrictEqual(p.seo.additional_keywords, ['ro', 'water']); // duplicates removed
    assert.strictEqual(p.seo.canonical_url, 'https://example.com/p');
    const g = await call('GET', `${P}/${p.id}`);
    assert.deepStrictEqual(g.body.data.seo, p.seo);
    assert.deepStrictEqual(g.body.data.shipping, p.shipping);
  });

  test('slug: generated from the name, made unique, explicit duplicates rejected', async () => {
    const a = await make({ product_name: `${tag} Same Name` });
    const b = await make({ product_name: `${tag} Same Name` });
    const c = await make({ product_name: `${tag} Same Name` });
    assert.deepStrictEqual([a.slug, b.slug, c.slug], [`${tag}-same-name`, `${tag}-same-name-2`, `${tag}-same-name-3`]);
    const dup = await call('POST', P, valid({ slug: a.slug }));
    assert.strictEqual(dup.status, 409);
    assert.strictEqual(dup.body.message, 'Slug already exists');
    const bad = await call('POST', P, valid({ slug: 'Bad Slug!' }));
    assert.strictEqual(bad.status, 400);
    assert.ok(bad.body.errors.some((e) => e.startsWith('slug must be')));
  });

  test('sku: unique (case-insensitive), format validated, several products may have no sku', async () => {
    await make({ sku: `${tag}-U1` });
    const dup = await call('POST', P, valid({ sku: `${tag.toUpperCase()}-u1`, product_name: `${tag} Dup sku` }));
    assert.strictEqual(dup.status, 409);
    assert.strictEqual(dup.body.message, 'SKU already exists');
    const bad = await call('POST', P, valid({ sku: 'has space' }));
    assert.strictEqual(bad.status, 400);
    assert.ok(bad.body.errors.some((e) => e.startsWith('sku must be')));
    await make({ product_name: `${tag} NoSku 1` });
    await make({ product_name: `${tag} NoSku 2` });
  });

  test('pricing: sale price validated; effective price follows the sale window; discount calculated by the backend', async () => {
    const bad = async (over, expected) => {
      const r = await call('POST', P, valid(over));
      assert.strictEqual(r.status, 400, JSON.stringify(over));
      assert.ok(r.body.errors.some((e) => e.includes(expected)), `${expected} not in ${JSON.stringify(r.body.errors)}`);
    };
    await bad({ sale_price: 900 }, 'sale_price cannot be greater than the regular price');
    await bad({ sale_price: 0 }, 'sale_price must be');
    await bad({ sale_start: iso(day) }, 'need a sale_price');
    await bad({ sale_price: 700, sale_start: 'tomorrow' }, 'sale_start must be an ISO 8601');
    await bad({ sale_price: 700, sale_start: iso(2 * day), sale_end: iso(day) }, 'sale_end must be after sale_start');

    const always = await make({ product_name: `${tag} Sale always`, sale_price: 600 });
    assert.deepStrictEqual([always.sale_active, always.effective_price, always.effective_discount_amount, always.effective_discount_percent], [true, 600, 400, 40]);
    assert.deepStrictEqual([always.selling_price, always.discount_percent], [800, 20]); // regular price & regular discount are unchanged

    const future = await make({ product_name: `${tag} Sale future`, sale_price: 600, sale_start: iso(day), sale_end: iso(2 * day) });
    assert.deepStrictEqual([future.sale_active, future.effective_price], [false, 800]);
    const running = await make({ product_name: `${tag} Sale running`, sale_price: 600, sale_start: iso(-day), sale_end: iso(day) });
    assert.deepStrictEqual([running.sale_active, running.effective_price], [true, 600]);
    const expired = await make({ product_name: `${tag} Sale expired`, sale_price: 600, sale_start: iso(-2 * day), sale_end: iso(-day) });
    assert.deepStrictEqual([expired.sale_active, expired.effective_price], [false, 800]);

    // the sale price is what Add to Cart / Buy Now charge (taken from the database, never from the client)
    let r = await call('POST', `${P}/${running.id}/buy-now`, { quantity: 2, unit_price: 1 });
    assert.deepStrictEqual([r.body.data.items[0].unit_price, r.body.data.price_summary], [600, { mrp_total: 2000, discount_total: 800, total_payable: 1200 }]);
    r = await call('POST', `${P}/${expired.id}/add-to-cart`, { quantity: 1 });
    assert.strictEqual(r.body.data.item.unit_price, 800);
  });

  test('inventory: stock_status is derived; backorders and unmanaged stock change what can be bought', async () => {
    const out = await make({ product_name: `${tag} Out`, stock_quantity: 0 });
    assert.deepStrictEqual([out.stock_status, out.in_stock], ['outofstock', false]);
    const back = await make({ product_name: `${tag} Backorder`, stock_quantity: 0, backorders: 'yes' });
    assert.deepStrictEqual([back.stock_status, back.in_stock], ['onbackorder', true]);
    let r = await call('POST', `${P}/${back.id}/add-to-cart`, { quantity: 5 });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body)); // more than the stock is allowed on backorder
    const actions = (await call('GET', `${P}/${back.id}`)).body.data.actions;
    assert.deepStrictEqual([actions.add_to_cart.enabled, actions.add_to_cart.max_quantity], [true, null]);

    const unmanaged = await make({ product_name: `${tag} Unmanaged`, manage_stock: false, stock_quantity: 0 });
    assert.strictEqual(unmanaged.stock_status, 'instock');
    assert.strictEqual((await call('POST', `${P}/${unmanaged.id}/buy-now`, { quantity: 50 })).status, 200);
    const unmanagedOut = await make({ product_name: `${tag} Unmanaged out`, manage_stock: false, stock_quantity: 0, stock_status: 'outofstock' });
    assert.strictEqual((await call('POST', `${P}/${unmanagedOut.id}/add-to-cart`, { quantity: 1 })).status, 409);

    for (const [over, expected] of [
      [{ backorders: 'sometimes' }, 'backorders must be'], [{ low_stock_threshold: -1 }, 'low_stock_threshold must be'],
      [{ manage_stock: 'maybe' }, 'manage_stock must be'], [{ stock_status: 'gone' }, 'stock_status must be'], [{ stock_quantity: -5 }, 'stock_quantity must be'],
    ]) {
      r = await call('POST', P, valid(over));
      assert.strictEqual(r.status, 400, JSON.stringify(over));
      assert.ok(r.body.errors.some((e) => e.includes(expected)), JSON.stringify(r.body.errors));
    }
  });

  test('publish_status: draft / published / inactive; drafts cannot be bought; old status 1/0 still works', async () => {
    const draft = await make({ product_name: `${tag} Draft`, publish_status: 'draft' });
    assert.deepStrictEqual([draft.publish_status, draft.status], ['draft', 0]);
    assert.strictEqual((await call('POST', `${P}/${draft.id}/add-to-cart`, { quantity: 1 })).status, 409);
    assert.strictEqual((await call('GET', `${P}/${draft.id}`)).body.data.actions.buy_now.disabled_reason, 'PRODUCT_INACTIVE');
    const legacy = await make({ product_name: `${tag} Legacy off`, status: 0 });
    assert.deepStrictEqual([legacy.publish_status, legacy.status], ['inactive', 0]);
    const r = await call('POST', P, valid({ publish_status: 'retired' }));
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.errors.some((e) => e.startsWith('publish_status must be')));
    const drafts = await call('GET', `${P}/page?publish_status=draft&search=${tag}`);
    assert.deepStrictEqual(drafts.body.data.map((x) => x.id), [draft.id]);
  });

  test('virtual products never require shipping; shipping and seo are validated', async () => {
    const v = await make({ product_name: `${tag} Virtual`, is_virtual: true, shipping: { requires_shipping: true, weight: 1 } });
    assert.strictEqual(v.shipping.requires_shipping, false);
    for (const [over, expected] of [
      [{ shipping: { weight: -1 } }, 'shipping.weight'], [{ shipping: { length: 'long' } }, 'shipping.length'], [{ shipping: 'big' }, 'shipping must be an object'],
      [{ seo: { canonical_url: 'ftp://x' } }, 'canonical_url must start with'], [{ seo: { additional_keywords: 'a' } }, 'additional_keywords'],
      [{ seo: { seo_title: 'x'.repeat(256) } }, 'seo.seo_title'], [{ product_type: 'bundle' }, 'product_type must be'],
    ]) {
      const r = await call('POST', P, valid(over));
      assert.strictEqual(r.status, 400, JSON.stringify(over));
      assert.ok(r.body.errors.some((e) => e.includes(expected)), `${expected} not in ${JSON.stringify(r.body.errors)}`);
    }
  });

  test('list: GET / works like /page; filters by product_type, stock and sku search; new sort columns', async () => {
    const mine = (qs) => call('GET', `${P}?${qs}&search=${tag}&limit=100`);
    const variable = (await mine('product_type=variable')).body.data;
    assert.ok(variable.length >= 1 && variable.every((p) => p.product_type === 'variable'));
    const outList = (await mine('stock=out')).body.data;
    assert.ok(outList.length >= 2 && outList.every((p) => p.stock_status === 'outofstock'));
    assert.ok((await mine('stock_status=onbackorder')).body.data.every((p) => p.stock_status === 'onbackorder'));
    const low = (await mine('stock=low')).body.data;
    assert.ok(low.length >= 1 && low.every((p) => p.low_stock === true));
    assert.deepStrictEqual((await call('GET', `${P}?search=${tag}-SKU-1`)).body.data.map((p) => p.sku), [`${tag}-SKU-1`]);
    const skus = (await mine('sort_by=sku&sort_order=asc')).body.data.map((p) => p.sku).filter(Boolean);
    assert.deepStrictEqual(skus, [...skus].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
    assert.strictEqual((await call('GET', `${P}?product_type=bundle`)).status, 400);
    assert.strictEqual((await call('GET', `${P}?stock=lots`)).status, 400);
  });

  test('update: PUT/PATCH change only what is sent, recalculate derived fields and validate the whole product', async () => {
    const p = await make({ product_name: `${tag} Upd`, sku: `${tag}-UPD`, brand: 'Kent', stock_quantity: 5, image_url: 'https://example.com/a.png' });
    let r = await call('PATCH', `${P}/${p.id}`, { selling_price: 700, stock_quantity: 0 });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    const u = r.body.data;
    assert.strictEqual(r.body.message, 'Product updated successfully');
    assert.deepStrictEqual([u.selling_price, u.discount_percent, u.discount_amount, u.stock_quantity, u.stock_status], [700, 30, 300, 0, 'outofstock']);
    assert.deepStrictEqual([u.product_name, u.sku, u.slug, u.brand, u.image_url, u.mrp], [p.product_name, p.sku, p.slug, 'Kent', 'https://example.com/a.png', 1000]); // untouched
    assert.ok(u.actions && new Date(u.updated_at) >= new Date(p.updated_at));

    r = await call('PUT', `${P}/${p.id}`, { product_name: `${tag} Upd renamed`, stock_quantity: 4, shipping: { weight: 2 }, seo: { focus_keyword: 'kw' } });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual([r.body.data.product_name, r.body.data.slug, r.body.data.stock_status], [`${tag} Upd renamed`, p.slug, 'instock']); // slug is kept on rename
    assert.deepStrictEqual([r.body.data.shipping.weight, r.body.data.shipping.requires_shipping, r.body.data.seo.focus_keyword], [2, true, 'kw']);

    r = await call('PATCH', `${P}/${p.id}`, { brand: null, image_url: null, sale_price: 600 });
    assert.deepStrictEqual([r.body.data.brand, r.body.data.image_url, r.body.data.sale_price], [null, null, 600]);
    r = await call('PATCH', `${P}/${p.id}`, { sale_price: null });
    assert.deepStrictEqual([r.body.data.sale_price, r.body.data.sale_active], [null, false]);

    // legacy status flag and publish_status
    r = await call('PATCH', `${P}/${p.id}`, { status: 0 });
    assert.deepStrictEqual([r.body.data.publish_status, r.body.data.status], ['inactive', 0]);
    r = await call('PATCH', `${P}/${p.id}`, { publish_status: 'published' });
    assert.deepStrictEqual([r.body.data.publish_status, r.body.data.status], ['published', 1]);

    // the DB row really changed
    const [[row]] = await pool.query('SELECT selling_price, stock_quantity FROM product WHERE id = ?', [p.id]);
    assert.deepStrictEqual([Number(row.selling_price), Number(row.stock_quantity)], [700, 4]);
  });

  test('update: validation, duplicates, references and 404', async () => {
    const a = await make({ product_name: `${tag} Upd A`, sku: `${tag}-UA` });
    const b = await make({ product_name: `${tag} Upd B`, sku: `${tag}-UB` });
    let r = await call('PATCH', `${P}/${b.id}`, { sku: `${tag}-ua` });
    assert.strictEqual(r.status, 409);
    assert.strictEqual(r.body.message, 'SKU already exists');
    r = await call('PATCH', `${P}/${b.id}`, { slug: a.slug });
    assert.strictEqual(r.status, 409);
    r = await call('PATCH', `${P}/${b.id}`, { sku: `${tag}-UB` }); // keeping its own sku is fine
    assert.strictEqual(r.status, 200);

    r = await call('PATCH', `${P}/${a.id}`, { selling_price: 1500 });
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.errors.includes('selling_price cannot be greater than mrp'));
    r = await call('PATCH', `${P}/${a.id}`, { mrp: 500 }); // stored selling price 800 would now exceed the mrp
    assert.strictEqual(r.status, 400);
    r = await call('PATCH', `${P}/${a.id}`, { selling_price: 400 }); // below the stored sale price? none yet: ok
    assert.strictEqual(r.status, 200);
    await call('PATCH', `${P}/${a.id}`, { sale_price: 300 });
    r = await call('PATCH', `${P}/${a.id}`, { selling_price: 250 }); // regular price below the stored sale price
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.errors.some((e) => e.includes('sale_price cannot be greater')));
    r = await call('PATCH', `${P}/${a.id}`, { subcategory_id: subB.id }); // subcategory of another category
    assert.strictEqual(r.status, 400);
    assert.deepStrictEqual(r.body.errors, ['subcategory_id does not belong to the given category_id']);
    r = await call('PATCH', `${P}/${a.id}`, { category_id: catB.id, subcategory_id: subB.id });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual([r.body.data.category_name, r.body.data.subcategory_name], [catB.category_name, subB.subcategory_name]);

    assert.strictEqual((await call('PATCH', `${P}/${a.id}`, {})).status, 400);
    assert.strictEqual((await call('PATCH', `${P}/${a.id}`, { id: '11111111-1111-4111-8111-111111111111' })).status, 400);
    assert.strictEqual((await call('PUT', `${P}/00000000-0000-4000-8000-000000000000`, { stock_quantity: 1 })).status, 404);
    assert.strictEqual((await call('PUT', `${P}/abc`, { stock_quantity: 1 })).status, 400);
    assert.strictEqual((await call('PATCH', `${P}/${a.id}`, { stock_quantity: 'many' })).status, 400);
  });

  test('delete: permanent by default, archive keeps the row, 404 / 400 handled', async () => {
    const del = await make({ product_name: `${tag} To delete`, sku: `${tag}-DEL` });
    let r = await call('DELETE', `${P}/${del.id}`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.message, 'Product deleted successfully');
    assert.strictEqual((await call('GET', `${P}/${del.id}`)).status, 404);
    assert.strictEqual((await call('DELETE', `${P}/${del.id}`)).status, 404);
    await make({ product_name: `${tag} Reuse sku`, sku: `${tag}-DEL` }); // the sku is free again after a permanent delete

    const arch = await make({ product_name: `${tag} To archive`, sku: `${tag}-ARC` });
    r = await call('DELETE', `${P}/${arch.id}?mode=archive`);
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual([r.body.message, r.body.data.publish_status, r.body.data.status, r.body.data.id], ['Product archived successfully', 'inactive', 0, arch.id]);
    assert.strictEqual((await call('GET', `${P}/${arch.id}`)).status, 200); // still there
    assert.strictEqual((await call('POST', `${P}/${arch.id}/add-to-cart`, { quantity: 1 })).status, 409); // but not purchasable
    assert.strictEqual((await call('POST', P, valid({ sku: `${tag}-ARC`, product_name: `${tag} x` }))).status, 409); // its sku stays reserved

    assert.strictEqual((await call('DELETE', `${P}/${arch.id}?mode=burn`)).status, 400);
    assert.strictEqual((await call('DELETE', `${P}/00000000-0000-4000-8000-000000000000?mode=archive`)).status, 404);
    assert.strictEqual((await call('DELETE', `${P}/abc`)).status, 400);
  });

  test('migration 007 left the table consistent: constraints reject bad rows even if the API is bypassed', async () => {
    const p = await make({ product_name: `${tag} Constraints` });
    await assert.rejects(pool.query('UPDATE product SET sale_price = selling_price + 1 WHERE id = ?', [p.id]));
    await assert.rejects(pool.query('UPDATE product SET weight = -1 WHERE id = ?', [p.id]));
    await assert.rejects(pool.query(`UPDATE product SET sale_price = 1, sale_start = '2026-02-01', sale_end = '2026-01-01' WHERE id = ?`, [p.id]));
    await assert.rejects(pool.query(`UPDATE product SET publish_status = 'archived' WHERE id = ?`, [p.id]));
    const [[col]] = await pool.query(`SELECT COUNT(*) AS n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product' AND INDEX_NAME IN ('uk_product_sku', 'uk_product_slug') AND NON_UNIQUE = 0`);
    assert.strictEqual(Number(col.n), 2);
  });
}

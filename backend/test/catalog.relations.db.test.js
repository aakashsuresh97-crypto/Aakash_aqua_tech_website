// Integration tests of the category -> subcategory -> product -> brand relationships against your REAL MySQL database (.env).
// Opt-in so that `npm test` still works without a database (same as product.db.test.js):
//   Windows (cmd):  set RUN_DB_TESTS=1 && node --test test/catalog.relations.db.test.js
//   PowerShell:     $env:RUN_DB_TESTS=1; node --test test/catalog.relations.db.test.js
//   macOS/Linux:    RUN_DB_TESTS=1 node --test test/catalog.relations.db.test.js
// Run `npm run migrate:all` first (it includes `migrate:brand-link`). Everything created here is named "zz-rel-..." and removed at the end.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { adminAuth, tokenFor } = require('./helpers/auth'); // sets JWT_SECRET (must come before ../src/app)

if (process.env.RUN_DB_TESTS !== '1') {
  test('catalog relationship tests (skipped: set RUN_DB_TESTS=1 to run them against your database)', { skip: true }, () => {});
} else {
  process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'rel-uploads-'));
  const { pool } = require('../src/config/db');
  const app = require('../src/app');
  const { errorHandler } = require('../src/middleware/errorHandler');

  const tag = `zz-rel-${Date.now().toString(36)}`;
  const P = '/api/v1/products';
  let server, base, cat, cat2, sub, sub2, kent, aqua;

  const call = async (method, url, body, auth = adminAuth) => {
    const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...auth }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  const anon = (method, url) => call(method, url, undefined, {});
  const valid = (over = {}) => ({ category_id: cat.id, subcategory_id: sub.id, product_name: `${tag}-p${Math.random().toString(36).slice(2, 7)}`, mrp: 1000, selling_price: 800, gst_percent: 18, stock_quantity: 5, ...over });
  const make = async (over) => { const r = await call('POST', P, valid(over)); assert.strictEqual(r.status, 201, JSON.stringify(r.body)); return r.body.data; };

  test.before(async () => {
    await new Promise((r) => { server = app.listen(0, r); });
    base = `http://127.0.0.1:${server.address().port}`;
    cat = (await call('POST', '/api/categories', { category_name: `${tag}-Cat` })).body.data;
    cat2 = (await call('POST', '/api/categories', { category_name: `${tag}-Cat2` })).body.data;
    sub = (await call('POST', '/api/subcategories', { category_id: cat.id, subcategory_name: `${tag}-Sub` })).body.data;
    sub2 = (await call('POST', '/api/subcategories', { category_id: cat2.id, subcategory_name: `${tag}-Sub2` })).body.data;
    kent = (await call('POST', '/api/brands', { name: `${tag}-Kent` })).body.data;
    aqua = (await call('POST', '/api/brands', { name: `${tag}-Aquaguard` })).body.data;
  });

  test.after(async () => {
    await pool.query('DELETE FROM product WHERE category_id IN (?)', [[cat.id, cat2.id]]);
    await pool.query('DELETE FROM subcategory WHERE category_id IN (?)', [[cat.id, cat2.id]]);
    await pool.query('DELETE FROM category WHERE id IN (?)', [[cat.id, cat2.id]]);
    await pool.query('DELETE FROM brand WHERE id IN (?)', [[kent.id, aqua.id]]);
    await new Promise((r) => server.close(r));
    await pool.end();
    fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
  });

  // ------------------------------------------------------------------ subcategory: category uuid + category name
  test('subcategory: category_name sent with category_id must belong to that category', async () => {
    let r = await call('POST', '/api/subcategories', { category_id: cat.id, category_name: 'Totally Wrong', subcategory_name: `${tag}-S-bad` });
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.errors[0].includes('does not match category_id'));
    r = await call('POST', '/api/subcategories', { category_id: cat.id, category_name: cat.category_name.toUpperCase(), subcategory_name: `${tag}-S-ok` });
    assert.strictEqual(r.status, 201, JSON.stringify(r.body));
    assert.strictEqual(r.body.data.category_id, cat.id);
    assert.strictEqual(r.body.data.category_name, cat.category_name); // the response always carries the real name from the category row
    // update: the name is checked against the category the subcategory will belong to, and is never written to the table
    r = await call('PATCH', `/api/subcategories/${r.body.data.id}`, { category_name: 'Nope', description: 'x' });
    assert.strictEqual(r.status, 400);
    r = await call('PATCH', `/api/subcategories/${sub.id}`, { category_id: cat2.id, category_name: cat2.category_name });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.strictEqual(r.body.data.category_id, cat2.id);
    await call('PATCH', `/api/subcategories/${sub.id}`, { category_id: cat.id }); // move it back
  });

  // ------------------------------------------------------------------ product: category + subcategory ids and names
  test('product: category_name / subcategory_name must match their ids; response carries ids and names', async () => {
    let r = await call('POST', P, valid({ category_name: 'WRONG' }));
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.errors.some((e) => e.includes('category_name') && e.includes('does not match category_id')));
    r = await call('POST', P, valid({ subcategory_name: 'WRONG' }));
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.errors.some((e) => e.includes('subcategory_name') && e.includes('does not match subcategory_id')));
    r = await call('POST', P, valid({ category_id: cat.id, subcategory_id: sub2.id })); // subcategory of ANOTHER category
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.errors.includes('subcategory_id does not belong to the given category_id'));
    r = await call('POST', P, valid({ category_name: cat.category_name, subcategory_name: sub.subcategory_name }));
    assert.strictEqual(r.status, 201, JSON.stringify(r.body));
    const p = r.body.data;
    assert.deepStrictEqual([p.category_id, p.category_name, p.subcategory_id, p.subcategory_name], [cat.id, cat.category_name, sub.id, sub.subcategory_name]);
    assert.ok(p.actions && p.actions.add_to_cart, 'create returns the same shape as get / update (actions included)');
  });

  // ------------------------------------------------------------------ product: brand by UUID
  test('product: brand_id (UUID) is validated, stored, and the name always comes from the brand row', async () => {
    let r = await call('POST', P, valid({ brand_id: 'not-a-uuid' }));
    assert.strictEqual(r.status, 400); assert.ok(r.body.errors.includes('brand_id must be a valid UUID'));
    r = await call('POST', P, valid({ brand_id: '00000000-0000-4000-8000-000000000000' }));
    assert.strictEqual(r.status, 400); assert.ok(r.body.errors.includes('brand_id does not match any existing brand'));
    r = await call('POST', P, valid({ brand_id: kent.id, brand: aqua.name }));
    assert.strictEqual(r.status, 400); assert.ok(r.body.errors[0].includes('does not match brand_id'));

    const p = await make({ brand_id: kent.id });
    assert.strictEqual(p.brand_id, kent.id);
    assert.strictEqual(p.brand, kent.name);
    const [[row]] = await pool.query('SELECT brand, brand_id FROM product WHERE id = ?', [p.id]);
    assert.deepStrictEqual([row.brand, row.brand_id], [kent.name, kent.id]);

    // older clients that send only the name: matched (case-insensitive) to the brand row and linked by UUID
    const byName = await make({ brand: kent.name.toUpperCase() });
    assert.strictEqual(byName.brand_id, kent.id);
    assert.strictEqual(byName.brand, kent.name);
    // a name that is not in the brand table stays as legacy text (brand_id null) ...
    const legacy = await make({ brand: `${tag}-NoSuchBrand` });
    assert.strictEqual(legacy.brand_id, null);
    assert.strictEqual(legacy.brand, `${tag}-NoSuchBrand`);
    // ... unless strict mode is on
    process.env.PRODUCT_BRAND_STRICT = '1';
    try {
      r = await call('POST', P, valid({ brand: `${tag}-NoSuchBrand` }));
      assert.strictEqual(r.status, 400); assert.ok(r.body.errors[0].includes('is not in the brand list'));
    } finally { delete process.env.PRODUCT_BRAND_STRICT; }
  });

  test('product update: change the brand by id or by name, or clear it; untouched fields keep their values', async () => {
    const p = await make({ brand_id: kent.id, description: 'keep me' });
    let r = await call('PATCH', `${P}/${p.id}`, { brand_id: aqua.id });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.deepStrictEqual([r.body.data.brand_id, r.body.data.brand], [aqua.id, aqua.name]);
    assert.strictEqual(r.body.data.description, 'keep me');
    r = await call('PATCH', `${P}/${p.id}`, { brand: kent.name });
    assert.deepStrictEqual([r.body.data.brand_id, r.body.data.brand], [kent.id, kent.name]);
    r = await call('PATCH', `${P}/${p.id}`, { stock_quantity: 9 }); // brand not mentioned: stays linked
    assert.deepStrictEqual([r.body.data.brand_id, r.body.data.stock_quantity], [kent.id, 9]);
    r = await call('PATCH', `${P}/${p.id}`, { brand_id: null });
    assert.deepStrictEqual([r.body.data.brand_id, r.body.data.brand], [null, null]);
    r = await call('PATCH', `${P}/${p.id}`, { category_id: cat2.id }); // moving to another category without a subcategory of it
    assert.strictEqual(r.status, 400);
    r = await call('PATCH', `${P}/${p.id}`, { category_id: cat2.id, subcategory_id: sub2.id, category_name: cat2.category_name, subcategory_name: sub2.subcategory_name });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.deepStrictEqual([r.body.data.category_name, r.body.data.subcategory_name], [cat2.category_name, sub2.subcategory_name]);
  });

  test('renaming a brand shows up on its products at once, and brand_id / brand filters follow it', async () => {
    const p = await make({ brand_id: aqua.id });
    const oldName = aqua.name;
    let r = await call('PATCH', `/api/brands/${aqua.id}`, { name: `${tag}-Aquaguard-Renamed` });
    assert.strictEqual(r.status, 200);
    aqua = r.body.data;
    r = await call('GET', `${P}/${p.id}`);
    assert.strictEqual(r.body.data.brand, aqua.name);
    r = await call('GET', `${P}/page?brand_id=${aqua.id}&category_id=${cat.id}`);
    assert.ok(r.body.data.some((x) => x.id === p.id));
    r = await call('GET', `${P}/page?brand=${encodeURIComponent(aqua.name)}&category_id=${cat.id}`);
    assert.ok(r.body.data.some((x) => x.id === p.id));
    r = await call('GET', `${P}/page?brand=${encodeURIComponent(oldName)}&category_id=${cat.id}`);
    assert.ok(!r.body.data.some((x) => x.id === p.id), 'the old name no longer matches');
    r = await call('GET', `${P}/page?brand_id=not-a-uuid`);
    assert.strictEqual(r.status, 400);
  });

  // ------------------------------------------------------------------ foreign keys: clear messages
  test('deleting a parent that is still used returns 409 with a message that names the real reason', async () => {
    const p = await make({ brand_id: kent.id });
    let r = await call('DELETE', `/api/brands/${kent.id}`);
    assert.strictEqual(r.status, 409); assert.match(r.body.message, /brand is still used by products/);
    r = await call('DELETE', `/api/subcategories/${p.subcategory_id}`);
    assert.strictEqual(r.status, 409); assert.match(r.body.message, /subcategory still has products/);
    r = await call('DELETE', `/api/categories/${p.category_id}`);
    assert.strictEqual(r.status, 409); assert.match(r.body.message, /category still has (subcategories|products)/);
    const empty = (await call('POST', '/api/categories', { category_name: `${tag}-Empty` })).body.data;
    await call('POST', '/api/subcategories', { category_id: empty.id, subcategory_name: `${tag}-EmptySub` });
    r = await call('DELETE', `/api/categories/${empty.id}`);
    assert.strictEqual(r.status, 409); assert.match(r.body.message, /category still has subcategories/);
    await pool.query('DELETE FROM subcategory WHERE category_id = ?', [empty.id]);
    await pool.query('DELETE FROM category WHERE id = ?', [empty.id]);
    // nothing was deleted
    assert.strictEqual((await call('GET', `${P}/${p.id}`)).status, 200);
  });

  test('error handler: a missing parent row names the right field for every foreign key', () => {
    const run = (code, constraint) => {
      let out;
      const res = { status(s) { out = { status: s }; return this; }, json(b) { out.body = b; } };
      errorHandler({ code, sqlMessage: `... CONSTRAINT \`${constraint}\` FOREIGN KEY ...` }, {}, res, () => {});
      return out;
    };
    assert.deepStrictEqual(run('ER_NO_REFERENCED_ROW_2', 'fk_product_subcategory').body.errors, ['subcategory_id does not match any existing subcategory']);
    assert.deepStrictEqual(run('ER_NO_REFERENCED_ROW_2', 'fk_product_brand').body.errors, ['brand_id does not match any existing brand']);
    assert.deepStrictEqual(run('ER_NO_REFERENCED_ROW_2', 'fk_product_category').body.errors, ['category_id does not match any existing category']);
    assert.strictEqual(run('ER_ROW_IS_REFERENCED_2', 'fk_something_else').status, 409);
  });

  // ------------------------------------------------------------------ public visibility
  test('anonymous visitors only see published products; admin and staff still see everything', async () => {
    const draft = await make({ publish_status: 'draft' });
    const live = await make({ publish_status: 'published' });
    assert.strictEqual((await anon('GET', `${P}/${draft.id}`)).status, 404);
    assert.strictEqual((await anon('GET', `${P}/${live.id}`)).status, 200);
    let r = await anon('GET', `${P}/page?category_id=${cat.id}&limit=100`);
    assert.ok(r.body.data.length > 0 && r.body.data.every((x) => x.publish_status === 'published'));
    r = await anon('GET', `${P}/page?category_id=${cat.id}&publish_status=draft&limit=100`); // the URL cannot widen what the public sees
    assert.ok(r.body.data.length > 0 && r.body.data.every((x) => x.publish_status === 'published') && !r.body.data.some((x) => x.id === draft.id));
    // a bad / expired token is just "anonymous", not an error
    r = await call('GET', `${P}/${draft.id}`, undefined, { Authorization: 'Bearer garbage' });
    assert.strictEqual(r.status, 404);
    for (const auth of [adminAuth, { Authorization: `Bearer ${tokenFor('staff')}` }]) {
      assert.strictEqual((await call('GET', `${P}/${draft.id}`, undefined, auth)).status, 200);
      r = await call('GET', `${P}/page?category_id=${cat.id}&publish_status=draft&limit=100`, undefined, auth);
      assert.ok(r.body.data.some((x) => x.id === draft.id));
    }
  });

  // ------------------------------------------------------------------ category search
  test('category search treats % and _ literally', async () => {
    let r = await call('GET', '/api/categories?search=%25');
    assert.strictEqual(r.body.meta.total, 0);
    r = await call('GET', `/api/categories?search=${tag}-Cat`);
    assert.ok(r.body.meta.total >= 2);
  });
}

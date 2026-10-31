// Integration tests of the Subcategory API against your REAL MySQL database (.env).
// Opt-in so that `npm test` still works without a database:
//   Windows (cmd):  set RUN_DB_TESTS=1 && npm test
//   PowerShell:     $env:RUN_DB_TESTS=1; npm test
//   macOS/Linux:    RUN_DB_TESTS=1 npm test
// It creates its own categories/subcategories named "zz-test-..." and removes them at the end.
// Run `npm run migrate` first so the subcategory tables exist.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { adminAuth } = require('./helpers/auth'); // sets JWT_SECRET (must come before ../src/app)

const RUN = process.env.RUN_DB_TESTS === '1';
if (!RUN) {
  test('subcategory DB tests (skipped: set RUN_DB_TESTS=1 to run them against your database)', { skip: true }, () => {});
} else {
  process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sub-uploads-'));
  const { pool } = require('../src/config/db');
  const app = require('../src/app');

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
  const tag = `zz-test-${Date.now().toString(36)}`;
  let server, base, catA, catB;

  const call = async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...adminAuth }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  const upload = async () => {
    const fd = new FormData();
    fd.append('image', new Blob([PNG], { type: 'image/png' }), 'x.png');
    const res = await fetch(`${base}/api/uploads/images`, { method: 'POST', headers: adminAuth, body: fd });
    return (await res.json()).data;
  };
  const exists = async (url) => (await fetch(url)).status === 200;

  test.before(async () => {
    await new Promise((r) => { server = app.listen(0, r); });
    base = `http://127.0.0.1:${server.address().port}`;
    catA = (await call('POST', '/api/categories', { category_name: `${tag}-A` })).body.data;
    catB = (await call('POST', '/api/categories', { category_name: `${tag}-B` })).body.data;
  });

  test.after(async () => {
    // remove everything this file created (subcategories first: the foreign key blocks deleting categories)
    const [subs] = await pool.query('SELECT id FROM subcategory WHERE category_id IN (?)', [[catA.id, catB.id]]);
    for (const s of subs) await call('DELETE', `/api/subcategories/${s.id}`);
    await call('DELETE', `/api/categories/${catA.id}`);
    await call('DELETE', `/api/categories/${catB.id}`);
    await new Promise((r) => server.close(r));
    await pool.end();
    fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
  });

  let water; // main subcategory used by several tests

  test('create: UUID id, category link, brands, defaults', async () => {
    const r = await call('POST', '/api/subcategories', {
      category_id: catA.id, subcategory_name: `  ${tag} Water Purifier `, description: 'RO and UV', brand_names: ['Kent', 'Aquaguard', ' kent ', 'Pureit'],
    });
    assert.equal(r.status, 201);
    water = r.body.data;
    assert.match(water.id, UUID_RE);
    assert.equal(typeof water.id, 'string');
    assert.equal(water.category_id, catA.id);
    assert.equal(water.category_name, `${tag}-A`);
    assert.equal(water.subcategory_name, `${tag} Water Purifier`);
    assert.deepEqual(water.brand_names, ['Aquaguard', 'Kent', 'Pureit']); // "kent" duplicate dropped
    assert.equal(water.status, 1);
    assert.equal(water.image, null);
    assert.ok(water.created_at && water.updated_at);
    const other = await call('POST', '/api/subcategories', { category_id: catA.id, subcategory_name: `${tag} Spares` });
    assert.deepEqual(other.body.data.brand_names, []);
    assert.notEqual(other.body.data.id, water.id);
  });

  test('create: validation and category checks', async () => {
    let r = await call('POST', '/api/subcategories', {});
    assert.equal(r.status, 400); assert.ok(r.body.errors.some((e) => /category_id is required/.test(e)) && r.body.errors.some((e) => /subcategory_name is required/.test(e)));
    r = await call('POST', '/api/subcategories', { category_id: 'abc', subcategory_name: 'Valid' });
    assert.equal(r.status, 400); assert.match(r.body.errors[0], /category_id must be a valid UUID/);
    r = await call('POST', '/api/subcategories', { category_id: '36a8b30f-e1bc-4118-918d-b7834393e55f', subcategory_name: 'Valid' });
    assert.equal(r.status, 400); assert.match(r.body.errors[0], /does not match any existing category/);
    r = await call('POST', '/api/subcategories', { category_id: catA.id, subcategory_name: 'A' });
    assert.equal(r.status, 400);
    r = await call('POST', '/api/subcategories', { category_id: catA.id, subcategory_name: 'Valid Name', brand_names: 'Kent' });
    assert.equal(r.status, 400); assert.match(r.body.errors[0], /brand_names must be an array/);
    r = await call('POST', '/api/subcategories', { category_id: catA.id, subcategory_name: 'Valid Name', brand_names: [''] });
    assert.equal(r.status, 400);
    r = await call('POST', '/api/subcategories', { category_id: catA.id, subcategory_name: 'Valid Name', status: 'maybe' });
    assert.equal(r.status, 400);
    r = await call('POST', '/api/subcategories', { category_id: catA.id, subcategory_name: 'Valid Name', image: 'data:image/png;base64,AAAA' });
    assert.equal(r.status, 400);
    const res = await fetch(`${base}/api/subcategories`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...adminAuth }, body: '{bad' });
    assert.equal(res.status, 400);
  });

  test('create: name is unique per category, not globally', async () => {
    let r = await call('POST', '/api/subcategories', { category_id: catA.id, subcategory_name: `${tag} water purifier` }); // same name, different case
    assert.equal(r.status, 409); assert.match(r.body.message, /subcategory with this name already exists in this category/);
    r = await call('POST', '/api/subcategories', { category_id: catB.id, subcategory_name: `${tag} Water Purifier`, brand_names: ['Kent', 'Livpure'], status: 0 });
    assert.equal(r.status, 201); assert.equal(r.body.data.status, 0); assert.equal(r.body.data.category_name, `${tag}-B`);
  });

  test('read one: 200, 404, 400', async () => {
    let r = await call('GET', `/api/subcategories/${water.id}`);
    assert.equal(r.status, 200); assert.equal(r.body.data.id, water.id); assert.deepEqual(r.body.data.brand_names, water.brand_names);
    r = await call('GET', `/api/subcategories/${water.id.toUpperCase()}`);
    assert.equal(r.status, 200);
    r = await call('GET', '/api/subcategories/36a8b30f-e1bc-4118-918d-b7834393e55f');
    assert.equal(r.status, 404);
    r = await call('GET', '/api/subcategories/123'); assert.equal(r.status, 400);
  });

  test('list + filters: category, name, brand, status, pagination, wildcard escaping', async () => {
    const q = (s) => call('GET', `/api/subcategories?${s}`);
    let r = await q(`category_id=${catA.id}`);
    assert.equal(r.status, 200); assert.equal(r.body.meta.total, 2); assert.ok(r.body.data.every((s) => s.category_id === catA.id));
    r = await q(`category_id=${catA.id}&name=PURI`); // partial, case-insensitive
    assert.equal(r.body.data.length, 1); assert.equal(r.body.data[0].id, water.id);
    r = await q(`brand=ken&category_id=${catA.id}`);
    assert.equal(r.body.data.length, 1); assert.equal(r.body.data[0].id, water.id);
    r = await q(`brand=kent`); // both categories have a Kent subcategory
    assert.equal(r.body.data.filter((s) => s.subcategory_name.startsWith(tag)).length, 2);
    r = await q(`brand=zzz-none`); assert.equal(r.body.meta.total, 0);
    r = await q(`category_id=${catB.id}&status=inactive`); assert.equal(r.body.meta.total, 1);
    r = await q(`category_id=${catB.id}&status=active`); assert.equal(r.body.meta.total, 0);
    r = await q(`category_id=${catA.id}&limit=1&page=2`);
    assert.equal(r.body.data.length, 1); assert.equal(r.body.meta.totalPages, 2);
    r = await q(`category_id=${catA.id}&name=%25`); // a literal "%" must not match everything
    assert.equal(r.body.meta.total, 0);
    r = await q('category_id=nope'); assert.equal(r.status, 400);
    r = await q('limit=1000'); assert.equal(r.status, 400);
    r = await q('status=maybe'); assert.equal(r.status, 400);
  });

  test('by category: GET /api/categories/:id/subcategories', async () => {
    let r = await call('GET', `/api/categories/${catA.id}/subcategories`);
    assert.equal(r.status, 200); assert.equal(r.body.meta.total, 2);
    r = await call('GET', `/api/categories/${catA.id}/subcategories?brand=pure&name=water`);
    assert.equal(r.body.data.length, 1); assert.equal(r.body.data[0].id, water.id);
    r = await call('GET', `/api/categories/${catB.id}/subcategories?category_id=${catA.id}`); // path wins over query
    assert.ok(r.body.data.every((s) => s.category_id === catB.id));
    r = await call('GET', '/api/categories/36a8b30f-e1bc-4118-918d-b7834393e55f/subcategories'); assert.equal(r.status, 404);
    r = await call('GET', '/api/categories/abc/subcategories'); assert.equal(r.status, 400);
  });

  test('update: fields, brands replace, brands-only bumps updated_at, move category', async () => {
    let r = await call('PUT', `/api/subcategories/${water.id}`, { description: 'changed', status: 0 });
    assert.equal(r.status, 200); assert.equal(r.body.data.description, 'changed'); assert.equal(r.body.data.status, 0);
    assert.equal(r.body.data.subcategory_name, water.subcategory_name); // untouched
    assert.deepEqual(r.body.data.brand_names, water.brand_names); // brands untouched when not sent

    await new Promise((res) => setTimeout(res, 1100));
    r = await call('PATCH', `/api/subcategories/${water.id}`, { brand_names: ['Livpure', 'Havells'] });
    assert.equal(r.status, 200); assert.deepEqual(r.body.data.brand_names, ['Havells', 'Livpure']);
    assert.ok(new Date(r.body.data.updated_at) > new Date(water.updated_at)); // brand-only change still updates the timestamp
    r = await call('PUT', `/api/subcategories/${water.id}`, { brand_names: [] });
    assert.deepEqual(r.body.data.brand_names, []);
    r = await call('PUT', `/api/subcategories/${water.id}`, { brand_names: ['Kent'], description: null });
    assert.equal(r.body.data.description, null);

    // move to another category (allowed) / to a missing category (rejected) / name clash (409)
    r = await call('PUT', `/api/subcategories/${water.id}`, { category_id: '36a8b30f-e1bc-4118-918d-b7834393e55f' });
    assert.equal(r.status, 400); assert.match(r.body.errors[0], /does not match any existing category/);
    r = await call('PUT', `/api/subcategories/${water.id}`, { category_id: catB.id });
    assert.equal(r.status, 409); // catB already has a subcategory with this name
    r = await call('PUT', `/api/subcategories/${water.id}`, { category_id: catB.id, subcategory_name: `${tag} Moved` });
    assert.equal(r.status, 200); assert.equal(r.body.data.category_id, catB.id); assert.equal(r.body.data.category_name, `${tag}-B`);
    water = r.body.data;

    r = await call('PUT', `/api/subcategories/${water.id}`, {}); assert.equal(r.status, 400);
    r = await call('PUT', '/api/subcategories/36a8b30f-e1bc-4118-918d-b7834393e55f', { description: 'x' }); assert.equal(r.status, 404);
  });

  test('image: URL string stored and returned; replaced/removed files are cleaned up; shared files are protected', async () => {
    const up1 = await upload();
    let r = await call('PUT', `/api/subcategories/${water.id}`, { image: up1.url });
    assert.equal(r.status, 200); assert.equal(r.body.data.image, up1.url); assert.equal(typeof r.body.data.image, 'string');
    r = await call('GET', `/api/subcategories/${water.id}`); assert.equal(r.body.data.image, up1.url);
    assert.equal(await exists(up1.url), true);

    // an attached upload cannot be discarded through the upload API (counts subcategory images too)
    r = await call('DELETE', `/api/uploads/images/${up1.filename}`); assert.equal(r.status, 409);

    // a category sharing the same file keeps it alive when the subcategory drops it
    const shared = await call('PUT', `/api/categories/${catA.id}`, { image: up1.url });
    assert.equal(shared.status, 200);
    r = await call('PUT', `/api/subcategories/${water.id}`, { image: null });
    assert.equal(r.body.data.image, null);
    assert.equal(await exists(up1.url), true); // still used by the category
    await call('PUT', `/api/categories/${catA.id}`, { image: null });
    assert.equal(await exists(up1.url), false); // last user gone -> file deleted

    // replace: old file deleted
    const a = await upload(); const b = await upload();
    await call('PUT', `/api/subcategories/${water.id}`, { image: a.url });
    r = await call('PUT', `/api/subcategories/${water.id}`, { image: b.url });
    assert.equal(r.body.data.image, b.url);
    assert.equal(await exists(a.url), false); assert.equal(await exists(b.url), true);

    // delete subcategory: its file is deleted too
    const del = await call('DELETE', `/api/subcategories/${water.id}`);
    assert.equal(del.status, 200); assert.equal(await exists(b.url), false);
    water = null;
  });

  test('delete: brand rows cascade; a category with subcategories cannot be deleted (409)', async () => {
    const s = (await call('POST', '/api/subcategories', { category_id: catA.id, subcategory_name: `${tag} Cascade`, brand_names: ['X1', 'X2'] })).body.data;
    let r = await call('DELETE', `/api/categories/${catA.id}`);
    assert.equal(r.status, 409); assert.match(r.body.message, /still has subcategories/);
    assert.equal((await call('GET', `/api/categories/${catA.id}`)).status, 200); // category untouched

    r = await call('DELETE', `/api/subcategories/${s.id}`); assert.equal(r.status, 200);
    r = await call('GET', `/api/subcategories/${s.id}`); assert.equal(r.status, 404);
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM subcategory_brand WHERE subcategory_id = ?', [s.id]);
    assert.equal(n, 0);
    r = await call('DELETE', `/api/subcategories/${s.id}`); assert.equal(r.status, 404);
  });

  test('category API still works next to subcategories', async () => {
    let r = await call('POST', '/api/categories', { category_name: `${tag}-C`, description: 'd' });
    assert.equal(r.status, 201); assert.match(r.body.data.id, UUID_RE);
    const id = r.body.data.id;
    r = await call('PUT', `/api/categories/${id}`, { description: 'e' }); assert.equal(r.body.data.description, 'e');
    r = await call('GET', `/api/categories?search=${tag}-C`); assert.equal(r.body.data.length, 1);
    r = await call('POST', '/api/categories/lookup', { metaProdCateEnty: id }); assert.equal(r.status, 200);
    r = await call('DELETE', `/api/categories/${id}`); assert.equal(r.status, 200); // no subcategories -> deletable
  });
}
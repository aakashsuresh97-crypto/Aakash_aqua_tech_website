// End-to-end HTTP tests of the real Express app, routes, validation and error handling.
// The MySQL pool is replaced by a small in-memory fake that understands the exact SQL
// statements used by the model, so this runs without a database.
// Run against your real MySQL by using Postman (see postman/ folder).
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

process.env.DB_HOST = 'x'; process.env.DB_USER = 'x'; process.env.DB_NAME = 'x';
const fs = require('fs');
const os = require('os');
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-uploads-'));
process.env.MAX_IMAGE_SIZE_MB = '1';

// ---- in-memory fake pool ----
let rows = [];
const now = () => new Date().toISOString();
const dup = (name, exceptId) => rows.some((r) => r.category_name === name && r.id !== exceptId);
const dupErr = () => Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });

function filtered(sql, params) {
  let p = [...params];
  let out = rows;
  if (sql.includes('status = ?')) { const s = p.shift(); out = out.filter((r) => r.status === s); }
  if (sql.includes('LIKE')) {
    const a = p.shift().replace(/%/g, '').toLowerCase(); p.shift();
    out = out.filter((r) => r.category_name.toLowerCase().includes(a) || (r.description || '').toLowerCase().includes(a));
  }
  return out;
}

const fakePool = {
  async execute(sql, params = []) {
    sql = sql.replace(/\s+/g, ' ').trim();
    if (sql.startsWith('SELECT COUNT(*) AS n FROM subcategory WHERE image LIKE ?')) return [[{ n: 0 }]];
    if (/^SELECT COUNT\(\*\) AS n FROM `\w+` WHERE `\w+` LIKE \?/.test(sql)) { const e = new Error('no such table'); e.code = 'ER_NO_SUCH_TABLE'; throw e; } // storefront tables: not part of this fake
    if (sql.startsWith('SELECT COUNT(*) AS n FROM category WHERE image LIKE ?')) return [[{ n: rows.filter((r) => r.image && r.image.endsWith(params[0].slice(1))).length }]];
    if (sql.startsWith('SELECT COUNT(*)')) return [[{ total: filtered(sql, params).length }]];
    if (sql.startsWith('SELECT') && sql.includes('FROM category WHERE id = ?')) return [rows.filter((r) => r.id === params[0]).map((r) => ({ ...r }))];
    if (sql.includes('ORDER BY created_at DESC, id DESC')) {
      const [, limit, offset] = sql.match(/LIMIT (\d+) OFFSET (\d+)/).map(Number);
      return [[...filtered(sql, params)].reverse().slice(offset, offset + limit).map((r) => ({ ...r }))]; // newest first
    }
    if (sql.startsWith('INSERT INTO category')) {
      const [id, category_name, description, image, status] = params;
      if (rows.some((x) => x.id === id)) throw Object.assign(new Error('dup pk'), { code: 'ER_DUP_ENTRY', sqlMessage: `Duplicate entry '${id}' for key 'PRIMARY'` });
      if (dup(category_name)) throw dupErr();
      const r = { id, category_name, description, image, status, created_at: now(), updated_at: now() };
      rows.push(r);
      return [{ insertId: r.id, affectedRows: 1 }];
    }
    if (sql.startsWith('UPDATE category SET')) {
      const id = params[params.length - 1];
      const keys = sql.match(/SET (.*) WHERE/)[1].split(', ').map((s) => s.replace(' = ?', ''));
      const r = rows.find((x) => x.id === id);
      if (!r) return [{ affectedRows: 0 }];
      keys.forEach((k, i) => { if (k === 'category_name' && dup(params[i], id)) throw dupErr(); });
      keys.forEach((k, i) => { r[k] = params[i]; });
      r.updated_at = now();
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('DELETE FROM category')) {
      const before = rows.length; rows = rows.filter((r) => r.id !== params[0]);
      return [{ affectedRows: before - rows.length }];
    }
    throw new Error('Unhandled SQL in fake: ' + sql);
  },
};

// transactions + the category_id_log registry (rollback discards reservations made in that transaction)
const idLog = new Set();
fakePool.getConnection = async () => {
  let pending = [];
  return {
    async beginTransaction() { pending = []; },
    async commit() { pending.forEach((i) => idLog.add(i)); pending = []; },
    async rollback() { pending = []; },
    release() {},
    async execute(sql, params = []) {
      if (sql.startsWith('INSERT IGNORE INTO category_id_log')) {
        const id = params[0];
        if (idLog.has(id) || pending.includes(id)) return [{ affectedRows: 0 }];
        pending.push(id);
        return [{ affectedRows: 1 }];
      }
      return fakePool.execute(sql, params);
    },
  };
};

const dbPath = require.resolve(path.join(__dirname, '..', 'src', 'config', 'db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { pool: fakePool, testConnection: async () => {} } };
const { adminAuth } = require('./helpers/auth'); // sets JWT_SECRET; must come before ../src/app
const app = require('../src/app');

let server, base;
test.before(async () => { await new Promise((r) => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`; });
test.after(() => server.close());

const call = async (method, url, body, raw) => {
  const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...adminAuth }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
  return { status: res.status, body: await res.json() };
};

test('CRUD flow', async () => {
  // CREATE
  let r = await call('POST', '/api/categories', { category_name: '  Water Purifiers ', description: 'RO and UV', image: 'https://img/x.png' });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.category_name, 'Water Purifiers');
  assert.equal(r.body.data.status, 1);
  const id = r.body.data.id;

  r = await call('POST', '/api/categories', { category_name: 'Spares', status: 'inactive' });
  assert.equal(r.status, 201); assert.equal(r.body.data.status, 0);

  // READ ALL (+ filters, pagination)
  r = await call('GET', '/api/categories');
  assert.equal(r.status, 200); assert.equal(r.body.meta.total, 2);
  r = await call('GET', '/api/categories?status=active');
  assert.equal(r.body.data.length, 1);
  r = await call('GET', '/api/categories?search=spare');
  assert.equal(r.body.data[0].category_name, 'Spares');
  r = await call('GET', '/api/categories?limit=1&page=2');
  assert.equal(r.body.data.length, 1); assert.equal(r.body.meta.totalPages, 2);

  // READ ONE
  r = await call('GET', `/api/categories/${id}`);
  assert.equal(r.status, 200); assert.equal(r.body.data.id, id);

  // UPDATE
  r = await call('PUT', `/api/categories/${id}`, { category_name: 'RO Purifiers', status: 0 });
  assert.equal(r.status, 200); assert.equal(r.body.data.category_name, 'RO Purifiers'); assert.equal(r.body.data.status, 0);
  assert.equal(r.body.data.description, 'RO and UV'); // untouched field preserved

  // DELETE
  r = await call('DELETE', `/api/categories/${id}`);
  assert.equal(r.status, 200);
  r = await call('GET', `/api/categories/${id}`);
  assert.equal(r.status, 404);
});

test('validation and error handling', async () => {
  let r = await call('POST', '/api/categories', {});
  assert.equal(r.status, 400); assert.match(r.body.errors[0], /category_name is required/);
  r = await call('POST', '/api/categories', { category_name: 'A' });
  assert.equal(r.status, 400);
  r = await call('POST', '/api/categories', { category_name: 'Valid', status: 'maybe' });
  assert.equal(r.status, 400);
  r = await call('POST', '/api/categories', { category_name: 'Valid', image: 123 });
  assert.equal(r.status, 400);
  r = await call('POST', '/api/categories', null, '{bad json');
  assert.equal(r.status, 400); assert.match(r.body.message, /Malformed JSON/);
  r = await call('GET', '/api/categories/abc');
  assert.equal(r.status, 400);
  r = await call('GET', '/api/categories/0');
  assert.equal(r.status, 400);
  r = await call('GET', '/api/categories/359464704'); // old numeric ids are no longer valid ids
  assert.equal(r.status, 400); assert.match(r.body.errors[0], /valid UUID/);
  r = await call('GET', '/api/categories/36a8b30f-e1bc-4118-918d-b7834393e55g'); // non-hex character
  assert.equal(r.status, 400);
  r = await call('GET', '/api/categories?limit=1000');
  assert.equal(r.status, 400);
  r = await call('PUT', '/api/categories/36a8b30f-e1bc-4118-918d-b7834393e55f', { category_name: 'Nope' });
  assert.equal(r.status, 404);
  r = await call('DELETE', '/api/categories/36a8b30f-e1bc-4118-918d-b7834393e55f');
  assert.equal(r.status, 404);
  r = await call('PUT', '/api/categories/36a8b30f-e1bc-4118-918d-b7834393e55f', {});
  assert.equal(r.status, 400);
  r = await call('GET', '/api/unknown');
  assert.equal(r.status, 404);
});

test('duplicate names return 409', async () => {
  await call('POST', '/api/categories', { category_name: 'Unique One' });
  let r = await call('POST', '/api/categories', { category_name: 'Unique One' });
  assert.equal(r.status, 409);
  const other = await call('POST', '/api/categories', { category_name: 'Unique Two' });
  r = await call('PUT', `/api/categories/${other.body.data.id}`, { category_name: 'Unique One' });
  assert.equal(r.status, 409);
});

// ---------------------------------------------------------------------------
// Image upload (multipart/form-data)
// ---------------------------------------------------------------------------
const UPLOAD_DIR = path.join(process.env.UPLOAD_DIR, 'categories');
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)]);
const filesOnDisk = () => fs.readdirSync(UPLOAD_DIR).filter((f) => !f.startsWith('.'));

const form = (fields, file) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  if (file) fd.append(file.field || 'image', new Blob([file.data], { type: file.type }), file.name);
  return fd;
};
const send = async (method, url, fd) => {
  const res = await fetch(base + url, { method, headers: adminAuth, body: fd });
  return { status: res.status, body: await res.json() };
};

test('upload: create with image, URL saved and file is served', async () => {
  const r = await send('POST', '/api/categories', form({ category_name: 'Upload Create', description: 'with pic', status: '1' }, { data: PNG, type: 'image/png', name: 'my photo.png' }));
  assert.equal(r.status, 201);
  const url = r.body.data.image;
  assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/uploads\/categories\/[0-9a-f-]{36}\.png$/);
  assert.equal(r.body.data.description, 'with pic');
  assert.equal(filesOnDisk().length >= 1, true);

  const img = await fetch(url);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await img.arrayBuffer()), PNG);

  // the saved URL is returned by GET too (this is what the UI list/edit screens read)
  const got = await call('GET', `/api/categories/${r.body.data.id}`);
  assert.equal(got.body.data.image, url);
});

test('upload: replacing the image deletes the old file; removing deletes the file and nulls the column', async () => {
  const before = filesOnDisk().length;
  let r = await send('POST', '/api/categories', form({ category_name: 'Upload Replace' }, { data: PNG, type: 'image/png', name: 'a.png' }));
  const id = r.body.data.id; const oldUrl = r.body.data.image;
  assert.equal(filesOnDisk().length, before + 1);

  r = await send('PUT', `/api/categories/${id}`, form({}, { data: JPG, type: 'image/jpeg', name: 'b.jpg' })); // file only, no other field
  assert.equal(r.status, 200);
  assert.match(r.body.data.image, /\.jpg$/);
  assert.notEqual(r.body.data.image, oldUrl);
  assert.equal((await fetch(oldUrl)).status, 404);
  assert.equal(filesOnDisk().length, before + 1); // old removed, new added

  // editing text without a file keeps the image
  r = await send('PUT', `/api/categories/${id}`, form({ category_name: 'Upload Replace 2' }));
  assert.equal(r.status, 200); assert.match(r.body.data.image, /\.jpg$/);
  const keptUrl = r.body.data.image;

  // remove via JSON image:null (what the UI sends)
  r = await call('PUT', `/api/categories/${id}`, { image: null });
  assert.equal(r.status, 200); assert.equal(r.body.data.image, null);
  assert.equal((await fetch(keptUrl)).status, 404);
  assert.equal(filesOnDisk().length, before);

  // remove via multipart remove_image=true
  r = await send('POST', '/api/categories', form({ category_name: 'Upload Remove' }, { data: PNG, type: 'image/png', name: 'c.png' }));
  r = await send('PATCH', `/api/categories/${r.body.data.id}`, form({ remove_image: 'true' }));
  assert.equal(r.status, 200); assert.equal(r.body.data.image, null);
  assert.equal(filesOnDisk().length, before);
});

test('upload: deleting a category deletes its image file', async () => {
  const before = filesOnDisk().length;
  let r = await send('POST', '/api/categories', form({ category_name: 'Upload Delete' }, { data: PNG, type: 'image/png', name: 'd.png' }));
  const { id, image } = r.body.data;
  assert.equal(filesOnDisk().length, before + 1);
  r = await call('DELETE', `/api/categories/${id}`);
  assert.equal(r.status, 200);
  assert.equal(filesOnDisk().length, before);
  assert.equal((await fetch(image)).status, 404);
});

test('upload: external image URLs (legacy rows) still work and are never touched on disk', async () => {
  const before = filesOnDisk().length;
  let r = await call('POST', '/api/categories', { category_name: 'Upload External', image: 'https://example.com/uploads/categories/x.png' });
  assert.equal(r.status, 201);
  r = await call('PUT', `/api/categories/${r.body.data.id}`, { image: null });
  assert.equal(r.status, 200); assert.equal(filesOnDisk().length, before);
});

test('upload: validation rejects bad type, fake image, oversize, wrong field - and leaves no files behind', async () => {
  const before = filesOnDisk().length;
  let r = await send('POST', '/api/categories', form({ category_name: 'Bad Type' }, { data: Buffer.from('hello'), type: 'text/plain', name: 'a.txt' }));
  assert.equal(r.status, 400); assert.match(r.body.errors[0], /JPG, PNG, WEBP and GIF/);

  r = await send('POST', '/api/categories', form({ category_name: 'Fake Image' }, { data: Buffer.from('<script>alert(1)</script>'.padEnd(64, ' ')), type: 'image/png', name: 'evil.png' }));
  assert.equal(r.status, 400); assert.match(r.body.message, /Invalid image file/);

  r = await send('POST', '/api/categories', form({ category_name: 'Too Big' }, { data: Buffer.concat([PNG, Buffer.alloc(1024 * 1024 + 10)]), type: 'image/png', name: 'big.png' }));
  assert.equal(r.status, 413); assert.match(r.body.errors[0], /1 MB/);

  r = await send('POST', '/api/categories', form({ category_name: 'Wrong Field' }, { field: 'photo', data: PNG, type: 'image/png', name: 'a.png' }));
  assert.equal(r.status, 400);

  // valid image but invalid body -> the saved upload must be cleaned up
  r = await send('POST', '/api/categories', form({ category_name: 'X' }, { data: PNG, type: 'image/png', name: 'a.png' }));
  assert.equal(r.status, 400);

  // valid image but duplicate name -> 409 and no orphan file
  await call('POST', '/api/categories', { category_name: 'Dup With Image' });
  r = await send('POST', '/api/categories', form({ category_name: 'Dup With Image' }, { data: PNG, type: 'image/png', name: 'a.png' }));
  assert.equal(r.status, 409);

  // update on a missing id with a file -> 404 and no orphan file
  r = await send('PUT', '/api/categories/36a8b30f-e1bc-4118-918d-b7834393e55f', form({ category_name: 'Nope' }, { data: PNG, type: 'image/png', name: 'a.png' }));
  assert.equal(r.status, 404);

  await new Promise((r2) => setTimeout(r2, 100)); // cleanup runs on response close
  assert.equal(filesOnDisk().length, before);
});

test('upload: multipart without a file behaves like JSON (empty description -> null)', async () => {
  let r = await send('POST', '/api/categories', form({ category_name: 'Plain Multipart', description: 'x' }));
  assert.equal(r.status, 201); assert.equal(r.body.data.image, null);
  r = await send('PUT', `/api/categories/${r.body.data.id}`, form({ description: '' }));
  assert.equal(r.status, 200); assert.equal(r.body.data.description, null);
});

test.after(() => fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true }));

// ---------------------------------------------------------------------------
// UUID ids
// ---------------------------------------------------------------------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

test('ids: every new category gets a distinct UUID returned as a string', async () => {
  const ids = [];
  for (let i = 0; i < 40; i += 1) {
    const r = await call('POST', '/api/categories', { category_name: `Rand ${i}` });
    assert.equal(r.status, 201);
    assert.equal(typeof r.body.data.id, 'string');
    assert.match(r.body.data.id, UUID_RE);
    ids.push(r.body.data.id);
  }
  assert.equal(new Set(ids).size, ids.length);
  // the id is also a string in list and single responses
  const list = await call('GET', '/api/categories?limit=1');
  assert.equal(typeof list.body.data[0].id, 'string');
  assert.equal(list.body.data[0].id, ids[ids.length - 1]); // newest first
  const one = await call('GET', `/api/categories/${ids[0]}`);
  assert.equal(one.body.data.id, ids[0]);
});

test('ids: the client cannot choose the id', async () => {
  const chosen = '11111111-2222-4333-8444-555555555555';
  const r = await call('POST', '/api/categories', { category_name: 'Client Id', id: chosen });
  assert.equal(r.status, 201);
  assert.notEqual(r.body.data.id, chosen);
  const u = await call('PUT', `/api/categories/${r.body.data.id}`, { category_name: 'Client Id 2', id: chosen });
  assert.equal(u.status, 200); assert.equal(u.body.data.id, r.body.data.id);
});

test('ids: upper-case UUIDs in the URL are accepted and normalised', async () => {
  const created = await call('POST', '/api/categories', { category_name: 'Case Test' });
  const r = await call('GET', `/api/categories/${created.body.data.id.toUpperCase()}`);
  assert.equal(r.status, 200); assert.equal(r.body.data.id, created.body.data.id);
});

test('ids: an id of a deleted category is never reissued', async () => {
  const crypto = require('crypto');
  const original = crypto.randomUUID;
  const A = '555a0001-0000-4000-8000-000000000001';
  const B = '555a0002-0000-4000-8000-000000000002';
  const seq = [A, A, B];
  crypto.randomUUID = () => seq.shift();
  try {
    let r = await call('POST', '/api/categories', { category_name: 'Reuse A' });
    assert.equal(r.body.data.id, A);
    await call('DELETE', `/api/categories/${A}`);
    r = await call('POST', '/api/categories', { category_name: 'Reuse B' }); // generator offers A again -> skipped
    assert.equal(r.status, 201);
    assert.equal(r.body.data.id, B);
  } finally { crypto.randomUUID = original; }
});

test('ids: collision with an existing row (not in the registry) is retried safely', async () => {
  const crypto = require('crypto');
  const original = crypto.randomUUID;
  const X = '666a0001-0000-4000-8000-000000000001';
  const Y = '666a0002-0000-4000-8000-000000000002';
  rows.push({ id: X, category_name: 'Legacy preexisting', description: null, image: null, status: 1, created_at: now(), updated_at: now() });
  const seq = [X, Y];
  crypto.randomUUID = () => seq.shift();
  try {
    const r = await call('POST', '/api/categories', { category_name: 'After collision' });
    assert.equal(r.status, 201); assert.equal(r.body.data.id, Y);
  } finally { crypto.randomUUID = original; }
});

test('metaProdCateEnty: {"metaProdCateEnty": "<uuid>"} resolves the category (v1 and v4 UUIDs)', async () => {
  const created = await call('POST', '/api/categories', { category_name: 'Meta Lookup' });
  let r = await call('POST', '/api/categories/lookup', { metaProdCateEnty: created.body.data.id });
  assert.equal(r.status, 200); assert.equal(r.body.data.category_name, 'Meta Lookup'); assert.equal(r.body.data.id, created.body.data.id);

  // the v1-style example UUID is a valid format; it just does not exist here
  r = await call('POST', '/api/categories/lookup', { metaProdCateEnty: 'a57fb27e-1f57-11ec-be13-30d16b5c82e9' });
  assert.equal(r.status, 404);

  r = await call('POST', '/api/categories/lookup', { metaProdCateEnty: created.body.data.id.toUpperCase() });
  assert.equal(r.status, 200);

  r = await call('POST', '/api/categories/lookup', { metaProdCateEnty: 'not-a-uuid' });
  assert.equal(r.status, 400); assert.match(r.body.errors[0], /metaProdCateEnty must be a valid UUID/);
  r = await call('POST', '/api/categories/lookup', { metaProdCateEnty: 12345 });
  assert.equal(r.status, 400);
  r = await call('POST', '/api/categories/lookup', {});
  assert.equal(r.status, 400); assert.match(r.body.errors[0], /metaProdCateEnty is required/);
});

test('ids: a duplicate name does not consume an id and still returns 409', async () => {
  await call('POST', '/api/categories', { category_name: 'Name Taken' });
  const r = await call('POST', '/api/categories', { category_name: 'Name Taken' });
  assert.equal(r.status, 409);
});

test('ids: concurrent creates all succeed with distinct ids', async () => {
  const results = await Promise.all(Array.from({ length: 25 }, (_, i) => call('POST', '/api/categories', { category_name: `Parallel ${i}` })));
  assert.ok(results.every((r) => r.status === 201));
  assert.equal(new Set(results.map((r) => r.body.data.id)).size, 25);
});

test('images: only URLs/paths are stored - inline image data is rejected', async () => {
  let r = await call('POST', '/api/categories', { category_name: 'Data URI', image: 'data:image/png;base64,iVBORw0KGgo=' });
  assert.equal(r.status, 400); assert.match(r.body.errors[0], /not embedded image data/);
  r = await call('POST', '/api/categories', { category_name: 'Url Ok', image: 'https://aakashaquatech.in/wp-content/uploads/2026/06/x-300x300.png' });
  assert.equal(r.status, 201);
});

// ---------------------------------------------------------------------------
// Two-step image flow: upload the file once (multipart), then save the URL as a plain string (JSON)
// ---------------------------------------------------------------------------
const uploadFile = (data = PNG, type = 'image/png', name = 'pic.png', field = 'image') =>
  send('POST', '/api/uploads/images', form({}, { field, data, type, name }));
const fileOf = (url) => path.basename(new URL(url).pathname);

test('two-step: upload returns a URL, stores nothing in the DB, and the file is served', async () => {
  const rowsBefore = rows.length;
  const r = await uploadFile();
  assert.equal(r.status, 201);
  assert.match(r.body.data.url, /^http:\/\/127\.0\.0\.1:\d+\/uploads\/categories\/[0-9a-f-]{36}\.png$/);
  assert.equal(r.body.data.mimetype, 'image/png');
  assert.equal(rows.length, rowsBefore); // no category row was created
  const img = await fetch(r.body.data.url);
  assert.equal(img.status, 200);
  assert.deepEqual(Buffer.from(await img.arrayBuffer()), PNG);
  await call('DELETE', `/api/uploads/images/${r.body.data.filename}`); // tidy
});

test('two-step: create + update with the URL as a JSON string; GET returns the same URL string', async () => {
  const up = await uploadFile();
  let r = await call('POST', '/api/categories', { category_name: 'TwoStep Create', description: 'd', image: up.body.data.url });
  assert.equal(r.status, 201);
  assert.equal(typeof r.body.data.image, 'string');
  assert.equal(r.body.data.image, up.body.data.url);
  assert.match(r.body.data.id, UUID_RE);
  const id = r.body.data.id;
  // stored in the DB as the URL string, not as file data
  assert.equal(rows.find((x) => x.id === id).image, up.body.data.url);

  r = await call('GET', `/api/categories/${id}`);
  assert.equal(r.body.data.image, up.body.data.url);
  r = await call('GET', '/api/categories?search=TwoStep');
  assert.equal(r.body.data[0].image, up.body.data.url);

  // replace the image: upload a second file, PUT its URL as JSON -> old file is deleted
  const up2 = await uploadFile(JPG, 'image/jpeg', 'b.jpg');
  r = await call('PUT', `/api/categories/${id}`, { image: up2.body.data.url });
  assert.equal(r.status, 200); assert.equal(r.body.data.image, up2.body.data.url);
  assert.equal((await fetch(up.body.data.url)).status, 404);
  assert.equal((await fetch(up2.body.data.url)).status, 200);
  // changing other fields keeps the image
  r = await call('PUT', `/api/categories/${id}`, { description: 'changed' });
  assert.equal(r.body.data.image, up2.body.data.url);

  // remove the image
  r = await call('PUT', `/api/categories/${id}`, { image: null });
  assert.equal(r.body.data.image, null);
  assert.equal((await fetch(up2.body.data.url)).status, 404);
});

test('two-step: a file shared by two categories is not deleted until the last one releases it', async () => {
  const up = await uploadFile();
  const a = await call('POST', '/api/categories', { category_name: 'Share A', image: up.body.data.url });
  const b = await call('POST', '/api/categories', { category_name: 'Share B', image: up.body.data.url });
  await call('DELETE', `/api/categories/${a.body.data.id}`);
  assert.equal((await fetch(up.body.data.url)).status, 200); // B still uses it
  await call('DELETE', `/api/categories/${b.body.data.id}`);
  assert.equal((await fetch(up.body.data.url)).status, 404);
});

test('two-step: discarding an unattached upload works; attached uploads are refused', async () => {
  const up = await uploadFile();
  let r = await call('DELETE', `/api/uploads/images/${up.body.data.filename}`);
  assert.equal(r.status, 200);
  assert.equal((await fetch(up.body.data.url)).status, 404);
  r = await call('DELETE', `/api/uploads/images/${up.body.data.filename}`);
  assert.equal(r.status, 404);

  const up2 = await uploadFile();
  const cat = await call('POST', '/api/categories', { category_name: 'Attached', image: up2.body.data.url });
  r = await call('DELETE', `/api/uploads/images/${up2.body.data.filename}`);
  assert.equal(r.status, 409);
  assert.equal((await fetch(up2.body.data.url)).status, 200);
  await call('DELETE', `/api/categories/${cat.body.data.id}`);

  r = await call('DELETE', '/api/uploads/images/..%2F..%2Fetc%2Fpasswd');
  assert.equal(r.status, 400);
  r = await call('DELETE', '/api/uploads/images/not-a-real-name.png');
  assert.equal(r.status, 400);
});

test('two-step: upload endpoint validates the file and leaves nothing behind', async () => {
  const before = filesOnDisk().length;
  let r = await uploadFile(Buffer.from('hello'), 'text/plain', 'a.txt');
  assert.equal(r.status, 400); assert.match(r.body.errors[0], /JPG, PNG, WEBP and GIF/);
  r = await uploadFile(Buffer.from('<script>alert(1)</script>'.padEnd(64, ' ')), 'image/png', 'evil.png');
  assert.equal(r.status, 400); assert.match(r.body.message, /Invalid image file/);
  r = await uploadFile(Buffer.concat([PNG, Buffer.alloc(1024 * 1024 + 10)]));
  assert.equal(r.status, 413);
  r = await uploadFile(PNG, 'image/png', 'a.png', 'photo');
  assert.equal(r.status, 400);
  r = await send('POST', '/api/uploads/images', form({ note: 'no file' })); // multipart without a file
  assert.equal(r.status, 400); assert.match(r.body.message, /Image file is required/);
  r = await call('POST', '/api/uploads/images', {}); // JSON, no file
  assert.equal(r.status, 400);
  await new Promise((r2) => setTimeout(r2, 100));
  assert.equal(filesOnDisk().length, before);
});

test('two-step: JSON requests never carry binary - inline image data is still rejected', async () => {
  const r = await call('POST', '/api/categories', { category_name: 'No Binary', image: 'data:image/png;base64,iVBORw0KGgo=' });
  assert.equal(r.status, 400);
});
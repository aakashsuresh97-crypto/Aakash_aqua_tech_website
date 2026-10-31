// HTTP tests of admin login and route protection against the real Express app.
// The MySQL pool is replaced by a tiny in-memory fake that understands the admin_user statements,
// so this runs without a database (same approach as category.api.test.js).
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.DB_HOST = 'x'; process.env.DB_USER = 'x'; process.env.DB_NAME = 'x';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-uploads-'));
process.env.AUTH_LOGIN_MAX_ATTEMPTS = '15';
process.env.CORS_ORIGINS = 'https://shop.example.com';
const { tokenFor } = require('./helpers/auth');

const users = [
  { id: '22222222-2222-4222-8222-222222222222', email: 'admin@example.com', full_name: 'Admin One', role: 'admin', status: 1, password_hash: bcrypt.hashSync('correct-horse', 4), last_login_at: null },
  { id: '33333333-3333-4333-8333-333333333333', email: 'staff@example.com', full_name: 'Staff One', role: 'staff', status: 1, password_hash: bcrypt.hashSync('staff-password', 4), last_login_at: null },
  { id: '44444444-4444-4444-8444-444444444444', email: 'off@example.com', full_name: 'Disabled', role: 'admin', status: 0, password_hash: bcrypt.hashSync('disabled-pass', 4), last_login_at: null },
];
const fakePool = {
  async execute(sql, params = []) {
    sql = sql.replace(/\s+/g, ' ').trim();
    if (sql.includes('FROM customer WHERE email = ?')) return [[]]; // no customer accounts in this fake database
    if (sql.includes('FROM admin_user WHERE email = ?')) return [users.filter((u) => u.email === params[0]).map((u) => ({ ...u }))];
    if (sql.includes('FROM admin_user WHERE id = ?')) return [users.filter((u) => u.id === params[0]).map(({ password_hash, ...u }) => u)];
    if (sql.startsWith('UPDATE admin_user SET last_login_at')) { users.find((u) => u.id === params[0]).last_login_at = new Date(); return [{ affectedRows: 1 }]; }
    if (sql.startsWith('SELECT COUNT(*)')) return [[{ total: 0 }]];
    if (sql.includes('ORDER BY created_at DESC')) return [[]];
    throw new Error('Unexpected SQL in auth test: ' + sql);
  },
  async query() { return [[]]; },
};
const dbPath = require.resolve('../src/config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { pool: fakePool, testConnection: async () => {} } };
const app = require('../src/app');

let server; let base;
test.before(async () => { await new Promise((r) => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`; });
test.after(() => { server.close(); fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true }); });

const call = async (method, url, { body, token, headers } = {}) => {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
};

// Runs last in the file on purpose: it exhausts the login rate limit for this IP.
const login = (email, password) => call('POST', '/api/auth/login', { body: { email, password } });

test('login: valid credentials return a token and the user (no hash)', async () => {
  const r = await login('Admin@Example.com ', 'correct-horse');
  assert.equal(r.status, 200);
  assert.equal(r.body.success, true);
  assert.equal(r.body.data.user.email, 'admin@example.com');
  assert.equal(r.body.data.user.role, 'admin');
  assert.equal(r.body.data.user.password_hash, undefined);
  const claims = jwt.verify(r.body.data.token, process.env.JWT_SECRET, { audience: 'admin' });
  assert.equal(claims.sub, users[0].id);
  assert.ok(users[0].last_login_at);
});

test('login: wrong password, unknown email and disabled user all get the same 401', async () => {
  const a = await login('admin@example.com', 'nope');
  const b = await login('nobody@example.com', 'whatever1');
  const c = await login('off@example.com', 'disabled-pass');
  for (const r of [a, b, c]) { assert.equal(r.status, 401); assert.equal(r.body.message, 'Invalid email or password'); }
});

test('login: validation errors return 400', async () => {
  assert.equal((await login('not-an-email', 'x')).status, 400);
  assert.equal((await login('admin@example.com', '')).status, 400);
  assert.equal((await call('POST', '/api/auth/login', { body: ['x'] })).status, 400);
});

test('GET /api/auth/me needs a valid token', async () => {
  assert.equal((await call('GET', '/api/auth/me')).status, 401);
  assert.equal((await call('GET', '/api/auth/me', { token: 'garbage' })).status, 401);
  const ok = await call('GET', '/api/auth/me', { token: tokenFor('admin', users[0].id) });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.email, 'admin@example.com');
  // valid signature but the account is disabled -> 401 so the admin app signs out
  assert.equal((await call('GET', '/api/auth/me', { token: tokenFor('admin', users[2].id) })).status, 401);
});

test('tokens: expired, wrong secret, wrong audience and alg=none are rejected', async () => {
  const expired = tokenFor('admin', users[0].id, { expiresIn: -10 });
  const r = await call('GET', '/api/auth/me', { token: expired });
  assert.equal(r.status, 401);
  assert.match(r.body.message, /expired/i);
  const wrongSecret = jwt.sign({ role: 'admin' }, 'x'.repeat(40), { subject: users[0].id, audience: 'admin', issuer: 'category-api' });
  assert.equal((await call('GET', '/api/auth/me', { token: wrongSecret })).status, 401);
  const wrongAud = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { subject: users[0].id, audience: 'customer', issuer: 'category-api' });
  assert.equal((await call('GET', '/api/auth/me', { token: wrongAud })).status, 401);
  const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: users[0].id, role: 'admin', aud: 'admin', iss: 'category-api' })).toString('base64url')}.`;
  assert.equal((await call('GET', '/api/auth/me', { token: none })).status, 401);
});

const WRITES = [
  ['POST', '/api/categories', { category_name: 'X Cat' }],
  ['PUT', '/api/categories/36a8b30f-e1bc-4118-918d-b7834393e55f', { category_name: 'X Cat' }],
  ['PATCH', '/api/categories/36a8b30f-e1bc-4118-918d-b7834393e55f', { category_name: 'X Cat' }],
  ['DELETE', '/api/categories/36a8b30f-e1bc-4118-918d-b7834393e55f'],
  ['POST', '/api/subcategories', {}],
  ['PUT', '/api/subcategories/36a8b30f-e1bc-4118-918d-b7834393e55f', {}],
  ['PATCH', '/api/subcategories/36a8b30f-e1bc-4118-918d-b7834393e55f', {}],
  ['DELETE', '/api/subcategories/36a8b30f-e1bc-4118-918d-b7834393e55f'],
  ['POST', '/api/v1/products', {}],
  ['PUT', '/api/v1/products/36a8b30f-e1bc-4118-918d-b7834393e55f', {}],
  ['PATCH', '/api/v1/products/36a8b30f-e1bc-4118-918d-b7834393e55f', {}],
  ['DELETE', '/api/v1/products/36a8b30f-e1bc-4118-918d-b7834393e55f'],
  ['POST', '/api/uploads/images'],
  ['DELETE', '/api/uploads/images/abc.png'],
];

test('every create / edit / delete / upload route returns 401 without a token', async () => {
  for (const [m, u, body] of WRITES) {
    const r = await call(m, u, { body });
    assert.equal(r.status, 401, `${m} ${u} should require login`);
    assert.equal(r.body.success, false);
  }
});

test('staff can create / edit but not delete; admin passes the delete gate', async () => {
  const staff = tokenFor('staff', users[1].id);
  const admin = tokenFor('admin', users[0].id);
  for (const u of ['/api/categories/36a8b30f-e1bc-4118-918d-b7834393e55f', '/api/subcategories/36a8b30f-e1bc-4118-918d-b7834393e55f', '/api/v1/products/36a8b30f-e1bc-4118-918d-b7834393e55f']) {
    assert.equal((await call('DELETE', u, { token: staff })).status, 403, `staff DELETE ${u}`);
    assert.notEqual((await call('DELETE', u, { token: admin })).status, 403, `admin DELETE ${u}`);
    assert.notEqual((await call('DELETE', u, { token: admin })).status, 401);
  }
  // staff passes the auth gate on create (then fails validation = 400, not 401/403)
  assert.equal((await call('POST', '/api/categories', { token: staff, body: {} })).status, 400);
});

test('public read routes and purchase checks stay open without a token', async () => {
  assert.equal((await call('GET', '/api/categories')).status, 200);
  assert.notEqual((await call('GET', '/api/subcategories')).status, 401); // the fake pool does not model this table; we only check the auth gate
  assert.notEqual((await call('POST', '/api/categories/lookup', { body: {} })).status, 401);
  assert.notEqual((await call('POST', '/api/v1/products/36a8b30f-e1bc-4118-918d-b7834393e55f/add-to-cart', { body: {} })).status, 401);
  assert.notEqual((await call('POST', '/api/v1/products/36a8b30f-e1bc-4118-918d-b7834393e55f/buy-now', { body: {} })).status, 401);
  assert.equal((await call('GET', '/health')).status, 200);
});

test('CORS: only the configured origin is allowed', async () => {
  const ok = await call('GET', '/health', { headers: { Origin: 'https://shop.example.com' } });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://shop.example.com');
  const bad = await call('GET', '/health', { headers: { Origin: 'https://evil.example.com' } });
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
});

test('login is rate limited (429 after too many attempts from one IP)', async () => {
  let last;
  for (let i = 0; i < 25; i++) { last = await login('admin@example.com', 'wrong-again'); if (last.status === 429) break; }
  assert.equal(last.status, 429);
  assert.equal(last.body.success, false);
});

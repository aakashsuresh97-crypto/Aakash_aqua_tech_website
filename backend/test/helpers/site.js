// Shared setup for the storefront DB tests (run against your real MySQL with RUN_DB_TESTS=1, like the other *.db.test.js files).
// Sets the environment BEFORE ../src/app is loaded, starts the app on a random port, and offers small helpers.
process.env.TZ = process.env.TZ_FOR_TESTS || 'UTC'; // tests assume Node and the DB server share a clock/zone
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

process.env.RAZORPAY_KEY_ID = 'rzp_test_unit';
process.env.RAZORPAY_KEY_SECRET = 'unit-test-key-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'unit-test-webhook-secret';
process.env.NOTIFY_CONSOLE = '0';
process.env.SMS_CONSOLE_QUIET = '1';
process.env.FORM_RATE_MAX = process.env.FORM_RATE_MAX || '1000';
process.env.CUSTOMER_LOGIN_RATE_MAX = '1000';
process.env.CUSTOMER_REGISTER_RATE_MAX = '1000';
process.env.AUTH_LOGIN_MAX_ATTEMPTS = '1000';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'site-uploads-'));
const { tokenFor } = require('./auth');

const razorpay = require('../../src/services/razorpay');
const sms = require('../../src/services/sms');
const notifier = require('../../src/services/notifier');
const { pool } = require('../../src/config/db');
const app = require('../../src/app');

const TAG = crypto.randomBytes(3).toString('hex');
let server; let base;
async function start() {
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
}
async function stop() {
  await new Promise((r) => server.close(r));
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
  await pool.end();
}

const admin = { Authorization: `Bearer ${tokenFor('admin', '11111111-1111-4111-8111-111111111111')}` };
const staff = { Authorization: `Bearer ${tokenFor('staff', '22222222-2222-4222-8222-222222222222')}` };

async function api(method, url, { headers = {}, body, raw, query } = {}) {
  const qs = query ? `?${new URLSearchParams(query)}` : '';
  const res = await fetch(base + url + qs, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const type = res.headers.get('content-type') || '';
  const out = type.includes('application/json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, body: out, headers: res.headers };
}

// ---- a fake Razorpay (the real API cannot be called from tests) ----
const gateway = { orders: [], refunds: [], failNext: false, failRefund: false };
razorpay.setFetch(async (url, init) => {
  const body = init.body ? JSON.parse(init.body) : {};
  const respond = (status, json) => ({ ok: status < 400, status, json: async () => json });
  if (url.endsWith('/orders') && init.method === 'POST') {
    if (gateway.failNext) { gateway.failNext = false; return respond(400, { error: { description: 'Gateway says no' } }); }
    const o = { id: `order_T${TAG}${gateway.orders.length + 1}`, amount: body.amount, currency: body.currency, receipt: body.receipt };
    gateway.orders.push(o);
    return respond(200, o);
  }
  const m = url.match(/\/payments\/(pay_[A-Za-z0-9]+)\/refund$/);
  if (m) {
    if (gateway.failRefund) return respond(400, { error: { description: 'Refund rejected' } });
    const r = { id: `rfnd_T${TAG}${gateway.refunds.length + 1}`, payment_id: m[1], amount: body.amount };
    gateway.refunds.push(r);
    return respond(200, r);
  }
  return respond(404, { error: { description: 'unexpected call' } });
});

const sign = (orderId, paymentId) => crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
const payId = () => `pay_T${crypto.randomBytes(5).toString('hex')}`;
function webhook(event, { eventId = `evt_${crypto.randomBytes(5).toString('hex')}`, secret = process.env.RAZORPAY_WEBHOOK_SECRET } = {}) {
  const raw = JSON.stringify(event);
  const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return api('POST', '/api/webhooks/razorpay', { raw, headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': signature, 'X-Razorpay-Event-Id': eventId } });
}

let seq = Math.floor(Math.random() * 90000) + 10000;
const newEmail = () => `buyer${++seq}.${TAG}@example.com`;
const PASSWORD = 'Str0ng!Passw0rd';

/** Registers a new customer through the real endpoint (email + password) and returns the id and Authorization header. */
async function loginCustomer(email = newEmail(), password = PASSWORD) {
  const r = await api('POST', '/api/customer/auth/register', { body: { name: 'Test Buyer', email, password } });
  if (r.status !== 201) throw new Error(`register failed: ${JSON.stringify(r.body)}`);
  return { email, password, id: r.body.data.customer.id, headers: { Authorization: `Bearer ${r.body.data.token}` } };
}

const ADDRESS = { full_name: 'Test Buyer', mobile: '9876543210', line1: '12 Test Street', city: 'Salem', state: 'Tamil Nadu', pin_code: '636016' };

module.exports = { start, stop, api, admin, staff, gateway, sign, payId, webhook, loginCustomer, newEmail, PASSWORD, TAG, pool, sms, notifier, razorpay, ADDRESS, tokenFor, get base() { return base; } };

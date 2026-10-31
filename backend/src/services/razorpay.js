// Razorpay gateway adapter (REST API, no SDK). Keys come from .env:
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET  - Dashboard > Account & Settings > API keys (use the Test keys while developing)
//   RAZORPAY_WEBHOOK_SECRET               - the secret you type when creating the webhook in the Dashboard
// The secret never leaves the server; only the public key id is sent to the browser.
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

const API = process.env.RAZORPAY_API_BASE || 'https://api.razorpay.com/v1'; // override only for local mock-gateway testing
let fetchImpl = (...args) => fetch(...args); // replaced in tests

const keyId = () => process.env.RAZORPAY_KEY_ID || '';
const keySecret = () => process.env.RAZORPAY_KEY_SECRET || '';
const isConfigured = () => Boolean(keyId() && keySecret());

async function call(method, path, body) {
  if (!isConfigured()) throw new ApiError(503, 'Online payment is not available right now. Please choose Cash on Delivery or try again later.');
  let res;
  try {
    res = await fetchImpl(`${API}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')}` },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    throw new ApiError(502, 'Could not reach the payment gateway. Please try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Razorpay error', res.status, json && json.error && json.error.description);
    throw new ApiError(502, (json && json.error && json.error.description) || 'The payment gateway rejected the request');
  }
  return json;
}

/** amountPaise: integer. Returns the Razorpay order ({ id, amount, currency, ... }). */
const createOrder = ({ amountPaise, receipt, notes }) => call('POST', '/orders', { amount: amountPaise, currency: 'INR', receipt, notes });
const refundPayment = (paymentId, amountPaise, notes) => call('POST', `/payments/${encodeURIComponent(paymentId)}/refund`, { amount: amountPaise, speed: 'normal', notes });

const safeEqualHex = (a, b) => {
  const x = Buffer.from(String(a || ''), 'utf8'); const y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
/** Checkout signature: HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret) */
const verifyPaymentSignature = (orderId, paymentId, signature) =>
  safeEqualHex(crypto.createHmac('sha256', keySecret()).update(`${orderId}|${paymentId}`).digest('hex'), signature);
/** Webhook signature: HMAC_SHA256(raw request body, webhook secret) */
const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  return Boolean(secret) && safeEqualHex(crypto.createHmac('sha256', secret).update(rawBody).digest('hex'), signature);
};

module.exports = { isConfigured, keyId, createOrder, refundPayment, verifyPaymentSignature, verifyWebhookSignature, setFetch: (f) => { fetchImpl = f; } };

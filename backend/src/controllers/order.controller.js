const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { normalizeUuid } = require('../utils/uuid');
const { parse, parseOne, isPlainObject } = require('../utils/fields');
const orders = require('../services/orderService');
const razorpay = require('../services/razorpay');
const { buildInvoicePdf } = require('../services/invoicePdf');
const { parseAddress } = require('./customer.controller');
const { newUuid } = require('../utils/uuid');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const num = (v) => Number(v);
const contains = (v) => `%${v.replace(/[\\%_]/g, '\\$&')}%`;
const STATUSES = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PAY_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'];

const orderId = (req) => {
  const id = normalizeUuid(req.params.id);
  if (!id) throw new ApiError(400, 'Invalid order id', ['id must be a valid UUID']);
  return id;
};

function shape(o, { items, payments, refunds, admin } = {}) {
  const out = {
    id: o.id, order_number: o.order_number, status: o.status, payment_method: o.payment_method, payment_status: o.payment_status,
    subtotal: num(o.subtotal), discount_total: num(o.discount_total), shipping_total: num(o.shipping_total), total: num(o.total), refund_amount: num(o.refund_amount),
    shipping_address: { full_name: o.ship_name, mobile: o.ship_mobile, line1: o.ship_line1, line2: o.ship_line2, city: o.ship_city, state: o.ship_state, pin_code: o.ship_pin },
    customer_notes: o.customer_notes, tracking_info: o.tracking_info,
    invoice_number: o.invoice_number, invoice_date: o.invoice_date, invoice_available: Boolean(o.invoice_number),
    can_cancel: ['placed', 'confirmed'].includes(o.status),
    can_pay: o.payment_method === 'razorpay' && o.status === 'placed' && ['pending', 'failed'].includes(o.payment_status) && Boolean(o.razorpay_order_id),
    placed_at: o.placed_at, confirmed_at: o.confirmed_at, shipped_at: o.shipped_at, delivered_at: o.delivered_at, cancelled_at: o.cancelled_at,
  };
  if (items) out.items = items.map((i) => ({ product_id: i.product_id, name: i.product_name, sku: i.sku, brand: i.brand, image_url: i.image_url, quantity: i.quantity, unit_price: num(i.unit_price), mrp: num(i.mrp), gst_percent: num(i.gst_percent), line_total: num(i.line_total) }));
  if (admin) {
    out.customer_id = o.customer_id; out.admin_notes = o.admin_notes; out.razorpay_order_id = o.razorpay_order_id; out.razorpay_payment_id = o.razorpay_payment_id;
    out.payments = (payments || []).map((p) => ({ id: p.id, provider: p.provider, provider_order_id: p.provider_order_id, provider_payment_id: p.provider_payment_id, amount: num(p.amount), status: p.status, signature_verified: Boolean(p.signature_verified), error_message: p.error_message, created_at: p.created_at }));
    out.refunds = (refunds || []).map((r) => ({ id: r.id, provider_refund_id: r.provider_refund_id, amount: num(r.amount), reason: r.reason, status: r.status, created_at: r.created_at }));
  }
  return out;
}

async function loadOrder(id, { customerId, admin } = {}) {
  const [[o]] = await pool.execute(`SELECT * FROM orders WHERE id = ?${customerId ? ' AND customer_id = ?' : ''}`, customerId ? [id, customerId] : [id]);
  if (!o) throw new ApiError(404, 'Order not found');
  const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ? ORDER BY product_name', [id]);
  let payments; let refunds;
  if (admin) {
    [payments] = await pool.execute('SELECT * FROM payment WHERE order_id = ? ORDER BY created_at', [id]);
    [refunds] = await pool.execute('SELECT * FROM refund WHERE order_id = ? ORDER BY created_at', [id]);
  }
  return { raw: o, items, view: shape(o, { items, payments, refunds, admin }) };
}

// =================================================================== customer
// POST /api/customer/orders
exports.checkout = wrap(async (req, res) => {
  const body = isPlainObject(req.body) ? req.body : {};
  const errors = [];
  const method = body.payment_method;
  if (!['razorpay', 'cod'].includes(method)) errors.push('payment_method must be "razorpay" or "cod"');

  // 1) the address: a saved one, or one typed at checkout
  let address = null;
  if (body.address_id) {
    const aid = normalizeUuid(body.address_id);
    if (!aid) errors.push('address_id must be a valid UUID');
    else {
      const [[a]] = await pool.execute('SELECT * FROM customer_address WHERE id = ? AND customer_id = ?', [aid, req.customer.id]);
      if (!a) errors.push('address_id does not match any of your saved addresses');
      else address = a;
    }
  } else {
    const parsed = parseAddress(body.address);
    errors.push(...parsed.errors);
    address = parsed.data;
  }
  const notes = parseOne('notes', { type: 'text', max: 500, label: 'notes' }, body.notes);
  if (notes.error) errors.push(notes.error);

  // 2) the lines: "buy now" items, or the server-side cart
  let lines = [];
  const fromCart = !body.items;
  if (body.items !== undefined) {
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) errors.push('items must be a list of 1 to 50 products');
    else {
      for (const it of body.items) {
        const q = isPlainObject(it) && (it.quantity === undefined ? 1 : Number(it.quantity));
        const pid = isPlainObject(it) && normalizeUuid(it.product_id);
        let id = pid;
        if (!id && isPlainObject(it) && typeof it.slug === 'string') {
          const [[p]] = await pool.execute('SELECT id FROM product WHERE slug = ?', [it.slug.trim().toLowerCase()]);
          id = p && p.id;
        }
        if (!id || !Number.isInteger(q) || q < 1 || q > 99) { errors.push('Each item needs a valid product_id (or slug) and a quantity from 1 to 99'); break; }
        lines.push({ product_id: id, quantity: q });
      }
    }
  } else {
    const [rows] = await pool.execute('SELECT product_id, quantity FROM cart_item WHERE customer_id = ?', [req.customer.id]);
    lines = rows.map((r) => ({ product_id: r.product_id, quantity: Number(r.quantity) }));
    if (!lines.length) errors.push('Your cart is empty');
  }
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  if (method === 'razorpay' && !razorpay.isConfigured()) throw new ApiError(503, 'Online payment is not available right now. Please choose Cash on Delivery or try again later.');

  const result = await orders.placeOrder({ customerId: req.customer.id, lines, address, method, notes: notes.value, clearCart: fromCart });
  if (!body.address_id && (body.save_address === true || body.save_address === 'true')) {
    const [[{ n }]] = await pool.execute('SELECT COUNT(*) AS n FROM customer_address WHERE customer_id = ?', [req.customer.id]);
    if (Number(n) < 10) {
      await pool.execute(
        'INSERT INTO customer_address (id, customer_id, full_name, mobile, line1, line2, city, state, pin_code, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [newUuid(), req.customer.id, address.full_name, address.mobile, address.line1, address.line2 || null, address.city, address.state, address.pin_code, Number(n) === 0 ? 1 : 0]).catch(() => {});
    }
  }
  const { view } = await loadOrder(result.order_id, { customerId: req.customer.id });
  res.status(201).json({ success: true, message: method === 'cod' ? 'Order placed' : 'Order created. Complete the payment to confirm it.', data: { order: view, payment: result.checkout } });
});

exports.myOrders = wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const [[{ total }]] = await pool.execute('SELECT COUNT(*) AS total FROM orders WHERE customer_id = ?', [req.customer.id]);
  const [rows] = await pool.execute(`SELECT * FROM orders WHERE customer_id = ? ORDER BY placed_at DESC, id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, [req.customer.id]);
  const ids = rows.map((r) => r.id);
  const items = ids.length ? (await pool.query('SELECT * FROM order_items WHERE order_id IN (?) ORDER BY product_name', [ids]))[0] : [];
  res.json({ success: true, data: rows.map((o) => shape(o, { items: items.filter((i) => i.order_id === o.id) })), meta: { total: Number(total), page, limit, totalPages: Math.ceil(total / limit) } });
});

exports.myOrder = wrap(async (req, res) => {
  const { view } = await loadOrder(orderId(req), { customerId: req.customer.id });
  res.json({ success: true, data: view });
});

exports.cancel = wrap(async (req, res) => {
  const id = orderId(req);
  await orders.cancelOrder(id, { reason: 'Cancelled by customer', by: 'customer', customerId: req.customer.id });
  const { view } = await loadOrder(id, { customerId: req.customer.id });
  res.json({ success: true, message: view.payment_status === 'paid' ? 'Order cancelled. Your refund has been started.' : 'Order cancelled', data: view });
});

// GET /api/customer/orders/:id/payment - parameters to (re)open the Razorpay checkout for an unpaid online order
exports.paymentParams = wrap(async (req, res) => {
  const { raw, view } = await loadOrder(orderId(req), { customerId: req.customer.id });
  if (!view.can_pay) throw new ApiError(409, 'This order does not need a payment');
  const [[c]] = await pool.execute('SELECT name, email, mobile FROM customer WHERE id = ?', [req.customer.id]);
  res.json({ success: true, data: { ...orders.checkoutParams(raw.razorpay_order_id, Math.round(num(raw.total) * 100), raw.order_number), prefill: { name: c.name || raw.ship_name, email: c.email || '', contact: raw.ship_mobile || c.mobile || '' } } });
});

// POST /api/customer/orders/:id/payment/verify  - the three values Razorpay's checkout hands back after a successful payment
exports.verifyPayment = wrap(async (req, res) => {
  const id = orderId(req);
  const b = isPlainObject(req.body) ? req.body : {};
  const errs = [];
  if (!/^order_[A-Za-z0-9]{6,40}$/.test(String(b.razorpay_order_id || ''))) errs.push('razorpay_order_id is invalid');
  if (!/^pay_[A-Za-z0-9]{6,40}$/.test(String(b.razorpay_payment_id || ''))) errs.push('razorpay_payment_id is invalid');
  if (!/^[a-f0-9]{64}$/i.test(String(b.razorpay_signature || ''))) errs.push('razorpay_signature is invalid');
  if (errs.length) throw new ApiError(400, 'Validation failed', errs);
  const { raw } = await loadOrder(id, { customerId: req.customer.id });
  if (raw.payment_method !== 'razorpay' || raw.razorpay_order_id !== b.razorpay_order_id) throw new ApiError(400, 'This payment does not belong to this order');
  if (!razorpay.verifyPaymentSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature)) {
    await orders.markPaymentFailed({ razorpayOrderId: b.razorpay_order_id, paymentId: b.razorpay_payment_id, message: 'Signature verification failed' });
    throw new ApiError(400, 'Payment verification failed. If money was deducted it will be refunded automatically; please contact us.');
  }
  await orders.markPaid({ razorpayOrderId: b.razorpay_order_id, paymentId: b.razorpay_payment_id, signatureVerified: true });
  const { view } = await loadOrder(id, { customerId: req.customer.id });
  res.json({ success: true, message: 'Payment successful', data: view });
});

// POST /api/customer/orders/:id/payment/failed - the checkout reports a failed / abandoned attempt (informational; the order stays payable)
exports.paymentFailed = wrap(async (req, res) => {
  const { raw } = await loadOrder(orderId(req), { customerId: req.customer.id });
  if (raw.razorpay_order_id) await orders.markPaymentFailed({ razorpayOrderId: raw.razorpay_order_id, message: String((isPlainObject(req.body) && req.body.reason) || 'Payment failed').slice(0, 300) });
  res.json({ success: true, message: 'Noted. You can try the payment again from My Orders.' });
});

async function sendInvoice(res, id, customerId) {
  const { raw, items } = await loadOrder(id, { customerId });
  if (!raw.invoice_number) throw new ApiError(409, 'The invoice is available once the order is confirmed');
  const pdf = await buildInvoicePdf(raw, items);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="invoice-${raw.order_number}.pdf"`, 'Content-Length': pdf.length, 'Cache-Control': 'private, no-store' });
  res.send(pdf);
}
exports.myInvoice = wrap((req, res) => sendInvoice(res, orderId(req), req.customer.id));
exports.adminInvoice = wrap((req, res) => sendInvoice(res, orderId(req), null));

// =================================================================== admin
exports.adminList = wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const where = []; const params = [];
  for (const [name, values] of [['status', STATUSES], ['payment_status', PAY_STATUSES], ['payment_method', ['razorpay', 'cod']]]) {
    if (!req.query[name]) continue;
    const r = parseOne(name, { type: 'enum', values }, req.query[name]);
    if (r.error) throw new ApiError(400, 'Validation failed', [r.error]);
    where.push(`o.${name} = ?`); params.push(r.value);
  }
  for (const [name, op] of [['from', '>='], ['to', '<=']]) {
    if (!req.query[name]) continue;
    const r = parseOne(name, { type: 'date' }, req.query[name]);
    if (r.error) throw new ApiError(400, 'Validation failed', [r.error]);
    where.push(`o.placed_at ${op} ?`); params.push(name === 'from' ? `${r.value} 00:00:00` : `${r.value} 23:59:59`);
  }
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  if (search) { where.push('(o.order_number LIKE ? OR o.ship_name LIKE ? OR o.ship_mobile LIKE ? OR o.invoice_number LIKE ?)'); for (let i = 0; i < 4; i += 1) params.push(contains(search)); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM orders o ${clause}`, params);
  const [rows] = await pool.execute(`SELECT o.* FROM orders o ${clause} ORDER BY o.placed_at DESC, o.id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params);
  res.json({ success: true, data: rows.map((o) => ({ ...shape(o), customer_id: o.customer_id, razorpay_payment_id: o.razorpay_payment_id })), meta: { total: Number(total), page, limit, totalPages: Math.ceil(total / limit) } });
});

exports.adminGet = wrap(async (req, res) => {
  const { view } = await loadOrder(orderId(req), { admin: true });
  res.json({ success: true, data: view });
});

// PATCH /api/orders/:id/status { status, tracking_info, admin_notes }
exports.adminStatus = wrap(async (req, res) => {
  const id = orderId(req);
  const { data, errors } = parse({
    status: { type: 'enum', values: STATUSES, required: true },
    tracking_info: { type: 'str', max: 255 },
    admin_notes: { type: 'text', max: 1000 },
  }, req.body);
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  const b = isPlainObject(req.body) ? req.body : {};
  await orders.changeStatus(id, data.status, {
    trackingInfo: 'tracking_info' in b ? data.tracking_info : undefined,
    adminNotes: 'admin_notes' in b ? data.admin_notes : undefined,
    adminId: req.admin.id,
  });
  const { view } = await loadOrder(id, { admin: true });
  res.json({ success: true, message: `Order is now ${data.status}`, data: view });
});

// POST /api/orders/:id/refund { amount?, reason? }   (admin role only)
exports.adminRefund = wrap(async (req, res) => {
  const id = orderId(req);
  const { data, errors } = parse({ amount: { type: 'decimal', min: 0.01, max: 99999999 }, reason: { type: 'str', max: 255 } }, req.body);
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  const result = await orders.refundOrder(id, { amount: data.amount ?? undefined, reason: data.reason, adminId: req.admin.id });
  const { view } = await loadOrder(id, { admin: true });
  res.json({ success: true, message: `Refunded ₹${result.refunded}`, data: view });
});

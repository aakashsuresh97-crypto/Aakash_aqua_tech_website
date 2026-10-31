// Order life cycle: checkout (stock reduced inside one DB transaction), payment confirmation, cancel / restock,
// refunds, status changes, invoice numbers, expiry of unpaid online orders.
// External calls (Razorpay) are never made while a stock-locking transaction is open, except the admin refund
// (which locks only that one order row).
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { newUuid } = require('../utils/uuid');
const { toProduct } = require('../models/product.model');
const { assertPurchasable } = require('../utils/productActions');
const { toPaise, toRupees, splitGst, financialYear } = require('../utils/money');
const razorpay = require('./razorpay');
const { notify } = require('./notifier');

const SYSTEM_USER = '00000000-0000-0000-0000-000000000000';
const MAX_LINE_QTY = 99;

async function withTx(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally { conn.release(); }
}

/** Next number of a sequence (order / invoice) for the current financial year; atomic, gap-free per transaction. */
async function nextNumber(conn, name) {
  const fy = financialYear();
  const [r] = await conn.execute(
    'INSERT INTO number_sequence (name, fy, last_no) VALUES (?, ?, LAST_INSERT_ID(1)) ON DUPLICATE KEY UPDATE last_no = LAST_INSERT_ID(last_no + 1)', [name, fy.label]);
  return { no: Number(r.insertId), fy };
}
const pad = (n, w) => String(n).padStart(w, '0');

async function assignInvoice(conn, orderId) {
  const [[o]] = await conn.execute('SELECT invoice_number FROM orders WHERE id = ?', [orderId]);
  if (o.invoice_number) return o.invoice_number;
  const { no, fy } = await nextNumber(conn, 'invoice');
  const number = `AQ/${fy.label}/${pad(no, 5)}`;
  await conn.execute('UPDATE orders SET invoice_number = ?, invoice_date = CURDATE() WHERE id = ?', [number, orderId]);
  return number;
}

// ------------------------------------------------------------------ checkout
/**
 * lines: [{ product_id, quantity }]  address: validated address object  method: 'razorpay' | 'cod'
 * Re-prices every line from the database, re-checks stock under a row lock, reduces stock, and creates the order.
 */
async function placeOrder({ customerId, lines, address, method, notes, clearCart }) {
  if (!lines.length) throw new ApiError(400, 'Your cart is empty');
  if (method === 'cod' && process.env.COD_ENABLED === '0') throw new ApiError(400, 'Cash on Delivery is not available');

  const merged = new Map();
  for (const l of lines) merged.set(l.product_id, Math.min(MAX_LINE_QTY, (merged.get(l.product_id) || 0) + l.quantity));
  const ids = [...merged.keys()].sort();

  const order = await withTx(async (conn) => {
    const [rows] = await conn.query('SELECT * FROM product WHERE id IN (?) ORDER BY id FOR UPDATE', [ids]); // lock in a fixed order: no deadlocks
    const byId = new Map(rows.map((r) => [r.id, r]));
    const items = [];
    let totalPaise = 0; let mrpPaise = 0;
    const errors = [];
    for (const id of ids) {
      const row = byId.get(id);
      const qty = merged.get(id);
      if (!row) { errors.push('A product in your cart no longer exists'); continue; }
      const p = toProduct(row);
      try { assertPurchasable(p, qty); } catch (err) {
        errors.push(`${p.product_name}: ${(err.details && err.details[0]) || err.message}`);
        continue;
      }
      const unit = toPaise(p.effective_price);
      const line = unit * qty;
      const { taxable, gst } = p.tax_status === 'none' ? { taxable: line, gst: 0 } : splitGst(line, p.gst_percent);
      totalPaise += line; mrpPaise += toPaise(p.mrp) * qty;
      items.push({ p, qty, unit, line, taxable, gst });
    }
    if (errors.length) throw new ApiError(409, 'Some items in your cart cannot be ordered', errors);
    if (method === 'cod' && Number(process.env.COD_MAX_AMOUNT) > 0 && totalPaise > toPaise(process.env.COD_MAX_AMOUNT)) {
      throw new ApiError(400, `Cash on Delivery is available only up to ₹${Number(process.env.COD_MAX_AMOUNT).toLocaleString('en-IN')}. Please pay online.`);
    }
    if (method === 'razorpay' && totalPaise < 100) throw new ApiError(400, 'The order total must be at least ₹1 for online payment');

    for (const { p, qty } of items) { // take the stock
      if (!p.manage_stock) continue;
      const left = Math.max(0, p.stock_quantity - qty);
      const status = left > 0 ? 'instock' : (p.backorders === 'no' ? 'outofstock' : 'onbackorder');
      await conn.execute('UPDATE product SET stock_quantity = ?, stock_status = ? WHERE id = ?', [left, status, p.id]);
    }

    const { no, fy } = await nextNumber(conn, 'order');
    const orderId = newUuid();
    const orderNumber = `AQ${fy.short}-${pad(no, 6)}`;
    await conn.execute(
      `INSERT INTO orders (id, order_number, customer_id, status, payment_method, payment_status, subtotal, discount_total, shipping_total, total,
         ship_name, ship_mobile, ship_line1, ship_line2, ship_city, ship_state, ship_pin, customer_notes)
       VALUES (?, ?, ?, 'placed', ?, 'pending', ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, orderNumber, customerId, method, toRupees(mrpPaise), toRupees(mrpPaise - totalPaise), toRupees(totalPaise),
        address.full_name, address.mobile, address.line1, address.line2 || null, address.city, address.state, address.pin_code, notes || null]);
    for (const { p, qty, unit, line, taxable, gst } of items) {
      await conn.execute(
        `INSERT INTO order_items (id, order_id, product_id, product_name, sku, brand, image_url, quantity, unit_price, mrp, gst_percent, line_total, taxable_value, gst_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newUuid(), orderId, p.id, p.product_name, p.sku, p.brand, p.image_url, qty, toRupees(unit), p.mrp, p.tax_status === 'none' ? 0 : p.gst_percent, toRupees(line), toRupees(taxable), toRupees(gst)]);
    }
    if (clearCart) await conn.query('DELETE FROM cart_item WHERE customer_id = ? AND product_id IN (?)', [customerId, ids]);
    await conn.execute('INSERT INTO payment (id, order_id, provider, amount, status) VALUES (?, ?, ?, ?, ?)', [newUuid(), orderId, method, toRupees(totalPaise), 'created']);
    return { id: orderId, order_number: orderNumber, total_paise: totalPaise };
  });

  let checkout = null;
  if (method === 'razorpay') {
    try {
      const rp = await razorpay.createOrder({ amountPaise: order.total_paise, receipt: order.order_number, notes: { order_number: order.order_number } });
      await pool.execute('UPDATE orders SET razorpay_order_id = ? WHERE id = ?', [rp.id, order.id]);
      await pool.execute(`UPDATE payment SET provider_order_id = ? WHERE order_id = ? AND provider = 'razorpay'`, [rp.id, order.id]);
      checkout = checkoutParams(rp.id, order.total_paise, order.order_number);
    } catch (err) {
      // could not start the payment: give the stock back and cancel, so nothing is left reserved
      await cancelOrder(order.id, { reason: 'Online payment could not be started', by: 'system' }).catch((e) => console.error('Rollback of order failed:', e.message));
      throw err;
    }
  }
  notifyAdminOrder(order.id, 'order.placed', 'New order')
  return { order_id: order.id, checkout };
}


/** Emails the ADMIN the full order (customer, address, items) - uses notify(), i.e. SMTP_* + NOTIFY_EMAIL_TO from .env. Never throws. */
async function notifyAdminOrder(orderId, event, title) {
  try {
    const [[o]] = await pool.execute('SELECT o.*, c.email AS cust_email FROM orders o JOIN customer c ON c.id = o.customer_id WHERE o.id = ?', [orderId]);
    const [items] = await pool.execute('SELECT product_name, quantity, line_total FROM order_items WHERE order_id = ?', [orderId]);
    if (!o) return;
    const pay = o.payment_method === 'cod' ? 'Cash on Delivery' : (o.payment_status === 'paid' ? 'Paid online (Razorpay)' : 'Razorpay (awaiting payment)');
    const text = [
      `Order ${o.order_number}`,
      `Payment: ${pay}`,
      `Total: ₹${o.total}`,
      '',
      'ITEMS',
      ...items.map((i) => `- ${i.product_name} x ${i.quantity} = ₹${i.line_total}`),
      '',
      'CUSTOMER',
      `${o.ship_name}  |  Mobile: ${o.ship_mobile}${o.cust_email ? `  |  Email: ${o.cust_email}` : ''}`,
      `${o.ship_line1}${o.ship_line2 ? ', ' + o.ship_line2 : ''}, ${o.ship_city}, ${o.ship_state} - ${o.ship_pin}`,
      o.customer_notes ? `Note: ${o.customer_notes}` : '',
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
    notify(event, `${title} ${o.order_number}`, text, { id: o.id });
  } catch (err) { console.error('[notify:admin-order] failed:', err.message); }
}

const checkoutParams = (razorpayOrderId, amountPaise, orderNumber) => ({
  provider: 'razorpay', key_id: razorpay.keyId(), razorpay_order_id: razorpayOrderId, amount: amountPaise, currency: 'INR', name: 'Aakash Pure Aqua Tech', description: `Order ${orderNumber}`,
});

// ------------------------------------------------------------------ payment confirmation
/** Marks the order paid (idempotent). Called by the checkout verify endpoint and by the webhook. */
async function markPaid({ razorpayOrderId, paymentId, signatureVerified }) {
  let result = { found: false };
  let refundAfter = null;
  await withTx(async (conn) => {
    const [[order]] = await conn.execute('SELECT * FROM orders WHERE razorpay_order_id = ? FOR UPDATE', [razorpayOrderId]);
    if (!order) return;
    result = { found: true, order_id: order.id, order_number: order.order_number, already: order.payment_status === 'paid' || order.payment_status === 'refunded' || order.payment_status === 'partially_refunded' };
    if (result.already) {
      if (signatureVerified) await conn.execute(`UPDATE payment SET signature_verified = 1 WHERE order_id = ? AND provider_order_id = ?`, [order.id, razorpayOrderId]);
      return;
    }
    await conn.execute(`UPDATE payment SET status = 'paid', provider_payment_id = ?, signature_verified = ?, error_message = NULL WHERE order_id = ? AND provider_order_id = ?`,
      [paymentId, signatureVerified ? 1 : 0, order.id, razorpayOrderId]);
    if (order.status === 'cancelled') {
      // the customer paid after the order was cancelled (e.g. it expired): keep the money record and refund it
      await conn.execute(`UPDATE orders SET payment_status = 'paid', razorpay_payment_id = ?, admin_notes = LEFT(CONCAT_WS(' | ', admin_notes, 'Payment received after the order was cancelled - refund started'), 1000) WHERE id = ?`, [paymentId, order.id]);
      refundAfter = order.id;
      return;
    }
    await conn.execute(`UPDATE orders SET payment_status = 'paid', razorpay_payment_id = ?, status = IF(status = 'placed', 'confirmed', status), confirmed_at = IF(confirmed_at IS NULL, CURRENT_TIMESTAMP, confirmed_at) WHERE id = ?`, [paymentId, order.id]);
    await assignInvoice(conn, order.id);
  });
  if (refundAfter) {
    await refundOrder(refundAfter, { reason: 'Payment received after the order was cancelled', adminId: null }).catch((e) => {
      console.error('Auto refund failed:', e.message);
      notify('order.refund_needed', 'Refund needed', `Order ${result.order_number}: payment arrived after cancellation and the automatic refund failed (${e.message}). Please refund manually.`);
    });
  } else if (result.found && !result.already) {
    notifyAdminOrder(result.order_id, 'order.paid', 'Payment received:')
  }
  return result;
}

async function markPaymentFailed({ razorpayOrderId, paymentId, message }) {
  const [[order]] = await pool.execute('SELECT id, payment_status FROM orders WHERE razorpay_order_id = ?', [razorpayOrderId]);
  if (!order) return false;
  await pool.execute(`UPDATE payment SET status = 'failed', provider_payment_id = COALESCE(?, provider_payment_id), error_message = ? WHERE order_id = ? AND provider_order_id = ? AND status <> 'paid'`,
    [paymentId || null, (message || 'Payment failed').slice(0, 500), order.id, razorpayOrderId]);
  if (order.payment_status === 'pending') await pool.execute(`UPDATE orders SET payment_status = 'failed' WHERE id = ? AND payment_status = 'pending'`, [order.id]);
  return true;
}

// ------------------------------------------------------------------ cancel / restock
async function restock(conn, orderId) {
  const [items] = await conn.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL ORDER BY product_id', [orderId]);
  for (const it of items) {
    const [[row]] = await conn.execute('SELECT id, manage_stock, backorders, stock_quantity FROM product WHERE id = ? FOR UPDATE', [it.product_id]);
    if (!row || !row.manage_stock) continue;
    await conn.execute(`UPDATE product SET stock_quantity = stock_quantity + ?, stock_status = 'instock' WHERE id = ?`, [it.quantity, it.product_id]);
  }
}

/** Cancels an order that has not shipped, returns its stock, and refunds an online payment. Idempotent. */
async function cancelOrder(orderId, { reason, by = 'customer', customerId } = {}) {
  let paid = false;
  await withTx(async (conn) => {
    const [[order]] = await conn.execute('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!order || (customerId && order.customer_id !== customerId)) throw new ApiError(404, 'Order not found');
    if (order.status === 'cancelled') return;
    if (!['placed', 'confirmed'].includes(order.status)) throw new ApiError(409, `An order that is ${order.status} cannot be cancelled`);
    await restock(conn, orderId);
    await conn.execute(`UPDATE orders SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, admin_notes = LEFT(CONCAT_WS(' | ', admin_notes, ?), 1000) WHERE id = ?`,
      [`Cancelled by ${by}${reason ? `: ${reason}` : ''}`, orderId]);
    paid = order.payment_status === 'paid' && order.payment_method === 'razorpay';
  });
  if (paid) {
    await refundOrder(orderId, { reason: reason || 'Order cancelled', adminId: null }).catch((e) => {
      console.error('Auto refund failed:', e.message);
      notify('order.refund_needed', 'Refund needed', `A paid order was cancelled and the automatic refund failed (${e.message}). Please refund it from the admin Orders screen.`);
    });
  }
}

/** Cancels online orders that were never paid within the window, so their stock is released. */
async function expireUnpaidOrders(minutes = Number(process.env.ORDER_PAYMENT_WINDOW_MIN) || 30) {
  const [rows] = await pool.execute(
    `SELECT id FROM orders WHERE payment_method = 'razorpay' AND status = 'placed' AND payment_status IN ('pending','failed') AND placed_at < DATE_SUB(NOW(), INTERVAL ? MINUTE) LIMIT 100`, [minutes]);
  let n = 0;
  for (const r of rows) {
    try { await cancelOrder(r.id, { reason: 'Payment not completed in time', by: 'system' }); n += 1; } catch (e) { console.error('Could not expire order:', e.message); }
  }
  return n;
}

// ------------------------------------------------------------------ refunds
/** amount in rupees (default: everything not refunded yet). Online payments go through Razorpay; COD refunds are recorded as manual. */
async function refundOrder(orderId, { amount, reason, adminId }) {
  return withTx(async (conn) => {
    const [[order]] = await conn.execute('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!order) throw new ApiError(404, 'Order not found');
    if (!['paid', 'partially_refunded'].includes(order.payment_status)) throw new ApiError(409, 'Only a paid order can be refunded');
    const remaining = toPaise(order.total) - toPaise(order.refund_amount);
    const wanted = amount === undefined || amount === null ? remaining : toPaise(amount);
    if (!(wanted > 0) || wanted > remaining) throw new ApiError(400, 'Validation failed', [`amount must be between ₹0.01 and ₹${toRupees(remaining)}`]);
    let providerRefundId = null;
    let status = 'manual';
    if (order.payment_method === 'razorpay') {
      if (!order.razorpay_payment_id) throw new ApiError(409, 'This order has no Razorpay payment to refund');
      const r = await razorpay.refundPayment(order.razorpay_payment_id, wanted, { order_number: order.order_number, reason: reason || '' });
      providerRefundId = r.id; status = 'processed';
    }
    const refunded = toPaise(order.refund_amount) + wanted;
    try {
      await conn.execute('INSERT INTO refund (id, order_id, provider_refund_id, amount, reason, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [newUuid(), orderId, providerRefundId, toRupees(wanted), reason ? String(reason).slice(0, 255) : null, status, adminId || SYSTEM_USER]);
      await conn.execute('UPDATE orders SET refund_amount = ?, payment_status = ? WHERE id = ?', [toRupees(refunded), refunded >= toPaise(order.total) ? 'refunded' : 'partially_refunded', orderId]);
    } catch (err) {
      // The money has already left through Razorpay but our records could not be saved (the transaction rolls back).
      // Tell the owner; the "refund.processed" webhook will also record it by its refund id (recordExternalRefund ignores known ids).
      if (providerRefundId) notify('order.refund_unrecorded', 'Refund sent but not recorded', `Order ${order.order_number}: Razorpay refund ${providerRefundId} (₹${toRupees(wanted)}) went through but saving it failed (${err.message}). It will be recorded when Razorpay's webhook arrives; otherwise add it by hand.`);
      throw err;
    }
    return { refunded: toRupees(wanted), total_refunded: toRupees(refunded), provider_refund_id: providerRefundId };
  });
}

/** Razorpay told us a refund was processed (maybe started from their dashboard): record it if we do not know it yet. */
async function recordExternalRefund({ paymentId, refundId, amountPaise }) {
  await withTx(async (conn) => {
    const [[order]] = await conn.execute('SELECT * FROM orders WHERE razorpay_payment_id = ? FOR UPDATE', [paymentId]);
    if (!order) return;
    const [[known]] = await conn.execute('SELECT 1 AS x FROM refund WHERE provider_refund_id = ?', [refundId]);
    if (known) return;
    const refunded = Math.min(toPaise(order.total), toPaise(order.refund_amount) + amountPaise);
    await conn.execute('INSERT INTO refund (id, order_id, provider_refund_id, amount, reason, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [newUuid(), order.id, refundId, toRupees(amountPaise), 'Refund recorded from Razorpay', 'processed', SYSTEM_USER]);
    await conn.execute('UPDATE orders SET refund_amount = ?, payment_status = ? WHERE id = ?', [toRupees(refunded), refunded >= toPaise(order.total) ? 'refunded' : 'partially_refunded', order.id]);
  });
}

// ------------------------------------------------------------------ status flow (admin)
const NEXT = { placed: ['confirmed', 'cancelled'], confirmed: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
const STAMP = { confirmed: 'confirmed_at', shipped: 'shipped_at', delivered: 'delivered_at' };

async function changeStatus(orderId, to, { trackingInfo, adminNotes, adminId }) {
  if (to === 'cancelled') {
    await cancelOrder(orderId, { reason: adminNotes, by: 'admin' });
  } else {
    await withTx(async (conn) => {
      const [[order]] = await conn.execute('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
      if (!order) throw new ApiError(404, 'Order not found');
      if (!NEXT[order.status].includes(to)) throw new ApiError(409, `An order that is ${order.status} cannot be changed to ${to}`, [`Allowed next status: ${NEXT[order.status].join(', ') || 'none'}`]);
      if (to === 'confirmed' && order.payment_method === 'razorpay' && order.payment_status !== 'paid') throw new ApiError(409, 'This order is waiting for online payment');
      await conn.execute(`UPDATE orders SET status = ?, ${STAMP[to]} = CURRENT_TIMESTAMP WHERE id = ?`, [to, orderId]);
      if (to === 'confirmed') await assignInvoice(conn, orderId);
      if (to === 'delivered' && order.payment_method === 'cod' && order.payment_status === 'pending') {
        await conn.execute(`UPDATE orders SET payment_status = 'paid' WHERE id = ?`, [orderId]); // cash collected on delivery
        await conn.execute(`UPDATE payment SET status = 'paid' WHERE order_id = ? AND provider = 'cod'`, [orderId]);
      }
    });
  }
  const sets = []; const params = [];
  if (trackingInfo !== undefined) { sets.push('tracking_info = ?'); params.push(trackingInfo); }
  if (adminNotes !== undefined && to !== 'cancelled') { sets.push('admin_notes = ?'); params.push(adminNotes); }
  if (sets.length) await pool.execute(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, [...params, orderId]);
  void adminId;
}

module.exports = { placeOrder, markPaid, markPaymentFailed, cancelOrder, expireUnpaidOrders, refundOrder, recordExternalRefund, changeStatus, checkoutParams, NEXT, withTx };
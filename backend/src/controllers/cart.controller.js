const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { normalizeUuid } = require('../utils/uuid');
const { isPlainObject } = require('../utils/fields');
const { toProduct } = require('../models/product.model');
const { assertPurchasable, unavailableReason } = require('../utils/productActions');
const { toPaise, toRupees } = require('../utils/money');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const MAX_LINE_QTY = 99;

const isStockLimited = (p) => p.manage_stock && p.backorders === 'no';

/** The cart as the storefront needs it, priced from the database (never from anything the browser sent). */
async function loadCart(customerId) {
  const [rows] = await pool.execute(
    `SELECT ci.quantity AS cart_quantity, p.* FROM cart_item ci JOIN product p ON p.id = ci.product_id WHERE ci.customer_id = ? ORDER BY ci.created_at, p.id`, [customerId]);
  let totalPaise = 0; let mrpPaise = 0; let count = 0;
  const items = rows.map((row) => {
    const p = toProduct(row);
    const qty = Number(row.cart_quantity);
    const reason = unavailableReason(p);
    const limit = isStockLimited(p) ? p.stock_quantity : null;
    let issue = null;
    if (reason === 'PRODUCT_INACTIVE') issue = 'This product is no longer available';
    else if (reason === 'OUT_OF_STOCK') issue = 'Out of stock';
    else if (limit !== null && qty > limit) issue = `Only ${limit} left in stock`;
    const line = toPaise(p.effective_price) * qty;
    if (!issue) { totalPaise += line; mrpPaise += toPaise(p.mrp) * qty; count += qty; }
    return {
      product_id: p.id, slug: p.slug, name: p.product_name, brand: p.brand, image_url: p.image_url,
      quantity: qty, unit_price: p.effective_price, mrp: p.mrp, line_total: toRupees(line),
      in_stock: reason === null, max_quantity: reason ? 0 : limit, issue,
    };
  });
  return { items, summary: { item_count: count, mrp_total: toRupees(mrpPaise), discount_total: toRupees(mrpPaise - totalPaise), total: toRupees(totalPaise), shipping: 0 } };
}

async function findProduct(ref) {
  const id = normalizeUuid(ref.product_id);
  const slug = typeof ref.slug === 'string' ? ref.slug.trim().toLowerCase() : '';
  if (!id && !slug) throw new ApiError(400, 'Validation failed', ['product_id (UUID) or slug is required']);
  const [rows] = await pool.execute(id ? 'SELECT * FROM product WHERE id = ?' : 'SELECT * FROM product WHERE slug = ?', [id || slug]);
  if (!rows[0]) throw new ApiError(404, 'Product not found');
  return toProduct(rows[0]);
}

function parseQty(raw, { allowZero = false } = {}) {
  const n = raw === undefined ? 1 : (typeof raw === 'number' ? raw : (/^\d+$/.test(String(raw)) ? Number(raw) : NaN));
  if (!Number.isInteger(n) || n < (allowZero ? 0 : 1) || n > MAX_LINE_QTY) throw new ApiError(400, 'Validation failed', [`quantity must be a whole number from ${allowZero ? 0 : 1} to ${MAX_LINE_QTY}`]);
  return n;
}

// merge = true (guest cart after login): the line becomes the larger of the saved and the guest quantity, so logging in again never doubles it.
async function addToCart(customerId, ref, qty, { merge = false } = {}) {
  const product = await findProduct(ref);
  const [[existing]] = await pool.execute('SELECT quantity FROM cart_item WHERE customer_id = ? AND product_id = ?', [customerId, product.id]);
  const saved = existing ? Number(existing.quantity) : 0;
  const total = Math.min(MAX_LINE_QTY, merge ? Math.max(saved, qty) : saved + qty);
  assertPurchasable(product, total); // same stock rules as Add to Cart / Buy Now on the product API
  await pool.execute(
    'INSERT INTO cart_item (customer_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)', [customerId, product.id, total]);
  return product;
}

exports.getCart = wrap(async (req, res) => res.json({ success: true, data: await loadCart(req.customer.id) }));

exports.addItem = wrap(async (req, res) => {
  const body = isPlainObject(req.body) ? req.body : {};
  await addToCart(req.customer.id, body, parseQty(body.quantity));
  res.status(201).json({ success: true, message: 'Added to cart', data: await loadCart(req.customer.id) });
});

exports.setQuantity = wrap(async (req, res) => {
  const productId = normalizeUuid(req.params.productId);
  if (!productId) throw new ApiError(400, 'Invalid product id', ['productId must be a valid UUID']);
  const qty = parseQty(isPlainObject(req.body) ? req.body.quantity : undefined);
  const [[line]] = await pool.execute('SELECT 1 AS x FROM cart_item WHERE customer_id = ? AND product_id = ?', [req.customer.id, productId]);
  if (!line) throw new ApiError(404, 'This product is not in your cart');
  const product = await findProduct({ product_id: productId });
  assertPurchasable(product, qty);
  await pool.execute('UPDATE cart_item SET quantity = ? WHERE customer_id = ? AND product_id = ?', [qty, req.customer.id, productId]);
  res.json({ success: true, message: 'Cart updated', data: await loadCart(req.customer.id) });
});

exports.removeItem = wrap(async (req, res) => {
  const productId = normalizeUuid(req.params.productId);
  if (!productId) throw new ApiError(400, 'Invalid product id', ['productId must be a valid UUID']);
  await pool.execute('DELETE FROM cart_item WHERE customer_id = ? AND product_id = ?', [req.customer.id, productId]);
  res.json({ success: true, message: 'Removed from cart', data: await loadCart(req.customer.id) });
});

exports.clear = wrap(async (req, res) => {
  await pool.execute('DELETE FROM cart_item WHERE customer_id = ?', [req.customer.id]);
  res.json({ success: true, message: 'Cart cleared', data: await loadCart(req.customer.id) });
});

// POST /api/customer/cart/merge { items: [{ product_id | slug, quantity }] }
// Called right after login with the items the visitor collected as a guest. Items that cannot be bought are skipped and reported.
exports.merge = wrap(async (req, res) => {
  const items = isPlainObject(req.body) && Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : null;
  if (!items) throw new ApiError(400, 'Validation failed', ['items must be an array']);
  const skipped = [];
  for (const it of items) {
    try {
      if (!isPlainObject(it)) throw new ApiError(400, 'Invalid item');
      await addToCart(req.customer.id, it, parseQty(it.quantity), { merge: true });
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      skipped.push({ product: it && (it.slug || it.product_id), reason: (err.details && err.details[0]) || err.message });
    }
  }
  res.json({ success: true, message: 'Cart updated', data: { ...(await loadCart(req.customer.id)), skipped } });
});

exports.loadCart = loadCart;

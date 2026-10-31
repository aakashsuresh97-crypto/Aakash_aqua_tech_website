// Admin / purchase API for products, mounted at /api/v1/products (see routes/product.routes.js).
// (The storefront's read-only catalogue lives in public.controller.js.)
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const Subcategory = require('../models/subcategory.model');
const { parseProduct } = require('../middleware/validateProduct');
const { buildActions, assertPurchasable, buildLine, buildPriceSummary } = require('../utils/productActions');

const BASE_URL = '/api/v1/products';
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const withActions = (p) => ({ ...p, actions: buildActions(p, BASE_URL) });
const notFound = (id) => new ApiError(404, `Product with id ${id} not found`);
const isAdmin = (req) => Boolean(req.admin);

/** category / subcategory must exist and belong together; a category_name / subcategory_name sent along must match the ids;
 *  brand_id (preferred) and/or brand name are resolved to one brand name. Mutates and returns `data`. */
async function checkReferences(data) {
  const errors = [];
  const category = await Category.findById(data.category_id);
  if (!category) errors.push('category_id does not match any existing category');
  else if (data.category_name && data.category_name.toLowerCase() !== String(category.category_name).trim().toLowerCase()) {
    errors.push(`category_name "${data.category_name}" does not match category_id (that category is named "${category.category_name}")`);
  }
  if (data.subcategory_id) {
    const sub = await Subcategory.findById(data.subcategory_id);
    if (!sub) errors.push('subcategory_id does not match any existing subcategory');
    else if (category && sub.category_id !== data.category_id) errors.push('subcategory_id does not belong to the given category_id');
    else if (data.subcategory_name && data.subcategory_name.toLowerCase() !== String(sub.subcategory_name).trim().toLowerCase()) {
      errors.push(`subcategory_name "${data.subcategory_name}" does not match subcategory_id (that subcategory is named "${sub.subcategory_name}")`);
    }
  }
  if (data.brand_id) {
    const [[b]] = await pool.execute('SELECT name FROM brand WHERE id = ?', [data.brand_id]);
    if (!b) errors.push('brand_id does not match any existing brand');
    else if (data.brand && data.brand.toLowerCase() !== String(b.name).toLowerCase()) errors.push(`brand "${data.brand}" does not match brand_id (that brand is named "${b.name}")`);
    else data.brand = b.name;
  } else if (data.brand) {
    const [[b]] = await pool.execute('SELECT id, name FROM brand WHERE name = ?', [data.brand]); // link a typed name to its brand row when one exists
    if (b) { data.brand_id = b.id; data.brand = b.name; }
  }
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  delete data.category_name;
  delete data.subcategory_name;
  return data;
}

// POST /api/v1/products
exports.createProduct = wrap(async (req, res) => {
  const data = await checkReferences({ ...req.body });
  const product = await Product.create(data);
  res.status(201).json({ success: true, message: 'Product created successfully', data: withActions(product) });
});

// GET /api/v1/products and /page  -> filtered, sorted, paginated list (visitors only see published products)
exports.getProductPage = wrap(async (req, res) => {
  const q = { ...req.listQuery };
  if (!isAdmin(req)) q.publish_status = 'published';
  const { rows, total } = await Product.findPage(q);
  res.json({ success: true, data: rows.map(withActions), meta: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) } });
});

// GET /api/v1/products/:id
exports.getProductById = wrap(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product || (!isAdmin(req) && product.publish_status !== 'published')) throw notFound(req.params.id);
  res.json({ success: true, data: withActions(product) });
});

/** The stored product written back in the shape parseProduct() accepts, so PUT/PATCH can merge the changes and re-validate everything. */
function asInput(p) {
  const iso = (d) => (d ? new Date(d).toISOString() : null);
  return {
    category_id: p.category_id, subcategory_id: p.subcategory_id, product_name: p.product_name, sku: p.sku, slug: p.slug,
    product_type: p.product_type, is_virtual: p.is_virtual, is_downloadable: p.is_downloadable, brand: p.brand, brand_id: p.brand_id,
    mrp: p.mrp, selling_price: p.selling_price, sale_price: p.sale_price, sale_start: iso(p.sale_start), sale_end: iso(p.sale_end),
    gst_percent: p.gst_percent, tax_status: p.tax_status, description: p.description, short_description: p.short_description,
    image_url: p.image_url, stock_quantity: p.stock_quantity, manage_stock: p.manage_stock, backorders: p.backorders,
    low_stock_threshold: p.low_stock_threshold, stock_status: p.stock_status, specifications: p.specifications,
    publish_status: p.publish_status, shipping: { ...p.shipping }, seo: { ...p.seo },
  };
}

// PUT / PATCH /api/v1/products/:id  -> only the fields sent change; the whole product is validated again
exports.updateProduct = wrap(async (req, res) => {
  const existing = await Product.findById(req.params.id);
  if (!existing) throw notFound(req.params.id);
  const base = asInput(existing);
  const body = { ...req.body };
  if (body.regular_price !== undefined && body.selling_price === undefined) { body.selling_price = body.regular_price; }
  delete body.regular_price;
  if (body.status !== undefined && body.publish_status === undefined) delete base.publish_status; // the old 1/0 flag decides
  if (body.brand_id !== undefined && body.brand === undefined) delete base.brand; // changing the brand row: its name is taken from it
  if (body.brand !== undefined && body.brand_id === undefined) base.brand_id = null; // a typed name: re-linked in checkReferences
  if (body.category_id !== undefined && body.category_id !== existing.category_id && body.subcategory_id === undefined) base.subcategory_id = null; // old subcategory belongs to the old category
  const merged = {
    ...base, ...body,
    shipping: body.shipping === null ? {} : { ...base.shipping, ...(body.shipping || {}) },
    seo: body.seo === null ? {} : { ...base.seo, ...(body.seo || {}) },
  };
  const { clean, errors } = parseProduct(merged);
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  const data = await checkReferences(clean);
  const product = await Product.update(existing.id, data, existing);
  res.json({ success: true, message: 'Product updated successfully', data: withActions(product) });
});

// DELETE /api/v1/products/:id?mode=delete|archive  (default: delete permanently)
exports.deleteProduct = wrap(async (req, res) => {
  const { id } = req.params;
  if (req.deleteMode === 'archive') {
    if (!(await Product.archive(id))) throw notFound(id);
    return res.json({ success: true, message: 'Product archived successfully', data: withActions(await Product.findById(id)) });
  }
  if (!(await Product.remove(id))) throw notFound(id);
  res.json({ success: true, message: 'Product deleted successfully' });
});

async function purchasable(req) {
  const product = await Product.findById(req.params.id);
  if (!product) throw notFound(req.params.id);
  assertPurchasable(product, req.purchase.quantity);
  return product;
}

// POST /api/v1/products/:id/add-to-cart  -> checks stock and quantity only; nothing is stored or reserved
exports.addToCart = wrap(async (req, res) => {
  const product = await purchasable(req);
  res.json({ success: true, message: 'Product added to cart', data: { action: 'add_to_cart', item: buildLine(product, req.purchase.quantity) } });
});

// POST /api/v1/products/:id/buy-now  -> checkout summary; the purchase is completed by the order API
exports.buyNow = wrap(async (req, res) => {
  const product = await purchasable(req);
  res.json({
    success: true, message: 'Proceed to checkout',
    data: {
      action: 'buy_now', purchase_completed: false, next_step: 'CHECKOUT',
      items: [buildLine(product, req.purchase.quantity)], price_summary: buildPriceSummary(product, req.purchase.quantity),
    },
  });
});
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { newUuid } = require('../utils/uuid');
const { slugify } = require('../utils/slug');

const MAX_ATTEMPTS = 5;

// category_name / subcategory_name / brand_name come from the parent rows (same approach as the subcategory model),
// so they are always current (a rename is visible at once) and clients do not need extra requests.
// brand_name falls back to the legacy product.brand text for products that are not linked to a brand row (brand_id IS NULL).
const FROM = `FROM product p
                  JOIN category c ON c.id = p.category_id
                  LEFT JOIN subcategory s ON s.id = p.subcategory_id
                  LEFT JOIN brand b ON b.id = p.brand_id`;
const BRAND_NAME = 'COALESCE(b.name, p.brand)';
const SELECT = `SELECT p.*, c.category_name, s.subcategory_name, ${BRAND_NAME} AS brand_name ${FROM}`;

// Whitelist: sort_by values are mapped to columns here, never interpolated from user input.
const SORT_COLUMNS = {
  created_at: 'p.created_at',
  updated_at: 'p.updated_at',
  product_name: 'p.product_name',
  sku: 'p.sku',
  selling_price: 'p.selling_price',
  mrp: 'p.mrp',
  discount_percent: 'p.discount_percent',
  stock_quantity: 'p.stock_quantity',
  brand: BRAND_NAME,
};

// Escapes % and _ so a search text is matched literally (then wrapped for a "contains" match).
const contains = (v) => `%${v.replace(/[\\%_]/g, '\\$&')}%`;

const dupKey = (err) => (err.code === 'ER_DUP_ENTRY' ? (/'([^']+)'\s*$/.exec(err.sqlMessage || '') || [])[1] || '' : '');
const isPrimaryCollision = (err) => dupKey(err) === 'PRIMARY' || (err.code === 'ER_DUP_ENTRY' && /PRIMARY/.test(err.sqlMessage || ''));
const isSkuCollision = (err) => err.code === 'ER_DUP_ENTRY' && /uk_product_sku/.test(err.sqlMessage || '');
const isSlugCollision = (err) => err.code === 'ER_DUP_ENTRY' && /uk_product_slug/.test(err.sqlMessage || '');

const parseJson = (v) => {
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return null; }
  }
  return v;
};
const num = (v) => (v === null || v === undefined ? null : Number(v));

/** Is the sale price in force right now? (a sale price with no dates is always in force) */
function isSaleActive(row, now = new Date()) {
  if (row.sale_price === null || row.sale_price === undefined) return false;
  if (row.sale_start && new Date(row.sale_start) > now) return false;
  if (row.sale_end && new Date(row.sale_end) < now) return false;
  return true;
}

/** MySQL returns DECIMAL as strings and JSON as an object (MariaDB: as text); the API returns plain numbers/arrays. */
function toProduct(row) {
  const stock = Number(row.stock_quantity);
  const saleActive = isSaleActive(row);
  const effective = saleActive ? Number(row.sale_price) : Number(row.selling_price);
  const mrp = Number(row.mrp);
  return {
    id: row.id,
    product_name: row.product_name,
    sku: row.sku,
    slug: row.slug,
    product_type: row.product_type,
    is_virtual: Boolean(row.is_virtual),
    is_downloadable: Boolean(row.is_downloadable),
    brand_id: row.brand_id === undefined ? null : row.brand_id,
    brand: row.brand_name === undefined ? row.brand : row.brand_name, // joined name; plain rows (SELECT * FROM product) fall back to the stored text
    category_id: row.category_id,
    category_name: row.category_name,
    subcategory_id: row.subcategory_id,
    subcategory_name: row.subcategory_name,
    mrp,
    selling_price: Number(row.selling_price), // the regular price
    regular_price: Number(row.selling_price),
    sale_price: num(row.sale_price),
    sale_start: row.sale_start,
    sale_end: row.sale_end,
    sale_active: saleActive,
    effective_price: effective, // what the customer pays right now (sale price while a sale is in force)
    discount_amount: Number(row.discount_amount),
    discount_percent: Number(row.discount_percent),
    effective_discount_amount: Math.round((mrp - effective) * 100) / 100,
    effective_discount_percent: Math.round(((mrp - effective) / mrp) * 10000) / 100,
    gst_percent: Number(row.gst_percent),
    tax_status: row.tax_status,
    description: row.description,
    short_description: row.short_description,
    image_url: row.image_url,
    stock_quantity: stock,
    manage_stock: Boolean(row.manage_stock),
    backorders: row.backorders,
    low_stock_threshold: num(row.low_stock_threshold),
    stock_status: row.stock_status,
    in_stock: row.stock_status !== 'outofstock',
    low_stock: Boolean(row.manage_stock) && row.low_stock_threshold !== null && stock > 0 && stock <= Number(row.low_stock_threshold),
    shipping: {
      weight: num(row.weight),
      length: num(row.length),
      width: num(row.width),
      height: num(row.height),
      shipping_class: row.shipping_class,
      requires_shipping: Boolean(row.requires_shipping),
    },
    specifications: parseJson(row.specifications) || [],
    seo: {
      seo_title: row.seo_title,
      meta_description: row.meta_description,
      focus_keyword: row.focus_keyword,
      additional_keywords: parseJson(row.additional_keywords) || [],
      canonical_url: row.canonical_url,
    },
    status: Number(row.status),
    publish_status: row.publish_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Several products in ONE query, in the order of `ids` (used for "related products" instead of one query per product). */
async function findByIds(ids) {
  if (!ids.length) return [];
  const [rows] = await pool.query(`${SELECT} WHERE p.id IN (?)`, [ids]);
  const byId = new Map(rows.map((r) => [r.id, toProduct(r)]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

async function findById(id) {
  const [rows] = await pool.execute(`${SELECT} WHERE p.id = ?`, [id]);
  return rows[0] ? toProduct(rows[0]) : null;
}

/**
 * Paginated list with search, filters and sorting.
 * q: { page, limit, search, category_id, subcategory_id, brand_id, brands[], product_type, min_price, max_price, status, publish_status,
 *      stock_status ('instock'|'outofstock'|'onbackorder'|'low'), sort_by, sort_order }
 */
async function findPage(q) {
  const where = [];
  const params = [];
  if (q.category_id) { where.push('p.category_id = ?'); params.push(q.category_id); }
  if (q.subcategory_id) { where.push('p.subcategory_id = ?'); params.push(q.subcategory_id); }
  if (q.brand_id) { where.push('p.brand_id = ?'); params.push(q.brand_id); }
  if (q.brands && q.brands.length) {
    where.push(`${BRAND_NAME} IN (${q.brands.map(() => '?').join(', ')})`); // exact match, case-insensitive collation
    params.push(...q.brands);
  }
  if (q.product_type) { where.push('p.product_type = ?'); params.push(q.product_type); }
  if (q.min_price !== undefined) { where.push('p.selling_price >= ?'); params.push(q.min_price); }
  if (q.max_price !== undefined) { where.push('p.selling_price <= ?'); params.push(q.max_price); }
  if (q.status !== undefined) { where.push('p.status = ?'); params.push(q.status); }
  if (q.publish_status) { where.push('p.publish_status = ?'); params.push(q.publish_status); }
  if (q.stock_status === 'low') {
    where.push('(p.manage_stock = 1 AND p.low_stock_threshold IS NOT NULL AND p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_threshold)');
  } else if (q.stock_status) { where.push('p.stock_status = ?'); params.push(q.stock_status); }
  if (q.search) {
    const like = contains(q.search);
    where.push(`(p.product_name LIKE ? OR p.sku LIKE ? OR ${BRAND_NAME} LIKE ? OR p.description LIKE ? OR p.short_description LIKE ? OR c.category_name LIKE ? OR s.subcategory_name LIKE ?)`);
    params.push(like, like, like, like, like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total ${FROM} ${clause}`,
    params
  );
  // ORDER BY column/direction come from whitelists; LIMIT/OFFSET are validated integers, so they are safe to inline.
  const column = SORT_COLUMNS[q.sort_by] || SORT_COLUMNS.created_at;
  const direction = q.sort_order === 'asc' ? 'ASC' : 'DESC';
  const offset = (q.page - 1) * q.limit;
  const [rows] = await pool.execute(
    `${SELECT} ${clause} ORDER BY ${column} ${direction}, p.id ASC LIMIT ${q.limit} OFFSET ${offset}`,
    params
  );
  return { rows: rows.map(toProduct), total: Number(total) };
}

/** Fills defaults and derives the columns that depend on others (stock_status, status). */
function withDefaults(d) {
  const manageStock = d.manage_stock === undefined ? true : d.manage_stock;
  const backorders = d.backorders || 'no';
  let stockStatus = d.stock_status || 'instock';
  if (manageStock) {
    if (d.stock_quantity > 0) stockStatus = 'instock';
    else stockStatus = backorders === 'no' ? 'outofstock' : 'onbackorder';
  }
  const publishStatus = d.publish_status || 'published';
  const virtual = Boolean(d.is_virtual);
  return {
    category_id: d.category_id,
    subcategory_id: d.subcategory_id,
    product_name: d.product_name,
    sku: d.sku ?? null,
    product_type: d.product_type || 'simple',
    is_virtual: virtual ? 1 : 0,
    is_downloadable: d.is_downloadable ? 1 : 0,
    brand: d.brand ?? null, // always the brand's name (the controller resolves brand_id -> name before saving)
    brand_id: d.brand_id ?? null,
    mrp: d.mrp,
    selling_price: d.selling_price,
    sale_price: d.sale_price ?? null,
    sale_start: d.sale_start ?? null,
    sale_end: d.sale_end ?? null,
    gst_percent: d.gst_percent,
    tax_status: d.tax_status || 'taxable',
    description: d.description ?? null,
    short_description: d.short_description ?? null,
    image_url: d.image_url ?? null,
    stock_quantity: d.stock_quantity,
    manage_stock: manageStock ? 1 : 0,
    backorders,
    low_stock_threshold: d.low_stock_threshold ?? null,
    stock_status: stockStatus,
    specifications: d.specifications === undefined || d.specifications === null ? null : JSON.stringify(d.specifications),
    publish_status: publishStatus,
    status: publishStatus === 'published' ? 1 : 0,
    weight: d.weight ?? null,
    length: d.length ?? null,
    width: d.width ?? null,
    height: d.height ?? null,
    shipping_class: d.shipping_class ?? null,
    requires_shipping: virtual ? 0 : (d.requires_shipping === false ? 0 : 1),
    seo_title: d.seo_title ?? null,
    meta_description: d.meta_description ?? null,
    focus_keyword: d.focus_keyword ?? null,
    additional_keywords: d.additional_keywords === undefined || d.additional_keywords === null ? null : JSON.stringify(d.additional_keywords),
    canonical_url: d.canonical_url ?? null,
  };
}

/** A slug nobody uses yet: base, base-2, base-3 ... (excludeId lets a product keep its own slug). */
async function uniqueSlug(base, excludeId = null) {
  const [rows] = await pool.execute('SELECT slug, id FROM product WHERE slug = ? OR slug LIKE ?', [base, `${base.replace(/[\\%_]/g, '\\$&')}-%`]);
  const taken = new Set(rows.filter((r) => r.id !== excludeId).map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 10000; i += 1) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${newUuid().slice(0, 8)}`;
}

const COLUMNS = Object.keys(withDefaults({ stock_quantity: 0 }));

/** Inserts a product with a freshly generated UUID (random v4, same as category/subcategory ids). */
async function create(data) {
  const row = withDefaults(data);
  const explicitSlug = data.slug || null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const id = newUuid();
    const slug = explicitSlug || await uniqueSlug(slugify(data.product_name));
    try {
      await pool.execute(
        `INSERT INTO product (id, slug, ${COLUMNS.join(', ')}) VALUES (?, ?, ${COLUMNS.map(() => '?').join(', ')})`,
        [id, slug, ...COLUMNS.map((c) => row[c])]
      );
      return findById(id);
    } catch (err) {
      if (isSkuCollision(err)) throw new ApiError(409, 'SKU already exists', [`A product with sku "${data.sku}" already exists`]);
      if (isSlugCollision(err)) {
        if (explicitSlug) throw new ApiError(409, 'Slug already exists', [`A product with slug "${explicitSlug}" already exists`]);
        continue; // someone took the generated slug a moment ago: compute the next free one
      }
      if (isPrimaryCollision(err)) continue; // practically impossible: generate another UUID
      throw err;
    }
  }
  throw new ApiError(500, 'Could not generate a unique product id or slug. Please try again.');
}

/** Replaces all editable columns with the (already validated, merged) data. The slug is kept unless a new one is given. */
async function update(id, data, existing) {
  const row = withDefaults(data);
  const slug = data.slug || existing.slug || await uniqueSlug(slugify(data.product_name), id);
  try {
    await pool.execute(
      `UPDATE product SET slug = ?, ${COLUMNS.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
      [slug, ...COLUMNS.map((c) => row[c]), id]
    );
  } catch (err) {
    if (isSkuCollision(err)) throw new ApiError(409, 'SKU already exists', [`A product with sku "${data.sku}" already exists`]);
    if (isSlugCollision(err)) throw new ApiError(409, 'Slug already exists', [`A product with slug "${slug}" already exists`]);
    throw err;
  }
  return findById(id);
}

/** Archive = keep the row but take it off sale (publish_status 'inactive'). Returns false when the product does not exist. */
async function archive(id) {
  const [res] = await pool.execute(`UPDATE product SET publish_status = 'inactive', status = 0 WHERE id = ?`, [id]);
  return res.affectedRows > 0;
}

/** Permanent delete. Returns false when the product does not exist. */
async function remove(id) {
  const [res] = await pool.execute('DELETE FROM product WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

module.exports = { findById, findByIds, findPage, create, update, archive, remove, SORT_COLUMNS, toProduct, isSaleActive };

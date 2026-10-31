const ApiError = require('../utils/ApiError');
const { normalizeUuid } = require('../utils/uuid');
const { SLUG_RE } = require('../utils/slug');
const { SORT_COLUMNS } = require('../models/product.model');

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isBlank = (v) => v === undefined || v === null || v === '';
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

const MAX_PRICE = 99999999.99; // DECIMAL(10,2)
const MAX_STOCK = 1000000;
const MAX_QUANTITY = 100000;
const MAX_SPECS = 50;
const MAX_BRAND_FILTERS = 20;
const MAX_KEYWORDS = 20;
const PRODUCT_TYPES = ['simple', 'variable'];
const PUBLISH_STATUSES = ['draft', 'published', 'inactive'];
const STOCK_STATUSES = ['instock', 'outofstock', 'onbackorder'];
const BACKORDERS = ['no', 'notify', 'yes'];
const TAX_STATUSES = ['taxable', 'shipping', 'none'];
const SKU_RE = /^[A-Za-z0-9][A-Za-z0-9._\-/]*$/;

/** Old style flag -> publish status. 1/true/"active" = published, 0/false/"inactive" = inactive. */
function parseStatus(value) {
  if (value === 1 || value === true || value === '1' || value === 'true' || value === 'active') return 1;
  if (value === 0 || value === false || value === '0' || value === 'false' || value === 'inactive') return 0;
  return null;
}

/** A number with at most `places` decimal places, from a JSON number or a numeric string. Returns null when invalid. */
function parseDecimal(value, places = 2) {
  let n = value;
  if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim())) n = Number(value.trim());
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const f = 10 ** places;
  const scaled = Math.round(n * f);
  if (Math.abs(n * f - scaled) > 1e-6) return null; // too many decimal places
  return scaled / f;
}

/** A whole number from a JSON number or a digit string. Returns null when invalid. */
function parseInteger(value) {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d{1,9}$/.test(value.trim())) return Number(value.trim());
  return null;
}

function parseBool(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return null;
}

/** ISO 8601 date/time string (or Date) -> Date, or null when invalid. */
function parseDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(value.trim())) return null;
  const d = new Date(value.trim().replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Validates the :id route param (product UUID) and normalises it to lower case. */
function validateProductId(req, res, next) {
  const id = normalizeUuid(req.params.id);
  if (!id) return next(new ApiError(400, 'Invalid product id', ['id must be a valid UUID, e.g. 36a8b30f-e1bc-4118-918d-b7834393e55f']));
  req.params.id = id;
  next();
}

/**
 * specifications: an object {"Capacity": "7 L"} or an ordered list [{"name": "Capacity", "value": "7 L"}].
 * Stored as the ordered list (MySQL JSON objects do not keep key order).
 */
function cleanSpecifications(value, errors) {
  if (value === null) return null;
  let entries;
  if (Array.isArray(value)) {
    entries = value.map((e) => (isPlainObject(e) ? [e.name, e.value] : [undefined, undefined]));
  } else if (isPlainObject(value)) {
    entries = Object.entries(value);
  } else {
    errors.push('specifications must be an object like {"Capacity": "7 L"} or a list like [{"name": "Capacity", "value": "7 L"}]');
    return undefined;
  }
  if (entries.length > MAX_SPECS) {
    errors.push(`specifications can contain at most ${MAX_SPECS} entries`);
    return undefined;
  }
  const seen = new Set();
  const out = [];
  for (const [name, val] of entries) {
    const n = typeof name === 'string' ? name.trim() : '';
    const okValue = ['string', 'number', 'boolean'].includes(typeof val) && String(val).trim().length >= 1 && String(val).length <= 500;
    if (n.length < 1 || n.length > 100 || !okValue) {
      errors.push('each specification needs a name (1-100 characters) and a value (text, number or boolean, 1-500 characters)');
      return undefined;
    }
    if (seen.has(n.toLowerCase())) {
      errors.push(`specification "${n}" is listed more than once`);
      return undefined;
    }
    seen.add(n.toLowerCase());
    out.push({ name: n, value: String(val).trim() });
  }
  return out;
}

// Optional text field: undefined = not sent, null/'' = clear, otherwise a trimmed string of 1..max characters.
function optText(b, key, max, errors, clean, label = key) {
  if (b[key] === undefined) return;
  if (b[key] === null || b[key] === '') { clean[key] = null; return; }
  if (typeof b[key] !== 'string' || b[key].trim().length > max) errors.push(`${label} must be a string of at most ${max} characters`);
  else clean[key] = b[key].trim() === '' ? null : b[key].trim();
}

function optUrl(b, key, errors, clean) {
  if (b[key] === undefined) return;
  if (b[key] === null || b[key] === '') { clean[key] = null; return; }
  const url = typeof b[key] === 'string' ? b[key].trim() : '';
  if (!url || url.length > 500) errors.push(`${key} must be a non-empty string of at most 500 characters`);
  else if (/^data:/i.test(url) || /[\u0000-\u001f\u007f\s]/.test(url)) errors.push(key === 'image_url' ? 'image_url must be an image URL or path, not embedded image data' : `${key} must be a URL, not embedded data`);
  else if (!/^https?:\/\/\S+$/i.test(url) && !(key === 'image_url' && url.startsWith('/'))) {
    errors.push(key === 'image_url' ? 'image_url must start with http://, https:// or /' : `${key} must start with http:// or https://`);
  } else clean[key] = url;
}

/**
 * Validates and normalises a complete product (all required fields present). Pure function, used by
 * POST (body as sent) and PUT/PATCH (the stored product merged with the changes), so both follow the same rules.
 * Returns { clean, errors }. Existence of category/subcategory and SKU/slug uniqueness are checked against MySQL elsewhere.
 */
function parseProduct(b) {
  const errors = [];
  const clean = {};

  if (isBlank(b.category_id)) errors.push('category_id is required');
  else if (!normalizeUuid(b.category_id)) errors.push('category_id must be a valid UUID');
  else clean.category_id = normalizeUuid(b.category_id);
  // subcategory is optional here; the controller requires it only for the categories that need one
  if (isBlank(b.subcategory_id)) clean.subcategory_id = null;
  else if (!normalizeUuid(b.subcategory_id)) errors.push('subcategory_id must be a valid UUID');
  else clean.subcategory_id = normalizeUuid(b.subcategory_id);

  if (isBlank(b.product_name)) errors.push('product_name is required');
  else if (typeof b.product_name !== 'string' || b.product_name.trim().length < 2 || b.product_name.trim().length > 200) {
    errors.push('product_name must be a string of 2-200 characters');
  } else clean.product_name = b.product_name.trim();

  // ---- identity
  if (b.sku !== undefined) {
    if (b.sku === null || b.sku === '') clean.sku = null;
    else if (typeof b.sku !== 'string' || b.sku.trim().length > 64 || !SKU_RE.test(b.sku.trim())) {
      errors.push('sku must be at most 64 characters and use only letters, numbers, dot, dash, underscore or slash');
    } else clean.sku = b.sku.trim();
  }
  if (b.slug !== undefined && b.slug !== null && b.slug !== '') {
    const slug = typeof b.slug === 'string' ? b.slug.trim().toLowerCase() : '';
    if (!slug || slug.length > 200 || !SLUG_RE.test(slug)) errors.push('slug must be at most 200 characters: lower-case letters, numbers and single dashes, e.g. kent-grand-plus');
    else clean.slug = slug;
  }

  if (b.product_type !== undefined) {
    if (!PRODUCT_TYPES.includes(b.product_type)) errors.push(`product_type must be one of: ${PRODUCT_TYPES.join(', ')}`);
    else clean.product_type = b.product_type;
  }
  for (const key of ['is_virtual', 'is_downloadable']) {
    if (b[key] !== undefined) {
      const v = parseBool(b[key]);
      if (v === null) errors.push(`${key} must be true or false`);
      else clean[key] = v;
    }
  }

  // brand: send brand_id (UUID of a row in the `brand` table, preferred) and/or the brand name. The controller checks that they agree
  // and stores both, so the name never needs to be typed twice. Both null/blank = no brand.
  if (!isBlank(b.brand)) {
    if (typeof b.brand !== 'string' || b.brand.trim().length < 1 || b.brand.trim().length > 100) errors.push('brand must be a string of 1-100 characters');
    else clean.brand = b.brand.trim();
  } else if (b.brand === null || b.brand === '') clean.brand = null;
  if (!isBlank(b.brand_id)) {
    if (!normalizeUuid(b.brand_id)) errors.push('brand_id must be a valid UUID');
    else clean.brand_id = normalizeUuid(b.brand_id);
  } else if (b.brand_id === null || b.brand_id === '') clean.brand_id = null;

  // optional names sent next to the ids (category_name, subcategory_name): not stored, only checked against the ids by the controller
  for (const key of ['category_name', 'subcategory_name']) {
    if (isBlank(b[key])) continue;
    if (typeof b[key] !== 'string' || b[key].trim().length > 100) errors.push(`${key} must be a string of at most 100 characters`);
    else clean[key] = b[key].trim();
  }

  // ---- pricing: mrp >= selling_price (regular price) >= sale_price. The discount is calculated, never trusted from the client.
  if (!isBlank(b.regular_price) && !isBlank(b.selling_price) && Number(b.regular_price) !== Number(b.selling_price)) {
    errors.push('regular_price and selling_price are the same field; send only one of them');
  }
  const priceInput = isBlank(b.selling_price) ? b.regular_price : b.selling_price;
  let mrp = null;
  let sellingPrice = null;
  if (isBlank(b.mrp)) errors.push('mrp is required');
  else {
    mrp = parseDecimal(b.mrp);
    if (mrp === null || mrp <= 0 || mrp > MAX_PRICE) { errors.push('mrp must be a number greater than 0 with at most 2 decimal places'); mrp = null; } else clean.mrp = mrp;
  }
  if (isBlank(priceInput)) errors.push('selling_price is required');
  else {
    sellingPrice = parseDecimal(priceInput);
    if (sellingPrice === null || sellingPrice <= 0 || sellingPrice > MAX_PRICE) { errors.push('selling_price must be a number greater than 0 with at most 2 decimal places'); sellingPrice = null; } else clean.selling_price = sellingPrice;
  }
  if (mrp !== null && sellingPrice !== null) {
    if (sellingPrice > mrp) errors.push('selling_price cannot be greater than mrp');
    else if (!isBlank(b.discount_percent)) {
      // Optional: a client may send the discount it shows; it must agree with mrp and selling_price.
      const sent = parseDecimal(b.discount_percent);
      const calculated = Math.round(((mrp - sellingPrice) / mrp) * 10000) / 100;
      if (sent === null) errors.push('discount_percent must be a number with at most 2 decimal places');
      else if (Math.abs(sent - calculated) > 0.01) errors.push(`discount_percent (${sent}) does not match mrp and selling_price (calculated: ${calculated}). Omit it to have it calculated`);
    }
  }

  // sale price (optional) with an optional schedule
  let salePrice = null;
  if (b.sale_price === null || b.sale_price === '') clean.sale_price = null;
  else if (b.sale_price !== undefined) {
    salePrice = parseDecimal(b.sale_price);
    if (salePrice === null || salePrice <= 0 || salePrice > MAX_PRICE) { errors.push('sale_price must be a number greater than 0 with at most 2 decimal places'); salePrice = null; }
    else if (sellingPrice !== null && salePrice > sellingPrice) errors.push('sale_price cannot be greater than the regular price (selling_price)');
    else clean.sale_price = salePrice;
  }
  const dates = {};
  for (const key of ['sale_start', 'sale_end']) {
    if (b[key] === undefined) continue;
    if (b[key] === null || b[key] === '') { clean[key] = null; continue; }
    const d = parseDate(b[key]);
    if (!d) errors.push(`${key} must be an ISO 8601 date or date-time, e.g. 2026-11-01 or 2026-11-01T09:00:00+05:30`);
    else { clean[key] = d; dates[key] = d; }
  }
  if (dates.sale_start && dates.sale_end && dates.sale_end <= dates.sale_start) errors.push('sale_end must be after sale_start');
  if ((clean.sale_start || clean.sale_end) && !clean.sale_price) errors.push('sale_start / sale_end need a sale_price');

  if (isBlank(b.gst_percent)) errors.push('gst_percent is required');
  else {
    const gst = parseDecimal(b.gst_percent);
    if (gst === null || gst < 0 || gst > 100) errors.push('gst_percent must be a number between 0 and 100 with at most 2 decimal places');
    else clean.gst_percent = gst;
  }
  if (b.tax_status !== undefined) {
    if (!TAX_STATUSES.includes(b.tax_status)) errors.push(`tax_status must be one of: ${TAX_STATUSES.join(', ')}`);
    else clean.tax_status = b.tax_status;
  }

  // ---- inventory
  if (isBlank(b.stock_quantity)) errors.push('stock_quantity is required');
  else {
    const stock = parseInteger(b.stock_quantity);
    if (stock === null || stock < 0 || stock > MAX_STOCK) errors.push(`stock_quantity must be a whole number between 0 and ${MAX_STOCK}`);
    else clean.stock_quantity = stock;
  }
  if (b.manage_stock !== undefined) {
    const v = parseBool(b.manage_stock);
    if (v === null) errors.push('manage_stock must be true or false');
    else clean.manage_stock = v;
  }
  if (b.backorders !== undefined) {
    if (!BACKORDERS.includes(b.backorders)) errors.push(`backorders must be one of: ${BACKORDERS.join(', ')}`);
    else clean.backorders = b.backorders;
  }
  if (b.low_stock_threshold === null || b.low_stock_threshold === '') clean.low_stock_threshold = null;
  else if (b.low_stock_threshold !== undefined) {
    const t = parseInteger(b.low_stock_threshold);
    if (t === null || t < 0 || t > MAX_STOCK) errors.push(`low_stock_threshold must be a whole number between 0 and ${MAX_STOCK}`);
    else clean.low_stock_threshold = t;
  }
  if (b.stock_status !== undefined) {
    if (!STOCK_STATUSES.includes(b.stock_status)) errors.push(`stock_status must be one of: ${STOCK_STATUSES.join(', ')}`);
    else clean.stock_status = b.stock_status;
  }

  // ---- text
  optText(b, 'description', 20000, errors, clean);
  optText(b, 'short_description', 1000, errors, clean);
  optUrl(b, 'image_url', errors, clean); // only a URL/path string is stored - never inline (base64) image data

  if (b.specifications !== undefined) {
    const specs = cleanSpecifications(b.specifications, errors);
    if (specs !== undefined) clean.specifications = specs;
  }

  // ---- status: publish_status (draft | published | inactive); the old 1/0 `status` is still accepted
  if (b.publish_status !== undefined) {
    if (!PUBLISH_STATUSES.includes(b.publish_status)) errors.push(`publish_status must be one of: ${PUBLISH_STATUSES.join(', ')}`);
    else clean.publish_status = b.publish_status;
  } else if (b.status !== undefined) {
    const s = parseStatus(b.status);
    if (s === null) errors.push('status must be 1/0, true/false or "active"/"inactive"');
    else clean.publish_status = s === 1 ? 'published' : 'inactive';
  }

  // ---- shipping {weight, length, width, height, shipping_class, requires_shipping}
  if (b.shipping !== undefined && b.shipping !== null) {
    if (!isPlainObject(b.shipping)) errors.push('shipping must be an object');
    else {
      const s = b.shipping;
      for (const [key, places] of [['weight', 3], ['length', 2], ['width', 2], ['height', 2]]) {
        if (s[key] === undefined) continue;
        if (s[key] === null || s[key] === '') { clean[key] = null; continue; }
        const v = parseDecimal(s[key], places);
        if (v === null || v < 0 || v > 9999999) errors.push(`shipping.${key} must be a number of 0 or more with at most ${places} decimal places`);
        else clean[key] = v;
      }
      optText(s, 'shipping_class', 100, errors, clean, 'shipping.shipping_class');
      if (s.requires_shipping !== undefined) {
        const v = parseBool(s.requires_shipping);
        if (v === null) errors.push('shipping.requires_shipping must be true or false');
        else clean.requires_shipping = v;
      }
    }
  }

  // ---- seo {seo_title, meta_description, focus_keyword, additional_keywords, canonical_url}
  if (b.seo !== undefined && b.seo !== null) {
    if (!isPlainObject(b.seo)) errors.push('seo must be an object');
    else {
      const s = b.seo;
      optText(s, 'seo_title', 255, errors, clean, 'seo.seo_title');
      optText(s, 'meta_description', 500, errors, clean, 'seo.meta_description');
      optText(s, 'focus_keyword', 150, errors, clean, 'seo.focus_keyword');
      optUrl(s, 'canonical_url', errors, clean);
      if (s.additional_keywords !== undefined) {
        if (s.additional_keywords === null) clean.additional_keywords = null;
        else if (!Array.isArray(s.additional_keywords) || s.additional_keywords.length > MAX_KEYWORDS
          || s.additional_keywords.some((k) => typeof k !== 'string' || k.trim().length < 1 || k.trim().length > 100)) {
          errors.push(`seo.additional_keywords must be a list of at most ${MAX_KEYWORDS} keywords (1-100 characters each)`);
        } else clean.additional_keywords = [...new Set(s.additional_keywords.map((k) => k.trim()))];
      }
    }
  }

  // ---- rules that combine fields
  if (clean.is_virtual) clean.requires_shipping = false; // a virtual product is never shipped

  return { clean, errors };
}

/** POST /products: parse the body as a complete product. */
function validateProductBody(req, res, next) {
  if (!isPlainObject(req.body)) return next(new ApiError(400, 'Request body must be a JSON object'));
  const { clean, errors } = parseProduct(req.body);
  if (errors.length) return next(new ApiError(400, 'Validation failed', errors));
  req.body = clean;
  next();
}

/** PUT/PATCH /products/:id: only checks the shape here; the controller merges it into the stored product and runs parseProduct. */
function validateProductUpdateBody(req, res, next) {
  if (!isPlainObject(req.body) || Object.keys(req.body).length === 0) {
    return next(new ApiError(400, 'Request body must be a JSON object with at least one field to change'));
  }
  if (has(req.body, 'id')) return next(new ApiError(400, 'Validation failed', ['id cannot be changed']));
  next();
}

/** DELETE /products/:id?mode=archive|delete (default delete). */
function validateDeleteQuery(req, res, next) {
  const mode = req.query.mode === undefined ? 'delete' : req.query.mode;
  if (!['delete', 'archive'].includes(mode)) return next(new ApiError(400, 'Validation failed', ['mode must be "delete" or "archive"']));
  req.deleteMode = mode;
  next();
}

const STOCK_FILTER_ALIASES = { in: 'instock', out: 'outofstock', low: 'low', instock: 'instock', outofstock: 'outofstock', onbackorder: 'onbackorder' };

/**
 * Validates GET /products and GET /products/page query params:
 * page, limit, search, category_id, subcategory_id, brand_id, brand (names, comma separated or repeated), product_type, min_price, max_price,
 * status, publish_status, stock (in|out|low|onbackorder) / stock_status, sort_by, sort_order.
 */
function validateProductListQuery(req, res, next) {
  const errors = [];
  const q = {};
  const query = req.query;

  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) errors.push('page must be a positive integer');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.push('limit must be an integer between 1 and 100');
  q.page = page;
  q.limit = limit;

  if (query.search !== undefined) {
    if (typeof query.search !== 'string' || query.search.length > 100) errors.push('search must be a string of at most 100 characters');
    else if (query.search.trim()) q.search = query.search.trim();
  }

  for (const key of ['category_id', 'subcategory_id', 'brand_id']) {
    if (query[key] !== undefined && query[key] !== '') {
      const id = normalizeUuid(query[key]);
      if (!id) errors.push(`${key} must be a valid UUID`);
      else q[key] = id;
    }
  }

  if (query.brand !== undefined) {
    const raw = [].concat(query.brand);
    if (raw.some((v) => typeof v !== 'string')) errors.push('brand must be text, e.g. brand=Kent or brand=Kent,Aquaguard');
    else {
      const brands = [...new Set(raw.flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean))];
      if (brands.length > MAX_BRAND_FILTERS || brands.some((b) => b.length > 100)) errors.push(`brand can list at most ${MAX_BRAND_FILTERS} brands of up to 100 characters each`);
      else if (brands.length) q.brands = brands;
    }
  }

  if (query.product_type !== undefined && query.product_type !== '') {
    if (!PRODUCT_TYPES.includes(query.product_type)) errors.push(`product_type must be one of: ${PRODUCT_TYPES.join(', ')}`);
    else q.product_type = query.product_type;
  }

  for (const key of ['min_price', 'max_price']) {
    if (query[key] !== undefined && query[key] !== '') {
      const v = parseDecimal(query[key]);
      if (v === null || v < 0 || v > MAX_PRICE) errors.push(`${key} must be a number of 0 or more with at most 2 decimal places`);
      else q[key] = v;
    }
  }
  if (q.min_price !== undefined && q.max_price !== undefined && q.min_price > q.max_price) errors.push('min_price cannot be greater than max_price');

  if (query.status !== undefined) {
    const s = parseStatus(query.status);
    if (s === null) errors.push('status filter must be 1/0, true/false or "active"/"inactive"');
    else q.status = s;
  }
  if (query.publish_status !== undefined && query.publish_status !== '') {
    if (!PUBLISH_STATUSES.includes(query.publish_status)) errors.push(`publish_status must be one of: ${PUBLISH_STATUSES.join(', ')}`);
    else q.publish_status = query.publish_status;
  }

  const stockRaw = query.stock_status !== undefined ? query.stock_status : query.stock;
  if (stockRaw !== undefined && stockRaw !== '') {
    if (typeof stockRaw !== 'string' || !has(STOCK_FILTER_ALIASES, stockRaw)) errors.push('stock filter must be one of: in, out, low, onbackorder (or instock, outofstock)');
    else q.stock_status = STOCK_FILTER_ALIASES[stockRaw];
  }

  // Default: newest first. With sort_by given, ascending unless sort_order=desc.
  const sortBy = query.sort_by === undefined || query.sort_by === '' ? undefined : query.sort_by;
  const sortOrder = query.sort_order === undefined || query.sort_order === '' ? undefined : String(query.sort_order).toLowerCase();
  if (sortBy !== undefined && !has(SORT_COLUMNS, sortBy)) errors.push(`sort_by must be one of: ${Object.keys(SORT_COLUMNS).join(', ')}`);
  if (sortOrder !== undefined && !['asc', 'desc'].includes(sortOrder)) errors.push('sort_order must be "asc" or "desc"');
  q.sort_by = sortBy || 'created_at';
  q.sort_order = sortOrder || (sortBy ? 'asc' : 'desc');

  if (errors.length) return next(new ApiError(400, 'Validation failed', errors));
  req.listQuery = q;
  next();
}

/** Validates the body of add-to-cart / buy-now: {"quantity": <whole number >= 1>} (defaults to 1). */
function validatePurchaseBody(req, res, next) {
  const body = req.body === undefined ? {} : req.body;
  if (!isPlainObject(body)) return next(new ApiError(400, 'Request body must be a JSON object'));
  let quantity = 1;
  if (body.quantity !== undefined) {
    quantity = parseInteger(body.quantity);
    if (quantity === null || quantity < 1 || quantity > MAX_QUANTITY) {
      return next(new ApiError(400, 'Validation failed', [`quantity must be a whole number between 1 and ${MAX_QUANTITY}`]));
    }
  }
  req.purchase = { quantity };
  next();
}

module.exports = {
  parseProduct, validateProductId, validateProductBody, validateProductUpdateBody, validateDeleteQuery,
  validateProductListQuery, validatePurchaseBody,
};
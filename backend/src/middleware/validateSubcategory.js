const ApiError = require('../utils/ApiError');
const { normalizeUuid } = require('../utils/uuid');

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const MAX_BRANDS = 50;

function parseStatus(value) {
  if (value === 1 || value === true || value === '1' || value === 'true' || value === 'active') return 1;
  if (value === 0 || value === false || value === '0' || value === 'false' || value === 'inactive') return 0;
  return null;
}

/** Validates the :id route param (subcategory UUID) and normalises it to lower case. */
function validateSubcategoryId(req, res, next) {
  const id = normalizeUuid(req.params.id);
  if (!id) return next(new ApiError(400, 'Invalid subcategory id', ['id must be a valid UUID, e.g. 36a8b30f-e1bc-4118-918d-b7834393e55f']));
  req.params.id = id;
  next();
}

/** Validates the :categoryId route param of /categories/:categoryId/subcategories. */
function validateCategoryIdParam(req, res, next) {
  const id = normalizeUuid(req.params.categoryId);
  if (!id) return next(new ApiError(400, 'Invalid category id', ['categoryId must be a valid UUID, e.g. 36a8b30f-e1bc-4118-918d-b7834393e55f']));
  req.params.categoryId = id;
  next();
}

/** brand_names: array of 1-100 character strings; trimmed, de-duplicated (case-insensitive), at most 50. */
function cleanBrands(value, errors) {
  if (value === null) return [];
  if (!Array.isArray(value)) {
    errors.push('brand_names must be an array of strings, e.g. ["Kent", "Aquaguard"]');
    return undefined;
  }
  if (value.length > MAX_BRANDS) {
    errors.push(`brand_names can contain at most ${MAX_BRANDS} brands`);
    return undefined;
  }
  const seen = new Set();
  const out = [];
  for (const b of value) {
    if (typeof b !== 'string' || b.trim().length < 1 || b.trim().length > 100) {
      errors.push('each brand name must be a string of 1-100 characters');
      return undefined;
    }
    const name = b.trim();
    if (!seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      out.push(name);
    }
  }
  return out;
}

/**
 * Validates and normalises the JSON body.
 * isCreate=true  -> category_id and subcategory_name are required.
 * isCreate=false -> partial update, at least one valid field required.
 * Images are NOT sent here as files: upload them with POST /api/uploads/images and send the URL string.
 */
function validateSubcategoryBody(isCreate) {
  return (req, res, next) => {
    if (!isPlainObject(req.body)) return next(new ApiError(400, 'Request body must be a JSON object'));
    const { category_id, subcategory_name, brand_names, description, image, status } = req.body;
    const errors = [];
    const clean = {};

    if (category_id !== undefined) {
      const id = normalizeUuid(category_id);
      if (!id) errors.push('category_id must be a valid UUID');
      else clean.category_id = id;
    } else if (isCreate) {
      errors.push('category_id is required');
    }

    // category_name may be sent next to category_id (the responses contain both). It is not stored: the controller only checks that it
    // belongs to the category_id, and it is kept off req.body so it can never end up in the UPDATE.
    req.claimedCategoryName = undefined;
    if (req.body.category_name !== undefined && req.body.category_name !== null && req.body.category_name !== '') {
      if (typeof req.body.category_name !== 'string' || req.body.category_name.trim().length > 100) errors.push('category_name must be a string of at most 100 characters');
      else req.claimedCategoryName = req.body.category_name.trim();
    }

    if (subcategory_name !== undefined) {
      if (typeof subcategory_name !== 'string' || subcategory_name.trim().length < 2 || subcategory_name.trim().length > 100) {
        errors.push('subcategory_name must be a string of 2-100 characters');
      } else {
        clean.subcategory_name = subcategory_name.trim();
      }
    } else if (isCreate) {
      errors.push('subcategory_name is required');
    }

    if (brand_names !== undefined) {
      const brands = cleanBrands(brand_names, errors);
      if (brands !== undefined) clean.brand_names = brands;
    }

    if (description !== undefined && description !== null) {
      if (typeof description !== 'string' || description.length > 2000) errors.push('description must be a string of at most 2000 characters');
      else clean.description = description.trim() === '' ? null : description.trim();
    } else if (description === null) {
      clean.description = null;
    }

    if (image !== undefined && image !== null) {
      if (typeof image !== 'string' || image.trim().length === 0 || image.length > 255) {
        errors.push('image must be a non-empty string (URL or path) of at most 255 characters');
      } else {
        clean.image = image.trim();
        if (/^data:/i.test(clean.image) || /[\u0000-\u001f\u007f]/.test(clean.image)) {
          errors.push('image must be an image URL or path, not embedded image data');
        }
      }
    } else if (image === null) {
      clean.image = null;
    }

    if (status !== undefined) {
      const s = parseStatus(status);
      if (s === null) errors.push('status must be 1/0, true/false or "active"/"inactive"');
      else clean.status = s;
    }

    if (errors.length) return next(new ApiError(400, 'Validation failed', errors));
    if (!isCreate && Object.keys(clean).length === 0) {
      return next(new ApiError(400, 'Validation failed', ['Provide at least one field to update']));
    }
    req.body = clean;
    next();
  };
}

/** Validates list query params: page, limit, category_id, name, brand, status. */
function validateSubcategoryListQuery(req, res, next) {
  const errors = [];
  const q = {};

  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 50 : Number(req.query.limit);
  if (!Number.isInteger(page) || page < 1) errors.push('page must be a positive integer');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.push('limit must be an integer between 1 and 100');
  q.page = page;
  q.limit = limit;

  if (req.query.category_id !== undefined) {
    const id = normalizeUuid(req.query.category_id);
    if (!id) errors.push('category_id must be a valid UUID');
    else q.category_id = id;
  }
  for (const key of ['name', 'brand']) {
    if (req.query[key] !== undefined) {
      const v = req.query[key];
      if (typeof v !== 'string' || v.length > 100) errors.push(`${key} must be a string of at most 100 characters`);
      else if (v.trim()) q[key] = v.trim();
    }
  }
  if (req.query.status !== undefined) {
    const s = parseStatus(req.query.status);
    if (s === null) errors.push('status filter must be 1/0, true/false or "active"/"inactive"');
    else q.status = s;
  }

  if (errors.length) return next(new ApiError(400, 'Validation failed', errors));
  req.listQuery = q;
  next();
}

module.exports = { validateSubcategoryId, validateCategoryIdParam, validateSubcategoryBody, validateSubcategoryListQuery };
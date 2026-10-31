const ApiError = require('../utils/ApiError');
const { normalizeUuid } = require('../utils/uuid');

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function parseStatus(value) {
  if (value === 1 || value === true || value === '1' || value === 'true' || value === 'active') return 1;
  if (value === 0 || value === false || value === '0' || value === 'false' || value === 'inactive') return 0;
  return null;
}

/** Validates the :id route param (UUID) and normalises it to lower case. */
function validateId(req, res, next) {
  const id = normalizeUuid(req.params.id);
  if (!id) {
    return next(new ApiError(400, 'Invalid category id', ['id must be a valid UUID, e.g. 36a8b30f-e1bc-4118-918d-b7834393e55f']));
  }
  req.params.id = id;
  next();
}

/**
 * Validates the JSON body {"metaProdCateEnty": "<category uuid>"} used to reference a category
 * (for example from a product). Puts the normalised id on req.metaProdCateEnty.
 */
function validateMetaProdCateEnty(req, res, next) {
  const value = isPlainObject(req.body) ? req.body.metaProdCateEnty : undefined;
  if (value === undefined || value === null || value === '') {
    return next(new ApiError(400, 'Validation failed', ['metaProdCateEnty is required']));
  }
  const id = normalizeUuid(value);
  if (!id) {
    return next(new ApiError(400, 'Validation failed', ['metaProdCateEnty must be a valid UUID, e.g. a57fb27e-1f57-11ec-be13-30d16b5c82e9']));
  }
  req.metaProdCateEnty = id;
  next();
}

/**
 * Validates and normalises the request body.
 * isCreate=true  -> category_name is required.
 * isCreate=false -> partial update, at least one valid field required.
 */
function validateCategoryBody(isCreate) {
  return (req, res, next) => {
    if (!isPlainObject(req.body)) {
      return next(new ApiError(400, 'Request body must be a JSON object'));
    }
    const isMultipart = Boolean(req.is('multipart/form-data'));
    const { category_name, status } = req.body;
    let { description, image } = req.body;
    const errors = [];
    const clean = {};

    if (isMultipart) {
      // FormData cannot send null: an empty text field means "no value".
      if (description === '') description = null;
      if (image === '') image = undefined;
      // An uploaded file always wins over a text "image" value; the controller sets the final URL.
      if (req.file) image = undefined;
      // remove_image=true clears the current image (only when no new file was uploaded).
      if (!req.file && ['true', '1'].includes(String(req.body.remove_image))) image = null;
    }

    if (category_name !== undefined) {
      if (typeof category_name !== 'string' || category_name.trim().length < 2 || category_name.trim().length > 100) {
        errors.push('category_name must be a string of 2-100 characters');
      } else {
        clean.category_name = category_name.trim();
      }
    } else if (isCreate) {
      errors.push('category_name is required');
    }

    if (description !== undefined && description !== null) {
      if (typeof description !== 'string' || description.length > 2000) {
        errors.push('description must be a string of at most 2000 characters');
      } else {
        clean.description = description.trim();
      }
    } else if (description === null) {
      clean.description = null;
    }

    if (image !== undefined && image !== null) {
      if (typeof image !== 'string' || image.trim().length === 0 || image.length > 255) {
        errors.push('image must be a non-empty string (URL or path) of at most 255 characters');
      } else {
        clean.image = image.trim();
        // Only store a URL/path - never inline (base64) image data or control characters.
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
    if (!isCreate && Object.keys(clean).length === 0 && !req.file) {
      return next(new ApiError(400, 'Validation failed', ['Provide at least one field to update']));
    }

    req.body = clean;
    next();
  };
}

/** Validates list query params: page, limit, status, search. */
function validateListQuery(req, res, next) {
  const errors = [];
  const q = {};

  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 50 : Number(req.query.limit);
  if (!Number.isInteger(page) || page < 1) errors.push('page must be a positive integer');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.push('limit must be an integer between 1 and 100');
  q.page = page;
  q.limit = limit;

  if (req.query.status !== undefined) {
    const s = parseStatus(req.query.status);
    if (s === null) errors.push('status filter must be 1/0, true/false or "active"/"inactive"');
    else q.status = s;
  }
  if (req.query.search !== undefined) {
    if (typeof req.query.search !== 'string' || req.query.search.length > 100) errors.push('search must be a string of at most 100 characters');
    else q.search = req.query.search.trim();
  }

  if (errors.length) return next(new ApiError(400, 'Validation failed', errors));
  req.listQuery = q;
  next();
}

module.exports = { validateId, validateMetaProdCateEnty, validateCategoryBody, validateListQuery };

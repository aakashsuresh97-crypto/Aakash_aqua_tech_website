const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON in request body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body too large' });
  }
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message, ...(err.details && { errors: err.details }) });
  }
  // MySQL errors
  // Foreign keys. The message is chosen by the constraint that fired (named in MySQL's error text), not by guessing from table names.
  const fk = ((err.sqlMessage || '').match(/CONSTRAINT `([^`]+)`/) || [])[1];
  if (err.code === 'ER_ROW_IS_REFERENCED_2') { // deleting a parent row that still has children
    const msg = {
      fk_subcategory_category: 'This category still has subcategories. Delete or move them first.',
      fk_product_category: 'This category still has products. Delete or move them first.',
      fk_product_subcategory: 'This subcategory still has products. Delete or move them first.',
      fk_product_brand: 'This brand is still used by products. Move those products to another brand first.',
    }[fk] || 'This record is still referenced by other records and cannot be deleted.';
    return res.status(409).json({ success: false, message: msg });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') { // pointing a child row at a parent that does not exist
    const msg = {
      fk_subcategory_category: 'category_id does not match any existing category',
      fk_product_category: 'category_id does not match any existing category',
      fk_product_subcategory: 'subcategory_id does not match any existing subcategory',
      fk_product_brand: 'brand_id does not match any existing brand',
    }[fk] || 'A referenced record does not exist';
    return res.status(400).json({ success: false, message: 'Validation failed', errors: [msg] });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    const what = /category/i.test(err.sqlMessage || '') ? 'A category with this name already exists' : 'This record already exists (a value that must be unique is already used)';
    return res.status(409).json({ success: false, message: what });
  }
  if (err.code === 'ER_NO_SUCH_TABLE') {
    return res.status(500).json({ success: false, message: 'A required table is missing. Run "npm run migrate" first.' });
  }
  if (['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(err.code)) {
    console.error('Database error:', err.code, err.message);
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}

module.exports = { notFound, errorHandler };

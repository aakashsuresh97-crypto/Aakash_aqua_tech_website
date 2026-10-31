const Category = require('../models/category.model');
const ApiError = require('../utils/ApiError');
const { buildImageUrl } = require('../utils/imageFiles');
const { releaseImage } = require('../utils/imageRelease');

// Wraps async handlers so rejected promises reach the error middleware.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

exports.createCategory = wrap(async (req, res) => {
  const data = { ...req.body };
  if (req.file) data.image = buildImageUrl(req, req.file.filename);

  const category = await Category.create(data);
  req.imageCommitted = true; // the file is now referenced by the database row
  res.status(201).json({ success: true, message: 'Category created successfully', data: category });
});

exports.getAllCategories = wrap(async (req, res) => {
  const { page, limit } = req.listQuery;
  const { rows, total } = await Category.findAll(req.listQuery);
  res.json({
    success: true,
    data: rows,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

exports.getCategoryById = wrap(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, `Category with id ${req.params.id} not found`);
  res.json({ success: true, data: category });
});

exports.updateCategory = wrap(async (req, res) => {
  const existing = await Category.findById(req.params.id);
  if (!existing) throw new ApiError(404, `Category with id ${req.params.id} not found`);

  const data = { ...req.body };
  if (req.file) data.image = buildImageUrl(req, req.file.filename);

  const category = Object.keys(data).length ? await Category.update(req.params.id, data) : existing;
  if (!category) throw new ApiError(404, `Category with id ${req.params.id} not found`);
  req.imageCommitted = true;

  // The image was replaced or removed: delete the previous file from disk, unless another category still
  // uses it (image is now a plain URL string the client sends, so two rows could point at one file).
  // External URLs are left alone.
  if ('image' in data && existing.image && existing.image !== category.image) {
    await releaseImage(existing.image);
  }
  res.json({ success: true, message: 'Category updated successfully', data: category });
});

exports.deleteCategory = wrap(async (req, res) => {
  const existing = await Category.findById(req.params.id);
  if (!existing) throw new ApiError(404, `Category with id ${req.params.id} not found`);

  const deleted = await Category.remove(req.params.id);
  if (!deleted) throw new ApiError(404, `Category with id ${req.params.id} not found`);

  await releaseImage(existing.image);
  res.json({ success: true, message: 'Category deleted successfully' });
});

// POST /api/categories/lookup  {"metaProdCateEnty": "<category uuid>"}
// Resolves the category a product (or any other record) points to via its metaProdCateEnty reference.
exports.lookupByMetaProdCateEnty = wrap(async (req, res) => {
  const category = await Category.findById(req.metaProdCateEnty);
  if (!category) throw new ApiError(404, `Category with id ${req.metaProdCateEnty} not found`);
  res.json({ success: true, data: category });
});

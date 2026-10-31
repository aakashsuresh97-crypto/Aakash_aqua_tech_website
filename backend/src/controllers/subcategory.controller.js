const Subcategory = require('../models/subcategory.model');
const Category = require('../models/category.model');
const ApiError = require('../utils/ApiError');
const { releaseImage } = require('../utils/imageRelease');

// Wraps async handlers so rejected promises reach the error middleware.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const notFound = (id) => new ApiError(404, `Subcategory with id ${id} not found`);

// The category a subcategory is attached to must exist, and a category_name sent with it must be that category's name.
async function assertCategoryExists(categoryId, claimedName) {
  const category = await Category.findById(categoryId);
  if (!category) throw new ApiError(400, 'Validation failed', ['category_id does not match any existing category']);
  if (claimedName && claimedName.trim().toLowerCase() !== String(category.category_name).trim().toLowerCase()) {
    throw new ApiError(400, 'Validation failed', [`category_name "${claimedName}" does not match category_id (that category is named "${category.category_name}")`]);
  }
}

const listResponse = (res, { rows, total }, { page, limit }) =>
  res.json({ success: true, data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });

exports.createSubcategory = wrap(async (req, res) => {
  await assertCategoryExists(req.body.category_id, req.claimedCategoryName);
  const subcategory = await Subcategory.create(req.body);
  res.status(201).json({ success: true, message: 'Subcategory created successfully', data: subcategory });
});

// GET /api/subcategories?category_id=&name=&brand=&status=&page=&limit=
exports.getAllSubcategories = wrap(async (req, res) => {
  listResponse(res, await Subcategory.findAll(req.listQuery), req.listQuery);
});

// GET /api/categories/:categoryId/subcategories?name=&brand=&status=&page=&limit=
exports.getSubcategoriesByCategory = wrap(async (req, res) => {
  const { categoryId } = req.params;
  if (!(await Category.findById(categoryId))) throw new ApiError(404, `Category with id ${categoryId} not found`);
  const query = { ...req.listQuery, category_id: categoryId };
  listResponse(res, await Subcategory.findAll(query), query);
});

exports.getSubcategoryById = wrap(async (req, res) => {
  const subcategory = await Subcategory.findById(req.params.id);
  if (!subcategory) throw notFound(req.params.id);
  res.json({ success: true, data: subcategory });
});

exports.updateSubcategory = wrap(async (req, res) => {
  const existing = await Subcategory.findById(req.params.id);
  if (!existing) throw notFound(req.params.id);

  const data = req.body;
  if (data.category_id && data.category_id !== existing.category_id) await assertCategoryExists(data.category_id, req.claimedCategoryName); // moving it
  else if (req.claimedCategoryName) await assertCategoryExists(existing.category_id, req.claimedCategoryName); // name sent without moving it

  const subcategory = await Subcategory.update(req.params.id, data);
  if (!subcategory) throw notFound(req.params.id);

  // Image replaced or removed: delete the old file unless a category/subcategory still uses it.
  if ('image' in data && existing.image && existing.image !== subcategory.image) await releaseImage(existing.image);
  res.json({ success: true, message: 'Subcategory updated successfully', data: subcategory });
});

exports.deleteSubcategory = wrap(async (req, res) => {
  const existing = await Subcategory.findById(req.params.id);
  if (!existing) throw notFound(req.params.id);
  if (!(await Subcategory.remove(req.params.id))) throw notFound(req.params.id);
  await releaseImage(existing.image);
  res.json({ success: true, message: 'Subcategory deleted successfully' });
});
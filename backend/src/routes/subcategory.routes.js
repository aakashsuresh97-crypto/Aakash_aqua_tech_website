const express = require('express');
const c = require('../controllers/subcategory.controller');
const { canWrite, canDelete } = require('../middleware/auth');
const { validateSubcategoryId, validateCategoryIdParam, validateSubcategoryBody, validateSubcategoryListQuery } = require('../middleware/validateSubcategory');

// Mounted at /api (see app.js), so the paths below are full API paths.
const router = express.Router();

router.post('/subcategories', ...canWrite, validateSubcategoryBody(true), c.createSubcategory);
router.get('/subcategories', validateSubcategoryListQuery, c.getAllSubcategories);
router.get('/subcategories/:id', validateSubcategoryId, c.getSubcategoryById);
router.put('/subcategories/:id', ...canWrite, validateSubcategoryId, validateSubcategoryBody(false), c.updateSubcategory);
router.patch('/subcategories/:id', ...canWrite, validateSubcategoryId, validateSubcategoryBody(false), c.updateSubcategory);
router.delete('/subcategories/:id', ...canDelete, validateSubcategoryId, c.deleteSubcategory);

// All subcategories of one category (same filters as the list above, except category_id).
router.get('/categories/:categoryId/subcategories', validateCategoryIdParam, validateSubcategoryListQuery, c.getSubcategoriesByCategory);

module.exports = router;
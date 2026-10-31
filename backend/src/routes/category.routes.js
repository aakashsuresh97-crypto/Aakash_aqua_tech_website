const express = require('express');
const c = require('../controllers/category.controller');
const { parseImageUpload } = require('../middleware/upload');
const { canWrite, canDelete } = require('../middleware/auth');
const { validateId, validateMetaProdCateEnty, validateCategoryBody, validateListQuery } = require('../middleware/validate');

const router = express.Router();

router.post('/', ...canWrite, parseImageUpload, validateCategoryBody(true), c.createCategory);
router.post('/lookup', validateMetaProdCateEnty, c.lookupByMetaProdCateEnty);
router.get('/', validateListQuery, c.getAllCategories);
router.get('/:id', validateId, c.getCategoryById);
router.put('/:id', ...canWrite, validateId, parseImageUpload, validateCategoryBody(false), c.updateCategory);
router.patch('/:id', ...canWrite, validateId, parseImageUpload, validateCategoryBody(false), c.updateCategory);
router.delete('/:id', ...canDelete, validateId, c.deleteCategory);

module.exports = router;

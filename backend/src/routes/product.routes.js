    const express = require('express');
    const c = require('../controllers/product.controller');
    const { canWrite, canDelete, optionalAuth } = require('../middleware/auth');
    const {
      validateProductId, validateProductBody, validateProductUpdateBody, validateDeleteQuery, validateProductListQuery, validatePurchaseBody,
    } = require('../middleware/validateProduct');

    // Mounted at /api/v1/products (see app.js), so the paths below are relative to that.
    const router = express.Router();

    router.post('/', ...canWrite, validateProductBody, c.createProduct);
    router.get('/', optionalAuth, validateProductListQuery, c.getProductPage); // same as /page
    router.get('/page', optionalAuth, validateProductListQuery, c.getProductPage); // must stay above '/:id'
    router.get('/:id', optionalAuth, validateProductId, c.getProductById);
    router.put('/:id', ...canWrite, validateProductId, validateProductUpdateBody, c.updateProduct);
    router.patch('/:id', ...canWrite, validateProductId, validateProductUpdateBody, c.updateProduct);
    router.delete('/:id', ...canDelete, validateProductId, validateDeleteQuery, c.deleteProduct);
    router.post('/:id/add-to-cart', validateProductId, validatePurchaseBody, c.addToCart);
    router.post('/:id/buy-now', validateProductId, validatePurchaseBody, c.buyNow);

    module.exports = router;

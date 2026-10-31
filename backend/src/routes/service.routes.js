const express = require('express');
const c = require('../controllers/service.controller');
const { requireAuth, canWrite, canDelete } = require('../middleware/auth');
const { optionalCustomer } = require('../middleware/customerAuth');
const { formLimiter } = require('../middleware/rateLimit');

const admin = express.Router(); // /api/service-requests
admin.get('/', requireAuth, c.list);
admin.get('/:id', requireAuth, c.getOne);
admin.patch('/:id', ...canWrite, c.update);
admin.put('/:id', ...canWrite, c.update);
admin.delete('/:id', ...canDelete, c.remove);

const pub = express.Router(); // /api/public
pub.post('/service-requests', formLimiter(), optionalCustomer, c.submit);

module.exports = { admin, pub };

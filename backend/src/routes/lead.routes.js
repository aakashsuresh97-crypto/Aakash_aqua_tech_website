const express = require('express');
const c = require('../controllers/lead.controller');
const { requireAuth, canWrite, canDelete } = require('../middleware/auth');
const { formLimiter } = require('../middleware/rateLimit');

// Admin router, mounted at /api/leads. Reading leads needs a login too (they hold customers' phone numbers).
const admin = express.Router();
admin.get('/', requireAuth, c.list);
admin.get('/:id', requireAuth, c.getOne);
admin.patch('/:id', ...canWrite, c.update);
admin.put('/:id', ...canWrite, c.update);
admin.delete('/:id', ...canDelete, c.remove);

// Public router, mounted at /api/public: rate limited per IP + honeypot field "company_website".
const pub = express.Router();
pub.post('/leads', formLimiter(), c.submitDemo);
pub.post('/contact', formLimiter(), c.submitContact);

module.exports = { admin, pub };

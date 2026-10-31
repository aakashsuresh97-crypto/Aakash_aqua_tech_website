const express = require('express');
const c = require('../controllers/order.controller');
const { requireAuth, canWrite, canDelete } = require('../middleware/auth');

// Admin orders, mounted at /api/orders
const r = express.Router();
r.get('/', requireAuth, c.adminList);
r.get('/:id', requireAuth, c.adminGet);
r.get('/:id/invoice', requireAuth, c.adminInvoice);
r.patch('/:id/status', ...canWrite, c.adminStatus);
r.post('/:id/refund', ...canDelete, c.adminRefund); // money going out: admin role only
module.exports = r;

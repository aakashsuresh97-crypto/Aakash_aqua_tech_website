const express = require('express');
const auth = require('../controllers/customer.controller');
const cart = require('../controllers/cart.controller');
const order = require('../controllers/order.controller');
const service = require('../controllers/service.controller');
const { requireCustomer } = require('../middleware/customerAuth');
const { limiter } = require('../middleware/rateLimit');
const { validateLogin, validateRegister } = require('../middleware/validateAuth');
const { CUSTOMER_LOGIN_RATE_MAX, CUSTOMER_REGISTER_RATE_MAX } = require('../config/auth');

// Mounted at /api/customer. Everything except register / login / logout needs a customer token.
const r = express.Router();
// Brute-force protection per IP (on top of the per-account lockout). Successful logins do not count against the limit.
const loginLimit = limiter({ windowMs: 15 * 60 * 1000, max: CUSTOMER_LOGIN_RATE_MAX, message: 'Too many failed login attempts. Please try again in a few minutes.', skipSuccessful: true });
const registerLimit = limiter({ windowMs: 60 * 60 * 1000, max: CUSTOMER_REGISTER_RATE_MAX, message: 'Too many sign-ups from this network. Please try again later.' });
r.post('/auth/register', registerLimit, validateRegister, auth.register);
r.post('/auth/login', loginLimit, validateLogin, auth.login);
r.post('/auth/logout', auth.logout);

r.use(requireCustomer);
r.get('/me', auth.me);
r.patch('/me', auth.updateMe);
r.get('/addresses', auth.listAddresses);
r.post('/addresses', auth.createAddress);
r.put('/addresses/:id', auth.updateAddress);
r.patch('/addresses/:id', auth.updateAddress);
r.delete('/addresses/:id', auth.deleteAddress);

r.get('/cart', cart.getCart);
r.post('/cart/items', cart.addItem);
r.post('/cart/merge', cart.merge);
r.patch('/cart/items/:productId', cart.setQuantity);
r.delete('/cart/items/:productId', cart.removeItem);
r.delete('/cart', cart.clear);

r.post('/orders', order.checkout);
r.get('/orders', order.myOrders);
r.get('/orders/:id', order.myOrder);
r.post('/orders/:id/cancel', order.cancel);
r.get('/orders/:id/payment', order.paymentParams);
r.post('/orders/:id/payment/verify', order.verifyPayment);
r.post('/orders/:id/payment/failed', order.paymentFailed);
r.get('/orders/:id/invoice', order.myInvoice);

r.get('/service-requests', service.mine);

module.exports = r;

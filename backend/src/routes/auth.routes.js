const express = require('express');
const rateLimit = require('express-rate-limit');
const c = require('../controllers/auth.controller');
const { validateLogin } = require('../middleware/validateAuth');
const { requireAuth } = require('../middleware/auth');
const { LOGIN_MAX_ATTEMPTS } = require('../config/auth');

// Mounted at /api/auth (see app.js).
const router = express.Router();

// Brute-force protection per IP per 15 minutes. Only FAILED attempts count, so an admin who signs in and out a few times is never locked out.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: LOGIN_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => res.status(429).json({ success: false, message: 'Too many login attempts. Try again in a few minutes.' }),
});

router.post('/login', loginLimiter, validateLogin, c.login);
router.get('/me', requireAuth, c.me);

module.exports = router;

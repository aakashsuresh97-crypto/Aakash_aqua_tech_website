const rateLimit = require('express-rate-limit');

/**
 * Per-IP limiter for public forms and login. Defaults can be overridden in .env (e.g. FORM_RATE_MAX).
 * Responds with the project's JSON error shape and HTTP 429.
 */
function limiter({ windowMs, max, message = 'Too many requests. Please try again later.', skipSuccessful = false }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: skipSuccessful,
    handler: (req, res) => res.status(429).json({ success: false, message }),
  });
}

const HOUR = 60 * 60 * 1000;
const formLimiter = () => limiter({ windowMs: HOUR, max: Number(process.env.FORM_RATE_MAX) || 10, message: 'Too many submissions from this network. Please call us instead.' });

module.exports = { limiter, formLimiter };

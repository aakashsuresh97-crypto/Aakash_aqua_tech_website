const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { pool } = require('../config/db');
const { JWT_SECRET, JWT_ISSUER, CUSTOMER_AUDIENCE } = require('../config/auth');

// Customer tokens use their own audience, so an admin token is never accepted here (and the reverse).
function verify(req) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  const claims = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'], audience: CUSTOMER_AUDIENCE, issuer: JWT_ISSUER });
  return { id: claims.sub };
}

/** A valid token is not enough: the account must still exist and be active (so disabling a customer takes effect at once). */
async function requireCustomer(req, res, next) {
  try {
    const c = verify(req);
    if (!c) return next(new ApiError(401, 'Please sign in to continue'));
    const [rows] = await pool.execute('SELECT status FROM customer WHERE id = ?', [c.id]);
    if (!rows[0] || Number(rows[0].status) !== 1) return next(new ApiError(401, 'Account not found or disabled. Please sign in again.'));
    req.customer = c;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new ApiError(401, 'Session expired. Please sign in again.'));
    if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') return next(new ApiError(401, 'Invalid token'));
    next(err); // a database problem is a 5xx, not "please sign in"
  }
}

/** Sets req.customer when a valid customer token is sent; otherwise carries on as a guest. */
function optionalCustomer(req, res, next) {
  try { req.customer = verify(req) || undefined; } catch { req.customer = undefined; }
  next();
}

module.exports = { requireCustomer, optionalCustomer };

const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { pool } = require('../config/db');
const { JWT_SECRET, JWT_AUDIENCE, JWT_ISSUER } = require('../config/auth');

/**
 * Requires "Authorization: Bearer <admin token>". Puts { id, role } on req.admin.
 * Two kinds of admin token exist:
 *  - src = 'customer': issued when a customer with is_admin = 1 logs in on the website. is_admin / status are re-read from the
 *    database on EVERY request, so setting is_admin back to 0 (or disabling the account) locks that admin out immediately.
 *  - no src: accounts created with `npm run create-admin` (admin_user table); valid until the token expires.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new ApiError(401, 'Authentication required'));
  let claims;
  try {
    claims = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'], audience: JWT_AUDIENCE, issuer: JWT_ISSUER });
  } catch (err) {
    return next(new ApiError(401, err.name === 'TokenExpiredError' ? 'Session expired. Please sign in again.' : 'Invalid token'));
  }
  if (claims.src === 'customer') {
    try {
      const [rows] = await pool.execute('SELECT is_admin, status FROM customer WHERE id = ?', [claims.sub]);
      if (!rows[0] || Number(rows[0].status) !== 1 || Number(rows[0].is_admin) !== 1) {
        return next(new ApiError(401, 'Admin access is not available for this account. Please sign in again.'));
      }
    } catch (err) { return next(err); }
    req.admin = { id: claims.sub, role: 'admin', src: 'customer' };
    return next();
  }
  req.admin = { id: claims.sub, role: claims.role };
  next();
}

/**
 * For public GET routes that show more to a signed-in admin/staff user (e.g. draft products). No / invalid / expired token = anonymous:
 * the request simply continues without req.admin. A valid token runs exactly the same checks as requireAuth.
 */
function optionalAuth(req, res, next) {
  if (!req.headers.authorization) return next();
  return requireAuth(req, res, () => next()); // any error from requireAuth (bad token) just means "not signed in"
}

/** Use after requireAuth: only the listed roles may continue. */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.admin || !roles.includes(req.admin.role)) return next(new ApiError(403, 'You do not have permission to do this'));
  next();
};

// Shorthands used by the route files.
const canWrite = [requireAuth, requireRole('admin', 'staff')]; // create / edit / upload
const canDelete = [requireAuth, requireRole('admin')]; // delete

module.exports = { requireAuth, optionalAuth, requireRole, canWrite, canDelete };

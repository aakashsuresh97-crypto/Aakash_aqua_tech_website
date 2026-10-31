const ApiError = require('../utils/ApiError');
const { passwordProblems } = require('../utils/password');

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalises { email, password } for POST /api/auth/login. */
function validateLogin(req, res, next) {
  const b = isPlainObject(req.body) ? req.body : {};
  const errors = [];
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  if (!email || email.length > 190 || !EMAIL_RE.test(email)) errors.push('A valid email is required');
  if (typeof b.password !== 'string' || !b.password || b.password.length > 200) errors.push('Password is required');
  if (errors.length) return next(new ApiError(400, 'Validation failed', errors));
  req.body = { email, password: b.password };
  next();
}

/** Normalises { name, email, password } for POST /api/customer/auth/register. Unknown fields (is_admin, role ...) are refused, not ignored. */
function validateRegister(req, res, next) {
  const b = isPlainObject(req.body) ? req.body : {};
  const errors = [];
  const unknown = Object.keys(b).filter((k) => !['name', 'email', 'password'].includes(k));
  if (unknown.length) errors.push(`Unknown field${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}`);
  const name = typeof b.name === 'string' ? b.name.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 2 || name.length > 100) errors.push('Name must be 2 to 100 characters');
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  if (!email || email.length > 190 || !EMAIL_RE.test(email)) errors.push('A valid email is required');
  errors.push(...passwordProblems(b.password));
  if (errors.length) return next(new ApiError(400, 'Validation failed', errors));
  req.body = { name, email, password: b.password };
  next();
}

module.exports = { validateLogin, validateRegister, EMAIL_RE };

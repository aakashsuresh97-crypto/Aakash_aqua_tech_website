// Authentication settings, all from .env (no secrets in code).
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  throw new Error('JWT_SECRET is missing or too short (use at least 32 random characters). Copy .env.example to .env and set it.');
}

module.exports = {
  JWT_SECRET: secret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  JWT_AUDIENCE: 'admin', // customer tokens (later) will use a different audience, so the two can never be mixed up
  JWT_ISSUER: 'category-api',
  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS) || 12,
  LOGIN_MAX_ATTEMPTS: Number(process.env.AUTH_LOGIN_MAX_ATTEMPTS) || 10, // per IP per 15 minutes
  // Comma-separated list of browser origins allowed to call the API cross-origin. Empty = no CORS headers (same-origin / dev proxy).
  CORS_ORIGINS: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
};
module.exports.CUSTOMER_JWT_EXPIRES_IN = process.env.CUSTOMER_JWT_EXPIRES_IN || '30d';
module.exports.CUSTOMER_AUDIENCE = 'customer';

// Customer accounts (email + password). Same rules as the standalone auth-api: 5 wrong passwords lock the account for 15 minutes.
module.exports.MAX_FAILED_LOGINS = Number(process.env.MAX_FAILED_LOGINS) || 5;
module.exports.LOCKOUT_MINUTES = Number(process.env.LOCKOUT_MINUTES) || 15;
// Per IP: only FAILED logins count (a shared office/school network can still log in many people), registrations per hour.
module.exports.CUSTOMER_LOGIN_RATE_MAX = Number(process.env.CUSTOMER_LOGIN_RATE_MAX) || 10;
module.exports.CUSTOMER_REGISTER_RATE_MAX = Number(process.env.CUSTOMER_REGISTER_RATE_MAX) || 10;

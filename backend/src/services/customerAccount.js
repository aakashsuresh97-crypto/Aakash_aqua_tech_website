// Customer accounts: email + password. The same table (`customer`) holds shoppers and admins: is_admin = 1 is set by hand in the database
// (there is no API, field or flag that can create an admin). The flag is read from the database on every protected request.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { newUuid } = require('../utils/uuid');
const {
  JWT_SECRET, JWT_EXPIRES_IN, JWT_AUDIENCE, JWT_ISSUER, CUSTOMER_AUDIENCE, CUSTOMER_JWT_EXPIRES_IN, BCRYPT_ROUNDS, MAX_FAILED_LOGINS, LOCKOUT_MINUTES,
} = require('../config/auth');

// Compared against when the email is unknown, so "no such account" and "wrong password" take the same time and give the same answer.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
const BAD_LOGIN = 'Invalid email or password';

/* is_admin: false (0 in the database) for a customer, true (1) for an admin. `role` says the same in words. */
const roleOf = (c) => (Number(c.is_admin) === 1 ? 'admin' : 'customer');
const publicCustomer = (c) => ({ id: c.id, mobile: c.mobile, name: c.name, email: c.email, is_admin: Number(c.is_admin) === 1, role: roleOf(c) });

const signCustomerToken = (c) => jwt.sign({}, JWT_SECRET, { algorithm: 'HS256', subject: c.id, audience: CUSTOMER_AUDIENCE, issuer: JWT_ISSUER, expiresIn: CUSTOMER_JWT_EXPIRES_IN });

// The admin panel's token. `src: 'customer'` tells requireAuth to re-check is_admin / status in the database on every request.
const signAdminToken = (c) => jwt.sign({ role: 'admin', src: 'customer' }, JWT_SECRET, { algorithm: 'HS256', subject: c.id, audience: JWT_AUDIENCE, issuer: JWT_ISSUER, expiresIn: JWT_EXPIRES_IN });
const adminUser = (c) => ({ id: c.id, email: c.email, full_name: c.name || c.email, role: 'admin' });

async function findByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT *, (locked_until IS NOT NULL AND locked_until > UTC_TIMESTAMP()) AS is_locked FROM customer WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM customer WHERE id = ?', [id]);
  return rows[0] || null;
}

/** Creates a customer. is_admin is written as a literal 0: nothing the client sends can reach it. */
async function register({ name, email, password }) {
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = newUuid();
  try {
    await pool.execute(
      'INSERT INTO customer (id, name, email, password_hash, is_admin, last_login_at) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)', [id, name, email, hash]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'An account with this email already exists. Please log in instead.');
    throw err;
  }
  return findById(id);
}

async function recordFailure(id) {
  await pool.execute(
    `UPDATE customer SET
       locked_until = IF(failed_login_attempts + 1 >= ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), locked_until),
       failed_login_attempts = IF(failed_login_attempts + 1 >= ?, 0, failed_login_attempts + 1)
     WHERE id = ?`, [MAX_FAILED_LOGINS, LOCKOUT_MINUTES, MAX_FAILED_LOGINS, id]);
}

/** Checks the password of an account found by findByEmail(). Counts failures and locks the account; returns the fresh row. */
async function checkPassword(user, password) {
  if (user && user.is_locked) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw new ApiError(423, 'Account is temporarily locked after repeated failed logins. Try again in a few minutes.');
  }
  const ok = await bcrypt.compare(password, user && user.password_hash ? user.password_hash : DUMMY_HASH);
  if (!user || !user.password_hash || !ok) {
    if (user && user.password_hash) await recordFailure(user.id);
    throw new ApiError(401, BAD_LOGIN);
  }
  if (Number(user.status) !== 1) throw new ApiError(403, 'This account is disabled. Please contact us.');
  await pool.execute('UPDATE customer SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
  return user;
}

/** Email + password -> the customer row, or throws 401 / 403 / 423. */
async function authenticate(email, password) {
  return checkPassword(await findByEmail(email), password);
}

/** What the website receives after register / login. Admins also get the token and user the admin panel uses. */
function sessionFor(c, { isNew = false } = {}) {
  const isAdmin = Number(c.is_admin) === 1;
  const out = { token: signCustomerToken(c), customer: publicCustomer(c), is_new: isNew, is_admin: isAdmin, role: roleOf(c), redirect_to: isAdmin ? '/admin/' : null };
  if (isAdmin) out.admin = { token: signAdminToken(c), user: adminUser(c) };
  return out;
}

module.exports = { publicCustomer, signCustomerToken, signAdminToken, adminUser, findByEmail, findById, register, authenticate, checkPassword, sessionFor, DUMMY_HASH, BAD_LOGIN };

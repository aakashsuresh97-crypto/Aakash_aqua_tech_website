const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { newUuid, normalizeUuid } = require('../utils/uuid');
const { parse, isPlainObject } = require('../utils/fields');
const { normalizeMobile } = require('../utils/mobile');
const accounts = require('../services/customerAccount');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// POST /api/customer/auth/register  { name, email, password }  -> signed in straight away. Always a customer (is_admin = 0).
exports.register = wrap(async (req, res) => {
  const customer = await accounts.register(req.body);
  res.status(201).json({ success: true, message: 'Account created', data: accounts.sessionFor(customer, { isNew: true }) });
});

// POST /api/customer/auth/login  { email, password }. Customers and admins use the same form: an admin (is_admin = 1 in the DB)
// also gets { admin: { token, user }, redirect_to: '/admin/' } so the website can open the admin panel.
exports.login = wrap(async (req, res) => {
  const customer = await accounts.authenticate(req.body.email, req.body.password);
  res.json({ success: true, message: 'Login successful', data: accounts.sessionFor(customer) });
});

// POST /api/customer/auth/logout. Tokens are stateless, so the browser forgets them; this exists so the client has one call to make.
exports.logout = (req, res) => res.json({ success: true, message: 'Logged out' });

// GET /api/customer/me
exports.me = wrap(async (req, res) => {
  const c = await accounts.findById(req.customer.id);
  if (!c || c.status !== 1) throw new ApiError(401, 'Account not found or disabled');
  res.json({ success: true, data: accounts.publicCustomer(c) });
});

// PATCH /api/customer/me  { name, mobile }. The email is the login id, so it cannot be changed here.
exports.updateMe = wrap(async (req, res) => {
  const body = isPlainObject(req.body) ? req.body : {};
  const { data, errors } = parse({ name: { type: 'str', max: 100, min: 2 } }, body, { partial: true });
  if ('mobile' in body) {
    if (body.mobile === null || body.mobile === '') data.mobile = null;
    else {
      const m = normalizeMobile(body.mobile);
      if (!m) errors.push('A valid 10-digit mobile number is required');
      else data.mobile = m;
    }
  }
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  if (!Object.keys(data).length) throw new ApiError(400, 'Validation failed', ['Send name and/or mobile']);
  const cols = Object.keys(data);
  try {
    await pool.execute(`UPDATE customer SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...cols.map((c) => data[c]), req.customer.id]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'This mobile number is used by another account');
    throw err;
  }
  const c = await accounts.findById(req.customer.id);
  res.json({ success: true, message: 'Profile updated', data: accounts.publicCustomer(c) });
});

// ---------------- saved addresses ----------------
const ADDRESS = {
  label: { type: 'str', max: 40 },
  full_name: { type: 'str', max: 100, required: true },
  line1: { type: 'str', max: 200, required: true, label: 'address line 1' },
  line2: { type: 'str', max: 200 },
  city: { type: 'str', max: 80, required: true },
  state: { type: 'str', max: 80, required: true },
  pin_code: { type: 'str', max: 6, required: true, pattern: /^[1-9]\d{5}$/, patternMessage: 'pin_code must be a 6-digit PIN code' },
};

/** Validates an address body (used for saved addresses and for an inline checkout address). */
function parseAddress(body, partial = false) {
  const { data, errors } = parse(ADDRESS, body, { partial });
  if (!partial || (isPlainObject(body) && 'mobile' in body)) {
    const mobile = normalizeMobile(isPlainObject(body) ? body.mobile : undefined);
    if (!mobile) errors.push('A valid 10-digit mobile number is required');
    else data.mobile = mobile;
  }
  return { data, errors };
}
exports.parseAddress = parseAddress;

const addrId = (req) => {
  const id = normalizeUuid(req.params.id);
  if (!id) throw new ApiError(400, 'Invalid address id', ['id must be a valid UUID']);
  return id;
};

exports.listAddresses = wrap(async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM customer_address WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC', [req.customer.id]);
  res.json({ success: true, data: rows });
});

async function saveAddress(req, res, existingId) {
  const { data, errors } = parseAddress(req.body, Boolean(existingId));
  const makeDefault = isPlainObject(req.body) && (req.body.is_default === true || req.body.is_default === 1 || req.body.is_default === 'true');
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[{ n }]] = await conn.execute('SELECT COUNT(*) AS n FROM customer_address WHERE customer_id = ?', [req.customer.id]);
    if (!existingId && Number(n) >= 10) throw new ApiError(409, 'You can save up to 10 addresses');
    let id = existingId;
    if (existingId) {
      const [[own]] = await conn.execute('SELECT id FROM customer_address WHERE id = ? AND customer_id = ? FOR UPDATE', [existingId, req.customer.id]);
      if (!own) throw new ApiError(404, 'Address not found');
      const cols = Object.keys(data);
      if (cols.length) await conn.execute(`UPDATE customer_address SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...cols.map((c) => data[c]), id]);
    } else {
      id = newUuid();
      const cols = Object.keys(data);
      await conn.execute(`INSERT INTO customer_address (id, customer_id, ${cols.join(', ')}, is_default) VALUES (?, ?, ${cols.map(() => '?').join(', ')}, ?)`,
        [id, req.customer.id, ...cols.map((c) => data[c]), Number(n) === 0 ? 1 : 0]);
    }
    if (makeDefault) {
      await conn.execute('UPDATE customer_address SET is_default = (id = ?) WHERE customer_id = ?', [id, req.customer.id]);
    }
    await conn.commit();
    const [[row]] = await pool.execute('SELECT * FROM customer_address WHERE id = ?', [id]);
    res.status(existingId ? 200 : 201).json({ success: true, message: existingId ? 'Address updated' : 'Address saved', data: row });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally { conn.release(); }
}
exports.createAddress = wrap((req, res) => saveAddress(req, res, null));
exports.updateAddress = wrap((req, res) => saveAddress(req, res, addrId(req)));

exports.deleteAddress = wrap(async (req, res) => {
  const id = addrId(req);
  const [[row]] = await pool.execute('SELECT is_default FROM customer_address WHERE id = ? AND customer_id = ?', [id, req.customer.id]);
  if (!row) throw new ApiError(404, 'Address not found');
  await pool.execute('DELETE FROM customer_address WHERE id = ? AND customer_id = ?', [id, req.customer.id]);
  if (row.is_default) await pool.execute('UPDATE customer_address SET is_default = 1 WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1', [req.customer.id]);
  res.json({ success: true, message: 'Address deleted' });
});

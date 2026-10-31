const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const users = require('../models/adminUser.model');
const accounts = require('../services/customerAccount');
const { JWT_SECRET, JWT_EXPIRES_IN, JWT_AUDIENCE, JWT_ISSUER } = require('../config/auth');

const publicUser = (u) => ({ id: u.id, email: u.email, full_name: u.full_name, role: u.role });

const signToken = (u) => jwt.sign({ role: u.role }, JWT_SECRET, {
  algorithm: 'HS256', subject: u.id, audience: JWT_AUDIENCE, issuer: JWT_ISSUER, expiresIn: JWT_EXPIRES_IN,
});

/**
 * POST /api/auth/login  { email, password }  - sign-in of the admin panel (/admin/).
 * Works for a customer account that was made an admin (customer.is_admin = 1) and for accounts made with `npm run create-admin`.
 * A normal customer gets 403 here (after the password was checked, so this cannot be used to find out who has an account).
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const customer = await accounts.findByEmail(email);
    if (customer && Number(customer.is_admin) === 1) {
      await accounts.checkPassword(customer, password);
      return res.json({ success: true, message: 'Login successful', data: { token: accounts.signAdminToken(customer), user: accounts.adminUser(customer) } });
    }
    const legacy = await users.findByEmail(email);
    if (!legacy && customer) {
      await accounts.checkPassword(customer, password);
      throw new ApiError(403, 'This account is not an admin account');
    }
    const ok = await bcrypt.compare(password, legacy ? legacy.password_hash : accounts.DUMMY_HASH);
    if (!legacy || !ok || legacy.status !== 1) throw new ApiError(401, accounts.BAD_LOGIN);
    await users.touchLogin(legacy.id);
    res.json({ success: true, message: 'Login successful', data: { token: signToken(legacy), user: publicUser(legacy) } });
  } catch (err) { next(err); }
}

// Used by the admin app on load: confirms the account still exists, is active and (for customer accounts) is still an admin.
async function me(req, res, next) {
  try {
    if (req.admin.src === 'customer') {
      const c = await accounts.findById(req.admin.id);
      if (!c || c.status !== 1 || Number(c.is_admin) !== 1) throw new ApiError(401, 'Account not found or disabled');
      return res.json({ success: true, data: accounts.adminUser(c) });
    }
    const user = await users.findById(req.admin.id);
    if (!user || user.status !== 1) throw new ApiError(401, 'Account not found or disabled');
    res.json({ success: true, data: publicUser(user) });
  } catch (err) { next(err); }
}

module.exports = { login, me };

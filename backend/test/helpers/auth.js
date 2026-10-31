// Test helper: gives the tests a JWT secret and ready-made Authorization headers.
// Require this BEFORE ../src/app so config/auth.js finds the secret.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-test-secret-test-secret-123456';
const jwt = require('jsonwebtoken');

const tokenFor = (role = 'admin', id = '11111111-1111-4111-8111-111111111111', opts = {}) => jwt.sign({ role }, process.env.JWT_SECRET, {
  algorithm: 'HS256', subject: id, audience: 'admin', issuer: 'category-api', expiresIn: '1h', ...opts,
});

module.exports = { tokenFor, adminAuth: { Authorization: `Bearer ${tokenFor('admin')}` }, staffAuth: { Authorization: `Bearer ${tokenFor('staff')}` } };

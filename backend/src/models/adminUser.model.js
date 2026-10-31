const { pool } = require('../config/db');
const { newUuid } = require('../utils/uuid');

const PUBLIC = 'id, email, full_name, role, status, last_login_at, created_at';

async function findByEmail(email) {
  const [rows] = await pool.execute(`SELECT ${PUBLIC}, password_hash FROM admin_user WHERE email = ?`, [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.execute(`SELECT ${PUBLIC} FROM admin_user WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function create({ email, fullName, passwordHash, role }) {
  const id = newUuid();
  await pool.execute(
    'INSERT INTO admin_user (id, email, full_name, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    [id, email, fullName, passwordHash, role],
  );
  return findById(id);
}

async function touchLogin(id) {
  await pool.execute('UPDATE admin_user SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
}

module.exports = { findByEmail, findById, create, touchLogin };

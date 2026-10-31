// Applies the admin login migration. Non-destructive and safe to run any number of times.
//   npm run migrate:auth
//   008_create_admin_user_table.sql - CREATE TABLE IF NOT EXISTS admin_user
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

(async () => {
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, '..', 'sql', '008_create_admin_user_table.sql'), 'utf8'));
    console.log('Applied 008_create_admin_user_table.sql');
    console.log('Auth migration complete. Create the first admin with: npm run create-admin');
  } catch (err) {
    console.error('Auth migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

// Adds email + password login and the admin flag to the existing `customer` table. Non-destructive and safe to run any number of times
// (every change is skipped when it is already there). It never drops a column or deletes a row.
//   npm run migrate:customer-auth      (needs `npm run migrate:site` first: that creates the customer table)
//
//   customer.mobile            becomes optional (people now register with an email address)
//   customer.password_hash     bcrypt hash, never the password
//   customer.is_admin          0 = normal customer (every registration), 1 = admin. Changed ONLY by hand in the database.
//   customer.failed_login_attempts / locked_until   brute-force lockout
//   customer.email             unique (case-insensitive); stored in lower case
const { pool } = require('../src/config/db');

async function hasColumn(name) {
  const [r] = await pool.query('SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', ['customer', name]);
  return r.length > 0;
}
async function hasIndex(name) {
  const [r] = await pool.query('SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?', ['customer', name]);
  return r.length > 0;
}

(async () => {
  try {
    const [t] = await pool.query(`SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer'`);
    if (!t.length) throw new Error('The customer table is missing. Run "npm run migrate:site" first.');

    // a mobile number is no longer required (a UNIQUE index still allows many NULLs)
    await pool.query(`ALTER TABLE customer MODIFY mobile CHAR(10) CHARACTER SET ascii COLLATE ascii_general_ci NULL COMMENT '10-digit Indian mobile (optional)'`);
    console.log('customer.mobile is optional');

    const cols = [
      ['password_hash', `ADD COLUMN password_hash VARCHAR(255) NULL COMMENT 'bcrypt hash' AFTER email`],
      ['is_admin', `ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0 = customer, 1 = admin (set by hand in the DB)' AFTER password_hash`],
      ['failed_login_attempts', `ADD COLUMN failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0 AFTER is_admin`],
      ['locked_until', `ADD COLUMN locked_until DATETIME NULL COMMENT 'UTC' AFTER failed_login_attempts`],
    ];
    for (const [name, ddl] of cols) {
      if (await hasColumn(name)) { console.log(`customer.${name} already exists`); continue; }
      await pool.query(`ALTER TABLE customer ${ddl}`);
      console.log(`Added customer.${name}`);
    }

    // emails become the login id: lower case + unique
    await pool.query(`UPDATE customer SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL AND email <> LOWER(TRIM(email))`);
    await pool.query(`UPDATE customer SET email = NULL WHERE email = ''`);
    if (!(await hasIndex('uq_customer_email'))) {
      const [dups] = await pool.query('SELECT email, COUNT(*) AS n FROM customer WHERE email IS NOT NULL GROUP BY email HAVING n > 1');
      if (dups.length) {
        throw new Error(`These emails are used by more than one customer, so they cannot be unique yet: ${dups.map((d) => `${d.email} (${d.n}x)`).join(', ')}. Clear the email on the extra rows (UPDATE customer SET email = NULL WHERE id = '...') and run this again.`);
      }
      await pool.query('ALTER TABLE customer ADD UNIQUE KEY uq_customer_email (email)');
      console.log('Added unique index uq_customer_email');
    } else console.log('uq_customer_email already exists');
    if (!(await hasIndex('idx_customer_is_admin'))) await pool.query('ALTER TABLE customer ADD KEY idx_customer_is_admin (is_admin)');

    console.log('Customer auth migration complete.');
    console.log(`To make an admin:  UPDATE customer SET is_admin = 1 WHERE email = 'admin@example.com';`);
  } catch (err) {
    console.error('Customer auth migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

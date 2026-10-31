// Applies the storefront migrations sql/009 ... sql/016 (banner, lead, content, blog, catalogue extras, customer,
// cart/orders/payments, service). Non-destructive: every file only uses CREATE TABLE IF NOT EXISTS, so it is safe to run
// any number of times and never touches existing tables or data.
//   npm run migrate:site      (needs the category, subcategory and product tables first: npm run migrate, npm run migrate:product)
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

const dir = path.join(__dirname, '..', 'sql');

(async () => {
  try {
    const [found] = await pool.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('category', 'subcategory', 'product')`
    );
    if (found.length < 3) throw new Error('The category, subcategory and product tables are missing. Run "npm run migrate" and "npm run migrate:product" first.');
    const files = fs.readdirSync(dir).filter((f) => /^(009|01[0-9]|0[2-9][0-9])_.*\.sql$/.test(f)).sort();
    for (const file of files) {
      // the pool runs one statement per query: drop comment lines, then split on the ';' that ends each statement
      const statements = fs.readFileSync(path.join(dir, file), 'utf8')
        .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
        .split(/;\s*(?:\n|$)/).map((t) => t.trim()).filter(Boolean);
      for (const sql of statements) await pool.query(sql);
      console.log(`Applied ${file}`);
    }
    console.log('Site migration complete.');
  } catch (err) {
    console.error('Site migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

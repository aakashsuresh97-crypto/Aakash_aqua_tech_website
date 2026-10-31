// Applies the product migrations. Non-destructive and safe to run any number of times.
// Needs the category and subcategory tables first (run `npm run migrate` once if you have not).
//   node scripts/migrate-product.js
//   006_create_product_table.sql   - CREATE TABLE IF NOT EXISTS product
//   007_alter_product_core.sql     - adds the Phase 1 columns (skipped when they already exist)
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

const sqlFile = (name) => fs.readFileSync(path.join(__dirname, '..', 'sql', name), 'utf8');

async function columnExists(table, column) {
  const [rows] = await pool.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  return rows.length > 0;
}

(async () => {
  try {
    const [found] = await pool.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('category', 'subcategory')`
    );
    if (found.length < 2) throw new Error('The category and subcategory tables are missing. Run "npm run migrate" first.');

    await pool.query(sqlFile('006_create_product_table.sql'));
    console.log('Applied 006_create_product_table.sql');

    if (await columnExists('product', 'publish_status')) {
      console.log('Skipped 007_alter_product_core.sql (already applied)');
    } else {
      // The file holds one ALTER TABLE (atomic) and one UPDATE, separated by the "-- @@" line.
      for (const statement of sqlFile('007_alter_product_core.sql').split(/^-- @@\s*$/m)) {
        if (statement.replace(/^--.*$/gm, '').trim()) await pool.query(statement);
      }
      console.log('Applied 007_alter_product_core.sql');
    }
    console.log('Product migration complete.');
  } catch (err) {
    console.error('Product migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

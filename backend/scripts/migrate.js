// Brings the database up to date. Non-destructive:
//  1. creates the `category` table if it does not exist (UUID ids)
//  2. converts an existing numeric-id `category` table to UUIDs, keeping all data (see uuid-migration.js)
//  3. creates the id registry and registers every existing id
// Safe to run any number of times.
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');
const { migrateCategoryIdToUuid } = require('./uuid-migration');

const dir = path.join(__dirname, '..', 'sql');
const apply = async (file) => {
  await pool.query(fs.readFileSync(path.join(dir, file), 'utf8'));
  console.log(`Applied ${file}`);
};

(async () => {
  try {
    await apply('001_create_category_table.sql');
    console.log(`UUID migration: ${await migrateCategoryIdToUuid(pool)}`);
    await apply('002_create_category_id_log.sql');
    await apply('003_seed_category_id_log.sql');
    await apply('004_create_subcategory_table.sql');
    await apply('005_create_subcategory_brand_table.sql');
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
// Adds banner.description (the paragraph of a "Hero slide" banner and the text of a "Product showcase" banner).
// The API already reads and writes this column; sql/009 created the banner table without it, so creating or editing
// any banner failed with "Unknown column 'description'" on a database built from the migrations.
// Non-destructive and safe to run any number of times (works on MySQL 8 and MariaDB).
//   npm run migrate:banner      (needs `npm run migrate:site` first: that creates the banner table)
const { pool } = require('../src/config/db');

(async () => {
  try {
    const [t] = await pool.query(`SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'banner'`);
    if (!t.length) throw new Error('The banner table is missing. Run "npm run migrate:site" first.');
    const [c] = await pool.query(`SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'banner' AND COLUMN_NAME = 'description'`);
    if (c.length) console.log('banner.description already exists');
    else {
      await pool.query('ALTER TABLE banner ADD COLUMN description TEXT NULL AFTER subtitle');
      console.log('Added banner.description');
    }
    console.log('Banner migration complete.');
  } catch (err) {
    console.error('Banner migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

// Prints the real structure of your `category` table and checks it is ready for UUID ids.
// Read-only: run with  npm run schema
const { pool } = require('../src/config/db');

(async () => {
  try {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
         FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'category' ORDER BY ORDINAL_POSITION`
    );
    if (!cols.length) { console.log('Table `category` not found.'); return; }
    console.table(cols);

    const id = cols.find((c) => c.COLUMN_NAME === 'id');
    const ok = id && /^(char|varchar)\(36\)/i.test(id.COLUMN_TYPE);
    console.log(ok ? `OK: id is ${id.COLUMN_TYPE}, ready for UUIDs.` : `WARNING: id is ${id && id.COLUMN_TYPE}; UUIDs need CHAR(36). Run "npm run migrate" to convert it (keeps all data).`);
    const img = cols.find((c) => c.COLUMN_NAME === 'image');
    console.log(img && /char|text/i.test(img.COLUMN_TYPE) ? `OK: image is ${img.COLUMN_TYPE} (text), it stores a URL, not binary data.` : `WARNING: image column type is ${img && img.COLUMN_TYPE}; it should be VARCHAR/TEXT.`);

    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM category');
    console.log(`Existing categories: ${n}`);
  } catch (e) {
    console.error('Schema inspection failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

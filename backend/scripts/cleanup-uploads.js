// Deletes uploaded image files that no category, subcategory or product references (e.g. the user uploaded an image and
// closed the form without saving). Files younger than --hours (default 24) are kept, so an upload
// that is still being attached is never removed.
//   npm run cleanup:uploads -- --dry-run     (only list what would be deleted)
//   npm run cleanup:uploads -- --hours=48
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');
const { CATEGORY_DIR } = require('../src/config/upload');
const { OWN_FILE, localPathFromUrl } = require('../src/utils/imageFiles');

const dryRun = process.argv.includes('--dry-run');
const hoursArg = process.argv.find((a) => a.startsWith('--hours='));
const hours = hoursArg ? Number(hoursArg.split('=')[1]) : 24;

(async () => {
  try {
    const [categoryRows] = await pool.query('SELECT image FROM category WHERE image IS NOT NULL');
    let subcategoryRows = [];
    try {
      [subcategoryRows] = await pool.query('SELECT image FROM subcategory WHERE image IS NOT NULL');
    } catch (err) {
      if (err.code !== 'ER_NO_SUCH_TABLE') throw err; // subcategory tables not created yet
    }
    let productRows = [];
    try {
      [productRows] = await pool.query('SELECT image_url AS image FROM product WHERE image_url IS NOT NULL');
    } catch (err) {
      if (err.code !== 'ER_NO_SUCH_TABLE') throw err; // product table not created yet
    }
    const otherRows = []; // banner, brand, blog, testimonial ... (see src/utils/imageTables.js)
    for (const [table, column] of require('../src/utils/imageTables')) {
      if (table === 'product') continue; // already read above
      try {
        const [r] = await pool.query(`SELECT \`${column}\` AS image FROM \`${table}\` WHERE \`${column}\` IS NOT NULL`);
        otherRows.push(...r);
      } catch (err) {
        if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
      }
    }
    const rows = [...categoryRows, ...subcategoryRows, ...productRows, ...otherRows];
    const used = new Set(rows.map((r) => localPathFromUrl(r.image)).filter(Boolean).map((p) => path.basename(p)));
    const cutoff = Date.now() - hours * 3600 * 1000;
    let removed = 0;
    for (const name of fs.readdirSync(CATEGORY_DIR)) {
      if (!OWN_FILE.test(name) || used.has(name)) continue;
      const file = path.join(CATEGORY_DIR, name);
      if (fs.statSync(file).mtimeMs > cutoff) continue;
      console.log(`${dryRun ? 'Would delete' : 'Deleting'} ${name}`);
      if (!dryRun) fs.unlinkSync(file);
      removed += 1;
    }
    console.log(`${dryRun ? 'Would delete' : 'Deleted'} ${removed} unused file(s); ${used.size} file(s) in use.`);
  } catch (err) {
    console.error('Cleanup failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
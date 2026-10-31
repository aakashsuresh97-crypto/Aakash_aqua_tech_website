// Links products to the `brand` table by UUID. Non-destructive and safe to run any number of times:
//   1. adds product.brand_id (CHAR(36), NULL-able) + index + foreign key -> brand(id)   (skipped when it already exists)
//   2. fills brand_id for products whose brand NAME matches a brand row (case-insensitive); nothing else is changed
// The existing product.brand text column is kept (old clients keep working, and unmatched legacy names are not lost).
// Needs the product and brand tables first (npm run migrate:product, npm run migrate:site).
//   npm run migrate:brand-link      (run it again after `npm run import:data`, to link newly imported products)
const { pool } = require('../src/config/db');

const exists = async (sql, params) => (await pool.query(sql, params))[0].length > 0;

(async () => {
  try {
    const [found] = await pool.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('product', 'brand')`
    );
    if (found.length < 2) throw new Error('The product and brand tables are missing. Run "npm run migrate:product" and "npm run migrate:site" first.');

    if (await exists(`SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product' AND COLUMN_NAME = 'brand_id'`)) {
      console.log('Skipped: product.brand_id already exists');
    } else {
      // same type/charset/collation as brand.id (CHAR(36) ascii), otherwise the foreign key is rejected
      await pool.query(`ALTER TABLE product
        ADD COLUMN brand_id CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL AFTER brand,
        ADD KEY idx_product_brand_id (brand_id),
        ADD CONSTRAINT fk_product_brand FOREIGN KEY (brand_id) REFERENCES brand (id) ON DELETE RESTRICT ON UPDATE CASCADE`);
      console.log('Added product.brand_id with foreign key fk_product_brand');
    }

    const [linked] = await pool.query(
      `UPDATE product p JOIN brand b ON b.name = p.brand SET p.brand_id = b.id WHERE p.brand_id IS NULL AND p.brand IS NOT NULL`
    );
    console.log(`Linked ${linked.affectedRows} product(s) to a brand by name`);

    const [unmatched] = await pool.query(
      `SELECT brand, COUNT(*) AS products FROM product WHERE brand_id IS NULL AND brand IS NOT NULL GROUP BY brand ORDER BY brand`
    );
    if (unmatched.length) {
      console.log('These brand names have no row in the brand table (products keep the text name, brand_id stays empty).');
      console.log('Create them in the Brands admin (or POST /api/brands) and run this script again to link them:');
      console.table(unmatched);
    }
    console.log('Brand link migration complete.');
  } catch (err) {
    console.error('Brand link migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

// Converts category.id from a numeric id (INT / BIGINT, usually AUTO_INCREMENT or random 9-digit)
// to a UUID (CHAR(36)) without losing any category data.
//
// Safe by design:
//  * does nothing if the id column is already a UUID column (idempotent, safe to run repeatedly)
//  * refuses to run if another table has a foreign key pointing at category.id
//  * keeps a full copy of the table in `category_backup_pre_uuid` (created once, never overwritten)
//  * keeps old id -> new UUID in `category_id_legacy_map`, so old references can still be traced
//  * every row keeps its name, description, image, status, created_at and updated_at
//  * resumable: if it is interrupted half-way, run it again and it carries on
//
// MySQL cannot roll back DDL (ALTER TABLE), which is why the backup + map tables are created first.
const { newUuid } = require('../src/utils/uuid');

const ID_TYPE = 'CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci';

async function columnInfo(pool, table, column) {
  const [rows] = await pool.query(
    `SELECT COLUMN_TYPE, DATA_TYPE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0] || null;
}

async function tableExists(pool, table) {
  const [rows] = await pool.query(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table]
  );
  return rows.length > 0;
}

const isUuidColumn = (info) => info && ['char', 'varchar'].includes(info.DATA_TYPE) && /\(36\)/.test(info.COLUMN_TYPE);

async function referencingForeignKeys(pool) {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = 'category' AND REFERENCED_COLUMN_NAME = 'id'`
  );
  return rows;
}

/** Converts category.id (and the category_id_log registry) to UUID. Returns a short status string. */
async function migrateCategoryIdToUuid(pool, log = console.log) {
  if (!(await tableExists(pool, 'category'))) return 'skipped: table `category` does not exist yet';

  const idInfo = await columnInfo(pool, 'category', 'id');
  const hasHelperColumn = Boolean(await columnInfo(pool, 'category', 'id_uuid'));
  if (isUuidColumn(idInfo) && !hasHelperColumn) {
    await retireIntegerIdLog(pool, log);
    return 'already using UUID ids - nothing to convert';
  }
  if (idInfo && !isUuidColumn(idInfo) && !/int/i.test(idInfo.DATA_TYPE)) {
    throw new Error(`category.id has type ${idInfo.COLUMN_TYPE}; expected an integer column or CHAR(36). Aborting without changes.`);
  }

  const fks = await referencingForeignKeys(pool);
  if (fks.length) {
    const list = fks.map((f) => `${f.TABLE_NAME}.${f.COLUMN_NAME} (${f.CONSTRAINT_NAME})`).join(', ');
    throw new Error(`These foreign keys reference category.id: ${list}. Convert those columns to CHAR(36) as well before migrating. Aborting without changes.`);
  }

  // 1. Safety nets (created once, never overwritten).
  if (!(await tableExists(pool, 'category_backup_pre_uuid'))) {
    await pool.query('CREATE TABLE category_backup_pre_uuid AS SELECT * FROM category');
    log('  - backup created: category_backup_pre_uuid');
  }
  await pool.query(
    `CREATE TABLE IF NOT EXISTS category_id_legacy_map (
       legacy_id BIGINT UNSIGNED NOT NULL,
       id        ${ID_TYPE} NOT NULL,
       PRIMARY KEY (legacy_id),
       UNIQUE KEY uq_legacy_map_id (id)
     ) ENGINE=InnoDB`
  );

  // 2. Add a helper column and give every existing row a UUID (v4, same kind the API generates).
  if (!hasHelperColumn) {
    await pool.query(`ALTER TABLE category ADD COLUMN id_uuid ${ID_TYPE} NULL`);
  }
  if (!isUuidColumn(idInfo)) {
    const [missing] = await pool.query('SELECT id FROM category WHERE id_uuid IS NULL');
    for (const row of missing) {
      // `updated_at = updated_at` stops MySQL's ON UPDATE CURRENT_TIMESTAMP from touching the date.
      await pool.query('UPDATE category SET id_uuid = ?, updated_at = updated_at WHERE id = ? AND id_uuid IS NULL', [newUuid(), row.id]);
    }
    await pool.query('INSERT IGNORE INTO category_id_legacy_map (legacy_id, id) SELECT id, id_uuid FROM category');

    // 3. Swap the columns: drop AUTO_INCREMENT + the old primary key + old column, promote id_uuid to id.
    await pool.query(`ALTER TABLE category MODIFY id ${idInfo.COLUMN_TYPE.replace(/\s*auto_increment/i, '')} NOT NULL`);
    await pool.query(
      `ALTER TABLE category
         DROP PRIMARY KEY,
         DROP COLUMN id,
         CHANGE COLUMN id_uuid id ${ID_TYPE} NOT NULL FIRST,
         ADD PRIMARY KEY (id)`
    );
  }
  await retireIntegerIdLog(pool, log);

  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM category');
  return `converted ${n} categories to UUID ids (old ids kept in category_id_legacy_map, copy in category_backup_pre_uuid)`;
}

/** The old registry held numeric ids. Keep it under a new name; sql/002 + 003 then rebuild it with UUIDs. */
async function retireIntegerIdLog(pool, log) {
  const info = await columnInfo(pool, 'category_id_log', 'id');
  if (info && !isUuidColumn(info)) {
    if (await tableExists(pool, 'category_id_log_legacy_int')) {
      throw new Error('Both category_id_log and category_id_log_legacy_int exist; resolve this manually. Aborting.');
    }
    await pool.query('RENAME TABLE category_id_log TO category_id_log_legacy_int');
    log('  - old numeric registry kept as category_id_log_legacy_int');
  }
}

module.exports = { migrateCategoryIdToUuid };

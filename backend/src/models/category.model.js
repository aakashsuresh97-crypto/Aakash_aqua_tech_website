const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { newUuid } = require('../utils/uuid');

// Category ids are UUIDs (CHAR(36)), generated here as random v4 UUIDs and returned as strings.
const MAX_ATTEMPTS = 10;

// Duplicate on the primary key (an id that already exists), as opposed to a duplicate category name.
const isIdCollision = (err) => err.code === 'ER_DUP_ENTRY' && /PRIMARY/.test(err.sqlMessage || err.message || '');

const COLUMNS = 'id, category_name, description, image, status, created_at, updated_at';

// Escapes % and _ so a search text is matched literally (same helper as the subcategory and product models).
const contains = (v) => `%${v.replace(/[\\%_]/g, '\\$&')}%`;

async function findAll({ page, limit, status, search }) {
  const where = [];
  const params = [];
  if (status !== undefined) {
    where.push('status = ?');
    params.push(status);
  }
  if (search) {
    where.push('(category_name LIKE ? OR description LIKE ?)');
    params.push(contains(search), contains(search));
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM category ${clause}`, params);
  // LIMIT/OFFSET are validated integers, so they are safe to inline.
  const offset = (page - 1) * limit;
  const [rows] = await pool.execute(
    `SELECT ${COLUMNS} FROM category ${clause} ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return { rows, total };
}

async function findById(id) {
  const [rows] = await pool.execute(`SELECT ${COLUMNS} FROM category WHERE id = ?`, [id]);
  return rows[0] || null;
}

/**
 * Inserts a category with a freshly generated, never-reused UUID.
 *  1. generate a random UUID (crypto.randomUUID)
 *  2. reserve it in category_id_log (primary key => unique forever, survives deletes/restarts)
 *  3. insert the category with that id, in the same transaction
 * A collision (id already reserved, or already used by a row) just picks another id.
 */
async function create({ category_name, description = null, image = null, status = 1 }) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const id = newUuid();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [reserved] = await conn.execute('INSERT IGNORE INTO category_id_log (id) VALUES (?)', [id]);
      if (reserved.affectedRows === 0) {
        await conn.rollback();
        continue; // id was issued before (practically impossible): generate another one
      }
      await conn.execute(
        'INSERT INTO category (id, category_name, description, image, status) VALUES (?, ?, ?, ?, ?)',
        [id, category_name, description, image, status]
      );
      await conn.commit();
      return findById(id);
    } catch (err) {
      await conn.rollback().catch(() => {});
      if (isIdCollision(err)) continue; // id already present in category: try another one
      throw err; // e.g. duplicate category name -> 409 via the error handler
    } finally {
      conn.release();
    }
  }
  throw new ApiError(500, 'Could not generate a unique category id. Please try again.');
}

/** How many categories (and subcategories) point at the stored upload file <filename> (matches whatever base URL was used). */
async function countByImageFile(filename) {
  const like = `%/${filename}`;
  const [[{ n }]] = await pool.execute('SELECT COUNT(*) AS n FROM category WHERE image LIKE ?', [like]);
  let inSubcategories = 0;
  try {
    const [[row]] = await pool.execute('SELECT COUNT(*) AS n FROM subcategory WHERE image LIKE ?', [like]);
    inSubcategories = Number(row.n);
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') throw err; // subcategory tables not created yet
  }
  let elsewhere = 0; // product, banner, brand, blog ... (see utils/imageTables.js)
  for (const [table, column] of require('../utils/imageTables')) {
    try {
      const [[row]] = await pool.execute(`SELECT COUNT(*) AS n FROM \`${table}\` WHERE \`${column}\` LIKE ?`, [like]);
      elsewhere += Number(row.n);
    } catch (err) {
      if (err.code !== 'ER_NO_SUCH_TABLE') throw err; // that module's migration has not been applied yet
    }
  }
  return Number(n) + inSubcategories + elsewhere;
}

async function update(id, fields) {
  const keys = Object.keys(fields);
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const [result] = await pool.execute(`UPDATE category SET ${setClause} WHERE id = ?`, [...keys.map((k) => fields[k]), id]);
  if (result.affectedRows === 0) return null;
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM category WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove, countByImageFile };
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { newUuid } = require('../utils/uuid');

const MAX_ATTEMPTS = 5;

// category_name comes from the parent category so clients do not need a second request.
const SELECT = `SELECT s.id, s.category_id, c.category_name, s.subcategory_name, s.description, s.image, s.status,
                       s.created_at, s.updated_at
                  FROM subcategory s JOIN category c ON c.id = s.category_id`;

// Escapes % and _ so a search text is matched literally (then wrapped for a "contains" match).
const contains = (v) => `%${v.replace(/[\\%_]/g, '\\$&')}%`;

const isPrimaryCollision = (err) => err.code === 'ER_DUP_ENTRY' && /PRIMARY/.test(err.sqlMessage || err.message || '');
// Duplicate on the (category_id, subcategory_name) unique key.
const translate = (err) => (err.code === 'ER_DUP_ENTRY'
  ? new ApiError(409, 'A subcategory with this name already exists in this category')
  : err);

/** Adds brand_names: ["A", "B"] to each row with one extra query. */
async function attachBrands(rows) {
  if (!rows.length) return rows;
  const [brands] = await pool.query(
    'SELECT subcategory_id, brand_name FROM subcategory_brand WHERE subcategory_id IN (?) ORDER BY brand_name',
    [rows.map((r) => r.id)]
  );
  const byId = new Map(rows.map((r) => [r.id, []]));
  brands.forEach((b) => byId.get(b.subcategory_id).push(b.brand_name));
  return rows.map((r) => ({ ...r, brand_names: byId.get(r.id) }));
}

async function insertBrands(conn, subcategoryId, brandNames) {
  if (!brandNames || !brandNames.length) return;
  await conn.query('INSERT INTO subcategory_brand (subcategory_id, brand_name) VALUES ?', [brandNames.map((b) => [subcategoryId, b])]);
}

async function findAll({ page, limit, category_id, name, brand, status }) {
  const where = [];
  const params = [];
  if (category_id) { where.push('s.category_id = ?'); params.push(category_id); }
  if (status !== undefined) { where.push('s.status = ?'); params.push(status); }
  if (name) { where.push('s.subcategory_name LIKE ?'); params.push(contains(name)); }
  if (brand) {
    where.push('EXISTS (SELECT 1 FROM subcategory_brand b WHERE b.subcategory_id = s.id AND b.brand_name LIKE ?)');
    params.push(contains(brand));
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM subcategory s ${clause}`, params);
  // LIMIT/OFFSET are validated integers, so they are safe to inline.
  const offset = (page - 1) * limit;
  const [rows] = await pool.execute(`${SELECT} ${clause} ORDER BY s.created_at DESC, s.id DESC LIMIT ${limit} OFFSET ${offset}`, params);
  return { rows: await attachBrands(rows), total };
}

async function findById(id) {
  const [rows] = await pool.execute(`${SELECT} WHERE s.id = ?`, [id]);
  return rows[0] ? (await attachBrands(rows))[0] : null;
}

/** Inserts the subcategory and its brands in one transaction, with a freshly generated UUID. */
async function create({ category_id, subcategory_name, brand_names = [], description = null, image = null, status = 1 }) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const id = newUuid();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        'INSERT INTO subcategory (id, category_id, subcategory_name, description, image, status) VALUES (?, ?, ?, ?, ?, ?)',
        [id, category_id, subcategory_name, description, image, status]
      );
      await insertBrands(conn, id, brand_names);
      await conn.commit();
      return findById(id);
    } catch (err) {
      await conn.rollback().catch(() => {});
      if (isPrimaryCollision(err)) continue; // practically impossible: generate another UUID
      throw translate(err);
    } finally {
      conn.release();
    }
  }
  throw new ApiError(500, 'Could not generate a unique subcategory id. Please try again.');
}

/** Partial update. brand_names (when present) replaces the whole brand list. Returns null if the id does not exist. */
async function update(id, fields) {
  const { brand_names: brandNames, ...columns } = fields;
  const keys = Object.keys(columns);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [found] = await conn.execute('SELECT id FROM subcategory WHERE id = ? FOR UPDATE', [id]);
    if (!found.length) { await conn.rollback(); return null; }

    if (keys.length) {
      await conn.execute(`UPDATE subcategory SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => columns[k]), id]);
    } else {
      await conn.execute('UPDATE subcategory SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]); // only brands changed
    }
    if (brandNames !== undefined) {
      await conn.execute('DELETE FROM subcategory_brand WHERE subcategory_id = ?', [id]);
      await insertBrands(conn, id, brandNames);
    }
    await conn.commit();
    return findById(id);
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw translate(err);
  } finally {
    conn.release();
  }
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM subcategory WHERE id = ?', [id]); // brand rows cascade
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
// Admin: short URL slug, menu order and menu visibility of categories / subcategories (stored in catalog_node, so the
// existing category / subcategory tables and screens are untouched).
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { normalizeUuid } = require('../utils/uuid');
const { slugify } = require('../utils/slug');
const { parse } = require('../utils/fields');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

exports.list = wrap(async (req, res) => {
  const [cats] = await pool.execute(`SELECT c.id, c.category_name AS name, c.status, n.slug, n.sort_order, n.show_in_menu FROM category c LEFT JOIN catalog_node n ON n.entity_type = 'category' AND n.entity_id = c.id ORDER BY COALESCE(n.sort_order, 1000), c.created_at`);
  const [subs] = await pool.execute(`SELECT s.id, s.category_id, s.subcategory_name AS name, s.status, n.slug, n.sort_order, n.show_in_menu FROM subcategory s LEFT JOIN catalog_node n ON n.entity_type = 'subcategory' AND n.entity_id = s.id ORDER BY COALESCE(n.sort_order, 1000), s.created_at`);
  const shape = (r, type) => ({ type, id: r.id, category_id: r.category_id, name: r.name, status: r.status, slug: r.slug || slugify(r.name), has_custom_slug: Boolean(r.slug), sort_order: r.sort_order === null ? 1000 : r.sort_order, show_in_menu: r.show_in_menu === null ? true : Boolean(r.show_in_menu) });
  res.json({ success: true, data: { categories: cats.map((r) => shape(r, 'category')), subcategories: subs.map((r) => shape(r, 'subcategory')) } });
});

// PUT /api/catalog-nodes/:type/:id { slug, sort_order, show_in_menu }
exports.save = wrap(async (req, res) => {
  const type = req.params.type === 'categories' ? 'category' : req.params.type === 'subcategories' ? 'subcategory' : null;
  const id = normalizeUuid(req.params.id);
  if (!type || !id) throw new ApiError(400, 'Invalid request', ['type must be "categories" or "subcategories" and id a UUID']);
  const table = type;
  const [[exists]] = await pool.execute(`SELECT ${type === 'category' ? 'category_name' : 'subcategory_name'} AS name FROM ${table} WHERE id = ?`, [id]);
  if (!exists) throw new ApiError(404, `${type} not found`);
  const { data, errors } = parse({
    slug: { type: 'slug', max: 120, required: true },
    sort_order: { type: 'int', min: -9999, max: 9999, default: 1000 },
    show_in_menu: { type: 'bool', default: 1 },
  }, { slug: slugify(exists.name), ...req.body });
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  try {
    // ON DUPLICATE KEY UPDATE would also fire on the slug's unique key and overwrite ANOTHER item's row, so update
    // this item's row explicitly and insert only when it has none.
    const [[clash]] = await pool.execute('SELECT entity_id FROM catalog_node WHERE entity_type = ? AND slug = ? AND entity_id <> ?', [type, data.slug, id]);
    if (clash) throw new ApiError(409, 'Another item already uses this slug');
    const [upd] = await pool.execute('UPDATE catalog_node SET slug = ?, sort_order = ?, show_in_menu = ? WHERE entity_type = ? AND entity_id = ?', [data.slug, data.sort_order, data.show_in_menu, type, id]);
    if (!upd.affectedRows) {
      const [[have]] = await pool.execute('SELECT 1 AS x FROM catalog_node WHERE entity_type = ? AND entity_id = ?', [type, id]);
      if (!have) await pool.execute('INSERT INTO catalog_node (entity_type, entity_id, slug, sort_order, show_in_menu) VALUES (?, ?, ?, ?, ?)', [type, id, data.slug, data.sort_order, data.show_in_menu]);
    }
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'Another item already uses this slug');
    throw err;
  }
  res.json({ success: true, message: 'Saved', data: { type, id, ...data, show_in_menu: Boolean(data.show_in_menu) } });
});

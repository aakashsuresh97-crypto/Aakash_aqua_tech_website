// Generic admin CRUD + public read API for a simple content table (banner, testimonial, brand, faq, zone, static_page,
// blog_post, amc_plan). Follows the project conventions: UUID ids, { success, message, data, errors, meta } responses,
// prepared statements, ApiError, auth on every write route (staff: create/edit, admin: delete).
const express = require('express');
const { pool } = require('../config/db');
const ApiError = require('./ApiError');
const { newUuid, normalizeUuid } = require('./uuid');
const { slugify } = require('./slug');
const { parse } = require('./fields');
const { requireAuth, canWrite, canDelete } = require('../middleware/auth');

const contains = (v) => `%${v.replace(/[\\%_]/g, '\\$&')}%`;
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function defineResource(cfg) {
  const { table, label, schema, orderBy, searchColumns = [], filters = {}, publicWhere = '1=1', publicOrderBy = orderBy,
    slugFrom, unique = {}, beforeSave, publicColumns } = cfg;
  const columns = Object.keys(schema);
  const hasSlug = 'slug' in schema;
  const SELECT = `SELECT * FROM ${table}`;
  const PUBLIC_SELECT = publicColumns ? `SELECT id, ${publicColumns.join(', ')} FROM ${table}` : SELECT;

  const dupError = (err) => {
    if (err.code !== 'ER_DUP_ENTRY') return err;
    const key = Object.keys(unique).find((k) => (err.sqlMessage || '').includes(k));
    return new ApiError(409, key ? unique[key] : `${label} already exists`);
  };

  async function uniqueSlug(base, excludeId) {
    const [rows] = await pool.execute(`SELECT id, slug FROM ${table} WHERE slug = ? OR slug LIKE ?`, [base, `${base.replace(/[\\%_]/g, '\\$&')}-%`]);
    const taken = new Set(rows.filter((r) => r.id !== excludeId).map((r) => r.slug));
    if (!taken.has(base)) return base;
    for (let i = 2; i < 1000; i += 1) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
    return `${base}-${newUuid().slice(0, 8)}`;
  }

  const findById = async (id) => (await pool.execute(`${SELECT} WHERE id = ?`, [id]))[0][0] || null;

  async function list(req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const where = [];
    const params = [];
    for (const [name, spec] of Object.entries(filters)) {
      if (req.query[name] === undefined || req.query[name] === '') continue;
      const r = require('./fields').parseOne(name, spec, req.query[name]);
      if (r.error) throw new ApiError(400, 'Validation failed', [r.error]);
      where.push(`${name} = ?`);
      params.push(r.value);
    }
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (search && searchColumns.length) {
      where.push(`(${searchColumns.map((c) => `${c} LIKE ?`).join(' OR ')})`);
      searchColumns.forEach(() => params.push(contains(search)));
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM ${table} ${clause}`, params);
    const [rows] = await pool.execute(`${SELECT} ${clause} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params);
    res.json({ success: true, data: rows, meta: { total: Number(total), page, limit, totalPages: Math.ceil(total / limit) } });
  }

  function idParam(req, res, next) {
    const id = normalizeUuid(req.params.id);
    if (!id) return next(new ApiError(400, `Invalid ${label} id`, ['id must be a valid UUID']));
    req.params.id = id;
    next();
  }

  async function getOne(req, res) {
    const row = await findById(req.params.id);
    if (!row) throw new ApiError(404, `${label} not found`);
    res.json({ success: true, data: row });
  }

  async function save(req, res, existing) {
    const { data, errors } = parse(schema, req.body, { partial: Boolean(existing) });
    if (beforeSave) beforeSave(data, errors, existing, req.body);
    if (errors.length) throw new ApiError(400, 'Validation failed', errors);
    if (existing && !Object.keys(data).length) throw new ApiError(400, 'Validation failed', ['Send at least one field to update']);
    try {
      if (!existing) {
        const id = newUuid();
        if (hasSlug && !data.slug && slugFrom) data.slug = await uniqueSlug(slugify(data[slugFrom]));
        const cols = Object.keys(data);
        await pool.execute(`INSERT INTO ${table} (id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})`, [id, ...cols.map((c) => data[c])]);
        return res.status(201).json({ success: true, message: `${label} created`, data: await findById(id) });
      }
      const cols = Object.keys(data);
      await pool.execute(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...cols.map((c) => data[c]), existing.id]);
      return res.json({ success: true, message: `${label} updated`, data: await findById(existing.id) });
    } catch (err) { throw dupError(err); }
  }

  const create = (req, res) => save(req, res, null);
  async function update(req, res) {
    const existing = await findById(req.params.id);
    if (!existing) throw new ApiError(404, `${label} not found`);
    return save(req, res, existing);
  }
  async function remove(req, res) {
    const [r] = await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
    if (!r.affectedRows) throw new ApiError(404, `${label} not found`);
    res.json({ success: true, message: `${label} deleted` });
  }

  // ----- public (no login): only rows matching publicWhere -----
  async function publicList(req, res) {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const where = [publicWhere];
    const params = [];
    for (const name of cfg.publicFilters || []) {
      // one value (?placement=hero_slide) or several separated by commas (?placement=hero_slide,home_showcase)
      if (typeof req.query[name] !== 'string' || !req.query[name]) continue;
      const vals = [...new Set(req.query[name].split(',').map((v) => v.trim()).filter(Boolean))].slice(0, 20);
      if (!vals.length) continue;
      where.push(`${name} IN (${vals.map(() => '?').join(', ')})`);
      params.push(...vals);
    }
    const [rows] = await pool.execute(`${PUBLIC_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${publicOrderBy} LIMIT ${limit}`, params);
    res.json({ success: true, data: rows });
  }
  async function publicOne(req, res) {
    const [rows] = await pool.execute(`${SELECT} WHERE slug = ? AND ${publicWhere}`, [String(req.params.slug).toLowerCase()]);
    if (!rows[0]) throw new ApiError(404, `${label} not found`);
    res.json({ success: true, data: rows[0] });
  }

  const adminRouter = express.Router();
  adminRouter.get('/', requireAuth, wrap(list));
  adminRouter.get('/:id', requireAuth, idParam, wrap(getOne));
  adminRouter.post('/', ...canWrite, wrap(create));
  adminRouter.put('/:id', ...canWrite, idParam, wrap(update));
  adminRouter.patch('/:id', ...canWrite, idParam, wrap(update));
  adminRouter.delete('/:id', ...canDelete, idParam, wrap(remove));

  const publicRouter = express.Router();
  publicRouter.get('/', wrap(publicList));
  if (hasSlug) publicRouter.get('/:slug', wrap(publicOne));

  return { adminRouter, publicRouter, columns };
}

module.exports = { defineResource };
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { newUuid, normalizeUuid } = require('../utils/uuid');
const { parse, parseOne, isPlainObject } = require('../utils/fields');
const { normalizeMobile } = require('../utils/mobile');
const { notify } = require('../services/notifier');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const contains = (v) => `%${v.replace(/[\\%_]/g, '\\$&')}%`;
const TYPES = ['installation', 'repair', 'amc', 'filter_change', 'other'];
const STATUSES = ['new', 'assigned', 'in_progress', 'completed', 'cancelled'];

const FORM = {
  name: { type: 'str', max: 100, required: true },
  email: { type: 'str', max: 190, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMessage: 'email is not valid' },
  city: { type: 'str', max: 80 },
  pin_code: { type: 'str', max: 6, pattern: /^[1-9]\d{5}$/, patternMessage: 'pin_code must be a 6-digit PIN code' },
  address: { type: 'str', max: 500 },
  service_type: { type: 'enum', values: TYPES, default: 'repair' },
  product_note: { type: 'str', max: 200 },
  preferred_date: { type: 'date' },
  description: { type: 'text', max: 2000 },
};

// POST /api/public/service-requests  (guests allowed; a signed-in customer's token links the request to the account)
exports.submit = wrap(async (req, res) => {
  if (isPlainObject(req.body) && typeof req.body.company_website === 'string' && req.body.company_website.trim()) {
    return res.status(201).json({ success: true, message: 'Thank you! Our team will contact you shortly.' }); // honeypot
  }
  const { data, errors } = parse(FORM, req.body);
  const mobile = normalizeMobile(isPlainObject(req.body) ? req.body.mobile : undefined);
  if (!mobile) errors.push('A valid 10-digit mobile number is required');
  if (data.preferred_date && data.preferred_date < new Date().toISOString().slice(0, 10)) errors.push('preferred_date cannot be in the past');
  let planId = null;
  if (isPlainObject(req.body) && req.body.amc_plan_id) {
    planId = normalizeUuid(req.body.amc_plan_id);
    if (!planId) errors.push('amc_plan_id must be a valid UUID');
    else {
      const [p] = await pool.execute('SELECT id FROM amc_plan WHERE id = ? AND status = 1', [planId]);
      if (!p[0]) errors.push('amc_plan_id does not match an active AMC plan');
    }
  }
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  const id = newUuid();
  const row = { ...data, mobile, customer_id: req.customer ? req.customer.id : null, amc_plan_id: planId, ip_address: (req.ip || '').slice(0, 45) };
  const cols = Object.keys(row);
  await pool.execute(`INSERT INTO service_request (id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})`, [id, ...cols.map((c) => row[c])]);
  notify('service.created', `New service request: ${row.service_type} - ${row.name}`,
    `Name: ${row.name}\nMobile: ${mobile}\nCity: ${row.city || '-'}\nType: ${row.service_type}\nProduct: ${row.product_note || '-'}\n${row.description || ''}`, { id });
  res.status(201).json({ success: true, message: 'Thank you! Our team will contact you shortly.', data: { id } });
});

// GET /api/customer/service-requests  (own requests)
exports.mine = wrap(async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT id, service_type, product_note, preferred_date, description, status, assigned_to, created_at FROM service_request WHERE customer_id = ? ORDER BY created_at DESC LIMIT 100', [req.customer.id]);
  res.json({ success: true, data: rows });
});

// ---------- admin ----------
exports.list = wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const where = []; const params = [];
  for (const [name, values] of [['status', STATUSES], ['service_type', TYPES]]) {
    if (!req.query[name]) continue;
    const r = parseOne(name, { type: 'enum', values }, req.query[name]);
    if (r.error) throw new ApiError(400, 'Validation failed', [r.error]);
    where.push(`${name} = ?`); params.push(r.value);
  }
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  if (search) {
    where.push('(name LIKE ? OR mobile LIKE ? OR city LIKE ? OR assigned_to LIKE ?)');
    for (let i = 0; i < 4; i += 1) params.push(contains(search));
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM service_request ${clause}`, params);
  const [rows] = await pool.execute(`SELECT * FROM service_request ${clause} ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params);
  res.json({ success: true, data: rows, meta: { total: Number(total), page, limit, totalPages: Math.ceil(total / limit) } });
});

const reqId = (req) => {
  const id = normalizeUuid(req.params.id);
  if (!id) throw new ApiError(400, 'Invalid service request id', ['id must be a valid UUID']);
  return id;
};

exports.getOne = wrap(async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM service_request WHERE id = ?', [reqId(req)]);
  if (!rows[0]) throw new ApiError(404, 'Service request not found');
  res.json({ success: true, data: rows[0] });
});

exports.update = wrap(async (req, res) => {
  const id = reqId(req);
  const { data, errors } = parse({
    status: { type: 'enum', values: STATUSES }, assigned_to: { type: 'str', max: 100 }, admin_notes: { type: 'text', max: 5000 },
  }, req.body, { partial: true });
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  if (!Object.keys(data).length) throw new ApiError(400, 'Validation failed', ['Send status, assigned_to and/or admin_notes']);
  if (data.assigned_to && !data.status) {
    const [cur] = await pool.execute('SELECT status FROM service_request WHERE id = ?', [id]);
    if (cur[0] && cur[0].status === 'new') data.status = 'assigned'; // assigning a new request moves it on
  }
  const cols = Object.keys(data);
  const [r] = await pool.execute(`UPDATE service_request SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...cols.map((c) => data[c]), id]);
  if (!r.affectedRows) throw new ApiError(404, 'Service request not found');
  const [rows] = await pool.execute('SELECT * FROM service_request WHERE id = ?', [id]);
  res.json({ success: true, message: 'Service request updated', data: rows[0] });
});

exports.remove = wrap(async (req, res) => {
  const [r] = await pool.execute('DELETE FROM service_request WHERE id = ?', [reqId(req)]);
  if (!r.affectedRows) throw new ApiError(404, 'Service request not found');
  res.json({ success: true, message: 'Service request deleted' });
});

const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { newUuid, normalizeUuid } = require('../utils/uuid');
const { parse, parseOne, isPlainObject } = require('../utils/fields');
const { normalizeMobile } = require('../utils/mobile');
const { notify } = require('../services/notifier');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const contains = (v) => `%${v.replace(/[\\%_]/g, '\\$&')}%`;
const INTERESTS = ['Water Purifier', 'Water Softener', 'AMC-Service', 'Other'];
const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'closed', 'spam'];

const DEMO = {
  first_name: { type: 'str', max: 60, required: true },
  last_name: { type: 'str', max: 60 },
  email: { type: 'str', max: 190, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMessage: 'email is not valid' },
  city: { type: 'str', max: 80, required: true },
  pin_code: { type: 'str', max: 6, required: true, pattern: /^[1-9]\d{5}$/, patternMessage: 'pin_code must be a 6-digit PIN code' },
  interest: { type: 'enum', values: INTERESTS, required: true },
  address: { type: 'str', max: 500 },
  page_url: { type: 'url' },
};
const CONTACT = {
  first_name: { type: 'str', max: 60, required: true, label: 'name' },
  email: DEMO.email,
  message: { type: 'text', max: 2000, required: true },
  interest: { type: 'enum', values: INTERESTS, default: 'Other' },
  city: { type: 'str', max: 80 },
  page_url: { type: 'url' },
};

// Spam protection: the form carries a hidden field (default name "company_website") that humans never fill. A bot that fills
// it gets the same success answer but nothing is stored. The IP rate limit is applied in the route.
const isBot = (body) => isPlainObject(body) && typeof body.company_website === 'string' && body.company_website.trim() !== '';

async function submit(req, res, source) {
  if (isBot(req.body)) return res.status(201).json({ success: true, message: 'Thank you! We will contact you shortly.' });
  const schema = source === 'demo' ? DEMO : CONTACT;
  const { data, errors } = parse(schema, req.body);
  const mobile = normalizeMobile(isPlainObject(req.body) ? req.body.mobile : undefined);
  if (!mobile) errors.push('A valid 10-digit mobile number is required');
  if (source === 'demo') {
    const t = parseOne('terms_accepted', { type: 'bool', required: true, label: 'terms_accepted' }, req.body && req.body.terms_accepted);
    if (t.error || t.value !== 1) errors.push('You must accept the terms to continue');
  }
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  const id = newUuid();
  const row = { ...data, mobile, source, terms_accepted: source === 'demo' ? 1 : 0, ip_address: (req.ip || '').slice(0, 45), user_agent: String(req.get('user-agent') || '').slice(0, 255) };
  const cols = Object.keys(row);
  await pool.execute(`INSERT INTO leads (id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})`, [id, ...cols.map((c) => row[c])]);
  const name = `${row.first_name}${row.last_name ? ` ${row.last_name}` : ''}`;
  notify('lead.created', `New ${source === 'demo' ? 'demo request' : 'enquiry'}: ${name}`,
    `Name: ${name}\nMobile: ${mobile}\nCity: ${row.city || '-'} ${row.pin_code || ''}\nInterest: ${row.interest}\n${row.message ? `Message: ${row.message}` : `Address: ${row.address || '-'}`}`, { id, source });
  res.status(201).json({ success: true, message: 'Thank you! We will contact you shortly.', data: { id } });
}

exports.submitDemo = wrap((req, res) => submit(req, res, 'demo'));
exports.submitContact = wrap((req, res) => submit(req, res, 'contact'));

// ---------- admin ----------
exports.list = wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const where = []; const params = [];
  const eq = (name, values) => {
    if (!req.query[name]) return;
    const r = parseOne(name, { type: 'enum', values }, req.query[name]);
    if (r.error) throw new ApiError(400, 'Validation failed', [r.error]);
    where.push(`${name} = ?`); params.push(r.value);
  };
  eq('status', STATUSES); eq('source', ['demo', 'contact', 'other']); eq('interest', INTERESTS);
  for (const [name, op] of [['from', '>='], ['to', '<=']]) {
    if (!req.query[name]) continue;
    const r = parseOne(name, { type: 'date' }, req.query[name]);
    if (r.error) throw new ApiError(400, 'Validation failed', [r.error]);
    where.push(`created_at ${op} ?`); params.push(name === 'from' ? `${r.value} 00:00:00` : `${r.value} 23:59:59`);
  }
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  if (search) {
    where.push('(first_name LIKE ? OR last_name LIKE ? OR mobile LIKE ? OR email LIKE ? OR city LIKE ? OR pin_code LIKE ?)');
    for (let i = 0; i < 6; i += 1) params.push(contains(search));
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM leads ${clause}`, params);
  const [rows] = await pool.execute(`SELECT * FROM leads ${clause} ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params);
  res.json({ success: true, data: rows, meta: { total: Number(total), page, limit, totalPages: Math.ceil(total / limit) } });
});

const leadId = (req) => {
  const id = normalizeUuid(req.params.id);
  if (!id) throw new ApiError(400, 'Invalid lead id', ['id must be a valid UUID']);
  return id;
};

exports.getOne = wrap(async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM leads WHERE id = ?', [leadId(req)]);
  if (!rows[0]) throw new ApiError(404, 'Lead not found');
  res.json({ success: true, data: rows[0] });
});

exports.update = wrap(async (req, res) => {
  const id = leadId(req);
  const { data, errors } = parse({ status: { type: 'enum', values: STATUSES }, notes: { type: 'text', max: 5000 } }, req.body, { partial: true });
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  if (!Object.keys(data).length) throw new ApiError(400, 'Validation failed', ['Send status and/or notes']);
  const cols = Object.keys(data);
  const [r] = await pool.execute(`UPDATE leads SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...cols.map((c) => data[c]), id]);
  if (!r.affectedRows) throw new ApiError(404, 'Lead not found');
  const [rows] = await pool.execute('SELECT * FROM leads WHERE id = ?', [id]);
  res.json({ success: true, message: 'Lead updated', data: rows[0] });
});

exports.remove = wrap(async (req, res) => {
  const [r] = await pool.execute('DELETE FROM leads WHERE id = ?', [leadId(req)]);
  if (!r.affectedRows) throw new ApiError(404, 'Lead not found');
  res.json({ success: true, message: 'Lead deleted' });
});

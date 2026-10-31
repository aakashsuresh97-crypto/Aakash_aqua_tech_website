// Small field validator shared by the new modules (content, leads, service requests, customers, orders).
// schema = { field: { type, required, max, min, values, default } } ; parse() returns { data, errors } and never throws.
const sanitizeHtml = require('sanitize-html');
const { SLUG_RE } = require('./slug');

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const HTML_OPTIONS = {
  allowedTags: ['p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'img',
    'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'section', 'figure', 'figcaption', 'small', 'sup', 'sub', 'pre', 'code'],
  allowedAttributes: { a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'width', 'height', 'loading'], '*': ['class', 'id'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: { a: (tag, attribs) => ({ tagName: 'a', attribs: { ...attribs, rel: 'noopener noreferrer' } }) },
};
const cleanHtml = (s) => sanitizeHtml(s, HTML_OPTIONS);

const parseStatus = (v) => {
  if (v === 1 || v === true || v === '1' || v === 'true' || v === 'active') return 1;
  if (v === 0 || v === false || v === '0' || v === 'false' || v === 'inactive') return 0;
  return null;
};

const pad = (n) => String(n).padStart(2, '0');
const toSqlDateTime = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;

/** Parses one value. Returns { value } or { error }. */
function parseOne(name, spec, raw) {
  const label = spec.label || name;
  const empty = raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');
  if (empty) {
    if (spec.required) return { error: `${label} is required` };
    return { value: null };
  }
  switch (spec.type) {
    case 'str': case 'text': case 'url': case 'slug': case 'html': {
      if (typeof raw !== 'string') return { error: `${label} must be text` };
      let s = spec.type === 'html' ? raw : raw.trim();
      if (spec.type === 'html') s = cleanHtml(s).trim();
      const max = spec.max || (spec.type === 'text' ? 5000 : spec.type === 'html' ? 300000 : spec.type === 'url' ? 500 : 255);
      if (s.length > max) return { error: `${label} must be at most ${max} characters` };
      if (spec.min && s.length < spec.min) return { error: `${label} must be at least ${spec.min} characters` };
      if (spec.type === 'html' && !s && spec.required) return { error: `${label} is required` };
      if (spec.type === 'slug') { s = s.toLowerCase(); if (!SLUG_RE.test(s)) return { error: `${label} may only contain lowercase letters, numbers and hyphens` }; }
      if (spec.type === 'url' && !/^(https?:\/\/[^\s]+|\/[^\s]*)$/i.test(s)) return { error: `${label} must be a full http(s) URL or a path starting with /` };
      if (spec.pattern && !spec.pattern.test(s)) return { error: spec.patternMessage || `${label} is not valid` };
      return { value: s };
    }
    case 'int': {
      const n = typeof raw === 'number' ? raw : (typeof raw === 'string' && /^-?\d+$/.test(raw.trim()) ? Number(raw) : NaN);
      if (!Number.isInteger(n)) return { error: `${label} must be a whole number` };
      if (spec.min !== undefined && n < spec.min) return { error: `${label} must be at least ${spec.min}` };
      if (spec.max !== undefined && n > spec.max) return { error: `${label} must be at most ${spec.max}` };
      return { value: n };
    }
    case 'decimal': {
      const n = typeof raw === 'number' ? raw : (typeof raw === 'string' && /^-?\d+(\.\d{1,2})?$/.test(raw.trim()) ? Number(raw) : NaN);
      if (!Number.isFinite(n) || Math.round(n * 100) / 100 !== n) return { error: `${label} must be a number with at most 2 decimals` };
      if (spec.min !== undefined && n < spec.min) return { error: `${label} must be at least ${spec.min}` };
      if (spec.max !== undefined && n > spec.max) return { error: `${label} must be at most ${spec.max}` };
      return { value: n };
    }
    case 'status': {
      const s = parseStatus(raw);
      return s === null ? { error: `${label} must be 1/0, true/false or "active"/"inactive"` } : { value: s };
    }
    case 'bool': {
      if (raw === true || raw === 1 || raw === '1' || raw === 'true') return { value: 1 };
      if (raw === false || raw === 0 || raw === '0' || raw === 'false') return { value: 0 };
      return { error: `${label} must be true or false` };
    }
    case 'enum': {
      const hit = spec.values.find((v) => v.toLowerCase() === String(raw).trim().toLowerCase());
      return hit ? { value: hit } : { error: `${label} must be one of: ${spec.values.join(', ')}` };
    }
    case 'datetime': {
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? { error: `${label} must be a valid date/time (ISO 8601)` } : { value: d }; // a Date: mysql2 sends it in the server time zone, TIMESTAMP columns convert it
    }
    case 'date': {
      if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.trim()) || Number.isNaN(new Date(raw).getTime())) return { error: `${label} must be a date like 2026-12-31` };
      return { value: raw.trim() };
    }
    default: return { error: `${label}: unsupported type` };
  }
}

/**
 * partial=false (create): every required field must be present, defaults fill the rest.
 * partial=true (update): only the fields that were sent are returned.
 */
function parse(schema, body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  if (!isPlainObject(body)) return { data, errors: ['Request body must be a JSON object'] };
  for (const [name, spec] of Object.entries(schema)) {
    if (partial && !(name in body)) continue;
    if (!partial && body[name] === undefined && spec.default !== undefined) { data[name] = spec.default; continue; }
    if (partial && spec.keepIfEmpty && (body[name] === null || body[name] === '')) continue; // e.g. optional slug: keep the stored one
    const r = parseOne(name, spec, body[name]);
    if (r.error) errors.push(r.error);
    else if (r.value === null && partial && spec.default !== undefined) data[name] = spec.default;
    else if (r.value === null && !partial && spec.default !== undefined) data[name] = spec.default;
    else data[name] = r.value;
  }
  return { data, errors };
}

module.exports = { parse, parseOne, parseStatus, cleanHtml, isPlainObject, toSqlDateTime };

const path = require('path');

// Local, persistent storage for category images. Override with UPLOAD_DIR in .env
// (use an absolute path on a persistent disk/volume in production).
const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));
const CATEGORY_DIR = path.join(UPLOAD_ROOT, 'categories');
const PUBLIC_PREFIX = '/uploads/categories';

const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_SIZE_MB) > 0 ? Number(process.env.MAX_IMAGE_SIZE_MB) : 5;
const MAX_IMAGE_BYTES = Math.round(MAX_IMAGE_MB * 1024 * 1024);

// SVG is intentionally not allowed (it can carry scripts).
const ALLOWED_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

module.exports = { UPLOAD_ROOT, CATEGORY_DIR, PUBLIC_PREFIX, MAX_IMAGE_MB, MAX_IMAGE_BYTES, ALLOWED_TYPES };

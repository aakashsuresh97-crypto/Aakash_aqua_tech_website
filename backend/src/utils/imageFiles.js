const fs = require('fs');
const path = require('path');
const { CATEGORY_DIR, PUBLIC_PREFIX } = require('../config/upload');

// Files we create are named <uuid>.<ext>, which lets us safely recognise our own files.
const OWN_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/;

/** Builds the public URL for a stored file, e.g. http://localhost:3000/uploads/categories/<uuid>.png */
function buildImageUrl(req, filename) {
  const base = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  return `${base}${PUBLIC_PREFIX}/${filename}`;
}

/** Maps a stored image URL back to a file on disk, or null if it is not one of our uploads (e.g. an external URL). */
function localPathFromUrl(url) {
  if (typeof url !== 'string' || !url) return null;
  let pathname;
  try {
    pathname = new URL(url, 'http://placeholder').pathname;
  } catch {
    return null;
  }
  if (!pathname.startsWith(`${PUBLIC_PREFIX}/`)) return null;
  const name = path.basename(pathname);
  if (!OWN_FILE.test(name)) return null;
  return path.join(CATEGORY_DIR, name);
}

/** Best-effort delete of a file we own. Never throws. */
async function removeFile(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Could not delete image file:', err.message);
  }
}

const removeByUrl = (url) => removeFile(localPathFromUrl(url));

// Magic-number check so a renamed .exe / .html cannot pass as an image.
const SIGNATURES = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/gif': (b) => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1')),
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
};

async function matchesSignature(filePath, mimetype) {
  const check = SIGNATURES[mimetype];
  if (!check) return false;
  const fh = await fs.promises.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(12);
    const { bytesRead } = await fh.read(buf, 0, 12, 0);
    return bytesRead >= 12 && check(buf);
  } finally {
    await fh.close();
  }
}

module.exports = { OWN_FILE, buildImageUrl, localPathFromUrl, removeFile, removeByUrl, matchesSignature };

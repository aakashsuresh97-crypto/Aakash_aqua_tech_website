/** "Kent Grand Plus RO (8 L)" -> "kent-grand-plus-ro-8-l". Always returns a valid slug (falls back to "product"). */
function slugify(text) {
  const s = String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180)
    .replace(/-+$/g, '');
  return s || 'product';
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

module.exports = { slugify, SLUG_RE };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
/* files that ship with the catalog live under /catalog/; backend uploads (/uploads/...) are served by the API, not by the catalog */
export const asset = u => (typeof u === 'string' && u.startsWith('/') && !u.startsWith('//') && !u.startsWith('/uploads/')) ? BASE + u : u;
export const WA = '919655599666';          // WhatsApp (same as the website's "Book a Demo" button)
export const CALL = '919655577666';        // phone number shown on aakashaquatech.in
export const CALL_TXT = '+91 96555 77666';
export const SITE = 'https://aakashaquatech.in/';
export const inr = n => '₹' + Number(n).toLocaleString('en-IN');
export const enquiry = p => `https://wa.me/${WA}?text=` + encodeURIComponent(p ? `Hello Aakash Aqua Tech, I'm interested in ${p.name}.${p.url ? ' ' + p.url : ''}` : 'Hello Aakash Aqua Tech, I need an enquiry');
export const NEW_DAYS = 30;
export const isNew = p => Date.now() - new Date(p.createdAt).getTime() < NEW_DAYS * 864e5;
// shape a product for the flip book
export const toBook = (p, grp) => ({ ...p, grp, images: [p.image], tags: [p.brand], old: p.mrp, isNew: isNew(p) });

/* ---------- fast images ----------
   Website photos are huge (often 1–3 MB). We ask a free image CDN (wsrv.nl) for a small WebP copy instead.
   If a product has a local `thumb` (see `npm run images`) that is used and no CDN is needed.
   If anything fails the original website image is loaded, so a picture is never lost. */
const CDN = true;
const OWN = /^https?:\/\/aakashaquatech\.in\//;
export const small = (u, w = 400) => (CDN && OWN.test(u || '')) ? `https://wsrv.nl/?url=${encodeURIComponent(u)}&w=${w}&output=webp&q=72&we` : asset(u);
export const pic = (p, w = 400) => asset(p.thumb) || small(p.image, w);
export const picSet = (p, w1 = 360, w2 = 720) => p.thumb ? undefined : OWN.test(p.image || '') && CDN ? `${small(p.image, w1)} ${w1}w, ${small(p.image, w2)} ${w2}w` : undefined;
export const onImgError = e => { const t = e.currentTarget; if (t.dataset.fb) return; t.dataset.fb = 1; t.removeAttribute('srcset'); if (t.dataset.src) t.src = t.dataset.src };
export const splitList = v => String(v).split(/\s*,\s+(?=[A-Z0-9])/).filter(Boolean);

/* ---------- brands ----------
   Catalog order: Aakash first, Aquaguard next, KENT, then the rest. Brands not listed come last (A–Z). */
export const BRAND_ORDER = ['Aakash', 'Aquaguard', 'KENT', 'A.O. Smith', 'ZeroB', "Sarwan's Wave", 'Conway', 'Purella', 'Enviro', 'Senco'];
export const brandRank = b => { const i = BRAND_ORDER.indexOf(b); return i < 0 ? 99 : i };
export const byBrand = (a, b) => brandRank(a.brand) - brandRank(b.brand) || (brandRank(a.brand) === 99 ? String(a.brand).localeCompare(b.brand) : 0);
/* Small brand logos. Add a file to public/brands/ and one line here, e.g.  'KENT': '/brands/kent.png' */
export const BRAND_LOGOS = {
  Aakash: asset('/logo.webp'), KENT: asset('/brands/kent.webp'), 'A.O. Smith': asset('/brands/ao-smith.webp'), ZeroB: asset('/brands/zerob.webp'),
  "Sarwan's Wave": asset('/brands/sarwans-wave.webp'), Enviro: asset('/brands/enviro.webp'), Purella: asset('/brands/purella.webp'),
};   // Aquaguard, Conway and Senco have no logo on the website yet -> name only

/* brands managed in the admin (name, logo, display order) replace the built-in lists once loaded */
export const setBrands = list => {
  if (!list?.length) return;
  BRAND_ORDER.splice(0, BRAND_ORDER.length, ...list.map(b => b.name));
  list.forEach(b => { if (b.logo_url) BRAND_LOGOS[b.name] = asset(b.logo_url.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/uploads\/)/, '$1')) });
};

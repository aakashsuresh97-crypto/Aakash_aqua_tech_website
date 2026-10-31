// Cleans data-source/catalog-raw.json and writes:
//   public/catalog.json        -> light list used by the catalog pages (small & fast)
//   public/data/<slug>.json    -> full detail for one product (loaded on the product page)
// Run:  npm run data
import fs from 'node:fs';

const raw = JSON.parse(fs.readFileSync('data-source/catalog-raw.json', 'utf8'));
const warn = [];
// new arrivals added by hand (photos in public/img/new/). Newest createdAt = first in "Latest Products".
if (fs.existsSync('data-source/extra-products.json')) raw.products.push(...JSON.parse(fs.readFileSync('data-source/extra-products.json', 'utf8')));
const HIDDEN_CAT = { vacuum: 'Vacuum Cleaners' };   // categories that are not in the menu yet

/* ---------- helpers ---------- */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', deg: '°', times: '×' };
const dec = s => String(s ?? '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const c = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1); return Number.isFinite(c) ? String.fromCodePoint(c) : m }
  return ENT[e.toLowerCase()] ?? m;
});
const sq = s => dec(s).replace(/\s+/g, ' ').trim();
const TYPOS = [[/Aquagaurd/gi, 'Aquaguard'], [/Levender/gi, 'Lavender'], [/REPLACABLE/gi, 'REPLACEABLE'], [/Shappire/gi, 'Sapphire']];
const colour = w => w[0] + w.slice(1).toLowerCase();
function cleanName(n) {
  n = sq(n);
  for (const [a, b] of TYPOS) n = n.replace(a, b);
  n = n.replace(/\s*[-–]\s*(BLACK|WHITE|BLUE|MAROON|RED|GREEN)$/i, (_, c) => ' – ' + colour(c));
  n = n.replace(/\s*[-–]?\s*\((BLACK|WHITE|BLUE|MAROON|RED|GREEN)\)$/i, (_, c) => ' – ' + colour(c));   // "Elegant-(WHITE)" -> "Elegant – White"
  return n;
}

/* text that was auto-generated and is NOT real product information */
const JUNK = [/content is prepared from brand\/catalogue/i, /meticulously engineered to provide clean, premium water/i, /Advanced Deep Purification/i,
  /is engineered by .{1,40} to deliver clean, purified/i, /is a domestic RO water purifier listed under/i, /^Genuine .{1,40} engineered for pure/i,
  /Model configuration may include RO, UV, UF/i, /Designed for domestic drinking-water purification and regular/i, /Suitable for comparing cabinet design/i, /Experience pure, refreshing hydration with this advanced domestic/i];
const isJunk = s => JUNK.some(r => r.test(s || ''));

/* ---------- description parser: text -> intro / features / spec table / benefits / notes ---------- */
const H = {
  feat: /^(key features|best features|features|highlights|salient features)\s*:?$/i,
  ben: /^(benefits|advantages|applications)\s*:?$/i,
  note: /^notes?\s*:?$/i,
  about: /^(about( the)? product|overview|product overview|description)\s*:?$/i,
  spec: /^(technical specifications?|specifications?( for .{0,40})?|technical details|product specifications?|.{0,70}\s[–-]\s(technical )?specifications?)\s*:?$/i,
};
const bullet = s => s.replace(/^[•▪●\-–✔✓*]\s*/, '').trim();
const kindOf = l => Object.keys(H).find(k => H[k].test(l));

function parseDesc(text) {
  const out = { intro: '', features: [], benefits: [], notes: [], spec: null };
  if (!text || isJunk(text)) return out;
  let lines = String(text).replace(/\r/g, '').split('\n').map(l => dec(l).replace(/\s+/g, ' ').trim()).filter(l => l && !/^["'`]+$/.test(l));
  if (!lines.length) return out;
  const secs = []; let cur = { k: 'intro', L: [] };
  secs.push(cur);
  const noHeadings = !lines.some(l => kindOf(l));
  if (noHeadings && lines[0].length <= 40 && lines.length >= 4) cur.k = 'spec';     // whole text is "Key / Value" lines
  const HDR2 = /^(specifications?|details?|description|value|values|data)$/i;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^(parameters?|features?|particulars|item)$/i.test(l) && HDR2.test(lines[i + 1] || '')) { secs.push(cur = { k: 'spec', L: [] }); i++; continue }
    const k = kindOf(l);
    if (k && l.length < 90) { if (!(k === 'spec' && cur.k === 'spec' && !cur.L.length)) secs.push(cur = { k, L: [] }); continue }
    cur.L.push(l);
  }
  const intro = [];
  for (const s of secs) {
    if (s.k === 'intro' || s.k === 'about') intro.push(...s.L);
    else if (s.k === 'feat') out.features.push(...s.L.map(bullet));
    else if (s.k === 'ben') out.benefits.push(...s.L.map(bullet));
    else if (s.k === 'note') out.notes.push(...s.L.map(bullet));
    else if (s.k === 'spec') out.spec = mergeSpec(out.spec, tableFrom(s.L));
  }
  out.intro = intro.filter(l => l.length >= 80 || /[.!?]$/.test(l)).join(' ').trim();
  if (isJunk(out.intro)) out.intro = '';
  out.features = out.features.filter(f => !isJunk(f)); out.benefits = out.benefits.filter(f => !isJunk(f));
  // key/value lines that ended up inside the intro (no heading at all) are not prose
  return out;
}
function mergeSpec(a, b) { if (!a) return b; if (!b) return a; return a.head || b.head ? a : { head: null, rows: [...a.rows, ...b.rows] } }

const VOCAB = new Map();   // spec labels seen in clean tables -> used to split glued "LabelValue" lines
const HEAD_A = /^(parameters?|feature|features|item|specifications?|description)$/i, HEAD_B = /^(specifications?|details?|value|values|description|features?)$/i;
function prep(L) {
  const out = [];
  for (let l of L) {
    let m;
    if ((m = l.match(/^(.{2,40}?)\s+:\s*(.+)$/)) && !/^note/i.test(l)) { out.push(m[1].trim(), m[2].trim()); continue }
    if (VOCAB.size && !VOCAB.has(l.toLowerCase())) {
      let best = ''; const low = l.toLowerCase();
      for (const k of VOCAB.keys()) if (k.length > best.length && low.startsWith(k) && l.length > k.length && /[^\s:]/.test(l[k.length])) best = k;
      if (best) { out.push(l.slice(0, best.length), l.slice(best.length).replace(/^[\s:]+/, '')); continue }
    }
    out.push(l);
  }
  return out;
}
const plausible = (a, b) => a.length <= 48 && !/^\d/.test(a) && b.length <= 400;
function tableFrom(L) {
  L = L.slice();
  while (L.length > 1 && HEAD_A.test(L[0]) && HEAD_B.test(L[1])) L.splice(0, 2);
  if (/^details?$/i.test(L[0])) L.shift();
  const tailAt = L.findIndex(l => /^note:?$/i.test(l) || /^[•▪●]/.test(l)); const tail = tailAt >= 0 ? L.splice(tailAt) : [];
  L = prep(L);
  if (!L.length) return null;
  if (L.length % 2 === 1) {                                   // multi-column (heat pump) ...
    for (const n of [2, 3, 4]) {
      if (L.length > n && L.slice(n).filter((_, i) => i % (n + 1) === 0).every(k => !/^[\d≤<>~-]/.test(k)) && (L.length - n) % (n + 1) === 0 && L.slice(0, n).every(h => h.length <= 28) && L.slice(n).filter((_, i) => i % (n + 1) === 0).every(k => k.length <= 60)) {
        const head = L.slice(0, n), rows = []; for (let i = n; i < L.length; i += n + 1) rows.push(L.slice(i, i + n + 1));
        return { head, rows, tail };
      }
    }
    // ... or one stray line: drop the one whose removal gives the most plausible pairs
    let bestI = 0, bestS = -1;
    for (let i = 0; i < L.length; i++) { const t = L.filter((_, j) => j !== i); let sc = 0; for (let j = 0; j + 1 < t.length; j += 2) if (plausible(t[j], t[j + 1])) sc++; if (sc > bestS) { bestS = sc; bestI = i } }
    tail.unshift(L.splice(bestI, 1)[0]);
  }
  const rows = []; for (let i = 0; i + 1 < L.length; i += 2) {
    if (L[i].length > 100) { tail.push(L[i]); i--; continue }   // a sentence, not a label
    rows.push([L[i], L[i + 1]]);
  }
  return { head: null, rows, tail };
}
function multiGuess() { return false }
const nice = k => (k === k.toUpperCase() && /[A-Z]{3}/.test(k)) ? k.toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (m, a, b) => a + b.toUpperCase()) : k;

/* ---------- build ---------- */
const catById = Object.fromEntries(raw.categories.map(c => [c.id, c]));
const BRAND = { 'KENT Mineral RO': 'KENT' };   // the brand is KENT; "Mineral RO" is only a product line
let P = raw.products.filter(p => p.active !== false).map(p => ({ ...p, brand: BRAND[p.brand] || p.brand, name: cleanName(p.name), subIds: p.subId ? [p.subId] : [] }));

// 1) merge the "-uv" clones: same product listed under RO and under UV
const key = p => p.categoryId + '|' + p.image + '|' + p.name.toLowerCase();
const byKey = new Map(P.filter(p => p.subId !== 'uv').map(p => [key(p), p]));
let merged = 0; const keep = [];
for (const p of P) {
  const twin = p.subId === 'uv' && byKey.get(key(p));
  if (twin) { if (!twin.subIds.includes('uv')) twin.subIds.push('uv'); merged++; continue }
  keep.push(p);
}
P = keep;
// 2) placeholder "Aakash UV Product" is the A.O. Smith Z1 (same image & price)
P = P.filter(p => { if (p.name !== 'Aakash UV Product') return true; const t = P.find(q => q !== p && q.image === p.image && q.price === p.price); if (t) { merged++; return false } return true });

// 3) items that sit in the wrong category on the site
const MOVE = {
  'compact-50-lph-commercial-ro': ['industrial', ''], 'compact-100-lph-commercial-ro': ['industrial', ''], 'power-flow-50lph': ['industrial', ''],
  'smps-for-ro-water-purifiers-charger-type': ['spares', ''], 'zerob-autocarbon': ['wtp', 'sand'],
};
for (const p of P) { const m = MOVE[p.slug]; if (m) { p.categoryId = m[0]; p.subIds = m[1] ? [m[1]] : [] } }
for (const s of Object.keys(MOVE)) if (!P.some(p => p.slug === s)) warn.push('MOVE slug not found: ' + s);

// 3b) photos supplied by the client (stored in public/img/kent/) replace the website photo of these products
const LOCAL_IMG = { 'kent-elegant-white': 'kent-elegant-white', 'kent-elegant-black': 'kent-elegant-black', 'kent-crystal-alkaline-white': 'kent-crystal-alkaline-white',
  'kent-crystal-alkaline-black': 'kent-crystal-alkaline-black', 'kent-crown-plus-ro-water-purifier': 'kent-crown-plus' };
for (const [slug, f] of Object.entries(LOCAL_IMG)) { const p = P.find(x => x.slug === slug); if (!p) { warn.push('LOCAL_IMG slug not found: ' + slug); continue } p.image = `/img/kent/${f}.webp`; p.gallery = [] }

// 4) parse descriptions + build detail records
const SPLIT_KEYS = /^(membrane|pump|panel|vessel|panel & auto mpv|variations?|variant|colou?r|option)$/i;
const genericImg = u => /\/(blue-|green|red-|white-\d|black-\d)\.webp$/i.test(u || '');
function pass() {
for (const p of P) {
  const d = parseDesc(p.description);
  const specRows = d.spec ? d.spec.rows : [];
  const have = new Set(specRows.map(r => r[0].toLowerCase()));
  const extra = (p.tech || []).filter(t => t.key && sq(t.value) && !have.has(t.key.toLowerCase()) && !/^product tag$/i.test(t.key)).map(t => [sq(t.key), sq(t.value)]);
  const model = (specRows.find(r => /^model( name)?$/i.test(r[0])) || [])[1];
  const whole = t => { t = t.trim(); if (!t || /[.!?)”"']$/.test(t)) return t; const i = Math.max(t.lastIndexOf('. '), t.lastIndexOf('! '), t.lastIndexOf('? ')); return i > 40 ? t.slice(0, i + 1) : t };   // never end mid-sentence
  let summary = whole(sq(p.summary)); if (isJunk(summary)) summary = '';
  if (!summary && d.intro) summary = d.intro.length > 300 ? whole(d.intro.slice(0, 300).replace(/\s+\S*$/, '')) : d.intro;
  const real = d.features;  // only real features – the generic "Genuine X engineered…" bullets are dropped
  const feats = [...real, ...((p.features || []).map(sq).filter(f => !isJunk(f) && !/Free installation and 24 hours|Certified water quality/i.test(f) && !real.includes(f)))];
  p._d = { model, summary, intro: d.intro && d.intro !== summary ? d.intro : '', features: feats.slice(0, 12), benefits: d.benefits, notes: [...d.notes, ...(d.spec?.tail || []).map(bullet)].filter(n => n.length > 3),
    specs: d.spec ? { head: d.spec.head, rows: d.spec.rows } : null, extra };
}
}
pass();
for (const p of P) for (const r of p._d.specs?.rows || []) if (!p._d.specs.head) VOCAB.set(r[0].toLowerCase(), (VOCAB.get(r[0].toLowerCase()) || 0) + 1);
for (const [k, n] of [...VOCAB]) if (n < 3 || k.length < 3) VOCAB.delete(k);
warn.length = 0; pass();

// 5) products that still share a name inside one category -> tell them apart by their model / colour
const seen = new Map();
for (const p of P) { const k = p.categoryId + '|' + p.name.toLowerCase(); (seen.get(k) || seen.set(k, []).get(k)).push(p) }
for (const g of seen.values()) if (g.length > 1) {
  g.forEach((p, i) => {
    if (i === 0) return;
    const m = p._d.model && p._d.model.toLowerCase() !== p.name.toLowerCase() ? cleanName(p._d.model) : '';
    const c = (p._d.extra.find(e => /^colou?r$/i.test(e[0]) && !/₹/.test(e[1])) || [])[1];
    p.name = m || (c ? `${p.name} (${c.split(',')[0].trim()})` : `${p.name} (${i + 1})`);
    warn.push(`renamed duplicate -> ${p.name}  [${p.slug}]`);
  });
}

// 6) write files
fs.rmSync('public/data', { recursive: true, force: true }); fs.mkdirSync('public/data', { recursive: true });
const sub = (cid, sid) => catById[cid]?.subs.find(s => s.id === sid)?.name;
const list = P.map(p => ({ id: p.id, slug: p.slug, name: p.name, brand: p.brand, categoryId: p.categoryId, subIds: p.subIds, price: p.price || 0, mrp: p.mrp || 0,
  inStock: p.inStock !== false, image: p.image, createdAt: p.createdAt, url: p.url }));
for (const p of P) {
  const g = [...new Set([p.image, ...(p.gallery || [])])].filter(Boolean).slice(0, 8);
  const detail = { slug: p.slug, name: p.name, summary: p._d.summary, intro: p._d.intro, gallery: g, features: p._d.features, benefits: p._d.benefits, notes: p._d.notes,
    info: [['Model', p._d.model && p._d.model.length < 60 ? cleanName(p._d.model) : p.name], ['Brand', p.brand], ['Category', [catById[p.categoryId]?.name || HIDDEN_CAT[p.categoryId], ...p.subIds.map(s => sub(p.categoryId, s))].filter(Boolean).join(' › ')]],
    specs: p._d.specs, extra: p._d.extra };
  detail.info = detail.info.filter(r => r[1]);
  fs.writeFileSync(`public/data/${p.slug}.json`, JSON.stringify(detail));
}
fs.writeFileSync('public/catalog.json', JSON.stringify({ categories: raw.categories, products: list }));

/* ---------- report ---------- */
const withSpec = P.filter(p => p._d.specs?.rows.length).length, multi = P.filter(p => p._d.specs?.head).length;
console.log(`raw ${raw.products.length} -> ${P.length} products (${merged} duplicates merged)`);
console.log(`with spec table: ${withSpec} (multi-column ${multi}); with extra tech rows: ${P.filter(p => p._d.extra.length).length}; no spec at all: ${P.filter(p => !p._d.specs && !p._d.extra.length).length}`);
const subCount = {}; for (const p of P) for (const s of p.subIds.length ? p.subIds : ['-']) subCount[p.categoryId + '/' + s] = (subCount[p.categoryId + '/' + s] || 0) + 1;
console.log(subCount);
console.log(warn.join('\n'));
console.log('catalog.json', (fs.statSync('public/catalog.json').size / 1024).toFixed(0) + ' KB');

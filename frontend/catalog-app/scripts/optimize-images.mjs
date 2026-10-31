// Downloads every product photo once and saves a small WebP copy in public/img/,
// then points catalog.json at those local copies (field "thumb"). Run on your own computer:
//   npm run data && npm run images
// Re-running only downloads photos that are missing. If a photo fails it keeps using the website image.
import fs from 'node:fs'; import path from 'node:path'; import sharp from 'sharp';

const FILE = process.env.CATALOG || 'public/catalog.json', OUT = 'public/img', W = 480, CONC = 6;
const cat = JSON.parse(fs.readFileSync(FILE, 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
let done = 0, fail = 0, skip = 0, i = 0;

async function one(p) {
  if (!/^https?:/.test(p.image)) { p.thumb = p.image; skip++; return }   // already a local file
  const rel = `/img/${p.slug}.webp`, file = path.join(OUT, `${p.slug}.webp`);
  if (fs.existsSync(file)) { p.thumb = rel; skip++; return }
  try {
    const r = await fetch(p.image, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    await sharp(buf).rotate().resize({ width: W, height: W, fit: 'inside', withoutEnlargement: true }).webp({ quality: 72 }).toFile(file);
    p.thumb = rel; done++;
  } catch (e) { fail++; console.warn('skip', p.slug, e.message) }
}
await Promise.all(Array.from({ length: CONC }, async () => { while (i < cat.products.length) await one(cat.products[i++]) }));
fs.writeFileSync(FILE, JSON.stringify(cat));
console.log(`images: ${done} new, ${skip} already there, ${fail} failed`);

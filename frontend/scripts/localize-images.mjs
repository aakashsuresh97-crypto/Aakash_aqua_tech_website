/* Copies every picture the site takes from the old WordPress site (https://aakashaquatech.in/wp-content/uploads/...) into
   public/img/wp/, keeping the same folder names. After that the site serves its own copies (see localImg() in src/data.js),
   so nothing breaks when the old site is switched off or a file there was deleted.
     1.  npm run export:catalogue          (refreshes catalogue-export.json; skip if it is already up to date)
     2.  npm run images:localize           (run it while the old site is still online)
   Files that already exist are skipped, so it is safe to run again. Pictures that could not be downloaded are listed in
   scripts/missing-images.txt: upload those again in the admin panel (Products / Categories). */
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const WP = 'https://aakashaquatech.in/wp-content/uploads/'
const OUT = resolve('public/img/wp')
const found = new Set()
const add = (rel) => rel && found.add(decodeURI(rel.replace(/[?#].*$/, '')))

const URL_RE = /https?:\/\/(?:www\.)?aakashaquatech\.in\/wp-content\/uploads\/([^"'`\s)\\<>]+)/g
const REL_RE = /['"`](20\d\d\/\d\d\/[^'"`\s]+\.(?:png|jpe?g|webp|avif|gif|svg))['"`]/g
const scan = (text) => {
  for (const m of text.matchAll(URL_RE)) add(m[1])
  for (const m of text.matchAll(REL_RE)) add(m[1])
}

async function walk(dir) {
  for (const f of await readdir(dir)) {
    const p = join(dir, f)
    if ((await stat(p)).isDirectory()) await walk(p)
    else if (/\.(jsx?|mjs|json|css|html)$/.test(f)) scan(await readFile(p, 'utf8'))
  }
}
await walk(resolve('src'))
const catalogue = resolve(process.argv[2] || 'catalogue-export.json')
if (existsSync(catalogue)) scan(await readFile(catalogue, 'utf8'))
else console.log(`(${catalogue} not found: only the pictures named in src/ are copied)`)

const list = [...found].filter((x) => /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(x))
console.log(`${list.length} pictures to check`)
const missing = []
let done = 0
let saved = 0

async function one(rel) {
  const file = join(OUT, rel)
  if (existsSync(file)) return
  try {
    const res = await fetch(WP + rel.split('/').map(encodeURIComponent).join('/'), { signal: AbortSignal.timeout(30000) })
    const type = res.headers.get('content-type') || ''
    if (!res.ok || !type.startsWith('image/')) throw new Error(res.ok ? `not an image (${type})` : `HTTP ${res.status}`)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, Buffer.from(await res.arrayBuffer()))
    saved += 1
  } catch (e) {
    missing.push(`${rel}   ${e.message}`)
  }
}

const queue = [...list]
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      await one(queue.shift())
      done += 1
      if (done % 25 === 0) console.log(`${done}/${list.length}`)
    }
  }),
)
console.log(`Saved ${saved} new pictures into public/img/wp`)
if (missing.length) {
  await writeFile(resolve('scripts/missing-images.txt'), missing.join('\n') + '\n')
  console.log(`${missing.length} could not be downloaded - see scripts/missing-images.txt`)
} else console.log('Nothing missing.')

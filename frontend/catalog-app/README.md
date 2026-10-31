# Aakash Aqua Tech – Digital Catalog (frontend)

React + Vite. Static site (Vercel / Netlify / any static host).

```bash
npm install
npm run dev        # develop
npm run build      # production build -> dist/
```

## How the product data works

| File | What it is |
|---|---|
| `data-source/catalog-raw.json` | Raw product export from aakashaquatech.in (**edit/replace this**). Not published. |
| `scripts/build-data.mjs` | Cleans the raw export and writes the two files below. |
| `public/catalog.json` | Small product list used by the catalog pages (~130 KB). |
| `public/data/<slug>.json` | Full details of one product, loaded only when its page is opened. |

`npm run data` re-creates both from the raw export. It: merges duplicate products (the same purifier listed under RO **and** UV is now one product that shows in both lists), fixes names (`&amp;`, typos, colour suffixes), removes auto-generated filler text, and turns the spec lines found in each description into proper table rows.
Wrong-category fixes and name overrides are in the `MOVE` map / rename step of `scripts/build-data.mjs`.

## Fast images

Product photos on the website are very large. The catalog asks the free image CDN **wsrv.nl** for a small WebP copy and falls back to the original photo if that fails (`src/lib.js`).

For the permanent fix (no third-party CDN), run once on your computer and commit the result:

```bash
npm run data && npm run images     # downloads photos, saves 480px WebP files in public/img/
```
Re-run `npm run images` after `npm run data` whenever products change (only missing photos are downloaded).

## Brands

* Order in every list: **Aakash, Aquaguard, KENT**, then A.O. Smith, ZeroB, Sarwan's Wave, Conway, Purella, Enviro, Senco (change `BRAND_ORDER` in `src/lib.js`).
* Brand names come from the data ("KENT Mineral RO" is shown as **KENT**; see `BRAND` in `scripts/build-data.mjs`).
* Small brand logos (taken from the website): KENT, A.O. Smith, ZeroB, Sarwan's Wave, Enviro, Purella and Aakash. Aquaguard, Conway and Senco have no logo yet: put the file in `public/brands/` and add one line to `BRAND_LOGOS` in `src/lib.js`, e.g. `Conway: '/brands/conway.webp'`.

## Adding new arrivals

Hand-added products live in `data-source/extra-products.json` (photos in `public/img/new/`). The newest `createdAt` shows first in **Latest Products**. Copy an entry, change the name/photo/date, then run `npm run data`. Vacuum cleaners use the hidden category `vacuum` (not in the menu yet).

## Your own product photos

Photos kept in `public/img/kent/` replace the website photo for those products (`LOCAL_IMG` in `scripts/build-data.mjs`). To add more: drop the image in a folder under `public/img/`, add `slug: file` to `LOCAL_IMG`, then `npm run data`.

## Book sizes

The flip-book sizes itself to the screen (`calc()` in `src/components/FlipBook.jsx`):
two-page book on desktop and landscape tablets, one large page on phones and upright tablets. Only the pages next to the open one are drawn, so it stays smooth.

---
## Data source (important)
This catalog reads from the SAME backend as the website (`/api/public/catalog`, `/api/public/products`, `/api/public/banners`),
so categories, subcategories, brands, banners and products added in the admin panel appear here automatically.
The API base is `VITE_API_BASE_URL` (default `/api`). If the API cannot be reached it falls back to the bundled
`public/catalog.json` + `public/data/*.json`.

Rebuild after editing: `npm install && npm run build`, then copy everything inside `dist/` into `../public/catalog/`.

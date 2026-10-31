# Aakash Pure Aqua Tech - website + admin (React + Vite)

One project, two apps with separate bundles:

| URL | App | Who sees it | Source |
|---|---|---|---|
| `/` (and `/shop/...`, `/product/...`, `/blog` ...) | Public website | everyone | `index.html`, `src/` |
| `/admin/` | Catalogue admin (categories, subcategories, products) | signed-in admin / staff only | `admin/index.html`, `admin/src/` |

Visitors never download admin code or its CSS, and the admin's Tailwind reset never touches the public styles (Tailwind only scans `admin/`).
Without a valid login `/admin/` shows only the sign-in page and makes no catalogue request. The real protection is in the API: every create / edit / delete / upload route returns 401 without a token.

## Run (Windows PowerShell)
```powershell
# 1) backend (see backend README: npm run migrate:auth, npm run create-admin, JWT_SECRET in .env)
cd category-api ; npm start                      # http://localhost:3000

# 2) this project
cd ..\frontend
npm install
Copy-Item .env.example .env                      # optional; defaults work
npm run dev                                      # public: http://localhost:5173/   admin: http://localhost:5173/admin/
npm run build                                    # -> dist/  (also regenerates sitemap.xml / robots.txt)
npm run preview                                  # http://localhost:4173
```
In development Vite forwards `/api` and `/uploads` to `VITE_DEV_PROXY_TARGET` (default http://localhost:3000), so no CORS is needed.

## Shopper login (email + password)
- **Add to Cart** and **Buy Now** (shop lists, product page, the fixed bar on phones) need a login. A guest gets the Log in / Create account window; right after signing in the product is added (Buy Now continues to `/checkout`).
- New shoppers choose **Create an account** (name, email, password: 10+ characters with lower case, upper case, number and symbol). Returning shoppers log in with the same email and password. **Log out** (account page) clears the login, so the email and password are needed again.
- The login icon is in the menu (☰ then 👤). The token is kept in `localStorage` (`aakash-customer-token`) and sent as `Authorization: Bearer ...`; the API re-checks the account on every request.
- **Admin**: in the database run `UPDATE customer SET is_admin = 1 WHERE email = '...'`, then log in on the website with that email and password. The login answers `is_admin: true`, the website stores the admin token and opens `/admin/`. `/admin/` also has its own sign-in page that accepts the same email and password. Setting `is_admin` back to `0` closes the panel immediately. Signing out of the panel also signs the person out of the shop.

## Admin session
- Sign in at `/admin/` (or through the website login, see above); the JWT is kept in `localStorage` (`admin_token`) and sent as `Authorization: Bearer ...` on every API call.
- On load the token is checked with `GET /api/auth/me`; any 401 (expired, invalid, disabled account) clears it and returns to the sign-in page with a notice.
- **Sign out** (top right) clears the token. Staff accounts can create and edit but the API refuses delete (403, shown as an error toast).

## Configuration (`.env`, all optional)
| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | API base URL used by the admin app |
| `VITE_DEV_PROXY_TARGET` | `http://localhost:3000` | dev / preview proxy target |
| `VITE_MAX_IMAGE_MB` | `5` | image size check before upload (keep <= API `MAX_IMAGE_SIZE_MB`) |
| `VITE_CURRENCY` | `INR` | price formatting |
| `SITE_URL` (build-time env) | `https://aakashaquatech.in` | domain written into `sitemap.xml` / `robots.txt` |

## Deploying (static files + Node API)
Upload `dist/` to the static host. The public site needs "unknown path -> `/index.html`" (history routes); `/admin/` must be served as its own `admin/index.html`.
- **Netlify** (`public/_redirects`), **Apache** (`public/.htaccess`): real files win over the fallback, so `/admin/` works as is.
- **Vercel** (`vercel.json`): the rewrite already excludes `admin/`.
- **nginx**:
```nginx
location = /admin { return 301 /admin/; }
location /admin/  { try_files $uri $uri/ /admin/index.html; }
location /api/    { proxy_pass http://127.0.0.1:3000; }
location /uploads/{ proxy_pass http://127.0.0.1:3000; }
location /        { try_files $uri $uri/ /index.html; }
```
Serving the site and `/api` from one domain (as above) needs no CORS. If the API is on another domain, set `CORS_ORIGINS` in the backend `.env` and build with `VITE_API_BASE_URL=https://api.example.com/api`.

## Storefront features (live data + customer accounts)
The public site works in two modes, decided at start-up by `src/site.js`:
- **API reachable and the catalogue imported** - the database is the truth: prices, stock, hidden / new products, banners, testimonials, FAQs, zones, static pages, AMC plans come from `/api/public/*`.
- **API down or catalogue still empty** - the built-in data (`data.js` ...) keeps the site working exactly as before; checkout falls back to the WhatsApp order message.

| Feature | Where |
|---|---|
| "Book Your Free Demo" popup + contact form -> leads (terms checkbox, hidden spam field), floating WhatsApp button | `App.jsx`, `ContactPage.jsx` |
| Customer login by mobile OTP, saved addresses, orders, service requests | `Store.jsx` (`LoginModal`, `AccountPage`), `customer.js` |
| Cart: local for guests, merged into the server cart at login | `cartStore.js`, `customer.js`, `CartPage.jsx` |
| Checkout (`/checkout`): address, "Your order" table, **Pay by Razorpay** (UPI / cards / net banking) or Cash on delivery -> Place order -> Razorpay checkout -> signature verified by the API | `Store.jsx` (`CheckoutPage`) |
| Order page (`/order/:id`), invoice PDF, pay again, cancel | `Store.jsx` (`OrderPage`) |
| Service / AMC request form | `Store.jsx` (`ServiceRequestForm`), `ServicePage.jsx` |
Items that need a quote (price on request, price ranges, option / variant products) are never put in the online order; they keep the WhatsApp enquiry buttons.

Admin screens (`/admin/`): dashboard, categories / subcategories / products, catalogue menu settings (slug, order, show in menu), orders (status, tracking, refund, invoice), leads, service requests, banners, testimonials, brands, FAQs, zones, pages, blog, AMC plans.

## SEO and redirects
- `npm run build` runs `scripts/gen-seo.mjs` (sitemap.xml + robots.txt) and `scripts/gen-redirects.mjs` (301 map from the old WordPress URLs into `vercel.json`, `public/_redirects`, `deploy/nginx-redirects.conf`). Set `SITE_URL=https://yourdomain` and `SEO_API_URL=https://api.yourdomain/api` when building so products / posts added in the admin are in the sitemap too.
- Every route sets title, description, canonical, Open Graph and JSON-LD (`src/seo.js`). Images use `loading="lazy"`.
- After go-live, submit `/sitemap.xml` in Google Search Console and spot-check a few old URLs (they should answer 301 to the new page).

## Moving the built-in catalogue into the database
```powershell
npm run export:catalogue          # writes catalogue-export.json from src/data.js, sparesData.js, testimonials, FAQ, blog
cd ..\backend ; node scripts/import-data.js ..\frontend\catalogue-export.json --dry-run
node scripts/import-data.js ..\frontend\catalogue-export.json
```
Repeat any time: existing rows are skipped.

## Notes
- The public website content is still the static data in `src/data.js`, `blogData.js` etc. (unchanged). Connecting it to the catalogue API is the next step.
- Fixed one bug while merging: `src/BlogPage.jsx` imported `./blog`, which does not exist (the file is `blogData.js`), so `npm run build` failed.
- Admin app details (categories / subcategories / products screens) are unchanged; their code is in `admin/src/`.

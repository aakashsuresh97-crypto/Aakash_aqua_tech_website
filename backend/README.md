# Category CRUD API

Node.js + Express + MySQL (mysql2 with a connection pool and prepared statements).

## Structure
```
src/config/db.js            MySQL pool, credentials from .env
src/models/                 SQL queries
src/controllers/            request handlers
src/routes/                 route definitions
src/middleware/             validation, error handling, image upload (multer)
src/controllers/upload.controller.js  image upload / discard endpoints
src/config/upload.js        upload folder / size / allowed types
src/utils/uuid.js           UUID generation / validation
src/utils/imageFiles.js     URL building, safe file deletion, image signature check
uploads/categories/         uploaded images (served at /uploads/categories/<uuid>.<ext>)
sql/001_create_category_table.sql   CREATE TABLE IF NOT EXISTS (non-destructive)
scripts/migrate.js          applies sql/*.sql + the UUID conversion
scripts/cleanup-uploads.js  deletes unused upload files (npm run cleanup:uploads)
scripts/uuid-migration.js   numeric id -> UUID conversion (backup, map table, resumable)
postman/                    Postman collection
test/                       automated HTTP tests
```

## Run
```bash
npm install
cp .env.example .env        # then fill in your existing DB credentials
npm run migrate             # creates missing tables, converts numeric ids to UUIDs (keeps data), registers ids
npm run schema              # optional: inspect your real table structure
npm start                   # http://localhost:3000
npm test                    # automated tests (no DB needed)
```

## Endpoints
| Method | URL | Description |
|---|---|---|
| POST | /api/categories | Create |
| GET | /api/categories?page=&limit=&status=&search= | List all |
| GET | /api/categories/:id | Get one (`:id` is a UUID) |
| POST | /api/uploads/images | Upload an image file (multipart, field `image`) -> returns its URL |
| DELETE | /api/uploads/images/:filename | Discard an unattached upload |
| POST | /api/categories/lookup | Get one by `{"metaProdCateEnty": "<uuid>"}` |
| PUT/PATCH | /api/categories/:id | Update (any subset of fields) |
| DELETE | /api/categories/:id | Delete |

### UUID ids
Every category id is a UUID string, e.g. `36a8b30f-e1bc-4118-918d-b7834393e55f`.
- The API generates the id (random v4 UUID via `crypto.randomUUID`); a client-supplied `id` is ignored. The column is `CHAR(36)` (ascii) and the primary key.
- Ids are always **strings** in responses (`"id": "36a8b30f-..."`). `:id` in URLs must be a UUID (upper/lower case accepted, stored lower case); anything else returns `400`.
- Every issued id is recorded in `category_id_log` in the same transaction as the insert, so an id can never be reused, even after the category is deleted or the server restarts. A collision (practically impossible) is retried automatically.
- The list is ordered newest first by `created_at`.
- `npm run schema` prints your real `category` table structure and checks it is ready for UUIDs (read-only).

### Upgrading an existing database (numeric ids -> UUID)
`npm run migrate` does it automatically and **keeps all category data**:
1. copies the table to `category_backup_pre_uuid` (created once, never overwritten);
2. gives each existing category a new UUID, keeping `created_at` / `updated_at` untouched;
3. stores `old numeric id -> new UUID` in `category_id_legacy_map`;
4. replaces the `id` column with the UUID column (`CHAR(36)`, primary key);
5. keeps the old numeric registry as `category_id_log_legacy_int` and rebuilds `category_id_log` with UUIDs.

It is safe to run repeatedly (does nothing once converted), resumes if interrupted, and refuses to run (changing nothing) if another table has a foreign key to `category.id`. MySQL cannot roll back `ALTER TABLE`, so **take a dump anyway** (`mysqldump category_db > backup.sql`) before the first run. The old numeric ids stop working in URLs - update anything that stored them (the UI needs no change beyond this release). Once you have verified everything you may drop the three helper tables.

### metaProdCateEnty
`metaProdCateEnty` is the JSON field other records (e.g. a product) use to reference a category by its UUID:
```
POST /api/categories/lookup
{ "metaProdCateEnty": "a57fb27e-1f57-11ec-be13-30d16b5c82e9" }
```
Returns `200 { success, data: <category> }`, `404` if no category has that id, `400` if the value is missing or not a UUID (v1 and v4 formats are both accepted).

### Image upload (two steps: upload the file once, then save its URL)
Only the **file** is ever sent as `multipart/form-data`. Category requests carry the image as a normal JSON string, and MySQL stores only that URL string (`category.image` is `VARCHAR(255)`, never binary).

1. **Upload the file** - `POST /api/uploads/images`, multipart field `image`:
   ```
   201 { "success": true, "message": "Image uploaded successfully",
         "data": { "url": "http://localhost:3000/uploads/categories/<uuid>.png", "filename": "<uuid>.png", "size": 12345, "mimetype": "image/png" } }
   ```
   The file is validated (JPG/PNG/WEBP/GIF, max `MAX_IMAGE_SIZE_MB`, magic bytes checked), saved under a random UUID name and served from `/uploads/categories/`. Nothing is written to the database yet.
2. **Save the URL** - normal JSON, `image` is a string:
   ```
   POST /api/categories      { "category_name": "Water Purifiers", "image": "http://localhost:3000/uploads/categories/<uuid>.png" }
   PUT  /api/categories/:id  { "image": "http://localhost:3000/uploads/categories/<new-uuid>.png" }
   ```
   `GET /api/categories` and `GET /api/categories/:id` return that same URL string in `image`.

- **Change** an image: upload the new file, then PUT its URL. The previous file is deleted from disk (unless another category still uses it).
- **Remove** an image: PUT `{"image": null}`. The file is deleted and the column set to NULL. Deleting a category also deletes its image file.
- **Discard an upload that was never attached** (e.g. form cancelled): `DELETE /api/uploads/images/:filename` (refused with 409 if a category uses it). Leftovers from closed browser tabs can be removed with `npm run cleanup:uploads` (`-- --dry-run` to preview, `-- --hours=48` to change the 24 h grace period); run it from cron if you like.
- Plain external `image` URLs (legacy / other hosts) still work and are never deleted from disk. Inline `data:` image data is rejected.
- Errors: `400` wrong type / not a real image / wrong field name / no file, `413` too large - each with an `errors` array. A failed upload leaves no file behind.
- Backward compatibility: `POST/PUT/PATCH /api/categories` still accept a multipart request that contains the file directly (older clients). The UI no longer uses it.
- Security: random UUID file names (client name is ignored), mime type **and** magic bytes checked, SVG not accepted, served with `nosniff`.
- Config (`.env`): `PUBLIC_BASE_URL` (used in the saved URL, set it in production), `UPLOAD_DIR`, `MAX_IMAGE_SIZE_MB`. Back up / persist `UPLOAD_DIR` along with your database.
- Want Cloudinary/S3 instead? Only `controllers/upload.controller.js` + `utils/imageFiles.js` + `middleware/upload.js` need to change; the column, category routes and UI stay the same.

Body fields: `category_name` (required on create, 2-100 chars, unique), `description`, `image` (URL/path), `status` (1/0, true/false, "active"/"inactive"; default 1).

Responses: `{ success, message?, data?, errors?, meta? }`. Status codes: 200, 201, 400 (validation), 404, 409 (duplicate name), 503 (DB down), 500.

## Admin login (JWT) - added in migration 008
Every create / edit / delete / upload route now needs an admin token. Public reads (lists, details, `POST /categories/lookup`, add-to-cart / buy-now checks) stay open, so the storefront needs no login.

### First-time setup (PowerShell)
```powershell
npm install                       # adds bcryptjs, jsonwebtoken, express-rate-limit, cors
# 1. add JWT_SECRET to .env (see .env.example) - generate one:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm run migrate:auth              # creates the admin_user table (safe to repeat, never drops data)
npm run create-admin              # asks for email, name and password (password is not echoed)
npm start
```

### Auth endpoints
| Method | URL | Auth | Description |
|---|---|---|---|
| POST | /api/auth/login | - (rate limited: `AUTH_LOGIN_MAX_ATTEMPTS` per IP / 15 min) | `{ "email", "password" }` -> `{ data: { token, user } }` |
| GET | /api/auth/me | Bearer | Current user; 401 if the token is bad or the account is disabled |

Send the token as `Authorization: Bearer <token>`. Tokens are HS256 JWTs (`aud: admin`, so a future customer token cannot be used here) and expire after `JWT_EXPIRES_IN` (default 8h). Errors use the usual shape: `401` not signed in / expired, `403` signed in but not allowed, `429` too many logins.

### Roles
| Role | Create / edit / upload | Delete |
|---|---|---|
| admin | yes | yes |
| staff | yes | no (403) |

### Protected routes
`POST/PUT/PATCH` on `/api/categories`, `/api/subcategories`, `/api/v1/products`; `DELETE` on the same (admin only); `POST/DELETE /api/uploads/images`.

### New environment variables
`JWT_SECRET` (required, >= 32 chars), `JWT_EXPIRES_IN`, `AUTH_LOGIN_MAX_ATTEMPTS`, `CORS_ORIGINS`, `TRUST_PROXY`, optional `BCRYPT_ROUNDS` (default 12). A disabled account (`status = 0`) cannot log in, and an already-issued token stops working in the admin app on its next page load (`/auth/me`); the API itself accepts a token until it expires.

### Tests
`npm test` - includes `test/auth.api.test.js` (login, bad/expired/forged tokens, every write route returns 401 without a token, staff vs admin, CORS, rate limit). The existing tests send an admin token (`test/helpers/auth.js`) and their assertions are unchanged.

## Customer accounts: register / login with email + password, admin by flag (migration `npm run migrate:customer-auth`)
Shoppers register once with **name + email + password** and log in with the same email and password. **Add to Cart** and **Buy Now** on the website need that login.
Customers and admins share the `customer` table; the column `customer.is_admin` (0 = customer, 1 = admin) decides who can open the admin panel.

```powershell
npm run migrate:customer-auth     # (also part of migrate:all) adds email/password/is_admin/lockout columns to `customer`; safe to repeat
```

| Method | URL | Auth | Description |
|---|---|---|---|
| POST | /api/customer/auth/register | - | `{ name, email, password }` -> `201 { data: { token, customer, is_admin:false } }` (signed in at once). Unknown fields such as `is_admin` / `role` -> 400. Duplicate email -> 409 |
| POST | /api/customer/auth/login | - | `{ email, password }` -> `{ data: { token, customer, is_admin, redirect_to, admin? } }`. For an admin (`is_admin = 1`) `redirect_to` is `/admin/` and `admin: { token, user }` is the admin panel's token |
| POST | /api/customer/auth/logout | - | always 200 (the browser deletes its tokens) |
| GET | /api/customer/me | customer token | profile (`{ id, name, email, mobile, is_admin }`) |
| PATCH | /api/customer/me | customer token | `{ name, mobile }` (the email is the login id and cannot be changed) |
| POST | /api/auth/login | - | the admin panel's own sign-in page: accepts an `is_admin = 1` customer account, or an account made with `npm run create-admin` |

**Passwords**: bcrypt; at least 10 characters with a lower case letter, an upper case letter, a digit and a symbol; at most 72 bytes. Wrong password and unknown email give the same `401 Invalid email or password`. 5 wrong passwords lock the account for 15 minutes (`423`); per-IP limits apply on top (failed logins only).
**Tokens** are sent as `Authorization: Bearer ...` (customer token: 30 days; admin token: 8 hours). Every request re-checks the account in the database: a disabled customer is refused at once, and an admin whose `is_admin` is set back to `0` loses access on the very next request.

### Making someone an admin
1. The person registers on the website like everybody else (nothing in the API can create an admin).
2. In MySQL Workbench / the mysql prompt: `UPDATE customer SET is_admin = 1 WHERE email = 'owner@example.com';`
3. On the website the person opens the account icon, logs in with that email and password, and lands in the admin panel (`/admin/`). `UPDATE customer SET is_admin = 0 ...` removes the access again.

The old mobile-OTP endpoints (`/api/customer/auth/request-otp`, `verify-otp`) were removed. The `otp_request` table is left in the database untouched; drop it when you like. Existing OTP customers have no password, so they register once with their email (their orders stay with the old row).

## Storefront, customers, orders and payments (migrations 009 - 016)
All additive: new tables only (`CREATE TABLE IF NOT EXISTS`), nothing existing is altered or dropped; safe to run again.

### Set-up (PowerShell)
```powershell
npm install                       # adds sanitize-html, nodemailer, pdfkit
npm run migrate:site              # applies sql/009 ... 016 (banners, leads, content, blog, catalogue extras, customers, orders, service)
npm run migrate:customer-auth     # email + password login for customers, is_admin flag (see the section above)
# fill the new variables in .env (see .env.example: RAZORPAY_*, SMS_PROVIDER, COMPANY_*, NOTIFY_*)
npm start
# one-off: load the website's current catalogue + content (frontend: npm run export:catalogue  creates catalogue-export.json)
node scripts/import-data.js ..\frontend\catalogue-export.json --dry-run    # shows what would happen
node scripts/import-data.js ..\frontend\catalogue-export.json              # idempotent: matched by slug, existing rows are skipped
```
`npm run migrate:all` runs every migration in order. `import-data.js --update` refreshes names / images / descriptions of existing products (never prices or stock).
Imported fixed-price products are sellable online with **stock not tracked** until you enter quantities in the admin; "price on request", price-range and option products are imported as enquiry-only (WhatsApp / demo buttons).

### Public endpoints (no login) - `/api/public`
| Method | URL | Notes |
|---|---|---|
| GET | `/catalog` | categories -> subcategories (slug, order, show-in-menu) + brands |
| GET | `/products` | filters `category`, `subcategory`, `brand`, `min_price`, `max_price`, `stock=in`, `search`, `sort` (`price_asc/price_desc/newest/name`), `page`, `limit`, `include=extra` |
| GET | `/products/:slug` | detail + related products |
| GET | `/search?q=` | products + subcategories |
| GET | `/banners` `/testimonials` `/brands` `/faqs?topic=` `/zones` `/amc-plans` | active rows only (banners respect start / end dates) |
| GET | `/pages/:slug`, `/blog`, `/blog/:slug` | only active pages and published posts |
| POST | `/leads` | "Book your free demo" popup (honeypot field `company_website`, rate limited) |
| POST | `/contact` | contact form -> lead with source `contact` |
| POST | `/service-requests` | service / AMC request |

### Customer endpoints - `/api/customer` (customer JWT, separate audience from the admin token)
| Method | URL | Notes |
|---|---|---|
| POST | `/auth/register` `{name, email, password}` | creates a customer and signs in (see the section above) |
| POST | `/auth/login` `{email, password}` | returns `{token, customer, is_admin, redirect_to, admin?}` |
| GET / PATCH | `/me` | name, mobile (email is read-only) |
| GET / POST / PUT / PATCH / DELETE | `/addresses` | up to 10, one default |
| GET / POST / PATCH / DELETE | `/cart`, `/cart/items`, `/cart/items/:productId`, `/cart/merge` | server-side cart, always priced from the database |
| POST | `/orders` `{payment_method: razorpay\|cod, address_id \| address, items?, notes?}` | transactional stock reduction; returns the order and (Razorpay) the checkout parameters |
| GET | `/orders`, `/orders/:id`, `/orders/:id/invoice` | invoice PDF once the order is confirmed |
| POST | `/orders/:id/cancel` | placed / confirmed only; stock returned; paid online orders are refunded |
| GET / POST | `/orders/:id/payment`, `/payment/verify`, `/payment/failed` | (re)open Razorpay, verify the signature |
| GET | `/service-requests` | the customer's own |

### Admin endpoints (admin JWT; staff can create/edit, only admin can delete / refund)
`/api/banners`, `/testimonials`, `/brands`, `/faqs`, `/zones`, `/pages`, `/blog-posts`, `/amc-plans` (list, get, create, PUT/PATCH, delete) - `/api/leads`, `/api/service-requests` (filters, status, notes) - `/api/orders` (list, get, `PATCH /:id/status`, `POST /:id/refund` (admin only), `GET /:id/invoice`) - `/api/catalog-nodes` (slug, menu order and visibility of categories / subcategories) - `/api/dashboard/summary`.
Webhook: `POST /api/webhooks/razorpay` (signature checked against the raw body; repeated event ids are ignored).

### How orders work
- Status flow: `placed -> confirmed -> shipped -> delivered`, `cancelled` from placed / confirmed. Skipping a step returns 409.
- Online order: created `placed / pending`, stock is held, Razorpay order created. Paid (browser verify **or** webhook, whichever comes first - idempotent) -> `confirmed` automatically and the invoice number is issued. Unpaid for `ORDER_PAYMENT_WINDOW_MIN` -> cancelled, stock released. Money arriving for an already-cancelled order is refunded automatically.
- COD: stays `placed` until you confirm it in the admin (invoice is issued then); marked paid on `delivered`.
- Money is calculated in paise; prices are GST-inclusive and split into taxable value + GST (CGST/SGST when the ship-to state equals `COMPANY_STATE`, otherwise IGST). Order numbers `AQ2627-000001`, invoice numbers `AQ/2026-27/00001` (financial year, gap-free sequence).
- Notifications (new lead, order, payment, service request): webhook, e-mail and/or server log - see `NOTIFY_*` / `SMTP_*`.

### Tests
`npm test` runs everything that needs no database. `RUN_DB_TESTS=1 npm test` also runs the integration tests against the MySQL in `.env` (they create and delete their own rows, tagged with a random id): content, public catalogue, leads, register / login / lockout / admin flag, cart, COD / Razorpay checkout (a fake gateway stands in for Razorpay), stock race, refunds, invoices, webhook, import.
The tests assume Node and MySQL use the same time zone (the helper pins Node to UTC; set `TZ_FOR_TESTS` to override).

## Postman
Import `postman/category-crud.postman_collection.json`, then run the collection (Runner). Request 1 checks the id is a UUID and stores it in `{{categoryId}}`; requests 4-7 use it.

## Integrating into an existing Express app
Copy `src/models/category.model.js`, `src/controllers/category.controller.js`, `src/routes/category.routes.js`, `src/middleware/validate.js`, `src/utils/ApiError.js` and mount:
```js
app.use('/api/categories', require('./routes/category.routes'));
```
Point `require('../config/db')` in the model at your existing mysql2 pool if you already have one. Keep `errorHandler.js` (or merge the MySQL error mapping into yours).

# Deploying the API (production)

## 1. Server and database
- Node 20+ (22 recommended) and MySQL 8 (or MariaDB 10.6+). Create a database user with rights on the one database only.
- `npm ci --omit=dev`, then `npm run migrate:all` (safe to repeat on every release), `npm run create-admin` once.

## 2. `.env` for production (never commit it)
```
NODE_ENV=production
PORT=3000
DB_HOST=...  DB_USER=...  DB_PASSWORD=...  DB_NAME=...
JWT_SECRET=<48+ random bytes: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
CORS_ORIGINS=https://aakashaquatech.in,https://www.aakashaquatech.in     # the website origins
PUBLIC_BASE_URL=https://api.aakashaquatech.in                              # used to build image URLs
UPLOAD_DIR=/var/data/aakash-uploads                                        # a persistent disk
TRUST_PROXY=1                                                              # behind nginx / a load balancer
RAZORPAY_KEY_ID=rzp_live_...  RAZORPAY_KEY_SECRET=...  RAZORPAY_WEBHOOK_SECRET=...
COMPANY_GSTIN=<your GSTIN>  COMPANY_STATE=Tamil Nadu
NOTIFY_EMAIL_TO=... SMTP_HOST=... SMTP_USER=... SMTP_PASS=...  (and/or NOTIFY_WEBHOOK_URL)
```
The server refuses to start without `JWT_SECRET`. Customers log in with email + password (no SMS needed). To make an admin: have them register on the website, then `UPDATE customer SET is_admin = 1 WHERE email = '...';`.

## 3. Run it
```
npm i -g pm2
pm2 start src/server.js --name aakash-api
pm2 save && pm2 startup
```
nginx (HTTPS with Let's Encrypt):
```nginx
server {
  server_name api.aakashaquatech.in;
  client_max_body_size 8m;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host;
               proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
}
```
If the website and API share one domain, proxy `/api/` and `/uploads/` to the API from the website's nginx instead (then `CORS_ORIGINS` can stay empty).
Check: `https://api.../health` returns `{"success":true}`.

## 4. Razorpay
1. Dashboard -> Settings -> API Keys: generate **live** keys after KYC; put them in `.env`.
2. Dashboard -> Settings -> Webhooks -> add `https://api.aakashaquatech.in/api/webhooks/razorpay`, choose a secret (= `RAZORPAY_WEBHOOK_SECRET`), events: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`.
3. Test once in test mode (`rzp_test_` keys, test UPI/cards) before switching to live keys.

## 5. Backups (do this before go-live)
Database - daily, keep 14 days (cron):
```
0 2 * * * mysqldump --single-transaction --routines -u USER -pPASS DBNAME | gzip > /backups/aakash-$(date +\%F).sql.gz && find /backups -name 'aakash-*.sql.gz' -mtime +14 -delete
```
Uploads - the images the admin uploads live in `UPLOAD_DIR`; copy them nightly (`rsync -a /var/data/aakash-uploads/ /backups/uploads/`) and keep a copy off the server (another machine or object storage).
Restore test: restore the latest dump into a scratch database once a month and open the admin against it.
`npm run cleanup:uploads` lists upload files no row refers to (dry run by default).

## 6. Release routine
`git pull && npm ci --omit=dev && npm run migrate:all && pm2 restart aakash-api`. Migrations only ever add; take a backup first anyway.

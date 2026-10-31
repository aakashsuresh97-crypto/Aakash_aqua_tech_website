const express = require('express');
const cors = require('cors');
const { CORS_ORIGINS } = require('./config/auth');
const authRoutes = require('./routes/auth.routes');
const siteRoutes = require('./routes/site.routes');
const customerRoutes = require('./routes/customer.routes');
const orderRoutes = require('./routes/order.routes');
const { razorpayWebhook } = require('./controllers/webhook.controller');
const { UPLOAD_ROOT } = require('./config/upload');
const categoryRoutes = require('./routes/category.routes');
const uploadRoutes = require('./routes/upload.routes');
const subcategoryRoutes = require('./routes/subcategory.routes');
const productRoutes = require('./routes/product.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { clearCatalogCache } = require('./controllers/public.controller');

const app = express();
// Development: no ETag, so the browser has nothing to revalidate and never gets a 304 (production keeps ETags).
if (process.env.NODE_ENV !== 'production') app.set('etag', false);
// Browsers on another origin (e.g. the admin app on a different domain) need CORS; same-origin / dev-proxy calls do not.
if (CORS_ORIGINS.length) app.use(cors({ origin: CORS_ORIGINS, allowedHeaders: ['Content-Type', 'Authorization'], methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.set('trust proxy', Number(process.env.TRUST_PROXY) || 0); // set TRUST_PROXY=1 behind nginx/a host proxy so rate limits see the real IP
// the raw body is kept for the Razorpay webhook: its signature is calculated over the exact bytes that were sent
app.use(express.json({ limit: '100kb', verify: (req, res, buf) => { if (req.originalUrl.startsWith('/api/webhooks/')) req.rawBody = buf; } }));

app.get('/health', (req, res) => res.json({ success: true, message: 'OK' }));
// Uploaded images are served publicly from /uploads/... (file names are random UUIDs).
app.use('/uploads', express.static(UPLOAD_ROOT, {
  index: false,
  dotfiles: 'deny',
  maxAge: '30d',
  immutable: true,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // allow <img> from the UI on another origin/port
  },
}));

// Any write (POST / PUT / PATCH / DELETE) may change categories, products or brands: forget the cached public catalogue once it is done.
app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) res.on('finish', clearCatalogCache);
  next();
});

app.use('/api/auth', authRoutes);
app.post('/api/webhooks/razorpay', razorpayWebhook);
app.use('/api/public', siteRoutes.public);
app.use('/api/customer', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api', siteRoutes.admin);
app.use('/api', subcategoryRoutes); // /api/subcategories and /api/categories/:categoryId/subcategories
app.use('/api/v1/products', productRoutes); // product create / get / page / add-to-cart / buy-now

app.use(notFound);
app.use(errorHandler);

module.exports = app;
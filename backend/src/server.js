require('dotenv').config();
const app = require('./app');
const { pool, testConnection } = require('./config/db');

const PORT = Number(process.env.PORT) || 3000;

(async () => {
  try {
    await testConnection();
    console.log(`MySQL connected: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
  } catch (err) {
    console.error('Could not connect to MySQL:', err.message);
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && !Number(process.env.TRUST_PROXY)) {
    // Behind nginx / Vercel / a load balancer every visitor then looks like the same IP, so the rate limits would block real customers.
    console.warn('WARNING: NODE_ENV=production but TRUST_PROXY is not set. If this API runs behind a proxy, set TRUST_PROXY=1 in .env.');
  }

  const server = app.listen(PORT, () => console.log(`Category API running on http://localhost:${PORT}`));

  // release stock held by online orders that were never paid (every 5 minutes)
  const { expireUnpaidOrders } = require('./services/orderService');
  const expiry = setInterval(() => expireUnpaidOrders().catch((e) => console.error('Order expiry failed:', e.message)), 5 * 60 * 1000);
  expiry.unref();

  const shutdown = () => server.close(async () => { await pool.end(); process.exit(0); });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();

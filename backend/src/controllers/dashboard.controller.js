const { pool } = require('../config/db');

// GET /api/dashboard/summary - counts for the admin home screen ("today" = the database server's current date)
exports.summary = async (req, res, next) => {
  try {
    const one = async (sql) => Number((await pool.execute(sql))[0][0].n);
    const [today_leads, new_leads, today_orders, pending_orders, today_service_requests, open_service_requests, low_stock_products, out_of_stock_products] = await Promise.all([
      one(`SELECT COUNT(*) AS n FROM leads WHERE created_at >= CURDATE() AND status <> 'spam'`),
      one(`SELECT COUNT(*) AS n FROM leads WHERE status = 'new'`),
      one(`SELECT COUNT(*) AS n FROM orders WHERE placed_at >= CURDATE()`),
      one(`SELECT COUNT(*) AS n FROM orders WHERE status = 'placed' AND (payment_method = 'cod' OR payment_status = 'paid')`),
      one(`SELECT COUNT(*) AS n FROM service_request WHERE created_at >= CURDATE()`),
      one(`SELECT COUNT(*) AS n FROM service_request WHERE status IN ('new','assigned','in_progress')`),
      one(`SELECT COUNT(*) AS n FROM product WHERE publish_status = 'published' AND manage_stock = 1 AND stock_quantity > 0 AND low_stock_threshold IS NOT NULL AND stock_quantity <= low_stock_threshold`),
      one(`SELECT COUNT(*) AS n FROM product WHERE publish_status = 'published' AND stock_status = 'outofstock'`),
    ]);
    const [[rev]] = await pool.execute(`SELECT COALESCE(SUM(total - refund_amount), 0) AS v FROM orders WHERE placed_at >= CURDATE() AND payment_status IN ('paid','partially_refunded')`);
    const [byStatus] = await pool.execute('SELECT status, COUNT(*) AS n FROM orders GROUP BY status');
    const [low] = await pool.execute(`SELECT id, product_name, sku, stock_quantity, low_stock_threshold FROM product WHERE publish_status = 'published' AND manage_stock = 1 AND low_stock_threshold IS NOT NULL AND stock_quantity <= low_stock_threshold ORDER BY stock_quantity ASC LIMIT 10`);
    res.json({ success: true, data: {
      today_leads, new_leads, today_orders, pending_orders, today_revenue: Number(rev.v), today_service_requests, open_service_requests, low_stock_products, out_of_stock_products,
      orders_by_status: Object.fromEntries(byStatus.map((r) => [r.status, Number(r.n)])), low_stock_list: low,
    } });
  } catch (err) { next(err); }
};

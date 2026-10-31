// Customer register / login (email + password), admin flag, cart, checkout, Razorpay, COD, refunds, invoices against a real MySQL.
//   RUN_DB_TESTS=1 npm test
const test = require('node:test');
const assert = require('node:assert');

if (process.env.RUN_DB_TESTS !== '1') {
  test('orders DB tests (skipped: set RUN_DB_TESTS=1)', { skip: true }, () => {});
} else {
  const h = require('./helpers/site');
  const { api, admin, staff, TAG, gateway, ADDRESS } = h;
  const ids = { cat: null, sub: null, products: [], customers: [] };
  let cat; let sub;

  const mkProduct = async (over = {}) => {
    const r = await api('POST', '/api/v1/products', { headers: admin, body: {
      category_id: cat, subcategory_id: sub, product_name: `Ord ${TAG} ${Math.random().toString(36).slice(2, 6)}`,
      mrp: 12000, selling_price: 11800, gst_percent: 18, stock_quantity: 10, ...over } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    ids.products.push(r.body.data.id);
    return r.body.data;
  };
  const customer = async () => { const c = await h.loginCustomer(); ids.customers.push(c.id); return c; };
  const stockOf = async (id) => Number((await h.pool.execute('SELECT stock_quantity AS s FROM product WHERE id = ?', [id]))[0][0].s);
  const buyNow = (c, items, method = 'razorpay', extra = {}) => api('POST', '/api/customer/orders', { headers: c.headers, body: { payment_method: method, address: ADDRESS, items, ...extra } });
  const payOnline = async (c, order, pid = h.payId()) => {
    const oid = order.razorpay_order_id || (await api('GET', `/api/orders/${order.id}`, { headers: admin })).body.data.razorpay_order_id;
    return api('POST', `/api/customer/orders/${order.id}/payment/verify`, { headers: c.headers, body: { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: h.sign(oid, pid) } });
  };

  test.before(async () => {
    await h.start();
    const c = await api('POST', '/api/categories', { headers: admin, body: { category_name: `OrdCat ${TAG}` } });
    cat = c.body.data.id;
    const s = await api('POST', '/api/subcategories', { headers: admin, body: { category_id: cat, subcategory_name: `OrdSub ${TAG}` } });
    sub = s.body.data.id;
  });
  test.after(async () => {
    const q = (sql, p) => h.pool.query(sql, p).catch(() => {});
    if (ids.customers.length) {
      await q('DELETE FROM refund WHERE order_id IN (SELECT id FROM orders WHERE customer_id IN (?))', [ids.customers]);
      await q('DELETE FROM payment WHERE order_id IN (SELECT id FROM orders WHERE customer_id IN (?))', [ids.customers]);
      await q('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_id IN (?))', [ids.customers]);
      await q('DELETE FROM orders WHERE customer_id IN (?)', [ids.customers]);
      await q('DELETE FROM customer WHERE id IN (?)', [ids.customers]);
    }
    if (ids.products.length) await q('DELETE FROM product WHERE id IN (?)', [ids.products]);
    await api('DELETE', `/api/subcategories/${sub}`, { headers: admin });
    await api('DELETE', `/api/categories/${cat}`, { headers: admin });
    await h.stop();
  });

  // ------------------------------------------------------------ email + password login
  test('register: creates a customer (never an admin), signs in, rejects weak passwords, extra fields and duplicate emails', async () => {
    const email = h.newEmail();
    const ok0 = { name: 'Asha Kumar', email, password: h.PASSWORD };
    for (const [bad, why] of [
      [{ ...ok0, password: 'short1!A' }, 'too short'], [{ ...ok0, password: 'alllowercase1!' }, 'no upper case'], [{ ...ok0, password: 'NoDigitsHere!!' }, 'no digit'],
      [{ ...ok0, password: 'NoSymbols12345' }, 'no symbol'], [{ ...ok0, password: 'Aa1!' + 'x'.repeat(80) }, 'over 72 bytes'], [{ ...ok0, email: 'not-an-email' }, 'bad email'],
      [{ ...ok0, name: 'A' }, 'short name'], [{}, 'empty'],
    ]) assert.equal((await api('POST', '/api/customer/auth/register', { body: bad })).status, 400, why);
    for (const extra of [{ is_admin: 1 }, { isAdmin: true }, { role: 'admin' }, { status: 1 }]) {
      const r = await api('POST', '/api/customer/auth/register', { body: { ...ok0, ...extra } });
      assert.equal(r.status, 400, `unknown field ${Object.keys(extra)[0]} is refused`);
    }
    assert.equal((await h.pool.execute('SELECT COUNT(*) AS n FROM customer WHERE email = ?', [email]))[0][0].n, 0, 'nothing was created by the failed attempts');

    const r = await api('POST', '/api/customer/auth/register', { body: { ...ok0, email: email.toUpperCase() } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    ids.customers.push(r.body.data.customer.id);
    assert.equal(r.body.data.customer.email, email, 'stored in lower case');
    assert.equal(r.body.data.is_admin, false);
    assert.equal(r.body.data.admin, undefined, 'a customer never receives an admin token');
    assert.ok(!JSON.stringify(r.body).includes('password'), 'no hash or password in the response');
    const [[row]] = await h.pool.execute('SELECT password_hash, is_admin FROM customer WHERE email = ?', [email]);
    assert.match(row.password_hash, /^\$2[aby]\$/, 'bcrypt hash, not the password');
    assert.equal(Number(row.is_admin), 0);
    const me = await api('GET', '/api/customer/me', { headers: { Authorization: `Bearer ${r.body.data.token}` } });
    assert.equal(me.status, 200);
    assert.equal(me.body.data.email, email);
    const dup = await api('POST', '/api/customer/auth/register', { body: ok0 });
    assert.equal(dup.status, 409);
    assert.match(dup.body.message, /already exists/i);
  });

  test('login: right password signs in (any e-mail case), wrong password / unknown e-mail give the same 401', async () => {
    const c = await customer();
    const ok = await api('POST', '/api/customer/auth/login', { body: { email: c.email.toUpperCase(), password: c.password } });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.customer.id, c.id);
    assert.equal(ok.body.data.redirect_to, null, 'customers stay on the website');
    assert.equal((await api('GET', '/api/customer/me', { headers: { Authorization: `Bearer ${ok.body.data.token}` } })).status, 200);
    const wrong = await api('POST', '/api/customer/auth/login', { body: { email: c.email, password: 'Wr0ng!Passw0rd' } });
    const unknown = await api('POST', '/api/customer/auth/login', { body: { email: h.newEmail(), password: 'Wr0ng!Passw0rd' } });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.message, unknown.body.message, 'same message: cannot tell which e-mails have an account');
    assert.equal((await api('POST', '/api/customer/auth/login', { body: { email: c.email } })).status, 400);
    assert.equal((await api('POST', '/api/customer/auth/login', { body: { email: { $ne: '' }, password: { $ne: '' } } })).status, 400, 'objects instead of strings');
    assert.equal((await api('POST', '/api/customer/auth/login', { body: { email: "' OR 1=1 --", password: 'x' } })).status, 400);
    assert.equal((await api('POST', '/api/customer/auth/logout')).status, 200);
  });

  test('login: five wrong passwords lock the account (423) even for the right password; a disabled account cannot sign in or keep shopping', async () => {
    const c = await customer();
    for (let i = 0; i < 5; i += 1) assert.equal((await api('POST', '/api/customer/auth/login', { body: { email: c.email, password: 'Wr0ng!Passw0rd' } })).status, 401);
    const locked = await api('POST', '/api/customer/auth/login', { body: { email: c.email, password: c.password } });
    assert.equal(locked.status, 423, 'locked even with the correct password');
    await h.pool.execute('UPDATE customer SET locked_until = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) WHERE id = ?', [c.id]);
    assert.equal((await api('POST', '/api/customer/auth/login', { body: { email: c.email, password: c.password } })).status, 200, 'lock expires');
    assert.equal(Number((await h.pool.execute('SELECT failed_login_attempts AS n FROM customer WHERE id = ?', [c.id]))[0][0].n), 0, 'counter resets after a good login');

    const d = await customer();
    await h.pool.execute('UPDATE customer SET status = 0 WHERE id = ?', [d.id]);
    assert.equal((await api('POST', '/api/customer/auth/login', { body: { email: d.email, password: d.password } })).status, 403);
    assert.equal((await api('GET', '/api/customer/cart', { headers: d.headers })).status, 401, 'an already-issued token stops working too');
  });

  test('admin: is_admin = 1 (set by hand) opens the admin panel through the normal login; setting it back to 0 closes it at once', async () => {
    const c = await customer();
    const asCustomer = await api('POST', '/api/customer/auth/login', { body: { email: c.email, password: c.password } });
    assert.equal(asCustomer.body.data.is_admin, false);
    assert.equal((await api('POST', '/api/auth/login', { body: { email: c.email, password: c.password } })).status, 403, 'admin sign-in refuses a customer');
    assert.equal((await api('GET', '/api/auth/me', { headers: c.headers })).status, 401, 'customer token is not an admin token');

    await h.pool.execute('UPDATE customer SET is_admin = 1 WHERE id = ?', [c.id]);
    const login = await api('POST', '/api/customer/auth/login', { body: { email: c.email, password: c.password } });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.is_admin, true);
    assert.equal(login.body.data.redirect_to, '/admin/');
    const at = { Authorization: `Bearer ${login.body.data.admin.token}` };
    assert.equal(login.body.data.admin.user.role, 'admin');
    assert.equal((await api('GET', '/api/auth/me', { headers: at })).body.data.email, c.email);
    assert.equal((await api('GET', '/api/orders', { headers: at })).status, 200, 'admin API works');
    const panel = await api('POST', '/api/auth/login', { body: { email: c.email, password: c.password } });
    assert.equal(panel.status, 200, 'the /admin/ sign-in page accepts the same e-mail and password');
    assert.equal((await api('GET', '/api/orders', { headers: { Authorization: `Bearer ${panel.body.data.token}` } })).status, 200);
    assert.equal((await api('POST', '/api/auth/login', { body: { email: c.email, password: 'Wr0ng!Passw0rd' } })).status, 401);

    await h.pool.execute('UPDATE customer SET is_admin = 0 WHERE id = ?', [c.id]);
    assert.equal((await api('GET', '/api/orders', { headers: at })).status, 401, 'demoted: the open admin session stops at once');
    assert.equal((await api('GET', '/api/auth/me', { headers: at })).status, 401);
    assert.equal((await api('GET', '/api/customer/me', { headers: c.headers })).status, 200, 'still a normal customer');
  });

  test('customer token and admin token are not interchangeable', async () => {
    const c = await customer();
    assert.equal((await api('GET', '/api/customer/me', { headers: admin })).status, 401, 'admin token is not a customer');
    assert.equal((await api('GET', '/api/orders', { headers: c.headers })).status, 401, 'customer token is not an admin');
    assert.equal((await api('GET', '/api/customer/me')).status, 401);
  });

  test('profile and addresses: update, first is default, switch default, validation, ownership, limit', async () => {
    const c = await customer(); const other = await customer();
    assert.equal((await api('PATCH', '/api/customer/me', { headers: c.headers, body: { name: 'Asha K', mobile: '+91 98765 43210' } })).body.data.mobile, '9876543210');
    assert.equal((await api('PATCH', '/api/customer/me', { headers: c.headers, body: { mobile: '123' } })).status, 400);
    const same = await api('PATCH', '/api/customer/me', { headers: c.headers, body: { email: 'someone@else.com', is_admin: 1 } });
    assert.equal(same.status, 400, 'the login e-mail and is_admin cannot be changed from the profile');
    const a1 = await api('POST', '/api/customer/addresses', { headers: c.headers, body: ADDRESS });
    assert.equal(a1.status, 201);
    assert.equal(a1.body.data.is_default, 1, 'the first address becomes the default');
    const a2 = await api('POST', '/api/customer/addresses', { headers: c.headers, body: { ...ADDRESS, line1: '2nd', is_default: true } });
    const list = (await api('GET', '/api/customer/addresses', { headers: c.headers })).body.data;
    assert.equal(list.length, 2);
    assert.equal(list[0].id, a2.body.data.id);
    assert.equal(list.filter((a) => a.is_default).length, 1);
    assert.equal((await api('POST', '/api/customer/addresses', { headers: c.headers, body: { ...ADDRESS, pin_code: '12' } })).status, 400);
    assert.equal((await api('PATCH', `/api/customer/addresses/${a1.body.data.id}`, { headers: other.headers, body: { city: 'X' } })).status, 404, 'not yours');
    assert.equal((await api('DELETE', `/api/customer/addresses/${a1.body.data.id}`, { headers: other.headers })).status, 404);
    assert.equal((await api('DELETE', `/api/customer/addresses/${a2.body.data.id}`, { headers: c.headers })).status, 200);
    assert.equal((await api('GET', '/api/customer/addresses', { headers: c.headers })).body.data[0].is_default, 1, 'default moves to the remaining one');
    for (let i = 0; i < 9; i += 1) await api('POST', '/api/customer/addresses', { headers: c.headers, body: ADDRESS });
    assert.equal((await api('POST', '/api/customer/addresses', { headers: c.headers, body: ADDRESS })).status, 409, 'max 10');
  });

  // ------------------------------------------------------------ cart
  test('cart: add, merge guest items, limits by stock, prices come from the database', async () => {
    const c = await customer();
    const p1 = await mkProduct({ selling_price: 1000, mrp: 1500, stock_quantity: 3 });
    const p2 = await mkProduct({ selling_price: 2000, stock_quantity: 0 });
    const a = await api('POST', '/api/customer/cart/items', { headers: c.headers, body: { product_id: p1.id, quantity: 2, unit_price: 1 } });
    assert.equal(a.status, 201);
    assert.equal(a.body.data.summary.total, 2000, 'a client-sent price is ignored');
    assert.equal((await api('POST', '/api/customer/cart/items', { headers: c.headers, body: { slug: p1.slug, quantity: 2 } })).status, 409, 'only 3 in stock');
    assert.equal((await api('POST', '/api/customer/cart/items', { headers: c.headers, body: { product_id: p2.id } })).status >= 400, true, 'out of stock');
    assert.equal((await api('POST', '/api/customer/cart/items', { headers: c.headers, body: { product_id: p1.id, quantity: 0 } })).status, 400);
    const m = await api('POST', '/api/customer/cart/merge', { headers: c.headers, body: { items: [{ slug: p1.slug, quantity: 1 }, { product_id: p2.id, quantity: 1 }, { slug: 'does-not-exist' }] } });
    assert.equal(m.status, 200);
    assert.equal(m.body.data.items.length, 1);
    assert.equal(m.body.data.items[0].quantity, 3);
    assert.equal(m.body.data.skipped.length, 2);
    const set = await api('PATCH', `/api/customer/cart/items/${p1.id}`, { headers: c.headers, body: { quantity: 1 } });
    assert.equal(set.body.data.summary.total, 1000);
    assert.equal(set.body.data.summary.discount_total, 500);
    assert.equal((await api('DELETE', `/api/customer/cart/items/${p1.id}`, { headers: c.headers })).body.data.items.length, 0);
    assert.equal((await api('PATCH', `/api/customer/cart/items/${p1.id}`, { headers: c.headers, body: { quantity: 1 } })).status, 404);
  });

  // ------------------------------------------------------------ COD
  test('checkout COD: order placed from the cart, stock reduced, cart cleared, totals from the DB', async () => {
    const c = await customer();
    const p = await mkProduct({ selling_price: 11800, stock_quantity: 5 });
    await api('POST', '/api/customer/cart/items', { headers: c.headers, body: { product_id: p.id, quantity: 2 } });
    const r = await api('POST', '/api/customer/orders', { headers: c.headers, body: { payment_method: 'cod', address: ADDRESS, notes: 'Call before delivery', total: 1 } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const o = r.body.data.order;
    assert.equal(o.total, 23600);
    assert.equal(o.status, 'placed');
    assert.equal(o.payment_status, 'pending');
    assert.match(o.order_number, /^AQ\d{4}-\d{6}$/);
    assert.equal(r.body.data.payment, null);
    assert.equal(await stockOf(p.id), 3);
    assert.equal((await api('GET', '/api/customer/cart', { headers: c.headers })).body.data.items.length, 0);
    assert.equal(o.items[0].quantity, 2);
    assert.equal((await api('POST', '/api/customer/orders', { headers: c.headers, body: { payment_method: 'cod', address: ADDRESS } })).status, 400, 'empty cart');
    const mine = await api('GET', '/api/customer/orders', { headers: c.headers });
    assert.equal(mine.body.meta.total, 1);
    const other = await customer();
    assert.equal((await api('GET', `/api/customer/orders/${o.id}`, { headers: other.headers })).status, 404, "another customer's order");
    assert.equal((await api('GET', `/api/customer/orders/${o.id}/invoice`, { headers: c.headers })).status, 409, 'no invoice before confirmation');
  });

  test('checkout validation: bad payment method, bad address, other customer address, unknown product, COD limit', async () => {
    const c = await customer(); const other = await customer();
    const p = await mkProduct({ selling_price: 1000 });
    const item = [{ product_id: p.id, quantity: 1 }];
    assert.equal((await buyNow(c, item, 'bitcoin')).status, 400);
    assert.equal((await api('POST', '/api/customer/orders', { headers: c.headers, body: { payment_method: 'cod', address: { ...ADDRESS, pin_code: 'x' }, items: item } })).status, 400);
    const theirs = await api('POST', '/api/customer/addresses', { headers: other.headers, body: ADDRESS });
    assert.equal((await api('POST', '/api/customer/orders', { headers: c.headers, body: { payment_method: 'cod', address_id: theirs.body.data.id, items: item } })).status, 400);
    assert.equal((await buyNow(c, [{ product_id: '36a8b30f-e1bc-4118-918d-b7834393e55f', quantity: 1 }], 'cod')).status >= 400, true);
    assert.equal((await buyNow(c, [{ product_id: p.id, quantity: 100 }], 'cod')).status, 400);
    const big = await mkProduct({ selling_price: 500000, mrp: 500000 });
    process.env.COD_MAX_AMOUNT = '100000';
    const lim = await buyNow(c, [{ product_id: big.id, quantity: 1 }], 'cod');
    delete process.env.COD_MAX_AMOUNT;
    assert.equal(lim.status, 400);
    assert.match(lim.body.message, /Cash on Delivery/);
    const mine = await api('GET', '/api/customer/addresses', { headers: c.headers });
    const saved = await api('POST', '/api/customer/addresses', { headers: c.headers, body: ADDRESS });
    assert.equal((await api('POST', '/api/customer/orders', { headers: c.headers, body: { payment_method: 'cod', address_id: saved.body.data.id, items: item } })).status, 201, `saved address works ${mine.status}`);
  });

  test('stock: two buyers racing for the last unit - exactly one wins and stock never goes negative', async () => {
    const p = await mkProduct({ selling_price: 1000, stock_quantity: 1 });
    const a = await customer(); const b = await customer(); const d = await customer(); // sequential: the fake SMS inbox is shared
    const res = await Promise.all([a, b, d].map((c) => buyNow(c, [{ product_id: p.id, quantity: 1 }], 'cod')));
    const wins = res.filter((r) => r.status === 201).length;
    assert.equal(wins, 1, res.map((r) => r.status).join(','));
    assert.equal(res.filter((r) => r.status === 409).length, 2);
    assert.equal(await stockOf(p.id), 0);
  });

  test('stock: a multi-product order that fails on one line changes nothing', async () => {
    const c = await customer();
    const ok = await mkProduct({ stock_quantity: 5 }); const low = await mkProduct({ stock_quantity: 1 });
    const r = await buyNow(c, [{ product_id: ok.id, quantity: 2 }, { product_id: low.id, quantity: 2 }], 'cod');
    assert.equal(r.status, 409);
    assert.equal(await stockOf(ok.id), 5, 'rolled back');
    assert.equal(await stockOf(low.id), 1);
    assert.equal((await api('GET', '/api/customer/orders', { headers: c.headers })).body.meta.total, 0);
  });

  // ------------------------------------------------------------ Razorpay
  test('razorpay: order is created at the gateway, payment verified by signature, order confirmed and invoiced', async () => {
    const c = await customer();
    const p = await mkProduct({ selling_price: 11800, stock_quantity: 4 });
    const r = await buyNow(c, [{ product_id: p.id, quantity: 1 }]);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const pay = r.body.data.payment;
    assert.equal(pay.key_id, 'rzp_test_unit');
    assert.equal(pay.amount, 1180000, 'paise');
    assert.equal(pay.currency, 'INR');
    assert.ok(!JSON.stringify(r.body).includes('unit-test-key-secret'), 'the key secret never leaves the server');
    const gw = gateway.orders.at(-1);
    assert.equal(gw.amount, 1180000);
    assert.equal(r.body.data.order.can_pay, true);
    assert.equal(await stockOf(p.id), 3, 'stock is held while paying');

    const oid = pay.razorpay_order_id;
    const bad = await api('POST', `/api/customer/orders/${r.body.data.order.id}/payment/verify`, { headers: c.headers, body: { razorpay_order_id: oid, razorpay_payment_id: h.payId(), razorpay_signature: 'a'.repeat(64) } });
    assert.equal(bad.status, 400, 'wrong signature');
    assert.equal((await api('GET', `/api/customer/orders/${r.body.data.order.id}`, { headers: c.headers })).body.data.payment_status, 'failed');
    const wrongOrder = await api('POST', `/api/customer/orders/${r.body.data.order.id}/payment/verify`, { headers: c.headers, body: { razorpay_order_id: 'order_Other123456', razorpay_payment_id: 'pay_abcdef123', razorpay_signature: 'a'.repeat(64) } });
    assert.equal(wrongOrder.status, 400);

    const v = await payOnline(c, { id: r.body.data.order.id, razorpay_order_id: oid });
    assert.equal(v.status, 200, JSON.stringify(v.body));
    assert.equal(v.body.data.payment_status, 'paid');
    assert.equal(v.body.data.status, 'confirmed', 'a paid online order is confirmed automatically');
    assert.match(v.body.data.invoice_number, /^AQ\/\d{4}-\d{2}\/\d{5}$/);
    const again = await payOnline(c, { id: r.body.data.order.id, razorpay_order_id: oid });
    assert.equal(again.status, 200, 'verifying twice is harmless');
    assert.equal((await h.pool.execute('SELECT COUNT(*) AS n FROM payment WHERE order_id = ? AND status = "paid"', [r.body.data.order.id]))[0][0].n, 1);

    const inv = await api('GET', `/api/customer/orders/${r.body.data.order.id}/invoice`, { headers: c.headers });
    assert.equal(inv.status, 200);
    assert.equal(inv.headers.get('content-type'), 'application/pdf');
    assert.equal(inv.body.subarray(0, 5).toString(), '%PDF-');
    assert.equal((await api('GET', `/api/orders/${r.body.data.order.id}/invoice`, { headers: staff })).status, 200);
    assert.equal(await stockOf(p.id), 3);
  });

  test('razorpay: gateway failure rolls the whole order back; missing keys give a clear 503', async () => {
    const c = await customer();
    const p = await mkProduct({ stock_quantity: 2 });
    gateway.failNext = true;
    const r = await buyNow(c, [{ product_id: p.id, quantity: 1 }]);
    assert.ok(r.status >= 400 && r.status < 600, String(r.status));
    assert.equal(await stockOf(p.id), 2, 'stock restored');
    const left = (await api('GET', '/api/customer/orders', { headers: c.headers })).body.data;
    assert.ok(left.every((o) => o.status === 'cancelled'), 'the failed attempt is kept only as a cancelled order, never as a live one');
    const key = process.env.RAZORPAY_KEY_ID; process.env.RAZORPAY_KEY_ID = '';
    const off = await buyNow(c, [{ product_id: p.id, quantity: 1 }]);
    process.env.RAZORPAY_KEY_ID = key;
    assert.equal(off.status, 503);
    assert.equal(await stockOf(p.id), 2);
  });

  test('razorpay webhook: bad signature rejected, capture confirms the order, duplicates ignored, failure recorded', async () => {
    const c = await customer();
    const p = await mkProduct({ stock_quantity: 5 });
    const r = await buyNow(c, [{ product_id: p.id, quantity: 1 }]);
    const o = r.body.data.order; const oid = r.body.data.payment.razorpay_order_id; const pid = h.payId();
    const event = { event: 'payment.captured', payload: { payment: { entity: { id: pid, order_id: oid, amount: 1180000 } } } };
    assert.equal((await h.webhook(event, { secret: 'wrong' })).status, 400);
    assert.equal((await api('POST', '/api/webhooks/razorpay', { raw: JSON.stringify(event), headers: { 'Content-Type': 'application/json' } })).status, 400, 'no signature');
    assert.equal((await api('GET', `/api/customer/orders/${o.id}`, { headers: c.headers })).body.data.payment_status, 'pending');
    const fail = await h.webhook({ event: 'payment.failed', payload: { payment: { entity: { id: h.payId(), order_id: oid, error_description: 'Card declined' } } } });
    assert.equal(fail.status, 200);
    assert.equal((await api('GET', `/api/customer/orders/${o.id}`, { headers: c.headers })).body.data.can_pay, true, 'a failed attempt can be retried');
    const ok = await h.webhook(event, { eventId: `evt_${TAG}_1` });
    assert.equal(ok.status, 200);
    const dup = await h.webhook(event, { eventId: `evt_${TAG}_1` });
    assert.equal(dup.body.message, 'Already processed');
    const got = (await api('GET', `/api/orders/${o.id}`, { headers: admin })).body.data;
    assert.equal(got.payment_status, 'paid');
    assert.equal(got.status, 'confirmed');
    assert.equal(got.razorpay_payment_id, pid);
    assert.ok(got.invoice_number);
    assert.equal((await h.pool.execute('SELECT COUNT(*) AS n FROM payment WHERE order_id = ? AND status = "paid"', [o.id]))[0][0].n, 1);
    // browser verify racing the webhook for the same payment does not double-process
    assert.equal((await payOnline(c, { id: o.id, razorpay_order_id: oid }, pid)).status, 200);
    assert.equal((await api('GET', `/api/orders/${o.id}`, { headers: admin })).body.data.invoice_number, got.invoice_number, 'invoice number is stable');
  });

  test('cancel: unpaid order restocks; paid online order is refunded through the gateway; shipped cannot be cancelled', async () => {
    const c = await customer();
    const p = await mkProduct({ stock_quantity: 5 });
    const cod = (await buyNow(c, [{ product_id: p.id, quantity: 2 }], 'cod')).body.data.order;
    assert.equal(await stockOf(p.id), 3);
    const x = await api('POST', `/api/customer/orders/${cod.id}/cancel`, { headers: c.headers });
    assert.equal(x.status, 200);
    assert.equal(x.body.data.status, 'cancelled');
    assert.equal(await stockOf(p.id), 5, 'stock returned');
    assert.equal((await api('POST', `/api/customer/orders/${cod.id}/cancel`, { headers: c.headers })).status, 200, 'cancelling again is harmless');
    assert.equal(await stockOf(p.id), 5, 'and does not restock twice');

    const onl = (await buyNow(c, [{ product_id: p.id, quantity: 1 }])).body.data;
    const pid = h.payId();
    await payOnline(c, { id: onl.order.id, razorpay_order_id: onl.payment.razorpay_order_id }, pid);
    const before = gateway.refunds.length;
    const cx = await api('POST', `/api/customer/orders/${onl.order.id}/cancel`, { headers: c.headers });
    assert.equal(cx.status, 200, JSON.stringify(cx.body));
    assert.equal(gateway.refunds.length, before + 1);
    assert.equal(gateway.refunds.at(-1).payment_id, pid);
    assert.equal(gateway.refunds.at(-1).amount, 1180000);
    const a = (await api('GET', `/api/orders/${onl.order.id}`, { headers: admin })).body.data;
    assert.equal(a.payment_status, 'refunded');
    assert.equal(a.refunds.length, 1);
    assert.equal(await stockOf(p.id), 5);

    const sh = (await buyNow(c, [{ product_id: p.id, quantity: 1 }], 'cod')).body.data.order;
    await api('PATCH', `/api/orders/${sh.id}/status`, { headers: admin, body: { status: 'confirmed' } });
    await api('PATCH', `/api/orders/${sh.id}/status`, { headers: admin, body: { status: 'shipped', tracking_info: 'DTDC 123' } });
    assert.equal((await api('POST', `/api/customer/orders/${sh.id}/cancel`, { headers: c.headers })).status, 409);
  });

  test('payment arriving for a cancelled order is refunded automatically', async () => {
    const c = await customer();
    const p = await mkProduct({ stock_quantity: 3 });
    const o = (await buyNow(c, [{ product_id: p.id, quantity: 1 }])).body.data;
    await api('POST', `/api/customer/orders/${o.order.id}/cancel`, { headers: c.headers });
    const before = gateway.refunds.length;
    const pid = h.payId();
    const w = await h.webhook({ event: 'payment.captured', payload: { payment: { entity: { id: pid, order_id: o.payment.razorpay_order_id, amount: 1180000 } } } });
    assert.equal(w.status, 200);
    assert.equal(gateway.refunds.length, before + 1, 'money is returned');
    assert.equal(await stockOf(p.id), 3, 'the order stays cancelled, stock untouched');
    assert.equal((await api('GET', `/api/orders/${o.order.id}`, { headers: admin })).body.data.status, 'cancelled');
  });

  test('unpaid online orders expire and give the stock back', async () => {
    const c = await customer();
    const p = await mkProduct({ stock_quantity: 3 });
    const o = (await buyNow(c, [{ product_id: p.id, quantity: 2 }])).body.data.order;
    assert.equal(await stockOf(p.id), 1);
    await h.pool.execute('UPDATE orders SET placed_at = DATE_SUB(NOW(), INTERVAL 2 HOUR) WHERE id = ?', [o.id]);
    const n = await require('../src/services/orderService').expireUnpaidOrders(30);
    assert.ok(n >= 1);
    assert.equal(await stockOf(p.id), 3);
    assert.equal((await api('GET', `/api/customer/orders/${o.id}`, { headers: c.headers })).body.data.status, 'cancelled');
    const cod = (await buyNow(c, [{ product_id: p.id, quantity: 1 }], 'cod')).body.data.order;
    await h.pool.execute('UPDATE orders SET placed_at = DATE_SUB(NOW(), INTERVAL 2 HOUR) WHERE id = ?', [cod.id]);
    await require('../src/services/orderService').expireUnpaidOrders(30);
    assert.equal((await api('GET', `/api/customer/orders/${cod.id}`, { headers: c.headers })).body.data.status, 'placed', 'COD orders never expire');
  });

  // ------------------------------------------------------------ admin side
  test('admin: status flow placed -> confirmed -> shipped -> delivered, bad jumps refused, COD paid on delivery, invoice on confirm', async () => {
    const c = await customer();
    const p = await mkProduct({ stock_quantity: 5 });
    const o = (await buyNow(c, [{ product_id: p.id, quantity: 1 }], 'cod')).body.data.order;
    const set = (status, body = {}) => api('PATCH', `/api/orders/${o.id}/status`, { headers: staff, body: { status, ...body } });
    assert.equal((await set('shipped')).status, 409, 'cannot skip a step');
    assert.equal((await set('weird')).status, 400);
    assert.equal((await api('PATCH', `/api/orders/${o.id}/status`, { body: { status: 'confirmed' } })).status, 401);
    const conf = await set('confirmed', { admin_notes: 'Verified by phone' });
    assert.equal(conf.body.data.status, 'confirmed');
    assert.ok(conf.body.data.invoice_number, 'COD invoice is issued on confirmation');
    const inv = conf.body.data.invoice_number;
    const ship = await set('shipped', { tracking_info: 'DTDC 998877' });
    assert.equal(ship.body.data.tracking_info, 'DTDC 998877');
    const del = await set('delivered');
    assert.equal(del.body.data.payment_status, 'paid', 'cash collected');
    assert.equal(del.body.data.invoice_number, inv);
    assert.equal((await set('cancelled')).status, 409);
    const list = await api('GET', '/api/orders', { headers: staff, query: { status: 'delivered', payment_method: 'cod', search: o.order_number } });
    assert.equal(list.body.meta.total, 1);
    assert.equal((await api('GET', '/api/orders', { headers: staff, query: { status: 'nope' } })).status, 400);
    const inv2 = await api('GET', `/api/customer/orders/${o.id}/invoice`, { headers: c.headers });
    assert.equal(inv2.status, 200);
  });

  test('admin: an online order cannot be confirmed before it is paid; invoice numbers are sequential and unique', async () => {
    const c = await customer();
    const p = await mkProduct({ stock_quantity: 9 });
    const o = (await buyNow(c, [{ product_id: p.id, quantity: 1 }])).body.data;
    assert.equal((await api('PATCH', `/api/orders/${o.order.id}/status`, { headers: admin, body: { status: 'confirmed' } })).status, 409);
    const nums = [];
    for (let i = 0; i < 3; i += 1) {
      const cod = (await buyNow(c, [{ product_id: p.id, quantity: 1 }], 'cod')).body.data.order;
      const r = await api('PATCH', `/api/orders/${cod.id}/status`, { headers: admin, body: { status: 'confirmed' } });
      nums.push(Number(r.body.data.invoice_number.split('/').pop()));
    }
    assert.equal(nums[1], nums[0] + 1);
    assert.equal(nums[2], nums[1] + 1);
    assert.equal(new Set(nums).size, 3);
  });

  test('admin: refunds - admin role only, partial then rest, cannot exceed what was paid, gateway errors surface', async () => {
    const c = await customer();
    const p = await mkProduct({ stock_quantity: 9, selling_price: 10000 });
    const d = (await buyNow(c, [{ product_id: p.id, quantity: 1 }])).body.data;
    assert.equal((await api('POST', `/api/orders/${d.order.id}/refund`, { headers: admin, body: {} })).status, 409, 'not paid yet');
    await payOnline(c, { id: d.order.id, razorpay_order_id: d.payment.razorpay_order_id });
    const url = `/api/orders/${d.order.id}/refund`;
    assert.equal((await api('POST', url, { headers: staff, body: { amount: 100 } })).status, 403, 'staff cannot send money out');
    assert.equal((await api('POST', url, { headers: admin, body: { amount: 99999 } })).status, 400, 'more than was paid');
    const part = await api('POST', url, { headers: admin, body: { amount: 2500, reason: 'Damaged box' } });
    assert.equal(part.status, 200, JSON.stringify(part.body));
    assert.equal(part.body.data.payment_status, 'partially_refunded');
    assert.equal(part.body.data.refund_amount, 2500);
    assert.equal(gateway.refunds.at(-1).amount, 250000);
    gateway.failRefund = true;
    const failed = await api('POST', url, { headers: admin, body: {} });
    gateway.failRefund = false;
    assert.ok(failed.status >= 400, 'gateway refusal is reported');
    assert.equal((await api('GET', `/api/orders/${d.order.id}`, { headers: admin })).body.data.refund_amount, 2500, 'nothing recorded for the failed refund');
    const rest = await api('POST', url, { headers: admin, body: {} });
    assert.equal(rest.body.data.payment_status, 'refunded');
    assert.equal(rest.body.data.refund_amount, 10000);
    assert.equal(gateway.refunds.at(-1).amount, 750000);
    assert.equal((await api('POST', url, { headers: admin, body: {} })).status, 409);
    const ext = await h.webhook({ event: 'refund.processed', payload: { refund: { entity: { id: gateway.refunds.at(-1).id, payment_id: gateway.refunds.at(-1).payment_id, amount: 750000 } } } });
    assert.equal(ext.status, 200);
    assert.equal((await api('GET', `/api/orders/${d.order.id}`, { headers: admin })).body.data.refunds.length, 2, 'a refund we made ourselves is not recorded twice');
  });

  test('service requests: a signed-in customer sees their own', async () => {
    const c = await customer();
    const r = await api('POST', '/api/public/service-requests', { headers: c.headers, body: { name: `Own ${TAG}`, mobile: '9000022222', city: 'Salem', service_type: 'repair' } });
    assert.equal(r.status, 201);
    const mine = await api('GET', '/api/customer/service-requests', { headers: c.headers });
    assert.equal(mine.body.data.length, 1);
    assert.equal((await api('GET', '/api/customer/service-requests', { headers: (await customer()).headers })).body.data.length, 0);
    await h.pool.query('DELETE FROM service_request WHERE name = ?', [`Own ${TAG}`]);
  });
}

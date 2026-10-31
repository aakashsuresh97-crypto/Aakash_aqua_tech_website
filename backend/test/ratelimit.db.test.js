// Spam protection on the public forms: the per-IP rate limit. Own file because it needs a low limit (set before the app loads).
const test = require('node:test');
const assert = require('node:assert');

if (process.env.RUN_DB_TESTS !== '1') {
  test('rate-limit DB tests (skipped: set RUN_DB_TESTS=1)', { skip: true }, () => {});
} else {
  process.env.FORM_RATE_MAX = '3';
  const h = require('./helpers/site');
  test.before(() => h.start());
  test.after(async () => { await h.pool.query('DELETE FROM leads WHERE first_name LIKE ?', [`%${h.TAG}%`]); await h.stop(); });

  test('public forms: the 4th submission within the window from one IP is refused with 429', async () => {
    const body = { first_name: `Rate ${h.TAG}`, last_name: 'T', mobile: '9876500000', city: 'Salem', pin_code: '636016', interest: 'Water Purifier', address: 'x', terms_accepted: true };
    const codes = [];
    for (let i = 0; i < 4; i += 1) codes.push((await h.api('POST', '/api/public/leads', { body })).status);
    assert.deepEqual(codes, [201, 201, 201, 429]);
  });
}

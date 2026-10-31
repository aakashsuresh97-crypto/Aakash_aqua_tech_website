// Creates an admin (or staff) login. Run it once after `npm run migrate:auth`.
//   npm run create-admin                       (asks for the details; the password is not echoed)
//   npm run create-admin -- --email you@example.com --name "Your Name" --role admin
// A --password flag exists for automation, but it ends up in your shell history; prefer the prompt.
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');
const users = require('../src/models/adminUser.model');
const { BCRYPT_ROUNDS } = require('../src/config/auth');
const { EMAIL_RE } = require('../src/middleware/validateAuth');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, (answer) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(answer); });
  });
}

(async () => {
  try {
    const email = String(args.email || await ask('Email: ')).trim().toLowerCase();
    const fullName = String(args.name || await ask('Full name: ')).trim();
    const role = String(args.role || 'admin').trim();
    const password = String(args.password || await ask('Password (min 8 characters): ', { hidden: true }));

    if (!EMAIL_RE.test(email) || email.length > 190) throw new Error('Enter a valid email address.');
    if (fullName.length < 2 || fullName.length > 100) throw new Error('Name must be 2-100 characters.');
    if (!['admin', 'staff'].includes(role)) throw new Error('Role must be "admin" or "staff".');
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');
    if (Buffer.byteLength(password) > 72) throw new Error('Password must be at most 72 bytes (a bcrypt limit).');

    if (await users.findByEmail(email)) throw new Error(`A user with ${email} already exists.`);
    const user = await users.create({ email, fullName, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS), role });
    console.log(`Created ${user.role} "${user.full_name}" <${user.email}>. You can now sign in at /admin/.`);
  } catch (err) {
    console.error(err.code === 'ER_NO_SUCH_TABLE' ? 'The admin_user table is missing. Run "npm run migrate:auth" first.' : `Failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

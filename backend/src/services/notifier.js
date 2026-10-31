// Notification hook for new leads / service requests / orders. Configure ONE OR MORE channels in .env:
//   NOTIFY_WEBHOOK_URL  - receives a JSON POST { event, title, text, data } (Zapier, Make, a WhatsApp gateway, Slack ...)
//   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM + NOTIFY_EMAIL_TO - sends an email
// With nothing configured it only writes a line to the console (a stub, so the hook is ready when you have a provider).
// It never throws and never delays the API response.
const emitted = [];

async function sendEmail({ title, text }) {
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: process.env.NOTIFY_EMAIL_TO, subject: title, text });
}

async function sendWebhook(payload) {
  const res = await fetch(process.env.NOTIFY_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`webhook answered ${res.status}`);
}

/** event: 'lead.created' | 'service.created' | 'order.placed' | 'order.paid' ... */
function notify(event, title, text, data = {}) {
  emitted.push({ event, title }); // lets tests check the hook fired
  if (emitted.length > 100) emitted.shift();
  const jobs = [];
  if (process.env.NOTIFY_WEBHOOK_URL) jobs.push(sendWebhook({ event, title, text, data }));
  if (process.env.SMTP_HOST && process.env.NOTIFY_EMAIL_TO) jobs.push(sendEmail({ title, text }));
  if (!jobs.length && process.env.NOTIFY_CONSOLE !== '0') console.log(`[notify:${event}] ${title} - ${text.replace(/\n/g, ' | ')}`);
  Promise.allSettled(jobs).then((rs) => rs.forEach((r) => { if (r.status === 'rejected') console.error(`[notify:${event}] failed:`, r.reason && r.reason.message); }));
}

module.exports = { notify, emitted };

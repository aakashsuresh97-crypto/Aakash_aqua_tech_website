// SMS adapter used for the customer login OTP. Pick the provider with SMS_PROVIDER in .env:
//   console (default) - prints the message to the API console. For development only: nothing is sent.
//   http              - calls any HTTP SMS gateway you configure: SMS_HTTP_URL (placeholders {mobile} {message} {otp}),
//                       SMS_HTTP_METHOD (GET|POST), SMS_HTTP_BODY (POST body template, JSON), SMS_HTTP_HEADERS (JSON object, e.g. API key).
// Adding a vendor-specific provider later only means adding one function to PROVIDERS.
const sent = []; // development / tests: the last messages "sent" by the console provider

const fill = (tpl, vars) => tpl.replace(/\{(mobile|message|otp)\}/g, (_, k) => encodeURIComponent(vars[k]).replace(/%20/g, '+'));
const fillRaw = (tpl, vars) => tpl.replace(/\{(mobile|message|otp)\}/g, (_, k) => String(vars[k]).replace(/["\\]/g, '\\$&'));

const PROVIDERS = {
  async console({ mobile, message }) {
    sent.push({ mobile, message });
    if (sent.length > 50) sent.shift();
    if (process.env.SMS_CONSOLE_QUIET !== '1') console.log(`[sms:console] to ${mobile}: ${message}`);
  },
  async http({ mobile, message, otp }) {
    const url = process.env.SMS_HTTP_URL;
    if (!url) throw new Error('SMS_HTTP_URL is not set');
    const vars = { mobile, message, otp };
    const method = (process.env.SMS_HTTP_METHOD || 'GET').toUpperCase();
    const headers = process.env.SMS_HTTP_HEADERS ? JSON.parse(process.env.SMS_HTTP_HEADERS) : {};
    const init = { method, headers, signal: AbortSignal.timeout(10000) };
    if (method === 'POST') {
      init.body = fillRaw(process.env.SMS_HTTP_BODY || '{"to":"{mobile}","message":"{message}"}', vars);
      init.headers = { 'Content-Type': 'application/json', ...headers };
    }
    const res = await fetch(fill(url, vars), init);
    if (!res.ok) throw new Error(`SMS gateway answered ${res.status}`);
  },
};

async function sendSms(mobile, message, otp) {
  const name = (process.env.SMS_PROVIDER || 'console').toLowerCase();
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown SMS_PROVIDER "${name}"`);
  await provider({ mobile, message, otp });
}

module.exports = { sendSms, sent };

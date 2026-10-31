// Password policy (same as the standalone auth-api): at least 10 characters with a lower case letter, an upper case letter,
// a digit and a symbol, and at most 72 bytes (bcrypt silently ignores anything longer, so it is refused instead of truncated).
const MIN_LENGTH = 10;

/** Returns the list of problems with a new password (empty when it is acceptable). */
function passwordProblems(pw) {
  if (typeof pw !== 'string' || !pw) return ['Password is required'];
  const out = [];
  if (pw.length < MIN_LENGTH) out.push(`Password must be at least ${MIN_LENGTH} characters`);
  if (Buffer.byteLength(pw, 'utf8') > 72) out.push('Password must be at most 72 bytes');
  if (!/[a-z]/.test(pw)) out.push('Password must contain a lowercase letter');
  if (!/[A-Z]/.test(pw)) out.push('Password must contain an uppercase letter');
  if (!/[0-9]/.test(pw)) out.push('Password must contain a digit');
  if (!/[^A-Za-z0-9]/.test(pw)) out.push('Password must contain a special character');
  return out;
}

module.exports = { passwordProblems, MIN_LENGTH };

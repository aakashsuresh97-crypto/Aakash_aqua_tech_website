/** "+91 98765-43210" / "098765 43210" / "9876543210" -> "9876543210"; null when it is not a valid Indian mobile number. */
function normalizeMobile(raw) {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  let d = String(raw).replace(/[\s\-().]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}
module.exports = { normalizeMobile };

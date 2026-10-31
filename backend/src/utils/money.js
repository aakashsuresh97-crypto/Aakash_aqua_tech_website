// Money is calculated in paise (integers) so totals never suffer floating-point drift.
const toPaise = (rupees) => Math.round(Number(rupees) * 100);
const toRupees = (paise) => Math.round(paise) / 100;

/** Splits a GST-inclusive amount (paise) into taxable value and GST (paise): taxable = incl / (1 + gst%). */
function splitGst(inclusivePaise, gstPercent) {
  const taxable = Math.round((inclusivePaise * 100) / (100 + Number(gstPercent || 0)));
  return { taxable, gst: inclusivePaise - taxable };
}

/** Indian financial year of a date (April - March), in IST: "2026-27" (label) and "2627" (short). */
function financialYear(date = new Date()) {
  const ist = new Date(date.getTime() + 5.5 * 3600 * 1000);
  const y = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
  const label = `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  return { label, short: `${String(y % 100).padStart(2, '0')}${String((y + 1) % 100).padStart(2, '0')}` };
}

module.exports = { toPaise, toRupees, splitGst, financialYear };

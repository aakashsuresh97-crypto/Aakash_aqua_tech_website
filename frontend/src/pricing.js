/* One place that decides the struck-through price (MRP) for EVERY product, option and spare.
   Order of priority:  1) MRP_OVERRIDE (your real MRP)  →  2) the MRP already in data.js  →  3) AUTO_MRP estimate. */

/* ⚠ Fill in the real MRP printed on the product / brand price list. Key = product slug (or the spare's full name). */
export const MRP_OVERRIDE = {
  // 'kent-sterling-star-iot-black': 33000,
  // 'CYCLONE - INLINE FILTER CARTRIDGE': 650,
}

/* Estimated MRP for anything that has no real one: selling price + this share, rounded up to a clean number.
   0.15 = 15 % above the selling price.  Set to 0 to switch estimates off (then only real MRPs are struck through). */
export const AUTO_MRP = 0.15

const roundUp = (n, step) => Math.ceil(n / step) * step
const estimate = (price) => roundUp(price * (1 + AUTO_MRP), price >= 100000 ? 5000 : price >= 10000 ? 500 : 100)

/* struck-through price for a selling price; returns 0 when there is nothing sensible to show */
export const mrpFor = (key, price, current = 0) => {
  if (!(price > 0)) return 0
  if (MRP_OVERRIDE[key] > price) return MRP_OVERRIDE[key]
  if (current > price) return current
  return AUTO_MRP > 0 ? estimate(price) : 0
}
export const saveOf = (price, mrp) => (mrp > price ? Math.round((1 - price / mrp) * 100) : 0)

/* used once at the end of data.js: fills mrp + save on every product */
export const applyMrp = (p) => {
  if (!(p.price > 0) || p.np) return p
  p.mrp = mrpFor(p.slug, p.price, p.mrp) || p.price
  p.save = saveOf(p.price, p.mrp)
  return p
}
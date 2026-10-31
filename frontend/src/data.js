// All text / images / prices taken from https://aakashaquatech.in
import { applyMrp } from './pricing.js'
const L = 'https://aakashaquatech.in/'
/* Images of the old WordPress site. `npm run images:localize` copies them into public/img/wp/, and this helper then serves the local
   copy (so the pictures survive when the old site is switched off). If a local copy is missing, the <img> error handler in
   imageFallback.js tries the original address and finally shows a placeholder, so there is never a broken-image icon. */
export const WP = 'https://aakashaquatech.in/wp-content/uploads/'
/* Set VITE_LOCAL_IMAGES=1 only AFTER `npm run images:localize` has filled public/img/wp/. Otherwise every picture is first asked
   from a local folder that does not exist (the server answers with index.html), fails, and is then retried: 2 requests per image. */
const LOCAL_IMAGES = import.meta.env.VITE_LOCAL_IMAGES === '1'
export const localImg = (p) => (LOCAL_IMAGES && typeof p === 'string' && p.startsWith(WP) ? '/img/wp/' + p.slice(WP.length) : p)
export const u = (p) => (!p ? '' : /^(https?:)?\/\/|^\/|^data:/.test(p) ? localImg(p) : localImg(WP + p))
/* Brand name for any brand key. Unknown keys (a brand added in the admin) never throw: "ao-smith" -> "Ao Smith". */
export const brandName = (k) => (brandInfo[k] && brandInfo[k][0]) || String(k || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
/* Maps a brand coming from the database (slug "ao-smith", name "A.O. Smith") to the built-in key ("aosmith") the shop pages use. */
export const brandKey = (slugOrName, name) => {
  const flat = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const c of [slugOrName, name]) {
    if (!c) continue
    if (brandInfo[c]) return c
    const f = flat(c)
    const hit = Object.keys(brandInfo).find((k) => k === f || flat(brandInfo[k][0]) === f)
    if (hit) return hit
  }
  return slugOrName || null
}
export const PHONE = '96555 77666',
  WA = 'https://wa.me/919655599666'
export const inr = (n) => '₹' + n.toLocaleString('en-IN') + '.00'

// slug -> category (menu + tile row + tabs). Only "ro" has products loaded so far.
export const cats = {
  ro: ['RO Water Purifiers', '2026/03/Untitled-design-1-1.png', 'https://aakashaquatech.in/ro-water-purifier-brand/'],
  uv: [
    'UV Water Purifier',
    '2026/04/ProPlanet-3-_X-Angle01.webp',
    'https://aakashaquatech.in/uv-water-purifier-brands/',
  ],
  alkaline: ['Alkaline', '2026/03/ZeroB-Hydrolife.png', 'https://aakashaquatech.in/product-category/alkaline/'],
  gravity: [
    'Gravity Water Purifier',
    '2026/03/Untitled-design-38-e1776358874556.png',
    'https://aakashaquatech.in/product-category/domestic-ro/gravity/',
  ],
  undersink: [
    'Under Sink',
    '2026/03/cyclone-under-sink-water-purifiers-e1781104064938.jpg',
    'https://aakashaquatech.in/product-category/under-sink/',
  ],
  dispenser: [
    'SS Water Dispenser',
    '2026/06/14010NH-300x300.jpeg',
    'https://aakashaquatech.in/product-category/ss-water-dispenser-2/',
    '🚰',
  ],
  industrial: ['Commercial RO System', null, 'https://aakashaquatech.in/product-category/industrial-ro-system/', '🏭'],
  spares: ['Spares', null, 'https://aakashaquatech.in/spares/', '🔧'],
  softner: ['Softner', '2026/05/as3-filter2.png', 'https://aakashaquatech.in/softner'],
  iron: [
    'Iron Remover Filter',
    '2026/05/kent-automatic-water-softener-40l-1.png',
    'https://aakashaquatech.in/iron-remover-filter',
  ],
  sand: ['Sand Filter', '2026/05/kent-sand-filter-1.png', 'https://aakashaquatech.in/sand-filter/'],
  vessel: ['Vessel', '2026/03/Vessel.jpg', 'https://aakashaquatech.in/product-category/frp-pressure-vessels/'],
  sstank: [
    'SS Tank',
    '2026/05/C320A38C-55B2-4DC4-8432-CD042858A031.png',
    'https://aakashaquatech.in/product-category/ss-tanks/',
  ],
  dm: ['DM Plant', '2026/03/dmplant.jpeg', 'https://aakashaquatech.in/product-category/dm-plant/'],
  heatpump: ['Heat Pump', null, 'https://aakashaquatech.in/product-category/heat-pump-water-heater/', '♨️'],
}
// groups shown with a scroll bar; every other category opens its product list directly
export const groups = {
  domestic: { t: 'Domestic RO', bar: ['ro', 'uv', 'alkaline', 'gravity', 'undersink'] },
  wtp: { t: 'Water Treatment Plant', bar: ['softner', 'iron', 'sand', 'vessel', 'sstank', 'dm'] },
}
export const catGroup = {}
Object.entries(groups).forEach(([g, v]) => v.bar.forEach((k) => (catGroup[k] = g)))
export const hrefOf = (k) => (catGroup[k] ? `/shop/${catGroup[k]}/${k}` : `/shop/${k}`)
const g = (...k) => k.map((x) => ({ t: cats[x][0], h: hrefOf(x), img: cats[x][1] }))
// main menu, same order as the website
export const menu = [
  { t: 'Home', h: '/' },
  { t: 'Domestic RO', h: '/shop/domestic', kids: g(...groups.domestic.bar) },
  { t: 'SS Water Dispenser', h: hrefOf('dispenser') },
  { t: 'Commercial RO System', h: hrefOf('industrial') },
  { t: 'Spares', h: hrefOf('spares') },
  { t: 'Water Treatment Plant', h: '/shop/wtp', kids: g(...groups.wtp.bar) },
  { t: 'Heat Pump', h: hrefOf('heatpump') },
  { t: 'Service', h: '/service' },
  { t: 'About us', h: '/about' },
  { t: 'Contact Us', h: '/contact' },
]
// brand -> [name, logo (null = name only), live RO page]
export const brandInfo = {
  aakash: ['Aakash', '2026/03/LOGO-1024x624.png', L + 'product-category/domestic-ro-aakash/'],
  kent: [
    'KENT Mineral RO',
    '2026/04/water-purifier-firm-kent-r-o-files-draft-papers-for-ipo-1024x1022.avif',
    L + 'product-category/domestic-ro/kent/ro-water-purifier-kent/',
  ],
  aosmith: ['A.O. Smith', '2026/04/Smith-2-1.png', L + 'product-category/domestic-ro/ao-smith/ro-water-purifier/'],
  zerob: ['ZeroB', '2026/04/images-1.png', L + 'product-category/domestic-ro/zerob/ro-water-purifier-zerob/'],
  wave: ["Sarwan's Wave", '2026/04/wave-ro-1024x512.png', L + 'product-category/domestic-ro/wave/'],
  conway: ['Conway', '2026/04/15870376876671331-2-scaled.png', L + 'product-category/domestic-ro/conway-domestic-ro/'],
  enviro: ['Enviro', null],
  purella: ['Purella', null],
  aquaguard: ['Aquaguard', null],
  senco: ['Senco', null, L + 'product-category/domestic-ro/gravity/'],
}
const six = ['aakash', 'kent', 'aosmith', 'zerob', 'wave', 'conway']
// categories that show brand buttons before the products
export const catBrands = {
  ro: [...six, 'aquaguard'],
  uv: six,
  alkaline: six,
  gravity: ['kent', 'purella', 'senco', 'zerob'],
  undersink: six,
  softner: ['aakash', 'kent', 'enviro', 'zerob', 'purella'],
  iron: ['aakash', 'kent', 'zerob'],
  sand: ['aakash', 'kent', 'zerob'],
}

// categories that open with ALL their products showing (brand names act as filters, plus an "All" tab)
export const catAll = ['uv', 'alkaline', 'gravity']
// brand that is selected by default when the category is opened (RO Water Purifiers -> Aakash first)
export const defBrand = { ro: 'aakash' }

export const services = [
  ['Free Installation', '2026/07/ChatGPT-Image-Jul-19-2026-02_45_21-PM-e1784473443781.png'],
  ['Easy EMI Options', '2026/07/ChatGPT-Image-Jul-19-2026-02_49_07-PM-e1784474068985.png'],
  ['24 Hours Service', '2026/07/ChatGPT-Image-Jul-19-2026-02_52_49-PM-e1784473752352.png'],
  ['Money Guarantee', '2026/07/ChatGPT-Image-Jul-19-2026-02_51_45-PM-e1784473841941.png'],
  ['Free Shipping', '2026/07/ChatGPT-Image-Jul-19-2026-02_50_28-PM-e1784473925846.png'],
]
export const about =
  'An RO expert with over 35 years of expertise in the field of water and waste water treatment. Aakash Pure Aqua Tech Pvt Ltd is the most professionally managed environmental engineering firm in the state with its head office founded in 2004 at Salem and Branches at Coimbatore, Dharmapuri. Unanimously acknowledged as the leading No.1 multi brand store in RO water purifier category for sales and service. We pioneered in bringing the revolutionary Reverse Osmosis Technology to South India.'
export const blocks = [
  [
    'ro',
    'RO Water Purifiers',
    'Trusted by thousands of customers, Aakash Pure Aqua Tech Pvt. Ltd. provides high-quality RO water purifiers that make your drinking water pure and safe. With advanced purification technologies like RO + UV + UF and Live TDS Display, our systems ensure effective purification while retaining essential natural minerals with Alkaline & Copper technology.',
    '2026/08/IMG_7780-scaled.png',
  ],
  [
    'uv',
    'UV Water Purifiers',
    'Advanced UV Water Purifiers with storage. These purifiers use UV and UF purification technology to remove harmful bacteria, viruses, and cysts, ensuring safe and healthy drinking water for your family.',
    '2026/08/IMG_7787-scaled-e1785863931797.png',
  ],
  [
    'gravity',
    'Gravity Water Purifiers',
    'High-quality non-electric gravity water purifiers that use the natural force of gravity to remove suspended impurities, bacteria, and cysts from water. An ideal solution for areas with limited electricity.',
    '2026/08/IMG_7788-1024x1024.png',
  ],
  [
    'softner',
    'Home Water Structuring Device',
    'A fully automatic, maintenance-free water conditioning solution that helps reduce the scale-forming properties of hard water. Operates without electricity, chemicals, salt, filters, or replacement parts.',
    '2026/08/IMG_7790-1024x1024.png',
  ],
  [
    'dispenser',
    'SS Dispenser',
    "Trusted by leading corporates including Foxconn, Qualcomm, Hyundai, Yamaha, Ola, MRF, Ford, TVS Group and Ashok Leyland. Installed at 5 ISRO centres and 16 international airports. India's only water dispenser manufacturer with BIS License across its entire range.",
    '2026/08/IMG_7782-1024x1024.png',
  ],
  [
    'alkaline',
    'Alkaline Water Filter Pitcher',
    'Zerob Alkaline Water Filter Pitchers transform your regular drinking water into healthy alkaline water with enhanced mineral balance, raising pH up to 9.5 and supporting better hydration.',
    '2026/08/IMG_7784-1024x1024.png',
  ],
  [
    'undersink',
    'Under Sink',
    'Under Sink Water Purifiers provide pure, healthy drinking water while staying neatly hidden beneath your kitchen sink. Advanced RO, UV and UF technologies remove harmful contaminants, bacteria and viruses. Ideal for borewell, tanker or municipal water.',
    '2026/08/IMG_7778-1024x562.png',
  ],
]

// KENT RO range: [slug, name, MRP, price, image, purification process]
const rows = [
  [
    'kent-crown-plus-ro-water-purifier',
    'KENT Crown Plus RO Water Purifier',
    26500,
    20000,
    '2026/07/kent-crown-plus--300x300.webp',
    'RO + UV + UF + Copper + TDS Control',
  ],
  [
    'kent-crystal-plus',
    'KENT Crystal Alkaline -WHITE',
    26500,
    20000,
    '2026/03/kent-crystal-alkaline-white--300x300.webp',
    'RO + UV + UF + Alkaline + TDS Control',
  ],
  [
    'kent-crystal-plus-black',
    'KENT Crystal Alkaline-BLACK',
    26500,
    20000,
    '2026/07/kent-crystal-alkline--300x300.webp',
    'RO + UV + UF + Alkaline + TDS Control',
  ],
  [
    'kent-elegant-black',
    'KENT Elegant (BLACK)',
    23500,
    16500,
    '2026/07/kent-elegant-black--300x300.webp',
    'RO + UF + TDS Control',
  ],
  [
    'kent-elegant',
    'KENT Elegant-(WHITE)',
    23500,
    16500,
    '2026/06/FF044E7E-ACEA-4CCD-940C-E8C00CC87086-300x300.png',
    'RO + UF + TDS Control',
  ],
  [
    'kent-grand-iot',
    'KENT Grand IoT',
    28000,
    21999,
    '2026/04/Info_Web_Grand_iOT-1_17853df5-dded-4091-b548-bc68ce9c83e7.png-300x300.webp',
    'RO + UV + UF + Alkaline + Copper + TDS Control + IoT',
  ],
  [
    'kent-grand-plus-black',
    'KENT Grand Plus-BLACK',
    25500,
    19999,
    '2026/07/kent-grand-plus-black--300x300.webp',
    'RO + UV + UF + TDS Control',
  ],
  [
    'kent-grand-plus-2',
    'KENT Grand Plus-WHITE',
    25500,
    19999,
    '2026/07/kent-grand-plus-white--300x300.webp',
    'RO + UV + UF + TDS Control',
  ],
  [
    'kent-pearl-star-iot',
    'KENT Pearl Star IoT',
    28000,
    22199,
    '2026/07/kent-pearl-star-IOT--300x300.webp',
    'RO + UV + UF + Alkaline + Copper + TDS Control + IoT',
  ],
  [
    'kent-sapphire-black',
    'KENT Sapphire -BLACK',
    25000,
    20500,
    '2026/07/kent-shappire--300x300.webp',
    'RO + UF + Inline UV + Alkaline + Copper + TDS Control',
  ],
  [
    'kent-sapphire-iot',
    'KENT Sapphire IoT',
    28000,
    21999,
    '2026/07/kent-shappire-IOT--300x300.webp',
    'RO + UF + UV + Alkaline + Copper + TDS Control + IoT',
  ],
  [
    'kent-sapphire-2',
    'KENT Sapphire-WHITE',
    25000,
    19999,
    '2026/04/kent-sapphire-white--300x300.webp',
    'RO + UF + Inline UV + Alkaline + Copper + TDS Control',
  ],
  [
    'kent-sterling-star-iot-black',
    'KENT Sterling Star IoT-BLACK',
    28000,
    28000,
    '2026/07/kent-sterling-IOT--300x300.webp',
    'Premium under-the-counter purification',
  ],
  [
    'kent-sterling-star-iot',
    'KENT Sterling Star IoT-WHITE',
    28000,
    20949,
    '2026/06/kent-sterling-IOT-white--300x300.webp',
    'Premium under-the-counter purification',
  ],
]
export const products = rows.map(([slug, name, mrp, price, img, p]) => ({
  slug,
  name,
  mrp,
  price,
  p,
  cat: 'ro',
  img: u(img),
  big: u(img.replace('-300x300', '-600x600')),
  brand: 'kent',
  save: mrp > price ? Math.round((1 - price / mrp) * 100) : 0,
  summary: `${name.replace(/-?\(?(BLACK|WHITE)\)?/i, '').trim()} uses multiple purification process of ${p} to remove all dissolved impurities, bacteria and viruses while retaining essential natural minerals.`,
  features: [
    'Purification: ' + p,
    'Retains essential natural minerals in purified water',
    'Trusted by about 1 crore satisfied consumers across India',
    'Free installation and 24 hours service from Aakash Pure Aqua Tech',
  ],
}))
// Full spec taken from the live Sapphire IoT page
Object.assign(
  products.find((x) => x.slug === 'kent-sapphire-iot'),
  {
    summary:
      'KENT Sapphire IoT is the most advanced RO water purifier that uses multiple purification processes of RO+UF+UV+Alkaline+Copper +TDS Control with advanced IoT intelligence that offers real-time display of water quality and filter life, along with timely notifications, automatic service call registration in case of any fault, and easy access to service and parts replacement history.',
    features: [
      'Most Advanced RO Water Purifier with RO + UF + UV + Alkaline + Copper + TDS Control',
      'IoT-Powered Smart Monitoring through Mobile App',
      'Makes drinking water 100% pure',
      'Retains essential natural minerals in purified water',
      'Purified water enriched with the goodness of Active Copper',
      'Provides alkaline water with pH 8.0–9.5',
      'Digital display for real-time purity and performance monitoring',
      'UV LED Light in the storage tank keeps purified water fresh and bacteria-free',
      'High purification capacity of 20 L/hr',
      '8L storage capacity',
      '1 Year Warranty + 3 Years Free Service',
      'Trusted by about 1 crore satisfied consumers across India',
    ],
    about: [
      'Intelligent RO + UF + UV + Alkaline + Copper + TDS Control purification delivers 100% pure, safe and healthy drinking water. It removes bacteria, viruses, chemicals, heavy metals and dissolved impurities such as arsenic, rust, pesticides and fluorides while meeting IS:10500 drinking water standards.',
      'IoT-powered smart monitoring provides real-time information on water quality, filter life and purifier performance on your mobile, with automatic service call registration and complete service and parts replacement history.',
      'Active Copper technology enriches the water with copper, and Alkaline technology delivers mineral-rich water with pH between 8.0 and 9.5. The UV LED light inside the storage tank prevents bacterial growth. Certified by BIS and NSF.',
    ],
    tech: [
      ['Model', 'KENT Sapphire IoT'],
      ['Application', 'Brackish / Tap / Municipal Corporation Water'],
      ['Product Code', '111177B'],
      ['Mounting', 'Wall Mounting / Table Top'],
      ['Body Material', 'ABS Food Grade Plastic'],
      ['Purification Capacity', '20 L/hr'],
      ['Storage Capacity', '8L'],
      ['Net Weight', '8.30 Kg'],
      ['Dimensions', '360 (L) × 320 (W) × 500 (H) mm'],
      ['Input Power Supply', 'Single Phase 250V AC, 50Hz'],
      ['Total Power Consumption', '60W'],
    ],
  },
)

// ---- extra detail used on the product page (from the website's FAQ and service text) ----
const stageInfo = {
  RO: 'Reverse Osmosis membrane removes dissolved impurities such as arsenic, rust, pesticides, fluorides and heavy metals.',
  UF: 'Ultra Filtration removes bacteria, cysts and suspended particles.',
  UV: 'UV purification removes harmful bacteria and viruses from the water.',
  'Inline UV': 'Inline UV disinfects the water as it flows through the purifier.',
  Alkaline: 'Delivers mineral-rich alkaline water with pH 8.0–9.5 that helps reduce acidity.',
  Copper: 'Enriches the purified water with the goodness of active copper.',
  'TDS Control': 'Maintains the desired TDS level and retains essential natural minerals in purified water.',
  IoT: 'IoT-powered smart monitoring shows water quality, filter life and service history on your mobile.',
  'Premium under-the-counter purification':
    'A premium under-the-counter water purification system that stays neatly out of sight.',
}
export const stages = (p) =>
  p
    .split('+')
    .map((s) => s.trim())
    .map((s) => [s === 'IoT' ? 'IoT Smart Monitoring' : s, stageInfo[s] || ''])
export const replaceGuide = [
  ['Sediment Filter', 'Every 3–6 months'],
  ['Carbon Filter', 'Every 6–12 months'],
  ['RO Membrane', 'Every 12–24 months'],
]
export const why = [
  'Free Water Quality & TDS Testing',
  'Professional Installation',
  'Genuine Spare Parts & Filters',
  'Affordable AMC Plans',
  'Fast After-Sales Support',
  'Domestic, Commercial & Industrial Water Solutions',
]
export const faq = [
  [
    'Do I need an RO water purifier?',
    'If your water TDS is above 500 ppm, or if you use borewell, tanker or hard water, an RO purifier is recommended. Our experts provide a free water quality check to help you choose the right purifier.',
  ],
  [
    'Does RO purification remove essential minerals?',
    'Modern RO systems with Mineralizer, Alkaline Filter or TDS Controller restore essential minerals like calcium and magnesium for healthier drinking water.',
  ],
  [
    'Can an RO purifier remove bacteria and viruses?',
    'Yes. Advanced RO systems with UV and UF purification effectively remove bacteria, viruses, cysts and other harmful microorganisms.',
  ],
  [
    'What maintenance does an RO water purifier require?',
    'Filter replacement, RO membrane inspection, storage tank cleaning, pump & electrical component checks and water quality testing.',
  ],
  [
    'Can one RO purifier work with borewell and municipal water?',
    'Yes. Most modern RO purifiers can treat borewell, municipal, tanker and mixed water supplies depending on the TDS level.',
  ],
]

// ---- more products, read from the website category pages ----
const mk = (cat, brand, slug, name, price, max, img, summary) =>
  products.push({
    slug,
    name,
    price,
    max,
    mrp: price,
    save: 0,
    cat,
    brand,
    summary,
    img: u(img),
    big: u(img.replace('-300x300', '')),
    features: [
      'Genuine ' + brandInfo[brand][0] + ' product supplied by Aakash Pure Aqua Tech',
      'Free installation and 24 hours service',
      'Free water quality & TDS testing',
      'Affordable AMC plans',
    ],
  })
mk(
  'alkaline',
  'zerob',
  'countertop-alkaline-water-machine',
  'COUNTERTOP ALKALINE WATER MACHINE',
  309000,
  0,
  '2026/03/1-1-1-300x300.webp',
  'The ZeroB Alkaline RO Water Purifier features a 10 LPH purification capacity, 8-litre storage tank, and an advanced RO + alkaline purification system.',
)
mk(
  'alkaline',
  'zerob',
  'under-sink-water-ionizer-zerob-hydrolife',
  'UNDER SINK WATER IONIZER - ZEROB HYDROLIFE',
  339000,
  0,
  '2026/03/5--300x300.webp',
  'This Under Sink Alkaline RO Water Purifier is a high-performance water purification system designed for homes and commercial kitchens.',
)
mk(
  'alkaline',
  'zerob',
  'wall-mount-11-plate-zerob-hydrolife',
  'WALL MOUNT- 11 PLATE - ZEROB HYDROLIFE',
  339000,
  0,
  '2026/03/1-10-300x300.webp',
  'The ZeroB Alkaline RO Water Purifier is a high-performance water purification system designed to deliver safe, healthy, and alkaline drinking water.',
)
// Conway SS water dispensers (price range = variants)
;[
  ['d14010nh', 'D14010NH', 56600, 136900, '2026/06/14010NH'],
  ['d140nn', 'D140NN', 49600, 129800, '2026/06/140N'],
  ['d1414nc', 'D1414NC', 55500, 81400, '2026/06/NC-305080'],
  ['d14314nhc', 'D14314NHC', 60200, 86100, '2026/06/NHC-305080'],
  ['d2-n', 'D2 N', 67300, 79100, '2026/03/IMG_6159'],
  ['d2020nc', 'D2020NC', 61400, 103800, '2026/06/NC-305080'],
  ['d20420nhc', 'D20420NHC', 67300, 109700, '2026/06/NHC-305080'],
  ['d222nh', 'D222NH', 28300, 40100, '2026/06/NH-305080'],
  ['d222nh-2', 'D222NH', 67300, 79100, '2026/06/IMG_6160'],
  ['d303nh', 'D303NH', 34200, 60200, '2026/06/NH-305080'],
  ['d3040nc', 'D3040NC', 69600, 132200, '2026/06/NC-305080'],
  ['d30540nhc', 'D30540NHC', 76700, 139200, '2026/06/NHC-305080'],
  ['d30n-2', 'D30N', 29500, 55500, '2026/06/NN-3050-80'],
  ['d504nh', 'D504NH', 40100, 82600, '2026/06/NH-305080'],
  ['d50n', 'D50N', 35400, 77900, '2026/06/NN-3050-80'],
  ['d701070nhc', 'D701070NHC', 107400, 187600, '2026/06/701070NHC'],
  ['d7070nc', 'D7070NC', 100300, 180500, '2026/06/7070NC'],
  ['d805nh', 'D805NH', 48400, 110900, '2026/06/NH-305080'],
  ['d80n', 'D80N', 41300, 103800, '2026/06/NN-3050-80'],
].forEach(([s, n, a, b, i]) =>
  mk(
    'dispenser',
    'conway',
    'conway-' + s,
    'Conway ' + n,
    a,
    b,
    i + '-300x300.jpeg',
    'Conway ' +
      n +
      ' stainless steel water dispenser. Multiple variants and options are available — contact us to choose the right model.',
  ),
)

// =====================================================================
// NEW PRODUCTS (from the website screenshots)
// Product photos are local files in /public/img/<folder>/<file>.png
// =====================================================================
const IMG = (import.meta.env?.BASE_URL || '/') + 'img/'
// add(cat, brand, folder, file, name, summary, opts)
//   opts.price = 0 or missing -> "Price on request"     opts.max   -> price range (price - max)
//   opts.mrp   -> shows "Save %"                        opts.v     -> View Product + Select Options buttons
//   opts.p     -> purification stages (shown on the product page)
//   opts.tech  -> specification table shown on the product page (use spec(`...`), see "PRODUCT SPECIFICATIONS" at the bottom)
const add = (cat, brand, folder, file, name, summary, { price = 0, max = 0, mrp = price, v = false, p, tech } = {}) => {
  const img = IMG + folder + '/' + file + '.png'
  products.push({
    slug: folder + '-' + file,
    name,
    summary,
    cat,
    brand,
    price,
    max,
    mrp,
    v,
    p,
    tech,
    np: !price,
    img,
    big: img,
    save: price && mrp > price ? Math.round((1 - price / mrp) * 100) : 0,
    features: [
      brand
        ? 'Genuine ' + brandInfo[brand][0] + ' product supplied by Aakash Pure Aqua Tech'
        : 'Supplied, installed and serviced by Aakash Pure Aqua Tech',
      'Free installation and 24 hours service',
      'Free water quality & TDS testing',
      'Affordable AMC plans',
    ],
  })
}

// ---- RO Water Purifiers > Aakash (screenshot 3) ----
const A = (file, name, summary, o) => add('ro', 'aakash', 'aakash', file, name, summary, o)
A(
  'alive',
  'ALIVE',
  'The Alive RO Water Purifier is designed to deliver safe, healthy, and great-tasting drinking water for homes using brackish water.',
  { price: 16500 },
)
A(
  'aqua-2090',
  'AQUA 2090',
  'AQUA 2090 is a domestic RO water purifier with selectable model options for clean everyday drinking-water use. It uses RO purification.',
  { price: 11499, v: true },
)
A(
  'aqua-9090',
  'AQUA 9090',
  'The Aqua 9090 Aqua Green RO Water Purifier combines advanced Reverse Osmosis (RO) technology with a stylish Aqua Green finish.',
  { price: 18500, v: true },
)
A(
  'aqua-crizel',
  'Aqua Crizel',
  'The Aqua Crizel RO Water Purifier combines advanced Reverse Osmosis (RO) technology with a stylish Aqua Green finish to deliver clean, safe drinking water.',
  { v: true },
)
A(
  'aqua-digi',
  'AQUA DIGI',
  'The Aqua Digi RO Water Purifier is designed to provide clean, safe, and great-tasting drinking water for homes using brackish water.',
  { v: true },
)
A(
  'aqua-flip',
  'AQUA FLIP',
  'The Aqua Flip RO Water Purifier is engineered to provide pure, safe, and refreshing drinking water for households using brackish water.',
  { price: 16500, v: true },
)
A(
  'aqua-fresh-ro-uv-black',
  'AQUA FRESH – RO+UV (BLACK)',
  'The Aqua Fresh RO + UV Water Purifier combines advanced RO and UV purification technologies to deliver clean, safe, and healthy drinking water.',
  { price: 11999, p: 'RO + UV' },
)
A(
  'aqua-innovica',
  'Aqua Innovica',
  'AQUA INNOVICA is a premium domestic RO water purifier designed for brackish water with TDS up to 3000 PPM.',
  { price: 16500, mrp: 21500, v: true },
)
A(
  'aqua-jade',
  'AQUA JADE',
  'The Aqua Jade RO Water Purifier is designed to provide pure, safe, and refreshing drinking water for households using brackish water.',
  { price: 11000, mrp: 13500, v: true },
)
A(
  'aqua-mars',
  'AQUA MARS',
  'The Aqua Mars RO Water Purifier is designed to provide safe, healthy, and great-tasting drinking water for homes using brackish water.',
  { price: 9999, mrp: 13000, v: true },
)
A(
  'aqua-neeo',
  'Aqua NEEO',
  'The Aqua Neeo RO + UV + Alkaline Water Purifier is designed to deliver pure, safe, and mineral-rich drinking water.',
  { price: 16500, v: true, p: 'RO + UV + Alkaline' },
)
A(
  'aqua-nine',
  'AQUA NINE',
  'The Aqua Nine Black RO Water Purifier is designed to provide clean, safe, and great-tasting drinking water for homes using brackish water.',
  { price: 13000, mrp: 16500, v: true },
)

// ---- UV Water Purifier (screenshot 4): the same 14 KENT models, copied under the "uv" category ----
products
  .filter((x) => x.cat === 'ro' && x.brand === 'kent')
  .forEach((x) => products.push({ ...x, slug: x.slug + '-uv', cat: 'uv', img: x.big }))

// ---- Gravity Water Purifier (screenshot 6) ----
const G = (brand, file, name, summary, o) => add('gravity', brand, 'gravity', file, name, summary, o)
G(
  'kent',
  'kent-gold',
  'KENT Gold',
  'KENT Gold UF Water Purifier is a non-electric, gravity-based water purifier featuring a 0.1-micron Ultra Filtration membrane that removes bacteria and cysts.',
  { price: 3300, mrp: 5999 },
)
G(
  'kent',
  'kent-gold-plus',
  'KENT Gold+',
  'KENT Gold Plus Gravity Water Purifier is a non-electric UF water purifier designed for tap and municipal low TDS water.',
  { price: 1099 },
)
G(
  'purella',
  'purella-gravity',
  'Purella GRAVITY',
  'Purella Gravity UF Water Purifier is a non-electric, gravity-based water purifier featuring a 20-litre storage capacity and advanced 3-stage UF filtration.',
  { price: 4000, mrp: 4500 },
)
G(
  'senco',
  'senco-uf-gravity',
  'SENCO UF GRAVITY WATER PURIFIER',
  'The Gravity Water Purifier – 25 Litre is a non-electric, gravity-based water purifier designed to provide safe and healthy drinking water.',
  { price: 4000, mrp: 4500 },
)
G(
  'zerob',
  'zerob-suraksha-plus-pro',
  'ZeroB Suraksha Plus Pro',
  'Safeguard your family against water-borne diseases. Suraksha Plus Pro is an easy-to-install water purifier without electricity with 4 stages.',
  { price: 2700, mrp: 3600 },
)

// ---- Commercial RO System (screenshot 7) ----
const C = (file, name, o) =>
  add(
    'industrial',
    null,
    'commercial',
    file,
    name,
    'View ' + name + ' product details, available options and pricing.',
    { v: true, ...o },
  )
C('100-lph-compact-system', '100 LPH COMPACT SYSTEM', { price: 89400 })
C('100-lph-ss-eco-auto', '100 LPH SS ECO AUTO', { price: 77000, max: 81200 })
C('1000-lph-ss-comfort-auto', '1000 LPH SS COMFORT AUTO', { price: 197700, max: 283900 })
C('1000-lph-ss-four-membrane-housing-auto', '1000 LPH SS FOUR MEMBRANE HOUSING AUTO', { price: 209200, max: 307500 })
C('1000-lph-ss-single-membrane-housing-auto', '1000 LPH SS SINGLE MEMBRANE HOUSING AUTO', {
  price: 208500,
  max: 294800,
})
C('2000-lph-ss-classic-auto', '2000 LPH SS CLASSIC AUTO', { price: 296800, max: 441500 })
C('2000-lph-ss-classic-auto-2mh', '2000 LPH SS CLASSIC AUTO - 2MH', { price: 304900, max: 450400 })
C('250-lph-ss-brook-auto', '250 LPH SS BROOK AUTO', { price: 145900, max: 186000 })
C('250-lph-ss-cim-dispenser', '250 LPH SS CIM DISPENSER', { price: 265600, max: 304600 })
C('250-lph-ss-comfort-auto', '250 LPH SS COMFORT AUTO') // price was cut off in the screenshot -> "Price on request"
C('250-lph-ss-eco-auto', '250 LPH SS ECO AUTO') // price was cut off in the screenshot -> "Price on request"
C('3000-lph-ss-classic-auto', '3000 LPH SS CLASSIC AUTO') // price was cut off in the screenshot -> "Price on request"

// ---- RO Water Purifiers > A.O. Smith (screenshot 1: 3 of 22 products were visible) ----
const S = (file, name, summary, o) => add('ro', 'aosmith', 'aosmith', file, name, summary, o)
S(
  'ao-smith-x3',
  'AO SMITH X3',
  'The A.O. Smith X3 RO Water Purifier features a 6-stage 100% RO purification system with MIN-TECH Mineraliser Technology.',
  { price: 13000 },
)
S(
  'pro-planet-p3',
  'Pro Planet P3',
  'Powered with the path-breaking RO+Silver Charged Membrane Technology, ProPlanet P3 gives you 100% RO purified, Baby-Safe water.',
  { price: 22500, mrp: 25000 },
)
S(
  'pro-planet-p3-pro',
  'Pro Planet P3 Pro',
  'A. O. Smith ProPlanet P3 Pro is an advanced 8-stage RO water purifier with Silver Charged Membrane Technology (SCMT).',
  { price: 23000 },
)

// ---- RO Water Purifiers > ZeroB (screenshot 2: 3 of 7 products were visible) ----
const Z = (file, name, summary, o) => add('ro', 'zerob', 'zerob', file, name, summary, o)
Z(
  'kitchenmate-ro-uf-undersink',
  'KitchenMate RO + UF (Undersink)',
  'Sleek and compact RO Water Purifier for your modular kitchen. ZeroB Kitchenmate is a sleek and stylish water purifier.',
  { price: 23990 },
)
Z(
  'kitchenmate-ro-undersink-active-silver',
  'KitchenMate RO Undersink Active silver Technology',
  'The ZeroB Kitchenmate RO+ESS Water Purifier is a sleek under-the-sink water purifier designed for modern modular kitchens.',
  { price: 26990 },
)
Z(
  'power-flow-50lph',
  'Power Flow 50LPH',
  'Experience the perfect balance of elegant design and powerhouse performance with the Power Flow RO Water Purifier.',
  { price: 50991, mrp: 59999 },
)

// ---- RO Water Purifiers > Sarwan's Wave (screenshot 3: 3 products were visible) ----
const W = (file, name, o) =>
  add(
    'ro',
    'wave',
    'wave',
    file,
    name,
    'The 5G PRO Hot, Ambient & Cold Alkaline Water Purifier is a premium RO water purifier designed to deliver safe drinking water.',
    o,
  )
W('5g-pro-black', '5G PRO Hot, Ambient & Cold Alkaline Water Purifier-BLACK', { price: 25600, mrp: 29400 })
W('5g-pro-blue', '5G PRO Hot, Ambient & Cold Alkaline Water Purifier-BLUE', { price: 25600, mrp: 29400 })
W('5g-pro-maroon', '5G PRO Hot, Ambient & Cold Alkaline Water Purifier-MAROON', { price: 25600, mrp: 29400 })

// ---- RO Water Purifiers > Aquaguard (new brand, screenshot 4: 3 products were visible) ----
const Q = (file, name, summary, o) => add('ro', 'aquaguard', 'aquaguard', file, name, summary, { p: 'RO + UV', ...o })
Q(
  'designo-utc',
  'Aquaguard Designo UTC',
  'The Aquaguard Aspire Designo UTC RO+UV is a premium under-the-counter water purifier that combines 9-stage RO+UV purification.',
  { price: 26299 },
)
Q(
  'enrich-hyde',
  'Aquaguard Enrich Hyde',
  'Aquaguard Enrich Hyde is a premium under-the-counter water purifier with an integrated single-unit design and advanced 10-stage RO+UV purification.',
  { price: 20999 },
)
Q(
  'aspire-blaze',
  'Aquaguard Aspire Blaze',
  'The Aquaguard ASPIRE Blaze Smart Purifier (RO+UV) is a premium smart water purifier designed to deliver safe, healthy, and convenient drinking water.',
  { price: 24999 },
)

// =====================================================================
// PRODUCT SPECIFICATIONS  (shown as a table on the product page, right side)
// Paste the spec text of a product exactly like below (label <TAB> value, one per line) and
// call setSpec("<product slug>", spec(`...`)). Products without a sheet show a basic table.
// Slug = folder + "-" + file, e.g. "aakash-alive", "aosmith-pro-planet-p3", "wave-5g-pro-black".
// =====================================================================
const spec = (t) =>
  t
    .trim()
    .split('\n')
    .map((l) => l.split('\t').map((s) => s.trim()))
    .filter((r) => r.length > 1)
const setSpec = (slug, rows) => {
  const p = products.find((x) => x.slug === slug)
  if (p) p.tech = rows
}

setSpec(
  'aakash-alive',
  spec(`
Model	ALIVE
Application	Suitable for Brackish Water
Filter Life	Approx. 3000 Litres / 6 Months
Filters	Sediment, Pre Carbon, Post Carbon
Float	Membrella
FR	Membrella / KFL
Inline Set	Membrella
Input Voltage	100–300V AC (50Hz)
Installation	Counter Top
Maximum Operating TDS	Up to 3000 PPM
Membrane Type	Thin Film Composite (TFC)
Minimum Inlet Pressure / Temperature	0.3 kg/cm², 10°C
Operating Voltage	24V DC
Product Dimensions	495 (H) × 250 (W) × 350 (L) mm
Packing Dimensions	540 (H) × 295 (W) × 385 (L) mm
Purification Capacity	12 Litres Per Hour
Recovery Rate	More than 40% at 27°C ± 2°C
SMPS	Membrella
Solenoid Valve	Membrella / SLX
Storage Capacity	9 Litres
Technology	Reverse Osmosis (RO) System
Total Power Consumption	50 W
Tubing	5 Metres
System Weight	7.3 kg (Approx.)
Country of Origin	India
`),
)

// =====================================================================
// VARIANTS  (dropdown under the product image: Membrane for Commercial RO, Model for SS Water Dispensers)
// Picking an option updates the specification table (and the price, when the option has its own price).
//
//   setVariants("<product slug>", "<label>", [ "Option name", { name, price, max, mrp, code, image, spec: [[label, value], ...] }, ... ])
//     name  = text shown in the dropdown            price/mrp/max = optional price for this option (otherwise the product price shows)
//     code  = optional line shown under the dropdown (e.g. "2801J")     image = optional photo for this option
//     spec  = rows that REPLACE / ADD to the product's spec table only for this option
//   Slug = "commercial-<file>" for Commercial RO, "conway-<id>" for dispensers (see the product lists above).
// =====================================================================
const setVariants = (slug, label, options) => {
  const p = products.find((x) => x.slug === slug)
  if (p) p.variants = { label, options: options.map((o) => (typeof o === 'string' ? { name: o } : o)) }
}
const MEMBRANES = ['Ploymax BW-RU – 4021', 'LCM BW – 4021']
const DISPENSER_MODELS = [
  'ONLINE',
  'UV+OZONE',
  'ONLINE + UV',
  '+ RO 80 LPH',
  '+ RO 80 LPH + UV',
  '+ RO 120 LPH',
  '+ RO 120 LPH + UV',
]
// every Commercial RO product gets the Membrane list, every SS dispenser gets the Model list – override per product below

// ---- Commercial RO: several option groups under the image (Membrane / Panel / Pump) ----
// setConfigs(slug, [ { label, options: [ "Name" | { name, price, max, mrp, code, image, spec: [[label, value], ...] } ] }, ... ])
// Every group becomes a dropdown (left, fixed); the chosen options become the first rows of the spec table (right) and an
// option's `spec` rows replace / add rows for that choice only. Add a model's real options below as you get them.
const setConfigs = (slug, groups) => {
  const p = products.find((x) => x.slug === slug)
  if (p)
    p.configs = groups.map((g) => ({
      label: g.label,
      options: g.options.map((o) => (typeof o === 'string' ? { name: o } : o)),
    }))
}
const PANELS = ['ASTERO', 'INFINITY', 'INITIATIVE']
// 1000 LPH SS COMFORT AUTO – options as shown on aakashaquatech.in
const PUMPS_1000 = [
  'CRI MTC- 2E/18SR (3.0 HP) - I PHASE',
  'CRI MTC- 2E/18TR (3.0 HP) - III PHASE',
  'CRI MTC- 2E/22TR (3.0 HP) - III PHASE',
  'CRI MVC- 2/18SR (3.0 HP) - I PHASE',
  'CRI MVC- 2/18TR (3.0 HP) - III PHASE',
  'CRI MVC- 2/22TR (3.0 HP) - III PHASE',
  'GRUNDFOS CRI 3-23 - 3.0 HP - III PHASE',
].map((name) => ({
  name,
  // single phase runs on 230 V; three phase pumps need a 415 V supply
  spec: [['Input Voltage', name.includes('III PHASE') ? '415 VOLT AC (50Hz) – 3 PHASE' : '230 VOLT AC (50Hz)']],
}))
products
  .filter((x) => x.cat === 'industrial')
  .forEach((x) => setConfigs(x.slug, [{ label: 'Membrane', options: MEMBRANES }]))
setConfigs('commercial-1000-lph-ss-comfort-auto', [
  { label: 'Membrane', options: ['FILMTEC BW 30 PRO -365 - 8040 MEMBRANE'] },
  {
    label: 'Panel',
    options: [
      { name: 'ASTERO' },
      { name: 'INFINITY' },
      { name: 'INITIATIVE', code: '3007YAF', spec: [['Panel Model', 'RO PLUS (1-1)']] },
    ],
  },
  { label: 'Pump', options: PUMPS_1000 },
])
products.filter((x) => x.cat === 'dispenser').forEach((x) => setVariants(x.slug, 'Model', DISPENSER_MODELS))

// Spec sheets taken from the live product pages (the selected Membrane / Model row is added on top automatically)
setSpec(
  'commercial-100-lph-compact-system',
  spec(`
Model	COMFORTABLE (CLOSED) SYSTEM
Category	MINI COMMERCIAL SYSTEM
Technology	REVERSE OSMOSIS SYSTEM
Filter Housing 20"	2 NOS
Filter	2
High Pressure Pump	CRI CLaRO 100 (1 HP) / ALGO -1HP
`),
)
setSpec(
  'conway-d14010nh',
  spec(`
Net Weight in Kg (Approx.)	75
Number of Power Cord	15 Amps 1 number.
Power Supply (AC 50 Hz)	180 to 260 Volts
Heater Power in Watts	2000 watts
MOC – Housing SS 304	Stainless Steel – 0.8 mm Sheet
MOC – Normal Water Tank	LLDPE
MOC – Hot Water Tank SS 304	Stainless Steel – 0.8 mm Sheet
`),
)

setSpec(
  'commercial-1000-lph-ss-comfort-auto',
  spec(`
Model	1000 LPH SS COMFORT AUTO
Input Voltage	230 VOLT AC (50Hz)
Vessel	1354- 2 NOS (PURE STUDIO)
Multiport Valve	25 NB- TMF- 2 NOS (UKL / INITIATIVE)
Pebbles	2 BAG
`),
)

/* strikethrough price (MRP) for every product – see pricing.js */
products.forEach(applyMrp)
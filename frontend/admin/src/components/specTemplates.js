// Default specification keys for the "Fill default keys" button in the product form.
// [key, example shown as the grey placeholder in the value box]. Edit freely: add, remove or rename keys here.
//
// Where the keys come from:
//  - Domestic RO, SS Dispenser, Commercial RO: the spec sheets already used on the site (src/data.js, copied from aakashaquatech.in)
//    and the labels used in your own product descriptions.
//  - Heat Pump, Water Treatment Plant (softner, iron, sand, vessel, SS tank, DM plant) and Spares: the live pages show only a
//    few rows, so these use the usual industry keys for that product type.

const DOMESTIC = [
  ['Model', 'ALIVE'],
  ['Application', 'Suitable for Brackish Water'],
  ['Technology', 'Reverse Osmosis (RO) System'],
  ['Purification Capacity', '12 Litres Per Hour'],
  ['Storage Capacity', '9 Litres'],
  ['Filters', 'Sediment, Pre Carbon, Post Carbon'],
  ['Filter Life', 'Approx. 3000 Litres / 6 Months'],
  ['Membrane Type', 'Thin Film Composite (TFC)'],
  ['Maximum Operating TDS', 'Up to 3000 PPM'],
  ['Recovery Rate', 'More than 40% at 27°C ± 2°C'],
  ['Minimum Inlet Pressure / Temperature', '0.3 kg/cm², 10°C'],
  ['Input Voltage', '100–300V AC (50Hz)'],
  ['Operating Voltage', '24V DC'],
  ['Total Power Consumption', '50 W'],
  ['Installation', 'Counter Top / Wall Mounting'],
  ['Body Material', 'ABS Food Grade Plastic'],
  ['Product Dimensions', '495 (H) × 250 (W) × 350 (L) mm'],
  ['Packing Dimensions', '540 (H) × 295 (W) × 385 (L) mm'],
  ['Net Weight', '7.3 kg (Approx.)'],
  ['Warranty', '1 Year'],
  ['Country of Origin', 'India'],
];

// gravity purifiers and pitchers: no power, no pump, no TDS recovery figures
const GRAVITY = [
  ['Model', ''],
  ['Application', 'Suitable for municipal / tap water'],
  ['Technology', 'Gravity based purification'],
  ['Storage Capacity', '10 Litres'],
  ['Filters', 'Sediment, Carbon, Ceramic'],
  ['Filter Life', 'Approx. 3000 Litres'],
  ['Installation', 'Counter Top'],
  ['Body Material', 'Food Grade Plastic'],
  ['Product Dimensions', ''],
  ['Net Weight', ''],
  ['Warranty', '1 Year'],
  ['Country of Origin', 'India'],
];

const DISPENSER = [
  ['Model', 'Conway D14010NH'],
  ['Flow Rate (Liters / Hour)', '350 LPH'],
  ['Storage Tank – Normal Water', '140 Liters'],
  ['Storage Tank – Hot Water', '10 Liters'],
  ['No. of Faucets', '5'],
  ['Heater Power in Watts', '2000 watts'],
  ['Power Supply (AC 50 Hz)', '180 to 260 Volts'],
  ['Number of Power Cord', '15 Amps 1 number'],
  ['MOC – Housing SS 304', 'Stainless Steel – 0.8 mm Sheet'],
  ['MOC – Normal Water Tank', 'LLDPE'],
  ['MOC – Hot Water Tank SS 304', 'Stainless Steel – 0.8 mm Sheet'],
  ['Net Weight in Kg (Approx.)', '75'],
  ['Warranty', '1 Year'],
];

const COMMERCIAL = [
  ['Model', '500 LPH SS COMFORT AUTO'],
  ['Category', 'Commercial RO System'],
  ['Technology', 'Reverse Osmosis System'],
  ['Capacity', '500 LPH'],
  ['Membrane', 'FILMTEC BW 30 PRO 4040 (2 NOS)'],
  ['Panel', 'INITIATIVE'],
  ['High Pressure Pump', 'CRI MTC-2E/15SR (2.0 HP) – I PHASE'],
  ['Filter Housing 20"', '2 NOS'],
  ['Filter', '2'],
  ['Vessel', '1354 – 2 NOS'],
  ['Multiport Valve', '25 NB – TMF – 2 NOS'],
  ['Pebbles', '2 BAG'],
  ['Input Voltage', '230 VOLT AC (50Hz)'],
  ['Material of Construction', 'SS 304'],
  ['Warranty', '1 Year'],
];

const HEAT_PUMP = [
  ['Model', 'HPA 120'],
  ['Capacity (Litres Per Day)', '12000'],
  ['Heating Capacity (kW)', ''],
  ['Power Input (kW)', ''],
  ['COP', ''],
  ['Power Supply', '415 V AC, 50 Hz, 3 Phase'],
  ['Refrigerant', 'R410A'],
  ['Compressor', ''],
  ['Water Outlet Temperature', 'Up to 55°C'],
  ['Operating Ambient Temperature', ''],
  ['Storage Tank Capacity', ''],
  ['Tank Material', 'SS 304'],
  ['Product Dimensions', ''],
  ['Net Weight', ''],
  ['Warranty', ''],
];

const TREATMENT = [
  ['Model', ''],
  ['Flow Rate', '1000 LPH'],
  ['Vessel Size', '1054'],
  ['Media', ''],
  ['Valve', ''],
  ['Inlet / Outlet Size', ''],
  ['Operating Pressure', ''],
  ['Power Supply', ''],
  ['Material of Construction', ''],
  ['Warranty', ''],
];

const SOFTNER = [
  ['Model', ''],
  ['Flow Rate', '1000 LPH'],
  ['Vessel Size', '1054'],
  ['Resin Type', 'Cation Resin'],
  ['Resin Quantity', ''],
  ['Valve Type', 'Automatic Multiport Valve'],
  ['Regeneration', 'Time / Volume based'],
  ['Brine Tank Capacity', ''],
  ['Inlet / Outlet Size', ''],
  ['Operating Pressure', ''],
  ['Power Supply', '230 V AC, 50 Hz'],
  ['Warranty', ''],
];

const FILTER_PLANT = [
  ['Model', ''],
  ['Flow Rate', '1000 LPH'],
  ['Vessel Size', '1054'],
  ['Filter Media', 'Sand, Gravel'],
  ['Valve Type', 'Manual / Automatic Multiport Valve'],
  ['Backwash', ''],
  ['Inlet / Outlet Size', ''],
  ['Operating Pressure', ''],
  ['Material of Construction', 'FRP'],
  ['Warranty', ''],
];

const VESSEL = [
  ['Model', '1054'],
  ['Diameter', '10 inch'],
  ['Height', '54 inch'],
  ['Top Opening', '2.5 inch'],
  ['Material', 'FRP with HDPE liner'],
  ['Working Pressure', '150 PSI'],
  ['Brand', 'Pentair'],
  ['Warranty', ''],
];

const TANK = [
  ['Model', ''],
  ['Capacity', '1000 Liters'],
  ['Material', 'SS 304'],
  ['Sheet Thickness', ''],
  ['Diameter', ''],
  ['Height', ''],
  ['Type', 'Vertical / Horizontal'],
  ['Warranty', ''],
];

const DM_PLANT = [
  ['Model', 'CAMB 100'],
  ['Capacity', ''],
  ['Cation Resin', ''],
  ['Anion Resin', ''],
  ['Mixed Bed', ''],
  ['Vessel', ''],
  ['Outlet Conductivity', ''],
  ['Regeneration', 'Manual / Automatic'],
  ['Power Supply', ''],
  ['Warranty', ''],
];

const SPARES = [
  ['Part Type', 'Filter / Membrane / Pump / SMPS'],
  ['Compatible With', 'All RO water purifiers'],
  ['Brand', ''],
  ['Size / Capacity', ''],
  ['Material', ''],
  ['Warranty', ''],
];

const GENERIC = [
  ['Model', ''],
  ['Brand', ''],
  ['Product Dimensions', ''],
  ['Net Weight', ''],
  ['Warranty', ''],
  ['Country of Origin', 'India'],
];

const has = (text, ...words) => words.some((w) => text.includes(w));

/** Picks the key set from the product's category (and subcategory). Returns { label, rows: [[key, example], ...] }. */
export function specTemplateFor(categoryName = '', subcategoryName = '') {
  const c = String(categoryName).toLowerCase();
  const s = String(subcategoryName).toLowerCase();
  const all = `${c} ${s}`;
  if (has(c, 'dispenser')) return { label: 'SS Water Dispenser', rows: DISPENSER };
  if (has(c, 'commercial', 'industrial')) return { label: 'Commercial RO', rows: COMMERCIAL };
  if (has(c, 'heat')) return { label: 'Heat Pump', rows: HEAT_PUMP };
  if (has(c, 'spare')) return { label: 'Spares', rows: SPARES };
  if (has(c, 'treatment', 'plant')) {
    if (has(s, 'soft')) return { label: 'Softner', rows: SOFTNER };
    if (has(s, 'iron', 'sand')) return { label: 'Filter plant', rows: FILTER_PLANT };
    if (has(s, 'vessel', 'frp')) return { label: 'FRP Vessel', rows: VESSEL };
    if (has(s, 'tank')) return { label: 'SS Tank', rows: TANK };
    if (has(s, 'dm')) return { label: 'DM Plant', rows: DM_PLANT };
    return { label: 'Water Treatment Plant', rows: TREATMENT };
  }
  if (/domestic|\bro\b/.test(c)) {
    if (has(s, 'gravity', 'alkaline', 'pitcher')) return { label: 'Gravity / Alkaline', rows: GRAVITY };
    return { label: 'Domestic RO', rows: DOMESTIC };
  }
  if (has(all, 'gravity', 'alkaline')) return { label: 'Gravity / Alkaline', rows: GRAVITY };
  return { label: 'General', rows: GENERIC };
}
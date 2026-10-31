// Spares: tabs + products, taken from https://aakashaquatech.in/spares/
const IMG = 'https://aakashaquatech.in/wp-content/uploads/2026/05/'
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// [key, label shown in the left list]
export const spareTabs = [
  ['inline', 'INLINE FILTER CARTRIDGE'],
  ['alkaline', 'ALKALINE FILTER'],
  ['membrane', 'MEMBRANE ELEMENT'],
  ['prefilter', 'PRE FILTER HOUSING'],
  ['memhousing', 'MEMBRANE HOUSING'],
  ['float', 'FLOAT VALVE'],
  ['smps', 'SMPS'],
  ['booster', 'BOOSTER PUMP'],
  ['teflon', 'TEFLON TAPE'],
  ['uvled', 'UV LED OLIVAR'],
  ['solenoid', 'SOLENOID VALVE'],
  ['pp', 'PP SPUN FILTER'],
  ['kit', 'REPLACABLE FILTER CARTRIDGE KIT'],
  ['uvchamber', 'UV CHAMBER'],
  ['mineral', 'MINERAL CARTRIDGE'],
  ['uf', 'UF MEMBRANE'],
]

// [tab, product name, image file, price, max price (only when the live site shows a range)]
const rows = [
  ['inline', 'CYCLONE - INLINE FILTER CARTRIDGE', 'Untitled-4-03-300x300.png', 499],
  ['inline', 'STORM - INLINE FILTER CARTRIDGE', 'Untitled-4-02-300x300.png', 599],
  ['inline', 'THUNDER - INLINE FILTER CARTRIDGE', 'Untitled-4-01-300x300.png', 699],
  ['inline', 'VOLCANO - INLINE FILTER CARTRIDGE', 'VOLCANO-300x300.jpg', 699],
  ['inline', 'TORNADO - INLINE FILTER CARTRIDGE', 'TORNADO-300x300.jpg', 799],

  ['alkaline', 'CYCLONE - ALKALINE FILTER', 'Cyclone20Alkaline20Inline-300x300.png', 1499],
  ['alkaline', 'STORM - ALKALINE FILTER', 'Storm20Alkaline20Inline-300x300.png', 1699],
  ['alkaline', 'THUNDER - ALKALINE FILTER', 'Thunder20Alkaline20Inline-300x300.png', 1999],
  ['alkaline', 'CYCLONE 3 IN 1 COPPER ALKALINE ZINC - ALKALINE FILTER', 'Copper20Alkaline20Inline-300x300.png', 1999],

  ['membrane', 'CYCLONE - MEMBRANE ELEMENT', 'membrane20cyclone208020GPD20new20color-300x300.png', 1999, 2999],
  ['membrane', 'STORM - MEMBRANE ELEMENT', 'MEMBRANE20Storm2080-300x300.png', 2499, 3999],
  ['membrane', 'THUNDER - MEMBRANE ELEMENT', 'Membraine20Thunder2080-300x300.png', 2999],

  ['prefilter', 'STORM - PRE FILTER HOUSING', 'Untitled-10-04-300x300.png', 2999],
  ['prefilter', 'CYCLONE - PRE FILTER HOUSING', 'cyclone20bowl-300x300.jpg', 699],

  ['memhousing', 'CYCLONE - MEMBRANE HOUSING', 'Strom20Membrane20housing-300x300.png', 499],
  ['memhousing', 'THUNDER - MEMBRANE HOUSING', 'Untitled-5-01-300x300.png', 599],

  ['float', 'CYCLONE - FLOAT VALVE', 'Untitled-3-06-02-300x300.png', 299],
  ['float', 'STORM - FLOAT VALVE', 'Untitled-3-06-03-300x300.png', 299],
  ['float', 'THUNDER - FLOAT VALVE', 'Untitled-3-06-01-300x300.png', 299],

  ['smps', 'THUNDER - SMPS', 'Untitled-12-02-300x300.png', 999],
  ['smps', 'TORNADO - SMPS', 'TORNADO-1-300x300.jpg', 1199],

  ['booster', 'CYCLONE - BOOSTER PUMP', 'Cyclone-300x300.png', 2699],
  ['booster', 'STORM - BOOSTER PUMP', 'Storm2010020new-300x300.png', 2999],
  ['booster', 'THUNDER - BOOSTER PUMP', 'Thunder20300-300x300.png', 3499, 4599],
  ['booster', 'VOLCANO - BOOSTER PUMP', 'VOLCANO_PUMP.481-300x300.png', 3299],

  ['teflon', 'THUNDER - TEFLON TAPE', 'Asset203-100-300x300.png', 39],
  ['uvled', 'UV LED OLIVAR - UV LED OLIVAR', 'uv20led-300x300.png', 249],
  ['solenoid', 'STORM - SOLENOID VALVE', 'Untitled-13-02-300x300.png', 599],

  ['pp', 'CYCLONE - PP SPUN FILTER', 'Cyclone20PP-300x300.png', 249],
  ['pp', 'STORM - PP SPUN FILTER', 'Strom20PP-300x300.png', 299, 699],
  ['pp', 'THUNDER - PP SPUN FILTER', 'Thunder20PP-300x300.png', 349],

  ['kit', 'THUNDER - REPLACABLE FILTER CARTRIDGE KIT', 'Thunder20Replacable20Filter-300x300.png', null], // no price on the live site

  ['uvchamber', 'STORM - UV CHAMBER', 'UV20Chamber20stroma-300x300.png', 599],
  ['uvchamber', 'THUNDER - UV CHAMBER', 'Thunder20UV20Chamber-300x300.png', 799],

  ['mineral', 'Mineral Cartridge 4 Inch - MINERAL CARTRIDGE', 'mineral20cartridge20420Inch-300x300.png', 299, 499],
  ['mineral', 'Mineral Cartridge 8 Inch - MINERAL CARTRIDGE', 'mineral20cartridge-300x300.png', 299, 499],

  ['uf', 'Olivar - UF MEMBRANE', 'uf20membrane-300x300.png', 599],
]

export const spares = rows.map(([cat, name, file, price, max]) => ({
  cat,
  name,
  img: IMG + file,
  price,
  max,
  big: (IMG + file).replace(/-300x300(?=\.\w+$)/, ''), // full-size image for the detail page (falls back to the 300px one)
  slug: slug(name),
  type: (spareTabs.find((t) => t[0] === cat) || [])[1] || 'Spare',
  url: 'https://aakashaquatech.in/product/' + slug(name) + '/',
}))

export const spareBySlug = (s) => spares.find((p) => p.slug === s)
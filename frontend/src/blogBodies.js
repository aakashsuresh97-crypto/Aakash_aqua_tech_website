/* =====================================================================
   BLOG POST TEXT for the posts that open INSIDE the app (merged into BLOG_POSTS by blogData.js).
   Key = the post's URL path.  Section = { h: heading, p: [paragraphs], listTitle?: 'small title', list?: ['bullet', ...] }
   Headings / points follow the live posts; to match the WordPress wording 1:1, just paste the exact text here.
===================================================================== */
const CTA = {
  h: 'Need help choosing or servicing your purifier?',
  list: ['Installation', 'Filter replacement', 'Water quality checks', 'Regular maintenance'],
}
const IMG = (n) => `https://aakashaquatech.in/wp-content/uploads/2026/06/${n}`

export const BODIES = {
  '/why-tds-matters-in-drinking-water': {
    image: IMG('IMG_7600-1-1024x538.png'),
    body: {
      lead: 'TDS helps identify dissolved impurities and choose the right RO purifier for taste, safety, and daily use.',
      sections: [
        {
          h: 'What is TDS?',
          p: [
            'TDS means total dissolved solids. The reading covers dissolved minerals, salts and other substances in your water.',
            'It is measured in PPM and shows whether your water needs basic filtration or stronger purification.',
          ],
        },
        {
          h: 'Why TDS affects taste',
          p: ['Very high TDS can make water taste salty, bitter or heavy, while very low TDS can make it taste flat.'],
          list: ['Very high TDS: salty, bitter or heavy', 'Very low TDS: flat taste', 'A good purifier improves both safety and taste'],
        },
        {
          h: 'How RO helps with high TDS',
          p: [
            'RO membranes are built to reduce dissolved impurities. That makes RO systems useful for borewell and tanker water, which often has higher TDS than normal.',
          ],
        },
        {
          h: 'Do not depend only on taste',
          p: [
            'Water can look clear and still contain high dissolved solids. A TDS meter reading, together with what you know about your water source, helps you choose the right purifier.',
          ],
        },
        {
          h: 'Aakash Aqua Tech support',
          p: [
            'Our technicians can test your water, explain the reading, and recommend a purifier or service plan based on your actual water quality.',
          ],
        },
      ],
      cta: CTA,
    },
  },

  '/ro-vs-uv-vs-uf-water-purifier-which-one-is-best': {
    image: IMG('IMG_7601-1024x538.png'),
    body: {
      lead: 'Choose RO for high TDS, UV for microbial safety, UF for low-TDS filtration, and combined systems for broader protection.',
      sections: [
        {
          h: 'What RO purification does',
          p: [
            'RO purification is useful when water has dissolved salts, hardness or higher TDS. Water passes through a membrane that reduces dissolved impurities and improves taste.',
            'RO is commonly preferred for borewell, tanker and mixed-source water.',
          ],
        },
        {
          h: 'What UV purification does',
          p: [
            'UV uses ultraviolet light to help deactivate microorganisms. It helps where microbial risk is a concern, but it does not reduce dissolved salts or hardness by itself.',
          ],
        },
        {
          h: 'What UF purification does',
          p: [
            'UF works without electricity in many designs. It helps reduce suspended particles and some microbial impurities.',
            'It suits low-TDS water, but it is not a replacement for RO when dissolved salts are high.',
          ],
        },
        {
          h: 'Which purifier should you choose?',
          p: ['The right choice depends on your water source and TDS level.'],
          listTitle: 'Quick guide',
          list: [
            'High TDS (borewell / tanker): RO',
            'Microbial safety: UV',
            'Low-TDS water, suspended particles: UF',
            'Broader protection: RO + UV + UF together',
          ],
        },
        {
          h: 'Get water quality checked',
          p: [
            'Aakash Aqua Tech can check your water condition and suggest a suitable purifier capacity and technology, instead of one model for every home.',
          ],
        },
      ],
      cta: CTA,
    },
  },

  '/signs-your-ro-filter-needs-replacement': {
    image: IMG('IMG_7602-1024x538.png'),
    body: {
      lead: 'Replace RO filters when taste, smell, flow, TDS, or filter life indicates reduced performance.',
      sections: [
        {
          h: 'Bad taste or smell in water',
          p: [
            'A sudden change in water taste or smell is one of the easiest signs to notice. Pre-carbon and post-carbon filters help with taste and odour, and when they wear out, water can seem dull, salty or off.',
          ],
        },
        {
          h: 'Slow water filling',
          p: [
            'If the storage tank fills much more slowly than usual, filters may be clogged or the membrane may have pressure problems. Low inlet pressure can cause the same symptom, so a technician should check the full system.',
          ],
        },
        {
          h: 'Higher TDS reading',
          p: [
            'A rising TDS level after purification can mean the membrane is losing efficiency. Taste alone is not a reliable way to judge TDS, so use a proper meter for a clear picture of purifier health.',
          ],
        },
        {
          h: 'Visible dirt or filter age',
          p: [
            'Replace a filter when it passes its recommended service life, or when water looks cloudy before purification. Old filters strain the pump and membrane, so replacement should not be delayed.',
          ],
        },
        {
          h: 'Professional replacement is safer',
          p: [
            'We recommend genuine compatible filters and a water quality check after replacement. Proper installation prevents leakage, loose fittings and poor purification.',
          ],
        },
      ],
      cta: CTA,
    },
  },

  '/how-often-should-you-service-your-ro-water-purifier': {
    image: IMG('IMG_7603-1024x538.png'),
    body: {
      lead: 'Service your home RO purifier every three to six months, and check it sooner when taste, flow, or TDS changes.',
      sections: [
        {
          h: 'Why regular RO service matters',
          p: [
            'Your purifier runs every day to remove dissolved impurities, sediment, taste problems and contaminants. Filters, membrane, tubing and the storage tank all need timely attention.',
            'Regular service supports taste, steady flow and safe daily performance.',
          ],
        },
        {
          h: 'Ideal service interval for homes',
          p: [
            'A basic check every three to six months is good practice for most homes. Sediment and carbon filters may need earlier replacement with heavy dust, odour or high usage.',
            'The membrane usually lasts longer. Assess it through TDS readings and flow performance, instead of guessing.',
          ],
        },
        {
          h: 'Signs your purifier needs service',
          p: ['It is better to book service early rather than waiting until the purifier stops completely.'],
          listTitle: 'Watch out for',
          list: ['Slow water flow', 'Unusual taste', 'Leakage', 'Pump noise', 'Frequent tank emptying', 'Sudden TDS changes'],
        },
        {
          h: 'How Aakash Aqua Tech helps',
          p: ['Our technicians check these points, so service is reliable and you avoid unnecessary part replacement.'],
          list: ['Filter condition', 'Water pressure', 'TDS', 'Membrane performance', 'Leakage points', 'Electrical safety'],
        },
      ],
      cta: CTA,
    },
  },

  '/tips-to-prevent-waterborne-diseases-aakash-water-purifier': {
    image: 'https://aakashaquatech.in/wp-content/uploads/2026/06/IMG_7604.png',
    body: {
      lead: 'A strong immune system helps your body fight illness. Stress, poor food, lack of sleep and dehydration can weaken it, but small daily habits make a big difference. Here are 5 easy ways to boost immunity naturally.',
      sections: [
        {
          h: 'Get proper sleep every day',
          p: [
            'Sleep helps the body repair itself and supports immunity. People who sleep under 6 hours are more likely to get colds, coughs and fatigue.',
            'Recommended sleep: adults at least 7 hours, teenagers 8–10 hours, children and infants up to 14 hours.',
          ],
          listTitle: 'Tips for better sleep',
          list: [
            'Avoid phones before bed',
            'Eat dinner at least an hour before sleeping',
            'Keep a regular sleep schedule',
            'Create a calm, comfortable sleeping space',
          ],
        },
        {
          h: 'Stay hydrated with clean drinking water',
          p: [
            'Water moves nutrients, removes toxins and keeps organs working. Healthy adults should drink about 4–6 litres a day, depending on lifestyle and climate. Start the day with a glass of water and keep drinking through the day.',
            'The water should be clean, so use a reliable purifier such as one from Aakash Water Purifier.',
          ],
          listTitle: 'Benefits of drinking purified water',
          list: ['Supports immunity', 'Helps remove toxins', 'Improves digestion', 'Maintains energy', 'Keeps the body hydrated'],
        },
        {
          h: 'Eat healthy and balanced meals',
          p: [
            'Vitamins, minerals, antioxidants and fibre help the body fight infection. Wash fruits and vegetables before eating to remove dirt, pesticides and germs.',
          ],
          listTitle: 'Include daily',
          list: ['Fresh fruits', 'Green vegetables', 'Nuts and seeds', 'Legumes and whole grains', 'Healthy fats such as Omega-3'],
        },
        {
          h: 'Exercise for at least 20 minutes daily',
          p: [
            'Regular activity strengthens immunity and improves circulation, and you do not need expensive equipment. Experts recommend about 150 minutes of moderate exercise a week, which is just 20 minutes a day.',
          ],
          listTitle: 'Simple exercises',
          list: ['Brisk walking', 'Jogging', 'Cycling', 'Swimming', 'Stretching'],
        },
        {
          h: 'Manage stress and anxiety',
          p: [
            'Long-term stress weakens immunity and can lead to poor eating, smoking, drinking and lack of sleep. Even 5–10 minutes of deep breathing and relaxation daily can help.',
          ],
          listTitle: 'Simple ways to reduce stress',
          list: ['Deep breathing exercises', 'Daily meditation', 'Time with family and friends', 'Short work breaks', 'Calming music', 'A positive routine'],
        },
      ],
      closing: 'Clean and safe drinking water is one of the first steps toward a healthier life. Choose healthy habits today and build a stronger tomorrow.',
      cta: CTA,
    },
  },
}

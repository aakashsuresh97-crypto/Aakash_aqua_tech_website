/* =====================================================================
   BLOG POSTS – text copied word-for-word from https://aakashaquatech.in/blog/
   (title, date, "No Comments", excerpt, Read More link).
   Used by BlogPage.jsx and seo.js. To add a post later, add one object here.
   `icon` only picks the small icon on the card (it is not page content).
===================================================================== */
import { BODIES } from './blogBodies.js'

export const BLOG_BRAND = 'Aakash Water Purifier' /* every title ends with "| Aakash Water Purifier" */

/* A post that has a `body` opens INSIDE the app at /<slug> (BlogPost.jsx). Posts without a body still open the live site. */
export const slugOf = (url) => url.replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '')
export const postHref = (p) => (p.body ? slugOf(p.url) : p.url)
export const findPost = (path) => BLOG_POSTS.find((p) => p.body && slugOf(p.url) === path)

export const BLOG_POSTS = [
  {
    title: 'Benefits of AMC for RO Water Purifier Maintenance',
    url: 'https://aakashaquatech.in/benefits-of-amc-for-ro-water-purifier-maintenance/',
    date: 'June 5, 2026',
    iso: '2026-06-05',
    icon: 'shield',
    excerpt:
      'Discover the benefits of an RO purifier AMC plan, including timely service, filter checks, breakdown support, better water taste, and long-term maintenance savings.',
    image: 'https://aakashaquatech.in/wp-content/uploads/2026/06/IMG_7599-1024x538.png',
    /* Post text. Sections follow the live post's headings; paste the exact WordPress wording into `p` / `list` to match it 1:1. */
    body: {
      lead: 'An RO AMC keeps purifier service planned, reduces surprise breakdowns, and helps maintain water quality through the year.',
      sections: [
        {
          h: 'What is an RO AMC?',
          p: [
            'An AMC (Annual Maintenance Contract) lets you schedule regular service for your RO water purifier, instead of calling for help only after something breaks.',
          ],
        },
        {
          h: 'Timely filter checks',
          p: [
            'Filters and membranes need to be checked at the right intervals. With an AMC, your service schedule is tracked for you, so there are no long gaps between visits.',
          ],
        },
        {
          h: 'Better water taste and flow',
          p: [
            'Regular maintenance means better taste, steadier flow and fewer unexpected issues. It also helps protect important parts such as the pump and the membrane.',
          ],
        },
        {
          h: 'Transparent service support',
          p: ['A good AMC makes it clear when service is due, what was checked, and whether a part is really needed.'],
        },
        {
          h: 'Why choose Aakash Aqua Tech',
          p: [
            'Aakash Aqua Tech provides professional RO service, installation, guidance and after-sales support for home and commercial customers.',
          ],
        },
      ],
      cta: {
        h: 'Need help choosing or servicing your purifier?',
        list: ['Installation', 'Filter replacement', 'Water quality checks', 'Regular maintenance'],
      },
    },
  },
  {
    title: 'Why TDS Matters in Drinking Water',
    url: 'https://aakashaquatech.in/why-tds-matters-in-drinking-water/',
    date: 'June 5, 2026',
    iso: '2026-06-05',
    icon: 'drop',
    excerpt:
      'Learn what TDS means in drinking water, why it affects taste and purifier selection, and how RO systems help manage high TDS water at home.',
  },
  {
    title: 'RO vs UV vs UF Water Purifier: Which One Is Best?',
    url: 'https://aakashaquatech.in/ro-vs-uv-vs-uf-water-purifier-which-one-is-best/',
    date: 'June 5, 2026',
    iso: '2026-06-05',
    icon: 'layers',
    excerpt:
      'Understand the difference between RO, UV, and UF water purifiers and choose the right purifier based on TDS, water source, bacteria risk, and home usage.',
  },
  {
    title: '7 Signs Your RO Filter Needs Replacement',
    url: 'https://aakashaquatech.in/signs-your-ro-filter-needs-replacement/',
    date: 'June 5, 2026',
    iso: '2026-06-05',
    icon: 'wrench',
    excerpt:
      'Know the common signs that your RO filter needs replacement, including bad taste, slow water flow, high TDS, leakage, odor, and poor purification performance.',
  },
  {
    title: 'How Often Should You Service Your RO Water Purifier?',
    url: 'https://aakashaquatech.in/how-often-should-you-service-your-ro-water-purifier/',
    date: 'June 5, 2026',
    iso: '2026-06-05',
    icon: 'calendar',
    excerpt:
      'Learn how often to service an RO water purifier, when to replace filters, and why regular RO maintenance keeps drinking water safe, clean, and better tasting.',
  },
  {
    title: 'Tips to Prevent Waterborne Diseases',
    url: 'https://aakashaquatech.in/tips-to-prevent-waterborne-diseases-aakash-water-purifier/',
    date: 'May 13, 2026',
    iso: '2026-05-13',
    icon: 'heart',
    /* this excerpt is cut off in the same place on the live site */
    excerpt:
      '5 Easy Ways to Improve Your Immune System Naturally People across different countries, cultures, lifestyles, and food habits may be',
  },
]

/* attach the text of the other posts (blogBodies.js) so they open inside the app too */
BLOG_POSTS.forEach((p) => Object.assign(p, BODIES[slugOf(p.url)]))

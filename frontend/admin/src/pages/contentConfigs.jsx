import CategoryImage from '../components/CategoryImage.jsx';
import { Badge, fmtDateTime, money } from '../components/ui.jsx';
import { amcPlansApi, bannersApi, brandsApi, faqsApi, pagesApi, testimonialsApi, zonesApi } from '../api/siteApi.js';

const statusBadge = (r) => <Badge tone={Number(r.status) === 1 ? 'green' : 'slate'}>{Number(r.status) === 1 ? 'Active' : 'Inactive'}</Badge>;
const thumb = (url, alt, cls = 'h-10 w-14 rounded') => <CategoryImage src={url} alt={alt} className={cls} />;
const statusFilter = { name: 'status', label: 'Status', options: [['1', 'Active'], ['0', 'Inactive']] };
const order = { name: 'display_order', label: 'Display order', type: 'number', half: true, default: 0, help: 'Lower numbers show first.' };
const status = { name: 'status', label: 'Status', type: 'status', half: true };
const trunc = (s, n = 70) => (s && s.length > n ? `${s.slice(0, n)}…` : s || '—');

const PLACEMENTS = [['home_hero', 'Offer strip (under the hero)'], ['hero_slide', 'Hero slide (top carousel)'], ['home_showcase', 'Product showcase (image + text)']];
const placementLabel = (v) => (PLACEMENTS.find((p) => p[0] === v) || [v, v])[1];

export const banners = {
  title: 'Banners', subtitle: 'Banners shown on the public home page: hero slides, the offer strip under the hero, and the product showcase.', singular: 'Banner', api: bannersApi, nameField: 'title',
  filters: [statusFilter, { name: 'placement', label: 'Placement', options: PLACEMENTS }],
  columns: [
    { key: 'image_url', label: 'Image', render: (r) => thumb(r.image_url, r.title) },
    { key: 'title', label: 'Title', render: (r) => <><span className="font-medium text-slate-900">{r.title}</span>{r.subtitle && <span className="block text-xs text-slate-500">{trunc(r.subtitle, 50)}</span>}</> },
    { key: 'placement', label: 'Placement', render: (r) => placementLabel(r.placement) },
    { key: 'display_order', label: 'Order' },
    { key: 'schedule', label: 'Schedule', render: (r) => (r.starts_at || r.ends_at ? `${r.starts_at ? fmtDateTime(r.starts_at) : 'now'} → ${r.ends_at ? fmtDateTime(r.ends_at) : 'no end'}` : 'Always') },
    { key: 'status', label: 'Status', render: statusBadge },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true },
    { name: 'subtitle', label: 'Subtitle', help: 'Hero slide: small badge above the title. Showcase: the line under the title.' },
    { name: 'description', label: 'Description', type: 'textarea', rows: 4, help: 'Hero slide: the paragraph under the title. Showcase: the text beside the image. Not used in the offer strip.' },
    { name: 'image_url', label: 'Desktop image', type: 'image', required: true },
    { name: 'mobile_image_url', label: 'Mobile image (optional)', type: 'image' },
    { name: 'link_url', label: 'Link', type: 'url', half: true, help: 'Where the banner goes when clicked.' },
    { name: 'button_text', label: 'Button text', half: true },
    { name: 'placement', label: 'Placement', type: 'select', options: PLACEMENTS, half: true, default: 'home_hero', help: 'Where the banner appears on the home page.' },
    { ...order, help: 'Lower numbers show first. Product showcase: 1–7 replaces that numbered product (1 = first), 0 = the first product not yet replaced.' },
    status,
    { name: 'starts_at', label: 'Show from', type: 'datetime', half: true, help: 'Leave empty to start immediately.' },
    { name: 'ends_at', label: 'Show until', type: 'datetime', half: true, help: 'Leave empty to never end.' },
  ],
};

export const testimonials = {
  title: 'Testimonials', subtitle: 'Customer feedback shown on the public site.', singular: 'Testimonial', api: testimonialsApi, nameField: 'customer_name',
  filters: [statusFilter],
  columns: [
    { key: 'image_url', label: 'Photo', render: (r) => thumb(r.image_url, r.customer_name, 'h-10 w-10 rounded-full') },
    { key: 'customer_name', label: 'Customer', render: (r) => <><span className="font-medium text-slate-900">{r.customer_name}</span>{r.city && <span className="block text-xs text-slate-500">{r.city}</span>}</> },
    { key: 'rating', label: 'Rating', render: (r) => `${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}` },
    { key: 'feedback', label: 'Feedback', render: (r) => trunc(r.feedback) },
    { key: 'display_order', label: 'Order' },
    { key: 'status', label: 'Status', render: statusBadge },
  ],
  fields: [
    { name: 'customer_name', label: 'Customer name', required: true, half: true },
    { name: 'city', label: 'City', half: true },
    { name: 'feedback', label: 'Feedback', type: 'textarea', required: true },
    { name: 'rating', label: 'Rating (1–5)', type: 'number', min: 1, max: 5, step: 1, half: true, default: 5 },
    { name: 'image_url', label: 'Photo (optional)', type: 'image' },
    order, status,
  ],
};

export const brands = {
  title: 'Brands', subtitle: 'Brand logos shown on the public site. The name should match the “brand” on your products.', singular: 'Brand', api: brandsApi, nameField: 'name',
  filters: [statusFilter],
  columns: [
    { key: 'logo_url', label: 'Logo', render: (r) => thumb(r.logo_url, r.name) },
    { key: 'name', label: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'slug', label: 'Slug' },
    { key: 'website_url', label: 'Website', render: (r) => trunc(r.website_url, 40) },
    { key: 'display_order', label: 'Order' },
    { key: 'status', label: 'Status', render: statusBadge },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true, half: true },
    { name: 'slug', label: 'Slug', half: true, help: 'Lowercase letters, numbers, hyphens. Leave empty to generate from the name.' },
    { name: 'logo_url', label: 'Logo', type: 'image' },
    { name: 'website_url', label: 'Website', type: 'url', help: 'Optional.' },
    order, status,
  ],
};

export const faqs = {
  title: 'FAQs', subtitle: 'Questions and answers shown on the public site.', singular: 'FAQ', api: faqsApi, nameField: 'question',
  filters: [statusFilter],
  columns: [
    { key: 'question', label: 'Question', render: (r) => <span className="font-medium text-slate-900">{trunc(r.question, 80)}</span> },
    { key: 'answer', label: 'Answer', render: (r) => trunc(r.answer, 80) },
    { key: 'topic', label: 'Topic' },
    { key: 'display_order', label: 'Order' },
    { key: 'status', label: 'Status', render: statusBadge },
  ],
  fields: [
    { name: 'question', label: 'Question', required: true },
    { name: 'answer', label: 'Answer', type: 'textarea', rows: 5, required: true },
    { name: 'topic', label: 'Topic', half: true, default: 'general', help: 'Groups questions, e.g. general, ro, service.' },
    order, status,
  ],
};

export const zones = {
  title: 'Service zones', subtitle: 'Areas you serve.', singular: 'Zone', api: zonesApi, nameField: 'name',
  filters: [statusFilter],
  columns: [
    { key: 'image_url', label: 'Image', render: (r) => thumb(r.image_url, r.name) },
    { key: 'name', label: 'Zone', render: (r) => <><span className="font-medium text-slate-900">{r.name}</span>{r.state && <span className="block text-xs text-slate-500">{r.state}</span>}</> },
    { key: 'pin_codes', label: 'PIN codes', render: (r) => trunc(r.pin_codes, 40) },
    { key: 'display_order', label: 'Order' },
    { key: 'status', label: 'Status', render: statusBadge },
  ],
  fields: [
    { name: 'name', label: 'Zone name', required: true, half: true },
    { name: 'state', label: 'State', half: true },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { name: 'pin_codes', label: 'PIN codes', help: 'Comma separated, e.g. 636001, 636002.' },
    { name: 'image_url', label: 'Image', type: 'image' },
    order, status,
  ],
};

export const pages = {
  title: 'Pages', subtitle: 'Static pages such as Privacy Policy, Terms and Shipping. HTML is cleaned by the server when saved.', singular: 'Page', api: pagesApi, nameField: 'title',
  filters: [statusFilter],
  columns: [
    { key: 'title', label: 'Title', render: (r) => <span className="font-medium text-slate-900">{r.title}</span> },
    { key: 'slug', label: 'Slug', render: (r) => <code className="text-xs">/{r.slug}</code> },
    { key: 'updated_at', label: 'Updated', render: (r) => fmtDateTime(r.updated_at) },
    { key: 'status', label: 'Status', render: statusBadge },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, half: true },
    { name: 'slug', label: 'Slug', required: true, half: true, help: 'Lowercase letters, numbers, hyphens (e.g. privacy-policy).' },
    { name: 'content_html', label: 'Content (HTML)', type: 'textarea', rows: 12, required: true, help: 'Allowed: headings, paragraphs, lists, links, images, tables. Scripts are removed.' },
    { name: 'banner_url', label: 'Banner image (optional)', type: 'image' },
    { name: 'seo_title', label: 'SEO title', half: true },
    { name: 'meta_description', label: 'Meta description', half: true },
    status,
  ],
};

export const amcPlans = {
  title: 'AMC plans', subtitle: 'Annual maintenance plans shown on the service page.', singular: 'AMC plan', api: amcPlansApi, nameField: 'name',
  filters: [statusFilter],
  columns: [
    { key: 'name', label: 'Plan', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'price', label: 'Price', render: (r) => money(r.price) },
    { key: 'duration_months', label: 'Duration', render: (r) => `${r.duration_months} mo` },
    { key: 'visits_per_year', label: 'Visits / yr' },
    { key: 'display_order', label: 'Order' },
    { key: 'status', label: 'Status', render: statusBadge },
  ],
  fields: [
    { name: 'name', label: 'Plan name', required: true },
    { name: 'price', label: 'Price (₹)', type: 'number', min: 0, step: '0.01', required: true, half: true },
    { name: 'duration_months', label: 'Duration (months)', type: 'number', min: 1, max: 120, step: 1, half: true, default: 12 },
    { name: 'visits_per_year', label: 'Visits per year', type: 'number', min: 0, step: 1, half: true },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { name: 'features', label: 'Features', type: 'textarea', rows: 5, help: 'One feature per line.' },
    order, status,
  ],
};
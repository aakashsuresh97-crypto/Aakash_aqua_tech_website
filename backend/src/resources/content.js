// Declarative definitions of the simple content tables. Each gives an admin CRUD router (/api/<name>) and a public
// read router (/api/public/<name>) through utils/resource.js.
const { defineResource } = require('../utils/resource');
const { slugify } = require('../utils/slug');

const order = { type: 'int', min: -9999, max: 9999, default: 0, label: 'display_order' };
const status = { type: 'status', default: 1, label: 'status' };
const active = 'status = 1';

const banner = defineResource({
  table: 'banner', label: 'Banner',
  schema: {
    title: { type: 'str', max: 150, required: true },
    subtitle: { type: 'str', max: 255 },
    description: { type: 'text', max: 2000 },
    image_url: { type: 'url', required: true, label: 'image_url' },
    mobile_image_url: { type: 'url' },
    link_url: { type: 'url' },
    button_text: { type: 'str', max: 60 },
    // home_hero = offer strip under the hero | hero_slide = a slide in the hero carousel | home_showcase = image + text row in the product showcase
    placement: { type: 'enum', values: ['home_hero', 'hero_slide', 'home_showcase'], default: 'home_hero', label: 'placement' },
    display_order: order, status,
    starts_at: { type: 'datetime' }, ends_at: { type: 'datetime' },
  },
  orderBy: 'display_order ASC, created_at DESC',
  searchColumns: ['title', 'subtitle', 'description'],
  filters: { status: { type: 'status' }, placement: { type: 'enum', values: ['home_hero', 'hero_slide', 'home_showcase'], label: 'placement' } },
  publicFilters: ['placement'],
  publicWhere: `status = 1 AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW())`,
  beforeSave: (data, errors, existing) => {
    const s = data.starts_at ?? existing?.starts_at; const e = data.ends_at ?? existing?.ends_at;
    if (s && e && new Date(e) <= new Date(s)) errors.push('ends_at must be after starts_at');
  },
});

const testimonial = defineResource({
  table: 'testimonial', label: 'Testimonial',
  schema: {
    customer_name: { type: 'str', max: 100, required: true },
    city: { type: 'str', max: 80 },
    feedback: { type: 'text', max: 2000, required: true },
    rating: { type: 'int', min: 1, max: 5, default: 5 },
    image_url: { type: 'url' },
    display_order: order, status,
  },
  orderBy: 'display_order ASC, created_at DESC',
  searchColumns: ['customer_name', 'city', 'feedback'],
  filters: { status: { type: 'status' } },
  publicWhere: active,
});

const brand = defineResource({
  table: 'brand', label: 'Brand',
  schema: {
    slug: { type: 'slug', max: 80, keepIfEmpty: true },
    name: { type: 'str', max: 100, required: true },
    logo_url: { type: 'url' }, website_url: { type: 'url' },
    display_order: order, status,
  },
  slugFrom: 'name',
  unique: { uq_brand_slug: 'A brand with this slug already exists', uq_brand_name: 'A brand with this name already exists' },
  orderBy: 'display_order ASC, name ASC',
  searchColumns: ['name', 'slug'],
  filters: { status: { type: 'status' } },
  publicWhere: active,
});

const faq = defineResource({
  table: 'faq', label: 'FAQ',
  schema: {
    question: { type: 'str', max: 300, required: true },
    answer: { type: 'text', max: 5000, required: true },
    topic: { type: 'str', max: 60, default: 'general' },
    display_order: order, status,
  },
  orderBy: 'topic ASC, display_order ASC, created_at ASC',
  searchColumns: ['question', 'answer'],
  filters: { status: { type: 'status' }, topic: { type: 'str', max: 60 } },
  publicFilters: ['topic'],
  publicWhere: active,
  publicOrderBy: 'display_order ASC, created_at ASC',
});

const zone = defineResource({
  table: 'zone', label: 'Zone',
  schema: {
    name: { type: 'str', max: 100, required: true },
    state: { type: 'str', max: 80 },
    description: { type: 'text', max: 2000 },
    pin_codes: { type: 'str', max: 500 },
    image_url: { type: 'url' },
    display_order: order, status,
  },
  unique: { uq_zone_name: 'A zone with this name already exists' },
  orderBy: 'display_order ASC, name ASC',
  searchColumns: ['name', 'state', 'pin_codes'],
  filters: { status: { type: 'status' } },
  publicWhere: active,
});

const staticPage = defineResource({
  table: 'static_page', label: 'Page',
  schema: {
    slug: { type: 'slug', max: 100, required: true },
    title: { type: 'str', max: 200, required: true },
    content_html: { type: 'html', required: true, label: 'content_html' },
    banner_url: { type: 'url' },
    seo_title: { type: 'str', max: 255 }, meta_description: { type: 'str', max: 500 },
    status,
  },
  unique: { uq_static_page_slug: 'A page with this slug already exists' },
  orderBy: 'title ASC',
  searchColumns: ['title', 'slug'],
  filters: { status: { type: 'status' } },
  publicWhere: active,
});

const blogPost = defineResource({
  table: 'blog_post', label: 'Blog post',
  schema: {
    slug: { type: 'slug', max: 200, keepIfEmpty: true },
    title: { type: 'str', max: 250, required: true },
    excerpt: { type: 'str', max: 500 },
    content_html: { type: 'html', required: true, label: 'content_html' },
    image_url: { type: 'url' },
    author: { type: 'str', max: 100 },
    status: { type: 'enum', values: ['draft', 'published'], default: 'draft', label: 'status' },
    published_at: { type: 'datetime' },
    seo_title: { type: 'str', max: 255 }, meta_description: { type: 'str', max: 500 },
  },
  slugFrom: 'title',
  unique: { uq_blog_post_slug: 'A post with this slug already exists' },
  orderBy: 'COALESCE(published_at, created_at) DESC',
  searchColumns: ['title', 'excerpt'],
  filters: { status: { type: 'enum', values: ['draft', 'published'] } },
  publicWhere: `status = 'published' AND (published_at IS NULL OR published_at <= NOW())`,
  publicOrderBy: 'COALESCE(published_at, created_at) DESC',
  publicColumns: ['slug', 'title', 'excerpt', 'image_url', 'author', 'published_at', 'seo_title', 'meta_description'], // list view omits the full body
  // publishing without a date uses "now"
  beforeSave: (data, errors, existing) => {
    const st = data.status ?? existing?.status;
    if (st === 'published' && !(data.published_at ?? existing?.published_at)) data.published_at = new Date();
  },
});

const amcPlan = defineResource({
  table: 'amc_plan', label: 'AMC plan',
  schema: {
    name: { type: 'str', max: 120, required: true },
    price: { type: 'decimal', min: 0, max: 9999999, required: true },
    duration_months: { type: 'int', min: 1, max: 120, default: 12 },
    visits_per_year: { type: 'int', min: 0, max: 100 },
    description: { type: 'text', max: 2000 },
    features: { type: 'text', max: 3000 },
    display_order: order, status,
  },
  unique: { uq_amc_plan_name: 'An AMC plan with this name already exists' },
  orderBy: 'display_order ASC, price ASC',
  searchColumns: ['name', 'description'],
  filters: { status: { type: 'status' } },
  publicWhere: active,
});

module.exports = { banner, testimonial, brand, faq, zone, staticPage, blogPost, amcPlan, slugify };
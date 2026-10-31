// Wires the storefront modules: content tables (admin CRUD + public reads), public catalogue, leads, service requests,
// catalogue nodes and the dashboard.
const express = require('express');
const content = require('../resources/content');
const leads = require('./lead.routes');
const service = require('./service.routes');
const pub = require('../controllers/public.controller');
const nodes = require('../controllers/catalogNode.controller');
const dashboard = require('../controllers/dashboard.controller');
const { requireAuth, canWrite } = require('../middleware/auth');

const admin = express.Router();   // mounted at /api
admin.use('/banners', content.banner.adminRouter);
admin.use('/testimonials', content.testimonial.adminRouter);
admin.use('/brands', content.brand.adminRouter);
admin.use('/faqs', content.faq.adminRouter);
admin.use('/zones', content.zone.adminRouter);
admin.use('/pages', content.staticPage.adminRouter);
admin.use('/blog-posts', content.blogPost.adminRouter);
admin.use('/amc-plans', content.amcPlan.adminRouter);
admin.use('/leads', leads.admin);
admin.use('/service-requests', service.admin);
admin.get('/catalog-nodes', requireAuth, nodes.list);
admin.put('/catalog-nodes/:type/:id', ...canWrite, nodes.save);
admin.get('/dashboard/summary', requireAuth, dashboard.summary);

const publicRouter = express.Router(); // mounted at /api/public
// Browser caching for the public GET endpoints (Express adds an ETag, so a repeat request is answered with an empty 304):
//  - products / search: "no-cache" = the browser must ask first, so prices and stock are never stale, but an unchanged answer costs almost nothing
//  - content (banners, FAQs, brands, zones, catalogue tree ...): fresh for 60 s, then usable for 5 more minutes while it is re-checked
publicRouter.use((req, res, next) => {
  if (req.method === 'GET') {
    if (process.env.NODE_ENV === 'production') {
      const live = req.path.startsWith('/products') || req.path.startsWith('/search');
      res.set('Cache-Control', live ? 'no-cache' : 'public, max-age=60, stale-while-revalidate=300');
    } else {
      res.set('Cache-Control', 'no-store'); // development: never cached, so every call is a full 200
    }
  }
  next();
});
publicRouter.get('/catalog', pub.catalog);
publicRouter.get('/products', pub.products);
publicRouter.get('/products/:slug', pub.productBySlug);
publicRouter.get('/search', pub.search);
publicRouter.use('/banners', content.banner.publicRouter);
publicRouter.use('/testimonials', content.testimonial.publicRouter);
publicRouter.use('/brands', content.brand.publicRouter);
publicRouter.use('/faqs', content.faq.publicRouter);
publicRouter.use('/zones', content.zone.publicRouter);
publicRouter.use('/pages', content.staticPage.publicRouter);
publicRouter.use('/blog', content.blogPost.publicRouter);
publicRouter.use('/amc-plans', content.amcPlan.publicRouter);
publicRouter.use(leads.pub);
publicRouter.use(service.pub);

module.exports = { admin, public: publicRouter };
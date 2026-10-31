import CategoriesPage from './pages/CategoriesPage.jsx';
import SubcategoriesPage from './pages/SubcategoriesPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import LeadsPage from './pages/LeadsPage.jsx';
import ServiceRequestsPage from './pages/ServiceRequestsPage.jsx';
import CatalogMenuPage from './pages/CatalogMenuPage.jsx';
import BlogPage from './pages/BlogPage.jsx';
import CrudPage from './components/CrudPage.jsx';
import * as cfg from './pages/contentConfigs.jsx';

// key = hash path (#/key). `render` gets { onOpenCart }.
export const GROUPS = [
  { label: null, items: [{ key: 'dashboard', label: 'Dashboard', render: () => <DashboardPage /> }] },
  { label: 'Catalogue', items: [
    { key: 'categories', label: 'Categories', render: () => <CategoriesPage /> },
    { key: 'subcategories', label: 'Subcategories', render: () => <SubcategoriesPage /> },
    { key: 'products', label: 'Products', render: ({ onOpenCart }) => <ProductsPage onOpenCart={onOpenCart} /> },
    { key: 'menu', label: 'Menu settings', render: () => <CatalogMenuPage /> },
  ] },
  { label: 'Sales', items: [
    { key: 'orders', label: 'Orders', render: () => <OrdersPage /> },
    { key: 'leads', label: 'Leads', render: () => <LeadsPage /> },
    { key: 'service-requests', label: 'Service requests', render: () => <ServiceRequestsPage /> },
  ] },
  { label: 'Content', items: [
    { key: 'banners', label: 'Banners', render: () => <CrudPage config={cfg.banners} /> },
    { key: 'testimonials', label: 'Testimonials', render: () => <CrudPage config={cfg.testimonials} /> },
    { key: 'brands', label: 'Brands', render: () => <CrudPage config={cfg.brands} /> },
    { key: 'faqs', label: 'FAQs', render: () => <CrudPage config={cfg.faqs} /> },
    { key: 'zones', label: 'Zones', render: () => <CrudPage config={cfg.zones} /> },
    { key: 'pages', label: 'Pages', render: () => <CrudPage config={cfg.pages} /> },
    { key: 'blog', label: 'Blog', render: () => <BlogPage /> },
    { key: 'amc-plans', label: 'AMC plans', render: () => <CrudPage config={cfg.amcPlans} /> },
  ] },
];

export const ROUTES = Object.fromEntries(GROUPS.flatMap((g) => g.items).map((i) => [i.key, i]));
export const DEFAULT_ROUTE = 'dashboard';

/** "#/orders?x=1" -> "orders"; unknown or empty -> dashboard */
export const routeFromHash = (hash = window.location.hash) => {
  const key = hash.replace(/^#\/?/, '').split(/[?/]/)[0];
  return ROUTES[key] ? key : DEFAULT_ROUTE;
};

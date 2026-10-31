import { useMemo, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import FlipBook from '../components/FlipBook.jsx';
import Banners from '../components/Banners.jsx';
import { useData } from '../App.jsx';
import { toBook, byBrand } from '../lib.js';

const LATEST = 40;
export default function CatalogView() {
  const { categories, products, banners } = useData(), { cat, sub } = useParams(), [sp] = useSearchParams(), q = (sp.get('q') || '').trim();
  const view = useMemo(() => {
    const byNew = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
    if (q) {
      const t = q.toLowerCase().split(/\s+/);
      const L = products.filter(p => t.every(w => (p.name + ' ' + p.brand).toLowerCase().includes(w))).sort((a, b) => byBrand(a, b) || byNew(a, b));
      return { title: `Search: “${q}”`, list: L.map(p => toBook(p, 'Search results')), crumbs: [] };
    }
    const c = categories.find(x => x.id === cat);
    if (!cat || !c) {
      const L = products.slice().sort(byNew).slice(0, LATEST);
      return { title: 'Latest Products', list: L.map(p => toBook(p, 'New Arrivals')), latest: true };
    }
    const subs = c.subs.slice().sort((a, b) => a.order - b.order), sb = subs.find(s => s.id === sub);
    let L = products.filter(p => p.categoryId === c.id && (!sb || p.subIds.includes(sb.id)));
    if (sb) return { title: sb.name, parent: c, list: L.sort((a, b) => byBrand(a, b) || byNew(a, b)).map(p => toBook(p, sb.name)) };
    const rank = id => { const i = subs.findIndex(s => s.id === id); return i < 0 ? 999 : i };
    L = L.sort((a, b) => rank(a.subIds[0]) - rank(b.subIds[0]) || byBrand(a, b) || byNew(a, b));
    return { title: c.name, list: L.map(p => toBook(p, subs.find(s => s.id === p.subIds[0])?.name || c.name)) };
  }, [categories, products, cat, sub, q]);
  useEffect(() => { document.title = view.title + ' – Aakash Aqua Tech Catalog' }, [view.title]);
  return <main className="cv-wrap">
    {view.latest && <Banners list={banners} />}
    <div className="cv-head"><h1>{view.title}</h1>
      {view.parent && <Link to={'/c/' + view.parent.id}>← All {view.parent.name}</Link>}
      {view.latest && <p>Newest additions first</p>}</div>
    {view.list.length
      ? <FlipBook key={view.title + view.list.length} list={view.list} title={view.title} />
      : <p className="ap-msg">No products found here yet.</p>}
  </main>;
}

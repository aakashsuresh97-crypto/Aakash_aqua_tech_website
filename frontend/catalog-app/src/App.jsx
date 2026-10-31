import { useEffect, useState, createContext, useContext } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { loadCatalog } from './api.js';
import { setBrands } from './lib.js';
import Navbar from './components/Navbar.jsx';
import CatalogView from './pages/CatalogView.jsx';
import ProductPage from './pages/ProductPage.jsx';

const Ctx = createContext(null);
export const useData = () => useContext(Ctx);

export default function App() {
  const [data, setData] = useState(null), [err, setErr] = useState(false), loc = useLocation();
  useEffect(() => { loadCatalog().then(d => { setBrands(d.brands); setData(d) }).catch(() => setErr(true)) }, []);
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname]);
  return <Ctx.Provider value={{ ...data }}>
    <Navbar data={data} />
    {err ? <p className="ap-msg">Could not load the catalog. Please refresh.</p>
      : !data ? <div className="ap-msg"><i className="ap-spin" />Loading catalog…</div>
      : <Routes>
        <Route path="/" element={<CatalogView />} />
        <Route path="/c/:cat" element={<CatalogView />} />
        <Route path="/c/:cat/:sub" element={<CatalogView />} />
        <Route path="/search" element={<CatalogView />} />
        <Route path="/p/:slug" element={<ProductPage />} />
        <Route path="*" element={<CatalogView />} />
      </Routes>}
  </Ctx.Provider>;
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Search, ChevronDown, Sparkles, MessageCircle } from 'lucide-react';
import { enquiry, asset } from '../lib.js';

export default function Navbar({ data }) {
  const [open, setOpen] = useState(false), [dd, setDd] = useState(null), [q, setQ] = useState(''), nav = useNavigate(), loc = useLocation();
  const cats = (data?.categories || []).slice().sort((a, b) => a.order - b.order);
  /* When the categories no longer fit in one row (e.g. after adding more in the admin) the menu folds into the burger menu automatically */
  const linksRef = useRef(null), [cmp, setCmp] = useState(false), breakW = useRef(0), sig = cats.map(c => c.name + c.subs.length).join('|');
  const fit = useCallback(() => {
    const el = linksRef.current; if (!el) return;
    if (!cmp) { if (window.innerWidth > 960 && el.scrollWidth > el.clientWidth + 1) { breakW.current = window.innerWidth; setCmp(true) } }
    else if (window.innerWidth > breakW.current + 60) setCmp(false);
  }, [cmp]);
  useLayoutEffect(fit);
  useEffect(() => { setCmp(false) }, [sig]);
  useEffect(() => { addEventListener('resize', fit); document.fonts?.ready.then(fit); return () => removeEventListener('resize', fit) }, [fit]);
  useEffect(() => { setOpen(false); setDd(null) }, [loc.pathname]);
  useEffect(() => { const k = e => e.key === 'Escape' && (setOpen(false), setDd(null)); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, []);
  const search = e => { e.preventDefault(); if (q.trim()) { nav('/search?q=' + encodeURIComponent(q.trim())); setOpen(false) } };
  return <header className={'nv' + (cmp ? ' nv-fold' : '')}>
    <div className="nv-in">
      <Link to="/" className="nv-logo" aria-label="Aakash Aqua Tech home"><img src={asset("/logo.webp")} alt="Aakash Aqua Tech" width="43" height="44" /></Link>
      <nav ref={linksRef} className={'nv-links' + (open ? ' open' : '')} aria-label="Catalog categories" onMouseLeave={() => setDd(null)}>
        <NavLink to="/" end className="nv-a nv-new"><Sparkles size={15} />Latest</NavLink>
        {cats.map(c => c.subs.length
          ? <div key={c.id} className={'nv-dd' + (dd === c.id ? ' on' : '')} onMouseEnter={() => setDd(c.id)}>
            <div className="nv-row">
              <NavLink to={'/c/' + c.id} end className="nv-a">{c.name}</NavLink>
              <button className="nv-chev" aria-label={'Show ' + c.name + ' subcategories'} aria-expanded={dd === c.id} onClick={() => setDd(dd === c.id ? null : c.id)}><ChevronDown size={15} /></button>
            </div>
            <div className="nv-menu">
              <Link to={'/c/' + c.id}>All {c.name}</Link>
              {c.subs.slice().sort((a, b) => a.order - b.order).map(s => <Link key={s.id} to={`/c/${c.id}/${s.id}`}>{s.name}</Link>)}
            </div>
          </div>
          : <NavLink key={c.id} to={'/c/' + c.id} className="nv-a">{c.name}</NavLink>)}
        <form className="nv-s sm" onSubmit={search}><Search size={15} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" /></form>
      </nav>
      <form className="nv-s lg" onSubmit={search} onClick={e => e.currentTarget.querySelector("input").focus()}><Search size={15} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" aria-label="Search products" /></form>
      <a className="nv-wa" href={enquiry()} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /><span>Enquire</span></a>
      <button className="nv-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
    </div>
  </header>;
}

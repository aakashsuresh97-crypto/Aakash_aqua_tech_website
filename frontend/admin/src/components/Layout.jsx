import { Fragment, useEffect, useState } from 'react';
import { CartIcon, MenuIcon, XIcon } from './Icons.jsx';
import { GROUPS } from '../routes.jsx';

/* Splits a label into words + letters so every letter can ripple like a wave (CSS: .ad-w / .ad-ch) */
function Label({ text }) {
  let c = 0;
  return (
    <span className="ad-lbl" aria-hidden="true">
      {text.split(' ').map((w, wi) => (
        <Fragment key={wi}>
          <span className="ad-w">
            {[...w].map((ch, ci) => <span className="ad-ch" style={{ '--c': c++ }} key={ci}>{ch}</span>)}
          </span>{' '}
        </Fragment>
      ))}
    </span>
  );
}

function NavItem({ t, active, index, onNavigate }) {
  const [rip, setRip] = useState(null);
  const click = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setRip({ id: Date.now(), x: e.clientX - r.left, y: e.clientY - r.top });
    if (onNavigate) onNavigate(e);
  };
  return (
    <a href={`#/${t.key}`} onClick={click} aria-label={t.label} aria-current={active ? 'page' : undefined}
      className={'ad-tab' + (active ? ' on' : '')} style={{ '--i': index }}>
      <i className="ad-dot" aria-hidden="true" />
      <Label text={t.label} />
      <em className="ad-shine" aria-hidden="true" />
      {rip && <span key={rip.id} className="ad-rip" style={{ left: rip.x, top: rip.y }} aria-hidden="true" />}
    </a>
  );
}

function NavList({ page, onNavigate }) {
  let n = 0; // running row number: each row starts a little later, so the pop-in and the wave cascade down the list
  return (
    <nav aria-label="Main" className="space-y-3">
      {GROUPS.map((g, i) => (
        <div key={g.label || i}>
          {g.label && <p className="ad-group">{g.label}</p>}
          <ul>
            {g.items.map((t) => (
              <li key={t.key}><NavItem t={t} active={page === t.key} index={n++} onNavigate={onNavigate} /></li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function Layout({ children, page, user, onLogout, cartCount = 0, onOpenCart }) {
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [page]);
  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  return (
    <div className="min-h-screen lg:pl-60">
      <aside className="ad-side fixed inset-y-0 left-0 z-30 hidden w-60 py-6 lg:block">
        <p className="ad-brand">Aakash Admin</p>
        <NavList page={page} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} />
          <div className="ad-side absolute inset-y-0 left-0 w-64 max-w-[85vw] py-6">
            <div className="mb-4 flex items-start justify-between pr-3">
              <p className="ad-brand !mb-0">Aakash Admin</p>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="relative z-10 rounded-md p-1 text-slate-500 hover:bg-slate-100"><XIcon className="h-5 w-5" /></button>
            </div>
            <NavList page={page} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <header className="ad-top sticky top-0 z-20 flex h-16 items-center gap-3 bg-white/90 px-4 backdrop-blur sm:px-6">
        <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"><MenuIcon className="h-6 w-6" /></button>
        <h1 className="text-lg font-semibold text-slate-900 lg:hidden">Admin</h1>
        <div className="ml-auto flex items-center gap-2">
          {onOpenCart && (
            <button type="button" onClick={onOpenCart} aria-label={`Open cart, ${cartCount} items`} title="Cart" className="relative rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <CartIcon className="h-6 w-6" />
              {cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-600 px-1 text-xs font-semibold text-white">{cartCount}</span>}
            </button>
          )}
          {user && (
            <>
              <span className="hidden text-right text-xs leading-tight text-slate-500 sm:block">
                <span className="block font-medium text-slate-700">{user.full_name}</span>
                <span className="capitalize">{user.role}</span>
              </span>
              <button type="button" onClick={onLogout} className="btn-secondary px-3 py-1.5">Sign out</button>
            </>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
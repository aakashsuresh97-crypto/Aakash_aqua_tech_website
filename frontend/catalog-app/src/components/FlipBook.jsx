import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Check, Plus, LayoutGrid, Maximize, Minimize, ZoomIn, ZoomOut, X, Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';
import { inr, enquiry, pic, picSet, onImgError, CALL, CALL_TXT, asset } from '../lib.js';

/* ------------------------------------------------------------------
   Flip-book catalog.
   - Tablet / desktop: an open two-page spread (cover opens like a real book).
   - Phone: one page at a time (stops at the last page, no empty page).
   Products are grouped brand by brand (Aakash, Kent, AO Smith, ZeroB, Wave).
   Only pages near the current one are drawn, so phones stay fast.
   Turn pages by: clicking a page / its corner, swiping or dragging,
   the arrow buttons, the keyboard (← →), or the thumbnail grid.
------------------------------------------------------------------- */
const STEP = 4, TURN = 900, ADDRESS = '10/62C, Brindavan Road, 1st Cross, Fairlands, Salem – 636016, Tamil Nadu';

const calc = () => {
  const w = innerWidth, h = innerHeight, full = !!(document.fullscreenElement || document.webkitFullscreenElement);
  const reserve = full ? 84 : w < 700 ? 172 : 196;              // navbar + title + page buttons
  const availH = Math.max(280, h - reserve);
  const side = w < 700 ? 8 : 20;                                // free space kept at the left / right of the book
  // page shape adapts to the screen: wide pages when height is the limit, tall pages when width is the limit
  const shape = maxPw => Math.min(1.5, Math.max(1.28, availH / maxPw));
  const spreadMax = (w - side * 2 - 40) / 2, Rs = shape(spreadMax), spreadPw = Math.min(spreadMax, availH / Rs);
  const portraitTablet = h > w * 1.15 && w < 1000;              // iPad upright: one big page reads better than two small ones
  const single = w < 700 || portraitTablet || spreadPw < 260;
  const oneMax = Math.min(w - side * 2, 660), R1 = shape(oneMax);
  const pw = Math.floor(single ? Math.min(oneMax, Math.max(availH / R1, 270)) : spreadPw), R = single ? R1 : Rs;
  return { single, pw, ph: Math.floor(pw * R) }
};

function buildPages(list, STEP = 4) {
  const pages = [{ k: 'cover' }, { k: 'toc' }];
  [...new Set(list.map(p => p.grp || 'Products'))].forEach(b => {
    const L = list.filter(p => (p.grp || 'Products') === b);
    for (let i = 0; i < L.length; i += STEP) pages.push({ k: 'items', brand: b, items: L.slice(i, i + STEP) });
  });
  if ((pages.length + 1) % 2) pages.push({ k: 'cta' });
  pages.push({ k: 'back' });
  return pages;
}

function Item({ p }) {
  const off = p.old > p.price && p.price ? Math.round((1 - p.price / p.old) * 100) : 0, to = '/p/' + p.slug;
  return <div className="bk-it">
    <Link to={to} className="bk-img" aria-label={p.name} draggable={false}>
      {p.isNew && <span className="bk-bdg nw">New</span>}{off > 0 && <span className="bk-bdg">Save {off}%</span>}
      <img src={pic(p, 360)} srcSet={picSet(p)} sizes="(max-width:700px) 45vw, 240px" data-src={p.image} onError={onImgError} alt={p.name} width="360" height="360" decoding="async" draggable={false} />
    </Link>
    <div className="bk-tx"><span className="bk-tag"><BrandMark brand={p.brand} /></span><h4 title={p.name}>{p.name}</h4>
      <div className="bk-pr">{p.price ? <>{inr(p.price)}{p.old > 0 && <s>{inr(p.old)}</s>}</> : <small>Price on enquiry</small>}</div></div>
    <div className="bk-ac"><Link to={to}>Details</Link><a className="w" href={enquiry(p)} target="_blank" rel="noopener noreferrer">Enquire</a></div>
  </div>;
}

const CEO = ['/ceo/1.webp', '/ceo/2.webp', '/ceo/3.webp'].map(asset);
function CeoShow() {
  const [i, setI] = useState(0);
  useEffect(() => { const id = setInterval(() => setI(n => (n + 1) % CEO.length), 2800); return () => clearInterval(id) }, []);
  return <div className="bk-ceo">{CEO.map((src, k) => <img key={src} src={src} alt="" draggable={false} className={k === i ? 'on' : ''} />)}</div>
}

function Content({ page, idx, pages, jump, count, title }) {
  if (page.k === 'cover') return <div className="bk-cv2"><img className="bk-cv2-bg" src={asset("/cover.webp")} alt="Aakash Aqua Tech product catalog cover" draggable={false} /><CeoShow />{title && <div className="bk-cv-title"><small>Aakash Aqua Tech</small><b>{title}</b><em>{count} products</em></div>}<span className="bk-cv-hint">Click to open →</span></div>;

  if (page.k === 'toc') {
    const bs = [];
    pages.forEach((pg, i) => {
      if (pg.k !== 'items') return;
      let b = bs.find(x => x.n === pg.brand);
      if (!b) bs.push(b = { n: pg.brand, i, c: 0 });
      b.c += pg.items.length;
    });
    return <div className="bk-toc"><h3>Contents</h3>
      <ol>{bs.map(b => <li key={b.n}><button onClick={() => jump(b.i)}><b>{b.i + 1}</b><span>{b.n} <em>· {b.c} products</em></span></button></li>)}</ol>
      <p className="bk-tip">Tip: click a page or its corner, swipe, or use the ← → keys to turn pages.</p></div>;
  }

  if (page.k === 'items') return <>
    <div className="bk-ph"><span>Aakash Aqua Tech</span><span>{page.brand}</span></div>
    <div className="bk-items">{page.items.map(p => <Item key={p.slug} p={p} />)}</div>
    <div className="bk-pn">{idx + 1}</div></>;

  if (page.k === 'cta') return <div className="bk-cta"><h3>Need help choosing?</h3><p>Tell us your water source and family size and we will suggest the right purifier.</p>
    <a className="bk-btn w" href={enquiry()} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} />WhatsApp us</a>
    <a className="bk-btn" href={'tel:+' + CALL}><Phone size={16} />{CALL_TXT}</a><div className="bk-pn">{idx + 1}</div></div>;

  return <div className="bk-cv bk-bk"><div className="bk-cv-logo"><img src={asset("/logo.webp")} alt="" width="192" height="196" draggable={false} /></div>
    <div className="bk-cv-mid"><h3>Aakash Pure Aqua Tech Pvt Ltd</h3>
      <ul><li><MapPin size={15} /><span>{ADDRESS}</span></li><li><Phone size={15} /><a href={'tel:+' + CALL}>{CALL_TXT}</a></li><li><Mail size={15} /><a href="mailto:ceo@aakashaquatech.in">ceo@aakashaquatech.in</a></li></ul></div>
    <svg className="bk-cv-w" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60C60 20 120 100 200 60S340 20 400 60V120H0Z" fill="#ffffff22" /><path d="M0 85C70 50 130 115 210 85S340 55 400 85V120H0Z" fill="#ffffff33" /></svg></div>;
}

function Face({ side, idx, page, vis, near, turn, ...rest }) {
  const cover = page && (page.k === 'cover' || page.k === 'back');
  const props = vis ? {} : { inert: '', 'aria-hidden': true };
  return <div className={`bk-face ${side === 'r' ? 'f' : 'b'}${cover ? ' hard' : ''}${page ? '' : ' blank'}`} data-i={idx} data-side={side} {...props}>
    {page && near && <Content page={page} idx={idx} {...rest} />}
    {page && !cover && <button className={'bk-cn ' + side} aria-label={side === 'r' ? 'Next page' : 'Previous page'} tabIndex={vis ? 0 : -1} onClick={e => { e.stopPropagation(); turn(side === 'r' ? 1 : -1) }} />}
  </div>;
}

export default function FlipBook({ list, title }) {
  const wrap = useRef(null), pt = useRef(null), fRef = useRef(0), dir = useRef(1), seq = useRef(0), inView = useRef(true);
  const [dim, setDim] = useState(calc), [f, setF] = useState(0), [mv, setMv] = useState({}), [zoom, setZoom] = useState(false), [th, setTh] = useState(false), [full, setFull] = useState(false);
  const { single, pw, ph } = dim, pages = useMemo(() => buildPages(list), [list]), P = pages.length, S = single ? P : P / 2;
  const END = single ? P - 1 : S;   // last reachable position: phone = last page, book = back cover

  useEffect(() => {
    let t; const r = () => { clearTimeout(t); t = setTimeout(() => setDim(calc()), 120) };
    addEventListener('resize', r); addEventListener('orientationchange', r);
    return () => { clearTimeout(t); removeEventListener('resize', r); removeEventListener('orientationchange', r) }
  }, []);
  useEffect(() => {
    const c = () => { setFull(!!(document.fullscreenElement || document.webkitFullscreenElement)); setDim(calc()) };
    document.addEventListener('fullscreenchange', c); document.addEventListener('webkitfullscreenchange', c);
    return () => { document.removeEventListener('fullscreenchange', c); document.removeEventListener('webkitfullscreenchange', c) }
  }, []);
  useEffect(() => { const io = new IntersectionObserver(([e]) => { inView.current = e.isIntersecting }, { threshold: .15 }); wrap.current && io.observe(wrap.current); return () => io.disconnect() }, []);
  useEffect(() => { fRef.current = 0; setF(0) }, [single]);   // layout switched (rotate / resize): back to the cover
  useEffect(() => () => clearTimeout(seq.current), []);

  const turn = useCallback(d => {
    const cur = fRef.current, n = cur + d; if (n < 0 || n > END) return false; const i = d > 0 ? cur : n; dir.current = d; fRef.current = n; setF(n);
    setMv(m => ({ ...m, [i]: 1 })); setTimeout(() => setMv(m => { const c = { ...m }; delete c[i]; return c }), TURN + 80); return true
  }, [END]);
  const goto = useCallback(t => { clearTimeout(seq.current); t = Math.max(0, Math.min(END, t)); const run = () => { const c = fRef.current; if (c === t) return; turn(t > c ? 1 : -1); seq.current = setTimeout(run, 120) }; run() }, [END, turn]);
  const jump = useCallback(i => { setTh(false); goto(single ? i : Math.ceil(i / 2)) }, [goto, single]);

  useEffect(() => { const k = e => { if (!inView.current || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) return; if (e.key === 'ArrowRight') { turn(1) } else if (e.key === 'ArrowLeft') { turn(-1) } }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [turn]);

  const down = e => { pt.current = { x: e.clientX, y: e.clientY } };
  const up = e => {
    const s = pt.current; pt.current = null; if (!s) return; const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) { turn(dx < 0 ? 1 : -1); return }
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8 || e.target.closest('a,button,label,input,select')) return;
    const face = e.target.closest('.bk-face'); if (!face) return;
    if (single) { const r = face.getBoundingClientRect(); turn((e.clientX - r.left) / r.width < .28 ? -1 : 1) } else turn(face.dataset.side === 'r' ? 1 : -1)
  };
  const fs = () => {
    const el = wrap.current; if (!el) return;
    const d = document; (d.fullscreenElement || d.webkitFullscreenElement)
      ? (d.exitFullscreen || d.webkitExitFullscreen).call(d)
      : (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)
  };

  const vis = new Set(single ? [f] : [f > 0 ? 2 * f - 1 : -1, f < S ? 2 * f : -1]);
  const label = single ? `${f + 1} / ${P}` : f === 0 ? 'Cover' : f === S ? 'Back cover' : `${2 * f}–${2 * f + 1} / ${P}`;
  const cur = single ? f : 2 * f;                                   // only draw pages close to the current one
  const near = i => Math.abs(i - cur) <= (single ? 1 : 3);
  const shared = { pages, jump, count: list.length, turn, title };
  const z = zoom ? 1.15 : 1;

  return <div className={'bk' + (full ? ' full' : '') + (single ? ' one' : '')} ref={wrap}>
    <div className="bk-stage" style={{ minHeight: ph * z + 64 }} onPointerDown={down} onPointerUp={up} onPointerCancel={() => { pt.current = null }}>
      {!single && <button className="bk-nav l" aria-label="Previous page" disabled={f === 0} onClick={() => turn(-1)}><ChevronLeft size={22} /></button>}
      <div className="bk-zoom" style={{ transform: `scale(${z})` }}>
        <div className="bk-book" role="group" aria-label="Product catalog flip book" style={{ width: single ? pw : 2 * pw, height: ph, '--pw': pw + 'px', transform: single ? 'none' : f === 0 ? 'translateX(-25%)' : f === S ? 'translateX(25%)' : 'none' }}>
          {!single && <><i className="bk-st l" style={{ width: Math.min(f * 2.2, 16) }} /><i className="bk-st r" style={{ width: Math.min((S - f) * 2.2, 16) }} /></>}
          {Array.from({ length: S }, (_, i) => {
            const fl = i < f, front = single ? pages[i] : pages[2 * i], back = single ? null : pages[2 * i + 1];
            const zi = mv[i] ? 100 + (dir.current > 0 ? i : S - i) : fl ? i : S - i;
            return <div key={i} className={'bk-sheet' + (fl ? ' tn' : '') + (mv[i] ? ' mv' : '')} style={{ zIndex: zi, left: single ? 0 : pw }}>
              <Face side="r" idx={single ? i : 2 * i} page={front} vis={vis.has(single ? i : 2 * i)} near={near(single ? i : 2 * i)} {...shared} />
              {single ? <div className="bk-face b blank" aria-hidden="true" /> : <Face side="l" idx={2 * i + 1} page={back} vis={vis.has(2 * i + 1)} near={near(2 * i + 1)} {...shared} />}
            </div>
          })}
        </div>
      </div>
      {!single && <button className="bk-nav r" aria-label="Next page" disabled={f >= END} onClick={() => turn(1)}><ChevronRight size={22} /></button>}
      {th && <div className="bk-th" data-lenis-prevent role="dialog" aria-label="All pages"><button className="bk-x" aria-label="Close" onClick={() => setTh(false)}><X size={20} /></button>
        {pages.map((pg, i) => <button key={i} onClick={() => jump(i)} className={vis.has(i) ? 'on' : ''}>
          <span className="bk-tm">{pg.k === 'items' ? <img src={pic(pg.items[0], 160)} data-src={pg.items[0].image} onError={onImgError} alt="" width="80" height="80" loading="lazy" decoding="async" /> : <b>{pg.k === 'cover' ? 'Cover' : pg.k === 'back' ? 'Back' : pg.k === 'toc' ? 'Contents' : 'Help'}</b>}</span>
          <em>{pg.k === 'items' ? `Page ${i + 1}` : pg.k === 'cover' ? 'Cover' : pg.k === 'back' ? 'Back cover' : `Page ${i + 1}`}</em></button>)}</div>}
    </div>
    <div className="bk-bar" role="toolbar" aria-label="Catalog controls">
      <button onClick={() => goto(0)} disabled={f === 0} aria-label="First page"><ChevronsLeft size={18} /></button>
      <button onClick={() => turn(-1)} disabled={f === 0} aria-label="Previous page"><ChevronLeft size={18} /></button>
      <span className="bk-ct" aria-live="polite">{label}</span>
      <button onClick={() => turn(1)} disabled={f >= END} aria-label="Next page"><ChevronRight size={18} /></button>
      <button onClick={() => goto(END)} disabled={f >= END} aria-label="Last page"><ChevronsRight size={18} /></button>
      <i className="bk-sp" />
      <button onClick={() => setZoom(v => !v)} aria-label={zoom ? 'Zoom out' : 'Zoom in'} className={zoom ? 'on' : ''}>{zoom ? <ZoomOut size={18} /> : <ZoomIn size={18} />}</button>
      <button onClick={() => setTh(true)} aria-label="All pages"><LayoutGrid size={18} /></button>
      <button onClick={fs} aria-label={full ? 'Exit full screen' : 'Full screen'}>{full ? <Minimize size={18} /> : <Maximize size={18} />}</button>
    </div>
  </div>;
}

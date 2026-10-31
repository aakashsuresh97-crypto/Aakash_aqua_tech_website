import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/* Banners added in the admin panel (same ones as the website). Auto-slides; hidden when there are none. */
export default function Banners({ list }) {
  const [i, setI] = useState(0), n = list?.length || 0;
  useEffect(() => { if (n < 2) return; const t = setInterval(() => setI(x => (x + 1) % n), 5000); return () => clearInterval(t) }, [n]);
  useEffect(() => { if (i >= n) setI(0) }, [n, i]);
  if (!n) return null;
  const go = d => setI(x => (x + d + n) % n);
  return <section className="bn" aria-label="Offers" aria-roledescription="carousel">
    <div className="bn-track" style={{ transform: `translateX(-${i * 100}%)` }}>
      {list.map((b, k) => {
        const ext = /^https?:\/\//.test(b.link || '');
        const pic = <picture>{b.mobileImage && <source media="(max-width:700px)" srcSet={b.mobileImage} />}<img src={b.image} alt={b.title || ''} loading={k ? 'lazy' : 'eager'} draggable={false} /></picture>;
        return <div className="bn-slide" key={b.id} aria-hidden={k !== i}>
          {b.link ? <a href={b.link} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})} tabIndex={k === i ? 0 : -1}>{pic}</a> : pic}
          {(b.title || b.subtitle || (b.link && b.button)) && <div className="bn-cap">
            {b.title && <b>{b.title}</b>}{b.subtitle && <span>{b.subtitle}</span>}
            {b.link && b.button && <a className="bn-btn" href={b.link} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})} tabIndex={k === i ? 0 : -1}>{b.button}</a>}
          </div>}
        </div>;
      })}
    </div>
    {n > 1 && <>
      <button className="bn-nav l" onClick={() => go(-1)} aria-label="Previous banner"><ChevronLeft size={20} /></button>
      <button className="bn-nav r" onClick={() => go(1)} aria-label="Next banner"><ChevronRight size={20} /></button>
      <div className="bn-dots">{list.map((b, k) => <button key={b.id} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={'Banner ' + (k + 1)} />)}</div>
    </>}
  </section>;
}

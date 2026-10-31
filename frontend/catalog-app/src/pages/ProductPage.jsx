import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Phone, Check, X } from 'lucide-react';
import BrandMark from '../components/BrandMark.jsx';
import { useData } from '../App.jsx';
import { loadProduct } from '../api.js';
import { inr, enquiry, small, onImgError, pic, picSet, CALL, CALL_TXT, splitList } from '../lib.js';

const LIST_KEYS = /^(membrane|pump|panel|vessel|panel & auto mpv|variations?|variant|colou?rs?|option)$/i;
const Cell = ({ k, v }) => { const L = LIST_KEYS.test(k) ? splitList(v) : [v]; return L.length > 1 ? <ul>{L.map((x, i) => <li key={i}>{x}</li>)}</ul> : v };

/* Two-column table (Specification | Details) or, when a product has several models, one column per model. */
const SpecTable = ({ title, head, rows, label = ['Specification', 'Details'] }) => rows?.length ? <section className="pd-sec"><h2>{title}</h2>
  <div className="pd-tablewrap" tabIndex={0} role="region" aria-label={title}><table className={'pd-table ' + (head ? 'multi' : 'two')} style={head ? { minWidth: 520 } : undefined}>
    <thead><tr>{head ? <><th scope="col">Specification</th>{head.map((h, i) => <th scope="col" key={i}>{h}</th>)}</> : <><th scope="col">{label[0]}</th><th scope="col">{label[1]}</th></>}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}><th scope="row">{r[0]}</th>{r.slice(1).map((c, j) => <td key={j}>{head ? c : <Cell k={r[0]} v={c} />}</td>)}</tr>)}</tbody>
  </table></div>{head && <p className="pd-hint">← Swipe sideways to compare all models →</p>}</section> : null;

export default function ProductPage() {
  const { slug } = useParams(), { products, categories } = useData(), nav = useNavigate(), p = products.find(x => x.slug === slug), [i, setI] = useState(0), [d, setD] = useState(null), [fail, setFail] = useState(false);
  useEffect(() => { setI(0); setD(null); setFail(false); if (p) { document.title = p.name + ' – Aakash Aqua Tech'; loadProduct(p.slug).then(setD).catch(() => setFail(true)) } }, [slug]);   // eslint-disable-line
  if (!p) return <main className="pd"><p className="ap-msg">Product not found. <Link to="/">Back to catalog</Link></p></main>;
  const c = categories.find(x => x.id === p.categoryId), s = c?.subs.find(x => x.id === p.subIds[0]);
  const imgs = d?.gallery?.length ? d.gallery : [p.image], off = p.mrp > p.price && p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
  const related = products.filter(x => x.id !== p.id && x.categoryId === p.categoryId && (!p.subIds[0] || x.subIds.includes(p.subIds[0]))).slice(0, 4);
  const extra = (d?.extra || []).map(e => [e[0], e[1]]);
  return <main className="pd">
    <div className="pd-top"><button className="pd-back" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))}><ArrowLeft size={16} />Back to catalog</button>
      <nav className="pd-crumb" aria-label="Breadcrumb"><Link to="/">Catalog</Link>{c && <> / <Link to={'/c/' + c.id}>{c.name}</Link></>}{s && <> / <Link to={`/c/${c.id}/${s.id}`}>{s.name}</Link></>}</nav></div>
    <div className="pd-grid">
      <div className="pd-gal">
        <div className="pd-main"><img key={imgs[i]} src={small(imgs[i], 900)} data-src={imgs[i]} onError={onImgError} alt={p.name} width="900" height="900" fetchpriority="high" decoding="async" /></div>
        {imgs.length > 1 && <div className="pd-th">{imgs.map((g, k) => <button key={g + k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={'Image ' + (k + 1)}><img src={small(g, 140)} data-src={g} onError={onImgError} alt="" width="70" height="70" loading="lazy" decoding="async" /></button>)}</div>}
      </div>
      <div className="pd-info">
        <span className="pd-brand"><BrandMark brand={p.brand} /></span>
        <h1>{p.name}</h1>
        <div className="pd-price">{p.price ? <><b>{inr(p.price)}</b>{p.mrp > p.price && <s>{inr(p.mrp)}</s>}{off > 0 && <em>Save {off}%</em>}</> : <b className="enq">Price on enquiry</b>}</div>
        <div className={'pd-stock' + (p.inStock ? '' : ' out')}>{p.inStock ? <><Check size={15} />In stock</> : <><X size={15} />Out of stock</>}</div>
        {d?.summary && <p className="pd-sum">{d.summary}</p>}
        {d?.features?.length > 0 && <ul className="pd-feat">{d.features.map((f, k) => <li key={k}><Check size={15} />{f}</li>)}</ul>}
        <div className="pd-cta">
          <a className="pd-btn pd-wa" href={enquiry(p)} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} />Enquire on WhatsApp</a>
          <a className="pd-btn" href={'tel:+' + CALL}><Phone size={17} />Call {CALL_TXT}</a>
        </div>
        <ul className="pd-trust"><li><Check size={14} />Free installation</li><li><Check size={14} />24-hour service</li><li><Check size={14} />Easy EMI options</li></ul>
      </div>
    </div>
    {!d && !fail && <section className="pd-sec"><div className="pd-skel" aria-label="Loading details" /></section>}
    {d && <>
      <div className="pd-cols">
        <SpecTable title="Product Details" rows={d.info} label={['Detail', 'Value']} />
        {!d.specs && extra.length > 0 && <SpecTable title="Technical Details" rows={extra} />}
      </div>
      {d.specs && <SpecTable title="Technical Specifications" head={d.specs.head} rows={d.specs.rows} />}
      {d.specs && extra.length > 0 && <SpecTable title="Additional Information" rows={extra} label={['Detail', 'Value']} />}
      {d.intro && <section className="pd-sec"><h2>About this product</h2><p className="pd-sum" style={{ margin: 0 }}>{d.intro}</p></section>}
      {d.benefits?.length > 0 && <section className="pd-sec"><h2>Benefits</h2><ul className="pd-feat">{d.benefits.map((f, k) => <li key={k}><Check size={15} />{f}</li>)}</ul></section>}
      {d.notes?.length > 0 && <section className="pd-sec"><h2>Notes</h2><ul className="pd-notes">{d.notes.map((n, k) => <li key={k}>{n}</li>)}</ul></section>}
      {!d.specs && !extra.length && <section className="pd-sec"><p className="pd-sum" style={{ margin: 0 }}>Detailed specifications for this model are available on request. <a href={enquiry(p)} target="_blank" rel="noopener noreferrer">Ask us on WhatsApp</a>.</p></section>}
    </>}
    {fail && <section className="pd-sec"><p className="pd-sum" style={{ margin: 0 }}>Could not load the specifications. Please refresh.</p></section>}
    {related.length > 0 && <section className="pd-sec"><h2>More like this</h2>
      <div className="pd-rel">{related.map(r => <Link key={r.id} to={'/p/' + r.slug}><img src={pic(r, 300)} srcSet={picSet(r, 300, 600)} sizes="(max-width:700px) 45vw, 220px" data-src={r.image} onError={onImgError} alt="" width="300" height="300" loading="lazy" decoding="async" /><span>{r.name}</span><b>{r.price ? inr(r.price) : 'Price on enquiry'}</b></Link>)}</div></section>}
  </main>;
}

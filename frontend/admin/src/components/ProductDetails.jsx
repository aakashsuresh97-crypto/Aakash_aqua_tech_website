import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import Spinner from './Spinner.jsx';
import CategoryImage from './CategoryImage.jsx';
import CategoryId from './CategoryId.jsx';
import { PublishBadge, StockBadge, buyBlockedReason, canBuy, formatMoney } from './ProductTable.jsx';
import { BoltIcon, CartIcon } from './Icons.jsx';
import { getProduct, normalizeSpecs } from '../api/productApi.js';

const fmt = (d) => (d ? new Date(d).toLocaleString() : '—');
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);

function Item({ term, children, wide }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-slate-400">{term}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}

/** Loads the product fresh from GET /products/:id when opened. Add to Cart / Buy Now follow the API's `actions` flags. */
export default function ProductDetails({ open, productId, onClose, onEdit, onAddToCart, onBuyNow }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (!open || !productId) return undefined;
    const controller = new AbortController();
    setItem(null);
    setError('');
    setQty(1);
    setLoading(true);
    getProduct(productId, controller.signal)
      .then((res) => setItem(res.data))
      .catch((err) => err.name !== 'AbortError' && setError(err.message))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [open, productId]);

  const specs = item ? normalizeSpecs(item.specifications) : [];
  const buyable = item ? canBuy(item) : false;
  const apiMax = item?.actions?.add_to_cart?.max_quantity; // null = no limit
  const max = apiMax === null || apiMax === undefined ? 100000 : Math.max(1, apiMax);
  const price = item ? item.effective_price ?? item.selling_price : 0;
  const pct = item?.effective_discount_percent;
  const ship = item?.shipping || {};
  const seo = item?.seo || {};
  const sizeText = [ship.length, ship.width, ship.height].every((x) => x !== null && x !== undefined) ? `${ship.length} × ${ship.width} × ${ship.height} cm` : '—';

  async function run(kind, fn) {
    setBusy(kind);
    try { await fn(item, qty); } finally { setBusy(''); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Product details"
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          {item && <button type="button" className="btn-secondary" onClick={() => onEdit(item)}>Edit</button>}
          {item && (
            <>
              <button type="button" className="btn-secondary text-emerald-700" disabled={!buyable || Boolean(busy)} onClick={() => run('cart', onAddToCart)}>
                {busy === 'cart' ? <Spinner className="h-4 w-4" /> : <CartIcon className="h-4 w-4" />} {item.actions?.add_to_cart?.label || 'Add to cart'}
              </button>
              <button type="button" className="btn-primary" disabled={!buyable || Boolean(busy)} onClick={() => run('buy', onBuyNow)}>
                {busy === 'buy' ? <Spinner className="h-4 w-4" /> : <BoltIcon className="h-4 w-4" />} {item.actions?.buy_now?.label || 'Buy now'}
              </button>
            </>
          )}
        </>
      }
    >
      {loading && <div className="flex justify-center py-10 text-indigo-600"><Spinner className="h-8 w-8" /></div>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {item && (
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <CategoryImage src={item.image_url} alt={item.product_name} className="h-28 w-28 rounded-xl" />
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900">{item.product_name}</h3>
              <p className="text-sm text-slate-500">{[item.category_name, item.subcategory_name].filter(Boolean).join(' › ')}{item.brand ? ` · ${item.brand}` : ''}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PublishBadge status={item.publish_status} />
                <StockBadge product={item} />
                {item.sale_active && <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">On sale</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="text-xl font-semibold text-slate-900">{formatMoney(price)}</span>
                {Number(price) < Number(item.mrp) && <span className="text-sm text-slate-400 line-through">{formatMoney(item.mrp)}</span>}
                {Number(pct) > 0 && <span className="text-sm font-medium text-emerald-600">{Number(pct)}% off</span>}
              </div>
              {item.short_description && <p className="mt-2 text-sm text-slate-600">{item.short_description}</p>}
            </div>
          </div>

          {buyable ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
              <label htmlFor="buy-qty" className="text-sm font-medium text-slate-700">Quantity</label>
              <input id="buy-qty" type="number" min="1" max={max} step="1" className="input w-24" value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(max, Math.floor(Number(e.target.value)) || 1)))} />
              <span className="text-xs text-slate-400">{apiMax === null || apiMax === undefined ? 'No stock limit' : `${apiMax} available`}</span>
            </div>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{buyBlockedReason(item) || 'This product cannot be bought right now.'}</p>
          )}

          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
            <Item term="ID" wide><CategoryId id={item.id} /></Item>
            <Item term="SKU"><span className="font-mono">{dash(item.sku)}</span></Item>
            <Item term="Slug"><span className="font-mono">{dash(item.slug)}</span></Item>
            <Item term="Type">{item.product_type === 'variable' ? 'Variable' : 'Simple'}{item.is_virtual ? ' · Virtual' : ''}{item.is_downloadable ? ' · Downloadable' : ''}</Item>
            <Item term="Brand">{dash(item.brand)}</Item>

            <Item term="MRP">{formatMoney(item.mrp)}</Item>
            <Item term="Regular price">{formatMoney(item.selling_price)} <span className="text-slate-400">({Number(item.discount_percent)}% off MRP)</span></Item>
            <Item term="Sale price">{item.sale_price === null ? '—' : formatMoney(item.sale_price)}</Item>
            <Item term="Sale period">{item.sale_price === null ? '—' : `${item.sale_start ? fmt(item.sale_start) : 'Now'} → ${item.sale_end ? fmt(item.sale_end) : 'No end'}`}</Item>
            <Item term="GST">{Number(item.gst_percent)} % <span className="text-slate-400">({item.tax_status})</span></Item>

            <Item term="Stock quantity">{item.stock_quantity}{item.manage_stock ? '' : ' (not tracked)'}</Item>
            <Item term="Backorders">{{ no: 'Not allowed', notify: 'Allowed, notify customer', yes: 'Allowed' }[item.backorders] || '—'}</Item>
            <Item term="Low stock threshold">{dash(item.low_stock_threshold)}</Item>
            <Item term="Stock status">{{ instock: 'In stock', outofstock: 'Out of stock', onbackorder: 'On backorder' }[item.stock_status] || '—'}</Item>

            <Item term="Description" wide><span className="whitespace-pre-line">{dash(item.description)}</span></Item>
            <div className="sm:col-span-2">
              <dt className="text-slate-400">Specifications</dt>
              <dd className="mt-1">
                {specs.length === 0 ? <span className="text-slate-800">—</span> : (
                  <table className="w-full overflow-hidden rounded-lg border border-slate-200 text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {specs.map((s, i) => (
                        <tr key={i}><th scope="row" className="w-2/5 bg-slate-50 px-3 py-1.5 text-left font-medium text-slate-600">{s.name}</th><td className="px-3 py-1.5 text-slate-800">{s.value}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </dd>
            </div>

            <Item term="Requires shipping">{ship.requires_shipping ? 'Yes' : 'No'}</Item>
            <Item term="Shipping class">{dash(ship.shipping_class)}</Item>
            <Item term="Weight">{ship.weight === null || ship.weight === undefined ? '—' : `${ship.weight} kg`}</Item>
            <Item term="Dimensions (L × W × H)">{sizeText}</Item>

            <Item term="SEO title" wide>{dash(seo.seo_title)}</Item>
            <Item term="Meta description" wide>{dash(seo.meta_description)}</Item>
            <Item term="Focus keyword">{dash(seo.focus_keyword)}</Item>
            <Item term="Additional keywords">{seo.additional_keywords?.length ? seo.additional_keywords.join(', ') : '—'}</Item>
            <Item term="Canonical URL" wide><span className="break-all">{dash(seo.canonical_url)}</span></Item>

            <Item term="Image" wide><span className="break-all">{dash(item.image_url)}</span></Item>
            <Item term="Created">{fmt(item.created_at)}</Item>
            <Item term="Last updated">{fmt(item.updated_at)}</Item>
          </dl>
        </div>
      )}
    </Modal>
  );
}

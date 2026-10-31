import CategoryImage from './CategoryImage.jsx';
import CategoryId from './CategoryId.jsx';
import { ArrowDownIcon, ArrowUpIcon, CartIcon, EyeIcon, PencilIcon, TrashIcon } from './Icons.jsx';

const CURRENCY = import.meta.env.VITE_CURRENCY || 'INR';

let moneyFmt;
try {
  moneyFmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY });
} catch {
  moneyFmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' });
}
export const formatMoney = (n) => (n === null || n === undefined || n === '' || Number.isNaN(Number(n)) ? '—' : moneyFmt.format(Number(n)));

const pill = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset';

/** draft / published / inactive (publish_status from the API). */
export function PublishBadge({ status }) {
  const map = {
    published: ['Published', 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', 'bg-emerald-500'],
    draft: ['Draft', 'bg-amber-50 text-amber-700 ring-amber-600/20', 'bg-amber-500'],
    inactive: ['Inactive', 'bg-slate-100 text-slate-600 ring-slate-500/20', 'bg-slate-400'],
  };
  const [text, tone, dot] = map[status] || map.inactive;
  return (
    <span className={`${pill} gap-1.5 ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {text}
    </span>
  );
}

/** Uses the API's own stock_status / low_stock flags, so the thresholds are the ones saved on the product. */
export function StockBadge({ product }) {
  const q = Number(product.stock_quantity) || 0;
  let text;
  let tone;
  if (product.stock_status === 'outofstock') { text = 'Out of stock'; tone = 'bg-red-50 text-red-700 ring-red-600/20'; }
  else if (product.stock_status === 'onbackorder') { text = 'On backorder'; tone = 'bg-sky-50 text-sky-700 ring-sky-600/20'; }
  else if (product.low_stock) { text = `Low stock · ${q}`; tone = 'bg-amber-50 text-amber-700 ring-amber-600/20'; }
  else { text = product.manage_stock ? `In stock · ${q}` : 'In stock'; tone = 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'; }
  return <span className={`${pill} ${tone}`}>{text}</span>;
}

/** The API tells the UI whether Add to Cart / Buy Now are allowed (inactive, draft or out of stock products are not). */
export const canBuy = (p) => Boolean(p?.actions?.add_to_cart?.enabled);
export const buyBlockedReason = (p) => {
  const r = p?.actions?.add_to_cart?.disabled_reason;
  if (r === 'PRODUCT_INACTIVE') return 'This product is not published, so it cannot be bought.';
  if (r === 'OUT_OF_STOCK') return 'This product is out of stock.';
  return '';
};

/** Price the customer pays now (sale price while a sale is on), with MRP struck through. */
export function PriceCell({ product }) {
  const price = product.effective_price ?? product.selling_price;
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">{formatMoney(price)}</p>
      {Number(price) < Number(product.mrp) && <p className="text-xs text-slate-400 line-through">{formatMoney(product.mrp)}</p>}
      {product.sale_active && <p className="text-xs font-medium text-rose-600">On sale</p>}
      {!product.sale_active && product.sale_price !== null && product.sale_price !== undefined && <p className="text-xs text-slate-400">Sale {formatMoney(product.sale_price)} scheduled</p>}
    </div>
  );
}

function Actions({ product, onView, onEdit, onDelete, onAddToCart }) {
  const btn = 'rounded-md p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';
  const name = product.product_name;
  const buyable = canBuy(product);
  return (
    <div className="flex items-center justify-end gap-1">
      <button type="button" title={buyable ? 'Add to cart' : buyBlockedReason(product) || 'Unavailable'} aria-label={`Add ${name} to cart`} disabled={!buyable} onClick={() => onAddToCart(product)} className={`${btn} text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent`}><CartIcon className="h-5 w-5" /></button>
      <button type="button" title="View" aria-label={`View ${name}`} onClick={() => onView(product)} className={`${btn} text-slate-500 hover:bg-slate-100 hover:text-slate-700`}><EyeIcon className="h-5 w-5" /></button>
      <button type="button" title="Edit" aria-label={`Edit ${name}`} onClick={() => onEdit(product)} className={`${btn} text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700`}><PencilIcon className="h-5 w-5" /></button>
      <button type="button" title="Archive or delete" aria-label={`Archive or delete ${name}`} onClick={() => onDelete(product)} className={`${btn} text-red-500 hover:bg-red-50 hover:text-red-700`}><TrashIcon className="h-5 w-5" /></button>
    </div>
  );
}

/** Column header that sorts on the server when clicked (asc -> desc -> asc). */
function SortTh({ label, field, sort, onSort, className = '' }) {
  const active = sort.by === field;
  return (
    <th className={`px-4 py-3 ${className}`} aria-sort={active ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(field)} className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-800 ${active ? 'text-indigo-700' : ''}`}>
        {label}
        {active && (sort.order === 'asc' ? <ArrowUpIcon className="h-3.5 w-3.5" /> : <ArrowDownIcon className="h-3.5 w-3.5" />)}
      </button>
    </th>
  );
}

export default function ProductTable({ products, sort, onSort, ...handlers }) {
  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Image</th>
              <SortTh label="Product" field="product_name" sort={sort} onSort={onSort} />
              <th className="px-4 py-3">Category</th>
              <SortTh label="SKU" field="sku" sort={sort} onSort={onSort} />
              <SortTh label="MRP" field="mrp" sort={sort} onSort={onSort} />
              <SortTh label="Price" field="selling_price" sort={sort} onSort={onSort} />
              <SortTh label="Stock" field="stock_quantity" sort={sort} onSort={onSort} />
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500"><CategoryId id={p.id} short /></td>
                <td className="px-4 py-3"><CategoryImage src={p.image_url} alt={p.product_name} /></td>
                <td className="max-w-[14rem] px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">{p.product_name}</p>
                  {p.brand && <p className="line-clamp-1 text-xs text-slate-500">{p.brand}</p>}
                  {p.product_type === 'variable' && <p className="text-xs text-indigo-600">Variable product</p>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {p.category_name || '—'}
                  {p.subcategory_name && <span className="block text-xs text-slate-400">{p.subcategory_name}</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">{p.sku || '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">{formatMoney(p.mrp)}</td>
                <td className="whitespace-nowrap px-4 py-3"><PriceCell product={p} /></td>
                <td className="whitespace-nowrap px-4 py-3"><StockBadge product={p} /></td>
                <td className="whitespace-nowrap px-4 py-3"><PublishBadge status={p.publish_status} /></td>
                <td className="px-4 py-3"><Actions product={p} {...handlers} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {products.map((p) => (
          <li key={p.id} className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <CategoryImage src={p.image_url} alt={p.product_name} className="h-14 w-14 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{p.product_name}</p>
                  <PublishBadge status={p.publish_status} />
                </div>
                <p className="text-xs text-slate-400">{[p.category_name, p.subcategory_name].filter(Boolean).join(' › ') || '—'}</p>
                <p className="text-xs text-slate-400">ID <CategoryId id={p.id} short />{p.sku ? <> · SKU <span className="font-mono">{p.sku}</span></> : null}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <PriceCell product={p} />
                  <StockBadge product={p} />
                </div>
              </div>
            </div>
            <Actions product={p} {...handlers} />
          </li>
        ))}
      </ul>
    </>
  );
}

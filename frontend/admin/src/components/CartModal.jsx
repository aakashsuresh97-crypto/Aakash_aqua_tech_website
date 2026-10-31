import Modal from './Modal.jsx';
import CategoryImage from './CategoryImage.jsx';
import { formatMoney } from './ProductTable.jsx';
import { CartIcon, TrashIcon } from './Icons.jsx';

// The API's prices are GST-inclusive, so GST is shown as the part of the total that is tax.
export function cartTotals(items) {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const gst = items.reduce((s, i) => s + (i.price * i.qty - (i.price * i.qty) / (1 + i.gst / 100)), 0);
  const mrpTotal = items.reduce((s, i) => s + (i.mrp || i.price) * i.qty, 0);
  return { subtotal: total - gst, gst, total, savings: Math.max(0, mrpTotal - total) };
}

/** Client-side cart (the API has no cart/order storage yet). Quantities are capped at the stock seen when the item was added. */
export default function CartModal({ open, cart, onClose }) {
  const { items } = cart;
  const t = cartTotals(items);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cart${cart.count ? ` (${cart.count})` : ''}`}
      footer={
        <>
          {items.length > 0 && <button type="button" className="btn-secondary text-red-600" onClick={cart.clear}>Clear cart</button>}
          <button type="button" className="btn-primary" onClick={onClose}>{items.length ? 'Continue shopping' : 'Close'}</button>
        </>
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><CartIcon className="h-6 w-6" /></div>
          <p className="font-medium text-slate-900">Your cart is empty</p>
          <p className="text-sm text-slate-500">Use “Add to cart” on an active, in-stock product.</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-3">
                <CategoryImage src={i.image} alt={i.name} className="h-14 w-14 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{i.name}</p>
                  <p className="text-xs text-slate-400">{i.sku ? `SKU ${i.sku} · ` : ''}{formatMoney(i.price)} each</p>
                  <div className="mt-1 flex items-center gap-2">
                    <label htmlFor={`qty-${i.id}`} className="sr-only">Quantity of {i.name}</label>
                    <input id={`qty-${i.id}`} type="number" min="1" max={i.max} className="input w-20 py-1" value={i.qty}
                      onChange={(e) => cart.setQty(i.id, Math.floor(Number(e.target.value)) || 1)} />
                    <span className="text-xs text-slate-400">max {i.max}</span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-900">{formatMoney(i.price * i.qty)}</p>
                <button type="button" aria-label={`Remove ${i.name}`} title="Remove" className="rounded-md p-2 text-red-500 hover:bg-red-50" onClick={() => cart.remove(i.id)}><TrashIcon className="h-5 w-5" /></button>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Price before GST</dt><dd className="text-slate-800">{formatMoney(t.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">GST (included)</dt><dd className="text-slate-800">{formatMoney(t.gst)}</dd></div>
            {t.savings > 0 && <div className="flex justify-between text-emerald-700"><dt>You save vs MRP</dt><dd>{formatMoney(t.savings)}</dd></div>}
            <div className="flex justify-between text-base font-semibold"><dt className="text-slate-900">Total</dt><dd className="text-slate-900">{formatMoney(t.total)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-slate-400">This is a staff price check: it validates stock and prices only and creates no order. Customers order from the website, and their orders appear under Sales &gt; Orders.</p>
        </>
      )}
    </Modal>
  );
}

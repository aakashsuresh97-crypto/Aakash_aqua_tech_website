import Modal from './Modal.jsx';
import CategoryImage from './CategoryImage.jsx';
import { formatMoney } from './ProductTable.jsx';

/** Result of POST /products/:id/buy-now. The API only validates stock and prices: it creates no order and takes no payment. */
export default function CheckoutSummaryModal({ open, result, onClose }) {
  const items = result?.items || [];
  const s = result?.price_summary;
  return (
    <Modal open={open} onClose={onClose} title="Buy now: checkout summary" size="md"
      footer={<button type="button" className="btn-primary" onClick={onClose}>Close</button>}>
      <ul className="divide-y divide-slate-100">
        {items.map((i) => (
          <li key={i.product_id} className="flex items-center gap-3 py-3">
            <CategoryImage src={i.image_url} alt={i.product_name} className="h-14 w-14 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{i.product_name}</p>
              <p className="text-xs text-slate-400">{i.quantity} × {formatMoney(i.unit_price)}{i.brand ? ` · ${i.brand}` : ''}</p>
            </div>
            <p className="text-sm font-semibold text-slate-900">{formatMoney(i.line_total)}</p>
          </li>
        ))}
      </ul>
      {s && (
        <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">MRP total</dt><dd className="text-slate-800">{formatMoney(s.mrp_total)}</dd></div>
          <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd>− {formatMoney(s.discount_total)}</dd></div>
          <div className="flex justify-between text-base font-semibold"><dt className="text-slate-900">Total payable</dt><dd className="text-slate-900">{formatMoney(s.total_payable)}</dd></div>
        </dl>
      )}
      <p className="mt-3 text-xs text-slate-400">Stock and price are confirmed. This staff check creates no order and takes no payment; customer orders are placed on the website.</p>
    </Modal>
  );
}

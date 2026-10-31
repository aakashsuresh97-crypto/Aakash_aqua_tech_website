import Modal from './Modal.jsx';
import Spinner from './Spinner.jsx';
import { ExclamationIcon } from './Icons.jsx';

/** DELETE /products/:id?mode=archive keeps the product but takes it off sale; mode=delete removes it for good. */
export default function ProductConfirmDialog({ open, product, busy, onCancel, onConfirm }) {
  const archived = product?.publish_status === 'inactive';
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Archive or delete product"
      size="sm"
      closeDisabled={Boolean(busy)}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={Boolean(busy)}>Cancel</button>
          <button type="button" className="btn-secondary" onClick={() => onConfirm('archive')} disabled={Boolean(busy) || archived} title={archived ? 'Already inactive' : undefined}>
            {busy === 'archive' && <Spinner className="h-4 w-4" />}
            {busy === 'archive' ? 'Archiving…' : 'Archive'}
          </button>
          <button type="button" className="btn-danger" onClick={() => onConfirm('delete')} disabled={Boolean(busy)}>
            {busy === 'delete' && <Spinner className="h-4 w-4" />}
            {busy === 'delete' ? 'Deleting…' : 'Delete permanently'}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ExclamationIcon className="h-6 w-6" />
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <p><span className="font-semibold text-slate-900">{product?.product_name}</span>{product?.sku ? ` (SKU ${product.sku})` : ''}</p>
          <p><span className="font-medium text-slate-800">Archive</span> keeps the product but marks it Inactive, so it is hidden and cannot be bought. You can publish it again later.</p>
          <p><span className="font-medium text-slate-800">Delete permanently</span> removes it from the database. This cannot be undone.</p>
        </div>
      </div>
    </Modal>
  );
}

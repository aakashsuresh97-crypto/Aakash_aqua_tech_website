import Modal from './Modal.jsx';
import Spinner from './Spinner.jsx';
import { ExclamationIcon } from './Icons.jsx';

export default function SubcategoryConfirmDialog({ open, subcategory, busy, onCancel, onConfirm }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Delete subcategory"
      size="sm"
      closeDisabled={busy}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />}
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ExclamationIcon className="h-6 w-6" />
        </div>
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold text-slate-900">{subcategory?.subcategory_name}</span>? Its brands and image are removed too. This cannot be undone.
        </p>
      </div>
    </Modal>
  );
}
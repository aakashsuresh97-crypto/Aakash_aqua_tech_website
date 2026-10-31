import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import Spinner from './Spinner.jsx';
import CategoryImage from './CategoryImage.jsx';
import StatusBadge from './StatusBadge.jsx';
import CategoryId from './CategoryId.jsx';
import { getCategory } from '../api/categoryApi.js';

const fmt = (d) => (d ? new Date(d).toLocaleString() : '—');

/** Loads the category fresh from GET /categories/:id when opened. */
export default function CategoryDetails({ open, categoryId, onClose, onEdit }) {
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !categoryId) return undefined;
    const controller = new AbortController();
    setCategory(null);
    setError('');
    setLoading(true);
    getCategory(categoryId, controller.signal)
      .then((res) => setCategory(res.data))
      .catch((err) => err.name !== 'AbortError' && setError(err.message))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [open, categoryId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Category details"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          {category && <button type="button" className="btn-primary" onClick={() => onEdit(category)}>Edit</button>}
        </>
      }
    >
      {loading && <div className="flex justify-center py-10 text-indigo-600"><Spinner className="h-8 w-8" /></div>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {category && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <CategoryImage src={category.image} alt={category.category_name} className="h-24 w-24 rounded-xl" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{category.category_name}</h3>
              <div className="mt-1"><StatusBadge status={category.status} /></div>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2"><dt className="text-slate-400">ID</dt><dd className="text-slate-800"><CategoryId id={category.id} /></dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-400">Description</dt><dd className="whitespace-pre-line text-slate-800">{category.description || '—'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-400">Image</dt><dd className="break-all text-slate-800">{category.image || '—'}</dd></div>
            <div><dt className="text-slate-400">Created</dt><dd className="text-slate-800">{fmt(category.created_at)}</dd></div>
            <div><dt className="text-slate-400">Last updated</dt><dd className="text-slate-800">{fmt(category.updated_at)}</dd></div>
          </dl>
        </div>
      )}
    </Modal>
  );
}

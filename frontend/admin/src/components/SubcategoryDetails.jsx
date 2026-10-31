import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import Spinner from './Spinner.jsx';
import CategoryImage from './CategoryImage.jsx';
import CategoryId from './CategoryId.jsx';
import StatusBadge from './StatusBadge.jsx';
import { BrandChips } from './SubcategoryTable.jsx';
import { getSubcategory } from '../api/subcategoryApi.js';

const fmt = (d) => (d ? new Date(d).toLocaleString() : '—');

/** Loads the subcategory fresh from GET /subcategories/:id when opened. */
export default function SubcategoryDetails({ open, subcategoryId, onClose, onEdit }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !subcategoryId) return undefined;
    const controller = new AbortController();
    setItem(null);
    setError('');
    setLoading(true);
    getSubcategory(subcategoryId, controller.signal)
      .then((res) => setItem(res.data))
      .catch((err) => err.name !== 'AbortError' && setError(err.message))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [open, subcategoryId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Subcategory details"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          {item && <button type="button" className="btn-primary" onClick={() => onEdit(item)}>Edit</button>}
        </>
      }
    >
      {loading && <div className="flex justify-center py-10 text-indigo-600"><Spinner className="h-8 w-8" /></div>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {item && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <CategoryImage src={item.image} alt={item.subcategory_name} className="h-24 w-24 rounded-xl" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{item.subcategory_name}</h3>
              <p className="text-sm text-slate-500">in {item.category_name}</p>
              <div className="mt-1"><StatusBadge status={item.status} /></div>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2"><dt className="text-slate-400">ID</dt><dd className="text-slate-800"><CategoryId id={item.id} /></dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-400">Category ID</dt><dd className="text-slate-800"><CategoryId id={item.category_id} /></dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-400">Brands</dt><dd className="mt-1"><BrandChips brands={item.brand_names} max={100} /></dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-400">Description</dt><dd className="whitespace-pre-line text-slate-800">{item.description || '—'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-400">Image</dt><dd className="break-all text-slate-800">{item.image || '—'}</dd></div>
            <div><dt className="text-slate-400">Created</dt><dd className="text-slate-800">{fmt(item.created_at)}</dd></div>
            <div><dt className="text-slate-400">Last updated</dt><dd className="text-slate-800">{fmt(item.updated_at)}</dd></div>
          </dl>
        </div>
      )}
    </Modal>
  );
}
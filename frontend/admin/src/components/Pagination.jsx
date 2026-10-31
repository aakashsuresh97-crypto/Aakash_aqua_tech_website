import { ChevronLeftIcon, ChevronRightIcon } from './Icons.jsx';

export default function Pagination({ meta, onPage, disabled }) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{from}–{to}</span> of <span className="font-medium text-slate-700">{meta.total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary px-3 py-1.5" disabled={disabled || meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          <ChevronLeftIcon className="h-4 w-4" /> Prev
        </button>
        <span className="text-sm text-slate-500">Page {meta.page} of {meta.totalPages}</span>
        <button type="button" className="btn-secondary px-3 py-1.5" disabled={disabled || meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
          Next <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

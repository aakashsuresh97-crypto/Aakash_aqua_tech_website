import CategoryImage from './CategoryImage.jsx';
import CategoryId from './CategoryId.jsx';
import StatusBadge from './StatusBadge.jsx';
import { EyeIcon, PencilIcon, TrashIcon } from './Icons.jsx';

function Actions({ category, onView, onEdit, onDelete }) {
  const btn = 'rounded-md p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';
  return (
    <div className="flex items-center justify-end gap-1">
      <button type="button" title="View" aria-label={`View ${category.category_name}`} onClick={() => onView(category)} className={`${btn} text-slate-500 hover:bg-slate-100 hover:text-slate-700`}><EyeIcon className="h-5 w-5" /></button>
      <button type="button" title="Edit" aria-label={`Edit ${category.category_name}`} onClick={() => onEdit(category)} className={`${btn} text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700`}><PencilIcon className="h-5 w-5" /></button>
      <button type="button" title="Delete" aria-label={`Delete ${category.category_name}`} onClick={() => onDelete(category)} className={`${btn} text-red-500 hover:bg-red-50 hover:text-red-700`}><TrashIcon className="h-5 w-5" /></button>
    </div>
  );
}

export default function CategoryTable({ categories, ...handlers }) {
  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Category name</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500"><CategoryId id={c.id} short /></td>
                <td className="px-4 py-3"><CategoryImage src={c.image} alt={c.category_name} /></td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{c.category_name}</td>
                <td className="max-w-xs px-4 py-3 text-sm text-slate-500"><p className="line-clamp-2">{c.description || <span className="text-slate-300">—</span>}</p></td>
                <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3"><Actions category={c} {...handlers} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {categories.map((c) => (
          <li key={c.id} className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <CategoryImage src={c.image} alt={c.category_name} className="h-14 w-14 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{c.category_name}</p>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-xs text-slate-400">ID <CategoryId id={c.id} short /></p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description || '—'}</p>
              </div>
            </div>
            <Actions category={c} {...handlers} />
          </li>
        ))}
      </ul>
    </>
  );
}

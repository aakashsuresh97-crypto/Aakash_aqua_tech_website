import CategoryImage from './CategoryImage.jsx';
import CategoryId from './CategoryId.jsx';
import StatusBadge from './StatusBadge.jsx';
import { EyeIcon, PencilIcon, TrashIcon } from './Icons.jsx';

/** Brand chips; shows the first few and "+N" for the rest (full list is in the details dialog). */
export function BrandChips({ brands, max = 3 }) {
  if (!brands?.length) return <span className="text-slate-300">—</span>;
  const shown = brands.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((b) => <span key={b} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">{b}</span>)}
      {brands.length > max && <span title={brands.slice(max).join(', ')} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">+{brands.length - max}</span>}
    </div>
  );
}

function Actions({ subcategory, onView, onEdit, onDelete }) {
  const btn = 'rounded-md p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';
  const name = subcategory.subcategory_name;
  return (
    <div className="flex items-center justify-end gap-1">
      <button type="button" title="View" aria-label={`View ${name}`} onClick={() => onView(subcategory)} className={`${btn} text-slate-500 hover:bg-slate-100 hover:text-slate-700`}><EyeIcon className="h-5 w-5" /></button>
      <button type="button" title="Edit" aria-label={`Edit ${name}`} onClick={() => onEdit(subcategory)} className={`${btn} text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700`}><PencilIcon className="h-5 w-5" /></button>
      <button type="button" title="Delete" aria-label={`Delete ${name}`} onClick={() => onDelete(subcategory)} className={`${btn} text-red-500 hover:bg-red-50 hover:text-red-700`}><TrashIcon className="h-5 w-5" /></button>
    </div>
  );
}

export default function SubcategoryTable({ subcategories, ...handlers }) {
  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Subcategory</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Brands</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {subcategories.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500"><CategoryId id={s.id} short /></td>
                <td className="px-4 py-3"><CategoryImage src={s.image} alt={s.subcategory_name} /></td>
                <td className="max-w-xs px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">{s.subcategory_name}</p>
                  {s.description && <p className="line-clamp-1 text-xs text-slate-500">{s.description}</p>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{s.category_name}</td>
                <td className="max-w-[16rem] px-4 py-3"><BrandChips brands={s.brand_names} /></td>
                <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3"><Actions subcategory={s} {...handlers} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {subcategories.map((s) => (
          <li key={s.id} className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <CategoryImage src={s.image} alt={s.subcategory_name} className="h-14 w-14 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{s.subcategory_name}</p>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-xs text-slate-400">in {s.category_name} · ID <CategoryId id={s.id} short /></p>
                <div className="mt-1"><BrandChips brands={s.brand_names} /></div>
                {s.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{s.description}</p>}
              </div>
            </div>
            <Actions subcategory={s} {...handlers} />
          </li>
        ))}
      </ul>
    </>
  );
}
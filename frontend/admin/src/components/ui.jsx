import Spinner from './Spinner.jsx';
import { ExclamationIcon, RefreshIcon } from './Icons.jsx';

export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : '—');
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** Loading / error / empty states for a list. Renders children when there is data. */
export function ListState({ loading, error, empty, emptyText = 'Nothing here yet.', onRetry, children }) {
  if (loading && empty) return <div className="flex justify-center py-16 text-slate-500"><Spinner className="h-7 w-7" label="Loading" /></div>;
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 px-4 py-14 text-center">
        <ExclamationIcon className="h-8 w-8 text-red-500" />
        <p className="text-sm text-slate-700">{error}</p>
        {onRetry && <button type="button" className="btn-secondary" onClick={onRetry}><RefreshIcon className="h-4 w-4" /> Try again</button>}
      </div>
    );
  }
  if (empty) return <p className="px-4 py-14 text-center text-sm text-slate-500">{emptyText}</p>;
  return children;
}

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
};
export function Badge({ tone = 'slate', children }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${TONES[tone]}`}>{children}</span>;
}

/** Search box + selects used above the tables. filters = [{ name, label, options: [[value, label]] }] */
export function FilterBar({ search, onSearch, searchPlaceholder = 'Search…', filters = [], values = {}, onChange, children }) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-4">
      <div className="min-w-[12rem] flex-1">
        <label htmlFor="flt-search" className="mb-1 block text-xs font-medium text-slate-500">Search</label>
        <input id="flt-search" type="search" className="input" value={search} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} />
      </div>
      {filters.map((f) => (
        <div key={f.name}>
          <label htmlFor={`flt-${f.name}`} className="mb-1 block text-xs font-medium text-slate-500">{f.label}</label>
          {f.type === 'date' ? (
            <input id={`flt-${f.name}`} type="date" className="input" value={values[f.name] || ''} onChange={(e) => onChange(f.name, e.target.value)} />
          ) : (
            <select id={`flt-${f.name}`} className="input" value={values[f.name] || ''} onChange={(e) => onChange(f.name, e.target.value)}>
              <option value="">All</option>
              {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          )}
        </div>
      ))}
      {children}
    </div>
  );
}

/** Simple responsive table: on small screens it scrolls sideways. columns = [{ key, label, render?(row), className }] */
export function DataTable({ columns, rows, rowKey = 'id', actions }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((c) => <th key={c.key} scope="col" className="whitespace-nowrap px-4 py-3">{c.label}</th>)}
            {actions && <th scope="col" className="px-4 py-3 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((r) => (
            <tr key={r[rowKey]} className="align-top hover:bg-slate-50/60">
              {columns.map((c) => <td key={c.key} className={`px-4 py-3 text-slate-700 ${c.className || ''}`}>{c.render ? c.render(r) : (r[c.key] ?? '—')}</td>)}
              {actions && <td className="whitespace-nowrap px-4 py-3 text-right">{actions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ErrorList({ error }) {
  if (!error) return null;
  return (
    <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      <p className="font-medium">{error.message}</p>
      {error.errors?.length > 0 && <ul className="mt-1 list-disc pl-5">{error.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
    </div>
  );
}

export function DeleteDialogBody({ name }) {
  return <p className="text-sm text-slate-600">Delete <span className="font-semibold text-slate-900">{name}</span>? This permanently removes it and cannot be undone.</p>;
}

import ImageUrlField from './ImageUrlField.jsx';

/** One form control from a field config: { name, label, type, options, help, required, rows, min, max, step, placeholder } */
export default function FormField({ field, value, onChange, error, disabled, idPrefix = 'f' }) {
  const id = `${idPrefix}-${field.name}`;
  const common = { id, disabled, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-err` : field.help ? `${id}-help` : undefined };
  const cls = `input ${error ? 'input-error' : ''}`;
  let control;
  switch (field.type) {
    case 'image':
      return (
        <div className={field.half ? '' : 'sm:col-span-2'}>
          <ImageUrlField id={id} label={field.label} value={value} onChange={(v) => onChange(field.name, v)} disabled={disabled} />
          {field.help && <p className="mt-1 text-xs text-slate-500">{field.help}</p>}
        </div>
      );
    case 'textarea':
      control = <textarea {...common} rows={field.rows || 4} className={cls} value={value ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(field.name, e.target.value)} />;
      break;
    case 'select':
      control = (
        <select {...common} className={cls} value={value ?? ''} onChange={(e) => onChange(field.name, e.target.value)}>
          {!field.required && <option value="">—</option>}
          {field.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      );
      break;
    case 'status':
      control = (
        <select {...common} className={cls} value={String(value ?? 1)} onChange={(e) => onChange(field.name, Number(e.target.value))}>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      );
      break;
    case 'number':
      control = <input {...common} type="number" inputMode="decimal" className={cls} value={value ?? ''} min={field.min} max={field.max} step={field.step} onChange={(e) => onChange(field.name, e.target.value)} />;
      break;
    case 'datetime':
      control = <input {...common} type="datetime-local" className={cls} value={value ?? ''} onChange={(e) => onChange(field.name, e.target.value)} />;
      break;
    case 'url':
      control = <input {...common} type="text" inputMode="url" className={cls} value={value ?? ''} placeholder={field.placeholder || 'https://… or /path'} onChange={(e) => onChange(field.name, e.target.value)} />;
      break;
    default:
      control = <input {...common} type="text" className={cls} value={value ?? ''} maxLength={field.maxLength} placeholder={field.placeholder} onChange={(e) => onChange(field.name, e.target.value)} />;
  }
  return (
    <div className={field.half ? '' : 'sm:col-span-2'}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {field.label}{field.required && <span className="text-red-500" aria-hidden="true"> *</span>}
      </label>
      {control}
      {error ? <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-red-600">{error}</p> : field.help && <p id={`${id}-help`} className="mt-1 text-xs text-slate-500">{field.help}</p>}
    </div>
  );
}

// ISO string from the API <-> value of <input type="datetime-local"> (local time)
export const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : '');

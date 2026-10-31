import { useState } from 'react';
import { XIcon } from './Icons.jsx';

const MAX_BRANDS = 50;

/**
 * Brand names as removable chips.
 * Type a name and press Enter or comma to add it (pasting "Kent, Aquaguard" adds both);
 * Backspace on an empty box removes the last chip. Duplicates are ignored (case-insensitive).
 */
export default function BrandInput({ id = 'brand-input', value, onChange, error, disabled }) {
  const [text, setText] = useState('');

  function addFrom(raw) {
    const incoming = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!incoming.length) return;
    const next = [...value];
    for (const name of incoming) {
      if (next.length >= MAX_BRANDS) break;
      if (!next.some((b) => b.toLowerCase() === name.toLowerCase())) next.push(name.slice(0, 100));
    }
    onChange(next);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault(); // Enter must not submit the form
      addFrom(text);
      setText('');
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">Brand names</label>
      <div className={`flex flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 shadow-sm focus-within:ring-2 ${error ? 'border-red-400 focus-within:ring-red-500/30' : 'border-slate-300 focus-within:border-indigo-500 focus-within:ring-indigo-500/30'}`}>
        {value.map((b) => (
          <span key={b} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
            {b}
            <button type="button" disabled={disabled} aria-label={`Remove ${b}`} onClick={() => onChange(value.filter((x) => x !== b))} className="rounded-full text-indigo-400 hover:text-indigo-700">
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          disabled={disabled || value.length >= MAX_BRANDS}
          maxLength={100}
          onChange={(e) => (e.target.value.includes(',') ? (addFrom(e.target.value), setText('')) : setText(e.target.value))}
          onKeyDown={onKeyDown}
          onBlur={() => { addFrom(text); setText(''); }}
          placeholder={value.length ? 'Add another…' : 'Type a brand and press Enter, e.g. Kent'}
          className="min-w-[10rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
        />
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : <p className="mt-1 text-xs text-slate-400">Press Enter or comma after each brand. Up to {MAX_BRANDS}.</p>}
    </div>
  );
}
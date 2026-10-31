import { useState } from 'react';

/** Short form of a UUID for tables: 36a8b30f-e1bc-... -> 36a8b30f. */
export const shortId = (id) => String(id ?? '').slice(0, 8);

/**
 * Shows a category UUID. `short` shows only the first 8 characters (the full id is in the tooltip);
 * the full id is always one click away: clicking copies it to the clipboard.
 */
export default function CategoryId({ id, short = false, className = '' }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(String(id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (e.g. insecure origin): the full id is still visible/selectable */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? 'Copied!' : `${id} (click to copy)`}
      className={`font-mono text-left hover:text-indigo-600 ${short ? '' : 'break-all'} ${className}`}
    >
      {short ? `${shortId(id)}…` : id}
      {copied && <span className="ml-2 font-sans text-xs text-emerald-600">Copied</span>}
    </button>
  );
}

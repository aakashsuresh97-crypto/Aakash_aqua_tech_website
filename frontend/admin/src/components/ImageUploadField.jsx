import { useEffect, useRef, useState } from 'react';
import CategoryImage from './CategoryImage.jsx';
import Spinner from './Spinner.jsx';
import { PhotoIcon, TrashIcon, XIcon } from './Icons.jsx';

export const MAX_IMAGE_MB = Number(import.meta.env.VITE_MAX_IMAGE_MB) > 0 ? Number(import.meta.env.VITE_MAX_IMAGE_MB) : 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Returns an error message, or '' when the file is acceptable. */
export function validateImageFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPG, PNG, WEBP or GIF images are allowed.';
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    return `Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is ${MAX_IMAGE_MB} MB.`;
  }
  return '';
}

const formatSize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/**
 * Image picker with preview.
 *  - file:        newly chosen File (previewed locally, uploaded once, when you save)
 *  - currentUrl:  image already saved on the category (shown when no new file is chosen)
 *  - removed:     true when the user clicked "Remove" on the saved image
 */
export default function ImageUploadField({ id = 'image-file', label = 'Image', file, currentUrl, removed, error, uploading, progress, disabled, onSelect, onError, onRemove, onUndoRemove }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragging, setDragging] = useState(false);

  // Local preview of the chosen file; the object URL is released when it changes or the form closes.
  useEffect(() => {
    if (!file) { setPreviewUrl(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f) {
    if (!f) return;
    const problem = validateImageFile(f);
    if (problem) return onError(problem);
    onSelect(f);
  }

  const shown = previewUrl || (removed ? '' : currentUrl || '');
  const hasImage = Boolean(file || (currentUrl && !removed));

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) pick(e.dataTransfer.files?.[0]); }}
        className={`flex items-start gap-4 rounded-lg border border-dashed p-3 transition ${error ? 'border-red-400 bg-red-50/40' : dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300'}`}
      >
        <div className="relative">
          <CategoryImage src={shown} alt="Category image preview" className="h-24 w-24 rounded-lg" />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-900/50 text-white" aria-live="polite">
              <Spinner className="h-6 w-6" label="Uploading image" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; /* allow re-picking the same file */ }}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" disabled={disabled} onClick={() => inputRef.current?.click()}>
              <PhotoIcon className="h-4 w-4" /> {hasImage ? 'Change image' : 'Upload image'}
            </button>
            {file && (
              <button type="button" className="btn-secondary" disabled={disabled} onClick={() => onSelect(null)}>
                <XIcon className="h-4 w-4" /> Discard new
              </button>
            )}
            {!file && currentUrl && !removed && (
              <button type="button" className="btn-secondary text-red-600 hover:bg-red-50" disabled={disabled} onClick={onRemove}>
                <TrashIcon className="h-4 w-4" /> Remove
              </button>
            )}
            {!file && removed && (
              <button type="button" className="btn-secondary" disabled={disabled} onClick={onUndoRemove}>Undo remove</button>
            )}
          </div>

          {file && (
            <p className="truncate text-xs text-slate-600" title={file.name}>
              {file.name} · {formatSize(file.size)} <span className="text-slate-400">— uploaded once when you save, then its URL is saved</span>
            </p>
          )}
          {!file && removed && <p className="text-xs text-amber-600">The image will be removed when you save.</p>}
          {!file && !removed && !currentUrl && <p className="text-xs text-slate-400">JPG, PNG, WEBP or GIF, up to {MAX_IMAGE_MB} MB. You can also drop a file here.</p>}

          {uploading && (
            <div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{progress < 100 ? `Uploading image… ${progress}%` : 'Processing…'}</p>
            </div>
          )}
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

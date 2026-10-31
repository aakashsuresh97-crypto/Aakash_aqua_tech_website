import { useEffect, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import Spinner from './Spinner.jsx';
import ImageUploadField from './ImageUploadField.jsx';
import { ApiRequestError, deleteUploadedImage, uploadImage } from '../api/categoryApi.js';

const EMPTY = { category_name: '', description: '', status: 1 };

function validate(v) {
  const errors = {};
  const name = v.category_name.trim();
  if (!name) errors.category_name = 'Category name is required';
  else if (name.length < 2 || name.length > 100) errors.category_name = 'Name must be 2-100 characters';
  if (v.description.length > 2000) errors.description = 'Description must be at most 2000 characters';
  return errors;
}

export default function CategoryForm({ open, category, onClose, onSubmit }) {
  const editing = Boolean(category);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);   // newly chosen file (not uploaded yet)
  const [removeImage, setRemoveImage] = useState(false); // user removed the saved image
  const [imageError, setImageError] = useState('');
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(''); // '' | 'uploading' | 'saving'
  // File already uploaded to the server (we hold its URL) but not yet saved on a category.
  const uploaded = useRef(null); // { file, url }

  useEffect(() => {
    if (!open) return;
    setValues(
      category
        ? { category_name: category.category_name, description: category.description || '', status: Number(category.status) }
        : EMPTY
    );
    setImageFile(null);
    setRemoveImage(false);
    setImageError('');
    setProgress(0);
    setErrors({});
    setFormError('');
    setSaving(false);
    setPhase('');
    uploaded.current = null;
  }, [open, category]);

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setFormError('');
    setImageError('');
    setProgress(0);

    const name = values.category_name.trim();
    const description = values.description.trim();

    // Step 1: upload the file (multipart) - only when a new file was chosen, and only once:
    // if saving fails and the user retries, the already-uploaded URL is reused.
    let imageUrl;
    if (imageFile) {
      if (uploaded.current?.file === imageFile) {
        imageUrl = uploaded.current.url;
      } else {
        setPhase('uploading');
        try {
          const res = await uploadImage(imageFile, setProgress);
          imageUrl = res.data.url;
          uploaded.current = { file: imageFile, url: imageUrl };
        } catch (err) {
          const detail = err instanceof ApiRequestError && err.errors.length ? err.errors.join('; ') : '';
          setImageError(detail || err.message || 'Image upload failed');
          setSaving(false);
          setPhase('');
          return; // the chosen file stays selected so the user can retry or pick another one
        }
      }
    }

    // Step 2: save the category as plain JSON. `image` is just the URL string (or null to remove the image).
    setPhase('saving');
    const payload = {
      category_name: name,
      description: description || null,
      status: values.status,
      ...(imageUrl ? { image: imageUrl } : removeImage ? { image: null } : {}),
    };

    try {
      await onSubmit(payload);
      uploaded.current = null; // now referenced by the category
    } catch (err) {
      const detail = err instanceof ApiRequestError && err.errors.length ? err.errors.join('; ') : '';
      if (err instanceof ApiRequestError && err.status === 409) setErrors({ category_name: err.message });
      else if (err instanceof ApiRequestError && /image/i.test(err.message)) setImageError(detail || err.message);
      else if (detail) setFormError(`${err.message}: ${detail}`);
      else setFormError(err.message || 'Something went wrong');
      setSaving(false);
      setPhase('');
    }
  }

  // Throw away an upload that was never saved (picked another file, discarded it, or cancelled the form).
  function discardUploaded() {
    const u = uploaded.current;
    uploaded.current = null;
    if (u) deleteUploadedImage(u.url).catch(() => { /* best effort; the cleanup script removes leftovers */ });
  }

  function handleClose() {
    discardUploaded();
    onClose();
  }

  const fieldClass = (f) => `input ${errors[f] ? 'input-error' : ''}`;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={editing ? 'Edit category' : 'Add category'}
      closeDisabled={saving}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={handleClose} disabled={saving}>Cancel</button>
          <button type="submit" form="category-form" className="btn-primary" disabled={saving}>
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? (phase === 'uploading' && progress < 100 ? `Uploading image… ${progress}%` : 'Saving…') : editing ? 'Save changes' : 'Create category'}
          </button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}

        <div>
          <label htmlFor="category_name" className="mb-1 block text-sm font-medium text-slate-700">Category name <span className="text-red-500">*</span></label>
          <input id="category_name" className={fieldClass('category_name')} value={values.category_name} onChange={set('category_name')} maxLength={100} placeholder="e.g. Water Purifiers" autoFocus />
          {errors.category_name && <p className="mt-1 text-xs text-red-600">{errors.category_name}</p>}
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea id="description" rows={3} className={fieldClass('description')} value={values.description} onChange={set('description')} maxLength={2000} placeholder="Short description (optional)" />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
        </div>

        <ImageUploadField
          file={imageFile}
          currentUrl={category?.image || ''}
          removed={removeImage}
          error={imageError}
          uploading={phase === 'uploading'}
          progress={progress}
          disabled={saving}
          onSelect={(f) => { if (uploaded.current && uploaded.current.file !== f) discardUploaded(); setImageFile(f); setImageError(''); setProgress(0); if (f) setRemoveImage(false); }}
          onError={setImageError}
          onRemove={() => { setRemoveImage(true); setImageError(''); }}
          onUndoRemove={() => setRemoveImage(false)}
        />

        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
          <div>
            <p id="status-label" className="text-sm font-medium text-slate-700">Status</p>
            <p className="text-xs text-slate-400">{values.status === 1 ? 'Active — visible' : 'Inactive — hidden'}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={values.status === 1}
            aria-labelledby="status-label"
            onClick={() => setValues((v) => ({ ...v, status: v.status === 1 ? 0 : 1 }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${values.status === 1 ? 'bg-indigo-600' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${values.status === 1 ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

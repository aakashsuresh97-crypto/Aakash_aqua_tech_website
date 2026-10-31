import { useEffect, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import Spinner from './Spinner.jsx';
import ImageUploadField from './ImageUploadField.jsx';
import BrandInput from './BrandInput.jsx';
import { ApiRequestError, deleteUploadedImage, uploadImage } from '../api/categoryApi.js';

const EMPTY = { category_id: '', subcategory_name: '', description: '', status: 1 };

function validate(v) {
  const errors = {};
  const name = v.subcategory_name.trim();
  if (!v.category_id) errors.category_id = 'Choose the category this subcategory belongs to';
  if (!name) errors.subcategory_name = 'Subcategory name is required';
  else if (name.length < 2 || name.length > 100) errors.subcategory_name = 'Name must be 2-100 characters';
  if (v.description.length > 2000) errors.description = 'Description must be at most 2000 characters';
  return errors;
}

/**
 * Add / edit subcategory. Image flow is the same as the category form:
 * 1) the file is uploaded once (multipart, file only), 2) the subcategory is saved as JSON with `image: <url>`.
 */
export default function SubcategoryForm({ open, subcategory, categories, categoriesLoading, defaultCategoryId, onClose, onSubmit }) {
  const editing = Boolean(subcategory);
  const [values, setValues] = useState(EMPTY);
  const [brands, setBrands] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(''); // '' | 'uploading' | 'saving'
  const uploaded = useRef(null); // { file, url } uploaded but not yet saved on a subcategory

  useEffect(() => {
    if (!open) return;
    setValues(
      subcategory
        ? { category_id: subcategory.category_id, subcategory_name: subcategory.subcategory_name, description: subcategory.description || '', status: Number(subcategory.status) }
        : { ...EMPTY, category_id: defaultCategoryId || '' }
    );
    setBrands(subcategory?.brand_names || []);
    setImageFile(null);
    setRemoveImage(false);
    setImageError('');
    setProgress(0);
    setErrors({});
    setFormError('');
    setSaving(false);
    setPhase('');
    uploaded.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subcategory]);

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

    // Step 1: upload the file once (reused if saving fails and the user retries).
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
          return;
        }
      }
    }

    // Step 2: save as plain JSON; `image` is only a URL string (or null to remove the image).
    setPhase('saving');
    const payload = {
      category_id: values.category_id,
      subcategory_name: values.subcategory_name.trim(),
      brand_names: brands,
      description: values.description.trim() || null,
      status: values.status,
      ...(imageUrl ? { image: imageUrl } : removeImage ? { image: null } : {}),
    };

    try {
      await onSubmit(payload);
      uploaded.current = null; // now referenced by the subcategory
    } catch (err) {
      const list = err instanceof ApiRequestError ? err.errors : [];
      const detail = list.join('; ');
      if (err instanceof ApiRequestError && err.status === 409) setErrors({ subcategory_name: err.message });
      else if (list.some((m) => /category_id/.test(m))) setErrors({ category_id: list.find((m) => /category_id/.test(m)) });
      else if (list.some((m) => /brand/.test(m))) setErrors({ brand_names: list.find((m) => /brand/.test(m)) });
      else if (err instanceof ApiRequestError && /image/i.test(err.message)) setImageError(detail || err.message);
      else if (detail) setFormError(`${err.message}: ${detail}`);
      else setFormError(err.message || 'Something went wrong');
      setSaving(false);
      setPhase('');
    }
  }

  // Throw away an upload that was never saved (picked another file or cancelled the form).
  function discardUploaded() {
    const u = uploaded.current;
    uploaded.current = null;
    if (u) deleteUploadedImage(u.url).catch(() => { /* best effort; npm run cleanup:uploads removes leftovers */ });
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
      title={editing ? 'Edit subcategory' : 'Add subcategory'}
      closeDisabled={saving}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={handleClose} disabled={saving}>Cancel</button>
          <button type="submit" form="subcategory-form" className="btn-primary" disabled={saving || categoriesLoading}>
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? (phase === 'uploading' && progress < 100 ? `Uploading image… ${progress}%` : 'Saving…') : editing ? 'Save changes' : 'Create subcategory'}
          </button>
        </>
      }
    >
      <form id="subcategory-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}

        <div>
          <label htmlFor="category_id" className="mb-1 block text-sm font-medium text-slate-700">Category <span className="text-red-500">*</span></label>
          <select id="category_id" className={fieldClass('category_id')} value={values.category_id} onChange={set('category_id')} disabled={categoriesLoading}>
            <option value="">{categoriesLoading ? 'Loading categories…' : 'Select a category'}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.category_id && <p className="mt-1 text-xs text-red-600">{errors.category_id}</p>}
        </div>

        <div>
          <label htmlFor="subcategory_name" className="mb-1 block text-sm font-medium text-slate-700">Subcategory name <span className="text-red-500">*</span></label>
          <input id="subcategory_name" className={fieldClass('subcategory_name')} value={values.subcategory_name} onChange={set('subcategory_name')} maxLength={100} placeholder="e.g. RO Water Purifier" autoFocus />
          {errors.subcategory_name && <p className="mt-1 text-xs text-red-600">{errors.subcategory_name}</p>}
        </div>

        <BrandInput value={brands} onChange={(b) => { setBrands(b); setErrors((er) => ({ ...er, brand_names: undefined })); }} error={errors.brand_names} disabled={saving} />

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea id="description" rows={3} className={fieldClass('description')} value={values.description} onChange={set('description')} maxLength={2000} placeholder="Short description (optional)" />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
        </div>

        <ImageUploadField
          file={imageFile}
          currentUrl={subcategory?.image || ''}
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
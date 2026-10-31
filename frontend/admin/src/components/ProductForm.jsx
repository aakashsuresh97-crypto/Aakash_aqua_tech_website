import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import Spinner from './Spinner.jsx';
import ImageUploadField from './ImageUploadField.jsx';
import useSubcategoryOptions from '../hooks/useSubcategoryOptions.js';
import useBrandOptions from '../hooks/useBrandOptions.js';
import { specTemplateFor } from './specTemplates.js';
import { normalizeSpecs } from '../api/productApi.js';
import { ApiRequestError, deleteUploadedImage, uploadImage } from '../api/categoryApi.js';
import { PlusIcon, XIcon } from './Icons.jsx';
import { formatMoney } from './ProductTable.jsx';

const MAX_SPECS = 50;
const SKU_RE = /^[A-Za-z0-9][A-Za-z0-9._\-/]*$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'seo', label: 'SEO' },
];

// Which tab each field lives on (used to open the tab that has an error).
const FIELD_TAB = {
  category_id: 'general', subcategory_id: 'general', product_name: 'general', slug: 'general', sku: 'general', product_type: 'general', brand: 'general', brand_id: 'general',
  short_description: 'general', description: 'general', specifications: 'general', publish_status: 'general', image_url: 'general',
  mrp: 'pricing', selling_price: 'pricing', sale_price: 'pricing', sale_start: 'pricing', sale_end: 'pricing', gst_percent: 'pricing', tax_status: 'pricing',
  stock_quantity: 'inventory', manage_stock: 'inventory', backorders: 'inventory', low_stock_threshold: 'inventory', stock_status: 'inventory',
  weight: 'shipping', length: 'shipping', width: 'shipping', height: 'shipping', shipping_class: 'shipping', requires_shipping: 'shipping',
  seo_title: 'seo', meta_description: 'seo', focus_keyword: 'seo', additional_keywords: 'seo', canonical_url: 'seo',
};

const EMPTY = {
  category_id: '', subcategory_id: '', product_name: '', slug: '', sku: '', product_type: 'simple', is_virtual: false, is_downloadable: false, brand: '', brand_id: '',
  short_description: '', description: '', publish_status: 'published',
  mrp: '', selling_price: '', sale_price: '', sale_start: '', sale_end: '', gst_percent: '18', tax_status: 'taxable',
  stock_quantity: '0', manage_stock: true, backorders: 'no', low_stock_threshold: '', stock_status: 'instock',
  requires_shipping: true, weight: '', length: '', width: '', height: '', shipping_class: '',
  seo_title: '', meta_description: '', focus_keyword: '', additional_keywords: '', canonical_url: '',
};

const isNum = (s) => String(s).trim() !== '' && Number.isFinite(Number(s));
const toStr = (v, fallback = '') => (v === null || v === undefined ? fallback : String(v));
const maxDecimals = (s, n) => !String(s).includes('.') || String(s).split('.')[1].length <= n;

// ISO string from the API <-> value of <input type="datetime-local"> (local time)
const pad = (n) => String(n).padStart(2, '0');
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const toIso = (local) => (local ? new Date(local).toISOString() : null);

function fromProduct(p) {
  return {
    category_id: p.category_id || '', subcategory_id: p.subcategory_id || '', product_name: p.product_name || '', slug: p.slug || '', sku: p.sku || '',
    product_type: p.product_type || 'simple', is_virtual: Boolean(p.is_virtual), is_downloadable: Boolean(p.is_downloadable), brand: p.brand || '', brand_id: p.brand_id || '',
    short_description: p.short_description || '', description: p.description || '', publish_status: p.publish_status || 'published',
    mrp: toStr(p.mrp), selling_price: toStr(p.selling_price), sale_price: toStr(p.sale_price), sale_start: toLocalInput(p.sale_start), sale_end: toLocalInput(p.sale_end),
    gst_percent: toStr(p.gst_percent, '0'), tax_status: p.tax_status || 'taxable',
    stock_quantity: toStr(p.stock_quantity, '0'), manage_stock: p.manage_stock !== false, backorders: p.backorders || 'no',
    low_stock_threshold: toStr(p.low_stock_threshold), stock_status: p.stock_status || 'instock',
    requires_shipping: p.shipping?.requires_shipping !== false, weight: toStr(p.shipping?.weight), length: toStr(p.shipping?.length),
    width: toStr(p.shipping?.width), height: toStr(p.shipping?.height), shipping_class: p.shipping?.shipping_class || '',
    seo_title: p.seo?.seo_title || '', meta_description: p.seo?.meta_description || '', focus_keyword: p.seo?.focus_keyword || '',
    additional_keywords: (p.seo?.additional_keywords || []).join(', '), canonical_url: p.seo?.canonical_url || '',
  };
}

const parseKeywords = (s) => [...new Set(s.split(',').map((k) => k.trim()).filter(Boolean))];

// Same rules as the API, so most mistakes are caught before the request is sent.
// Keep in sync with SUBCATEGORY_REQUIRED in the API (product.controller.js).
const SUBCATEGORY_REQUIRED = ['domestic ro', 'water treatment plant'];
const needsSub = (categories, id) => SUBCATEGORY_REQUIRED.includes(String(categories.find((c) => c.id === id)?.name || '').trim().toLowerCase());

function validate(v, specs, categories) {
  const e = {};
  const name = v.product_name.trim();
  if (!v.category_id) e.category_id = 'Choose a category';
  if (!v.subcategory_id && needsSub(categories, v.category_id)) e.subcategory_id = 'Choose a subcategory';
  if (!name) e.product_name = 'Product name is required';
  else if (name.length < 2 || name.length > 200) e.product_name = 'Name must be 2-200 characters';
  const sku = v.sku.trim();
  if (sku && (sku.length > 64 || !SKU_RE.test(sku))) e.sku = 'Up to 64 characters: letters, numbers, dot, dash, underscore or slash';
  const slug = v.slug.trim();
  if (slug && (slug.length > 200 || !SLUG_RE.test(slug))) e.slug = 'Lower-case letters, numbers and single dashes, e.g. kent-grand-plus';
  if (!v.brand_id) e.brand_id = 'Choose a brand';
  if (v.short_description.length > 1000) e.short_description = 'At most 1000 characters';
  if (v.description.length > 20000) e.description = 'At most 20000 characters';
  if (specs.length && specs.some((s) => !s.name.trim() && s.value.trim())) e.specifications = 'Every specification value needs a name';
  else if (specs.some((s) => s.name.length > 100 || s.value.length > 500)) e.specifications = 'Names are limited to 100 and values to 500 characters';
  else if (new Set(specs.filter((s) => s.name.trim()).map((s) => s.name.trim().toLowerCase())).size !== specs.filter((s) => s.name.trim()).length) e.specifications = 'A specification name is listed more than once';

  if (!isNum(v.mrp)) e.mrp = 'MRP is required';
  else if (Number(v.mrp) <= 0) e.mrp = 'MRP must be greater than 0';
  else if (!maxDecimals(v.mrp, 2)) e.mrp = 'At most 2 decimal places';
  if (!isNum(v.selling_price)) e.selling_price = 'Regular price is required';
  else if (Number(v.selling_price) <= 0) e.selling_price = 'Price must be greater than 0';
  else if (!maxDecimals(v.selling_price, 2)) e.selling_price = 'At most 2 decimal places';
  else if (!e.mrp && Number(v.selling_price) > Number(v.mrp)) e.selling_price = 'Regular price cannot be higher than the MRP';
  if (v.sale_price !== '') {
    if (!isNum(v.sale_price) || Number(v.sale_price) <= 0) e.sale_price = 'Sale price must be greater than 0';
    else if (!maxDecimals(v.sale_price, 2)) e.sale_price = 'At most 2 decimal places';
    else if (!e.selling_price && Number(v.sale_price) > Number(v.selling_price)) e.sale_price = 'Sale price cannot be higher than the regular price';
  } else if (v.sale_start || v.sale_end) e.sale_price = 'Enter a sale price to use sale dates';
  if (v.sale_start && v.sale_end && new Date(v.sale_end) <= new Date(v.sale_start)) e.sale_end = 'Sale end must be after the start';
  if (!isNum(v.gst_percent) || Number(v.gst_percent) < 0 || Number(v.gst_percent) > 100) e.gst_percent = 'GST must be between 0 and 100 %';

  if (!isNum(v.stock_quantity)) e.stock_quantity = 'Stock quantity is required';
  else if (!Number.isInteger(Number(v.stock_quantity)) || Number(v.stock_quantity) < 0 || Number(v.stock_quantity) > 1000000) e.stock_quantity = 'A whole number from 0 to 1,000,000';
  if (v.low_stock_threshold !== '' && (!isNum(v.low_stock_threshold) || !Number.isInteger(Number(v.low_stock_threshold)) || Number(v.low_stock_threshold) < 0)) e.low_stock_threshold = 'A whole number, 0 or more';

  for (const [key, places] of [['weight', 3], ['length', 2], ['width', 2], ['height', 2]]) {
    if (v[key] !== '' && (!isNum(v[key]) || Number(v[key]) < 0 || !maxDecimals(v[key], places))) e[key] = `0 or more, at most ${places} decimals`;
  }
  if (v.shipping_class.length > 100) e.shipping_class = 'At most 100 characters';

  if (v.seo_title.length > 255) e.seo_title = 'At most 255 characters';
  if (v.meta_description.length > 500) e.meta_description = 'At most 500 characters';
  if (v.focus_keyword.length > 150) e.focus_keyword = 'At most 150 characters';
  const kw = parseKeywords(v.additional_keywords);
  if (kw.length > 20 || kw.some((k) => k.length > 100)) e.additional_keywords = 'At most 20 keywords of up to 100 characters';
  if (v.canonical_url.trim() && !/^https?:\/\/\S+$/i.test(v.canonical_url.trim())) e.canonical_url = 'Must start with http:// or https://';
  return e;
}

/** Turns the API's error messages ("sku must be ...", "shipping.weight must be ...") into per-field errors. */
function mapServerErrors(err) {
  const fields = {};
  const rest = [];
  const messages = err.errors?.length ? err.errors : [err.message];
  for (const m of messages) {
    let key = (/^([a-z_]+(?:\.[a-z_]+)?)\b/i.exec(m) || [])[1]?.toLowerCase().replace(/^(shipping|seo)\./, '');
    if (/^sale_start \/ sale_end/i.test(m)) key = 'sale_price';
    else if (/specification/i.test(m)) key = 'specifications';
    else if (/^regular_price|^discount_percent|^selling_price/i.test(m)) key = 'selling_price';
    else if (/^sku already|sku "/i.test(m) || /^sku/i.test(err.message) && err.status === 409) key = 'sku';
    else if (/slug/i.test(m) && err.status === 409) key = 'slug';
    if (key && FIELD_TAB[key] && !fields[key]) fields[key] = m;
    else rest.push(m);
  }
  return { fields, rest };
}

const label = 'mb-1 block text-sm font-medium text-slate-700';
const req = <span className="text-red-500">*</span>;

function Field({ id, text, required, error, hint, className = '', children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={label}>{text} {required && req}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Toggle({ id, checked, onChange, title, description, disabled }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
      <div>
        <p id={`${id}-label`} className="text-sm font-medium text-slate-700">{title}</p>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>
      <button
        type="button" id={id} role="switch" aria-checked={checked} aria-labelledby={`${id}-label`} disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

/**
 * Add / edit product for POST/PUT /api/v1/products.
 * Image flow: 1) the file is uploaded once to /api/uploads/images, 2) the product is saved as JSON with `image_url: <url>`.
 * The discount is calculated by the database from MRP and regular price, so it is shown here but never sent.
 */
export default function ProductForm({ open, product, categories, categoriesLoading, defaultCategoryId, defaultSubcategoryId, onClose, onSubmit }) {
  const editing = Boolean(product);
  const [tab, setTab] = useState('general');
  const [values, setValues] = useState(EMPTY);
  const [specs, setSpecs] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(''); // '' | 'uploading' | 'saving'
  const uploaded = useRef(null); // { file, url } uploaded but not yet saved on a product

  const { subcategories, loading: subsLoading, error: subsError } = useSubcategoryOptions(open ? values.category_id : '');
  // the usual spec keys for this category / subcategory (see specTemplates.js)
  const specTemplate = useMemo(
    () => specTemplateFor(categories.find((c) => c.id === values.category_id)?.name, subcategories.find((s) => s.id === values.subcategory_id)?.name),
    [categories, subcategories, values.category_id, values.subcategory_id]
  );
  const { brands, loading: brandsLoading, error: brandsError } = useBrandOptions(open);
  // A product saved before brands had ids only has the brand's name: once the brand list is loaded, select the brand with that name.
  useEffect(() => {
    if (!open || values.brand_id || !values.brand.trim() || !brands.length) return;
    const match = brands.find((b) => b.name.trim().toLowerCase() === values.brand.trim().toLowerCase());
    if (match) setValues((v) => (v.brand_id ? v : { ...v, brand_id: match.id }));
  }, [open, brands, values.brand, values.brand_id]);

  useEffect(() => {
    if (!open) return;
    setTab('general');
    setValues(product ? fromProduct(product) : { ...EMPTY, category_id: defaultCategoryId || '', subcategory_id: defaultCategoryId ? defaultSubcategoryId || '' : '' });
    setSpecs(product ? normalizeSpecs(product.specifications) : []);
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
  }, [open, product]);

  const clearError = (...fields) => setErrors((er) => { const n = { ...er }; fields.forEach((f) => { n[f] = undefined; }); return n; });
  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    clearError(field);
  };
  const setVal = (field, value) => { setValues((v) => ({ ...v, [field]: value })); clearError(field); };

  // Changing the category empties the subcategory: only the new category's subcategories may be picked.
  function changeCategory(e) {
    setValues((v) => ({ ...v, category_id: e.target.value, subcategory_id: '' }));
    clearError('category_id', 'subcategory_id');
  }
  function changeVirtual(on) {
    setValues((v) => ({ ...v, is_virtual: on, requires_shipping: on ? false : v.requires_shipping }));
  }

  // "Fill default keys": adds every usual key of this category (values left empty, the grey text is an example).
  // Rows you already filled keep their value, and your own extra rows stay at the end.
  const fillDefaultSpecs = () => {
    setSpecs((list) => {
      const have = new Map(list.filter((s) => s.name.trim()).map((s) => [s.name.trim().toLowerCase(), s]));
      const names = new Set(specTemplate.rows.map(([n]) => n.toLowerCase()));
      const fromTemplate = specTemplate.rows.map(([name, hint]) => ({ ...(have.get(name.toLowerCase()) || { name, value: '' }), hint }));
      const mine = list.filter((s) => (s.name.trim() || s.value.trim()) && !names.has(s.name.trim().toLowerCase()));
      return [...fromTemplate, ...mine].slice(0, MAX_SPECS);
    });
    clearError('specifications');
  };

  const updateSpec = (i, field, value) => {
    setSpecs((list) => list.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
    clearError('specifications');
  };

  const showTabWithError = (found) => {
    const firstTab = TABS.find((t) => Object.entries(found).some(([f, m]) => m && FIELD_TAB[f] === t.key));
    if (firstTab) setTab(firstTab.key);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(values, specs, categories);
    setErrors(found);
    if (Object.keys(found).length) { showTabWithError(found); return; }

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
          setTab('general');
          setSaving(false);
          setPhase('');
          return;
        }
      }
    }

    // Step 2: save as plain JSON; `image_url` is only a URL string (or null to remove the image).
    setPhase('saving');
    const num = (s) => (s === '' ? null : Number(s));
    const payload = {
      category_id: values.category_id,
      subcategory_id: values.subcategory_id || null,
      product_name: values.product_name.trim(),
      sku: values.sku.trim() || null,
      ...(values.slug.trim() ? { slug: values.slug.trim().toLowerCase() } : {}), // blank = the API keeps / generates the slug
      product_type: values.product_type,
      is_virtual: values.is_virtual,
      is_downloadable: values.is_downloadable,
      brand_id: values.brand_id, // the brand's UUID; the API fills in the name from it
      mrp: Number(values.mrp),
      selling_price: Number(values.selling_price),
      sale_price: num(values.sale_price),
      sale_start: values.sale_price === '' ? null : toIso(values.sale_start),
      sale_end: values.sale_price === '' ? null : toIso(values.sale_end),
      gst_percent: Number(values.gst_percent),
      tax_status: values.tax_status,
      short_description: values.short_description.trim() || null,
      description: values.description.trim() || null,
      stock_quantity: Number(values.stock_quantity),
      manage_stock: values.manage_stock,
      backorders: values.backorders,
      low_stock_threshold: num(values.low_stock_threshold),
      stock_status: values.stock_status,
      specifications: specs.filter((s) => s.name.trim() && s.value.trim()).map((s) => ({ name: s.name.trim(), value: s.value.trim() })),
      publish_status: values.publish_status,
      shipping: {
        requires_shipping: values.is_virtual ? false : values.requires_shipping,
        weight: num(values.weight), length: num(values.length), width: num(values.width), height: num(values.height),
        shipping_class: values.shipping_class.trim() || null,
      },
      seo: {
        seo_title: values.seo_title.trim() || null,
        meta_description: values.meta_description.trim() || null,
        focus_keyword: values.focus_keyword.trim() || null,
        additional_keywords: parseKeywords(values.additional_keywords),
        canonical_url: values.canonical_url.trim() || null,
      },
      ...(imageUrl ? { image_url: imageUrl } : removeImage ? { image_url: null } : {}),
    };

    try {
      await onSubmit(payload);
      uploaded.current = null; // now referenced by the product
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const { fields, rest } = mapServerErrors(err);
        if (fields.image_url) { setImageError(fields.image_url); delete fields.image_url; }
        setErrors(fields);
        showTabWithError({ ...fields, ...(imageError ? { image_url: 1 } : {}) });
        if (rest.length) setFormError(err.message && !rest.includes(err.message) ? `${err.message}: ${rest.join('; ')}` : rest.join('; '));
      } else {
        setFormError(err.message || 'Something went wrong');
      }
      setSaving(false);
      setPhase('');
    }
  }

  // Throw away an upload that was never saved (picked another file or cancelled the form).
  function discardUploaded() {
    const u = uploaded.current;
    uploaded.current = null;
    if (u) deleteUploadedImage(u.url).catch(() => { /* best effort; leftovers are removed by the API's cleanup script */ });
  }
  function handleClose() {
    discardUploaded();
    onClose();
  }

  const fc = (f) => `input ${errors[f] ? 'input-error' : ''}`;
  const tabHasError = (key) => Object.entries(errors).some(([f, m]) => m && FIELD_TAB[f] === key) || (key === 'general' && Boolean(imageError));
  const discountPct = isNum(values.mrp) && isNum(values.selling_price) && Number(values.mrp) > 0 && Number(values.selling_price) <= Number(values.mrp)
    ? Math.round(((Number(values.mrp) - Number(values.selling_price)) / Number(values.mrp)) * 10000) / 100 : null;
  const salePct = discountPct !== null && isNum(values.sale_price) && Number(values.sale_price) > 0 && Number(values.sale_price) <= Number(values.selling_price)
    ? Math.round(((Number(values.mrp) - Number(values.sale_price)) / Number(values.mrp)) * 10000) / 100 : null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={editing ? 'Edit product' : 'Add product'}
      size="lg"
      closeDisabled={saving}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={handleClose} disabled={saving}>Cancel</button>
          <button type="submit" form="product-form" className="btn-primary" disabled={saving || categoriesLoading}>
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? (phase === 'uploading' && progress < 100 ? `Uploading image… ${progress}%` : 'Saving…') : editing ? 'Save changes' : 'Create product'}
          </button>
        </>
      }
    >
      <div role="tablist" aria-label="Product sections" className="-mt-1 mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key} type="button" role="tab" id={`tab-${t.key}`} aria-selected={tab === t.key} aria-controls="product-form"
            onClick={() => setTab(t.key)}
            className={`relative -mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
            {tabHasError(t.key) && <span className="absolute right-0.5 top-1.5 h-2 w-2 rounded-full bg-red-500" title="This section has errors" />}
          </button>
        ))}
      </div>

      <form id="product-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}

        {/* ---------------- General ---------------- */}
        <div className={tab === 'general' ? 'space-y-4' : 'hidden'} role="tabpanel" aria-labelledby="tab-general">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="category_id" text="Category" required error={errors.category_id}>
              <select id="category_id" className={fc('category_id')} value={values.category_id} onChange={changeCategory} disabled={categoriesLoading || saving}>
                <option value="">{categoriesLoading ? 'Loading categories…' : 'Select a category'}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field id="subcategory_id" text="Subcategory" required={needsSub(categories, values.category_id)} error={errors.subcategory_id}>
              <select id="subcategory_id" className={fc('subcategory_id')} value={values.subcategory_id} onChange={set('subcategory_id')} disabled={!values.category_id || subsLoading || saving}>
                <option value="">
                  {!values.category_id ? 'Select a category first' : subsLoading ? 'Loading subcategories…' : subcategories.length ? (needsSub(categories, values.category_id) ? 'Select a subcategory' : 'None (optional)') : (needsSub(categories, values.category_id) ? 'No subcategories in this category' : 'None (optional)')}
                </option>
                {subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}{s.active ? '' : ' (inactive)'}</option>)}
              </select>
              {subsError && <p role="alert" className="mt-1 text-xs text-red-600">Could not load subcategories: {subsError}</p>}
              {values.category_id && needsSub(categories, values.category_id) && !subsLoading && !subsError && subcategories.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">Add a subcategory to this category first on the <a className="font-medium text-indigo-600 hover:underline" href="#/subcategories">Subcategories</a> page.</p>
              )}
            </Field>
          </div>

          <Field id="product_name" text="Product name" required error={errors.product_name}>
            <input id="product_name" className={fc('product_name')} value={values.product_name} onChange={set('product_name')} maxLength={200} placeholder="e.g. Aqua Pro 7-Stage RO Purifier" autoFocus />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="sku" text="SKU" error={errors.sku} hint="Optional, must be unique">
              <input id="sku" className={`${fc('sku')} font-mono`} value={values.sku} onChange={set('sku')} maxLength={64} placeholder="e.g. RO-AQ-007" />
            </Field>
            <Field id="slug" text="Slug" error={errors.slug} hint={editing ? 'Leave as is to keep the current URL slug' : 'Leave blank to generate it from the name'}>
              <input id="slug" className={`${fc('slug')} font-mono`} value={values.slug} onChange={set('slug')} maxLength={200} placeholder="aqua-pro-7-stage-ro" />
            </Field>
            <Field id="brand_id" text="Brand" required error={errors.brand_id || errors.brand} hint={brandsError ? undefined : !brandsLoading && !brands.length ? 'No brands yet. Add one on the Brands page first.' : undefined}>
              <select id="brand_id" className={fc('brand_id')} value={values.brand_id} onChange={(e) => { setVal('brand_id', e.target.value); clearError('brand'); }} disabled={brandsLoading}>
                <option value="">{brandsLoading ? 'Loading brands…' : 'Choose a brand'}</option>
                {brands.filter((b) => b.active || b.id === values.brand_id).map((b) => <option key={b.id} value={b.id}>{b.name}{b.active ? '' : ' (inactive)'}</option>)}
              </select>
              {brandsError && <p className="mt-1 text-xs text-red-600">Could not load brands: {brandsError}</p>}
            </Field>
            <Field id="product_type" text="Product type" error={errors.product_type}>
              <select id="product_type" className={fc('product_type')} value={values.product_type} onChange={set('product_type')}>
                <option value="simple">Simple product</option>
                <option value="variable">Variable product</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle id="is_virtual" checked={values.is_virtual} onChange={changeVirtual} title="Virtual product" description="Not shipped (no physical item)" disabled={saving} />
            <Toggle id="is_downloadable" checked={values.is_downloadable} onChange={(on) => setVal('is_downloadable', on)} title="Downloadable" description="Customer receives a file" disabled={saving} />
          </div>

          <Field id="short_description" text="Short description" error={errors.short_description}>
            <textarea id="short_description" rows={2} className={fc('short_description')} value={values.short_description} onChange={set('short_description')} maxLength={1000} placeholder="One or two lines shown on listings (optional)" />
          </Field>
          <Field id="description" text="Description" error={errors.description}>
            <textarea id="description" rows={4} className={fc('description')} value={values.description} onChange={set('description')} maxLength={20000} placeholder="Full product description (optional)" />
          </Field>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Specifications</span>
              <div className="flex items-center gap-2">
                <button type="button" className="btn-secondary px-3 py-1" disabled={saving || !values.category_id} title={values.category_id ? `Adds the usual keys for ${specTemplate.label}` : 'Choose a category first'} onClick={fillDefaultSpecs}>
                  Fill default keys{values.category_id ? ` (${specTemplate.label})` : ''}
                </button>
                <button type="button" className="btn-secondary px-3 py-1" disabled={saving || specs.length >= MAX_SPECS} onClick={() => setSpecs((l) => [...l, { name: '', value: '' }])}>
                  <PlusIcon className="h-4 w-4" /> Add row
                </button>
              </div>
            </div>
            {specs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-400">No specifications yet. Click “Fill default keys” to add the usual rows for this category, or add rows such as “Capacity — 8 L”.</p>
            ) : (
              <ul className="space-y-2">
                {specs.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <input aria-label={`Specification ${i + 1} name`} className="input" placeholder="Name" maxLength={100} value={s.name} onChange={(e) => updateSpec(i, 'name', e.target.value)} disabled={saving} />
                    <input aria-label={`Specification ${i + 1} value`} className="input" placeholder={s.hint ? `e.g. ${s.hint}` : 'Value'} maxLength={500} value={s.value} onChange={(e) => updateSpec(i, 'value', e.target.value)} disabled={saving} />
                    <button type="button" aria-label={`Remove specification ${i + 1}`} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" disabled={saving} onClick={() => setSpecs((l) => l.filter((_, idx) => idx !== i))}>
                      <XIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {specs.some((s) => s.name.trim() && !s.value.trim()) && <p className="mt-1 text-xs text-slate-500">Rows with no value are not saved, so leave any key you don't need empty.</p>}
            {errors.specifications && <p className="mt-1 text-xs text-red-600">{errors.specifications}</p>}
          </div>

          <ImageUploadField
            file={imageFile}
            currentUrl={product?.image_url || ''}
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

          <Field id="publish_status" text="Status" error={errors.publish_status}
            hint={values.publish_status === 'published' ? 'Published: visible and can be bought' : values.publish_status === 'draft' ? 'Draft: saved but not on sale yet' : 'Inactive: hidden and cannot be bought'}>
            <select id="publish_status" className={`${fc('publish_status')} sm:max-w-[14rem]`} value={values.publish_status} onChange={set('publish_status')}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>

        {/* ---------------- Pricing ---------------- */}
        <div className={tab === 'pricing' ? 'space-y-4' : 'hidden'} role="tabpanel" aria-labelledby="tab-pricing">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="mrp" text="MRP" required error={errors.mrp} hint="Printed maximum retail price">
              <input id="mrp" type="number" inputMode="decimal" min="0" step="0.01" className={fc('mrp')} value={values.mrp} onChange={set('mrp')} placeholder="0.00" />
            </Field>
            <Field id="selling_price" text="Regular price" required error={errors.selling_price} hint="Cannot be higher than the MRP">
              <input id="selling_price" type="number" inputMode="decimal" min="0" step="0.01" className={fc('selling_price')} value={values.selling_price} onChange={set('selling_price')} placeholder="0.00" />
            </Field>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Discount (calculated by the database): <span className="font-semibold text-slate-900">{discountPct === null ? '—' : `${discountPct} %`}</span>
            {discountPct !== null && <span className="text-slate-400"> · you save {formatMoney(Number(values.mrp) - Number(values.selling_price))}</span>}
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-medium text-slate-700">Sale price <span className="font-normal text-slate-400">(optional)</span></p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="sale_price" text="Sale price" error={errors.sale_price} hint="Must not exceed the regular price">
                <input id="sale_price" type="number" inputMode="decimal" min="0" step="0.01" className={fc('sale_price')} value={values.sale_price} onChange={set('sale_price')} placeholder="0.00" />
              </Field>
              <Field id="sale_start" text="Sale starts" error={errors.sale_start} hint="Blank = starts now">
                <input id="sale_start" type="datetime-local" className={fc('sale_start')} value={values.sale_start} onChange={set('sale_start')} />
              </Field>
              <Field id="sale_end" text="Sale ends" error={errors.sale_end} hint="Blank = no end date">
                <input id="sale_end" type="datetime-local" className={fc('sale_end')} value={values.sale_end} onChange={set('sale_end')} />
              </Field>
            </div>
            {salePct !== null && <p className="mt-2 text-xs text-emerald-700">While the sale is on, customers pay {formatMoney(values.sale_price)} ({salePct} % off the MRP).</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="gst_percent" text="GST (%)" required error={errors.gst_percent} hint="Prices are treated as GST-inclusive">
              <input id="gst_percent" type="number" inputMode="decimal" min="0" max="100" step="0.01" list="gst-slabs" className={fc('gst_percent')} value={values.gst_percent} onChange={set('gst_percent')} />
              <datalist id="gst-slabs">{[0, 5, 12, 18, 28].map((n) => <option key={n} value={n} />)}</datalist>
            </Field>
            <Field id="tax_status" text="Tax status" error={errors.tax_status}>
              <select id="tax_status" className={fc('tax_status')} value={values.tax_status} onChange={set('tax_status')}>
                <option value="taxable">Taxable</option>
                <option value="shipping">Shipping only</option>
                <option value="none">None</option>
              </select>
            </Field>
          </div>
        </div>

        {/* ---------------- Inventory ---------------- */}
        <div className={tab === 'inventory' ? 'space-y-4' : 'hidden'} role="tabpanel" aria-labelledby="tab-inventory">
          <Toggle id="manage_stock" checked={values.manage_stock} onChange={(on) => setVal('manage_stock', on)} title="Manage stock" description="Track the quantity and update the stock status automatically" disabled={saving} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="stock_quantity" text="Stock quantity" required error={errors.stock_quantity}>
              <input id="stock_quantity" type="number" inputMode="numeric" min="0" step="1" className={fc('stock_quantity')} value={values.stock_quantity} onChange={set('stock_quantity')} />
            </Field>
            <Field id="low_stock_threshold" text="Low stock threshold" error={errors.low_stock_threshold} hint="Shown as “Low stock” at or below this number">
              <input id="low_stock_threshold" type="number" inputMode="numeric" min="0" step="1" className={fc('low_stock_threshold')} value={values.low_stock_threshold} onChange={set('low_stock_threshold')} placeholder="e.g. 5" />
            </Field>
            <Field id="backorders" text="Allow backorders" error={errors.backorders}>
              <select id="backorders" className={fc('backorders')} value={values.backorders} onChange={set('backorders')}>
                <option value="no">Do not allow</option>
                <option value="notify">Allow, but notify the customer</option>
                <option value="yes">Allow</option>
              </select>
            </Field>
            <Field id="stock_status" text="Stock status" error={errors.stock_status} hint={values.manage_stock ? 'Set automatically from the quantity and backorders' : undefined}>
              <select id="stock_status" className={fc('stock_status')} value={values.stock_status} onChange={set('stock_status')} disabled={values.manage_stock}>
                <option value="instock">In stock</option>
                <option value="outofstock">Out of stock</option>
                <option value="onbackorder">On backorder</option>
              </select>
            </Field>
          </div>
        </div>

        {/* ---------------- Shipping ---------------- */}
        <div className={tab === 'shipping' ? 'space-y-4' : 'hidden'} role="tabpanel" aria-labelledby="tab-shipping">
          <Toggle id="requires_shipping" checked={values.is_virtual ? false : values.requires_shipping} onChange={(on) => setVal('requires_shipping', on)}
            title="Requires shipping" description={values.is_virtual ? 'A virtual product is never shipped' : 'Physical item that has to be delivered'} disabled={saving || values.is_virtual} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field id="weight" text="Weight (kg)" error={errors.weight}>
              <input id="weight" type="number" inputMode="decimal" min="0" step="0.001" className={fc('weight')} value={values.weight} onChange={set('weight')} />
            </Field>
            <Field id="length" text="Length (cm)" error={errors.length}>
              <input id="length" type="number" inputMode="decimal" min="0" step="0.01" className={fc('length')} value={values.length} onChange={set('length')} />
            </Field>
            <Field id="width" text="Width (cm)" error={errors.width}>
              <input id="width" type="number" inputMode="decimal" min="0" step="0.01" className={fc('width')} value={values.width} onChange={set('width')} />
            </Field>
            <Field id="height" text="Height (cm)" error={errors.height}>
              <input id="height" type="number" inputMode="decimal" min="0" step="0.01" className={fc('height')} value={values.height} onChange={set('height')} />
            </Field>
          </div>
          <Field id="shipping_class" text="Shipping class" error={errors.shipping_class}>
            <input id="shipping_class" className={`${fc('shipping_class')} sm:max-w-xs`} value={values.shipping_class} onChange={set('shipping_class')} maxLength={100} placeholder="e.g. heavy, fragile" />
          </Field>
        </div>

        {/* ---------------- SEO ---------------- */}
        <div className={tab === 'seo' ? 'space-y-4' : 'hidden'} role="tabpanel" aria-labelledby="tab-seo">
          <Field id="seo_title" text="SEO title" error={errors.seo_title} hint={`${values.seo_title.length}/255`}>
            <input id="seo_title" className={fc('seo_title')} value={values.seo_title} onChange={set('seo_title')} maxLength={255} />
          </Field>
          <Field id="meta_description" text="Meta description" error={errors.meta_description} hint={`${values.meta_description.length}/500`}>
            <textarea id="meta_description" rows={3} className={fc('meta_description')} value={values.meta_description} onChange={set('meta_description')} maxLength={500} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="focus_keyword" text="Focus keyword" error={errors.focus_keyword}>
              <input id="focus_keyword" className={fc('focus_keyword')} value={values.focus_keyword} onChange={set('focus_keyword')} maxLength={150} />
            </Field>
            <Field id="additional_keywords" text="Additional keywords" error={errors.additional_keywords} hint="Separate with commas (up to 20)">
              <input id="additional_keywords" className={fc('additional_keywords')} value={values.additional_keywords} onChange={set('additional_keywords')} placeholder="ro purifier, water filter" />
            </Field>
          </div>
          <Field id="canonical_url" text="Canonical URL" error={errors.canonical_url}>
            <input id="canonical_url" type="url" className={fc('canonical_url')} value={values.canonical_url} onChange={set('canonical_url')} maxLength={500} placeholder="https://example.com/products/aqua-pro" />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
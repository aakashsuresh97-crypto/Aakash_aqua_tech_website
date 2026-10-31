import { useCallback, useEffect, useRef, useState } from 'react';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import ToastContainer from '../components/ToastContainer.jsx';
import FormField, { fromLocalInput, toLocalInput } from '../components/FormField.jsx';
import { Badge, DataTable, DeleteDialogBody, ErrorList, FilterBar, ListState, PageHeader, fmtDateTime } from '../components/ui.jsx';
import { PencilIcon, PlusIcon, RefreshIcon, TrashIcon } from '../components/Icons.jsx';
import CategoryImage from '../components/CategoryImage.jsx';
import useDebounce from '../hooks/useDebounce.js';
import useToasts from '../hooks/useToasts.js';
import { useIsAdmin } from '../auth/UserContext.js';
import { blogApi } from '../api/siteApi.js';

const FIELDS = {
  title: { name: 'title', label: 'Title', required: true },
  slug: { name: 'slug', label: 'Slug', half: true, help: 'Leave empty to generate from the title.' },
  status: { name: 'status', label: 'Status', type: 'select', required: true, half: true, options: [['draft', 'Draft (hidden)'], ['published', 'Published']] },
  published_at: { name: 'published_at', label: 'Publish date', type: 'datetime', half: true, help: 'Empty = now when published. A future date schedules the post.' },
  author: { name: 'author', label: 'Author', half: true },
  excerpt: { name: 'excerpt', label: 'Excerpt', type: 'textarea', rows: 2, help: 'Short summary shown in the blog list.' },
  image_url: { name: 'image_url', label: 'Cover image', type: 'image' },
  seo_title: { name: 'seo_title', label: 'SEO title', half: true },
  meta_description: { name: 'meta_description', label: 'Meta description', half: true },
};
const BLANK = { title: '', slug: '', status: 'draft', published_at: '', author: '', excerpt: '', image_url: '', seo_title: '', meta_description: '', content_html: '' };

// [label, aria-label, before, after]
const TOOLS = [
  ['H2', 'Heading 2', '<h2>', '</h2>'], ['H3', 'Heading 3', '<h3>', '</h3>'], ['P', 'Paragraph', '<p>', '</p>'],
  ['B', 'Bold', '<strong>', '</strong>'], ['I', 'Italic', '<em>', '</em>'],
  ['• List', 'Bulleted list', '<ul>\n  <li>', '</li>\n</ul>'], ['Link', 'Link', '<a href="https://">', '</a>'], ['Image', 'Image', '<img src="https://" alt="', '">'],
];

function Editor({ post, onClose, onSaved }) {
  const [values, setValues] = useState(() => (post ? Object.fromEntries(Object.keys(BLANK).map((k) => [k, k === 'published_at' ? toLocalInput(post[k]) : post[k] ?? ''])) : BLANK));
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const area = useRef(null);
  const set = (n, v) => setValues((s) => ({ ...s, [n]: v }));

  function wrap(before, after) {
    const el = area.current;
    const { selectionStart: a, selectionEnd: b } = el;
    const text = values.content_html;
    set('content_html', `${text.slice(0, a)}${before}${text.slice(a, b)}${after}${text.slice(b)}`);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + before.length, b + before.length); });
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    const payload = { ...values, published_at: fromLocalInput(values.published_at) };
    try {
      if (post) await blogApi.update(post.id, payload); else await blogApi.create(payload);
      onSaved(post ? 'Post updated.' : 'Post created.');
    } catch (err) { setError(err); } finally { setSaving(false); }
  }

  const f = (name) => <FormField field={FIELDS[name]} value={values[name]} onChange={set} disabled={saving} idPrefix="blogf" />;
  return (
    <form onSubmit={save} noValidate aria-label={post ? 'Edit blog post' : 'New blog post'}>
      <PageHeader title={post ? 'Edit blog post' : 'New blog post'}>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Back to list</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4" />}{saving ? 'Saving…' : 'Save post'}</button>
      </PageHeader>
      <ErrorList error={error} />
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        {f('title')}{f('slug')}{f('status')}{f('published_at')}{f('author')}<div className="hidden sm:block" />
        {f('excerpt')}{f('image_url')}
        <div className="sm:col-span-2">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="blog-content" className="text-sm font-medium text-slate-700">Content (HTML) <span className="text-red-500" aria-hidden="true">*</span></label>
            <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Formatting">
              {TOOLS.map(([l, aria, b, a]) => <button key={l} type="button" disabled={preview || saving} onClick={() => wrap(b, a)} aria-label={aria} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{l}</button>)}
              <button type="button" onClick={() => setPreview((p) => !p)} aria-pressed={preview} className={`rounded border px-2 py-1 text-xs font-medium ${preview ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>Preview</button>
            </div>
          </div>
          {preview
            ? <iframe title="Post preview" sandbox="" srcDoc={`<base target="_blank"><style>body{font:16px/1.6 system-ui;padding:16px;max-width:760px;margin:auto}img{max-width:100%}</style>${values.content_html}`} className="h-96 w-full rounded-lg border border-slate-300 bg-white" />
            : <textarea id="blog-content" ref={area} rows={16} className="input font-mono text-xs" value={values.content_html} onChange={(e) => set('content_html', e.target.value)} disabled={saving} />}
          <p className="mt-1 text-xs text-slate-500">Allowed tags: headings, paragraphs, lists, links, images, tables. The server removes anything unsafe when saving.</p>
        </div>
        {f('seo_title')}{f('meta_description')}
      </div>
    </form>
  );
}

export default function BlogPage() {
  const isAdmin = useIsAdmin();
  const toasts = useToasts();
  const [editing, setEditing] = useState(null); // null = list, {} = new, row = edit
  const [search, setSearch] = useState('');
  const dSearch = useDebounce(search);
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setPage(1), [dSearch, filters]);
  useEffect(() => {
    if (editing) return undefined;
    const ctl = new AbortController();
    setLoading(true); setError('');
    blogApi.list({ page, limit: 10, search: dSearch, ...filters }, ctl.signal).then(
      (r) => { setRows(r.data); setMeta(r.meta); setLoading(false); },
      (e) => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false); } });
    return () => ctl.abort();
  }, [editing, page, dSearch, filters, refreshKey]);
  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

  async function confirmDelete() {
    setDeleting(true);
    try { await blogApi.remove(toDelete.id); toasts.success('Post deleted.'); setToDelete(null); reload(); } catch (e) { toasts.error(e.message); setToDelete(null); } finally { setDeleting(false); }
  }

  if (editing) return <Editor post={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={(m) => { setEditing(null); toasts.success(m); reload(); }} />;

  const tone = (r) => (r.status === 'published' ? (r.published_at && new Date(r.published_at) > new Date() ? 'amber' : 'green') : 'slate');
  const label = (r) => (r.status === 'published' && r.published_at && new Date(r.published_at) > new Date() ? 'Scheduled' : r.status);
  return (
    <section aria-labelledby="blog-title">
      <PageHeader title={<span id="blog-title">Blog</span>} subtitle="Articles shown on the public blog. Drafts stay hidden.">
        <button type="button" className="btn-secondary" onClick={reload} aria-label="Refresh blog"><RefreshIcon className="h-4 w-4" /></button>
        <button type="button" className="btn-primary" onClick={() => setEditing({})}><PlusIcon className="h-4 w-4" /> New post</button>
      </PageHeader>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Search title or excerpt…" values={filters} onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          filters={[{ name: 'status', label: 'Status', options: [['draft', 'Draft'], ['published', 'Published']] }]} />
        <ListState loading={loading} error={error} empty={!rows.length} emptyText={dSearch || filters.status ? 'No posts match.' : 'No posts yet. Click “New post”.'} onRetry={reload}>
          <div className={loading ? 'opacity-60' : ''} aria-busy={loading}>
            <DataTable rows={rows} columns={[
              { key: 'image_url', label: 'Cover', render: (r) => <CategoryImage src={r.image_url} alt={r.title} className="h-10 w-14 rounded" /> },
              { key: 'title', label: 'Title', render: (r) => <><span className="font-medium text-slate-900">{r.title}</span><span className="block text-xs text-slate-500">/{r.slug}</span></> },
              { key: 'author', label: 'Author' },
              { key: 'published_at', label: 'Published', render: (r) => fmtDateTime(r.published_at) },
              { key: 'status', label: 'Status', render: (r) => <Badge tone={tone(r)}>{label(r)}</Badge> },
            ]} actions={(r) => (
              <div className="flex justify-end gap-1">
                <button type="button" className="btn-secondary px-2.5 py-1.5" onClick={() => setEditing(r)} aria-label={`Edit ${r.title}`}><PencilIcon className="h-4 w-4" /></button>
                {isAdmin && <button type="button" className="btn-secondary px-2.5 py-1.5 text-red-600 hover:bg-red-50" onClick={() => setToDelete(r)} aria-label={`Delete ${r.title}`}><TrashIcon className="h-4 w-4" /></button>}
              </div>
            )} />
            <Pagination meta={meta} onPage={setPage} disabled={loading} />
          </div>
        </ListState>
      </div>
      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete post" size="sm" closeDisabled={deleting}
        footer={<><button type="button" className="btn-secondary" onClick={() => setToDelete(null)} disabled={deleting}>Cancel</button><button type="button" className="btn-danger" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button></>}>
        {toDelete && <DeleteDialogBody name={toDelete.title} />}
      </Modal>
      <ToastContainer toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </section>
  );
}

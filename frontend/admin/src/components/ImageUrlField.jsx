import { useState } from 'react';
import ImageUploadField from './ImageUploadField.jsx';
import { uploadImage } from '../api/categoryApi.js';

/** Image field that stores a URL string: the picked file is uploaded at once and the returned URL becomes the value. */
export default function ImageUrlField({ id, label, value, onChange, disabled }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  async function onSelect(file) {
    if (!file) return;
    setError(''); setUploading(true); setProgress(0);
    try {
      const res = await uploadImage(file, setProgress);
      onChange(res.data.url);
    } catch (e) { setError(e.message); } finally { setUploading(false); }
  }

  return (
    <ImageUploadField
      id={id} label={label} file={null} currentUrl={value || ''} removed={false}
      error={error} uploading={uploading} progress={progress} disabled={disabled || uploading}
      onSelect={onSelect} onError={setError} onRemove={() => { setError(''); onChange(''); }} onUndoRemove={() => {}}
    />
  );
}

import { useEffect, useState } from 'react';
import { PhotoIcon } from './Icons.jsx';

/** Shows the category image; falls back to a placeholder when missing or broken. */
export default function CategoryImage({ src, alt, className = 'h-10 w-10 rounded-lg' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div className={`flex shrink-0 items-center justify-center bg-slate-100 text-slate-400 ${className}`}>
        <PhotoIcon className="h-1/2 w-1/2" />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`shrink-0 object-cover ${className}`} />;
}

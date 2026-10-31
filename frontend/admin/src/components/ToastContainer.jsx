import { CheckCircleIcon, ExclamationIcon, XIcon } from './Icons.jsx';

export default function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6" aria-live="polite">
      {toasts.map((t) => {
        const ok = t.type === 'success';
        return (
          <div key={t.id} role={ok ? 'status' : 'alert'} className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white p-4 shadow-lg ${ok ? 'border-emerald-200' : 'border-red-200'}`}>
            {ok ? <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-500" /> : <ExclamationIcon className="h-5 w-5 shrink-0 text-red-500" />}
            <p className="flex-1 text-sm text-slate-700">{t.message}</p>
            <button type="button" onClick={() => onDismiss(t.id)} aria-label="Dismiss" className="text-slate-400 hover:text-slate-600">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

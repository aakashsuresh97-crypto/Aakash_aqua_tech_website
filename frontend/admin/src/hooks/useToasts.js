import { useCallback, useState } from 'react';

let nextId = 1;

export default function useToasts(duration = 4000) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, message) => {
      const id = nextId++;
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss, duration]
  );

  return { toasts, dismiss, success: (m) => push('success', m), error: (m) => push('error', m) };
}

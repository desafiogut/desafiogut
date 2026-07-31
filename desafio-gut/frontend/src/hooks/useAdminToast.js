// useAdminToast — sistema de toasts do painel ADM.
// MC89.26 (Fase 2). Padrão React: state + callbacks.
// API: toast.success(msg), toast.error(msg), toast.info(msg), toast.dismiss(id).

import { useState, useCallback, useRef } from "react";

let _nextId = 0;

export function useAdminToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) { clearTimeout(timers.current[id]); delete timers.current[id]; }
  }, []);

  const add = useCallback((variant, message, duracao = 4000) => {
    const id = ++_nextId;
    setToasts((prev) => [...prev, { id, variant, message }]);
    if (duracao > 0) {
      timers.current[id] = setTimeout(() => dismiss(id), duracao);
    }
    return id;
  }, [dismiss]);

  const success = useCallback((msg) => add("success", msg, 4000), [add]);
  const error   = useCallback((msg) => add("error",   msg, 8000), [add]);
  const info    = useCallback((msg) => add("info",    msg, 4000), [add]);

  return { toasts, add, dismiss, success, error, info };
}

// AdminToastContainer — renderiza fila de toasts.
// MC89.26 (Fase 2). Posição fixa no canto superior direito.

import AdminToast from "./AdminToast.jsx";

export default function AdminToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: "fixed", top: "0.75rem", right: "0.75rem", zIndex: 9999,
      display: "flex", flexDirection: "column", gap: "0.4rem",
      pointerEvents: "auto",
    }}>
      {toasts.map((t) => (
        <AdminToast key={t.id} {...t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

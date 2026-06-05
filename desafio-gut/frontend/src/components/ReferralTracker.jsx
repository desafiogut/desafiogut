// ReferralTracker — MC17.3.1.1 · MC17.4.2
//
// Captura o código de indicação que chega na URL (?ref=IND-XXXXXX) e guarda-o
// em localStorage ANTES de qualquer fluxo do Privy/consentimento, para
// sobreviver ao gate de consentimento, a redirects do router E ao redirect
// OAuth do Privy (Google/Apple) — onde o sessionStorage podia ser perdido entre
// o landing e o pós-login. NÃO regista a indicação aqui (isso depende do
// address + authToken da sessão — ver ReferralRegistrar.jsx). Componente sem UI.
//
// Montado fora do PrivyProvider (não usa hooks do Privy nem o AppContext).

import { useEffect } from "react";

const REF_RE = /^IND-[A-Z0-9]{6}$/;
// MC17.4.2 — chave canónica em localStorage (durável entre tabs e redirects).
export const REF_STORAGE_KEY = "desafiogut:ref_code";
// Chave legada (MC17.3.1.1, sessionStorage) — lida pelo Registrar p/ migração.
export const REF_STORAGE_KEY_LEGACY = "desafiogut_ref";

export default function ReferralTracker() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (!ref) return;
      const codigo = ref.trim().toUpperCase();
      if (REF_RE.test(codigo)) {
        localStorage.setItem(REF_STORAGE_KEY, codigo);
        console.log("[GUT][MC17.4.2] T1 referral capturado", { codigo, store: "localStorage", key: REF_STORAGE_KEY });
      } else {
        console.warn("[GUT][MC17.4.2] ?ref ignorado (formato inválido)", { ref });
      }
    } catch (err) {
      /* ambiente sem localStorage / SSR: no-op */
      console.warn("[GUT][MC17.4.2] ReferralTracker sem storage", err?.message);
    }
  }, []);

  return null;
}

// ReferralTracker — MC17.3.1.1
//
// Captura o código de indicação que chega na URL (?ref=IND-XXXXXX) e guarda-o
// em sessionStorage ANTES de qualquer fluxo do Privy/consentimento, para
// sobreviver ao gate de consentimento e a redirects do router. NÃO regista a
// indicação aqui (isso depende do address + authToken da sessão — ver
// ReferralRegistrar.jsx). Componente sem UI.
//
// Montado fora do PrivyProvider (não usa hooks do Privy nem o AppContext).

import { useEffect } from "react";

const REF_RE = /^IND-[A-Z0-9]{6}$/;
export const REF_STORAGE_KEY = "desafiogut_ref";

export default function ReferralTracker() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (!ref) return;
      const codigo = ref.trim().toUpperCase();
      if (REF_RE.test(codigo)) {
        sessionStorage.setItem(REF_STORAGE_KEY, codigo);
        console.info("[GUT] referral capturado", { codigo });
      }
    } catch {
      /* ambiente sem sessionStorage / SSR: no-op */
    }
  }, []);

  return null;
}

// ReferralRegistrar — MC17.3.1.1
//
// Liga o registo do vínculo de indicação que NUNCA esteve ativo no frontend.
// Quando a sessão tem `address` E `authToken` (user-session JWT cunhado pelo
// /auth-user), e existe um código pendente em sessionStorage('desafiogut_ref'),
// chama o endpoint existente para registar a indicação. Idempotente: o backend
// (_lib/referral.mjs) garante vínculo único e rejeita auto-indicação/ja-indicado.
//
// Porque NÃO vai dentro de useCreateWallet.onSuccess: o authToken é cunhado pelo
// AppContext (POST /auth-user) DEPOIS de o address existir — ou seja, depois da
// criação da wallet. Por isso o registo é um efeito "gated" em [address, authToken],
// montado dentro do AppProvider (que detém esses valores). Sem UI.
//
// Contrato do endpoint (netlify/functions/referral.mjs):
//   POST /.netlify/functions/referral?acao=usar-codigo
//   Headers: Authorization: Bearer <authToken>  (+ X-Visitor-ID opcional)
//   Body: { codigo_indicacao: "IND-XXXXXX", endereco: "0x..." }
//   Exige auth.payload.endereco === endereco (anti-IDOR).

import { useEffect } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { REF_STORAGE_KEY } from "./ReferralTracker.jsx";

// Estados TERMINAIS do registo — consumir a flag sem retry (não são transitórios).
//  200 ok · 400 auto_indicacao/codigo_invalido · 403 endereco_nao_corresponde
//  404 codigo_inexistente · 409 ja_indicado
const STATUS_TERMINAIS = new Set([200, 400, 403, 404, 409]);
// MC17.4.1 — sinal anti-Sybil de dispositivo. Marca este dispositivo após a 1.ª
// tentativa de registo com referral; em registos seguintes do MESMO dispositivo,
// envia X-Device-Tracked: true. O backend trata isto como sinal fraco (só regista
// no referral-log, NÃO bloqueia) — por isso é zero-regressão.
const DEVICE_KEY = "desafiogut_device_tracked";

export default function ReferralRegistrar() {
  const { address, authToken, visitorId } = useAppContext();

  useEffect(() => {
    let codigo;
    try { codigo = sessionStorage.getItem(REF_STORAGE_KEY); } catch { codigo = null; }
    if (!address || !authToken || !codigo) return;

    let cancel = false;
    (async () => {
      let deviceTracked = "false";
      try { deviceTracked = localStorage.getItem(DEVICE_KEY) ? "true" : "false"; } catch { /* sem storage */ }
      try {
        const resp = await fetch("/.netlify/functions/referral?acao=usar-codigo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
            "X-Device-Tracked": deviceTracked,
            ...(visitorId ? { "X-Visitor-ID": visitorId } : {}),
          },
          body: JSON.stringify({ codigo_indicacao: codigo, endereco: address }),
        });
        if (cancel) return;
        if (STATUS_TERMINAIS.has(resp.status)) {
          // Sucesso ou rejeição definitiva → não repetir.
          try { sessionStorage.removeItem(REF_STORAGE_KEY); } catch {}
          try { localStorage.setItem(DEVICE_KEY, "true"); } catch { /* sem storage */ }
          console.info("[GUT] referral usar-codigo", { status: resp.status });
        }
        // 429/5xx/erro de rede → mantém a flag para nova tentativa.
      } catch (err) {
        // Transitório (rede): mantém a flag; tenta no próximo ciclo.
        console.warn("[GUT] referral usar-codigo falhou (transitório)", err?.message);
      }
    })();
    return () => { cancel = true; };
  }, [address, authToken, visitorId]);

  return null;
}

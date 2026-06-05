// ReferralRegistrar — MC17.3.1.1 · MC17.4.2
//
// Liga o registo do vínculo de indicação que NUNCA esteve ativo no frontend.
// Quando a sessão tem `address` E `authToken` (user-session JWT cunhado pelo
// /auth-user), e existe um código pendente em localStorage('desafiogut:ref_code')
// — com fallback à chave legada sessionStorage('desafiogut_ref') para migração —
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
import { REF_STORAGE_KEY, REF_STORAGE_KEY_LEGACY } from "./ReferralTracker.jsx";

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
    // MC17.4.2 — lê o código persistido: localStorage (canónico) com fallback à
    // chave legada em sessionStorage (migração sem perder códigos pré-deploy).
    let codigo = null;
    try { codigo = localStorage.getItem(REF_STORAGE_KEY); } catch {}
    if (!codigo) { try { codigo = sessionStorage.getItem(REF_STORAGE_KEY_LEGACY); } catch {} }

    // T2/T3 — ESPERA explícita por address + authToken. Como ambos são deps deste
    // efeito, ele re-corre quando o authToken é cunhado (POST /auth-user). Logo o
    // POST (T4) NUNCA dispara com authToken=undefined → evita o 401 por T4<T3.
    if (!address || !authToken || !codigo) {
      console.log("[GUT][MC17.4.2] T2/T3 a aguardar pré-condições", {
        temAddress: !!address, temAuthToken: !!authToken, temCodigo: !!codigo,
      });
      return;
    }

    let cancel = false;
    (async () => {
      let deviceTracked = "false";
      try { deviceTracked = localStorage.getItem(DEVICE_KEY) ? "true" : "false"; } catch { /* sem storage */ }
      console.log("[GUT][MC17.4.2] T4 POST usar-codigo", { codigo, endereco: address, deviceTracked });
      // MC17.5.1 [LOG TEMPORÁRIO] T3 — POST enviado (espera por address+authToken garantida acima).
      console.log("[MC17.5.1] T3 POST enviado", { codigo, endereco: address, temAuthToken: !!authToken, deviceTracked });
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
        let data = null;
        try { data = await resp.clone().json(); } catch {}
        const conv = data?.conversao || {};
        console.log("[GUT][MC17.4.2] T5/T6 resposta usar-codigo", {
          status: resp.status,
          idempotent: data?.idempotent,
          conversao: data?.conversao,
        });
        // MC17.5.1 [LOG TEMPORÁRIO] T4 — resposta do backend (resultado do crédito on-chain).
        console.log("[MC17.5.1] T4 resposta backend", {
          status: resp.status, vinculoIdempotent: data?.idempotent,
          conversaoOk: conv.ok, conversaoIdempotent: conv.idempotent, conversaoCode: conv.code,
        });
        // MC17.5.1 RC-3 — uma falha RECUPERÁVEL de crédito (on-chain/Blobs) com
        // HTTP 200 NÃO deve selar o referral: o vínculo já existe mas o marcador
        // referral-convertido ainda não foi escrito, logo um retry posterior pode
        // creditar. Mantemos o código (localStorage) para nova tentativa no
        // próximo mount/login. Rejeições definitivas continuam a selar.
        const RECUPERAVEIS = new Set([
          "credito_onchain_falhou", "conversao_falhou", "store_indisponivel", "credito_indicado_falhou",
        ]);
        const conversaoRecuperavel =
          resp.status === 200 && !conv.ok && !conv.idempotent && RECUPERAVEIS.has(conv.code);
        if (STATUS_TERMINAIS.has(resp.status) && !conversaoRecuperavel) {
          // Sucesso ou rejeição definitiva → não repetir. Limpa ambas as chaves.
          try { localStorage.removeItem(REF_STORAGE_KEY); } catch {}
          try { sessionStorage.removeItem(REF_STORAGE_KEY_LEGACY); } catch {}
          try { localStorage.setItem(DEVICE_KEY, "true"); } catch { /* sem storage */ }
          console.info("[GUT][MC17.4.2] T6 referral terminal", {
            status: resp.status, conversaoOk: data?.conversao?.ok, conversaoCode: data?.conversao?.code,
          });
        } else if (conversaoRecuperavel) {
          // MC17.5.1 [LOG TEMPORÁRIO] — código mantido para retry.
          console.warn("[MC17.5.1] T6 conversão recuperável — código MANTIDO para retry", {
            conversaoCode: conv.code,
          });
        }
        // 429/5xx/erro de rede → mantém a flag para nova tentativa.
      } catch (err) {
        // Transitório (rede): mantém a flag; tenta no próximo ciclo.
        console.warn("[GUT][MC17.4.2] referral usar-codigo falhou (transitório)", err?.message);
      }
    })();
    return () => { cancel = true; };
  }, [address, authToken, visitorId]);

  return null;
}

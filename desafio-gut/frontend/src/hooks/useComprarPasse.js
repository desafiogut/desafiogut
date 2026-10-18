// src/hooks/useComprarPasse.js — UTAC106e. Compra do Passe Desafio (Via B) pela UI.
//
// UTAC110i.1 (FRENTE D) — BIFURCAÇÃO POR PAGAMENTO NATIVO. O Passe tem agora DOIS pagamentos:
//   · PWA / iOS / loja indisponível → PIX/saldo R$ (fluxo ORIGINAL, intacto) para os endpoints
//     `comprar-passe-relampago` / `comprar-passe-programado`;
//   · Android com a loja disponível  → GOOGLE PLAY BILLING (`src/lib/google-play-billing.js` +
//     `validar-compra-google`), e NÃO se debita saldo R$ (o dinheiro vai para a Google).
//
// O GATE é `isPagamentoNativoAtivo` — a flag POR PLATAFORMA que já existe no config remoto
// (`DEFAULT_RECURSOS_APP` em `_lib/recursos-app-config.mjs`, hoje false nas três plataformas) —
// E a disponibilidade REAL da loja em runtime (`billingDisponivel()`: nativo + Android + plugin).
// ⚠️ As DUAS condições são necessárias, e é isso que dá **zero regressão**: a flag desligada
// mantém o PIX; e mesmo com a flag ligada no Blob, o browser (PWA) NUNCA tem loja
// (`billingDisponivel()` é false fora do Android nativo) ⇒ o PWA continua 100% por PIX.
//
// Ordem do fluxo nativo (e porquê): loja aprova → SERVIDOR valida o recibo contra a Google e
// credita → só então se FECHA a compra na loja (`confirmarCompra`). Se o servidor não entregar,
// a compra NÃO é fechada: fica pendente para `consultarCompras()` reprocessar (e uma compra
// consumível não fechada é reembolsada pela Google ao fim de 3 dias — nunca se perde dinheiro
// do utilizador nem se entrega sem pagamento).
//
// REUTILIZA (não duplica):
//   · `apiPost` (src/lib/api.js) — o cliente HTTP do repo, que injeta o `Bearer`;
//   · o `authToken` (user-session) do AppContext — o MESMO token que o `saldo-rs` já usa
//     (`AppContext.jsx:1017`, cunhado em `:921` via `POST /auth-user`). ⚠️ UTAC106j-fix: NÃO se
//     usa o `getAuthToken` do `useTrocarPorSenhas`, que devolve um JWT `lance-auth` (Via A) — os
//     endpoints validam com `verificarUserSession`, que rejeita esse tipo (401 token_invalido);
//   · `gerarIdempotencyKey` (src/utils/idempotency.js) — UUID v4 NOVO por clique (só no PIX: no
//     Billing a idempotência é do RECIBO, derivada do `purchaseToken` no servidor);
//   · `useRecursosApp` — a fonte de verdade da flag por plataforma (não se inventa detecção).
//
// Contrato devolvido: { comprar, loading, erro, pontos }
//   comprar(tipo) → { ok:true, tipo, pontos, creditosLance, idempotent }
//                 | { ok:false, status, code, message }

import { useCallback, useRef, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { apiPost } from "../lib/api.js";
import { gerarIdempotencyKey } from "../utils/idempotency.js";
import { passeDoTipo, inteiroNaoNegativo } from "../lib/passes.js";
import { useRecursosApp } from "./useRecursosApp.js";
import { billingDisponivel, iniciarCompra, confirmarCompra, androidNativo } from "../lib/google-play-billing.js";

// Mensagens por código HTTP dos endpoints (`_lib/comprar-passe-tipado.mjs`): nunca em silêncio.
const MSG_POR_STATUS = {
  401: "Sessão expirada",
  402: "Saldo insuficiente",
  400: "Pedido inválido",
  409: "Não foi possível confirmar a compra na loja. Contacte o suporte.",
  502: "Não foi possível concluir a compra. Tente de novo.",
  503: "Sistema em manutenção. Tente de novo em instantes.",
};

// Mensagens dos desfechos LOCAIS da loja (`src/lib/google-play-billing.js` — nunca em silêncio).
const MSG_BILLING = {
  cancelada: "Compra cancelada na loja.",
  compra_falhou: "Não foi possível concluir a compra na loja. Tente de novo.",
  produto_indisponivel: "O produto não está disponível na loja. Tente de novo mais tarde.",
  timeout_compra: "A compra não foi concluída a tempo. Tente de novo.",
  sem_token: "A loja não devolveu o recibo da compra.",
  sku_divergente: "A loja aprovou um produto diferente do pedido.",
  billing_indisponivel: "Pagamento pela loja indisponível neste dispositivo.",
  em_curso: "Compra em curso",
};

// UTAC110i.2 — FRENTE C (opção c do enunciado): no APK o Passe NÃO tem PIX. O Passe é um produto
// digital e a política de Pagamentos da Play exige o Billing; oferecer PIX como alternativa ou
// fallback é a violação que o bloqueante do AAB descreve. A mensagem remete para o mesmo sítio que
// a vista de conformidade do Mercado já usa (`MercadoLances.jsx`, `PWA_URL`).
const PWA_PASSE = "https://desafiogut.com";
const MSG_PIX_NO_APK =
  "O Passe Desafio nesta app é comprado pela Google Play, não com saldo. " +
  `Se a loja não abrir, compre em ${PWA_PASSE.replace("https://", "")}, no seu navegador.`;

export function useComprarPasse() {
  const { address, authToken, refetchSaldoRs } = useAppContext();
  const { isPagamentoNativoAtivo } = useRecursosApp();

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [pontos, setPontos] = useState(null);
  // GUARDA DE CORRIDA (achado ⚠️ R1 do validador adversarial): `loading` é ESTADO — dentro do mesmo
  // render o closure vê o valor ANTIGO, logo dois cliques no MESMO tick passariam os dois e dariam
  // DOIS débitos com duas chaves. O `ref` é síncrono e independente do timing do render.
  const emCurso = useRef(false);

  /**
   * Compra NATIVA (Google Play). Só corre com a loja disponível; o crédito é do SERVIDOR.
   * @returns {Promise<object>} o mesmo contrato de `comprar`.
   */
  const comprarNativo = useCallback(async (tipo) => {
    const compra = await iniciarCompra(tipo);
    if (!compra.ok) {
      const message = MSG_BILLING[compra.code] ?? "Não foi possível concluir a compra na loja.";
      setErro(message);
      return { ok: false, code: compra.code, message };
    }

    // O SERVIDOR é a autoridade: valida o recibo na Google e credita os benefícios.
    const { ok, status, data } = await apiPost(
      "validar-compra-google",
      { tipo, sku: compra.sku, purchaseToken: compra.purchaseToken },
      { token: authToken },
    );

    if (!ok) {
      // ⚠️ NÃO se fecha a compra na loja: sem entrega confirmada a compra fica PENDENTE (o
      // `consultarCompras()` volta a tentá-la). Fechar aqui daria o Passe «queimado» sem crédito.
      const message = MSG_POR_STATUS[status] ?? "Erro do servidor";
      setErro(message);
      return { ok: false, status, code: data?.error?.code, message };
    }

    // Entrega confirmada → fecha/consome na loja. Se FALHAR, o crédito já está dado e a Google
    // reembolsa ao fim de 3 dias: registra-se (não se esconde) e não se falha a compra ao utilizador.
    const fim = await confirmarCompra(compra);
    if (!fim.ok) {
      console.warn("[useComprarPasse] a compra foi entregue mas não foi fechada na loja:", fim.code);
    }

    const p = inteiroNaoNegativo(data?.pontosFidelidade);
    setPontos(p);
    return {
      ok: true, tipo, pontos: p,
      creditosLance: inteiroNaoNegativo(data?.creditosLance),
      idempotent: Boolean(data?.idempotent),
    };
  }, [authToken]);

  const comprar = useCallback(async (tipo) => {
    const passe = passeDoTipo(tipo);
    if (!passe) return { ok: false, code: "tipo_invalido", message: "Escolha um Passe Desafio válido." };
    if (!address) return { ok: false, code: "sem_endereco", message: "Carteira não conectada" };
    // ⚠️ UTAC106j-fix: `authToken` (user-session) é cunhado pelo AppContext em `POST /auth-user` e
    // pode chegar DEPOIS do `address`; sem ele o endpoint daria 401. Devolve um código próprio.
    if (!authToken) return { ok: false, code: "sem_sessao", message: "Sessão ainda não pronta. Tente novamente." };
    if (emCurso.current) return { ok: false, code: "em_curso", message: "Compra em curso" };
    emCurso.current = true;

    setErro("");
    setLoading(true);
    try {
      // ── Billing (Android com a flag ligada E a loja disponível) ────────────────────────────────
      // ⚠️ UTAC110i.1b: as DUAS condições. A flag sozinha ligaria o Billing no APK antes de A1/A4;
      // a loja sozinha ligaria o Billing com a flag desligada (regressão no APK actual) — foi
      // exactamente esse o estado em que o mutante D3 deixou este ficheiro (medido).
      if (isPagamentoNativoAtivo === true && billingDisponivel()) return await comprarNativo(tipo);

      // ── UTAC110i.2 · FRENTE C: no APK o PIX NÃO é alternativa nem fallback ────────────────────
      // Chegámos aqui porque a loja não está disponível (plugin ausente) ou porque a flag está
      // desligada — e estamos num APK Android. Cair no PIX seria vender um produto digital fora da
      // Play, que é exactamente o bloqueante do AAB. Erro CLARO, com o caminho alternativo (o site);
      // nada em silêncio e nenhuma chamada ao endpoint.
      // ⚠️ A condição é `androidNativo()` (ponte nativa), NÃO `plataforma === "android"`: o valor de
      // `plataforma` é sobreponível por `?plataforma=android` e um utilizador do PWA perderia o PIX.
      if (androidNativo()) {
        setErro(MSG_PIX_NO_APK);
        return { ok: false, code: "pix_indisponivel_no_apk", message: MSG_PIX_NO_APK };
      }

      // ── PIX / saldo R$ (fluxo ORIGINAL — inalterado) ───────────────────────────────────────────
      // Chave NOVA por CHAMADA (nunca reutilizada): a idempotência do servidor cobre o RETRY do
      // MESMO pedido. Contra dois pedidos diferentes, a trava é a guarda de corrida (`emCurso`).
      const idempotencyKey = gerarIdempotencyKey();
      const { ok, status, data } = await apiPost(passe.endpoint, { idempotencyKey }, { token: authToken });

      if (ok) {
        const p = inteiroNaoNegativo(data?.pontosFidelidade);
        setPontos(p);
        // O saldo R$ desceu no servidor: manda reler (o ecrã mostra-o).
        try { refetchSaldoRs?.(); } catch { /* refetch é best-effort */ }
        return {
          ok: true, tipo: passe.tipo, pontos: p,
          creditosLance: inteiroNaoNegativo(data?.creditosLance),
          idempotent: Boolean(data?.idempotent),
        };
      }

      const code = data?.error?.code;
      const message = MSG_POR_STATUS[status] ?? "Erro do servidor";
      setErro(message);
      return { ok: false, status, code, message };
    } catch (err) {
      const message = err?.message || "Erro do servidor";
      setErro(message);
      return { ok: false, message };
    } finally {
      emCurso.current = false;
      setLoading(false);
    }
  }, [address, authToken, refetchSaldoRs, isPagamentoNativoAtivo, comprarNativo]);

  return { comprar, loading, erro, pontos };
}

export default useComprarPasse;

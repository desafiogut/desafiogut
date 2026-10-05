// src/hooks/useComprarPasse.js — UTAC106e. Compra do Passe Desafio (Via B) pela UI.
//
// Encapsula a chamada ao endpoint JÁ EXISTENTE `POST /comprar-passe-pontos` (UTAC106d-v2,
// live em produção) e o seu estado (loading/erro/pontos). NÃO toca no backend nem no saldo
// local: o débito/refetch do saldo é do servidor + `refetchSaldoRs` do AppContext.
//
// REUTILIZA (não duplica):
//   · `apiPost` (src/lib/api.js) — o cliente HTTP do repo, que injeta o `Bearer`;
//   · o `authToken` (user-session) do AppContext — o MESMO token que o `saldo-rs` já usa
//     (`AppContext.jsx:1017`, cunhado em `:921` via `POST /auth-user`). ⚠️ UTAC106j-fix: NÃO se
//     usa o `getAuthToken` do `useTrocarPorSenhas`, que devolve um JWT `lance-auth` (Via A) — o
//     endpoint valida com `verificarUserSession`, que rejeita esse tipo (401 token_invalido);
//   · `gerarIdempotencyKey` (src/utils/idempotency.js) — UUID v4 NOVO por clique.
//
// Contrato devolvido: { comprar, loading, erro, pontos }
//   comprar() → { ok:true, pontos, idempotent } | { ok:false, status, code, message }

import { useCallback, useRef, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { apiPost } from "../lib/api.js";
import { gerarIdempotencyKey } from "../utils/idempotency.js";

// Mensagens por código HTTP do endpoint (UTAC106d-v2): 401/402/400/5xx.
const MSG_POR_STATUS = {
  401: "Sessão expirada",
  402: "Saldo insuficiente",
  400: "Pedido inválido",
};

export function useComprarPasse() {
  const { address, authToken, refetchSaldoRs } = useAppContext();

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [pontos, setPontos] = useState(null);
  // GUARDA DE CORRIDA (achado ⚠️ R1 do validador adversarial): `loading` é ESTADO — dentro do mesmo
  // render o closure vê o valor ANTIGO, logo dois cliques no MESMO tick passariam os dois e dariam
  // DOIS débitos com duas chaves. O `ref` é síncrono e independente do timing do render.
  const emCurso = useRef(false);

  const comprar = useCallback(async () => {
    if (!address) return { ok: false, code: "sem_endereco", message: "Carteira não conectada" };
    // ⚠️ UTAC106j-fix: `authToken` (user-session) é cunhado pelo AppContext em `POST /auth-user` e
    // pode chegar DEPOIS do `address`; sem ele o endpoint daria 401. Devolve um código próprio.
    if (!authToken) return { ok: false, code: "sem_sessao", message: "Sessão ainda não pronta. Tente novamente." };
    if (emCurso.current) return { ok: false, code: "em_curso", message: "Compra em curso" };
    emCurso.current = true;

    setErro("");
    setLoading(true);
    try {
      // Chave NOVA por CHAMADA (nunca reutilizada): a idempotência do servidor cobre o RETRY do
      // MESMO pedido. Contra dois pedidos diferentes, a trava é a guarda de corrida (`emCurso`).
      const idempotencyKey = gerarIdempotencyKey();
      const { ok, status, data } = await apiPost("comprar-passe-pontos", { idempotencyKey }, { token: authToken });

      if (ok) {
        const p = Number(data?.pontos ?? 0);
        setPontos(p);
        // O saldo R$ desceu no servidor: manda reler (o ecrã mostra-o).
        try { refetchSaldoRs?.(); } catch { /* refetch é best-effort */ }
        return { ok: true, pontos: p, idempotent: Boolean(data?.idempotent) };
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
  }, [address, authToken, refetchSaldoRs]);

  return { comprar, loading, erro, pontos };
}

export default useComprarPasse;

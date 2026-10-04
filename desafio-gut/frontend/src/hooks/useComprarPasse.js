// src/hooks/useComprarPasse.js — UTAC106e. Compra do Passe Desafio (Via B) pela UI.
//
// Encapsula a chamada ao endpoint JÁ EXISTENTE `POST /comprar-passe-pontos` (UTAC106d-v2,
// live em produção) e o seu estado (loading/erro/pontos). NÃO toca no backend nem no saldo
// local: o débito/refetch do saldo é do servidor + `refetchSaldoRs` do AppContext.
//
// REUTILIZA (não duplica):
//   · `apiPost` (src/lib/api.js) — o cliente HTTP do repo, que injeta o `Bearer`;
//   · `getAuthToken` do `useTrocarPorSenhas` — a MESMA cadeia de auth que o botão vizinho
//     «Trocar R$ 2,00 → 1 Senha» usa (JWT `auth-lance` assinado pelo Privy, cache 10 min,
//     re-assina em 401). É o «hook de auth existente» do ecrã;
//   · `gerarIdempotencyKey` (src/utils/idempotency.js) — UUID v4 NOVO por clique.
//
// Contrato devolvido: { comprar, loading, erro, pontos }
//   comprar() → { ok:true, pontos, idempotent } | { ok:false, status, code, message }

import { useCallback, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { useTrocarPorSenhas } from "./useTrocarPorSenhas.js";
import { apiPost } from "../lib/api.js";
import { gerarIdempotencyKey } from "../utils/idempotency.js";

// Mensagens por código HTTP do endpoint (UTAC106d-v2): 401/402/400/5xx.
const MSG_POR_STATUS = {
  401: "Sessão expirada",
  402: "Saldo insuficiente",
  400: "Pedido inválido",
};

export function useComprarPasse() {
  const { address, refetchSaldoRs } = useAppContext();
  const { getAuthToken } = useTrocarPorSenhas();

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [pontos, setPontos] = useState(null);

  const comprar = useCallback(async () => {
    if (!address) return { ok: false, code: "sem_endereco", message: "Carteira não conectada" };
    if (loading) return { ok: false, code: "em_curso", message: "Compra em curso" };

    setErro("");
    setLoading(true);
    try {
      const token = await getAuthToken();
      // Chave NOVA por clique — é o que impede o duplo débito num duplo clique.
      const idempotencyKey = gerarIdempotencyKey();
      const { ok, status, data } = await apiPost("comprar-passe-pontos", { idempotencyKey }, { token });

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
      setLoading(false);
    }
  }, [address, loading, getAuthToken, refetchSaldoRs]);

  return { comprar, loading, erro, pontos };
}

export default useComprarPasse;

// src/hooks/useResgatarCartao.js — UTAC106g. Resgate do cartão colecionável (50 pontos → 1 cartão).
//
// Encapsula a chamada ao endpoint `POST /resgatar-cartao` (UTAC106g). NÃO toca no backend nem no
// saldo local: o débito dos pontos é do servidor (`registarResgate`), e o refetch dos pontos é
// pedido pelo ecrã (`refetch` do `usePontos`).
//
// REUTILIZA (não duplica) — o MESMO padrão do `useComprarPasse` (UTAC106e):
//   · `apiPost` (`src/lib/api.js`) — o cliente HTTP do repo, que injecta o `Bearer`;
//   · `getAuthToken` do `useTrocarPorSenhas` — a mesma cadeia de auth dos vizinhos;
//   · `gerarIdempotencyKey` (`src/utils/idempotency.js`) — UUID v4 NOVO por clique.
//
// Contrato devolvido: { resgatar, loading, erro, resgate }
//   resgatar({ cartaoId, morada, idempotencyKey? })
//     → { ok:true, resgateId, idempotent, pontos } | { ok:false, status, code, message }

import { useCallback, useRef, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { useTrocarPorSenhas } from "./useTrocarPorSenhas.js";
import { apiPost } from "../lib/api.js";
import { gerarIdempotencyKey } from "../utils/idempotency.js";

// Mensagens por código HTTP do endpoint (UTAC106g): 401/402/400.
const MSG_POR_STATUS = {
  401: "Sessão expirada",
  402: "Precisas de 50 pontos de compra para resgatar o cartão",
  400: "Confere os dados de entrega",
};

export function useResgatarCartao() {
  const { address } = useAppContext();
  const { getAuthToken } = useTrocarPorSenhas();

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [resgate, setResgate] = useState(null);
  // GUARDA DE CORRIDA (mesma lição do `useComprarPasse`): `loading` é ESTADO — dois cliques no
  // MESMO tick veriam o valor ANTIGO e passariam os dois, dando dois débitos com duas chaves.
  const emCurso = useRef(false);

  const resgatar = useCallback(async ({ cartaoId, morada, idempotencyKey } = {}) => {
    if (!address) return { ok: false, code: "sem_endereco", message: "Carteira não conectada" };
    if (emCurso.current) return { ok: false, code: "em_curso", message: "Resgate em curso" };
    emCurso.current = true;

    setErro("");
    setLoading(true);
    try {
      const token = await getAuthToken();
      // Chave NOVA por CLIQUE (nunca reutilizada): a idempotência do servidor cobre o RETRY do
      // MESMO pedido; contra dois pedidos diferentes a trava é a guarda de corrida (`emCurso`).
      const key = idempotencyKey || gerarIdempotencyKey();
      const { ok, status, data } = await apiPost("resgatar-cartao", { cartaoId, morada, idempotencyKey: key }, { token });

      if (ok) {
        const info = { id: data?.resgateId ?? null, status: data?.status ?? "pendente", idempotent: data?.idempotent === true };
        setResgate(info);
        return { ok: true, ...info, pontos: data?.pontos };
      }

      const code = data?.error?.code;
      const message = MSG_POR_STATUS[status] ?? data?.error?.message ?? "Erro do servidor";
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
  }, [address, getAuthToken]);

  return { resgatar, loading, erro, resgate };
}

export default useResgatarCartao;

// src/hooks/usePontos.js — UTAC106f. Pontos + histórico + palpites do TITULAR (ecrã Ofertas).
//
// PORQUE UM ENDPOINT E NÃO O SDK: `public.pontos`/`public.palpites` têm RLS só para `service_role`
// (a migração do 106d-v2 não abre policy a anon/authenticated) — o cliente anónimo do frontend
// NÃO as consegue ler. O `endereco` sai do Bearer, nunca do cliente. Endpoint: `GET /ler-pontos`.
//
// ⚠️ UTAC106j-fix: o token vem do `authToken` (user-session) do AppContext — o MESMO que o
// `saldo-rs` usa — e NÃO do `getAuthToken` do `useTrocarPorSenhas` (JWT `lance-auth`, que o
// `ler-pontos` rejeita com 401 token_invalido). O guarda `!authToken` evita o 401 enquanto a sessão
// é cunhada (`address` chega ANTES do `authToken`); como o `authToken` está nas dependências, o
// efeito RE-CORRE quando ele chega.
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { apiGet } from "../lib/api.js";

const VAZIO = Object.freeze({
  pontos: 0, pontosCartao: 0, bonusPalpite: 0,
  historico: [], palpites: [], pontosParaCartao: 50, podeResgatarCartao: false,
});

export function usePontos() {
  const { address, authToken } = useAppContext();

  const [dados, setDados] = useState(VAZIO);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const refetch = useCallback(async () => {
    if (!address || !authToken) { setLoading(false); setDados(VAZIO); return null; }
    setLoading(true);
    setErro("");
    try {
      const { ok, status, data } = await apiGet("ler-pontos", { token: authToken });
      if (!ok) {
        setErro(status === 401 ? "Sessão expirada" : "Não foi possível carregar os pontos");
        return null;
      }
      const novo = {
        pontos: Number(data?.pontos ?? 0),
        // ⚠️ R1 (UTAC106f): o CARTÃO conta SÓ pontos de COMPRA — a barra/limiar usam `pontosCartao`.
        pontosCartao: Number(data?.pontosCartao ?? 0),
        bonusPalpite: Number(data?.bonusPalpite ?? 0),
        historico: Array.isArray(data?.historico) ? data.historico : [],
        palpites: Array.isArray(data?.palpites) ? data.palpites : [],
        pontosParaCartao: Number(data?.pontosParaCartao ?? 50),
        podeResgatarCartao: data?.podeResgatarCartao === true,
      };
      setDados(novo);
      return novo;
    } catch {
      setErro("Não foi possível carregar os pontos");
      return null;
    } finally {
      setLoading(false);
    }
  }, [address, authToken]);

  useEffect(() => { refetch(); }, [refetch]);

  return { ...dados, loading, erro, refetch };
}

// src/hooks/usePontos.js — UTAC106f. Pontos + histórico + palpites do TITULAR (ecrã Ofertas).
//
// PORQUE UM ENDPOINT E NÃO O SDK: `public.pontos`/`public.palpites` têm RLS só para `service_role`
// (a migração do 106d-v2 não abre policy a anon/authenticated) — o cliente anónimo do frontend
// NÃO as consegue ler. O `endereco` sai do Bearer, nunca do cliente. Endpoint: `GET /ler-pontos`.
//
// ⚠️ `getAuthToken` fica num REF: o efeito de montagem tem de depender SÓ de `address`. Se
// dependesse da identidade da função, um `getAuthToken` que mude a cada render (o duplo de teste,
// ou qualquer re-criação no hook vizinho) re-dispararia o efeito em ciclo.
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { useTrocarPorSenhas } from "./useTrocarPorSenhas.js";
import { apiGet } from "../lib/api.js";

const VAZIO = Object.freeze({
  pontos: 0, pontosCartao: 0, bonusPalpite: 0,
  historico: [], palpites: [], pontosParaCartao: 50, podeResgatarCartao: false,
});

export function usePontos() {
  const { address } = useAppContext();
  const { getAuthToken } = useTrocarPorSenhas();
  const obterToken = useRef(getAuthToken);
  obterToken.current = getAuthToken;

  const [dados, setDados] = useState(VAZIO);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const refetch = useCallback(async () => {
    if (!address) { setLoading(false); setDados(VAZIO); return null; }
    setLoading(true);
    setErro("");
    try {
      const token = await obterToken.current();
      const { ok, status, data } = await apiGet("ler-pontos", { token });
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
  }, [address]);

  useEffect(() => { refetch(); }, [refetch]);

  return { ...dados, loading, erro, refetch };
}

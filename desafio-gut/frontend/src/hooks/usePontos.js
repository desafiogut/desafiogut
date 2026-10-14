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
import { creditosDaResposta } from "../lib/passes.js";

// UTAC110d-front — `creditosLance`: os créditos de lance do ledger novo (`lance.creditos` do
// `ler-pontos`, UTAC110d). Lido SEM coerção (`creditosDaResposta`): ilegível ou ausente → 0.
const VAZIO = Object.freeze({
  pontos: 0, pontosCartao: 0, bonusPalpite: 0,
  historico: [], palpites: [], pontosParaCartao: 50, podeResgatarCartao: false,
  creditosLance: 0,
  missoesHoje: null,
});

// UTAC110f-front — «Missões de hoje» (campo `missoesHoje` do `ler-pontos`). Leitura ESTRITA, sem coerção: só se aceita
// o bloco com os 3 campos legíveis (`loginFeito`/`lanceFeito` booleanos e `pontosHoje` inteiro >= 0). Em falta ou
// ilegível → `null` = estado NEUTRO (a UI não afirma nem «feito» nem «pendente» — não se inventa).
export function missoesDaResposta(data) {
  const m = data?.missoesHoje;
  if (m === null || typeof m !== "object") return null;
  const { loginFeito, lanceFeito, pontosHoje } = m;
  if (typeof loginFeito !== "boolean" || typeof lanceFeito !== "boolean") return null;
  if (!Number.isSafeInteger(pontosHoje) || pontosHoje < 0) return null;
  return { loginFeito, lanceFeito, pontosHoje };
}

export function usePontos() {
  // UTAC110g (F2/P-2) — `pontosNonce`: quando o AppContext o incrementa (crédito do login diário, ou o
  // tick horário), este hook VOLTA A LER. Sem ele, o ecrã só relia em `[address, authToken]` — e um
  // carregamento directo de /carteira podia ler os pontos ANTES do crédito do dia (F2), tal como um
  // ecrã aberto atravessava a meia-noite de Manaus sem mudar de dia (P-2/F8).
  const { address, authToken, pontosNonce } = useAppContext();

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
        creditosLance: creditosDaResposta(data),
        missoesHoje: missoesDaResposta(data),
      };
      setDados(novo);
      return novo;
    } catch {
      setErro("Não foi possível carregar os pontos");
      return null;
    } finally {
      setLoading(false);
    }
    // ⚠️ UTAC110g: `pontosNonce` nas dependências é o que faz o NONCE funcionar — mudar o contador
    // RECRIA o `refetch`, e o `useEffect` abaixo volta a correr (é a releitura depois do login e o tick horário).
  }, [address, authToken, pontosNonce]);

  useEffect(() => { refetch(); }, [refetch]);

  return { ...dados, loading, erro, refetch };
}

// src/hooks/useEcoQuildo.js — UTAC110e (Frente D1). Saldo de ECOQUILDO do TITULAR (Carteira).
//
// ECOQUILDO (Regulamento 5.0, Arts. 47º-51º): moeda social interna; 1 ECOQUILDO = R$ 1,00 de lastro;
// NÃO convertível em dinheiro, NÃO transferível, NÃO se compra (Art. 49º) e só se usa no site oficial
// (R18-110e-2). Este hook SÓ LÊ — não há compra, conversão nem transferência no app.
//
// Mesmo padrão do `usePontos` (UTAC106j-fix): o token é o `authToken` (user-session) do AppContext,
// NÃO o `getAuthToken` do lance (`lance-auth`, que os endpoints com `verificarUserSession` recusam).
// O `endereco` sai do Bearer no servidor. O guarda `!authToken` evita o 401 enquanto a sessão é
// cunhada; como o `authToken` está nas dependências, o efeito RE-CORRE quando ele chega.
//
// Leitura HONESTA: o `saldo` só é aceite como inteiro seguro ≥ 0 (sem coerção). Se a resposta não
// trouxer isso, o saldo fica `null` + `erro` — a UI mostra «—», nunca um 0 inventado.
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { apiGet } from "../lib/api.js";

const ERRO_LEITURA = "Não foi possível carregar o ECOQUILDO";

/** Saldo lido SEM coerção: só inteiro seguro ≥ 0; o resto → null (ilegível). */
export function saldoEcoQuildoDaResposta(data) {
  const v = data?.saldo;
  return Number.isSafeInteger(v) && v >= 0 ? v : null;
}

export function useEcoQuildo() {
  const { address, authToken } = useAppContext();

  const [saldo, setSaldo] = useState(0);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const refetch = useCallback(async () => {
    if (!address || !authToken) {
      setSaldo(0); setHistorico([]); setErro(""); setLoading(false);
      return null;
    }
    setLoading(true);
    setErro("");
    try {
      const { ok, status, data } = await apiGet("ler-eco-quildo", { token: authToken });
      if (!ok) {
        setSaldo(null);
        setErro(status === 401 ? "Sessão expirada" : ERRO_LEITURA);
        return null;
      }
      const lido = saldoEcoQuildoDaResposta(data);
      if (lido === null) {
        setSaldo(null);
        setErro(ERRO_LEITURA);
        return null;
      }
      const novoHistorico = Array.isArray(data?.historico) ? data.historico : [];
      setSaldo(lido);
      setHistorico(novoHistorico);
      return { saldo: lido, historico: novoHistorico };
    } catch {
      setSaldo(null);
      setErro(ERRO_LEITURA);
      return null;
    } finally {
      setLoading(false);
    }
  }, [address, authToken]);

  useEffect(() => { refetch(); }, [refetch]);

  return { saldo, historico, loading, erro, refetch };
}

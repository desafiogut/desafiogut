// src/hooks/usePalpite.js — UTAC106f. Palpite (nº de lances previstos) numa edição Programada.
//
// ⚠️ BÓNUS. O palpite NÃO decide o cartão — o cartão é só por pontos de COMPRA (50). Aqui só se
// registra o palpite; a apuração (+2 pontos ao mais próximo) é do ADMIN, quando a edição fecha.
//
// O palpite existente chega pelo `usePontos` (`palpiteInicial`) — NÃO se faz um 2.º fetch.
// Guarda de corrida por `useRef` (o estado `loading` é obsoleto dentro do mesmo render).
//
// ⚠️ UTAC106j-fix: o token vem do `authToken` (user-session) do AppContext — o MESMO que o
// `saldo-rs` usa — e NÃO do `getAuthToken` do `useTrocarPorSenhas` (JWT `lance-auth`, que o
// `registar-palpite` rejeita com 401 token_invalido).
import { useCallback, useEffect, useRef, useState } from "react";
import { apiPost } from "../lib/api.js";
import { useAppContext } from "../context/AppContext.jsx";

export function usePalpite(edicaoId, palpiteInicial = null) {
  const { address, authToken } = useAppContext();

  const [palpite, setPalpite] = useState(palpiteInicial ?? null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const emCurso = useRef(false);

  // O palpite que veio do `usePontos` é a fonte de verdade até haver um registo novo.
  useEffect(() => { setPalpite(palpiteInicial ?? null); }, [palpiteInicial]);

  const registar = useCallback(async (valor) => {
    if (!edicaoId) return { ok: false, code: "sem_edicao", message: "Sem edição a decorrer" };
    if (!Number.isInteger(valor) || valor < 0) {
      return { ok: false, code: "valor_invalido", message: "Escreve um número inteiro de lances" };
    }
    // ⚠️ UTAC106j-fix: sem `authToken` (user-session) o endpoint daria 401 — código próprio.
    if (!authToken) return { ok: false, code: "sem_sessao", message: "Sessão ainda não pronta. Tente novamente." };
    if (emCurso.current) return { ok: false, code: "em_curso", message: "Palpite em curso" };
    emCurso.current = true;
    setLoading(true);
    setErro("");
    try {
      const { ok, status, data } = await apiPost("registar-palpite", { edicaoId, valor }, { token: authToken });
      if (ok) {
        const p = data?.palpite ?? { edicaoId, valor };
        setPalpite(p);
        return { ok: true, palpite: p, idempotent: data?.idempotent === true };
      }
      const message = status === 401 ? "Sessão expirada"
        : status === 409 ? "Precisas de ter comprado um Passe para palpitar"
        : status === 404 ? "Essa edição não existe"
        : status === 400 ? "Palpite inválido"
        : "Erro do servidor";
      setErro(message);
      return { ok: false, status, message };
    } catch {
      setErro("Erro do servidor");
      return { ok: false, message: "Erro do servidor" };
    } finally {
      emCurso.current = false;
      setLoading(false);
    }
  }, [edicaoId, authToken]);

  return { palpite, registar, loading, erro, conectado: Boolean(address) };
}

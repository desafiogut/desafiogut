// src/hooks/useInventarioPasses.js — UTAC120 (Frente B). Inventário de Passes do TITULAR
// (Relâmpago / Programado), lido de `GET /inventario-passes?endereco=0x...`.
//
// Mesma forma do `saldo-rs` (AppContext) e do `usePontos`: token user-session do AppContext no
// `Authorization: Bearer`, o `endereco` da sessão na query (o servidor recusa com 403 o de outro dono).
// O guarda `!authToken` evita o 401 na janela em que o `address` já chegou e a sessão ainda está a ser
// cunhada — e nessa janela conta como «a carregar», para nenhum ecrã afirmar «0 Passes» por instantes.
//
// Leitura ESTRITA dos dois campos (sem coerção): só inteiros >= 0. Ilegível → erro, nunca um 0 inventado
// — quem bloqueia o lance/palpite por «0 Passes» tem de saber que o 0 veio MESMO do servidor.
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { apiGet } from "../lib/api.js";

const contagem = (v) => (Number.isSafeInteger(v) && v >= 0 ? v : null);

export function useInventarioPasses() {
  // `pontosNonce`: o AppContext incrementa-o no login diário e no tick horário — relê-se com ele,
  // como o `usePontos`, para o inventário não ficar parado num ecrã aberto.
  const { address, authToken, pontosNonce } = useAppContext();

  const [passes, setPasses] = useState({ passesRelampago: 0, passesProgramado: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const recarregar = useCallback(async () => {
    // Fail-soft: sem sessão/endereço não há inventário a ler — 0/0, sem pedido e sem erro.
    if (!address || !authToken) {
      setPasses({ passesRelampago: 0, passesProgramado: 0 });
      setCarregando(false);
      setErro("");
      return null;
    }
    setCarregando(true);
    setErro("");
    try {
      const { ok, status, data } = await apiGet(
        `inventario-passes?endereco=${encodeURIComponent(address)}`,
        { token: authToken },
      );
      if (!ok) {
        setErro(status === 401 || status === 403 ? "Sessão expirada" : "Não foi possível carregar os Passes");
        return null;
      }
      const relampago = contagem(data?.passesRelampago);
      const programado = contagem(data?.passesProgramado);
      if (relampago === null || programado === null) {
        setErro("Não foi possível carregar os Passes");
        return null;
      }
      const novo = { passesRelampago: relampago, passesProgramado: programado };
      setPasses(novo);
      return novo;
    } catch {
      setErro("Não foi possível carregar os Passes");
      return null;
    } finally {
      setCarregando(false);
    }
  }, [address, authToken, pontosNonce]);

  useEffect(() => { recarregar(); }, [recarregar]);

  return {
    ...passes,
    carregando: carregando || (Boolean(address) && !authToken),
    erro,
    recarregar,
  };
}

/** `true` só quando o servidor disse MESMO 0 (lido, sem erro, sem leitura em curso). */
export function semPasses(inventario, campo) {
  return Boolean(inventario) && !inventario.carregando && !inventario.erro && inventario[campo] === 0;
}

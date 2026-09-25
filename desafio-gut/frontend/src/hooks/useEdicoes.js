// MC15.4 ITEM 5 — hook useEdicoes()
//
// Faz fetch de GET /.netlify/functions/edicoes e devolve o mapa de edições
// keyed por id. Espelha o padrão de re-sync do cronómetro existente:
// poll a cada 60s + re-fetch em visibilitychange (igual ao getEdicaoPrazo do
// AppContext, fixado em MC14.10.2 — imune a F5/login porque o timer é derivado
// de termino_em, nunca de contador mutável local).
//
// FALLBACK (D5/ITEM 14): em QUALQUER falha (rede / non-2xx / JSON inválido) o
// hook hidrata uma única edição R-1 sintetizada para que a UI NUNCA quebre.
// O termino_em da R-1 fallback reutiliza o prazo real já persistido em
// localStorage (gut_prazo_flash) para manter o countdown correto sob vite puro;
// se ausente, usa agora + 1h.
//
// NUNCA devolve null/vazio: edicoes é sempre um objeto com pelo menos R-1.

import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet } from "../lib/api.js";

const POLL_MS = 60_000;
const EDICAO_FALLBACK_ID = "R-1";

// Chave do prazo flash persistido pelo AppContext (segundos Unix). Reutilizada
// para que a R-1 fallback mantenha o countdown real mesmo sem backend.
const LS_PRAZO_FLASH = "gut_prazo_flash";

function lerPrazoFlashSegundos() {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(LS_PRAZO_FLASH);
    if (!v) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  } catch {
    return null;
  }
}

// Sintetiza a edição R-1 de fallback. termino_em é ISO-8601 UTC (igual ao
// contrato), derivado do prazo flash persistido OU agora + 1h.
function sintetizarR1() {
  const prazoSeg = lerPrazoFlashSegundos();
  const terminoMs =
    prazoSeg != null ? prazoSeg * 1000 : Date.now() + 60 * 60 * 1000;
  return {
    [EDICAO_FALLBACK_ID]: {
      id: EDICAO_FALLBACK_ID,
      tipo: "relampago",
      produto: null,
      termino_em: new Date(terminoMs).toISOString(),
      lances: 0,
      status: "aberto",
      imagem_url: null, // MC45 — fallback sem imagem → placeholder do EdicaoBanner
    },
  };
}

// Valida a forma mínima do mapa devolvido pelo backend. Garante que cada
// edição tem id e termino_em utilizáveis; caso contrário cai no fallback.
function normalizarEdicoes(payload) {
  const mapa = payload && typeof payload === "object" ? payload.edicoes : null;
  const out = normalizarMapa(mapa);
  return out && Object.keys(out).length > 0 ? out : null;
}

// MC94.2 — o mesmo normalizador serve `edicoes` e `agendadas`. Um mapa ausente
// ou vazio dá {} / null (não é erro: quase sempre não há edição agendada).
function normalizarMapa(mapa) {
  if (!mapa || typeof mapa !== "object" || Array.isArray(mapa)) return null;
  const ids = Object.keys(mapa);
  const out = {};
  for (const id of ids) {
    const e = mapa[id];
    if (!e || typeof e !== "object") continue;
    const termino = e.termino_em;
    if (!termino || Number.isNaN(Date.parse(termino))) continue;
    out[id] = {
      id: e.id || id,
      tipo: e.tipo === "programado" ? "programado" : "relampago",
      produto: e.produto ?? null,
      termino_em: termino,
      lances: Number.isFinite(e.lances) ? e.lances : 0,
      status: e.status || "aberto",
      // MC45 — imagem do banner da edição (quando o backend a fornecer). Aceita
      // aliases; null → EdicaoBanner usa o placeholder padrão.
      imagem_url: e.imagem_url ?? e.banner_url ?? e.imagem ?? null,
      // MC94.2 — início da janela (edições especiais); null nas restantes.
      inicio_em: typeof e.inicio_em === "string" && !Number.isNaN(Date.parse(e.inicio_em)) ? e.inicio_em : null,
    };
  }
  return out;
}

/**
 * MC94.2 — desvio entre o relógio do SERVIDOR e o do aparelho (HARD GATE 3).
 *
 * `agora` é carimbado pelo servidor algures entre a saída do pedido (t0) e a
 * chegada da resposta (t1), ambos no relógio do aparelho. Compara-se com o MEIO
 * do pedido, não com t1: com t1 o erro seria a latência inteira; com o meio fica
 * limitado a metade do tempo de ida e volta.
 * Hora do servidor, a qualquer instante: `Date.now() + offset`.
 *
 * @param {unknown} agoraServidorIso
 * @param {number} t0 Date.now() antes do pedido
 * @param {number} t1 Date.now() depois da resposta
 * @returns {number|null} ms; null (nunca 0) quando não há `agora` legível — um
 *   0 inventado faria o cronómetro seguir o relógio do aparelho em silêncio.
 */
export function calcularOffset(agoraServidorIso, t0, t1) {
  if (typeof agoraServidorIso !== "string") return null;
  const servidor = Date.parse(agoraServidorIso);
  if (Number.isNaN(servidor) || !Number.isFinite(t0) || !Number.isFinite(t1)) return null;
  return Math.round(servidor - (t0 + t1) / 2);
}

export function useEdicoes() {
  const [edicoes, setEdicoes] = useState(() => sintetizarR1());
  const [edicoesStatus, setEdicoesStatus] = useState("idle"); // idle | loading | ok | error
  // MC94.2 — edições por abrir (`agendadas` do GET /edicoes) e desvio do relógio.
  const [agendadas, setAgendadas] = useState({});
  const [offsetRelogioMs, setOffsetRelogioMs] = useState(null);
  const canceladoRef = useRef(false);
  // true assim que o backend devolveu dados reais ao menos uma vez. Em falha
  // posterior preferimos manter os últimos dados reais a recair no fallback.
  const teveDadosReaisRef = useRef(false);

  const buscar = useCallback(async () => {
    setEdicoesStatus((prev) => (prev === "ok" ? prev : "loading"));
    try {
      const t0 = Date.now();
      const { ok, status, data } = await apiGet("edicoes");
      const t1 = Date.now();
      if (!ok) throw new Error(`HTTP ${status}`);
      const normalizado = normalizarEdicoes(data);
      if (!normalizado) throw new Error("payload_invalido");
      if (canceladoRef.current) return;
      teveDadosReaisRef.current = true;
      setEdicoes(normalizado);
      setAgendadas(normalizarMapa(data.agendadas) || {});
      // Recalculado a cada fetch (60 s): acompanha o aparelho se alguém lhe mexer
      // no relógio. Sem `agora` na resposta, mantém o último valor válido.
      const offset = calcularOffset(data.agora, t0, t1);
      if (offset !== null) setOffsetRelogioMs(offset);
      setEdicoesStatus("ok");
    } catch (err) {
      // FALLBACK D5: nunca propaga erro à UI; mantém R-1 sintetizada.
      console.warn("[GUT-DEBUG] useEdicoes fallback R-1:", err?.message);
      if (canceladoRef.current) return;
      // Se já houve dados reais antes, preserva o estado atual (não pisca para
      // o fallback numa falha transitória de poll); senão hidrata R-1.
      if (!teveDadosReaisRef.current) setEdicoes(sintetizarR1());
      setEdicoesStatus("error");
    }
  }, []);

  useEffect(() => {
    canceladoRef.current = false;
    buscar();
    const id = setInterval(buscar, POLL_MS);
    const vis = () => {
      if (document.visibilityState === "visible") buscar();
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      canceladoRef.current = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [buscar]);

  return { edicoes, edicoesStatus, agendadas, offsetRelogioMs };
}

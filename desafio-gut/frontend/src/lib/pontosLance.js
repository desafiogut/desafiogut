// src/lib/pontosLance.js — UTAC110j.4b (Frente B, só-UI). O PROGRESSO PESSOAL dos pontos de lance em Meus Ativos.
// Puro: sem React, sem rede — testável com `node --test`.
//
// Fonte (backend, NÃO tocado): `GET /ler-pontos` → `lance: { creditos, pontos, historico }`, cada movimento
// `{ data, campo, motivo, delta, ref }` (`_lib/ledger-lance.mjs:92`). Uma reversão APAGA a entrada do histórico
// (`reverterMovimentoLance`), logo somar o histórico não conta movimentos desfeitos.
// Só os pontos do PRÓPRIO: um ranking de todos exige endpoint novo (UTAC do Hermes, `_logs/UTAC110n.spec-HERMES.md`).

export const CAMPO_PONTOS = "pontos_lance";

/** As fontes de pontos de lance (Art. 16º), pela ordem do ecrã. Os rótulos casam com `MOTIVOS_PONTOS_LANCE`. */
export const FONTES = Object.freeze([
  Object.freeze({ motivo: "login", rotulo: "Login diário" }),
  Object.freeze({ motivo: "missao", rotulo: "Missão do dia" }),
  Object.freeze({ motivo: "indicacao", rotulo: "Indicação" }),
  Object.freeze({ motivo: "sequencia", rotulo: "Sequência" }),
  Object.freeze({ motivo: "boas-vindas", rotulo: "Boas-vindas" }),
]);

export function rotuloMotivo(motivo) {
  const f = FONTES.find((x) => x.motivo === motivo);
  return f ? f.rotulo : "Outro";
}

const inteiro = (n) => (typeof n === "number" && Number.isSafeInteger(n) ? n : null);

/** Um movimento de PONTOS legível, ou `null` (sem coerção: delta inteiro ≠ 0, data parseável). */
function movimento(h) {
  if (h === null || typeof h !== "object" || h.campo !== CAMPO_PONTOS) return null;
  const delta = inteiro(h.delta);
  if (delta === null || delta === 0) return null;
  const t = typeof h.data === "string" ? Date.parse(h.data) : NaN;
  if (!Number.isFinite(t)) return null;
  return { data: h.data, t, motivo: typeof h.motivo === "string" ? h.motivo : "", delta };
}

/**
 * O bloco `lance` do `ler-pontos`, lido SEM coerção. Ilegível → `null` (a UI não inventa zeros).
 * @returns {{ pontos:number, movimentos:Array }|null}
 */
export function pontosLanceDaResposta(data) {
  const l = data?.lance;
  if (l === null || typeof l !== "object") return null;
  const pontos = inteiro(l.pontos);
  if (pontos === null || pontos < 0 || !Array.isArray(l.historico)) return null;
  return { pontos, movimentos: l.historico.map(movimento).filter(Boolean) };
}

/** Pontos GANHOS por fonte (só deltas positivos). Fontes sem ganhos vêm a 0; motivos desconhecidos → «outro». */
export function ganhosPorFonte(lance) {
  const r = Object.fromEntries(FONTES.map((f) => [f.motivo, 0]));
  r.outro = 0;
  for (const m of lance?.movimentos ?? []) {
    if (m.delta <= 0) continue;
    if (Object.hasOwn(r, m.motivo) && m.motivo !== "outro") r[m.motivo] += m.delta;
    else r.outro += m.delta;
  }
  return r;
}

/** Os N movimentos mais recentes (mais recente primeiro). */
export function recentes(lance, n = 5) {
  return [...(lance?.movimentos ?? [])].sort((a, b) => b.t - a.t).slice(0, n);
}

/** dd/mm no dia de Manaus (o dia das missões, UTAC110f). */
export function diaMes(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Manaus" }).format(t);
  } catch {
    const d = new Date(t - 4 * 3600 * 1000).toISOString();
    return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  }
}

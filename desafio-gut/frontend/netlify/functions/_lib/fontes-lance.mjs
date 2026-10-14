// _lib/fontes-lance.mjs — UTAC110f. As FONTES de pontos de lance (Art. 16º II, III e IV).
//
//   • Login diário ....... +5  (R18-110f-1) — 1× por dia de Manaus.
//   • Missão «1 lance» ... +10 (R18-110f-3) — 1× por dia de Manaus, creditada pelo SERVIDOR no lance.
//   • Indicação .......... +50 ao indicante e +50 ao indicado (R18-110f-2).
//
// O «dia» é o de Manaus (UTC-4 fixo, sem horário de verão desde 2019 — R18-110f-4); a meia-noite de
// Manaus é 04:00 UTC. Decisão do operador (SEG-1): o dia de calendário vale também para o login (não 24 h
// deslizantes) e NÃO há colunas novas — o estado «hoje já creditado» é a `ref` diária no histórico do
// ledger (`login:AAAA-MM-DD`). Como o `aplicar()` do ledger é CAS + idempotente por `ref`, dois pedidos
// em paralelo no mesmo dia dão UM só crédito sem nenhuma escrita fora do ledger.
// Os pontos de lance NÃO expiram (R18-110f-5): nada aqui os retira.
//
// Indicação: as refs são estáveis por PESSOA, não por dia —
//   indicante: `indicacao:<indicado>`  → um mesmo indicado nunca paga 2× ao mesmo indicante;
//   indicado:  `indicacao-recebida`    → cada endereço só recebe o bónus de indicado UMA vez na vida.
// O indicante respeita o limite mensal de 10 do sistema de indicação existente (`_lib/referral.mjs`).

import { creditarPontosLance, lerLedgerLance } from "./ledger-lance.mjs";

export const PONTOS_LOGIN_DIARIO = 5;
export const PONTOS_MISSAO_LANCE = 10;
export const PONTOS_INDICACAO = 50;
export const LIMITE_INDICACOES_MES = 10;

const OFFSET_MANAUS_MS = 4 * 60 * 60 * 1000;
const REF_INDICACAO_RECEBIDA = "indicacao-recebida";

/** Dia de calendário de Manaus (UTC-4), `AAAA-MM-DD`. Data inválida → `null`. */
export function diaManaus(agora = new Date()) {
  const t = agora instanceof Date ? agora.getTime() : NaN;
  if (!Number.isFinite(t)) return null;
  return new Date(t - OFFSET_MANAUS_MS).toISOString().slice(0, 10);
}

export const refLoginDiario = (dia) => `login:${dia}`;
export const refMissaoLance = (dia) => `missao-lance:${dia}`;

async function creditarDoDia(endereco, quantidade, motivo, ref) {
  const r = await creditarPontosLance(endereco, quantidade, motivo, ref);
  if (!r.ok) return { ok: false, code: r.code };
  return { ok: true, creditado: r.criado === true, pontosLance: r.pontos };
}

/** +5 pontos de lance no 1.º login do dia de Manaus. Repetir no mesmo dia → `creditado:false`. */
export function creditarLoginDiario(endereco, agora = new Date()) {
  const dia = diaManaus(agora);
  if (!dia) return Promise.resolve({ ok: false, code: "DATA_INVALIDA" });
  return creditarDoDia(endereco, PONTOS_LOGIN_DIARIO, "login", refLoginDiario(dia));
}

/** +10 pontos de lance no 1.º lance do dia de Manaus. Chamado pelo servidor, depois de o lance existir. */
export function creditarMissaoLance(endereco, agora = new Date()) {
  const dia = diaManaus(agora);
  if (!dia) return Promise.resolve({ ok: false, code: "DATA_INVALIDA" });
  return creditarDoDia(endereco, PONTOS_MISSAO_LANCE, "missao", refMissaoLance(dia));
}

/**
 * Estado das fontes diárias de hoje a partir do registo **JÁ LIDO** (`lerPontos`, `select("*")`).
 * PURA: não vai à rede. `historico_lance` é uma das colunas que o `select("*")` já traz.
 *
 * ⚠️ UTAC110g (P-1/F4 do validador do 110f-front): existe para o `ler-pontos` NÃO repetir a leitura.
 * Antes, `estadoMissoesHoje` fazia um 2.º SELECT da MESMA linha de `pontos` (`lerLedgerLance`), em
 * série com o primeiro — duas idas ao Supabase por pedido para ler a mesma linha.
 */
export function missoesDoRegisto(registo, agora = new Date()) {
  const dia = diaManaus(agora);
  const historico = Array.isArray(registo?.historico_lance) ? registo.historico_lance : [];
  const tem = (ref) => historico.some((h) => h?.ref === ref);
  return { dia, loginFeito: tem(refLoginDiario(dia)), lanceFeito: tem(refMissaoLance(dia)) };
}

/**
 * Estado das fontes diárias de hoje, **lendo o ledger** (para quem NÃO tem o registo em mão).
 * **Lança** em erro de leitura (como o `lerLedgerLance`).
 */
export async function estadoMissoesHoje(endereco, agora = new Date()) {
  const { historico } = await lerLedgerLance(endereco);
  return missoesDoRegisto({ historico_lance: historico }, agora);
}

/** Mês (UTC, `AAAA-MM`) — o MESMO recorte do limite mensal de `_lib/referral.mjs`. */
const mesUTC = (iso) => (typeof iso === "string" ? iso.slice(0, 7) : null);

/**
 * +50 ao indicante e +50 ao indicado. Recusa auto-indicação. O indicante só recebe enquanto tiver
 * menos de `LIMITE_INDICACOES_MES` indicações creditadas no mês; o indicado recebe na mesma.
 * ⚠️ O limite é verificado ANTES do crédito (fora do CAS): N indicados creditados EM PARALELO perto do
 *    limite podem ultrapassá-lo em até N−1 (medido pelo validador do SEG5: 9 pagos + 6 em paralelo → 14).
 *    O CAS impede só a duplicação, não o excesso. Fechar exige contador atómico — UTAC próprio.
 */
export async function creditarIndicacao(indicante, indicado, agora = new Date()) {
  const a = String(indicante ?? "").toLowerCase();
  const b = String(indicado ?? "").toLowerCase();
  if (a && a === b) return { ok: false, code: "AUTO_INDICACAO" };

  let indicanteRes;
  let historicoA;
  try { ({ historico: historicoA } = await lerLedgerLance(a)); }
  catch { historicoA = null; }
  if (historicoA === null) {
    indicanteRes = { ok: false, code: "ERRO_DB" };
  } else {
    const ref = `indicacao:${b}`;
    const jaCreditado = historicoA.some((h) => h?.ref === ref);
    const mes = mesUTC(agora.toISOString());
    const noMes = historicoA.filter((h) => h?.motivo === "indicacao" && String(h?.ref ?? "").startsWith("indicacao:")
      && mesUTC(h?.data) === mes).length;
    if (!jaCreditado && noMes >= LIMITE_INDICACOES_MES) {
      indicanteRes = { ok: true, creditado: false, code: "LIMITE_MENSAL" };
    } else {
      const r = await creditarPontosLance(a, PONTOS_INDICACAO, "indicacao", ref);
      indicanteRes = r.ok ? { ok: true, creditado: r.criado === true, pontosLance: r.pontos } : { ok: false, code: r.code };
    }
  }

  const r = await creditarPontosLance(b, PONTOS_INDICACAO, "indicacao", REF_INDICACAO_RECEBIDA);
  const indicadoRes = r.ok ? { ok: true, creditado: r.criado === true, pontosLance: r.pontos } : { ok: false, code: r.code };

  return { ok: indicanteRes.ok && indicadoRes.ok, indicante: indicanteRes, indicado: indicadoRes };
}

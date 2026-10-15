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
//
// ECOQUILDO (UTAC110h.2, R18-110h.2-1 e -2): a MESMA indicação confirmada credita, **em paralelo com os
// pontos de lance** (os dois coexistem), **+2 ECOQUILDO ao indicante e +1 ECOQUILDO ao indicado** — Art. 51º
// do Regulamento v5.0 («Cada indicação de novo cadastro, após confirmação, concede 2 (dois) ECOQUILDO ao
// indicante e 1 (um) ECOQUILDO ao indicado»). O indicante respeita o MESMO limite mensal dos pontos; o
// indicado é independente dele. A idempotência do ECOQUILDO é PRÓPRIA, no histórico da tabela `eco_quildo`
// (refs `eco-indicacao:<indicado>` e `eco-indicacao-recebida`) — não depende das refs do ledger de pontos.
// Fail-soft para com os pontos de lance (uma falha no ECOQUILDO nunca desfaz os pontos), mas o ECOQUILDO
// nunca fica sem lastro em R$ (Art. 50º): se o lastro falhar, as emissões daquele passo são revertidas.

import { creditarPontosLance, lerLedgerLance } from "./ledger-lance.mjs";
import { creditarEcoQuildo, registarEmissaoNoLastro, reverterEcoQuildo } from "./eco-quildo.mjs";
import { captureSecurityAlert } from "./sentry-server.mjs";

export const PONTOS_LOGIN_DIARIO = 5;
export const PONTOS_MISSAO_LANCE = 10;
export const PONTOS_INDICACAO = 50;
export const LIMITE_INDICACOES_MES = 10;

/** UTAC110h.2 — ECOQUILDO da indicação confirmada (Art. 51º do Regulamento 5.0). */
export const ECOQUILDO_INDICACAO_INDICANTE = 2;
export const ECOQUILDO_INDICACAO_INDICADO = 1;
/** Motivo de emissão (tem de estar em `MOTIVOS_EMISSAO` de `_lib/eco-quildo.mjs`). */
export const MOTIVO_ECO_INDICACAO = "indicacao";
/** Refs de idempotência no histórico do `eco_quildo` — namespace próprio (≠ das refs do ledger de pontos). */
export const REF_ECO_INDICACAO_RECEBIDA = "eco-indicacao-recebida";
export const refEcoIndicacao = (indicado) => `eco-indicacao:${indicado}`;

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

/**
 * UTAC110h.3 (P1/DEBT-028) — contador de indicações **creditadas no mês corrente (UTC)**, a partir do
 * registo **JÁ LIDO**. PURA: não vai à rede. É a MESMA conta que `creditarIndicacao` faz para aplicar o
 * `LIMITE_INDICACOES_MES` (motivo `indicacao`, ref `indicacao:<indicado>`, mês UTC) — extraída para uma
 * função só, para os dois sítios não poderem divergir. Reutilizável pelo `ler-pontos` sem leitura nova
 * (padrão do `missoesDoRegisto`, do UTAC110g).
 * @returns {{mes:string|null, creditadas:number, limite:number}}
 */
export function indicacoesDoMes(registo, agora = new Date()) {
  const mes = mesUTC(agora.toISOString());
  const historico = Array.isArray(registo?.historico_lance) ? registo.historico_lance : [];
  const creditadas = historico.filter((h) => h?.motivo === "indicacao"
    && String(h?.ref ?? "").startsWith("indicacao:") && mesUTC(h?.data) === mes).length;
  return { mes, creditadas, limite: LIMITE_INDICACOES_MES };
}

/** Mês (UTC, `AAAA-MM`) — o MESMO recorte do limite mensal de `_lib/referral.mjs`. */
const mesUTC = (iso) => (typeof iso === "string" ? iso.slice(0, 7) : null);

/**
 * ECOQUILDO da indicação confirmada (Art. 51º v5): +2 ao indicante e +1 ao indicado, EM PARALELO com os
 * +50 pontos de lance (R18-110h.2-2 — os dois coexistem). O indicante só recebe quando a indicação contou
 * para o mês (mesmo gate de `LIMITE_INDICACOES_MES`); o indicado recebe sempre. Idempotente pelas refs do
 * `eco_quildo`. FAIL-SOFT: um erro aqui nunca desfaz os pontos de lance; mas nunca deixa ECOQUILDO sem
 * lastro em R$ (Art. 50º) — se o lastro falhar, as emissões deste passo são revertidas.
 * @returns {Promise<{emitidos:number, indicante:object, indicado:object, code?:string}>}
 */
async function creditarEcoQuildoDaIndicacao(indicante, indicado, indicanteRes) {
  const out = {
    emitidos: 0,
    // `NAO_TENTADO` cobre o limite mensal (não é erro) e a falha do ledger de pontos (não se emite ECOQUILDO
    // por uma indicação cujos pontos não entraram).
    indicante: { ok: false, code: indicanteRes.code ?? "NAO_TENTADO" },
    indicado:  { ok: false, code: "NAO_TENTADO" },
  };
  const criados = [];

  if (indicanteRes.ok && indicanteRes.code !== "LIMITE_MENSAL") {
    const ref = refEcoIndicacao(indicado);
    const r = await creditarEcoQuildo(indicante, ECOQUILDO_INDICACAO_INDICANTE, MOTIVO_ECO_INDICACAO, ref)
      .catch(() => ({ ok: false, code: "ERRO_DB" }));
    out.indicante = r.ok ? { ok: true, creditado: r.criado === true } : { ok: false, code: r.code };
    if (r.ok && r.criado === true) criados.push({ endereco: indicante, ref, valor: ECOQUILDO_INDICACAO_INDICANTE });
  }

  const r2 = await creditarEcoQuildo(indicado, ECOQUILDO_INDICACAO_INDICADO, MOTIVO_ECO_INDICACAO, REF_ECO_INDICACAO_RECEBIDA)
    .catch(() => ({ ok: false, code: "ERRO_DB" }));
  out.indicado = r2.ok ? { ok: true, creditado: r2.criado === true } : { ok: false, code: r2.code };
  if (r2.ok && r2.criado === true) criados.push({ endereco: indicado, ref: REF_ECO_INDICACAO_RECEBIDA, valor: ECOQUILDO_INDICACAO_INDICADO });

  if (criados.length === 0) return out; // nada criado (idempotência ou falha) → sem lastro a mexer
  const total = criados.reduce((s, c) => s + c.valor, 0);
  const lastro = await registarEmissaoNoLastro(total).catch(() => ({ ok: false, code: "ERRO_DB" }));
  if (lastro.ok) return { ...out, emitidos: total };

  // ECOQUILDO sem lastro em R$ não existe (Art. 50º — mesma doutrina do `_lib/comprar-passe-tipado.mjs`):
  // desfaz SÓ o que este passo criou, antes de desistir. ⚠️ A reversão é best-effort: se ELA também falhar
  // (update do Supabase em baixo, `CONFLITO_CONCORRENCIA`), o ECOQUILDO fica sem reserva — é uma violação
  // do Art. 50º e o operador TEM de saber, logo alerta-se (achado ⚠️-2 do validador do SEG5; a doutrina e
  // a chamada são as do `comprar-passe-tipado.mjs`).
  let reverteramTodos = true;
  for (const c of criados) {
    const rev = await reverterEcoQuildo(c.endereco, c.ref).catch(() => ({ ok: false, code: "ERRO_DB" }));
    if (!(rev.ok && rev.revertido)) reverteramTodos = false;
  }
  if (!reverteramTodos) {
    captureSecurityAlert("indicacao_eco_reversao_falhou", {
      code: lastro.code, enderecos: criados.map((c) => c.endereco), emitidos: total,
    }, "error").catch(() => {});
  }
  return {
    emitidos: 0, code: `lastro:${lastro.code}`, reversaoCompleta: reverteramTodos,
    indicante: { ok: false, code: "LASTRO_FALHOU" },
    indicado:  { ok: false, code: "LASTRO_FALHOU" },
  };
}

/**
 * +50 ao indicante e +50 ao indicado. Recusa auto-indicação. O indicante só recebe enquanto tiver
 * menos de `LIMITE_INDICACOES_MES` indicações creditadas no mês; o indicado recebe na mesma.
 * Credita também o ECOQUILDO do Art. 51º (+2/+1) — ver `creditarEcoQuildoDaIndicacao`.
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
    // UTAC110h.3 (P1/DEBT-028) — a MESMA função que alimenta o contador da UI (`indicacoesDoMes`, PURA):
    // fonte única para o limite mensal, para o painel e para o servidor não poderem divergir.
    const noMes = indicacoesDoMes({ historico_lance: historicoA }, agora).creditadas;
    if (!jaCreditado && noMes >= LIMITE_INDICACOES_MES) {
      indicanteRes = { ok: true, creditado: false, code: "LIMITE_MENSAL" };
    } else {
      const r = await creditarPontosLance(a, PONTOS_INDICACAO, "indicacao", ref);
      indicanteRes = r.ok ? { ok: true, creditado: r.criado === true, pontosLance: r.pontos } : { ok: false, code: r.code };
    }
  }

  const r = await creditarPontosLance(b, PONTOS_INDICACAO, "indicacao", REF_INDICACAO_RECEBIDA);
  const indicadoRes = r.ok ? { ok: true, creditado: r.criado === true, pontosLance: r.pontos } : { ok: false, code: r.code };

  // UTAC110h.2 — ECOQUILDO do Art. 51º, em paralelo com os pontos (R18-110h.2-1/-2). Fail-soft para com
  // os pontos: `ok` continua a depender SÓ dos pontos de lance (contrato anterior intacto, GATE 4).
  const ecoQuildo = await creditarEcoQuildoDaIndicacao(a, b, indicanteRes);

  return { ok: indicanteRes.ok && indicadoRes.ok, indicante: indicanteRes, indicado: indicadoRes, ecoQuildo };
}

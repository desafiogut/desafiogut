// Sistema de Indicação ("Indique e Ganhe") — Mega Comando 10 / Item 1.
//
// Geração/validação de códigos de indicação, registro de vínculos e
// concessão de bônus (+1 senha on-chain) ao indicador quando o indicado
// faz a primeira compra. Anti-fraude via FingerprintJS visitorId + Sybil
// check; limite mensal de 10 conversões.
//
// Convenções de Blobs:
//   referral-code:{endereco}              → { codigo, criadoEm }                                  (1 código por endereço)
//   referral-code-reverso:{codigo}        → { endereco, criadoEm }                                (lookup O(1) codigo→dono)
//   referral:{codigo}:{novoEndereco}      → { codigo, indicador, indicado, criadoEm, status }     (vínculo)
//   referral-bonus:{enderecoIndicador}    → { total, ultimos: [...], atualizadoEm }                (histórico)
//   referral-monthly:{endereco}:{mesAAAA-MM} → { conversoes }                                     (limite mensal)
//   referral-convertido:{codigo}:{endereco}  → { txHash, em }                                    (marca conversão única)
//   referral-fraud:{codigo}:{endereco}    → { motivo, em }                                       (suspeito → sem bônus)
//
// Feature flag: REFERRAL_ATIVO=on|off (default: on). Off → endpoints retornam
// 503 service_unavailable. concederBonus respeita o mesmo flag.

import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { creditarSenhas } from "./contract.mjs";
import { checkSybil, registerVisitor } from "./sybil-check.mjs";
import { captureSecurityAlert } from "./sentry-server.mjs";

const STORE_CODES     = "referral-codes";       // referral-code:* + referral-code-reverso:*
const STORE_LINKS     = "referral-links";       // referral:* + referral-convertido:* + referral-fraud:*
const STORE_BONUS     = "referral-bonus";       // bonus por indicador + contador mensal
// MC15.8.1 — log de auditoria diário + indução agrupada (GUTO Indutor).
const STORE_LOG       = "referral-log";         // log:{AAAA-MM-DD} → { eventos:[...] } (FIFO)
const STORE_INDUZIDO  = "referral-induzido";    // {endereco}:{AAAA-MM-DD} → indução agrupada do dia
const MAX_LOG_EVENTOS = 500;
const LIMITE_MENSAL   = 10;
const PREFIXO_CODIGO  = "IND";
const ALFABETO        = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// Mantém compatibilidade caso o env não esteja configurado: default ON.
export function referralAtivo() {
  const raw = String(process.env.REFERRAL_ATIVO ?? "on").toLowerCase();
  return raw === "on" || raw === "true" || raw === "1";
}

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[referral] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

function gerarSufixoAleatorio(n = 6) {
  // Usa crypto.randomBytes para evitar colisões previsíveis (Math.random()
  // não é unicidade-safe sob carga concorrente).
  const buf = randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += ALFABETO[buf[i] % ALFABETO.length];
  return out;
}

function mesAtualKey(date = new Date()) {
  const ano = date.getUTCFullYear();
  const mes = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

// MC15.8.1 — dia YYYY-MM-DD no fuso de Brasília (UTC-3). Usado para o
// agrupamento diário das induções e do log (o relatório admin sai às 9h BRT).
export function diaBRT(date = new Date()) {
  const brt = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const ano = brt.getUTCFullYear();
  const mes = String(brt.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(brt.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/**
 * MC15.8.1 — append fail-soft de um evento ao log diário de indicações
 * (`referral-log` → key `log:{dia BRT}`). FIFO máx MAX_LOG_EVENTOS. Nunca lança.
 * Tipos: "conversao" | "conversao_falha" | "fraude".
 */
export async function appendReferralLog(evento) {
  try {
    const store = abrirStore(STORE_LOG);
    if (!store) return false;
    const chave = `log:${diaBRT()}`;
    const doc = (await store.get(chave, { type: "json" })) || { eventos: [] };
    const lista = Array.isArray(doc.eventos) ? doc.eventos : [];
    lista.push({ ...evento, ts: new Date().toISOString() });
    await store.setJSON(chave, {
      eventos: lista.slice(-MAX_LOG_EVENTOS),
      atualizadoEm: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn("[referral] appendReferralLog falhou (não-fatal):", err?.message);
    return false;
  }
}

/** Lê os eventos do log de um dia (YYYY-MM-DD BRT). Fail-soft → []. */
export async function lerReferralLog(dia = diaBRT()) {
  try {
    const store = abrirStore(STORE_LOG);
    if (!store) return [];
    const doc = await store.get(`log:${dia}`, { type: "json" });
    return Array.isArray(doc?.eventos) ? doc.eventos : [];
  } catch { return []; }
}

// ── MC15.8.1 — GUTO Indutor: notificação agrupada ao indicador ───────────────
// O texto é recalculado na leitura a partir do contador, para o singular/plural
// refletir sempre o agregado do dia. O nome usado é o do PRIMEIRO indicado do dia.

/** Texto da mensagem indutiva (singular vs plural) a partir do agregado do dia. */
export function mensagemInducao(contador, primeiroNome) {
  const n = Number(contador || 0);
  if (n <= 1) {
    const quem = primeiroNome ? `O teu amigo ${primeiroNome}` : "Um amigo teu";
    return `Parabéns! ${quem} entrou no DESAFIOGUT. +1 senha creditada!`;
  }
  return `${n} amigos teus entraram hoje no DESAFIOGUT! +${n} senhas creditadas.`;
}

/**
 * Regista/agrupa uma conversão indutiva no Blob referral-induzido:{end}:{dia BRT}.
 * Agrupamento (ITEM 4): se já há entrada NÃO-LIDA hoje, incrementa o contador.
 * Limite (ITEM 6): se a entrada de hoje já foi LIDA/exibida, NÃO gera mais
 * (conversões extra ficam para o relatório diário). 100% fail-soft.
 * @returns {Promise<boolean>} true se criou/atualizou; false em no-op/erro.
 */
export async function registrarInducaoConvertida(enderecoIndicador, nomeIndicado = null) {
  const end = String(enderecoIndicador || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(end)) return false;
  const store = abrirStore(STORE_INDUZIDO);
  if (!store) return false;
  const chave = `${end}:${diaBRT()}`;
  const agora = new Date().toISOString();
  try {
    const doc = await store.get(chave, { type: "json" });
    if (!doc) {
      await store.setJSON(chave, {
        tipo: "indicacao_convertida", contador: 1,
        primeiroNome: nomeIndicado || null, lida: false,
        criadoEm: agora, atualizadoEm: agora,
      });
      return true;
    }
    if (doc.lida) return false; // ITEM 6 — já exibida hoje → não gera mais
    doc.contador = Number(doc.contador || 0) + 1;
    if (!doc.primeiroNome && nomeIndicado) doc.primeiroNome = nomeIndicado;
    doc.atualizadoEm = agora;
    await store.setJSON(chave, doc);
    return true;
  } catch (err) {
    console.warn("[referral] registrarInducaoConvertida falhou (não-fatal):", err?.message);
    return false;
  }
}

/**
 * Lê a indução PENDENTE (não-lida) de hoje para o indicador, no formato de
 * notificação consumido pelo /notificacoes (ITEM 5). Fail-soft → [].
 */
export async function lerInducoesPendentes(enderecoIndicador) {
  const end = String(enderecoIndicador || "").toLowerCase();
  if (!end) return [];
  const store = abrirStore(STORE_INDUZIDO);
  if (!store) return [];
  const dia = diaBRT();
  try {
    const doc = await store.get(`${end}:${dia}`, { type: "json" });
    if (!doc || doc.lida || !(Number(doc.contador) > 0)) return [];
    return [{
      id: `induzido-${end}-${dia}`,
      tipo: "indicacao_convertida",
      edicaoId: null,
      valor: Number(doc.contador),
      lida: false,
      timestamp: doc.atualizadoEm || doc.criadoEm || new Date().toISOString(),
      mensagem: mensagemInducao(doc.contador, doc.primeiroNome),
    }];
  } catch { return []; }
}

/** Abrevia um endereço 0x para exibição (0x1234…abcd). */
function abreviarEndereco(end) {
  const e = String(end || "");
  return e.length >= 12 ? `${e.slice(0, 6)}…${e.slice(-4)}` : e || "—";
}

/**
 * MC15.8.1 ITEM 7 — relatório diário de indicações (admin only). Lê o log do dia
 * (BRT) e compila: total de conversões, senhas creditadas (indicado sempre +1;
 * indicador +1 salvo limite mensal), top 3 indicadores e anomalias (fraudes).
 * Fail-soft: sem log/Blobs → relatório a zeros. Texto conciso, sem emojis.
 * @returns {Promise<{dia,totalConversoes,senhasCreditadas,topIndicadores,anomalias,falhasTransitorias,texto}>}
 */
export async function gerarRelatorioIndicacoes(dia = diaBRT()) {
  const eventos = await lerReferralLog(dia);
  const conversoes = eventos.filter((e) => e?.tipo === "conversao");
  const fraudes    = eventos.filter((e) => e?.tipo === "fraude");
  const falhas     = eventos.filter((e) => e?.tipo === "conversao_falha");

  const totalConversoes = conversoes.length;
  // Senhas creditadas no dia: cada conversão dá +1 ao indicado e +1 ao indicador
  // (exceto quando o indicador bateu o limite mensal → semBonusIndicador).
  const senhasCreditadas = conversoes.reduce(
    (acc, c) => acc + 1 + (c.semBonusIndicador ? 0 : 1), 0,
  );

  const porIndicador = {};
  for (const c of conversoes) {
    const k = String(c.indicador || "").toLowerCase();
    if (k) porIndicador[k] = (porIndicador[k] || 0) + 1;
  }
  const topIndicadores = Object.entries(porIndicador)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([end, n]) => `${abreviarEndereco(end)} (${n})`);

  const porMotivo = {};
  for (const f of fraudes) {
    const m = String(f.motivo || "desconhecido");
    porMotivo[m] = (porMotivo[m] || 0) + 1;
  }
  const anomalias = Object.entries(porMotivo).map(([m, n]) => `${m}: ${n}`);

  const texto =
    `Indique e Ganhe (${dia}). Conversoes: ${totalConversoes}. ` +
    `Senhas creditadas: ${senhasCreditadas}. ` +
    `Top indicadores: ${topIndicadores.length ? topIndicadores.join("; ") : "—"}. ` +
    `Anomalias: ${anomalias.length ? anomalias.join("; ") : "nenhuma"}.` +
    (falhas.length ? ` Falhas transitorias: ${falhas.length}.` : "");

  return { dia, totalConversoes, senhasCreditadas, topIndicadores, anomalias, falhasTransitorias: falhas.length, texto };
}

/** Marca a indução de hoje como lida (ITEM 6). Fail-soft → true (no-op se ausente). */
export async function marcarInducoesLidas(enderecoIndicador) {
  const end = String(enderecoIndicador || "").toLowerCase();
  if (!end) return false;
  const store = abrirStore(STORE_INDUZIDO);
  if (!store) return false;
  const chave = `${end}:${diaBRT()}`;
  try {
    const doc = await store.get(chave, { type: "json" });
    if (!doc) return true;
    if (!doc.lida) {
      doc.lida = true;
      doc.lidaEm = new Date().toISOString();
      await store.setJSON(chave, doc);
    }
    return true;
  } catch (err) {
    console.warn("[referral] marcarInducoesLidas falhou (não-fatal):", err?.message);
    return false;
  }
}

/**
 * Gera (ou retorna o já existente) código de indicação para `endereco`.
 * Formato: `IND-XXXXXX`. Idempotente — chamadas repetidas devolvem o mesmo código.
 *
 * @returns {Promise<{ codigo: string, novo: boolean }>}
 */
export async function gerarCodigoIndicacao(endereco) {
  if (typeof endereco !== "string" || !endereco.startsWith("0x")) {
    throw new Error("endereco_invalido");
  }
  const enderecoLower = endereco.toLowerCase();
  const store = abrirStore(STORE_CODES);
  if (!store) throw new Error("store_indisponivel");

  // Idempotência: se já existe, devolve.
  const existente = await store.get(`referral-code:${enderecoLower}`, { type: "json" });
  if (existente?.codigo) return { codigo: existente.codigo, novo: false };

  // Tenta até 5 sufixos distintos antes de desistir (probabilidade de colisão
  // em 6 chars sobre alfabeto de 36 é negligenciável até dezenas de milhares).
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const sufixo = gerarSufixoAleatorio(6);
    const codigo = `${PREFIXO_CODIGO}-${sufixo}`;
    const colide = await store.get(`referral-code-reverso:${codigo}`, { type: "json" });
    if (colide) continue;
    const ts = Date.now();
    try {
      await store.setJSON(`referral-code:${enderecoLower}`,         { codigo, endereco: enderecoLower, criadoEm: ts });
      await store.setJSON(`referral-code-reverso:${codigo}`,        { endereco: enderecoLower, criadoEm: ts });
    } catch (err) {
      console.warn("[referral] persistir codigo falhou:", err?.message);
      throw new Error("persistencia_falhou");
    }
    return { codigo, novo: true };
  }
  throw new Error("colisao_codigo");
}

/**
 * Valida um código → endereço dono. Retorna null se inexistente.
 * @returns {Promise<string|null>}
 */
export async function validarCodigoIndicacao(codigo) {
  if (typeof codigo !== "string" || !/^IND-[A-Z0-9]{6}$/.test(codigo)) return null;
  const store = abrirStore(STORE_CODES);
  if (!store) return null;
  try {
    const reg = await store.get(`referral-code-reverso:${codigo}`, { type: "json" });
    return reg?.endereco || null;
  } catch { return null; }
}

/**
 * Verifica anti-fraude antes de aceitar uma indicação:
 * compara visitorIds via Sybil check (MC3) e detecta auto-indicação.
 *
 * @returns {Promise<{ ok: boolean, motivo?: string }>}
 */
export async function verificarFraude(codigo, novoEndereco, visitorIdNovo) {
  const indicador = await validarCodigoIndicacao(codigo);
  if (!indicador) return { ok: false, motivo: "codigo_inexistente" };
  if (indicador === String(novoEndereco).toLowerCase()) {
    return { ok: false, motivo: "auto_indicacao" };
  }
  // Sybil: se o mesmo visitorId já está vinculado a ≥3 endereços nas últimas
  // 24h, suspeitamos. Independente disso, o vínculo indicador↔indicado é
  // específico — se ambos endereços compartilham visitorId, é sinal claro.
  if (visitorIdNovo) {
    const sybil = await checkSybil(visitorIdNovo);
    if (sybil?.suspeito) {
      // Se o indicador também está no conjunto de addresses do mesmo visitor,
      // marca como fraude direta.
      if (sybil.addresses.includes(indicador)) {
        return { ok: false, motivo: "mesmo_dispositivo" };
      }
      return { ok: false, motivo: "sybil_suspeito" };
    }
  }
  return { ok: true };
}

/**
 * Registra a indicação se válida e não-fraudulenta.
 * @returns {Promise<{ ok: boolean, code?: string, message?: string, indicador?: string }>}
 */
export async function registrarIndicacao(codigo, novoEndereco, visitorIdNovo) {
  if (!referralAtivo()) {
    return { ok: false, code: "feature_desligada", message: "REFERRAL_ATIVO=off" };
  }
  const novoLower = String(novoEndereco || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(novoLower)) {
    return { ok: false, code: "endereco_invalido", message: "novoEndereco inválido" };
  }
  const fraude = await verificarFraude(codigo, novoLower, visitorIdNovo);
  if (!fraude.ok) {
    // Persiste para análise posterior.
    const linksStore = abrirStore(STORE_LINKS);
    if (linksStore) {
      try {
        await linksStore.setJSON(`referral-fraud:${codigo}:${novoLower}`, {
          motivo: fraude.motivo, em: Date.now(), visitorId: visitorIdNovo || null,
        });
      } catch {}
    }
    if (fraude.motivo !== "codigo_inexistente" && fraude.motivo !== "auto_indicacao") {
      captureSecurityAlert("referral_fraude", {
        codigo, novoEndereco: novoLower, motivo: fraude.motivo,
      }).catch(() => {});
    }
    // ITEM 2 — regista a anomalia no log diário (alimenta o relatório admin).
    await appendReferralLog({ tipo: "fraude", motivo: fraude.motivo, codigo, indicado: novoLower });
    return { ok: false, code: fraude.motivo, message: `indicação rejeitada: ${fraude.motivo}` };
  }
  const indicador = await validarCodigoIndicacao(codigo);
  if (!indicador) return { ok: false, code: "codigo_inexistente", message: "código não encontrado" };

  const linksStore = abrirStore(STORE_LINKS);
  if (!linksStore) return { ok: false, code: "store_indisponivel", message: "Blobs indisponível" };

  // Idempotência: se já registrado com ESTE código, não duplica.
  const chaveLink = `referral:${codigo}:${novoLower}`;
  const ja = await linksStore.get(chaveLink, { type: "json" });
  if (ja) return { ok: true, indicador, idempotent: true };

  // ITEM 2 — uma carteira só pode ser indicada UMA vez: se já existe vínculo
  // por OUTRO código, rejeita (evita "trocar de padrinho" / farmar bónus).
  const vinculoExistente = await buscarVinculoPorIndicado(novoLower);
  if (vinculoExistente && vinculoExistente.codigo && vinculoExistente.codigo !== codigo) {
    await appendReferralLog({ tipo: "fraude", motivo: "ja_indicado", codigo, indicado: novoLower, codigoExistente: vinculoExistente.codigo });
    return { ok: false, code: "ja_indicado", message: "esta carteira já foi indicada por outro código" };
  }

  try {
    await linksStore.setJSON(chaveLink, {
      codigo,
      indicador,
      indicado: novoLower,
      visitorId: visitorIdNovo || null,
      criadoEm: Date.now(),
      status:   "pendente",       // vira "convertido" após primeira compra
    });
    // Registra o visitorId no Sybil store também — defesa em camada.
    if (visitorIdNovo) {
      registerVisitor(visitorIdNovo, novoLower).catch(() => {});
    }
  } catch (err) {
    return { ok: false, code: "persistencia_falhou", message: err?.message };
  }
  return { ok: true, indicador };
}

/**
 * Verifica contador mensal do indicador. Retorna { ok, conversoes }.
 * `ok: false` se conversoes >= LIMITE_MENSAL.
 */
export async function verificarLimiteMensal(enderecoIndicador, mes = mesAtualKey()) {
  const store = abrirStore(STORE_BONUS);
  if (!store) return { ok: true, conversoes: 0, fonte: "fail-open" };
  const chave = `referral-monthly:${enderecoIndicador}:${mes}`;
  let reg;
  try { reg = await store.get(chave, { type: "json" }); }
  catch { reg = null; }
  const conversoes = Number(reg?.conversoes || 0);
  return { ok: conversoes < LIMITE_MENSAL, conversoes, limite: LIMITE_MENSAL };
}

/**
 * Concede +1 senha on-chain ao indicador, decrementa o limite mensal e
 * registra histórico. Idempotência: o caller é responsável por marcar
 * `referral-convertido:{codigo}:{indicado}` ANTES de chamar concederBonus
 * (ou usar registrarConversao() abaixo, que faz o ciclo completo).
 *
 * @returns {Promise<{ ok: boolean, code?: string, message?: string, txHash?: string }>}
 */
export async function concederBonus(enderecoIndicador, contexto = {}) {
  if (!referralAtivo()) {
    return { ok: false, code: "feature_desligada", message: "REFERRAL_ATIVO=off" };
  }
  const enderecoLower = String(enderecoIndicador || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(enderecoLower)) {
    return { ok: false, code: "endereco_invalido", message: "indicador inválido" };
  }
  const limite = await verificarLimiteMensal(enderecoLower);
  if (!limite.ok) {
    return { ok: false, code: "limite_mensal_excedido", message: `${limite.conversoes}/${limite.limite} conversões no mês` };
  }

  // Crédito on-chain (+1 senha). Mesma função usada por comprar-senhas.mjs.
  let txHash = null;
  try {
    const r = await creditarSenhas(enderecoLower, 1);
    txHash = r?.txHash || null;
  } catch (err) {
    console.error("[referral] creditarSenhas falhou:", err?.message);
    captureSecurityAlert("referral_bonus_falhou", {
      indicador: enderecoLower, err: err?.message, contexto,
    }, "error").catch(() => {});
    return { ok: false, code: "credito_onchain_falhou", message: err?.message };
  }

  // Persiste histórico + incrementa contador mensal.
  const store = abrirStore(STORE_BONUS);
  if (store) {
    const ts  = Date.now();
    const mes = mesAtualKey(new Date(ts));
    try {
      // Histórico
      const histKey = `referral-bonus:${enderecoLower}`;
      const hist    = (await store.get(histKey, { type: "json" })) || { total: 0, ultimos: [] };
      hist.total       = Number(hist.total || 0) + 1;
      hist.ultimos     = [{ em: ts, txHash, contexto }, ...(hist.ultimos || [])].slice(0, 20);
      hist.atualizadoEm= ts;
      await store.setJSON(histKey, hist);
      // Contador mensal
      const monthlyKey = `referral-monthly:${enderecoLower}:${mes}`;
      const monthly    = (await store.get(monthlyKey, { type: "json" })) || { conversoes: 0 };
      monthly.conversoes = Number(monthly.conversoes || 0) + 1;
      monthly.atualizadoEm = ts;
      await store.setJSON(monthlyKey, monthly);
    } catch (err) {
      console.warn("[referral] persistir bonus/histórico falhou (não-fatal):", err?.message);
    }
  }
  return { ok: true, txHash };
}

/**
 * Lookup: dado um endereço de comprador, retorna o vínculo de indicação
 * existente (se houver). Usado pelo comprar-senhas.mjs para detectar
 * "primeira compra de indicado".
 *
 * @returns {Promise<{ codigo: string, indicador: string, indicado: string }|null>}
 */
export async function buscarVinculoPorIndicado(enderecoIndicado) {
  const linksStore = abrirStore(STORE_LINKS);
  if (!linksStore) return null;
  const indicadoLower = String(enderecoIndicado || "").toLowerCase();
  let resp;
  // Não há prefixo eficiente reverso por indicado — listamos `referral:` e
  // filtramos. Volume esperado é baixo (10/mês/usuário); mesmo 10k vínculos
  // são lidos sob 1s. Quando o sistema crescer, criar índice reverso.
  try { resp = await linksStore.list({ prefix: "referral:" }); }
  catch { return null; }
  const blobs = (resp?.blobs || []).filter((b) => b.key.endsWith(`:${indicadoLower}`));
  if (blobs.length === 0) return null;
  try {
    const reg = await linksStore.get(blobs[0].key, { type: "json" });
    return reg ? { codigo: reg.codigo, indicador: reg.indicador, indicado: reg.indicado, status: reg.status } : null;
  } catch { return null; }
}

/**
 * Ciclo completo "primeira compra do indicado": marca convertido se ainda
 * não estiver, atualiza status do vínculo e chama concederBonus. Idempotente.
 * Retorna o resultado para o caller (comprar-senhas.mjs) logar.
 */
export async function registrarConversao(vinculo, contexto = {}) {
  if (!vinculo?.codigo || !vinculo?.indicador || !vinculo?.indicado) {
    return { ok: false, code: "vinculo_invalido" };
  }
  const indicador = String(vinculo.indicador).toLowerCase();
  const indicado  = String(vinculo.indicado).toLowerCase();
  // ITEM 2 — guarda defensiva: nunca converte uma auto-indicação (mesmo que um
  // vínculo inválido tenha sido persistido). Regista a anomalia no log diário.
  if (indicador === indicado) {
    await appendReferralLog({ tipo: "fraude", motivo: "auto_indicacao", codigo: vinculo.codigo, indicador, indicado });
    return { ok: false, code: "auto_indicacao" };
  }
  const linksStore = abrirStore(STORE_LINKS);
  if (!linksStore) return { ok: false, code: "store_indisponivel" };

  // Idempotência (R2): o marcador referral-convertido é a FONTE ÚNICA. Já
  // convertido (via primeiro lance OU primeira compra) → no-op silencioso.
  const chaveConv = `referral-convertido:${vinculo.codigo}:${indicado}`;
  const ja = await linksStore.get(chaveConv, { type: "json" });
  if (ja) return { ok: true, idempotent: true };

  // +1 senha ao INDICADOR (limite mensal de 10 validado dentro de concederBonus).
  const bonus = await concederBonus(indicador, { ...contexto, codigo: vinculo.codigo, indicado });
  // Falha TRANSITÓRIA (ex.: on-chain) → NÃO marca convertido (permite retry no
  // próximo lance/compra) e NÃO credita o indicado ainda. Só limite mensal
  // (estado terminal do mês) segue para marcar convertido sem bónus ao indicador.
  if (!bonus.ok && bonus.code !== "limite_mensal_excedido") {
    await appendReferralLog({ tipo: "conversao_falha", codigo: vinculo.codigo, indicador, indicado, motivo: bonus.code });
    return bonus;
  }

  // +1 senha ao INDICADO (MC15.8.1 R4 — bónus de boas-vindas; independente do
  // limite mensal do indicador). Fail-soft: falha aqui não desfaz a conversão.
  let txHashIndicado = null;
  try {
    const r = await creditarSenhas(indicado, 1);
    txHashIndicado = r?.txHash || null;
  } catch (err) {
    console.warn("[referral] crédito ao indicado falhou (não-fatal):", err?.message);
  }

  const semBonusIndicador = !bonus.ok; // true só quando limite mensal excedido
  try {
    await linksStore.setJSON(chaveConv, {
      em: Date.now(),
      txHashIndicador: bonus.ok ? bonus.txHash : null,
      txHashIndicado,
      semBonusIndicador,
      motivo: bonus.ok ? null : bonus.code,
    });
    // Atualiza status do vínculo para "convertido".
    const vinculoKey = `referral:${vinculo.codigo}:${indicado}`;
    const vinculoReg = await linksStore.get(vinculoKey, { type: "json" });
    if (vinculoReg) {
      await linksStore.setJSON(vinculoKey, {
        ...vinculoReg, status: "convertido", convertidoEm: Date.now(),
        txHashBonus: bonus.ok ? bonus.txHash : null,
      });
    }
  } catch (err) {
    console.warn("[referral] marcar convertido falhou (não-fatal):", err?.message);
  }

  // Auditoria do log diário (alimenta o relatório admin — ITEM 7).
  await appendReferralLog({
    tipo: "conversao", codigo: vinculo.codigo, indicador, indicado,
    semBonusIndicador, origem: contexto?.contexto || null,
  });

  // Notificação indutiva agrupada ao indicador (ITEM 4). Só quando houve bónus
  // efetivo (se bateu o limite mensal, o indicador não ganhou senha → sem indução).
  if (bonus.ok) {
    await registrarInducaoConvertida(indicador, contexto?.nomeIndicado || null);
  }

  return {
    ok: true,
    txHash: bonus.ok ? bonus.txHash : null,
    txHashIndicado,
    bonusIndicador: bonus.ok,
    bonusIndicadorCode: bonus.ok ? null : bonus.code,
  };
}

/**
 * Estatísticas para o painel do indicador: total indicados, convertidos, bônus.
 */
export async function estatisticasIndicador(enderecoIndicador) {
  const enderecoLower = String(enderecoIndicador || "").toLowerCase();
  const codigoReg = await (async () => {
    const s = abrirStore(STORE_CODES);
    if (!s) return null;
    try { return await s.get(`referral-code:${enderecoLower}`, { type: "json" }); }
    catch { return null; }
  })();
  const codigo = codigoReg?.codigo || null;

  let total_indicados = 0;
  let total_convertidos = 0;
  if (codigo) {
    const linksStore = abrirStore(STORE_LINKS);
    if (linksStore) {
      try {
        const resp = await linksStore.list({ prefix: `referral:${codigo}:` });
        total_indicados = (resp?.blobs || []).length;
        const respConv = await linksStore.list({ prefix: `referral-convertido:${codigo}:` });
        total_convertidos = (respConv?.blobs || []).length;
      } catch {}
    }
  }

  let senhas_ganhas = 0;
  const bonusStore = abrirStore(STORE_BONUS);
  if (bonusStore) {
    try {
      const hist = await bonusStore.get(`referral-bonus:${enderecoLower}`, { type: "json" });
      senhas_ganhas = Number(hist?.total || 0);
    } catch {}
  }

  return { codigo, total_indicados, total_convertidos, senhas_ganhas };
}

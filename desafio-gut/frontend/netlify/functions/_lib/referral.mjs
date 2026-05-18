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
    return { ok: false, code: fraude.motivo, message: `indicação rejeitada: ${fraude.motivo}` };
  }
  const indicador = await validarCodigoIndicacao(codigo);
  if (!indicador) return { ok: false, code: "codigo_inexistente", message: "código não encontrado" };

  const linksStore = abrirStore(STORE_LINKS);
  if (!linksStore) return { ok: false, code: "store_indisponivel", message: "Blobs indisponível" };

  // Idempotência: se já registrado, não duplica.
  const chaveLink = `referral:${codigo}:${novoLower}`;
  const ja = await linksStore.get(chaveLink, { type: "json" });
  if (ja) return { ok: true, indicador, idempotent: true };

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
  const linksStore = abrirStore(STORE_LINKS);
  if (!linksStore) return { ok: false, code: "store_indisponivel" };
  const chaveConv = `referral-convertido:${vinculo.codigo}:${vinculo.indicado}`;
  const ja = await linksStore.get(chaveConv, { type: "json" });
  if (ja) return { ok: true, idempotent: true };

  // Concede bônus (limite mensal já validado dentro).
  const bonus = await concederBonus(vinculo.indicador, { ...contexto, codigo: vinculo.codigo, indicado: vinculo.indicado });
  if (!bonus.ok) {
    // Se foi limite mensal, marca como convertido para histórico mas sem bônus.
    if (bonus.code === "limite_mensal_excedido") {
      try {
        await linksStore.setJSON(chaveConv, { em: Date.now(), txHash: null, semBonus: true, motivo: bonus.code });
      } catch {}
    }
    return bonus;
  }

  try {
    await linksStore.setJSON(chaveConv, { em: Date.now(), txHash: bonus.txHash, semBonus: false });
    // Atualiza status do vínculo para "convertido".
    const vinculoKey = `referral:${vinculo.codigo}:${vinculo.indicado}`;
    const vinculoReg = await linksStore.get(vinculoKey, { type: "json" });
    if (vinculoReg) {
      await linksStore.setJSON(vinculoKey, { ...vinculoReg, status: "convertido", convertidoEm: Date.now(), txHashBonus: bonus.txHash });
    }
  } catch (err) {
    console.warn("[referral] marcar convertido falhou (não-fatal):", err?.message);
  }
  return { ok: true, txHash: bonus.txHash };
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

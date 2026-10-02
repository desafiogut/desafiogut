// _lib/edicoes-core.mjs — Lógica de negócio compartilhada para múltiplas edições
// de leilão (MC15.4). Importado por BOTH edicoes.mjs (endpoint HTTP) e
// chatbot.mjs (GUTO), evitando um fetch() interno à própria função (não
// confiável em Lambda — cold starts, URL desconhecida, recursão).
//
// Fonte de verdade: Blob store "edicoes-metadata" (consistency: strong).
//   chave = edicaoId ("PROG-3" | "RELAMP-7" | "R-1" | "ESPECIAL-AIRFRYER")
//   valor = {
//     id, tipo, produto, termino_em (ISO-8601 UTC, server-authoritative),
//     inicio_em? + imagem_url? (MC94.1 — hoje só nas edições ESPECIAL-*),
//     lances (int resumo), status ("aberto"|"encerrado"|"apurado"),
//     criadoEm (ISO), criadoPor (endereco admin | null)
//   }
//
// Contadores sequenciais: chave especial "counters" no MESMO store guarda
//   { PROG: <int>, RELAMP: <int> }. id gerado = `${PREFIX}-${++counter}`.
//
// Compat R-1 (D5): listarEdicoes() SEMPRE injeta R-1. Se não houver metadata
//   para R-1, sintetiza uma edição relâmpago aberta com termino_em = agora +
//   R1_FALLBACK_SEGUNDOS, para que clientes antigos / o fallback do hook nunca
//   fiquem sem edição.
//
// Auditoria (D7): cada criação/encerramento grava Blob "auditoria" key
//   `${timestamp}` = { acao, edicaoId, endereco, em, origem }.

import { getStore } from "@netlify/blobs";
import { gerarResumosPosEdicao } from "./notificacoes-usuario.mjs";
import { estaAgendada } from "./edicao-janela.mjs";
import { vincularProdutoAEdicao, desvincularProduto } from "./pedidos.mjs"; // MC-ECOMMERCE-01a — ligação edição → produto

const STORE_EDICOES   = "edicoes-metadata";
const STORE_AUDITORIA = "auditoria";
const COUNTERS_KEY    = "counters";

export const EDICAO_PADRAO = "R-1";
// Quanto dura a R-1 sintética quando não há metadata persistido para ela.
// É só um fallback de compat; o frontend continua a reconciliar com on-chain.
const R1_FALLBACK_SEGUNDOS = 24 * 60 * 60; // 24h

// Limites de duração aceites na criação (segundos).
const DUR_MIN_SEG = 30;            // 30s
const DUR_MAX_SEG = 90 * 24 * 3600; // 90 dias

// UTAC000.17bc (DEBT-017) — `R-\d+` acrescentado: a R-1 é a edição ACTIVA do cliente e tem de poder
// ser criada/encerrada por código (antes só existia sintetizada). Mantém os formatos anteriores.
export const EDICAO_ID_RE = /^(?:(PROG|RELAMP|R)-\d+|ESPECIAL-[A-Z0-9]+)$/;
// MC94.1 — ESPECIAL-* (id do operador, criado por seed; criarEdicao continua a
// gerar só PROG/RELAMP). A janela temporal vive em ./edicao-janela.mjs.

// ── Helpers de store (fail-soft, mesmo padrão das outras functions) ──────────

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[edicoes-core] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

/** Sanitiza o nome do produto vindo de cliente/GUTO: sem control chars, trim, cap. */
export function sanitizarProduto(input) {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\x00-\x1f\x7f]/g, " ") // remove control chars
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Normaliza tipo livre ("relâmpago"/"relampago"/"flash" → "relampago"). */
export function normalizarTipo(input) {
  const t = String(input || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/relamp|flash/.test(t)) return "relampago";
  if (/program|agend/.test(t)) return "programado";
  return null;
}

function prefixoDoTipo(tipo) {
  return tipo === "programado" ? "PROG" : "RELAMP";
}

// ── Contador sequencial ──────────────────────────────────────────────────────

async function proximoId(store, tipo) {
  const prefix = prefixoDoTipo(tipo);
  let counters = {};
  try {
    counters = (await store.get(COUNTERS_KEY, { type: "json" })) || {};
  } catch { counters = {}; }
  const atual = Number.isInteger(counters[prefix]) ? counters[prefix] : 0;
  const proximo = atual + 1;
  counters[prefix] = proximo;
  await store.setJSON(COUNTERS_KEY, counters);
  return `${prefix}-${proximo}`;
}

// ── Forma pública (resumida) de uma edição para a resposta da API ────────────

function shapeEdicao(meta) {
  return {
    id:         meta.id,
    tipo:       meta.tipo,
    produto:    meta.produto ?? null,
    produtoId:  meta.produtoId ?? null, // MC-ECOMMERCE-01a — produto do catálogo vendido por esta edição
    termino_em: meta.termino_em,
    lances:     Number.isInteger(meta.lances) ? meta.lances : 0,
    status:     meta.status || "aberto",
    // MC15.6 ITEM 3 — params do wizard (aditivo; null quando não informado).
    valorBaseCentavos:  Number.isInteger(meta.valorBaseCentavos) ? meta.valorBaseCentavos : null,
    incrementoCentavos: Number.isInteger(meta.incrementoCentavos) ? meta.incrementoCentavos : null,
    // MC94.1 — aditivos. inicio_em em ISO UTC (o cronómetro do MC94.3 conta até
    // aqui); imagem_url é o nome que o useEdicoes já lê desde o MC45.
    inicio_em:  meta.inicio_em ?? null,
    imagem_url: meta.imagem_url ?? null,
  };
}

/** Edição R-1 sintética (compat D5) quando não há metadata persistido. */
function sintetizarR1() {
  const agora = Date.now();
  return {
    id:         EDICAO_PADRAO,
    tipo:       "relampago",
    produto:    null,
    termino_em: new Date(agora + R1_FALLBACK_SEGUNDOS * 1000).toISOString(),
    lances:     0,
    status:     "aberto",
    // UTAC000.17bc (DEBT-016/GATE 26) — MARCADOR explícito: este prazo é INVENTADO (agora + 24h), não é
    // um prazo real. Sem ele o cliente não conseguia distinguir e abria o overlay num prazo falso.
    sintetizada: true,
  };
}

// ── Auditoria (D7) ───────────────────────────────────────────────────────────

async function gravarAuditoria({ acao, edicaoId, endereco, origem }) {
  const store = abrirStore(STORE_AUDITORIA);
  if (!store) return; // fail-soft: auditoria não deve derrubar a operação
  const em = new Date().toISOString();
  // chave única por evento; sufixo aleatório evita colisão em mesmo ms.
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await store.setJSON(key, {
      acao,
      edicaoId,
      endereco: endereco || null,
      em,
      origem: origem || "endpoint",
    });
  } catch (err) {
    console.warn("[edicoes-core] gravar auditoria falhou (não-fatal):", err?.message);
  }
}

// ── Operações de negócio (reutilizadas por endpoint + GUTO) ──────────────────

/**
 * Lista todas as edições do Blob, sempre incluindo R-1 (real ou sintetizada).
 *
 * MC94.1 — uma edição cujo inicio_em ainda não chegou NÃO entra em `edicoes`
 * (o Dashboard desenha um cartão para cada edição desse mapa): vai para
 * `agendadas`, com status "agendado". O frontend de hoje só lê `edicoes`, logo
 * ela fica invisível até à hora, e passa a `edicoes` sozinha quando o relógio
 * do servidor lá chega, sem cron nem flip manual.
 *
 * @param {number} [agoraMs] relógio do servidor (injectável nos testes)
 * @returns {Promise<{ edicoes: Record<string, object>, agendadas: Record<string, object> }>}
 */
export async function listarEdicoes(agoraMs = Date.now()) {
  const store = abrirStore(STORE_EDICOES);
  const edicoes = {};
  const agendadas = {};

  if (store) {
    try {
      const { blobs } = await store.list();
      for (const b of blobs) {
        if (b.key === COUNTERS_KEY) continue;
        // só aceitamos chaves no formato válido OU a R-1 legada
        if (b.key !== EDICAO_PADRAO && !EDICAO_ID_RE.test(b.key)) continue;
        try {
          const meta = await store.get(b.key, { type: "json" });
          if (!meta || !meta.id) continue;
          if (estaAgendada(meta, agoraMs)) {
            agendadas[b.key] = { ...shapeEdicao(meta), status: "agendado" };
          } else {
            edicoes[b.key] = shapeEdicao(meta);
          }
        } catch { /* ignora chave corrompida */ }
      }
    } catch (err) {
      console.warn("[edicoes-core] list() falhou:", err?.message);
    }
  }

  // Compat R-1 (D5): garante presença mesmo sem metadata persistido.
  if (!edicoes[EDICAO_PADRAO]) {
    edicoes[EDICAO_PADRAO] = sintetizarR1();
  }

  return { edicoes, agendadas };
}

/**
 * Busca a metadata de UMA edição por id. Retorna null se não existir ou se o
 * id não for válido. MC91.11 — usado pelo lance-relampago para derivar o tipo
 * da edição (programado vs relampago) a partir da metadata persistida (não do
 * prefixo do id).
 */
export async function buscarEdicao(id) {
  const store = abrirStore(STORE_EDICOES);
  if (!store) return null;
  const chave = String(id || "");
  if (chave !== EDICAO_PADRAO && !EDICAO_ID_RE.test(chave)) return null;
  try {
    const meta = await store.get(chave, { type: "json" });
    return meta && meta.id ? meta : null;
  } catch {
    return null;
  }
}

/**
 * Cria uma edição. Valida tipo/produto/duração, gera id sequencial validado
 * por regex (D3), calcula termino_em = now + duracao (D2), persiste e audita.
 *
 * @param {object} args
 * @param {string} args.tipo            "programado" | "relampago" (ou livre — normalizado)
 * @param {string} args.produto
 * @param {number} [args.duracaoSegundos]
 * @param {number} [args.duracaoMin]    alternativa a duracaoSegundos
 * @param {string|null} [args.criadoPor] endereco admin
 * @param {"endpoint"|"guto"} [args.origem]
 * @returns {Promise<{ ok: true, edicao: object } | { ok: false, code, message }>}
 */
export async function criarEdicao({ tipo, produto, duracaoSegundos, duracaoMin, criadoPor = null, origem = "endpoint", valorBaseCentavos = null, incrementoCentavos = null, produtoId = null, id: idPedido = null }) {
  const tipoNorm = normalizarTipo(tipo);
  if (!tipoNorm) {
    return { ok: false, code: "tipo_invalido", message: 'tipo deve ser "programado" ou "relampago"' };
  }

  const produtoSan = sanitizarProduto(produto);
  if (!produtoSan) {
    return { ok: false, code: "produto_obrigatorio", message: "produto obrigatório (string não vazia)" };
  }

  // Duração: aceita duracaoSegundos OU duracaoMin (minutos → segundos).
  let dur = null;
  if (duracaoSegundos != null) dur = Number(duracaoSegundos);
  else if (duracaoMin != null) dur = Number(duracaoMin) * 60;
  if (!Number.isFinite(dur) || !Number.isInteger(dur)) {
    return { ok: false, code: "duracao_invalida", message: "informe duracaoSegundos (inteiro) ou duracaoMin" };
  }
  if (dur < DUR_MIN_SEG || dur > DUR_MAX_SEG) {
    return { ok: false, code: "duracao_fora_do_limite", message: `duração deve estar entre ${DUR_MIN_SEG}s e ${DUR_MAX_SEG}s` };
  }

  const store = abrirStore(STORE_EDICOES);
  if (!store) {
    return { ok: false, code: "store_indisponivel", message: "edicoes-metadata indisponível" };
  }

  // UTAC000.17bc (DEBT-017) — id EXPLÍCITO opcional (ex.: `R-1`, a edição activa do cliente).
  // Sem ele mantém-se o id sequencial RELAMP-N/PROG-N (comportamento de sempre, byte a byte igual).
  let id;
  if (idPedido != null && String(idPedido) !== "") {
    id = String(idPedido);
    if (!EDICAO_ID_RE.test(id)) {
      return { ok: false, code: "edicao_id_invalido", message: `id deve casar ${EDICAO_ID_RE}` };
    }
  } else {
    id = await proximoId(store, tipoNorm);
    // Defesa extra: garante que o id gerado bate o regex (D3) antes de virar chave.
    if (!EDICAO_ID_RE.test(id)) {
      return { ok: false, code: "edicao_id_invalido", message: `id gerado inválido: ${id}` };
    }
  }

  // MC-ECOMMERCE-01a — ligação edição → produto do catálogo, decidida AQUI pelo admin.
  // É a única fonte que a ponte apuração → catálogo lê (o `edicaoId` que o lojista
  // escreve no produto não conta). Opcional: sem produtoId, a edição não vende do catálogo.
  let produtoIdOk = null;
  if (produtoId != null && produtoId !== "") {
    if (typeof produtoId !== "string" || !/^[0-9a-f-]{10,64}$/i.test(produtoId)) {
      return { ok: false, code: "produto_id_invalido", message: "produtoId inválido" };
    }
    const v = await vincularProdutoAEdicao(produtoId, id, { buscarEdicao });
    if (!v.ok) return { ok: false, code: v.code, message: v.message };
    produtoIdOk = produtoId;
  }

  const agora = Date.now();
  const meta = {
    id,
    tipo:       tipoNorm,
    produto:    produtoSan,
    produtoId:  produtoIdOk,
    termino_em: new Date(agora + dur * 1000).toISOString(), // D2 — ISO-8601 UTC
    lances:     0,
    status:     "aberto",
    criadoEm:   new Date(agora).toISOString(),
    criadoPor:  criadoPor || null,
    // MC15.6 ITEM 3 — params opcionais do wizard (aditivo; só persiste se inteiro).
    valorBaseCentavos:  Number.isInteger(valorBaseCentavos) ? valorBaseCentavos : null,
    incrementoCentavos: Number.isInteger(incrementoCentavos) ? incrementoCentavos : null,
  };

  try {
    await store.setJSON(id, meta);
  } catch (err) {
    // MC-ECOMMERCE-01a (validador, achado 3E) — a edição não existe: o produto não
    // pode ficar preso a ela. Rollback best-effort (o vínculo órfão também é
    // reconhecido por vincularProdutoAEdicao, que confirma que a edição existe).
    if (produtoIdOk) await desvincularProduto(produtoIdOk, id).catch(() => {});
    return { ok: false, code: "persistencia_falhou", message: err?.message || "falha ao gravar edição" };
  }

  await gravarAuditoria({ acao: "criar", edicaoId: id, endereco: criadoPor, origem });

  return { ok: true, edicao: shapeEdicao(meta) };
}

/**
 * Encerra uma edição (status="encerrado"). Valida o id por regex (D3).
 *
 * @param {object} args
 * @param {string} args.edicaoId
 * @param {string|null} [args.endereco]
 * @param {"endpoint"|"guto"} [args.origem]
 * @returns {Promise<{ ok: true, edicao: object } | { ok: false, code, message }>}
 */
export async function encerrarEdicao({ edicaoId, endereco = null, origem = "endpoint" }) {
  const id = String(edicaoId || "");
  if (!EDICAO_ID_RE.test(id)) {
    return { ok: false, code: "edicao_id_invalido", message: "id deve casar ^(PROG|RELAMP)-\\d+$" };
  }

  const store = abrirStore(STORE_EDICOES);
  if (!store) {
    return { ok: false, code: "store_indisponivel", message: "edicoes-metadata indisponível" };
  }

  let meta;
  try {
    meta = await store.get(id, { type: "json" });
  } catch (err) {
    return { ok: false, code: "leitura_falhou", message: err?.message || "falha ao ler edição" };
  }
  if (!meta || !meta.id) {
    return { ok: false, code: "edicao_inexistente", message: `edição ${id} não encontrada` };
  }

  meta.status = "encerrado";
  meta.encerradoEm = new Date().toISOString();
  try {
    await store.setJSON(id, meta);
  } catch (err) {
    return { ok: false, code: "persistencia_falhou", message: err?.message || "falha ao gravar edição" };
  }

  await gravarAuditoria({ acao: "encerrar", edicaoId: id, endereco, origem });

  // MC15.7 ITEM 2 — resumo pós-edição por participante (fail-soft; nunca quebra
  // o encerramento). Notifica vencedor ("voce_venceu") e demais ("edicao_encerrada").
  try {
    await gerarResumosPosEdicao(id);
  } catch (err) {
    console.warn("[edicoes-core] resumo pós-edição falhou (não-fatal):", err?.message);
  }

  return { ok: true, edicao: shapeEdicao(meta) };
}

// MC17.1 — Ativação AUTOMÁTICA de cota comercial após pagamento (Mercado Pago).
//
// Sem aprovação manual do admin: quando o pagamento é aprovado, o webhook
// (e o fallback confirmar-pagamento) chamam ativarCotaPaga(), que:
//   1) ativa a cota do lojista (cotas:{endereco} vendida=true + categoria);
//   2) credita as SENHAS DE TROCO do excedente (produto < mínimo), 30d/FIFO.
// Idempotente por pedidoId (blob cotas-pagas:{pedidoId}) — webhook e polling
// podem disparar em paralelo sem ativar/creditar duas vezes.

import { getStore } from "@netlify/blobs";
import { creditarTroco, senhasDoExcedente, TROCO_VALIDADE_DIAS } from "./troco-senhas.mjs";

// Valores oficiais (ESPECIFICACAO-TECNICA REQ-04..07; confirmados pelo cliente).
export const COTA_PRECO_CONTRATO_BRL = Object.freeze({ bronze: 2640, prata: 5600, ouro: 11000, diamante: 18000 });
export const MIN_POR_CATEGORIA_BRL   = Object.freeze({ bronze: 660,  prata: 1350, ouro: 2250,  diamante: 4500 });
export const CATEGORIAS = new Set(["bronze", "prata", "ouro", "diamante"]);

const BLOB_COTAS = "cotas", BLOB_INDICE = "cotas-indice", BLOB_PAGAS = "cotas-pagas";

function abrir(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) { console.warn(`[cota-ativacao] Blobs ${name} indisponível:`, err?.message); return null; }
}

async function adicionarAoIndice(categoria, clienteId) {
  const idx = abrir(BLOB_INDICE);
  if (!idx) return;
  try {
    const atual = (await idx.get(categoria, { type: "json" })) || { cliente_ids: [] };
    const set = new Set(atual.cliente_ids || []);
    set.add(clienteId);
    await idx.setJSON(categoria, { categoria, cliente_ids: [...set], atualizadoEm: new Date().toISOString() });
  } catch (err) { console.warn("[cota-ativacao] índice falhou (não-fatal):", err?.message); }
}

/**
 * Ativa a cota paga e credita o troco do excedente. Idempotente por pedidoId.
 * @returns {Promise<{ok:true,idempotent:boolean,resultado:object}|{ok:false,code,message}>}
 */
export async function ativarCotaPaga({ pedidoId, endereco, categoria, produtoValor = null, produtoNome = null, fonte = "webhook" }) {
  const cat = String(categoria || "").toLowerCase();
  if (!CATEGORIAS.has(cat)) return { ok: false, code: "categoria_invalida", message: `categoria inválida: ${categoria}` };
  if (!endereco) return { ok: false, code: "endereco_ausente", message: "endereco obrigatório" };

  const pagas = abrir(BLOB_PAGAS);
  if (pagas) {
    try {
      const j = await pagas.get(pedidoId, { type: "json" });
      if (j?.ativadaEm) return { ok: true, idempotent: true, resultado: j };
    } catch { /* segue e ativa */ }
  }

  const cotasStore = abrir(BLOB_COTAS);
  if (!cotasStore) return { ok: false, code: "store_indisponivel", message: "Netlify Blobs indisponível" };

  const k = String(endereco).toLowerCase();
  const existente = (await cotasStore.get(k, { type: "json" })) || {};
  const agora = new Date().toISOString();
  const valor = Number.isFinite(Number(produtoValor)) ? Number(produtoValor) : (existente.valor ?? null);

  // Mescla: preserva tipo/empresa/cnpj do registo corporativo; ativa a cota.
  const registro = {
    ...existente,
    cliente_id: existente.cliente_id || endereco,
    endereco:   existente.endereco ?? endereco,
    tipo:       existente.tipo || "corporativo",
    categoria:  cat,
    vendida:    true,
    disponivel: false,
    valor,
    produto_nome: produtoNome || existente.produto_nome || null,
    ativadaEm:  agora,
    pedidoId,
    atualizadoEm: agora,
    criadoEm:   existente.criadoEm || agora,
  };
  await cotasStore.setJSON(k, registro);
  await adicionarAoIndice(cat, k);

  // Troco do excedente (produto < mínimo da categoria). Idempotente por pedidoId.
  let troco = null;
  if (valor != null && Number.isFinite(valor) && valor < MIN_POR_CATEGORIA_BRL[cat]) {
    const difCentavos = Math.round((MIN_POR_CATEGORIA_BRL[cat] - valor) * 100);
    const senhas = senhasDoExcedente(difCentavos);
    if (senhas > 0) {
      const r = await creditarTroco({ endereco, senhas, origem: `excedente-${cat}`, idemKey: `cotapaga-${pedidoId}` });
      if (r.ok) troco = { senhas, validadeDias: TROCO_VALIDADE_DIAS, saldoTroco: r.saldoTroco, idempotent: r.idempotent };
    }
  }

  const resultado = { pedidoId, endereco: k, categoria: cat, valor, troco, ativadaEm: agora, fonte };
  if (pagas) { try { await pagas.setJSON(pedidoId, resultado); } catch (err) { console.warn("[cota-ativacao] marcar pago falhou:", err?.message); } }
  return { ok: true, idempotent: false, resultado };
}

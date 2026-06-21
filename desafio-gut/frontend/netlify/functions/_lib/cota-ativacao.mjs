// MC17.1 — Ativação AUTOMÁTICA de cota comercial após pagamento (Mercado Pago).
//
// Sem aprovação manual do admin: quando o pagamento é aprovado, o webhook
// (e o fallback confirmar-pagamento) chamam ativarCotaPaga(), que:
//   1) ativa a cota do lojista (cotas:{endereco} vendida=true + categoria);
//   2) credita as SENHAS DE TROCO do excedente (produto < mínimo), 30d/FIFO.
// Idempotente por pedidoId (blob cotas-pagas:{pedidoId}) — webhook e polling
// podem disparar em paralelo sem ativar/creditar duas vezes.

import { getCota, upsertCota, getCotaPaga, setCotaPaga } from "./cotas-store.mjs";
import { lerCotaLegado } from "./cotas-fallback.mjs";
import { creditarTroco, senhasDoExcedente, TROCO_VALIDADE_DIAS } from "./troco-senhas.mjs";

// Valores oficiais (ESPECIFICACAO-TECNICA REQ-04..07; confirmados pelo cliente).
export const COTA_PRECO_CONTRATO_BRL = Object.freeze({ bronze: 2640, prata: 5600, ouro: 11000, diamante: 18000 });
export const MIN_POR_CATEGORIA_BRL   = Object.freeze({ bronze: 660,  prata: 1350, ouro: 2250,  diamante: 4500 });
export const CATEGORIAS = new Set(["bronze", "prata", "ouro", "diamante"]);

// MC37 — dados de cota agora em Supabase (cotas-store). O índice por categoria
// deixou de existir (categoria é coluna → query). troco-senhas mantém-se em Blobs (MC36.1).

/**
 * Ativa a cota paga e credita o troco do excedente. Idempotente por pedidoId.
 * @returns {Promise<{ok:true,idempotent:boolean,resultado:object}|{ok:false,code,message}>}
 */
export async function ativarCotaPaga({ pedidoId, endereco, categoria, produtoValor = null, produtoNome = null, fonte = "webhook" }) {
  const cat = String(categoria || "").toLowerCase();
  if (!CATEGORIAS.has(cat)) return { ok: false, code: "categoria_invalida", message: `categoria inválida: ${categoria}` };
  if (!endereco) return { ok: false, code: "endereco_ausente", message: "endereco obrigatório" };

  // Idempotência de ativação (cotas_pagas no Supabase).
  const jaPago = await getCotaPaga(pedidoId);
  if (jaPago?.ativadaEm) return { ok: true, idempotent: true, resultado: jaPago };

  const k = String(endereco).toLowerCase();
  // MC37 — lê Supabase; fallback de leitura para o Blob legado durante a transição.
  const existente = (await getCota(k)) ?? (await lerCotaLegado(k)) ?? {};
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
  await upsertCota(k, registro); // escrita só Supabase (R11); categoria é coluna (sem índice store)

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
  try { await setCotaPaga(pedidoId, resultado); } catch (err) { console.warn("[cota-ativacao] marcar pago falhou:", err?.message); }
  return { ok: true, idempotent: false, resultado };
}

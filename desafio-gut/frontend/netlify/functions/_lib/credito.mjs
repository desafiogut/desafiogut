// Crédito on-chain idempotente compartilhado por confirmar-pagamento e
// webhook-mercadopago. Garante que cada pedidoId só credita uma vez,
// independente de qual caminho disparar primeiro.
//
// Idempotência: blob `pedidos-pagos:${pedidoId}` é a fonte de verdade do
// crédito on-chain. Antes de chamar `creditarSenhas`, lê o blob; se já existe
// `txHash`, retorna o registro existente. Após sucesso, persiste o resultado.
//
// Race condition residual: duas execuções simultâneas (webhook + "Já paguei")
// podem ler o blob vazio antes da primeira gravar e ambas chamarem o contrato.
// O contrato em si não impede dupla creditação, então cobrimos isso com:
//   1) Webhook persiste no blob `mp-aprovados` antes de creditar — confirmar
//      lê esse blob como caminho rápido, evitando refazer creditação se o
//      webhook já está em andamento.
//   2) `pedidos-pagos` usa `consistency: "strong"` — Netlify Blobs garante
//      leitura imediata após gravação no mesmo data center.
// O risco residual é aceitável dado o volume esperado e fica documentado em
// CLAUDE_DEBUG.md (frente B.7).

import { getStore } from "@netlify/blobs";
import {
  creditarSenhas,
  lerSaldoSenhas,
  getCoordenacaoAddress,
  CONTRATO_ADDRESS,
} from "./contract.mjs";

const BLOB_PEDIDOS_PAGOS = "pedidos-pagos";
const BLOB_PEDIDOS_META  = "pedidos-meta";

function abrirStore(name) {
  try {
    return getStore({ name, consistency: "strong" });
  } catch (err) {
    console.warn(`[credito] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

/**
 * Persiste metadados do pedido no momento da criação. O webhook usa esses
 * metadados para descobrir endereco/qtd a creditar — o MP só nos devolve o
 * `external_reference` (= pedidoId), não o destino on-chain.
 */
export async function gravarMetaPedido({ pedidoId, endereco, qtd, valorBRL, paymentId }) {
  const store = abrirStore(BLOB_PEDIDOS_META);
  if (!store) return false;
  try {
    await store.setJSON(pedidoId, {
      endereco,
      qtd,
      valorBRL,
      paymentId: paymentId ? String(paymentId) : null,
      criadoEm: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn("[credito] gravarMetaPedido falhou (não-fatal):", err?.message);
    return false;
  }
}

export async function lerMetaPedido(pedidoId) {
  const store = abrirStore(BLOB_PEDIDOS_META);
  if (!store) return null;
  try {
    return await store.get(pedidoId, { type: "json" });
  } catch (err) {
    console.warn("[credito] lerMetaPedido falhou (não-fatal):", err?.message);
    return null;
  }
}

/**
 * Credita senhas on-chain de forma idempotente.
 *
 * @param {{ pedidoId: string, endereco: string, qtd: number, fonte?: string }} args
 *   `fonte` é só para logging ("confirmar-pagamento" | "webhook").
 *
 * @returns {Promise<{ ok: true, idempotent: boolean, resultado: object }
 *                  | { ok: false, code: string, message: string }>}
 *   Não lança — sempre devolve um objeto. O caller decide HTTP status.
 */
export async function creditarPedidoIdempotente({ pedidoId, endereco, qtd, fonte = "desconhecido" }) {
  const store = abrirStore(BLOB_PEDIDOS_PAGOS);

  // ── Idempotência: já creditado? ─────────────────────────────────────────
  if (store) {
    try {
      const existente = await store.get(pedidoId, { type: "json" });
      if (existente?.txHash) {
        return { ok: true, idempotent: true, resultado: existente };
      }
    } catch (err) {
      console.warn(`[credito:${fonte}] leitura pedidos-pagos falhou:`, err?.message);
    }
  }

  // ── Crédito on-chain ────────────────────────────────────────────────────
  let resultado;
  try {
    const saldoAntes = await lerSaldoSenhas(endereco);
    const { txHash, blockNumber, gasUsed } = await creditarSenhas(endereco, qtd);
    const saldoDepois = await lerSaldoSenhas(endereco);
    resultado = {
      pedidoId,
      endereco,
      qtd,
      txHash,
      blockNumber,
      gasUsed: gasUsed?.toString?.(),
      saldoAntes,
      saldoDepois,
      contrato: CONTRATO_ADDRESS,
      coordenacao: getCoordenacaoAddress(),
      etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
      processadoEm: new Date().toISOString(),
      fonte,
    };
  } catch (err) {
    console.error(`[credito:${fonte}] erro on-chain:`, {
      pedidoId, endereco, qtd,
      message: err?.message, code: err?.code, shortMessage: err?.shortMessage,
    });
    return {
      ok: false,
      code: "credito_falhou",
      message: err?.shortMessage || err?.message || "erro inesperado on-chain",
    };
  }

  // ── Persistência ────────────────────────────────────────────────────────
  if (store) {
    try {
      await store.setJSON(pedidoId, resultado);
    } catch (err) {
      console.warn(`[credito:${fonte}] persistência pedidos-pagos falhou:`, err?.message);
    }
  }

  return { ok: true, idempotent: false, resultado };
}

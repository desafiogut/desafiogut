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

// MC88.16 (P1) — `contract.mjs` (e portanto o ethers) passou a ser carregado
// SOB DEMANDA, dentro de creditarPedidoIdempotente. Em import estático, o ethers
// era avaliado no cold start de tudo o que tocasse este módulo — incluindo
// `iniciar-pagamento`, que só gravava metadados e nunca vai à blockchain
// (2062 ms de arranque, medidos no MC88.15).
//
// Os helpers de metadados mudaram para `_lib/meta.mjs`, que não conhece o ethers, e
// são re-exportados aqui para não partir nenhum import existente. Há uma única
// implementação — isto é re-export, não cópia.
export {
  gravarMetaPedido,
  lerMetaPedido,
  lerCreditoPedido,
  BLOB_PEDIDOS_PAGOS,
  BLOB_PEDIDOS_META,
} from "./meta.mjs";

import { abrirStore, BLOB_PEDIDOS_PAGOS as STORE_PAGOS } from "./meta.mjs";
// MC87 (P3-1) — carteira mascarada nos logs.
import { mascararEndereco } from "./validate.mjs";

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
  console.info(`[credito:${fonte}] início`, { pedidoId, endereco: mascararEndereco(endereco), qtd });
  const store = abrirStore(STORE_PAGOS);

  // ── Idempotência: já creditado? ─────────────────────────────────────────
  if (store) {
    try {
      const existente = await store.get(pedidoId, { type: "json" });
      if (existente?.txHash) {
        console.info(`[credito:${fonte}] idempotent — pedido já creditado`, { pedidoId, txHash: existente.txHash });
        return { ok: true, idempotent: true, resultado: existente };
      }
    } catch (err) {
      console.warn(`[credito:${fonte}] leitura pedidos-pagos falhou:`, err?.message);
    }
  } else {
    console.warn(`[credito:${fonte}] pedidos-pagos store indisponível — sem idempotência`);
  }

  // ── Crédito on-chain ────────────────────────────────────────────────────
  let resultado;
  try {
    // MC88.16 (P1) — import DINÂMICO: é aqui, e só aqui, que o ethers é preciso.
    // Em import estático no topo, todo o cold start que tocasse este módulo pagava
    // a avaliação do ethers, mesmo sem nunca chegar a esta linha.
    const {
      creditarSenhas,
      lerSaldoSenhas,
      getCoordenacaoAddress,
      CONTRATO_ADDRESS,
    } = await import("./contract.mjs");

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
      console.info(`[credito:${fonte}] persistido em pedidos-pagos`, { pedidoId });
    } catch (err) {
      console.warn(`[credito:${fonte}] persistência pedidos-pagos falhou:`, err?.message);
    }
  }

  console.info(`[credito:${fonte}] crédito concluído`, {
    pedidoId, endereco, qtd, txHash: resultado.txHash,
    saldoAntes: resultado.saldoAntes, saldoDepois: resultado.saldoDepois,
  });
  return { ok: true, idempotent: false, resultado };
}

// _lib/meta.mjs — MC88.16 (P1): metadados de pedido em Netlify Blobs, SEM ethers.
//
// PORQUÊ ESTE MÓDULO EXISTE: estas três funções viviam em `_lib/credito.mjs`, que
// importa estaticamente `_lib/contract.mjs`, que importa **ethers**. Como os imports
// ESM são hoisted e avaliados de forma eager, `iniciar-pagamento` — que só precisa de
// gravar metadados e NUNCA toca na blockchain — pagava o carregamento do ethers em
// cada cold start. Medido no MC88.15: `Duration: 2062 ms` de arranque, contra ~70 ms
// no caminho quente.
//
// A separação é o que resolve, não um `await import()`: com `iniciar-pagamento` a não
// referenciar `contract.mjs` em parte alguma, o bundler consegue deixar o ethers
// inteiramente fora do bundle desta function.
//
// REGRA: nada aqui pode importar `contract.mjs`, `signer.mjs` ou `ethers`. Se for
// preciso saldo/tx on-chain, isso pertence a credito.mjs ou saldoRs.mjs.

import { getStore } from "@netlify/blobs";
// MC87 (P3-1) — carteira mascarada nos logs.
import { mascararEndereco } from "./validate.mjs";

export const BLOB_PEDIDOS_PAGOS = "pedidos-pagos";
export const BLOB_PEDIDOS_META  = "pedidos-meta";

export function abrirStore(name) {
  try {
    return getStore({ name, consistency: "strong" });
  } catch (err) {
    console.warn(`[meta] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

/**
 * Persiste metadados do pedido no momento da criação. O webhook usa esses
 * metadados para descobrir endereco/qtd a creditar — o MP só nos devolve o
 * `external_reference` (= pedidoId), não o destino on-chain.
 */
export async function gravarMetaPedido({ pedidoId, endereco, qtd, valorBRL, paymentId, tipo = null, categoria = null, produtoValor = null, produtoNome = null }) {
  const store = abrirStore(BLOB_PEDIDOS_META);
  if (!store) {
    console.warn("[meta] gravarMetaPedido: store indisponível", { pedidoId });
    return false;
  }
  try {
    await store.setJSON(pedidoId, {
      endereco,
      qtd,
      valorBRL,
      paymentId: paymentId ? String(paymentId) : null,
      // MC17.1 — pedidos de cota carregam tipo/categoria/produto para ativação automática.
      tipo,
      categoria,
      produtoValor,
      produtoNome,
      criadoEm: new Date().toISOString(),
    });
    console.info("[meta] meta gravada", { pedidoId, endereco: mascararEndereco(endereco), qtd, paymentId: paymentId ? String(paymentId) : null });
    return true;
  } catch (err) {
    console.error("[meta] gravarMetaPedido falhou:", { pedidoId, name: err?.name, message: err?.message });
    return false;
  }
}

export async function lerMetaPedido(pedidoId) {
  const store = abrirStore(BLOB_PEDIDOS_META);
  if (!store) {
    console.warn("[meta] lerMetaPedido: store indisponível", { pedidoId });
    return null;
  }
  try {
    const meta = await store.get(pedidoId, { type: "json" });
    console.info("[meta] lerMetaPedido", { pedidoId, encontrado: !!meta, hasEndereco: !!meta?.endereco, hasQtd: !!meta?.qtd });
    return meta;
  } catch (err) {
    console.error("[meta] lerMetaPedido falhou:", { pedidoId, name: err?.name, message: err?.message });
    return null;
  }
}

/** Lê o registro de crédito (pedidos-pagos) — usado por endpoints de debug. */
export async function lerCreditoPedido(pedidoId) {
  const store = abrirStore(BLOB_PEDIDOS_PAGOS);
  if (!store) return null;
  try {
    return await store.get(pedidoId, { type: "json" });
  } catch (err) {
    console.warn("[meta] lerCreditoPedido falhou:", err?.message);
    return null;
  }
}

// _lib/worker-credito.mjs — MC59.5 (ADR: confirmação assíncrona).
//
// Handler da fila (MC39.20) para o tipo "confirmar-credito-senhas". A tx
// adicionarSenhas JÁ foi submetida por comprar-senhas (via submeterCredito); este
// worker apenas CONFIRMA o receipt em background — resolvendo o timeout do wait
// síncrono na mainnet — e decide:
//   • confirmado (status 1) → nada (as senhas já estão on-chain).
//   • revertido  (status 0) → reembolsa R$ (idempotente por pedidoId).
//   • pendente   (sem receipt) → lança → a fila re-enfileira com backoff; ao
//     esgotar tentativas vai p/ DLQ → reconciliação manual (runbook-credito-pendente.md).
//
// NÃO credita senhas de novo (a submissão on-chain já ocorreu) → sem double-credit.

import { confirmarReceiptOnchain } from "./contract.mjs";
import { reembolsarSaldoRs } from "./saldoRs.mjs";
import { getDebito, setDebito } from "./saldoRs-store.mjs";
import { captureSecurityAlert } from "./sentry-server.mjs";
// MC87 (P3-1) — carteira mascarada nos logs.
import { mascararEndereco } from "./validate.mjs";

export async function confirmarCreditoSenhas(payload) {
  const { pedidoId, endereco, qtd, valorCentavos, txHash } = payload || {};
  if (!txHash) throw new Error("[worker-credito] payload sem txHash");

  // Idempotência da reconciliação por pedidoId — evita DOUBLE-REFUND se a tarefa
  // for reprocessada (ex.: gravação de 'done' da fila falhou após o handler).
  const marcador = pedidoId ? `reconciliacao:${pedidoId}` : null;
  if (marcador && (await getDebito(marcador))) {
    console.info("[worker-credito] já reconciliado — no-op", { pedidoId, txHash });
    return;
  }

  const { estado } = await confirmarReceiptOnchain(txHash);

  if (estado === "confirmado") {
    console.info("[worker-credito] confirmado (senhas on-chain)", { pedidoId, endereco: mascararEndereco(endereco), qtd, txHash });
    return;
  }

  if (estado === "revertido") {
    // A tx reverteu → as senhas NÃO foram creditadas → devolve o R$ debitado.
    // CLAIM ANTES do reembolso (idempotência forte): grava o marcador primeiro, de
    // modo que um reprocesso NUNCA reembolse duas vezes (mesmo que o processo morra
    // após o reembolso). Se o reembolso falhar, o alerta (level=error) encaminha
    // para reconciliação manual (runbook-credito-pendente.md) — não auto-retenta
    // (evita double-refund por retry de um reembolso não-idempotente).
    if (marcador) await setDebito(marcador, { txHash, estado, reembolsado: null, em: new Date().toISOString() });
    let reembolso = { ok: true };
    if (Number(valorCentavos) > 0) {
      reembolso = await reembolsarSaldoRs({ endereco, valorCentavos, motivo: "credito-assincrono-revertido" });
      if (!reembolso.ok) {
        captureSecurityAlert("worker_credito_reembolso_falhou",
          { pedidoId, endereco, valorCentavos, txHash, code: reembolso.code }, "error").catch(() => {});
      }
    }
    console.warn("[worker-credito] revertido → reembolso", { pedidoId, endereco: mascararEndereco(endereco), txHash, reembolsado: reembolso.ok });
    return;
  }

  // pendente → ainda não minerou. Lança para a fila re-enfileirar (backoff).
  const e = new Error(`[worker-credito] tx ${txHash} ainda pendente — re-enfileirar`);
  e.code = "TX_PENDENTE";
  throw e;
}

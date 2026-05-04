// Saldo R$ off-chain — modelo dual (Frente B.9):
//   PIX aprovado          →  +R$ no blob `saldo-rs:${endereco}`
//   Comprar senhas        →  -R$ no blob, +senhas on-chain
//   Lance Relâmpago       →  -centavos do R$
//   "Saldo de Senhas"     →  permanece on-chain (saldoSenhas[address])
//
// Princípios:
// - Saldo armazenado em CENTAVOS (inteiro) para evitar erros de ponto flutuante.
//   Conversões R$ ↔ centavos só nas bordas (input/output).
// - Idempotência por pedidoId via blob `saldo-rs-creditos:${pedidoId}` para PIX.
//   Replays do webhook + confirmar-pagamento simultâneos retornam idempotent.
// - Débito é checked-then-set; race window residual aceita (mesmo padrão do
//   `pedidos-pagos`). Volume baixo torna o risco prático irrelevante.

import { getStore } from "@netlify/blobs";

const BLOB_SALDO         = "saldo-rs";
const BLOB_SALDO_CREDITOS = "saldo-rs-creditos";   // idempotência por pedidoId
const BLOB_SALDO_DEBITOS  = "saldo-rs-debitos";    // idempotência por operacaoId (opcional)

function abrir(name) {
  try {
    return getStore({ name, consistency: "strong" });
  } catch (err) {
    console.warn(`[saldoRs] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

function chave(endereco) {
  return endereco.toLowerCase();
}

/** Lê saldo em centavos. Retorna 0 se ausente. */
export async function lerSaldoRsCentavos(endereco) {
  const store = abrir(BLOB_SALDO);
  if (!store) return 0;
  try {
    const v = await store.get(chave(endereco), { type: "json" });
    return Number(v?.centavos ?? 0);
  } catch (err) {
    console.warn("[saldoRs] lerSaldoRsCentavos falhou:", err?.message);
    return 0;
  }
}

async function gravarSaldoRsCentavos(endereco, centavos) {
  const store = abrir(BLOB_SALDO);
  if (!store) {
    throw new Error("saldo-rs blob indisponível");
  }
  await store.setJSON(chave(endereco), {
    centavos: Math.max(0, Math.floor(centavos)),
    atualizadoEm: new Date().toISOString(),
  });
}

/**
 * Credita R$ associado a um pedidoId (PIX aprovado).
 * Idempotente: replays com mesmo pedidoId não duplicam crédito.
 *
 * @returns { ok, idempotent, resultado: { pedidoId, endereco, valorCentavos, saldoAntesCentavos, saldoDepoisCentavos, processadoEm, fonte } }
 */
export async function creditarSaldoRsIdempotente({ pedidoId, endereco, valorCentavos, fonte = "desconhecido" }) {
  if (!pedidoId || !endereco || !valorCentavos) {
    return { ok: false, code: "params_invalidos", message: "pedidoId, endereco, valorCentavos obrigatórios" };
  }
  const ender = chave(endereco);
  const valor = Math.floor(Number(valorCentavos));
  if (!(valor > 0)) {
    return { ok: false, code: "valor_invalido", message: "valorCentavos deve ser > 0" };
  }
  console.info(`[saldoRs:${fonte}] credito início`, { pedidoId, endereco: ender, valorCentavos: valor });

  const idem = abrir(BLOB_SALDO_CREDITOS);

  // Idempotência: se este pedidoId já foi creditado, retorna o registro.
  if (idem) {
    try {
      const existente = await idem.get(pedidoId, { type: "json" });
      if (existente?.processado) {
        console.info(`[saldoRs:${fonte}] idempotent — pedido já creditado em R$`, { pedidoId });
        return { ok: true, idempotent: true, resultado: existente };
      }
    } catch (err) {
      console.warn(`[saldoRs:${fonte}] leitura saldo-rs-creditos falhou:`, err?.message);
    }
  } else {
    console.warn(`[saldoRs:${fonte}] saldo-rs-creditos indisponível — sem idempotência`);
  }

  // Lê saldo atual e credita.
  let saldoAntes;
  try {
    saldoAntes = await lerSaldoRsCentavos(ender);
  } catch (err) {
    return { ok: false, code: "leitura_saldo_falhou", message: err?.message };
  }
  const saldoDepois = saldoAntes + valor;
  try {
    await gravarSaldoRsCentavos(ender, saldoDepois);
  } catch (err) {
    console.error(`[saldoRs:${fonte}] gravar saldo falhou:`, err?.message);
    return { ok: false, code: "gravar_saldo_falhou", message: err?.message };
  }

  const resultado = {
    pedidoId,
    endereco: ender,
    valorCentavos: valor,
    saldoAntesCentavos:  saldoAntes,
    saldoDepoisCentavos: saldoDepois,
    processado: true,
    processadoEm: new Date().toISOString(),
    fonte,
  };

  if (idem) {
    try { await idem.setJSON(pedidoId, resultado); }
    catch (err) { console.warn(`[saldoRs:${fonte}] persistir saldo-rs-creditos falhou:`, err?.message); }
  }
  console.info(`[saldoRs:${fonte}] credito concluído`, {
    pedidoId, endereco: ender, valorCentavos: valor,
    saldoAntes, saldoDepois,
  });
  return { ok: true, idempotent: false, resultado };
}

/**
 * Debita R$. Lança se insuficiente. Não é idempotente por padrão — o caller
 * deve garantir uma execução por operação (ex: usar UUID em comprar-senhas
 * dentro de um fluxo que evita double-click).
 *
 * @returns { ok, resultado: { saldoAntesCentavos, saldoDepoisCentavos, valorCentavos } }
 *        | { ok: false, code, message }
 */
export async function debitarSaldoRs({ endereco, valorCentavos, motivo = "desconhecido" }) {
  if (!endereco || !valorCentavos) {
    return { ok: false, code: "params_invalidos", message: "endereco e valorCentavos obrigatórios" };
  }
  const ender = chave(endereco);
  const valor = Math.floor(Number(valorCentavos));
  if (!(valor > 0)) {
    return { ok: false, code: "valor_invalido", message: "valorCentavos deve ser > 0" };
  }
  console.info(`[saldoRs:debito:${motivo}] início`, { endereco: ender, valorCentavos: valor });

  const saldoAntes = await lerSaldoRsCentavos(ender);
  if (saldoAntes < valor) {
    console.warn(`[saldoRs:debito:${motivo}] saldo insuficiente`, { endereco: ender, saldoAntes, valor });
    return { ok: false, code: "saldo_insuficiente", message: `saldo R$ ${(saldoAntes/100).toFixed(2)} < valor R$ ${(valor/100).toFixed(2)}` };
  }
  const saldoDepois = saldoAntes - valor;
  try {
    await gravarSaldoRsCentavos(ender, saldoDepois);
  } catch (err) {
    return { ok: false, code: "gravar_saldo_falhou", message: err?.message };
  }
  console.info(`[saldoRs:debito:${motivo}] concluído`, {
    endereco: ender, saldoAntes, saldoDepois, valorCentavos: valor,
  });
  return { ok: true, resultado: { saldoAntesCentavos: saldoAntes, saldoDepoisCentavos: saldoDepois, valorCentavos: valor } };
}

/** Devolve R$ ao saldo (compensação após falha em fluxo combinado). */
export async function reembolsarSaldoRs({ endereco, valorCentavos, motivo = "reembolso" }) {
  const ender = chave(endereco);
  const valor = Math.floor(Number(valorCentavos));
  if (!(valor > 0)) return { ok: false, code: "valor_invalido" };
  const saldoAntes  = await lerSaldoRsCentavos(ender);
  const saldoDepois = saldoAntes + valor;
  try {
    await gravarSaldoRsCentavos(ender, saldoDepois);
    console.info(`[saldoRs:reembolso:${motivo}]`, { endereco: ender, saldoAntes, saldoDepois });
    return { ok: true, resultado: { saldoAntesCentavos: saldoAntes, saldoDepoisCentavos: saldoDepois } };
  } catch (err) {
    console.error(`[saldoRs:reembolso:${motivo}] gravar falhou:`, err?.message);
    return { ok: false, code: "gravar_saldo_falhou", message: err?.message };
  }
}

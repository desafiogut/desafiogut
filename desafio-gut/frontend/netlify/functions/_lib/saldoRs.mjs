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
// - MC39.17.2 (B-P1-3): o débito é ATÔMICO via Compare-And-Swap (casSaldo) — a
//   condição roda no Postgres, fechando a janela TOCTOU/double-spend concorrente.

// MC36.1 — saldo R$ em Supabase (saldoRs-store). Escrita só Supabase (R11);
// leitura com fallback para o Blob legado durante a transição (financeiro-fallback).
import { getSaldo, setSaldo, casSaldo, getCredito, setCredito, inserirSaldoSeAusente } from "./saldoRs-store.mjs";
import { lerSaldoLegado, lerCreditoLegado } from "./financeiro-fallback.mjs";

function chave(endereco) {
  return endereco.toLowerCase();
}

/** Lê saldo em centavos. Retorna 0 se ausente. */
export async function lerSaldoRsCentavos(endereco) {
  try {
    const k = chave(endereco);
    const v = (await getSaldo(k)) ?? (await lerSaldoLegado(k)); // MC36.1 Supabase + fallback Blob
    return Number(v?.centavos ?? 0);
  } catch (err) {
    console.warn("[saldoRs] lerSaldoRsCentavos falhou:", err?.message);
    return 0;
  }
}

/**
 * MC59.2 (C-1) — Ajuste ATÓMICO do saldo por um delta (crédito/reembolso).
 * Espelha o CAS do débito (debitarSaldoRs): lê o saldo, garante a linha e só
 * grava se o saldo no banco ainda for o valor lido (casSaldo). Fecha a janela
 * TOCTOU do read-modify-write → um crédito/reembolso concorrente com um débito
 * (ou entre si) já não pode "clobberar" o resultado do outro (lost update).
 * O saldo nunca fica < 0.
 *
 * @returns { ok:true, saldoAntes, saldoDepois } | { ok:false, code, message }
 */
async function ajustarSaldoRsAtomico(ender, deltaCentavos, motivo = "ajuste") {
  const delta = Math.floor(Number(deltaCentavos));
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_DEBITO; tentativa++) {
    let saldoAntes;
    try {
      saldoAntes = await lerSaldoRsCentavos(ender);
    } catch (err) {
      return { ok: false, code: "leitura_saldo_falhou", message: err?.message };
    }
    const saldoDepois = Math.max(0, saldoAntes + delta);
    const novoPayload = { centavos: saldoDepois, atualizadoEm: new Date().toISOString() };

    // Garante que a linha existe no Supabase para o CAS ter alvo de UPDATE
    // (durante a transição MC36.1 o saldo pode existir só no Blob legado).
    try {
      // MC59.3 (follow-up C-1) — bootstrap ATÓMICO: INSERT..DO NOTHING não
      // sobrescreve uma linha criada concorrentemente entre a leitura e a escrita.
      if ((await getSaldo(ender)) == null) {
        await inserirSaldoSeAusente(ender, { centavos: saldoAntes, atualizadoEm: new Date().toISOString() });
      }
    } catch (err) {
      return { ok: false, code: "gravar_saldo_falhou", message: err?.message };
    }

    let trocou;
    try {
      trocou = await casSaldo(ender, saldoAntes, novoPayload);
    } catch (err) {
      return { ok: false, code: "gravar_saldo_falhou", message: err?.message };
    }
    if (trocou) return { ok: true, saldoAntes, saldoDepois };
    // CAS perdeu: outro ajuste alterou o saldo entre a leitura e a escrita → relê.
    console.warn(`[saldoRs:${motivo}] CAS perdeu (tentativa ${tentativa}/${MAX_TENTATIVAS_DEBITO}) — relendo saldo`, { endereco: ender });
  }
  return { ok: false, code: "conflito_concorrencia", message: "ajuste não aplicado após múltiplas tentativas (concorrência alta)" };
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

  // Idempotência: se este pedidoId já foi creditado, retorna o registro.
  // MC36.1 — Supabase (saldo_rs_creditos) + fallback de leitura Blob legado.
  try {
    const existente = (await getCredito(pedidoId)) ?? (await lerCreditoLegado(pedidoId));
    if (existente?.processado) {
      console.info(`[saldoRs:${fonte}] idempotent — pedido já creditado em R$`, { pedidoId });
      return { ok: true, idempotent: true, resultado: existente };
    }
  } catch (err) {
    console.warn(`[saldoRs:${fonte}] leitura saldo-rs-creditos falhou:`, err?.message);
  }

  // MC59.2 (C-1) — crédito ATÓMICO via CAS (não read-modify-write). Fecha o
  // lost-update quando um débito concorrente altera o saldo no mesmo endereço.
  const ajuste = await ajustarSaldoRsAtomico(ender, valor, `credito:${fonte}`);
  if (!ajuste.ok) {
    console.error(`[saldoRs:${fonte}] crédito atómico falhou:`, ajuste.code);
    return { ok: false, code: ajuste.code, message: ajuste.message };
  }
  const saldoAntes  = ajuste.saldoAntes;
  const saldoDepois = ajuste.saldoDepois;

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

  try { await setCredito(pedidoId, resultado); } // MC36.1 — escrita só Supabase (R11)
  catch (err) { console.warn(`[saldoRs:${fonte}] persistir saldo-rs-creditos falhou:`, err?.message); }
  console.info(`[saldoRs:${fonte}] credito concluído`, {
    pedidoId, endereco: ender, valorCentavos: valor,
    saldoAntes, saldoDepois,
  });
  return { ok: true, idempotent: false, resultado };
}

/**
 * Debita R$ de forma ATÔMICA (B-P1-3). Usa Compare-And-Swap (casSaldo): lê o
 * saldo, e só grava `saldo-valor` se o saldo no banco ainda for o valor lido —
 * a verificação roda no Postgres, então dois débitos concorrentes não podem
 * ambos "ver" o mesmo saldo e debitar duas vezes (double-spend). Em conflito de
 * concorrência, relê e repete (até MAX_TENTATIVAS).
 *
 * @returns { ok, resultado: { saldoAntesCentavos, saldoDepoisCentavos, valorCentavos } }
 *        | { ok: false, code, message }   // code ∈ saldo_insuficiente | conflito_concorrencia | ...
 */
const MAX_TENTATIVAS_DEBITO = 5;

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

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_DEBITO; tentativa++) {
    let saldoAntes;
    try {
      saldoAntes = await lerSaldoRsCentavos(ender);
    } catch (err) {
      return { ok: false, code: "leitura_saldo_falhou", message: err?.message };
    }
    if (saldoAntes < valor) {
      console.warn(`[saldoRs:debito:${motivo}] saldo insuficiente`, { endereco: ender, saldoAntes, valor });
      return { ok: false, code: "saldo_insuficiente", message: `saldo R$ ${(saldoAntes/100).toFixed(2)} < valor R$ ${(valor/100).toFixed(2)}` };
    }
    const saldoDepois = saldoAntes - valor;
    const novoPayload = { centavos: saldoDepois, atualizadoEm: new Date().toISOString() };

    // Garante que a linha existe no Supabase para o CAS ter alvo de UPDATE
    // (durante a transição MC36.1 o saldo pode existir só no Blob legado).
    try {
      // MC59.3 (follow-up C-1) — bootstrap ATÓMICO: INSERT..DO NOTHING não
      // sobrescreve uma linha criada concorrentemente entre a leitura e a escrita.
      if ((await getSaldo(ender)) == null) {
        await inserirSaldoSeAusente(ender, { centavos: saldoAntes, atualizadoEm: new Date().toISOString() });
      }
    } catch (err) {
      return { ok: false, code: "gravar_saldo_falhou", message: err?.message };
    }

    let trocou;
    try {
      trocou = await casSaldo(ender, saldoAntes, novoPayload);
    } catch (err) {
      return { ok: false, code: "gravar_saldo_falhou", message: err?.message };
    }

    if (trocou) {
      console.info(`[saldoRs:debito:${motivo}] concluído`, {
        endereco: ender, saldoAntes, saldoDepois, valorCentavos: valor, tentativa,
      });
      return { ok: true, resultado: { saldoAntesCentavos: saldoAntes, saldoDepoisCentavos: saldoDepois, valorCentavos: valor } };
    }
    // CAS perdeu: outro débito alterou o saldo entre a leitura e a escrita.
    console.warn(`[saldoRs:debito:${motivo}] CAS perdeu (tentativa ${tentativa}/${MAX_TENTATIVAS_DEBITO}) — relendo saldo`, { endereco: ender });
  }

  console.error(`[saldoRs:debito:${motivo}] conflito de concorrência após ${MAX_TENTATIVAS_DEBITO} tentativas`, { endereco: ender, valor });
  return { ok: false, code: "conflito_concorrencia", message: "débito não aplicado após múltiplas tentativas (concorrência alta)" };
}

/** Devolve R$ ao saldo (compensação após falha em fluxo combinado). */
export async function reembolsarSaldoRs({ endereco, valorCentavos, motivo = "reembolso" }) {
  const ender = chave(endereco);
  const valor = Math.floor(Number(valorCentavos));
  if (!(valor > 0)) return { ok: false, code: "valor_invalido" };
  // MC59.2 (C-1) — reembolso ATÓMICO via CAS (não read-modify-write).
  const ajuste = await ajustarSaldoRsAtomico(ender, valor, `reembolso:${motivo}`);
  if (!ajuste.ok) {
    console.error(`[saldoRs:reembolso:${motivo}] ajuste atómico falhou:`, ajuste.code);
    return { ok: false, code: ajuste.code, message: ajuste.message };
  }
  console.info(`[saldoRs:reembolso:${motivo}]`, { endereco: ender, saldoAntes: ajuste.saldoAntes, saldoDepois: ajuste.saldoDepois });
  return { ok: true, resultado: { saldoAntesCentavos: ajuste.saldoAntes, saldoDepoisCentavos: ajuste.saldoDepois } };
}

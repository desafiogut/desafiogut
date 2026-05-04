// POST /.netlify/functions/comprar-senhas
// Body: { endereco: "0x...", qtd: 1..100 }
// Resposta 200: { ok, idempotent, qtd, valorCentavos,
//                 saldoRsAntesCentavos, saldoRsDepoisCentavos,
//                 senhasAntes, senhasDepois, txHash, blockNumber, etherscanUrl }
// Resposta 400: saldo insuficiente / params inválidos
// Resposta 502: falha on-chain (com auto-reembolso do R$ debitado)
//
// Fluxo:
//   1) Valida endereco/qtd.
//   2) Debita qtd*200 centavos do saldo R$ (off-chain).
//   3) Chama adicionarSenhas on-chain (coordenacao).
//   4) Em falha on-chain: reembolsa R$ best-effort.
//
// Auth: para o beta, sem auth — saldoRs é por endereço; um atacante teria de
// gastar R$ alheio sem benefício próprio (senhas vão para o dono do address).
// Hardening futuro: exigir signMessage com EIP-191 do address dono.

import {
  jsonResponse, jsonError, validarEndereco, validarQuantidadeFichas,
  parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";
import {
  debitarSaldoRs, reembolsarSaldoRs, lerSaldoRsCentavos,
} from "./_lib/saldoRs.mjs";
import { creditarSenhas, lerSaldoSenhas, CONTRATO_ADDRESS } from "./_lib/contract.mjs";

const VALOR_POR_SENHA_CENTAVOS = 200; // R$ 2,00

export default async (req) => {
  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }
  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com endereco e qtd");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  let endereco, qtd;
  try {
    endereco = validarEndereco(body.endereco);
    qtd      = validarQuantidadeFichas(body.qtd);
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  const valorCentavos = qtd * VALOR_POR_SENHA_CENTAVOS;

  console.info("[comprar-senhas] início", { endereco, qtd, valorCentavos });

  // 1) Verifica saldo + debita.
  const saldoAtual = await lerSaldoRsCentavos(endereco);
  if (saldoAtual < valorCentavos) {
    return jsonError(400, "saldo_insuficiente",
      `Saldo R$ ${(saldoAtual/100).toFixed(2)} < custo R$ ${(valorCentavos/100).toFixed(2)}`,
      { saldoCentavos: saldoAtual, requeridoCentavos: valorCentavos });
  }

  const debito = await debitarSaldoRs({ endereco, valorCentavos, motivo: "comprar-senhas" });
  if (!debito.ok) {
    return jsonError(400, debito.code || "debito_falhou", debito.message || "não foi possível debitar saldo R$");
  }

  // 2) Crédito on-chain. Em falha → reembolsa.
  let resultadoOnChain;
  let senhasAntes, senhasDepois;
  try {
    senhasAntes = await lerSaldoSenhas(endereco);
    resultadoOnChain = await creditarSenhas(endereco, qtd);
    senhasDepois = await lerSaldoSenhas(endereco);
  } catch (err) {
    console.error("[comprar-senhas] credito on-chain falhou — reembolsando R$:", {
      endereco, qtd, valorCentavos, message: err?.message, code: err?.code,
    });
    const reembolso = await reembolsarSaldoRs({ endereco, valorCentavos, motivo: "comprar-senhas-falha" });
    return jsonError(502, "credito_onchain_falhou", err?.shortMessage || err?.message || "falha on-chain", {
      reembolsado: reembolso.ok,
    });
  }

  console.info("[comprar-senhas] concluído", {
    endereco, qtd,
    saldoRsAntes: debito.resultado.saldoAntesCentavos,
    saldoRsDepois: debito.resultado.saldoDepoisCentavos,
    senhasAntes, senhasDepois,
    txHash: resultadoOnChain.txHash,
  });

  return jsonResponse({
    ok: true,
    idempotent: false,
    endereco, qtd, valorCentavos,
    saldoRsAntesCentavos:  debito.resultado.saldoAntesCentavos,
    saldoRsDepoisCentavos: debito.resultado.saldoDepoisCentavos,
    senhasAntes, senhasDepois,
    txHash: resultadoOnChain.txHash,
    blockNumber: resultadoOnChain.blockNumber,
    contrato: CONTRATO_ADDRESS,
    etherscanUrl: `https://sepolia.etherscan.io/tx/${resultadoOnChain.txHash}`,
    processadoEm: new Date().toISOString(),
  });
};

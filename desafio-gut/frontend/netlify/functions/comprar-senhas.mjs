// POST /.netlify/functions/comprar-senhas
// Header: Authorization: Bearer <token>  — JWT { endereco, tipo:"lance-auth" } emitido por /auth-lance
// Body: { endereco: "0x...", qtd: 1..100 }
// Resposta 200: { ok, idempotent, qtd, valorCentavos,
//                 saldoRsAntesCentavos, saldoRsDepoisCentavos,
//                 senhasAntes, senhasDepois, txHash, blockNumber, etherscanUrl }
// Resposta 401: token_ausente | token_expirado | token_invalido
// Resposta 403: endereco_nao_corresponde
// Resposta 400: saldo_insuficiente | params_invalidos
// Resposta 502: falha on-chain (com auto-reembolso do R$ debitado)
//
// Fluxo:
//   1) Verifica JWT lance-auth (mesmo mecanismo do lance-relampago).
//   2) Valida endereco/qtd.
//   3) Debita qtd*200 centavos do saldo R$ (off-chain).
//   4) Chama adicionarSenhas on-chain (coordenacao).
//   5) Em falha on-chain: reembolsa R$ best-effort.

import {
  jsonResponse, jsonError, validarEndereco, validarQuantidadeFichas,
  parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";
import { verificarLanceAuth } from "./_lib/jwt.mjs";
import {
  debitarSaldoRs, reembolsarSaldoRs, lerSaldoRsCentavos,
} from "./_lib/saldoRs.mjs";
import { creditarSenhas, lerSaldoSenhas, CONTRATO_ADDRESS } from "./_lib/contract.mjs";

const VALOR_POR_SENHA_CENTAVOS = 200; // R$ 2,00

export default async (req) => {
  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }

  // ── 1. Auth: verificar JWT lance-auth ─────────────────────────────────────
  const authHeader = req.headers.get("authorization") || "";
  const authToken  = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!authToken) {
    return jsonError(401, "token_ausente", "Authorization: Bearer <token> obrigatório — obtenha via POST /auth-lance");
  }
  let jwtPayload;
  try {
    jwtPayload = await verificarLanceAuth(authToken);
  } catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "token inválido ou expirado — obtenha novo via POST /auth-lance");
  }

  // ── 2. Body parse ──────────────────────────────────────────────────────────
  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com endereco e qtd");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // ── 3. Validar campos ──────────────────────────────────────────────────────
  let endereco, qtd;
  try {
    endereco = validarEndereco(body.endereco);
    qtd      = validarQuantidadeFichas(body.qtd);
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // ── 4. JWT endereco deve corresponder ao body ──────────────────────────────
  if (jwtPayload.endereco !== endereco) {
    return jsonError(403, "endereco_nao_corresponde", "token não pertence ao endereço informado");
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

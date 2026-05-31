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

import { getStore } from "@netlify/blobs";
import {
  jsonResponse, jsonError, validarEndereco, validarQuantidadeFichas,
  parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";
import { verificarLanceAuth } from "./_lib/jwt.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { getRole, requireRole } from "./_lib/rbac.mjs";
import { requireMfa } from "./_lib/require-mfa.mjs";
import {
  debitarSaldoRs, reembolsarSaldoRs, lerSaldoRsCentavos,
} from "./_lib/saldoRs.mjs";
import { creditarSenhas, lerSaldoSenhas, CONTRATO_ADDRESS } from "./_lib/contract.mjs";
import { buscarVinculoPorIndicado, registrarConversao } from "./_lib/referral.mjs";

const VALOR_POR_SENHA_CENTAVOS = 200; // R$ 2,00

// LGPD — versão do termo de consentimento atualmente exigido (sincronizar com TermosConsentimento.jsx).
const TERMO_VERSAO = "v2026-05";
const BLOB_CONSENT = "consent-log";

function abrirConsentStore() {
  try { return getStore({ name: BLOB_CONSENT, consistency: "strong" }); }
  catch (err) {
    console.warn("[comprar-senhas] Blob consent-log indisponível:", err?.message);
    return null;
  }
}

function extrairIp(req) {
  const nfHeader = req.headers.get("x-nf-client-connection-ip");
  if (nfHeader) return nfHeader.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

async function gravarConsentLog(req, endereco) {
  const store = abrirConsentStore();
  if (!store) return;
  const ts  = Date.now();
  const key = `${ts}:${endereco}`;
  try {
    await store.setJSON(key, {
      endereco,
      aceiteEm:    new Date(ts).toISOString(),
      termoVersao: TERMO_VERSAO,
      ip:          extrairIp(req),
      userAgent:   req.headers.get("user-agent") || "unknown",
      contexto:    "comprar-senhas",
    });
  } catch (err) {
    console.warn("[comprar-senhas] gravar consent-log falhou (não-fatal):", err?.message);
  }
}

// Voucher de Networking (REQ-26): isenção total da compra quando válido.
const BLOB_VOUCHER  = "voucher";
const REGEX_VOUCHER = /^GUT-[A-F0-9]{8}$/;

function abrirVoucherStore() {
  try { return getStore({ name: BLOB_VOUCHER, consistency: "strong" }); }
  catch (err) {
    console.warn("[comprar-senhas] Blob voucher indisponível:", err?.message);
    return null;
  }
}

// Validação prévia do voucher — antes de qualquer débito.
// Retorna { ok:true, registro } se aplicável; { ok:false, code, message } se inválido.
async function validarVoucher(codigo, endereco) {
  if (typeof codigo !== "string" || !REGEX_VOUCHER.test(codigo)) {
    return { ok: false, code: "voucher_codigo_invalido", message: "codigo deve casar com GUT-XXXXXXXX (8 hex maiúsculos)" };
  }
  const store = abrirVoucherStore();
  if (!store) return { ok: false, code: "store_indisponivel", message: "Netlify Blobs indisponível" };
  const v = await store.get(codigo, { type: "json" });
  if (!v) return { ok: false, code: "voucher_inexistente", message: "voucher não encontrado" };
  if (v.resgatadoPor) return { ok: false, code: "voucher_ja_resgatado", message: `voucher já resgatado por ${v.resgatadoPor} em ${v.resgatadoEm}` };
  if (v.emissor === endereco) return { ok: false, code: "voucher_emissor_nao_resgata", message: "o emissor não pode resgatar o próprio voucher" };
  return { ok: true, registro: v, store };
}

export default async (req) => {
  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }

  // ── 0. Rate limit por IP (5/min) ───────────────────────────────────────────
  const rl = await aplicarRateLimit(req, "comprar-senhas", 5);
  if (rl) return rl;

  // ── 0.5. Kill switch (MC15.6 ITEM 8) ──────────────────────────────────────
  // Modo pânico (/panic) bloqueia mutações financeiras. Fail-soft na leitura.
  if (sistemaPausado(await lerEstadoSistema())) {
    return jsonError(503, "sistema_pausado", "Sistema em manutenção. Tente novamente em breve.");
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

  // ── 1.5. MFA gate (MC7) — controlado por env MFA_ENFORCEMENT ──────────────
  const mfaBlock = requireMfa(req, jwtPayload, "comprar-senhas");
  if (mfaBlock) return mfaBlock;

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

  // ── 4.5. RBAC: somente cliente+ (cota ativa ou admin) pode comprar fichas ─
  const { role } = await getRole(endereco);
  if (!requireRole(role, "cliente")) {
    return jsonError(403, "papel_insuficiente",
      "compra de fichas requer cota ativa ou adesão ativa — papel atual: " + role,
      { role });
  }

  const valorBruto    = qtd * VALOR_POR_SENHA_CENTAVOS;
  const voucherCodigo = typeof body.voucherCodigo === "string" && body.voucherCodigo.length > 0
    ? body.voucherCodigo.toUpperCase().trim()
    : null;

  // 5. Voucher (REQ-26): validar ANTES de qualquer débito.
  // Se aplicado, valorCentavos vira 0 (isenção total).
  // Só é marcado como resgatado APÓS sucesso on-chain (igual reembolso é só após falha).
  let voucherValido = null;
  if (voucherCodigo) {
    const v = await validarVoucher(voucherCodigo, endereco);
    if (!v.ok) return jsonError(400, v.code, v.message);
    voucherValido = v;
  }
  const valorCentavos = voucherValido ? 0 : valorBruto;

  console.info("[comprar-senhas] início", {
    endereco, qtd, valorBruto, valorCentavos,
    voucher: voucherValido ? voucherCodigo : null,
  });

  // 6. Saldo + débito (pulado se voucher zerou o valor).
  let debito;
  if (valorCentavos > 0) {
    const saldoAtual = await lerSaldoRsCentavos(endereco);
    if (saldoAtual < valorCentavos) {
      return jsonError(400, "saldo_insuficiente",
        `Saldo R$ ${(saldoAtual/100).toFixed(2)} < custo R$ ${(valorCentavos/100).toFixed(2)}`,
        { saldoCentavos: saldoAtual, requeridoCentavos: valorCentavos });
    }
    debito = await debitarSaldoRs({ endereco, valorCentavos, motivo: "comprar-senhas" });
    if (!debito.ok) {
      return jsonError(400, debito.code || "debito_falhou", debito.message || "não foi possível debitar saldo R$");
    }
  } else {
    // Voucher: sem mudança no saldo R$ — registramos para a resposta.
    const saldoAtual = await lerSaldoRsCentavos(endereco);
    debito = { ok: true, resultado: { saldoAntesCentavos: saldoAtual, saldoDepoisCentavos: saldoAtual } };
  }

  // 7. Crédito on-chain. Em falha → reembolsa (se houve débito).
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
    let reembolso = { ok: true };
    if (valorCentavos > 0) {
      reembolso = await reembolsarSaldoRs({ endereco, valorCentavos, motivo: "comprar-senhas-falha" });
    }
    // Voucher NÃO foi marcado como resgatado ainda — segue ativo para o usuário tentar de novo.
    return jsonError(502, "credito_onchain_falhou", err?.shortMessage || err?.message || "falha on-chain", {
      reembolsado: reembolso.ok,
      voucher_preservado: !!voucherValido,
    });
  }

  // 8. Consumir voucher (best-effort) — apenas após sucesso on-chain.
  let voucherResgatadoEm = null;
  if (voucherValido) {
    voucherResgatadoEm = new Date().toISOString();
    try {
      await voucherValido.store.setJSON(voucherCodigo, {
        ...voucherValido.registro,
        resgatadoPor: endereco,
        resgatadoEm:  voucherResgatadoEm,
        resgatadoEm_contexto: "comprar-senhas",
      });
    } catch (err) {
      // Não falha a compra — voucher pode ser reconciliado depois pelo Admin.
      console.warn("[comprar-senhas] consumir voucher falhou (não-fatal):", { voucherCodigo, message: err?.message });
    }
  }

  // LGPD: registra consentimento auditável (art. 7, I) — pós-sucesso on-chain.
  await gravarConsentLog(req, endereco);

  // MC10 (Growth Viral): se este indicado foi referenciado, concede +1 senha
  // bônus ao indicador na PRIMEIRA compra. Idempotente em referral-convertido.
  // Falha aqui NÃO derruba a compra — é fire-and-forget logado.
  let referralBonus = null;
  try {
    const vinculo = await buscarVinculoPorIndicado(endereco);
    if (vinculo && vinculo.indicador) {
      referralBonus = await registrarConversao(vinculo, {
        contexto: "comprar-senhas", txHashCompra: resultadoOnChain.txHash, qtd,
      });
      console.info("[comprar-senhas] referral check", {
        indicado: endereco, indicador: vinculo.indicador, codigo: vinculo.codigo, referralBonus,
      });
    }
  } catch (err) {
    console.warn("[comprar-senhas] referral hook falhou (não-fatal):", err?.message);
  }

  console.info("[comprar-senhas] concluído", {
    endereco, qtd,
    valorCentavos, valorBruto,
    voucher: voucherCodigo,
    saldoRsAntes: debito.resultado.saldoAntesCentavos,
    saldoRsDepois: debito.resultado.saldoDepoisCentavos,
    senhasAntes, senhasDepois,
    txHash: resultadoOnChain.txHash,
  });

  return jsonResponse({
    ok: true,
    idempotent: false,
    endereco, qtd,
    valorBrutoCentavos: valorBruto,
    valorCentavos,                                  // pago de fato (0 se voucher)
    voucher: voucherValido ? {
      codigo: voucherCodigo,
      emissor: voucherValido.registro.emissor,
      resgatadoEm: voucherResgatadoEm,
      descontoCentavos: valorBruto,
    } : null,
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

// Wallet Digital — Vale-Crédito (Especificação Refatorada §4).
//
// GET  /.netlify/functions/wallet?endereco=0x...
//   Retorna { endereco, saldoCentavos, atualizadoEm, transacoes:[...] }.
//   Endpoint público (mesma política de saldo-rs).
//
// POST /.netlify/functions/wallet
//   Header: x-admin-token: <ADMIN_TOKEN>  (gated; sem ADMIN_TOKEN no env, recusa)
//   Body:   { endereco, operacao: "credito"|"debito", valorCentavos, motivo, idempotencyKey? }
//   Retorna 200 { endereco, saldoAntesCentavos, saldoDepoisCentavos, transacaoId }.
//
// Decisões de design (sessão 2026-05-12):
//   - cliente_id = endereço Privy (mesmo do saldo-rs:{address}).
//   - Idempotência server-side via blob wallet-idem:{key}.
//   - "credito" e "debito" gated por admin-token até existir um Admin real
//     (REQ-20 aprovação manual ainda pendente). Cliente comum não pode mexer
//     no próprio saldo — Wallet é abastecida pela regra REQ-17 (Valor_Produto
//     < Valor_Minimo_Cota gera Vale-Crédito) e debitada por compra de premium.

import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import {
  jsonResponse, jsonError, validarEndereco,
  parseJsonBody, ValidationError, validarOwnerOuAdmin,
} from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";

const BLOB_WALLET   = "wallet";
const BLOB_IDEM     = "wallet-idem";
const VAL_MIN       = 1;
const VAL_MAX       = 100_000_000;

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[wallet] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

function lerWalletInicial() {
  return { saldoCentavos: 0, atualizadoEm: null, transacoes: [] };
}

async function getWallet(endereco) {
  const store = abrirStore(BLOB_WALLET);
  if (!store) return lerWalletInicial();
  try {
    const data = await store.get(endereco, { type: "json" });
    return data ?? lerWalletInicial();
  } catch (err) {
    console.warn("[wallet] get falhou:", err?.message);
    return lerWalletInicial();
  }
}

async function handleGet(req) {
  const url = new URL(req.url);
  let endereco;
  try { endereco = validarEndereco(url.searchParams.get("endereco")); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // Anti-IDOR: exige JWT user-session OU admin-access. Owner do recurso
  // (jwtPayload.endereco === query.endereco) ou admin podem ler.
  const authHeader = req.headers.get("authorization") || "";
  const authToken  = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!authToken) return jsonError(401, "token_ausente", "Authorization: Bearer <user-session> obrigatório — obtenha via POST /auth-user");
  let jwtPayload;
  try { jwtPayload = await verificarUserSession(authToken); }
  catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "token de sessão inválido ou expirado");
  }
  const admins = await getAdminAddresses();
  const guard  = validarOwnerOuAdmin(jwtPayload, endereco, admins);
  if (!guard.ok) return jsonError(403, "acesso_negado", "token não pertence ao endereço solicitado e não é admin");

  const wallet = await getWallet(endereco);
  return jsonResponse({ endereco, papel: guard.papel, ...wallet });
}

async function handlePost(req) {
  const denied = await guardAdmin(req);
  if (denied) return denied;

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com endereco, operacao, valorCentavos");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  let endereco, valorCentavos;
  try {
    endereco = validarEndereco(body.endereco);
    const n  = Number(body.valorCentavos);
    if (!Number.isInteger(n) || n < VAL_MIN || n > VAL_MAX) {
      throw new ValidationError("valor_invalido", `valorCentavos deve ser inteiro entre ${VAL_MIN} e ${VAL_MAX}`);
    }
    valorCentavos = n;
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const operacao = body.operacao;
  if (operacao !== "credito" && operacao !== "debito") {
    return jsonError(400, "operacao_invalida", 'operacao deve ser "credito" ou "debito"');
  }
  const motivo = typeof body.motivo === "string" ? body.motivo.slice(0, 200).trim() : null;
  if (!motivo) return jsonError(400, "motivo_obrigatorio", "motivo é obrigatório (string até 200 caracteres)");

  const idempotencyKey = typeof body.idempotencyKey === "string" && body.idempotencyKey.length > 0
    ? body.idempotencyKey.slice(0, 66) : null;

  // Idempotência
  if (idempotencyKey) {
    const idemStore = abrirStore(BLOB_IDEM);
    if (idemStore) {
      try {
        const existente = await idemStore.get(idempotencyKey, { type: "json" });
        if (existente?.transacaoId) {
          return jsonResponse({ ...existente, idempotent: true });
        }
      } catch (err) {
        console.warn("[wallet] leitura idem falhou (não-fatal):", err?.message);
      }
    }
  }

  const wallet = await getWallet(endereco);
  const saldoAntes = Number(wallet.saldoCentavos || 0);
  const delta = operacao === "credito" ? valorCentavos : -valorCentavos;
  const saldoDepois = saldoAntes + delta;

  if (saldoDepois < 0) {
    return jsonError(400, "saldo_insuficiente", `saldo atual R$ ${(saldoAntes/100).toFixed(2)} é insuficiente para débito de R$ ${(valorCentavos/100).toFixed(2)}`);
  }

  const transacaoId = randomUUID();
  const transacao = {
    id: transacaoId,
    operacao, valorCentavos, motivo,
    saldoAntesCentavos: saldoAntes,
    saldoDepoisCentavos: saldoDepois,
    em: new Date().toISOString(),
  };

  const novaWallet = {
    saldoCentavos: saldoDepois,
    atualizadoEm:  transacao.em,
    transacoes: [transacao, ...(wallet.transacoes || [])].slice(0, 50),
  };

  const store = abrirStore(BLOB_WALLET);
  if (store) {
    try { await store.setJSON(endereco, novaWallet); }
    catch (err) {
      console.error("[wallet] persistir falhou:", err?.message);
      return jsonError(502, "persistencia_falhou", "não foi possível salvar wallet");
    }
  }

  if (idempotencyKey) {
    const idemStore = abrirStore(BLOB_IDEM);
    if (idemStore) {
      try {
        await idemStore.setJSON(idempotencyKey, {
          transacaoId, endereco,
          saldoAntesCentavos:  saldoAntes,
          saldoDepoisCentavos: saldoDepois,
        });
      } catch (err) {
        console.warn("[wallet] persistir idem falhou (não-fatal):", err?.message);
      }
    }
  }

  console.info("[wallet] op concluída", { endereco, operacao, valorCentavos, saldoAntes, saldoDepois });
  return jsonResponse({
    transacaoId, endereco, operacao, valorCentavos, motivo,
    saldoAntesCentavos:  saldoAntes,
    saldoDepoisCentavos: saldoDepois,
  });
}

export default async (req) => {
  if (req.method === "GET") {
    const rl = await aplicarRateLimit(req, "wallet-get", 30);
    if (rl) return rl;
    return handleGet(req);
  }
  if (req.method === "POST") {
    const rl = await aplicarRateLimit(req, "wallet-post", 5);
    if (rl) return rl;
    return handlePost(req);
  }
  return jsonError(405, "metodo_invalido", "use GET ou POST", { allowed: ["GET", "POST"] });
};

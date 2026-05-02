// POST /.netlify/functions/confirmar-pagamento
// Body: { token: "<JWT do iniciar-pagamento>" }
// Resposta 200: { ok, idempotent, pedidoId, endereco, qtd, txHash, blockNumber,
//                 saldoAntes, saldoDepois, etherscanUrl }
// Resposta 401: token inválido/expirado
// Resposta 502: falha on-chain (wallet sem ETH, RPC down, revert)
//
// Idempotência: Netlify Blobs (`pedidos-pagos:${pedidoId}` → resultado).
// Em dev local sem `netlify dev`, Blobs falha silenciosamente (sem persistência);
// cada chamada cria um novo crédito on-chain. Em produção, replays retornam
// `idempotent: true` com o mesmo txHash sem re-chamar o contrato.

import { getStore } from "@netlify/blobs";
import { verificarPedido } from "./_lib/jwt.mjs";
import {
  jsonResponse,
  jsonError,
  parseJsonBody,
  ValidationError,
} from "./_lib/validate.mjs";
import {
  creditarSenhas,
  lerSaldoSenhas,
  getCoordenacaoAddress,
  CONTRATO_ADDRESS,
} from "./_lib/contract.mjs";

const BLOB_STORE = "pedidos-pagos";

function abrirStore() {
  try {
    return getStore({ name: BLOB_STORE, consistency: "strong" });
  } catch (err) {
    console.warn("[confirmar-pagamento] Blobs indisponível:", err?.message);
    return null;
  }
}

export default async (req) => {
  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }

  // ── Parse + valida body ────────────────────────────────────────────────────
  let body;
  try {
    body = await parseJsonBody(req);
    if (!body?.token) {
      return jsonError(400, "token_obrigatorio", "envie { token } no body");
    }
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // ── Verifica JWT ───────────────────────────────────────────────────────────
  let payload;
  try {
    payload = await verificarPedido(body.token);
  } catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "token rejeitado");
  }
  const { pedidoId, endereco, qtd } = payload;
  if (!pedidoId || !endereco || !qtd) {
    return jsonError(400, "payload_incompleto", "token sem campos obrigatórios");
  }

  // ── Idempotência via Blobs ────────────────────────────────────────────────
  const store = abrirStore();
  if (store) {
    try {
      const existente = await store.get(pedidoId, { type: "json" });
      if (existente?.txHash) {
        return jsonResponse({
          ok: true,
          idempotent: true,
          pedidoId,
          endereco,
          qtd,
          ...existente,
        });
      }
    } catch (err) {
      console.warn("[confirmar-pagamento] leitura Blob falhou (não-fatal):", err?.message);
    }
  }

  // ── Crédito on-chain ──────────────────────────────────────────────────────
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
    };
  } catch (err) {
    console.error("[confirmar-pagamento] erro on-chain:", { message: err?.message, code: err?.code, shortMessage: err?.shortMessage });
    return jsonError(502, "credito_falhou", err?.shortMessage || err?.message || "erro inesperado on-chain");
  }

  // ── Persiste para idempotência futura ─────────────────────────────────────
  if (store) {
    try {
      await store.setJSON(pedidoId, resultado);
    } catch (err) {
      console.warn("[confirmar-pagamento] persistência Blob falhou (não-fatal):", err?.message);
    }
  }

  return jsonResponse({ ok: true, idempotent: false, ...resultado });
};

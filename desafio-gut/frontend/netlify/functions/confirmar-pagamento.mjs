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
import { consultarPagamento, MercadoPagoApiError } from "./_lib/mp-client.mjs";

const BLOB_STORE     = "pedidos-pagos";
const BLOB_STORE_MP  = "mp-aprovados";

function abrirStore(name = BLOB_STORE) {
  try {
    return getStore({ name, consistency: "strong" });
  } catch (err) {
    console.warn(`[confirmar-pagamento] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

// Verifica se o pagamento MP (referenciado pelo JWT) está aprovado.
// Caminho rápido: Blob `mp-aprovados:${pedidoId}` (populado pelo webhook).
// Fallback: GET /v1/payments/:id ao vivo (cobre janela antes do webhook).
//
// Retorno:
//   { aprovado: true,  paymentId, source: "blob"|"live" }            → ok p/ creditar
//   { aprovado: false, motivo: "<status>", paymentId, source }       → 402
//   throw MercadoPagoApiError                                         → 502
async function verificarStatusMP({ pedidoId, paymentId }) {
  // 1) Blob (rápido, populado pelo webhook).
  const storeMp = abrirStore(BLOB_STORE_MP);
  if (storeMp) {
    try {
      const cached = await storeMp.get(pedidoId, { type: "json" });
      if (cached?.status === "approved") {
        return { aprovado: true, paymentId: cached.paymentId || paymentId, source: "blob" };
      }
    } catch (err) {
      console.warn("[confirmar-pagamento] leitura mp-aprovados falhou (não-fatal):", err?.message);
    }
  }
  // 2) Live API.
  const pagamento = await consultarPagamento(paymentId);
  if (pagamento?.status === "approved") {
    // Persiste para evitar nova consulta live em replays.
    if (storeMp) {
      try {
        await storeMp.setJSON(pedidoId, {
          status: "approved",
          paymentId: String(pagamento.id),
          capturadoEm: new Date().toISOString(),
          fonte: "confirmar-pagamento",
        });
      } catch (err) {
        console.warn("[confirmar-pagamento] gravar mp-aprovados falhou (não-fatal):", err?.message);
      }
    }
    return { aprovado: true, paymentId: String(pagamento.id), source: "live" };
  }
  return {
    aprovado: false,
    motivo:   pagamento?.status || "desconhecido",
    detalhe:  pagamento?.status_detail || null,
    paymentId,
    source:   "live",
  };
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
  const { pedidoId, endereco, qtd, paymentId } = payload;
  if (!pedidoId || !endereco || !qtd) {
    return jsonError(400, "payload_incompleto", "token sem campos obrigatórios");
  }

  // ── Idempotência via Blobs ────────────────────────────────────────────────
  // Importante: idempotência ANTES da verificação MP. Replay de pedido já
  // creditado responde do Blob sem nova chamada à API do MP (preserva
  // contrato existente do mock e evita rate-limit do MP em retries).
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

  // ── Verificação MP (somente quando JWT carrega paymentId) ─────────────────
  // JWT sem paymentId = pedido criado pelo provider mock → caminho legado
  // (trust JWT). JWT com paymentId = provider real → exige status="approved"
  // antes de creditar on-chain.
  if (paymentId) {
    let mpStatus;
    try {
      mpStatus = await verificarStatusMP({ pedidoId, paymentId });
    } catch (err) {
      console.error("[confirmar-pagamento] consulta MP falhou:", {
        name: err?.name, code: err?.code, status: err?.status, message: err?.message,
      });
      if (err instanceof MercadoPagoApiError && err.status === 404) {
        return jsonError(404, "pagamento_inexistente", `paymentId ${paymentId} não encontrado no Mercado Pago`);
      }
      return jsonError(502, "mp_indisponivel", "não foi possível verificar status do pagamento agora — tente novamente em instantes");
    }
    if (!mpStatus.aprovado) {
      return jsonError(402, "pagamento_nao_confirmado", `pagamento ainda não aprovado (status: ${mpStatus.motivo})`, {
        paymentId: mpStatus.paymentId,
        status: mpStatus.motivo,
        statusDetail: mpStatus.detalhe,
      });
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

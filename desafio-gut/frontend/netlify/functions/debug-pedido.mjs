// GET /.netlify/functions/debug-pedido?id=<pedidoId>
//
// Inspeção de estado de um pedido em todos os blobs:
//   - pedidos-meta:${id}    (gravado em iniciar-pagamento)
//   - mp-aprovados:${id}    (gravado pelo webhook MP)
//   - pedidos-pagos:${id}   (gravado após crédito on-chain)
//
// Útil para descobrir em qual etapa o crédito automático parou.
// Read-only — não credita nem altera nada. Não expõe a PRIVATE_KEY (só lê
// blobs já existentes; metadata.endereco é público no contrato).
//
// Token de acesso: exige header `x-debug-token: <DEBUG_TOKEN>`.
//
// MC87 (P1-3) — este endpoint era FAIL-OPEN: "sem DEBUG_TOKEN no env responde sem
// auth (modo dev)". Em produção a variável nunca foi definida, portanto o
// diagnóstico esteve aberto à internet — o próprio corpo denunciava, devolvendo
// "DEBUG_TOKEN_set": false junto com o mapa de configuração e, dado um pedidoId,
// o endereço/quantidade/valor do pedido de terceiros.
//
// Agora é FAIL-CLOSED, o padrão que mc302-diagnostico.mjs já usava: sem
// DEBUG_TOKEN configurado o endpoint responde 503 e não lê blob nenhum. A
// comparação do token é em tempo constante.

import { createHash, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { backendAssinatura } from "./_lib/signer.mjs";

const STORES = ["pedidos-meta", "mp-aprovados", "pedidos-pagos"];

function abrirStore(name) {
  try {
    return getStore({ name, consistency: "strong" });
  } catch (err) {
    return { _erro: err?.message };
  }
}

// MC87 (P1-3) — comparação em tempo constante (SHA-256 de ambos → buffers de
// igual comprimento, sem fuga por timing nem por tamanho).
function verificarDebugToken(fornecido) {
  const esperado = process.env.DEBUG_TOKEN;
  if (!esperado) {
    return jsonError(503, "config_ausente", "DEBUG_TOKEN não configurado — endpoint desativado");
  }
  if (!fornecido) return jsonError(401, "token_ausente", "header x-debug-token em falta");
  const a = createHash("sha256").update(String(fornecido)).digest();
  const b = createHash("sha256").update(String(esperado)).digest();
  if (!timingSafeEqual(a, b)) return jsonError(401, "token_invalido", "token inválido");
  return null;
}

export default async (req) => {
  // Fail-CLOSED: sem DEBUG_TOKEN o endpoint não existe, e nada é lido.
  const negado = verificarDebugToken(req.headers.get("x-debug-token"));
  if (negado) return negado;

  const url = new URL(req.url);
  const id  = url.searchParams.get("id");
  if (!id) {
    return jsonError(400, "id_obrigatorio", "use ?id=<pedidoId>");
  }

  const resultado = { pedidoId: id, blobs: {}, env: {} };

  for (const nome of STORES) {
    const store = abrirStore(nome);
    if (store?._erro) {
      resultado.blobs[nome] = { erro_store: store._erro };
      continue;
    }
    try {
      const valor = await store.get(id, { type: "json" });
      resultado.blobs[nome] = valor ?? null;
    } catch (err) {
      resultado.blobs[nome] = { erro_leitura: err?.message };
    }
  }

  // Sinais de configuração — sem expor secrets.
  resultado.env = {
    PIX_PROVIDER: process.env.PIX_PROVIDER || "mock",
    MP_ACCESS_TOKEN_set: !!process.env.MP_ACCESS_TOKEN,
    RPC_URL_set: !!process.env.RPC_URL,
    // MC30.1 — reporta o MODO de assinatura, não a presença da chave bruta.
    signer_backend: backendAssinatura(),
    biconomy_kms_set: !!process.env.KMS_KEY_ID && !!process.env.BICONOMY_BUNDLER_URL,
    CONTRATO_SEPOLIA: process.env.CONTRATO_SEPOLIA || "(default)",
    DEBUG_TOKEN_set: !!process.env.DEBUG_TOKEN,
  };

  // Diagnóstico humano com base no estado dos blobs.
  const meta     = resultado.blobs["pedidos-meta"];
  const aprovado = resultado.blobs["mp-aprovados"];
  const pago     = resultado.blobs["pedidos-pagos"];
  const diag = [];
  if (!meta?.endereco)     diag.push("⚠ pedidos-meta ausente — pedido criado antes do deploy ou Blobs falhou em iniciar-pagamento");
  if (!aprovado?.status)   diag.push("⚠ mp-aprovados ausente — webhook ainda não chegou ou MP não notificou");
  if (aprovado?.status && aprovado.status !== "approved") diag.push(`ℹ status MP = ${aprovado.status} (não aprovado ainda)`);
  if (!pago?.txHash)       diag.push("⚠ pedidos-pagos ausente — crédito on-chain ainda não aconteceu");
  if (meta && aprovado?.status === "approved" && !pago?.txHash) {
    diag.push("🔧 meta + aprovado existem mas pedidos-pagos não — webhook deveria ter creditado, verifique logs de [credito:webhook]");
  }
  if (pago?.txHash) diag.push(`✓ creditado on-chain: ${pago.txHash} (${pago.fonte || "?"})`);
  resultado.diagnostico = diag;

  return jsonResponse(resultado);
};

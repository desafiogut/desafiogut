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
// Token de acesso: para evitar varredura externa, exige header
// `x-debug-token: <DEBUG_TOKEN>` se a env var DEBUG_TOKEN estiver configurada.
// Sem DEBUG_TOKEN no env, o endpoint responde sem auth (modo dev).

import { getStore } from "@netlify/blobs";
import { jsonResponse, jsonError } from "./_lib/validate.mjs";

const STORES = ["pedidos-meta", "mp-aprovados", "pedidos-pagos"];

function abrirStore(name) {
  try {
    return getStore({ name, consistency: "strong" });
  } catch (err) {
    return { _erro: err?.message };
  }
}

export default async (req) => {
  // Auth opcional via DEBUG_TOKEN
  const tokenEsperado = process.env.DEBUG_TOKEN;
  if (tokenEsperado) {
    const tokenRecebido = req.headers.get("x-debug-token");
    if (tokenRecebido !== tokenEsperado) {
      return jsonError(401, "auth_invalido", "envie x-debug-token");
    }
  }

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
    COORDENACAO_PRIVATE_KEY_set: !!process.env.COORDENACAO_PRIVATE_KEY,
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

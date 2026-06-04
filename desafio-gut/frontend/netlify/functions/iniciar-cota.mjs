// POST /.netlify/functions/iniciar-cota
// Body: { endereco: "0x...", categoria: "bronze|prata|ouro|diamante",
//         produtoValor?: number (BRL), produtoNome?: string }
// Resposta 200: { pedidoId, valorBRL, categoria, qrCodeText, qrCodeImage|null,
//                 validUntil, token, provider, simulated }
//
// MC17.1 — Contratação de cota comercial via Mercado Pago (SEM aprovação manual).
// O pagamento é validado pelo webhook/confirmar-pagamento; ao aprovar, a cota é
// ativada automaticamente e o troco do excedente é creditado (ver cota-ativacao).

import { randomUUID } from "node:crypto";
import { assinarPedido } from "./_lib/jwt.mjs";
import {
  validarEndereco, jsonResponse, jsonError, parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";
import { getPixProvider, PIX_PROVIDER_NAME } from "./_lib/pix-provider/index.mjs";
import { gravarMetaPedido } from "./_lib/credito.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { COTA_PRECO_CONTRATO_BRL, CATEGORIAS } from "./_lib/cota-ativacao.mjs";

const TTL_SEC = 15 * 60;

export default async (req) => {
  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }
  const rl = await aplicarRateLimit(req, "iniciar-cota", 5);
  if (rl) return rl;

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com endereco e categoria");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  let endereco;
  try { endereco = validarEndereco(body.endereco); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const categoria = String(body.categoria || "").toLowerCase();
  if (!CATEGORIAS.has(categoria)) {
    return jsonError(400, "categoria_invalida", "categoria deve ser bronze|prata|ouro|diamante");
  }
  const valorBRL = COTA_PRECO_CONTRATO_BRL[categoria];

  let produtoValor = null;
  if (body.produtoValor != null && body.produtoValor !== "") {
    const v = Number(body.produtoValor);
    if (!Number.isFinite(v) || v < 0) return jsonError(400, "produto_valor_invalido", "produtoValor deve ser número >= 0");
    produtoValor = v;
  }
  const produtoNome = typeof body.produtoNome === "string" ? body.produtoNome.slice(0, 120) : null;

  const pedidoId   = randomUUID();
  const validUntil = new Date(Date.now() + TTL_SEC * 1000).toISOString();

  let pix;
  try {
    pix = await getPixProvider().gerarPedidoPix({ pedidoId, valorBRL });
  } catch (err) {
    console.error("[iniciar-cota] provider falhou", { name: err?.name, code: err?.code, message: err?.message });
    if (err?.code === "mp_config_invalida") {
      return jsonError(500, "pix_provider_mal_configurado", "PIX provider sem credenciais válidas");
    }
    return jsonError(502, "pix_provider_indisponivel", "não foi possível gerar pedido PIX agora");
  }

  let token;
  try {
    const payload = { pedidoId, endereco, tipo: "cota", categoria, valorBRL, produtoValor, produtoNome };
    if (pix.paymentId) payload.paymentId = pix.paymentId;
    token = await assinarPedido(payload, TTL_SEC);
  } catch (err) {
    console.error("[iniciar-cota] jwt falhou", { name: err?.name, message: err?.message });
    return jsonError(500, "jwt_indisponivel", "configuração de servidor incompleta");
  }

  await gravarMetaPedido({ pedidoId, endereco, valorBRL, paymentId: pix.paymentId, tipo: "cota", categoria, produtoValor, produtoNome });

  return jsonResponse({
    pedidoId, valorBRL, categoria,
    qrCodeText: pix.qrCodeText, qrCodeImage: pix.qrCodeImage, simulated: pix.simulated,
    provider: PIX_PROVIDER_NAME, validUntil, token,
  });
};

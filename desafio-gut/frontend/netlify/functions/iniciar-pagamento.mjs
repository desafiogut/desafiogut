// POST /.netlify/functions/iniciar-pagamento
// Body: { endereco: "0x...", qtd: 1..100 }
// Resposta 200: { pedidoId, valorBRL, qrCodeText, qrCodeImage|null,
//                 validUntil, token, provider, simulated }
// Resposta 400: { error: { code, message } }
//
// Idempotência: o pedidoId é gerado server-side. Replays do client com o mesmo
// payload geram pedidos diferentes — o que é OK; idempotência REAL é em
// /confirmar-pagamento (Netlify Blobs por pedidoId).

import { randomUUID } from "node:crypto";
import { assinarPedido } from "./_lib/jwt.mjs";
import {
  validarEndereco,
  validarQuantidadeFichas,
  calcularValorBRL,
  jsonResponse,
  jsonError,
  parseJsonBody,
  ValidationError,
} from "./_lib/validate.mjs";
import { getPixProvider, PIX_PROVIDER_NAME } from "./_lib/pix-provider/index.mjs";
import { gravarMetaPedido } from "./_lib/credito.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";

const TTL_SEC = 15 * 60; // 15 minutos para o usuário pagar

export default async (req) => {
  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }

  const rl = await aplicarRateLimit(req, "iniciar-pagamento", 5);
  if (rl) return rl;

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com endereco e qtd");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  let endereco, qtd, valorBRL;
  try {
    endereco = validarEndereco(body.endereco);
    qtd      = validarQuantidadeFichas(body.qtd);
    valorBRL = calcularValorBRL(qtd);
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const pedidoId = randomUUID();
  const issuedAt = Date.now();
  const validUntil = new Date(issuedAt + TTL_SEC * 1000).toISOString();

  // Dados opcionais do pagador (CPF/e-mail/nome) — quando o frontend os coletar.
  // Contas de produção do MP podem exigir payer.identification; sem isso o
  // provider cai para o fallback de env (MP_PAYER_*). Campos só lidos se forem
  // strings; documento é normalizado para dígitos no provider.
  let pagador;
  if (body.pagador && typeof body.pagador === "object") {
    const p = body.pagador;
    pagador = {
      email:   typeof p.email   === "string" ? p.email.slice(0, 254) : undefined,
      cpf:     typeof p.cpf     === "string" ? p.cpf.slice(0, 32)     : undefined,
      tipoDoc: typeof p.tipoDoc === "string" ? p.tipoDoc.slice(0, 8)  : undefined,
      nome:    typeof p.nome    === "string" ? p.nome.slice(0, 140)   : undefined,
    };
  }

  let pix;
  try {
    // await aceita retorno síncrono (mock) e Promise (mercadopago).
    pix = await getPixProvider().gerarPedidoPix({ pedidoId, valorBRL, pagador });
  } catch (err) {
    console.error("[iniciar-pagamento] provider falhou", {
      name: err?.name, code: err?.code, message: err?.message, status: err?.status,
    });
    if (err?.code === "mp_config_invalida") {
      return jsonError(500, "pix_provider_mal_configurado", "PIX provider sem credenciais válidas");
    }
    return jsonError(502, "pix_provider_indisponivel", "não foi possível gerar pedido PIX agora");
  }

  let token;
  try {
    // paymentId só existe quando o provider real (mercadopago) é usado.
    // No mock fica undefined → JWT sem paymentId → confirmar-pagamento
    // mantém o caminho legado (trust JWT, sem checar MP).
    const payload = { pedidoId, endereco, qtd, valorBRL };
    if (pix.paymentId) payload.paymentId = pix.paymentId;
    token = await assinarPedido(payload, TTL_SEC);
  } catch (err) {
    console.error("[iniciar-pagamento] jwt falhou", { name: err?.name, message: err?.message });
    return jsonError(500, "jwt_indisponivel", "configuração de servidor incompleta");
  }

  // Persiste metadados para o webhook poder creditar sem o JWT (que vive
  // só no cliente). Não-fatal: confirmar-pagamento ainda funciona via JWT.
  await gravarMetaPedido({ pedidoId, endereco, qtd, valorBRL, paymentId: pix.paymentId });

  return jsonResponse({
    pedidoId,
    valorBRL,
    qtd,
    qrCodeText: pix.qrCodeText,
    qrCodeImage: pix.qrCodeImage,
    simulated: pix.simulated,
    provider: PIX_PROVIDER_NAME,
    validUntil,
    token,
  });
};

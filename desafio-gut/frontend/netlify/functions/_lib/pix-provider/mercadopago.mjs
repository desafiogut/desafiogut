// MercadoPagoPixProvider — gera cobrança PIX real via API do Mercado Pago.
//
// Ativação: setar `PIX_PROVIDER=mercadopago` + `MP_ACCESS_TOKEN` no Netlify.
// Em sandbox usar token `TEST-...`; em produção, token de produção.
//
// Integração de segurança (B.6): este provider devolve `paymentId` junto com
// o QR. iniciar-pagamento.mjs embute o paymentId no JWT, e
// confirmar-pagamento.mjs verifica `status="approved"` via MP API antes de
// creditar on-chain. Webhook MP (webhook-mercadopago.mjs) registra
// confirmações em Netlify Blobs como audit trail.
//
// Endpoint: POST https://api.mercadopago.com/v1/payments
// Docs: https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post

import { fetchMP } from "../mp-client.mjs";

// Só dígitos. Aceita CPF (11) ou CNPJ (14). Retorna null se ausente/inválido —
// evita mandar um documento malformado que o MP rejeitaria.
function normalizarDoc(numero) {
  if (!numero) return null;
  const digitos = String(numero).replace(/\D/g, "");
  return (digitos.length === 11 || digitos.length === 14) ? digitos : null;
}

// Monta o objeto `payer` do MP. Contas de produção homologadas costumam exigir
// `payer.identification` (CPF/CNPJ) além do e-mail — sua ausência faz o
// POST /v1/payments falhar (→ 502 pix_provider_indisponivel a montante).
//
// R9 (sem hardcode de credenciais): o documento NUNCA é embutido no código —
// vem do pagador (request) ou de variáveis de ambiente do operador. Se nenhum
// estiver disponível, `identification` é omitido (comportamento legado), em vez
// de enviar um CPF falso que o MP recusaria na validação de dígitos.
function montarPayer({ email, cpf, tipoDoc, nome } = {}) {
  const payer = {
    // MP exige email do payer mesmo para PIX. Usa o do pagador se fornecido,
    // senão um placeholder configurável; o próprio MP coleta o real via app
    // bancário no momento do pagamento.
    email: email || process.env.MP_PAYER_EMAIL || "pagador@desafiogut.com.br",
  };

  const numero = normalizarDoc(cpf) || normalizarDoc(process.env.MP_PAYER_ID_NUMBER);
  if (numero) {
    const type = (tipoDoc || process.env.MP_PAYER_ID_TYPE ||
      (numero.length === 14 ? "CNPJ" : "CPF")).toUpperCase();
    payer.identification = { type, number: numero };
  }

  // first_name/last_name — opcionais, ajudam algumas contas de produção.
  // Derivados do nome do pagador (ou env); omitidos se ausentes.
  const nomeCompleto = (nome || process.env.MP_PAYER_NOME || "").trim();
  if (nomeCompleto) {
    const partes = nomeCompleto.split(/\s+/);
    payer.first_name = partes[0];
    if (partes.length > 1) payer.last_name = partes.slice(1).join(" ");
  }

  return payer;
}

/**
 * UTAC111 — `date_of_expiration` no formato do MP («yyyy-MM-ddTHH:mm:ss.SSS±hh:mm»), no fuso de Manaus
 * (UTC-4, sem horário de verão). PURA.
 */
export function formatarExpiracaoMp(ms) {
  return new Date(ms - 4 * 3600 * 1000).toISOString().replace("Z", "-04:00");
}

// UTAC111 — `expiraEmMs` é OPCIONAL: só o PIX do produto o passa (24 h). O depósito de saldo não o passa e o
// corpo enviado ao MP fica byte-igual ao de antes (expiração por omissão do MP).
export async function gerarPedidoPix({ pedidoId, valorBRL, pagador, expiraEmMs } = {}) {
  const body = {
    transaction_amount: Number(valorBRL),
    description: `DesafioGUT — pedido ${pedidoId}`,
    payment_method_id: "pix",
    external_reference: pedidoId,
    payer: montarPayer(pagador),
  };
  if (Number.isFinite(expiraEmMs)) body.date_of_expiration = formatarExpiracaoMp(expiraEmMs);
  const data = await fetchMP("/v1/payments", {
    method: "POST",
    // pedidoId é um UUID v4 (randomUUID) — já serve como X-Idempotency-Key
    // dinâmico (mp-client.fetchMP o envia no header). Não duplicar.
    idempotencyKey: pedidoId,
    body,
  });

  const tx = data?.point_of_interaction?.transaction_data;
  if (!tx?.qr_code) {
    const err = new Error("resposta MP sem qr_code (point_of_interaction.transaction_data)");
    err.code = "mp_resposta_invalida";
    throw err;
  }

  return {
    qrCodeText: tx.qr_code,
    qrCodeImage: tx.qr_code_base64 ? `data:image/png;base64,${tx.qr_code_base64}` : null,
    simulated: false,
    providerName: "mercadopago",
    paymentId: data.id ? String(data.id) : null,
  };
}

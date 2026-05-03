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

export async function gerarPedidoPix({ pedidoId, valorBRL }) {
  const data = await fetchMP("/v1/payments", {
    method: "POST",
    idempotencyKey: pedidoId,
    body: {
      transaction_amount: Number(valorBRL),
      description: `DesafioGUT — pedido ${pedidoId}`,
      payment_method_id: "pix",
      external_reference: pedidoId,
      payer: {
        // MP exige email do payer mesmo para PIX. Usamos placeholder e o
        // próprio MP coleta o real do pagador via app bancário.
        email: "pagador@desafiogut.com.br",
      },
    },
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

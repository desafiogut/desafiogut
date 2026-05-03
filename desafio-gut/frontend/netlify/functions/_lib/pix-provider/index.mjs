// Factory de PixProvider. Escolha controlada por env `PIX_PROVIDER`:
//   "mock"        → MockPixProvider (Beta — auto-confirma sem dinheiro real)
//   "mercadopago" → MercadoPagoPixProvider (real — exige MP_ACCESS_TOKEN)
//
// Cada provider exporta `gerarPedidoPix({ pedidoId, valorBRL })` retornando:
//   { qrCodeText, qrCodeImage|null, simulated: boolean, providerName: string,
//     paymentId?: string }
//
// O retorno pode ser síncrono (mock) ou Promise (mercadopago); o caller deve
// usar `await` para suportar ambos.

import { gerarPedidoPix as gerarMock } from "./mock.mjs";
import { gerarPedidoPix as gerarMercadoPago } from "./mercadopago.mjs";

const PROVIDER = (process.env.PIX_PROVIDER || "mock").toLowerCase();

export function getPixProvider() {
  switch (PROVIDER) {
    case "mock":
      return { gerarPedidoPix: gerarMock };
    case "mercadopago":
      return { gerarPedidoPix: gerarMercadoPago };
    default:
      throw new Error(`PIX_PROVIDER desconhecido: ${PROVIDER}`);
  }
}

export const PIX_PROVIDER_NAME = PROVIDER;

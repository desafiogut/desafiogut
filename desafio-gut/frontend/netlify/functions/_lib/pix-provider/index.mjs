// Factory de PixProvider. Escolha controlada por env `PIX_PROVIDER`:
//   "mock"        → MockPixProvider (Beta — auto-confirma sem dinheiro real)
//   "mercadopago" → MercadoPagoPixProvider (stub em B.5; ativar em produção)
//
// Cada provider exporta `gerarPedidoPix({ pedidoId, valorBRL })` retornando:
//   { qrCodeText, qrCodeImage|null, simulated: boolean, providerName: string }

import { gerarPedidoPix as gerarMock } from "./mock.mjs";

const PROVIDER = (process.env.PIX_PROVIDER || "mock").toLowerCase();

export function getPixProvider() {
  switch (PROVIDER) {
    case "mock":
      return { gerarPedidoPix: gerarMock };
    case "mercadopago":
      // Stub: B.5 implementa. Por ora cai no mock para evitar falha total.
      console.warn("[pix-provider] mercadopago ainda é stub — usando mock");
      return { gerarPedidoPix: gerarMock };
    default:
      throw new Error(`PIX_PROVIDER desconhecido: ${PROVIDER}`);
  }
}

export const PIX_PROVIDER_NAME = PROVIDER;

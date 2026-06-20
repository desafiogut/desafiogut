// GET /.netlify/functions/health
// Smoke-test das functions: confirma que o runtime está OK e reporta quais
// env vars estão configuradas (sem vazar valores). Usado pelo script
// scripts/check-functions-health.sh e pelo monitoramento manual pós-deploy.

import { jsonResponse } from "./_lib/validate.mjs";
import { backendAssinatura, resolverChaveCoordenacao } from "./_lib/signer.mjs";

export default async () => {
  const provider = (process.env.PIX_PROVIDER || "mock").toLowerCase();

  // MC30.1 — reporta o MODO de assinatura (backend), não a presença da chave.
  const backend = backendAssinatura();
  const signerReady = backend === "biconomy"
    ? (!!process.env.KMS_KEY_ID && !!process.env.BICONOMY_BUNDLER_URL)
    : !!resolverChaveCoordenacao();
  const chaveBrutaEmMainnet = process.env.NETWORK_STAGE === "mainnet" && !!resolverChaveCoordenacao();

  const env = {
    JWT_SECRET:              process.env.JWT_SECRET              ? "set" : "MISSING",
    SIGNER_BACKEND:          backend,
    SIGNER_READY:            signerReady ? "set" : "MISSING",
    // Alerta de segurança: chave bruta NÃO pode existir em mainnet (R9/ITEM 3.5).
    CHAVE_BRUTA_EM_MAINNET:  chaveBrutaEmMainnet ? "ALERT" : "ok",
    RPC_URL:                 process.env.RPC_URL                 ? "set" : "MISSING",
    PIX_PROVIDER:            provider,
    // MP_ACCESS_TOKEN só é exigido quando PIX_PROVIDER=mercadopago.
    // Reportamos sempre para facilitar diagnóstico do gating.
    MP_ACCESS_TOKEN:         process.env.MP_ACCESS_TOKEN         ? "set" : "MISSING",
  };

  return jsonResponse({
    ok: true,
    service: "desafiogut-functions",
    timestamp: new Date().toISOString(),
    node: process.version,
    env,
  });
};

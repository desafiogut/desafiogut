// GET /.netlify/functions/health
// Smoke-test das functions: confirma que o runtime está OK e reporta quais
// env vars estão configuradas (sem vazar valores). Usado pelo script
// scripts/check-functions-health.sh e pelo monitoramento manual pós-deploy.

import { jsonResponse } from "./_lib/validate.mjs";

export default async () => {
  const provider = (process.env.PIX_PROVIDER || "mock").toLowerCase();
  const env = {
    JWT_SECRET:              process.env.JWT_SECRET              ? "set" : "MISSING",
    COORDENACAO_PRIVATE_KEY: process.env.COORDENACAO_PRIVATE_KEY ? "set" : "MISSING",
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

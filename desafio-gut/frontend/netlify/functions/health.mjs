// GET /.netlify/functions/health
// Smoke-test das functions: confirma que o runtime está OK e reporta quais
// env vars estão configuradas (sem vazar valores). Usado pelo script
// scripts/check-functions-health.sh e pelo monitoramento manual pós-deploy.

import { jsonResponse } from "./_lib/validate.mjs";

export default async () => {
  const env = {
    JWT_SECRET:              process.env.JWT_SECRET              ? "set" : "MISSING",
    COORDENACAO_PRIVATE_KEY: process.env.COORDENACAO_PRIVATE_KEY ? "set" : "MISSING",
    RPC_URL:                 process.env.RPC_URL                 ? "set" : "MISSING",
    PIX_PROVIDER:            process.env.PIX_PROVIDER            ?? "mock",
  };

  return jsonResponse({
    ok: true,
    service: "desafiogut-functions",
    timestamp: new Date().toISOString(),
    node: process.version,
    env,
  });
};

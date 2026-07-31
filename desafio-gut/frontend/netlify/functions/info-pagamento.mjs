// GET /.netlify/functions/info-pagamento
// Retorna os canais PIX da plataforma (Adesão manual + Fichas automatizado).
// Endpoint público — as chaves PIX são divulgáveis por natureza.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { PIX_ADESAO, PIX_FICHAS } from "./_lib/pix-config.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  // MC88.12 — preflight CORS do APK. Tem de ser a primeira coisa: o OPTIONS não
  // leva corpo nem Authorization, logo qualquer validação a montante responderia
  // 4xx e o browser abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET");
  }
  return jsonResponse({
    adesao: PIX_ADESAO,
    fichas: PIX_FICHAS,
  });
};

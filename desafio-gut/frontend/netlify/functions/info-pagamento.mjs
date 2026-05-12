// GET /.netlify/functions/info-pagamento
// Retorna os canais PIX da plataforma (Adesão manual + Fichas automatizado).
// Endpoint público — as chaves PIX são divulgáveis por natureza.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { PIX_ADESAO, PIX_FICHAS } from "./_lib/pix-config.mjs";

export default async (req) => {
  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET");
  }
  return jsonResponse({
    adesao: PIX_ADESAO,
    fichas: PIX_FICHAS,
  });
};

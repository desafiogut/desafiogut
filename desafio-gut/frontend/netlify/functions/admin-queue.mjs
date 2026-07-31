// GET /.netlify/functions/admin-queue                             [ADMIN]
//
// MC89.12 (Fase 3). Estado da fila de tarefas. Sem cache (a fila muda em
// tempo real). Sem ethers. Gate: operador ou superior.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdminNivel } from "./_lib/admin-auth.mjs";
import { getSupabaseReadOnly } from "./_lib/supabase-client.mjs";
import { estadoFila } from "./_lib/admin-comandos.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }

  const rl = await aplicarRateLimit(req, "admin-queue", 20);
  if (rl) return rl;

  const negado = await guardAdminNivel(req, "operador");
  if (negado) return negado;

  const url = new URL(req.url);
  const limite = Math.min(parseInt(url.searchParams.get("limite"), 10) || 30, 100);

  const resultado = await estadoFila({ sb: getSupabaseReadOnly(), limite });
  return jsonResponse(resultado);
};

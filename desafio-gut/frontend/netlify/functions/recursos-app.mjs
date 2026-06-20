// recursos-app.mjs — MC29.1
//
// GET /.netlify/functions/recursos-app?plataforma=ios|android|pwa
//   → { plataforma, isLeilaoAtivo, isPagamentoNativoAtivo }
//
// Lê a config remota via o adapter data-store (Blob config-experiencia hoje,
// Supabase amanhã) e resolve os booleanos da plataforma. Fail-soft: erro de
// leitura → valores DEFAULT (PWA mantém o leilão ativo).
//
// Endpoint público de leitura (flags não são segredo). Sem rate-limit pesado:
// é chamado uma vez na inicialização do app.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { getConfig } from "./_lib/data-store.mjs";
import { resolverRecursos, normalizarPlataforma } from "./_lib/recursos-app-config.mjs";

export const CHAVE_RECURSOS = "recursos_app";

export default async (req) => {
  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }

  const url = new URL(req.url);
  const plataforma = normalizarPlataforma(url.searchParams.get("plataforma"));

  let config = null;
  try {
    config = await getConfig(CHAVE_RECURSOS);
  } catch (err) {
    console.warn("[recursos-app] leitura falhou (fail-soft → default):", err?.message);
  }

  return jsonResponse(resolverRecursos(config, plataforma));
};

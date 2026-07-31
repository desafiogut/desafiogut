// GET /.netlify/functions/admin-sessions                          [ADMIN]
// MC89.20 (Fase 7). Sessões admin ativas lidas do Blob admin-refresh.
// Super-admin vê todas; admin vê as suas. Sem cache.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { getAdminNivel } from "./_lib/admin-niveis.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import { getStore } from "@netlify/blobs";
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  const pf = respostaPreflight(req); if (pf) return pf;
  if (req.method !== "GET") return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  const rl = await aplicarRateLimit(req, "admin-sessions", 20); if (rl) return rl;

  const auth = await autenticarAdmin(req);
  if (!auth.ok) return jsonError(auth.code === "admin_removido" ? 403 : 401, auth.code, auth.message);
  const nivel = auth.payload?.nivel || "admin";
  const endereco = auth.endereco;

  const isSuper = nivel === "super-admin";
  const url = new URL(req.url);
  const filtroAdmin = isSuper ? (url.searchParams.get("admin") || null) : endereco;

  let admins = [];
  if (isSuper && !filtroAdmin) {
    admins = await getAdminAddresses();
  } else if (filtroAdmin) {
    admins = [filtroAdmin.toLowerCase()];
  } else {
    admins = [endereco];
  }

  const sessoes = [];
  for (const addr of admins) {
    try {
      const store = getStore({ name: "admin-refresh", consistency: "strong" });
      const data = await store.get(addr, { type: "json" });
      const tokens = Array.isArray(data?.tokens) ? data.tokens : [];
      for (const t of tokens) {
        sessoes.push({
          endereco: addr,
          jti: t.jti || null,
          createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
          expiresAt: t.expiresAt ? new Date(t.expiresAt).toISOString() : null,
          ip: t.ip || null,
          userAgent: t.userAgent || null,
          ultimoAcesso: t.ultimoAcesso || null,
        });
      }
    } catch { /* Blob pode estar cego — ignora este admin */ }
  }

  return jsonResponse({ sessoes, total: sessoes.length });
};

// Purge LGPD-aware — Mega Comando 3 / Item 2.
//
// Itera os Blob stores cobertos pela Política de Retenção
// (docs/lgpd-politica-retencao.md) e deleta entradas vencidas conforme:
//
//   audit-*          → 13 meses
//   pedidos          → 10 anos
//   webhook-mp-*     → 10 anos (entradas de webhook do Mercado Pago)
//   rate-limit       → 30 dias  (chaves estilo "ip:endpoint:minuto")
//   jwt-fail-counter → 30 dias
//   admin-refresh    → 30 dias  (entradas já filtradas por expiresAt, mas
//                                 removemos o blob por endereco se vazio)
//   consent-log      → 5 anos
//   fingerprint      → 24 horas
//
// Auth: admin-JWT (preferido) ou ADMIN_TOKEN legado. Idempotente.
// GET ?dryRun=1 → lista o que SERIA deletado sem persistir.
// POST          → executa.

import { getStore } from "@netlify/blobs";
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";

const POLITICA = {
  "audit":            { dias: 13 * 30, tsKey: "criadoEm" },
  "audit-admin":      { dias: 13 * 30, tsKey: "criadoEm" },
  "lance-idem":       { dias: 13 * 30, tsKey: "criadoEm" },
  "pedidos":          { dias: 10 * 365, tsKey: "criadoEm" },
  "webhook-mp":       { dias: 10 * 365, tsKey: "recebidoEm" },
  "rate-limit":       { dias: 30, tsFromKey: parseRateLimitKey },
  "jwt-fail-counter": { dias: 30, tsFromKey: parseJwtFailKey },
  "admin-refresh":    { dias: 30, tsKey: "atualizadoEm" },
  "consent-log":      { dias: 5 * 365, tsFromKey: parseConsentKey },
  "fingerprint":      { dias: 1, tsKey: "atualizadoEm" },
};

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[purge-logs] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

// rate-limit keys: "ip:endpoint:minuto" — minuto é epoch/60000.
function parseRateLimitKey(key) {
  const partes = String(key).split(":");
  const minuto = Number(partes[partes.length - 1]);
  if (!Number.isFinite(minuto)) return 0;
  return minuto * 60_000;
}
// jwt-fail-counter keys: "ip:minuto".
function parseJwtFailKey(key) {
  const partes = String(key).split(":");
  const minuto = Number(partes[partes.length - 1]);
  if (!Number.isFinite(minuto)) return 0;
  return minuto * 60_000;
}
// consent-log keys: "{timestamp}:{endereco}" — timestamp em ms.
function parseConsentKey(key) {
  const partes = String(key).split(":");
  const ts = Number(partes[0]);
  if (!Number.isFinite(ts)) return 0;
  return ts;
}

async function purgarStore(nome, cfg, agoraMs, dryRun) {
  const store = abrirStore(nome);
  if (!store) return { store: nome, status: "indisponivel", deleted: 0, kept: 0 };
  const cutoff = agoraMs - cfg.dias * 24 * 60 * 60 * 1000;
  let deleted = 0;
  let kept    = 0;
  try {
    const { blobs } = await store.list();
    for (const { key } of blobs) {
      let ts = 0;
      if (cfg.tsFromKey) {
        ts = cfg.tsFromKey(key);
      } else if (cfg.tsKey) {
        try {
          const obj = await store.get(key, { type: "json" });
          const raw = obj?.[cfg.tsKey];
          ts = raw ? new Date(raw).getTime() : 0;
        } catch { ts = 0; }
      }
      // Sem timestamp confiável → preserva (fail-closed para retenção).
      if (!ts) { kept += 1; continue; }
      if (ts >= cutoff) { kept += 1; continue; }
      if (!dryRun) {
        try { await store.delete(key); deleted += 1; }
        catch (err) { console.warn(`[purge-logs] delete ${nome}:${key} falhou:`, err?.message); }
      } else {
        deleted += 1; // simula
      }
    }
  } catch (err) {
    console.warn(`[purge-logs] list ${nome} falhou:`, err?.message);
    return { store: nome, status: "erro", message: err?.message, deleted, kept };
  }
  return { store: nome, status: "ok", deleted, kept, cutoffIso: new Date(cutoff).toISOString() };
}

// Exportado para que purge-logs-scheduled.mjs (cron Netlify) chame a lógica
// diretamente sem Request/admin gate.
export async function executar(dryRun) {
  const agoraMs = Date.now();
  const resultados = [];
  for (const [nome, cfg] of Object.entries(POLITICA)) {
    resultados.push(await purgarStore(nome, cfg, agoraMs, dryRun));
  }
  const sumario = {
    executadoEm: new Date(agoraMs).toISOString(),
    dryRun,
    totalStores: resultados.length,
    totalDeleted: resultados.reduce((s, r) => s + (r.deleted || 0), 0),
    totalKept:    resultados.reduce((s, r) => s + (r.kept    || 0), 0),
  };

  // Marca última execução (não dryRun) em store próprio para auditoria.
  if (!dryRun) {
    const meta = abrirStore("purge-logs-meta");
    if (meta) {
      try { await meta.setJSON("ultima-execucao", { ...sumario, resultados }); }
      catch (err) { console.warn("[purge-logs] persistir meta falhou:", err?.message); }
    }
  }

  console.info("[purge-logs] concluído", sumario);
  return { ok: true, ...sumario, resultados };
}

export default async (req) => {
  const rl = await aplicarRateLimit(req, "purge-logs", 6);
  if (rl) return rl;
  const denied = await guardAdmin(req);
  if (denied) return denied;

  const url    = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  if (req.method === "GET") {
    return jsonResponse(await executar(true));
  }
  if (req.method === "POST") {
    return jsonResponse(await executar(dryRun));
  }
  return jsonError(405, "metodo_invalido", "use GET (dryRun) ou POST", { allowed: ["GET", "POST"] });
};

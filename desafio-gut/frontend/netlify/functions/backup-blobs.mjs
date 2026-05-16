// backup-blobs.mjs — Mega Comando 6 / Item 2.
//
// Diariamente serializa os Blob stores críticos do projeto em UMA chave
// dentro do store "backups", facilitando restauração ponto-a-ponto.
// Fase 1 (esta): backup armazenado no próprio Netlify Blobs (auto-backup).
// Fase 2 (futuro, doc em docs/backup-blobs.md): upload para S3.
//
// Padrão idêntico ao purge-logs.mjs (MC3):
//   - executar() exportada → chamada pelo wrapper -scheduled (cron Netlify)
//   - handler HTTP default: admin-gated + rate-limit, GET=list, POST=run
//
// Retenção: 30 dias (RETENCAO_DIAS). GC executado ao final de cada run.

import { getStore } from "@netlify/blobs";
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";

// Stores cobertos pelo backup. Exclui:
//   - "backups" (recursão evidente)
//   - "rate-limit" e "jwt-fail-counter" (ephemeral; alto churn, baixo valor)
//   - "purge-logs-meta" (apenas observabilidade do purge; rebuild fácil)
const STORES_PARA_BACKUP = [
  "audit",
  "audit-admin",
  "lance-idem",
  "pedidos",
  "webhook-mp",
  "consent-log",
  "admin-refresh",
  "fingerprint",
];

const BACKUP_STORE   = "backups";
const RETENCAO_DIAS  = 30;

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[backup-blobs] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

async function dumpStore(nome) {
  const store = abrirStore(nome);
  if (!store) return { status: "indisponivel", keys: 0, bytes: 0, entries: {} };
  let keys = 0;
  let bytes = 0;
  const entries = {};
  try {
    const { blobs } = await store.list();
    for (const { key } of blobs) {
      try {
        const val = await store.get(key, { type: "json" });
        if (val !== null && val !== undefined) {
          entries[key] = val;
          keys += 1;
          bytes += JSON.stringify(val).length;
        }
      } catch (err) {
        console.warn(`[backup-blobs] read ${nome}:${key} falhou:`, err?.message);
      }
    }
    return { status: "ok", keys, bytes, entries };
  } catch (err) {
    console.warn(`[backup-blobs] list ${nome} falhou:`, err?.message);
    return { status: "erro", message: err?.message, keys, bytes, entries };
  }
}

// Remove backups com mais de RETENCAO_DIAS. Falhas aqui não derrubam o backup.
async function purgarBackupsAntigos(agoraMs) {
  const store = abrirStore(BACKUP_STORE);
  if (!store) return { status: "indisponivel", deleted: 0 };
  const cutoff = agoraMs - RETENCAO_DIAS * 24 * 60 * 60 * 1000;
  let deleted = 0;
  try {
    const { blobs } = await store.list();
    for (const { key } of blobs) {
      // chave: "backup:YYYY-MM-DD" → parse a data
      const partes = String(key).split(":");
      if (partes[0] !== "backup" || partes.length < 2) continue;
      const ts = Date.parse(partes[1]);
      if (!Number.isFinite(ts)) continue;
      if (ts < cutoff) {
        try { await store.delete(key); deleted += 1; }
        catch (err) { console.warn(`[backup-blobs] gc delete ${key} falhou:`, err?.message); }
      }
    }
  } catch (err) {
    console.warn("[backup-blobs] gc list falhou:", err?.message);
  }
  return { status: "ok", deleted, cutoffIso: new Date(cutoff).toISOString() };
}

// Função business — chamada pelo cron wrapper E pelo handler HTTP.
export async function executar() {
  const inicio = Date.now();
  const dump = {
    criadoEm: new Date(inicio).toISOString(),
    versao: 1,
    stores: {},
  };
  let totalKeys = 0;
  let totalBytes = 0;
  const sumarioStores = [];

  for (const nome of STORES_PARA_BACKUP) {
    const r = await dumpStore(nome);
    dump.stores[nome] = r.entries;
    totalKeys += r.keys;
    totalBytes += r.bytes;
    sumarioStores.push({ store: nome, status: r.status, keys: r.keys, bytes: r.bytes });
  }

  // Chave do backup: "backup:YYYY-MM-DD" (UTC).
  const data = new Date(inicio).toISOString().slice(0, 10);
  const key  = `backup:${data}`;

  const backupStore = abrirStore(BACKUP_STORE);
  if (!backupStore) {
    return { ok: false, erro: "BACKUP_STORE indisponível" };
  }
  await backupStore.setJSON(key, dump);

  const gc = await purgarBackupsAntigos(inicio);

  const sumario = {
    ok: true,
    key,
    totalStores: STORES_PARA_BACKUP.length,
    totalKeys,
    totalBytes,
    duracaoMs: Date.now() - inicio,
    gc,
    stores: sumarioStores,
  };
  console.info("[backup-blobs] concluído", sumario);
  return sumario;
}

export default async (req) => {
  const rl = await aplicarRateLimit(req, "backup-blobs", 3);
  if (rl) return rl;
  const denied = await guardAdmin(req);
  if (denied) return denied;

  if (req.method === "POST") {
    return jsonResponse(await executar());
  }

  if (req.method === "GET") {
    const store = abrirStore(BACKUP_STORE);
    if (!store) return jsonError(503, "store_indisponivel", "Blobs backups offline");
    try {
      const { blobs } = await store.list();
      const keys = blobs.map(b => b.key).sort().reverse(); // mais recente primeiro
      return jsonResponse({ ok: true, total: keys.length, backups: keys });
    } catch (err) {
      return jsonError(500, "list_falhou", err?.message || "erro ao listar");
    }
  }

  return jsonError(405, "metodo_invalido", "use GET (lista) ou POST (executa)", { allowed: ["GET", "POST"] });
};

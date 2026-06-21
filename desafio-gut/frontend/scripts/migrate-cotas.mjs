// scripts/migrate-cotas.mjs — MC37: migração de cotas (Netlify Blobs → Supabase).
//
// Lê um ndjson de {key, value} (dump do store Blob `cotas`, ex.: o backup) e faz
// upsertCota(key, registro) via cotas-store (escrita só Supabase, R11). O `cnpj`
// vem dentro de cada registo → coluna cnpj auto-populada (anti-duplicidade).
// cotas-cnpj/cotas-fingerprint NÃO são migrados: o índice CNPJ é derivado e o
// fingerprint (24h, efémero) é coberto pelo fallback de leitura até expirar.
//
// Uso:
//   set -a; . <env-com-SUPABASE_URL+SERVICE_ROLE>; set +a
//   node scripts/migrate-cotas.mjs --file <ndjson> [--dry-run]
//
// Sai com código 1 se houver falhas (para travar o pipeline).
import { readFileSync } from "node:fs";
import { upsertCota } from "../netlify/functions/_lib/cotas-store.mjs";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const fi = args.indexOf("--file");
const file = fi >= 0 ? args[fi + 1] : null;
if (!file) { console.error("ERRO: --file <ndjson> obrigatório"); process.exit(2); }

const linhas = readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
let vistos = 0, ok = 0, falhas = 0;

for (const l of linhas) {
  let rec;
  try { rec = JSON.parse(l); } catch { console.warn("[skip] linha não-JSON"); falhas++; continue; }
  const key = rec.key;
  let val = rec.value;
  if (typeof val === "string") { try { val = JSON.parse(val); } catch { /* mantém string */ } }
  if (!key || !val || typeof val !== "object") { console.warn("[skip] registo inválido:", key); falhas++; continue; }
  vistos++;
  const resumo = { cliente_id: key, tipo: val.tipo ?? null, categoria: val.categoria ?? null, vendida: !!val.vendida, temCnpj: !!val.cnpj };
  if (dry) { console.log("[dry-run] upsert", JSON.stringify(resumo)); ok++; continue; }
  try { await upsertCota(key, val); ok++; console.log("[ok]", JSON.stringify(resumo)); }
  catch (e) { falhas++; console.error("[erro]", key, "→", e.message); }
}

console.log(`\nRESUMO: vistos=${vistos} ok=${ok} falhas=${falhas}${dry ? "  (DRY-RUN — nada escrito)" : ""}`);
process.exit(falhas > 0 ? 1 : 0);

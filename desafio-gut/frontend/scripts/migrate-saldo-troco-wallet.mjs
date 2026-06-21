// scripts/migrate-saldo-troco-wallet.mjs — MC36.1: migração financeira (Blobs → Supabase).
//
// Lê dumps ndjson de {key, value} dos stores Blob e faz upsert no Supabase via os
// *-store.mjs (escrita só Supabase, R11; payload preservado byte-a-byte). Em prod só
// saldo-rs (5) e saldo-rs-creditos (8) têm dados; troco-senhas/wallet/wallet-idem
// estão vazios (nada a migrar — schema só).
//
// Uso:
//   set -a; . <env-com-SUPABASE_URL+SERVICE_ROLE>; set +a
//   node scripts/migrate-saldo-troco-wallet.mjs --dir <backup-dir> [--dry-run]
//
// Sai com código 1 se houver falhas.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { setSaldo, setCredito, setDebito } from "../netlify/functions/_lib/saldoRs-store.mjs";
import { setTroco } from "../netlify/functions/_lib/troco-senhas-store.mjs";
import { setWallet, setWalletIdem } from "../netlify/functions/_lib/wallet-store.mjs";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const di = args.indexOf("--dir");
const dir = di >= 0 ? args[di + 1] : null;
if (!dir) { console.error("ERRO: --dir <backup-dir> obrigatório"); process.exit(2); }

// store-file → função de upsert (key = chave do Blob; value = payload)
const PLANO = [
  { file: "saldo-rs.ndjson",          set: setSaldo },
  { file: "saldo-rs-creditos.ndjson", set: setCredito },
  { file: "saldo-rs-debitos.ndjson",  set: setDebito },
  { file: "troco-senhas.ndjson",      set: setTroco },
  { file: "wallet.ndjson",            set: setWallet },
  { file: "wallet-idem.ndjson",       set: setWalletIdem },
];

let totalVistos = 0, totalOk = 0, totalFalhas = 0;
for (const { file, set } of PLANO) {
  const path = join(dir, file);
  if (!existsSync(path)) { console.log(`[skip] ${file} ausente (store vazio)`); continue; }
  const linhas = readFileSync(path, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
  let ok = 0, falhas = 0;
  for (const l of linhas) {
    let rec; try { rec = JSON.parse(l); } catch { console.warn(`[skip] ${file}: linha não-JSON`); falhas++; continue; }
    let val = rec.value;
    if (typeof val === "string") { try { val = JSON.parse(val); } catch { /* mantém */ } }
    if (!rec.key || val == null) { console.warn(`[skip] ${file}: registo inválido`, rec.key); falhas++; continue; }
    totalVistos++;
    if (dry) { console.log(`[dry-run] ${file}: upsert ${String(rec.key).slice(0, 12)}…`); ok++; continue; }
    try { await set(rec.key, val); ok++; }
    catch (e) { falhas++; console.error(`[erro] ${file} ${rec.key} → ${e.message}`); }
  }
  console.log(`${file}: ok=${ok} falhas=${falhas}`);
  totalOk += ok; totalFalhas += falhas;
}
console.log(`\nRESUMO: vistos=${totalVistos} ok=${totalOk} falhas=${totalFalhas}${dry ? "  (DRY-RUN)" : ""}`);
process.exit(totalFalhas > 0 ? 1 : 0);

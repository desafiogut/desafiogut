// E2E: iniciar-pagamento → confirmar-pagamento → assert saldoSenhas++ on-chain.
// Faz crédito REAL na Sepolia (custa gas). Use qtd=1 para minimizar.
//
// Uso:
//   node scripts/check-confirmar-pagamento.mjs                      # endereco e qtd default
//   node scripts/check-confirmar-pagamento.mjs 0xABC... 1
//
// Requisitos no .env.local: COORDENACAO_PRIVATE_KEY, RPC_URL.
// Idempotência via Blobs SÓ funciona com `netlify dev` ou em produção.
// Em local puro (sem netlify dev), o segundo confirm tenta creditar de novo.
// O script PULA o teste de idempotência fora do ambiente Netlify.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoFrontend = resolve(__dirname, "..");

// Carrega .env.local manualmente (sem nova dep).
try {
  const env = readFileSync(resolve(repoFrontend, ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const ENDERECO_DEFAULT = "0xE1a0F02AC3aaB22946b0D9f33Eb0A8fDAc812a4d";
const [enderecoArg, qtdArg] = process.argv.slice(2);
const endereco = enderecoArg || ENDERECO_DEFAULT;
const qtd = qtdArg ? Number(qtdArg) : 1;

console.log(`Endereço alvo: ${endereco}`);
console.log(`Quantidade: ${qtd} ficha(s) ⇒ R$ ${(qtd * 2).toFixed(2)}`);

// ── 1. iniciar-pagamento ───────────────────────────────────────────────────
const iniciarUrl  = pathToFileURL(resolve(repoFrontend, "netlify/functions/iniciar-pagamento.mjs")).href;
const confirmarUrl = pathToFileURL(resolve(repoFrontend, "netlify/functions/confirmar-pagamento.mjs")).href;
const contractUrl = pathToFileURL(resolve(repoFrontend, "netlify/functions/_lib/contract.mjs")).href;

const { default: iniciar } = await import(iniciarUrl);
const { default: confirmar } = await import(confirmarUrl);
const { lerSaldoSenhas } = await import(contractUrl);

console.log("\n[1] iniciar-pagamento");
const iniciarReq = new Request("http://localhost/iniciar-pagamento", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ endereco, qtd }),
});
const iniciarRes = await iniciar(iniciarReq, {});
const iniciarJson = await iniciarRes.json();
console.log("  status:", iniciarRes.status);
console.log("  pedidoId:", iniciarJson.pedidoId);
console.log("  valorBRL:", iniciarJson.valorBRL);
console.log("  provider:", iniciarJson.provider);
if (iniciarRes.status !== 200 || !iniciarJson.token) {
  console.error("FAIL: iniciar-pagamento não retornou 200/token");
  process.exit(1);
}

// ── 2. saldo antes (leitura direta on-chain pra crosscheck) ────────────────
console.log("\n[2] leitura on-chain antes");
const saldoAntes = await lerSaldoSenhas(endereco);
console.log("  saldoSenhas[", endereco, "] =", saldoAntes);

// ── 3. confirmar-pagamento (crédito real na Sepolia) ───────────────────────
console.log("\n[3] confirmar-pagamento (crédito on-chain)");
console.log("  ⏳ aguardando 1 confirmação...");
const t0 = Date.now();
const confirmarReq = new Request("http://localhost/confirmar-pagamento", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token: iniciarJson.token }),
});
const confirmarRes = await confirmar(confirmarReq, {});
const confirmarJson = await confirmarRes.json();
const t1 = Date.now();

console.log("  status:", confirmarRes.status);
console.log("  duração:", ((t1 - t0) / 1000).toFixed(1), "s");
if (confirmarRes.status !== 200) {
  console.error("FAIL: confirmar-pagamento status ≠ 200:", JSON.stringify(confirmarJson));
  process.exit(1);
}
console.log("  ok:", confirmarJson.ok);
console.log("  idempotent:", confirmarJson.idempotent);
console.log("  txHash:", confirmarJson.txHash);
console.log("  blockNumber:", confirmarJson.blockNumber);
console.log("  saldoAntes:", confirmarJson.saldoAntes, "→ saldoDepois:", confirmarJson.saldoDepois);
console.log("  etherscan:", confirmarJson.etherscanUrl);

// ── 4. asserts ─────────────────────────────────────────────────────────────
let failed = false;
function expect(name, cond, detail) {
  if (cond) console.log(`  ✓ ${name}`);
  else { console.error(`  ✗ FAIL ${name}: ${detail}`); failed = true; }
}

console.log("\n[4] asserts");
expect("ok=true", confirmarJson.ok === true, confirmarJson.ok);
expect("txHash 0x+64hex", /^0x[0-9a-f]{64}$/i.test(confirmarJson.txHash || ""), confirmarJson.txHash);
expect("saldoDepois - saldoAntes === qtd", confirmarJson.saldoDepois - confirmarJson.saldoAntes === qtd,
  `${confirmarJson.saldoDepois} - ${confirmarJson.saldoAntes} ≠ ${qtd}`);
expect("saldoAntes === leitura direta", confirmarJson.saldoAntes === saldoAntes,
  `${confirmarJson.saldoAntes} ≠ ${saldoAntes}`);
expect("blockNumber > 0", confirmarJson.blockNumber > 0, confirmarJson.blockNumber);

// Cross-check: lê o saldo de novo agora, deve estar igual ao saldoDepois
const saldoFinal = await lerSaldoSenhas(endereco);
expect("re-leitura on-chain === saldoDepois", saldoFinal === confirmarJson.saldoDepois,
  `${saldoFinal} ≠ ${confirmarJson.saldoDepois}`);

if (failed) { console.error("\nFAIL"); process.exit(1); }
console.log("\nOK: crédito on-chain validado E2E. Saldo na Sepolia atualizou de", saldoAntes, "para", saldoFinal, ".");

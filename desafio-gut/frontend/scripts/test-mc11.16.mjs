#!/usr/bin/env node
// MC11.16 — Validação do shim para a dep opcional `@farcaster/mini-app-solana`
// que o Privy SDK referencia mas não está instalada. O shim + alias resolvem
// o throw `Could not resolve "@farcaster/mini-app-solana"` em runtime.
//
// Pré-requisito: rodar `npm run build` antes deste script.
//
// 9 checks:
//   1. Shim existe em src/shims/farcaster-mini-app-solana.js
//   2. vite.config.js contém alias para "@farcaster/mini-app-solana"
//   3. Chunk Privy dedicado (privy-*.js) único e contém APIs públicas
//      (usePrivy/useWallets/PrivyProvider). Equivalente moderno do
//      "useActiveWallet+PrivyPluginContext mesmo chunk" — após MC11.15 esses
//      símbolos internos são minificados e desaparecem do grep literal.
//   4. Bundle: 0 ocorrências de "Cannot access"
//   5. Bundle: 0 ocorrências de "Could not resolve"
//   6. Build verde (dist/index.html + privy chunk existem)
//   7. HEAD prod / → 200
//   8. HEAD prod /seja-nosso-parceiro → 200
//   9. manualChunks de MC11.15 preservado em vite.config.js (sem regressão)
//
// Uso: npm run build && node scripts/test-mc11.16.mjs

import { readFile, stat, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, "..");

const PROD_BASE = "https://silly-stardust-ca71bc.netlify.app";
const PROD_PARC = `${PROD_BASE}/seja-nosso-parceiro`;

const RESULTS = [];
function reg(ok, descricao, detalhe = "") {
  RESULTS.push({ ok, descricao, detalhe });
  console.log(`${ok ? "✅" : "❌"} ${descricao}${detalhe ? "  ·  " + detalhe : ""}`);
}
async function lerArquivo(rel) { return readFile(resolve(ROOT, rel), "utf8"); }
async function existe(rel)    { try { await stat(resolve(ROOT, rel)); return true; } catch { return false; } }
async function lerBundle() {
  const distDir = resolve(ROOT, "dist/assets");
  let arquivos = [];
  try { arquivos = (await readdir(distDir)).filter((f) => f.endsWith(".js")); }
  catch { return []; }
  const out = [];
  for (const f of arquivos) out.push({ f, src: await readFile(join(distDir, f), "utf8") });
  return out;
}

// ── 1. Shim existe ────────────────────────────────────────────────────────────
{
  const ok = await existe("src/shims/farcaster-mini-app-solana.js");
  reg(ok, "Shim src/shims/farcaster-mini-app-solana.js existe");
}

// ── 2. vite.config.js contém alias para @farcaster/mini-app-solana ───────────
{
  const viteCfg = await lerArquivo("vite.config.js");
  // alias presente E aponta para arquivo de shim
  const okAlias = /@farcaster\/mini-app-solana/.test(viteCfg);
  const okPath  = /shims\/farcaster-mini-app-solana/.test(viteCfg);
  reg(okAlias && okPath,
    "vite.config.js: alias para @farcaster/mini-app-solana → shim",
    `aliasKey=${okAlias}, shimPath=${okPath}`);
}

// ── 3. Chunk Privy dedicado + APIs públicas presentes ────────────────────────
{
  const bundle = await lerBundle();
  const privyChunks = bundle.filter((b) => /^privy-[^/]+\.js$/.test(b.f));
  const okUm   = privyChunks.length === 1;
  const okTam  = okUm && privyChunks[0].src.length > 500_000;
  const okApi  = okUm && /usePrivy|useWallets|PrivyProvider/.test(privyChunks[0].src);
  reg(okUm && okTam && okApi,
    "Privy SDK consolidado no chunk privy-*.js",
    okUm ? `${privyChunks[0].f} (${(privyChunks[0].src.length/1024).toFixed(0)} KB, APIs públicas: ${okApi})`
         : `${privyChunks.length} chunks privy-*.js encontrados`);
}

// ── 4. Bundle: 0 "Cannot access" ─────────────────────────────────────────────
{
  const bundle = await lerBundle();
  const hits = bundle.filter((b) => b.src.includes("Cannot access"));
  reg(hits.length === 0,
    "Bundle dist/assets/*.js: 0 'Cannot access'",
    hits.length ? `em: ${hits.map(h=>h.f).join(", ")}` : "");
}

// ── 5. Bundle: 0 "Could not resolve" ─────────────────────────────────────────
{
  const bundle = await lerBundle();
  const hits = bundle.filter((b) => b.src.includes("Could not resolve"));
  reg(hits.length === 0,
    "Bundle dist/assets/*.js: 0 'Could not resolve'",
    hits.length ? `em: ${hits.map(h=>h.f).join(", ")}` : "");
}

// ── 6. Build verde (índice + privy chunk existem) ────────────────────────────
{
  const okHtml = await existe("dist/index.html");
  let okPrivy = false;
  try {
    const files = await readdir(resolve(ROOT, "dist/assets"));
    okPrivy = files.some((f) => /^privy-[^/]+\.js$/.test(f));
  } catch {}
  reg(okHtml && okPrivy,
    "Build verde (dist/index.html + dist/assets/privy-*.js)",
    `index.html=${okHtml}, privy chunk=${okPrivy}`);
}

// ── 7. HEAD prod / → 200 ─────────────────────────────────────────────────────
try {
  const r = await fetch(PROD_BASE, { method: "HEAD" });
  reg(r.status === 200, `HEAD ${PROD_BASE}`, `HTTP ${r.status}`);
} catch (err) {
  reg(false, `HEAD ${PROD_BASE}`, `erro: ${err.message}`);
}

// ── 8. HEAD prod /seja-nosso-parceiro → 200 ──────────────────────────────────
try {
  const r = await fetch(PROD_PARC, { method: "HEAD" });
  reg(r.status === 200, `HEAD ${PROD_PARC}`, `HTTP ${r.status}`);
} catch (err) {
  reg(false, `HEAD ${PROD_PARC}`, `erro: ${err.message}`);
}

// ── 9. manualChunks de MC11.15 preservado (regressão) ────────────────────────
{
  const viteCfg = await lerArquivo("vite.config.js");
  const ok = /\bmanualChunks\b/.test(viteCfg)
          && /@privy-io\/react-auth/.test(viteCfg);
  reg(ok, "MC11.15 preservado: manualChunks + @privy-io/react-auth no vite.config.js");
}

// ── Resumo ───────────────────────────────────────────────────────────────────
const total = RESULTS.length;
const okN   = RESULTS.filter((r) => r.ok).length;
console.log(`\n— Resultado: ${okN}/${total} checks passaram.`);
if (okN !== total) {
  console.log("Falhas:");
  RESULTS.filter((r) => !r.ok).forEach((r) =>
    console.log("  ❌ " + r.descricao + (r.detalhe ? " · " + r.detalhe : "")),
  );
  process.exit(1);
}
console.log("✅ MC11.16 — fix validado localmente. Pronto para deploy (aguardar aprovação).");

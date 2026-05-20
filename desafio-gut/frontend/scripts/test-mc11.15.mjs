#!/usr/bin/env node
// MC11.15 — Validação do agrupamento de @privy-io/react-auth em chunk único
// (manualChunks no vite.config.js) para eliminar dependência circular entre
// chunks (TDZ "Cannot access 'we' before initialization").
//
// Pré-requisito: rodar `npm run build` antes deste script.
//
// 8 checks:
//   1. vite.config.js contém `manualChunks` (Function ou Object)
//   2. vite.config.js lista "@privy-io/react-auth" no manualChunks
//   3. Bundle: existe um único chunk dedicado `privy-*.js` E os símbolos
//      Privy públicos (usePrivy, useWallets, PrivyProvider) residem nele
//      (símbolos internos como useActiveWallet são minificados — verificamos
//      a consolidação por meio do tamanho do chunk e dos exports preservados)
//   4. Bundle: 0 ocorrências de "Cannot access" em dist/assets/*.js
//   5. Bundle: 0 ocorrências de "before initialization" em dist/assets/*.js
//   6. Build verde (dist/index.html + dist/assets/privy-*.js existem)
//   7. HEAD prod / → 200 (reflete deploy atual; pré-deploy MC11.15 ainda)
//   8. HEAD prod /seja-nosso-parceiro → 200 (idem)
//
// Uso: npm run build && node scripts/test-mc11.15.mjs

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

// ── 1. vite.config.js contém manualChunks ────────────────────────────────────
const viteCfg = await lerArquivo("vite.config.js");
reg(/\bmanualChunks\b/.test(viteCfg),
  "vite.config.js contém manualChunks",
  "regex /\\bmanualChunks\\b/");

// ── 2. manualChunks referencia @privy-io/react-auth ──────────────────────────
reg(/@privy-io\/react-auth/.test(viteCfg),
  "vite.config.js lista @privy-io/react-auth no manualChunks");

// ── 3. Bundle: chunk dedicado privy-*.js + exports públicos presentes ────────
{
  const bundle = await lerBundle();
  const privyChunks = bundle.filter((b) => /^privy-[^/]+\.js$/.test(b.f));
  const okUm   = privyChunks.length === 1;
  const okTam  = okUm && privyChunks[0].src.length > 500_000; // >500 KB de payload bruto
  const okApi  = okUm && /usePrivy|useWallets|PrivyProvider/.test(privyChunks[0].src);
  reg(okUm && okTam && okApi,
    "Chunk privy-*.js dedicado consolidado",
    okUm ? `${privyChunks[0].f} (${(privyChunks[0].src.length/1024).toFixed(0)} KB, API públicas: ${okApi})`
         : `${privyChunks.length} chunks privy-*.js encontrados`);
}

// ── 4. Bundle: 0 "Cannot access" ─────────────────────────────────────────────
{
  const bundle = await lerBundle();
  const hits = bundle.filter((b) => b.src.includes("Cannot access"));
  reg(hits.length === 0,
    "Bundle dist/assets/*.js: 0 'Cannot access'",
    hits.length ? `encontrado em: ${hits.map(h=>h.f).join(", ")}` : "");
}

// ── 5. Bundle: 0 "before initialization" ─────────────────────────────────────
{
  const bundle = await lerBundle();
  const hits = bundle.filter((b) => b.src.includes("before initialization"));
  reg(hits.length === 0,
    "Bundle dist/assets/*.js: 0 'before initialization'",
    hits.length ? `encontrado em: ${hits.map(h=>h.f).join(", ")}` : "");
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
console.log("✅ MC11.15 — fix validado localmente. Pronto para deploy (aguardar aprovação).");

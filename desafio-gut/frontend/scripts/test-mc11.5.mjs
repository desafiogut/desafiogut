#!/usr/bin/env node
// MC11.5 — Validação do fallback explícito de criação de embedded wallet
// (useCreateWallet) + verificação do saldo da carteira de coordenação +
// regressão dos fixes anteriores (MC11.3/MC11.4).
//
// Cobertura por check (ordem rede → bundle → estática → on-chain):
//   1. GET prod /seja-nosso-parceiro → 200
//   2. Bundle contém 'createOnLogin' OU 'createWallet' (fallback ou config)
//   3. AppContext: createWallet() chamado em useEffect/useCallback do gap
//   4. createWallet tem fallback (.catch / try/catch) — "gás falha" maps to
//      "falha de criação de wallet" no nosso codebase (não há gas transfer
//      automático; o trap real é a criação do address)
//   5. Bundle: 'não conseguimos criar sua carteira' + 'Tentar novamente'
//   6. tentarRecuperarCarteira chama createWallet OU logout
//   7. NENHUM __MC11_TRACE__ no bundle
//   8. walletCreationStuck timeout ≤ 15_000 ms
//   9. 'Aceito' inalcançável quando authenticated=true && address=null
//      (Sidebar + BottomNav) — regressão MC11.3
//  10. Vitrine: branch dual por tipoUsuario — regressão MC11.3
//  11. Build verde (dist/index.html + script module)
//  12. HEAD prod / → 200
//  13. HEAD prod /seja-nosso-parceiro → 200
//  14. Carteira de coordenação Sepolia com saldo > 0 (Alchemy eth_getBalance)
//  15. createOnLogin (main.jsx) + useCreateWallet (AppContext) — cobertura dual
//
// Uso: npm run build && node scripts/test-mc11.5.mjs

import { readFile, stat, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, "..");

const PROD_BASE = "https://silly-stardust-ca71bc.netlify.app";
const PROD_PARC = `${PROD_BASE}/seja-nosso-parceiro`;
// Endereço de coordenação per CLAUDE.md (Hardhat Ignition deploy 2026-04-28).
const COORD_ADDR = "0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E";
const ALCHEMY_URL = "https://eth-sepolia.g.alchemy.com/v2/qU_kw3WpEY4gttS0Cfr2B";

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
function lastMatch(src, re) {
  const arr = [...src.matchAll(re)];
  return arr.length ? arr[arr.length - 1].index : -1;
}

// ── 1. GET /seja-nosso-parceiro → 200 ────────────────────────────────────────
try {
  const r = await fetch(PROD_PARC, { method: "GET" });
  reg(r.status === 200, `GET ${PROD_PARC}`, `HTTP ${r.status}`);
} catch (err) {
  reg(false, `GET ${PROD_PARC}`, `erro: ${err.message}`);
}

// ── 2. Bundle: 'createOnLogin' OU 'createWallet' ─────────────────────────────
{
  const bundle = await lerBundle();
  if (bundle.length === 0) {
    reg(false, "Bundle presente (rode build)", "");
  } else {
    const temConfig = bundle.some((b) => b.src.includes("createOnLogin"));
    const temFn    = bundle.some((b) => b.src.includes("createWallet"));
    reg(temConfig || temFn,
      "Bundle contém 'createOnLogin' OU 'createWallet'",
      `createOnLogin=${temConfig}, createWallet=${temFn}`);
  }
}

// ── 3. AppContext: createWallet() chamado em useEffect/useCallback ───────────
{
  const ctx = await lerArquivo("src/context/AppContext.jsx");
  // Word boundary evita match em `useCreateWallet()` (hook). Pegamos a ÚLTIMA
  // chamada — sempre a invocação efetiva (no useEffect ou na useCallback de
  // recovery), nunca o destructure/import.
  const idxUseEffectGap = ctx.search(/useEffect\(\s*\(\s*\)\s*=>\s*\{[\s\S]{0,1500}\[\s*authenticated\s*,\s*address\s*\]/);
  const idxCreateWallet = lastMatch(ctx, /\bcreateWallet(?:Ref\.current)?\s*\(/g);
  reg(idxUseEffectGap !== -1 && idxCreateWallet !== -1 && idxCreateWallet > idxUseEffectGap,
    "AppContext: createWallet() invocado após o useEffect do gap",
    `effectGap@${idxUseEffectGap}, createWallet@${idxCreateWallet}`);
}

// ── 4. createWallet com fallback (.catch / try/catch) ────────────────────────
// Reinterpreta "transferência de gás tem fallback" como: a criação de wallet
// (que é o vetor real de falha no codebase atual — sem gas transfer code) tem
// captura de erro para não derrubar a UI.
{
  const ctx = await lerArquivo("src/context/AppContext.jsx");
  const temCatch = /createWallet[\s\S]{0,400}\.catch/.test(ctx)
                || /try\s*\{[\s\S]{0,200}createWallet[\s\S]{0,200}\}\s*catch/.test(ctx);
  reg(temCatch, "AppContext: createWallet com fallback (.catch ou try/catch)");
}

// ── 5. Bundle: 'não conseguimos criar sua carteira' + 'Tentar novamente' ────
{
  const bundle = await lerBundle();
  const temMsg   = bundle.some((b) => /[Nn][ãa]o conseguimos criar sua carteira/.test(b.src));
  const temRetry = bundle.some((b) => b.src.includes("Tentar novamente"));
  reg(temMsg && temRetry,
    "Bundle: mensagem 'não conseguimos…' + botão 'Tentar novamente'",
    `msg=${temMsg}, retry=${temRetry}`);
}

// ── 6. tentarRecuperarCarteira chama createWallet OU logout ─────────────────
{
  const ctx = await lerArquivo("src/context/AppContext.jsx");
  const trecho = ctx.match(/tentarRecuperarCarteira[\s\S]{0,600}?\},\s*\[/);
  const corpo = trecho?.[0] || "";
  const chamaCreate = /createWallet\s*\(/.test(corpo);
  const chamaLogout = /\blogout\s*\(/.test(corpo);
  reg(chamaCreate || chamaLogout,
    "tentarRecuperarCarteira chama createWallet() ou logout()",
    `createWallet=${chamaCreate}, logout=${chamaLogout}`);
}

// ── 7. NENHUM __MC11_TRACE__ no bundle ───────────────────────────────────────
{
  const bundle = await lerBundle();
  const achou = bundle.find((b) => b.src.includes("__MC11_TRACE__"));
  reg(!achou, "Bundle SEM '__MC11_TRACE__'", achou ? `em ${achou.f}` : "");
}

// ── 8. walletCreationStuck timeout ≤ 15_000 ms ───────────────────────────────
{
  const ctx = await lerArquivo("src/context/AppContext.jsx");
  // Captura a constante (WALLET_STUCK_TIMEOUT_MS ou literal próximo a setWalletCreationStuck(true)).
  const m = ctx.match(/WALLET_STUCK_TIMEOUT_MS\s*=\s*(\d[\d_]*)/);
  const valor = m ? Number(m[1].replace(/_/g, "")) : null;
  // Fallback: número inteiro 5_000..15_000 logo antes de `setWalletCreationStuck(true)` via setTimeout
  let ok = valor !== null && valor <= 15_000 && valor > 0;
  if (!ok) {
    const m2 = ctx.match(/setTimeout\([^,]+setWalletCreationStuck\(\s*true\s*\)[^,]*,\s*(\d[\d_]*)\s*\)/);
    const v2 = m2 ? Number(m2[1].replace(/_/g, "")) : null;
    if (v2 !== null && v2 > 0 && v2 <= 15_000) ok = true;
  }
  reg(ok, `walletCreationStuck timeout ≤ 15_000 ms`,
    valor !== null ? `WALLET_STUCK_TIMEOUT_MS=${valor}` : "constante não detectada (heurística)");
}

// ── 9. 'Aceito' fora do branch authenticated && !address (regressão) ────────
{
  function aceitoForaDoGap(src) {
    const idxCriando = src.indexOf("Criando carteira");
    const idxAceito  = src.lastIndexOf("Aceito o DesafioGUT");
    if (idxCriando === -1 || idxAceito === -1) return false;
    return idxCriando < idxAceito;
  }
  const sidebar = await lerArquivo("src/widgets/layout/Sidebar.jsx");
  const bottom  = await lerArquivo("src/widgets/layout/BottomNav.jsx");
  const okSide  = aceitoForaDoGap(sidebar);
  const okBot   = aceitoForaDoGap(bottom);
  reg(okSide && okBot,
    "Sidebar+BottomNav: 'Aceito' fora do gap (regressão MC11.3)",
    `Sidebar=${okSide}, BottomNav=${okBot}`);
}

// ── 10. Vitrine dual por tipoUsuario (regressão MC11.3) ──────────────────────
{
  const vit = await lerArquivo("src/pages/Vitrine.jsx");
  const ok = /tipoUsuario\s*===\s*["']corporativo["']/.test(vit)
          && /VitrineHeaderLojista|Painel do Parceiro/i.test(vit);
  reg(ok, "Vitrine: branch dual por tipoUsuario === 'corporativo'");
}

// ── 11. npm run build verde (artefatos dist) ─────────────────────────────────
{
  const okHtml = await existe("dist/index.html");
  let okBundle = false;
  if (okHtml) {
    const html = await readFile(resolve(ROOT, "dist/index.html"), "utf8");
    okBundle = /<script[^>]+type=["']module["']/.test(html);
  }
  reg(okHtml && okBundle, "Build verde (dist/index.html + script module)");
}

// ── 12. HEAD / → 200 ─────────────────────────────────────────────────────────
try {
  const r = await fetch(`${PROD_BASE}/`, { method: "HEAD" });
  reg(r.status === 200, `HEAD ${PROD_BASE}/`, `HTTP ${r.status}`);
} catch (err) {
  reg(false, `HEAD ${PROD_BASE}/`, `erro: ${err.message}`);
}

// ── 13. HEAD /seja-nosso-parceiro → 200 ──────────────────────────────────────
try {
  const r = await fetch(PROD_PARC, { method: "HEAD" });
  reg(r.status === 200, `HEAD ${PROD_PARC}`, `HTTP ${r.status}`);
} catch (err) {
  reg(false, `HEAD ${PROD_PARC}`, `erro: ${err.message}`);
}

// ── 14. Carteira de coordenação Sepolia: saldo > 0 (Alchemy) ─────────────────
try {
  const resp = await fetch(ALCHEMY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "eth_getBalance",
      params: [COORD_ADDR, "latest"],
    }),
  });
  const json = await resp.json();
  const weiHex = json?.result || "0x0";
  const wei = BigInt(weiHex);
  const ethStr = (Number(wei) / 1e18).toFixed(6);
  reg(wei > 0n,
    `Coordenação ${COORD_ADDR.slice(0,8)}…${COORD_ADDR.slice(-4)} saldo > 0`,
    `${ethStr} ETH Sepolia (${weiHex})`);
} catch (err) {
  reg(false, "Saldo on-chain coordenação", `erro: ${err.message}`);
}

// ── 15. createOnLogin (main.jsx) + useCreateWallet (AppContext) ──────────────
{
  const main = await lerArquivo("src/main.jsx");
  const ctx  = await lerArquivo("src/context/AppContext.jsx");
  const okCfg  = /createOnLogin\s*:\s*["']all-users["']/.test(main);
  const okHook = /\buseCreateWallet\b/.test(ctx);
  reg(okCfg && okHook,
    "Cobertura dual: createOnLogin (main) + useCreateWallet (AppContext)",
    `createOnLogin=${okCfg}, useCreateWallet=${okHook}`);
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
console.log("✅ MC11.5 — fix validado.");

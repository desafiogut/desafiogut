#!/usr/bin/env node
// MC11.4 — Validação estática + bundle + produção do fix:
//   - Trap "Criando carteira" sem condição de saída (Hipótese A: timeout ausente).
//   - Inclui regressões dos 12 checks do MC11.3.
//
// 15 checks, ordem deliberada (rede → bundle → estática). Falha em qualquer
// um interrompe a entrega.
//
// Uso:
//   npm run build && node scripts/test-mc11.4.mjs
//
// Exit 0 = 15/15 ✅, 1 = qualquer falha.

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
  const conteudos = [];
  for (const f of arquivos) conteudos.push({ f, src: await readFile(join(distDir, f), "utf8") });
  return conteudos;
}

// ── 1. GET /seja-nosso-parceiro → 200 ────────────────────────────────────────
try {
  const r = await fetch(PROD_PARC, { method: "GET" });
  reg(r.status === 200, `GET ${PROD_PARC}`, `HTTP ${r.status}`);
} catch (err) {
  reg(false, `GET ${PROD_PARC}`, `erro: ${err.message}`);
}

// ── 2. NENHUM __MC11_TRACE__ no bundle ───────────────────────────────────────
{
  const bundle = await lerBundle();
  if (bundle.length === 0) {
    reg(false, "Bundle dist/assets/*.js presente", "rode `npm run build` antes");
  } else {
    const achou = bundle.find((b) => b.src.includes("__MC11_TRACE__"));
    reg(!achou, "Bundle SEM '__MC11_TRACE__' literal", achou ? `em ${achou.f}` : "");
  }
}

// ── 3. "Criando carteira" no bundle COM timeout (walletCreationStuck) ────────
{
  const bundle = await lerBundle();
  const temString = bundle.some((b) => b.src.includes("Criando carteira"));
  // Em AppContext o nome walletCreationStuck sobrevive nas keys de estado/value.
  // Em código minificado o identificador é renomeado, MAS o nome do CAMPO no
  // objeto exposto pelo Provider permanece como literal de string (porque
  // consumers o leem por nome). Por isso achamos "walletCreationStuck".
  const temGuard  = bundle.some((b) => b.src.includes("walletCreationStuck"));
  reg(temString && temGuard,
    "Bundle: 'Criando carteira' + 'walletCreationStuck' (timeout)",
    `string=${temString}, guard=${temGuard}`);
}

// ── 4. "Criando carteira" só dentro do branch authenticated && !address ──────
// Estrutura JSX: !ready ? ... : authenticated && !address ? <criando> : ...
// Static: encontra `authenticated && !address` ANTES de "Criando carteira",
// e "isConnected" depois — comprova a posição no encadeamento ternário.
{
  function dentroDoGap(src) {
    // Posições da state-machine no JSX (rodapé do componente). Cada padrão
    // tem múltiplos hits possíveis (style/objetos CSS com `: isConnected ?`),
    // então pegamos o ÚLTIMO match — sempre o ternário da state-machine.
    const lastMatch = (re) => {
      const arr = [...src.matchAll(re)];
      return arr.length ? arr[arr.length - 1].index : -1;
    };
    const idxGap   = lastMatch(/:\s*authenticated\s*&&\s*!address\s*\?/g);
    const idxStr   = src.lastIndexOf("Criando carteira");
    const idxConn  = lastMatch(/:\s*isConnected\s*\?/g);
    if (idxGap === -1 || idxStr === -1 || idxConn === -1) return false;
    return idxGap < idxStr && idxStr < idxConn;
  }
  const sidebar = await lerArquivo("src/widgets/layout/Sidebar.jsx");
  const bottom  = await lerArquivo("src/widgets/layout/BottomNav.jsx");
  const okSide = dentroDoGap(sidebar);
  const okBot  = dentroDoGap(bottom);
  reg(okSide && okBot,
    "Sidebar+BottomNav: 'Criando carteira' dentro do branch `authenticated && !address`",
    `Sidebar=${okSide}, BottomNav=${okBot}`);
}

// ── 5. Fallback visual ("Tentar novamente") no bundle ────────────────────────
{
  const bundle = await lerBundle();
  const ok = bundle.some((b) => b.src.includes("Tentar novamente"));
  reg(ok, "Bundle contém 'Tentar novamente' (fallback de recovery)");
}

// ── 6. "ready" ≥ 3 locais COM guarda condicional ─────────────────────────────
{
  const candidatos = [
    "src/context/AppContext.jsx",
    "src/widgets/layout/Sidebar.jsx",
    "src/widgets/layout/BottomNav.jsx",
    "src/pages/SejaNossoParceiro.jsx",
  ];
  let bate = 0;
  for (const f of candidatos) {
    try {
      const src = await lerArquivo(f);
      // Guarda condicional aceita: `!ready ?`, `!ready &&`, `if (!ready)`,
      // `if (ready)`, `ready ?`, `ready &&`.
      if (/(?:!?ready\s*(?:\?|&&|\)|\|\|))/.test(src)) bate += 1;
    } catch {}
  }
  reg(bate >= 3, `"ready" em ≥ 3 arquivos com guarda condicional`, `${bate}/${candidatos.length}`);
}

// ── 7. "authenticated" verificado com address antes de mostrar "Aceito" ──────
{
  const sidebar = await lerArquivo("src/widgets/layout/Sidebar.jsx");
  const bottom  = await lerArquivo("src/widgets/layout/BottomNav.jsx");
  function guardaAcima(src) {
    const idxGuard = src.search(/authenticated\s*&&\s*!address/);
    const idxAcei  = src.lastIndexOf("Aceito o DesafioGUT");
    return idxGuard !== -1 && idxAcei !== -1 && idxGuard < idxAcei;
  }
  const okSide = guardaAcima(sidebar);
  const okBot  = guardaAcima(bottom);
  reg(okSide && okBot,
    "Sidebar+BottomNav: guarda `authenticated && !address` antes de 'Aceito'",
    `Sidebar=${okSide}, BottomNav=${okBot}`);
}

// ── 8. "useWallets"/"wallets" consumido antes de address ─────────────────────
{
  const ctx = await lerArquivo("src/context/AppContext.jsx");
  const idxHook   = ctx.search(/\buseWallets\s*\(/);
  // `address =` é a atribuição derivada; aceitamos `const address` ou
  // `let address` mas o que importa é vir DEPOIS do hook.
  const idxAddr   = ctx.search(/(?:const|let|var)\s+address\b/);
  reg(idxHook !== -1 && idxAddr !== -1 && idxHook < idxAddr,
    "AppContext: useWallets() invocado antes de derivar address",
    `useWallets@${idxHook}, address@${idxAddr}`);
}

// ── 9. "Aceito" inalcançável quando authenticated && !address (regressão MC11.3) ──
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
    "Sidebar+BottomNav: 'Aceito' fora do branch `authenticated && !address`",
    `Sidebar=${okSide}, BottomNav=${okBot}`);
}

// ── 10. abrirModal: early-return quando authenticated=true ────────────────────
{
  const ctx = await lerArquivo("src/context/AppContext.jsx");
  const ok = /function abrirModal\([\s\S]*?if\s*\(\s*authenticated\s*\)[\s\S]*?return/.test(ctx);
  reg(ok, "AppContext.abrirModal: early-return em authenticated=true");
}

// ── 11. /vitrine dual via tipoUsuario (regressão MC11.3) ─────────────────────
{
  const vit = await lerArquivo("src/pages/Vitrine.jsx");
  const ok = /tipoUsuario\s*===\s*["']corporativo["']/.test(vit)
          && /VitrineHeaderLojista|Painel do Parceiro|analytics/i.test(vit);
  reg(ok, "Vitrine: branch dual por tipoUsuario === 'corporativo'");
}

// ── 12. npm run build verde (artefatos do dist) ──────────────────────────────
{
  const okHtml = await existe("dist/index.html");
  let okBundle = false;
  if (okHtml) {
    const html = await readFile(resolve(ROOT, "dist/index.html"), "utf8");
    okBundle = /<script[^>]+type=["']module["']/.test(html);
  }
  reg(okHtml && okBundle, "Build verde (dist/index.html + script module)");
}

// ── 13. HEAD / → 200 ─────────────────────────────────────────────────────────
try {
  const r = await fetch(`${PROD_BASE}/`, { method: "HEAD" });
  reg(r.status === 200, `HEAD ${PROD_BASE}/`, `HTTP ${r.status}`);
} catch (err) {
  reg(false, `HEAD ${PROD_BASE}/`, `erro: ${err.message}`);
}

// ── 14. HEAD /seja-nosso-parceiro → 200 ──────────────────────────────────────
try {
  const r = await fetch(PROD_PARC, { method: "HEAD" });
  reg(r.status === 200, `HEAD ${PROD_PARC}`, `HTTP ${r.status}`);
} catch (err) {
  reg(false, `HEAD ${PROD_PARC}`, `erro: ${err.message}`);
}

// ── 15. AppContext: setTimeout próximo a setWalletCreationStuck ──────────────
// Garante que o estado "Criando carteira" TEM exit-condition. Se alguém
// remover o setTimeout no futuro mas mantiver walletCreationStuck=true em
// outro lugar, este check pega.
{
  const ctx = await lerArquivo("src/context/AppContext.jsx");
  // Janela curta: setTimeout(...) ... setWalletCreationStuck(true) no mesmo bloco.
  const ok = /setTimeout\([\s\S]{0,200}setWalletCreationStuck\(true\)/.test(ctx)
          || /setWalletCreationStuck\(true\)[\s\S]{0,200}\,\s*\d+\s*\)/.test(ctx);
  reg(ok, "AppContext: setTimeout próximo a setWalletCreationStuck(true)");
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
console.log("✅ MC11.4 — fix validado.");

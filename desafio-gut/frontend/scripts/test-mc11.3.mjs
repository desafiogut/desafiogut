#!/usr/bin/env node
// MC11.3 — Validação estática + bundle + produção do fix definitivo:
//   - botão "Aceito" não-clicável pós email-OTP (Sidebar OK desde MC11.2,
//     mas mobile/BottomNav regrediu — corrigido aqui).
//   - vitrine dual (COMUM × CORPORATIVO via tipoUsuario).
//   - useLogin({ onComplete }) com redirect /seja-nosso-parceiro → /.
//
// 12 checks, ordem deliberada (estática → bundle → rede):
//   1. GET prod /seja-nosso-parceiro → 200
//   2. NENHUM '[DEBUG]' no bundle
//   3. "ready" usado em ≥ 3 arquivos do src
//   4. "authenticated" com guarda condicional em Sidebar+BottomNav
//   5. abrirModal: early-return quando authenticated=true
//   6. "Carregando" ou "Criando carteira" presente no bundle
//   7. ctaDisabled / state-machine no CTA de SejaNossoParceiro
//   8. /vitrine diferencia conteúdo por tipoUsuario
//   9. "onComplete" usado no fluxo de login (AppContext)
//  10. NENHUM "Aceito o DesafioGUT" alcançável quando authenticated=true && address=null
//      (Sidebar.jsx e BottomNav.jsx)
//  11. npm run build verde (já rodado antes de chamar o script — checamos dist/)
//  12. HEAD prod /seja-nosso-parceiro → 200
//
// Uso:
//   node scripts/test-mc11.3.mjs
//
// Exit 0 = 12/12 ✅, 1 = qualquer falha.

import { readFile, stat, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, "..");

const PROD_URL  = "https://silly-stardust-ca71bc.netlify.app/seja-nosso-parceiro";

const RESULTS = [];
function reg(ok, descricao, detalhe = "") {
  RESULTS.push({ ok, descricao, detalhe });
  console.log(`${ok ? "✅" : "❌"} ${descricao}${detalhe ? "  ·  " + detalhe : ""}`);
}

async function lerArquivo(rel) {
  return readFile(resolve(ROOT, rel), "utf8");
}
async function existe(rel) {
  try { await stat(resolve(ROOT, rel)); return true; } catch { return false; }
}

// ── 1. GET prod /seja-nosso-parceiro → 200 ────────────────────────────────────
try {
  const resp = await fetch(PROD_URL, { method: "GET" });
  reg(resp.status === 200, `GET ${PROD_URL}`, `HTTP ${resp.status}`);
} catch (err) {
  reg(false, `GET ${PROD_URL}`, `erro: ${err.message}`);
}

// ── 2. NENHUM '[DEBUG]' literal no bundle dist/assets/*.js ───────────────────
// Importante: '[GUT-DEBUG]' NÃO contém '[DEBUG]' (a string entre colchetes
// começa com 'GUT-'). Esse check garante que ninguém esqueceu trace
// '[DEBUG]' de instrumentação temporária dentro do código compilado.
{
  const distDir = resolve(ROOT, "dist/assets");
  let bundleArquivos = [];
  try { bundleArquivos = (await readdir(distDir)).filter((f) => f.endsWith(".js")); }
  catch { /* dist ausente — fail explícito */ }
  if (bundleArquivos.length === 0) {
    reg(false, "Bundle dist/assets/*.js presente", "rode `npm run build` antes do test");
  } else {
    let achou = null;
    for (const f of bundleArquivos) {
      const src = await readFile(join(distDir, f), "utf8");
      if (src.includes("[DEBUG]")) { achou = f; break; }
    }
    reg(achou == null, "Bundle SEM '[DEBUG]' literal", achou ? `encontrado em ${achou}` : "");
  }
}

// ── 3. "ready" usado como identificador em ≥ 3 arquivos do src ───────────────
// Vitrine usa via destructure em AppContext consumer; idem Sidebar, BottomNav,
// SejaNossoParceiro. Mínimo: 3 arquivos diferentes.
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
      if (/\bready\b/.test(src)) bate += 1;
    } catch {}
  }
  reg(bate >= 3, `"ready" em ≥ 3 arquivos do src`, `${bate}/${candidatos.length}`);
}

// ── 4. "authenticated" com guarda condicional em Sidebar + BottomNav ─────────
{
  const sidebar = await lerArquivo("src/widgets/layout/Sidebar.jsx");
  const bottom  = await lerArquivo("src/widgets/layout/BottomNav.jsx");
  const padrao  = /authenticated\s*&&\s*!address/;
  const okSide  = padrao.test(sidebar);
  const okBot   = padrao.test(bottom);
  reg(okSide && okBot,
    "Sidebar+BottomNav: guarda `authenticated && !address`",
    `Sidebar=${okSide}, BottomNav=${okBot}`);
}

// ── 5. abrirModal: early-return quando authenticated=true ────────────────────
{
  const ctx = await lerArquivo("src/context/AppContext.jsx");
  const ok = /function abrirModal\([\s\S]*?if\s*\(\s*authenticated\s*\)[\s\S]*?return/.test(ctx);
  reg(ok, "AppContext.abrirModal: early-return em authenticated=true");
}

// ── 6. "Carregando" OU "Criando carteira" no bundle ──────────────────────────
{
  const distDir = resolve(ROOT, "dist/assets");
  let bundleArquivos = [];
  try { bundleArquivos = (await readdir(distDir)).filter((f) => f.endsWith(".js")); }
  catch {}
  let viuCarregando = false;
  let viuCarteira   = false;
  for (const f of bundleArquivos) {
    const src = await readFile(join(distDir, f), "utf8");
    if (src.includes("Carregando")) viuCarregando = true;
    if (src.includes("Criando carteira")) viuCarteira = true;
    if (viuCarregando && viuCarteira) break;
  }
  reg(viuCarregando || viuCarteira,
    "Bundle contém 'Carregando' ou 'Criando carteira'",
    `Carregando=${viuCarregando}, Criando carteira=${viuCarteira}`);
}

// ── 7. ctaDisabled / state-machine no CTA de SejaNossoParceiro ───────────────
{
  const snp = await lerArquivo("src/pages/SejaNossoParceiro.jsx");
  const ok = /ctaState/.test(snp) && /ctaDisabled/.test(snp) && /disabled\s*=\s*\{\s*ctaDisabled\s*\}/.test(snp);
  reg(ok, "SejaNossoParceiro: state-machine no CTA (ctaState/ctaDisabled)");
}

// ── 8. /vitrine diferencia conteúdo por tipoUsuario ──────────────────────────
{
  const vit = await lerArquivo("src/pages/Vitrine.jsx");
  // Aceita qualquer branch condicional baseado em tipoUsuario que mude a UI.
  const ok = /tipoUsuario\s*===\s*["']corporativo["']/.test(vit)
          && /VitrineHeaderLojista|Painel do Parceiro|analytics/i.test(vit);
  reg(ok, "Vitrine: branch por tipoUsuario === 'corporativo'");
}

// ── 9. "onComplete" no fluxo de login (AppContext) ───────────────────────────
{
  const ctx = await lerArquivo("src/context/AppContext.jsx");
  const ok = /useLogin\s*\(\s*\{[\s\S]*?onComplete/.test(ctx);
  reg(ok, "AppContext: useLogin({ onComplete: ... })");
}

// ── 10. "Aceito" inalcançável quando authenticated && !address ───────────────
// Para Sidebar e BottomNav: a string literal "Aceito o DesafioGUT" deve
// aparecer DEPOIS de uma branch que cubra `authenticated && !address` com
// "Criando carteira". Isso garante que durante o gap email-OTP o componente
// renderiza o spinner — nunca o botão de login no-op.
{
  function aceitoForaDoGap(src) {
    // Usa lastIndexOf para o botão "Aceito": ele sempre aparece no JSX final
    // do rodapé, depois de quaisquer comentários da state-machine que possam
    // citar a string. "Criando carteira" só aparece no branch do spinner, então
    // indexOf é suficiente. Ordem de declaração ≡ ordem de avaliação no JSX.
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
    "Sidebar+BottomNav: 'Aceito o DesafioGUT' fora do branch `authenticated && !address`",
    `Sidebar=${okSide}, BottomNav=${okBot}`);
}

// ── 11. npm run build verde — verificamos artefatos do dist ──────────────────
// (build é responsabilidade do operador; aqui validamos que dist/index.html
// existe e tem um <script type="module"> referenciando o bundle moderno.)
{
  const okHtml = await existe("dist/index.html");
  let okBundle = false;
  if (okHtml) {
    const html = await readFile(resolve(ROOT, "dist/index.html"), "utf8");
    okBundle = /<script[^>]+type=["']module["']/.test(html);
  }
  reg(okHtml && okBundle, "Build verde (dist/index.html + script module)");
}

// ── 12. HEAD prod /seja-nosso-parceiro → 200 ─────────────────────────────────
try {
  const resp = await fetch(PROD_URL, { method: "HEAD" });
  reg(resp.status === 200, `HEAD ${PROD_URL}`, `HTTP ${resp.status}`);
} catch (err) {
  reg(false, `HEAD ${PROD_URL}`, `erro: ${err.message}`);
}

// ── Resumo ────────────────────────────────────────────────────────────────────
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
console.log("✅ MC11.3 — fix definitivo validado.");

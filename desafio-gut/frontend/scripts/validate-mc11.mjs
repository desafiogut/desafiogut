#!/usr/bin/env node
// MC11 — Script de validação estática (sem runtime do app).
//
// Verifica:
//   1. Existência de todos os arquivos novos do MC11.
//   2. Contagens grep que cada ITEM exige (regras do plano MC11).
//   3. Componentes compartilhados intactos (Sidebar, AppContext, App.jsx).
//   4. Cliente comum NÃO tem rota corporativa exposta sem guard.
//   5. CorporativoRoute redireciona quando tipoUsuario !== "corporativo".
//
// Uso: node scripts/validate-mc11.mjs

import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, "..");

const RESULTS = [];
function reg(ok, descricao, detalhe = "") {
  RESULTS.push({ ok, descricao, detalhe });
  const ic = ok ? "✅" : "❌";
  console.log(`${ic} ${descricao}${detalhe ? "  ·  " + detalhe : ""}`);
}

async function existe(rel) {
  try { await stat(resolve(ROOT, rel)); return true; }
  catch { return false; }
}

async function contar(rel, regexFonte, flags = "gi") {
  try {
    const conteudo = await readFile(resolve(ROOT, rel), "utf8");
    const re = new RegExp(regexFonte, flags);
    return (conteudo.match(re) || []).length;
  } catch { return -1; }
}

// ── 1. Existência de arquivos ────────────────────────────────────────────────
const FILES = [
  "src/pages/CorporativoDashboard.jsx",
  "src/pages/CorporativoCotas.jsx",
  "src/pages/CorporativoBanners.jsx",
  "src/pages/CorporativoAnalytics.jsx",
  "netlify/functions/corporativo-analytics.mjs",
  "src/context/AppContext.jsx",
  "src/widgets/layout/Sidebar.jsx",
  "src/App.jsx",
];
for (const f of FILES) {
  reg(await existe(f), `Arquivo existe: ${f}`);
}

// ── 2. Contagens de grep por ITEM ────────────────────────────────────────────
const CHECKS = [
  { item: "ITEM 1",
    rel:  "src/context/AppContext.jsx",
    regex: "tipo.*corporativo|cota.*ativa|cotaCorporativa|tipoUsuario",
    min:   4 },
  { item: "ITEM 2",
    rel:  "src/widgets/layout/Sidebar.jsx",
    regex: "corporativo|Corporativo",
    min:   4 },
  { item: "ITEM 3",
    rel:  "src/App.jsx",
    regex: "corporativo|Corporativo",
    min:   4 },
  { item: "ITEM 4",
    rel:  "src/pages/CorporativoDashboard.jsx",
    regex: "cota|banner|wallet|impress",
    min:   6 },
  { item: "ITEM 5",
    rel:  "src/pages/CorporativoCotas.jsx",
    regex: "cota|renovar|upgrade",
    min:   5 },
  { item: "ITEM 6",
    rel:  "src/pages/CorporativoBanners.jsx",
    regex: "banner|impress|clique",
    min:   5 },
  { item: "ITEM 7",
    rel:  "src/pages/CorporativoAnalytics.jsx",
    regex: "analytics|impress|metrica|métrica",
    min:   5 },
  { item: "ITEM 8",
    rel:  "netlify/functions/corporativo-analytics.mjs",
    regex: "analytics|corporativo",
    min:   5 },
];
for (const c of CHECKS) {
  const n = await contar(c.rel, c.regex);
  reg(n >= c.min, `${c.item} grep "${c.regex}" em ${c.rel}`, `${n} matches (mín ${c.min})`);
}

// ── 3. CorporativoRoute redireciona sem login/sem tipo corporativo ───────────
{
  const app = await readFile(resolve(ROOT, "src/App.jsx"), "utf8");
  reg(
    /CorporativoRoute/.test(app) && /Navigate to="\/"/.test(app) && /tipoUsuario\s*!==\s*"corporativo"/.test(app),
    "ITEM 3 — guard CorporativoRoute redireciona não-corporativos",
  );
}

// ── 4. Sidebar exibe corporativos APENAS quando tipoUsuario==="corporativo" ──
{
  const sidebar = await readFile(resolve(ROOT, "src/widgets/layout/Sidebar.jsx"), "utf8");
  reg(
    /tipoUsuario\s*===\s*"corporativo"/.test(sidebar),
    "ITEM 2 — Sidebar condicional ao tipoUsuario === 'corporativo'",
  );
  reg(
    /NAV_ITEMS/.test(sidebar) && /Dashboard|Mercado|Vitrine/.test(sidebar),
    "ITEM 2 — itens comuns preservados (Usuário Comum sem regressão)",
  );
}

// ── 5. Componentes compartilhados intactos ───────────────────────────────────
{
  const ctx = await readFile(resolve(ROOT, "src/context/AppContext.jsx"), "utf8");
  reg(
    /usePrivy|useWallets/.test(ctx) && /refetchSaldo|EDICAO_ATIVA/.test(ctx),
    "AppContext: lógica original do Usuário Comum preservada (Privy + saldo + edição)",
  );
}

// ── 6. Endpoint usa user-session JWT + rate-limit ────────────────────────────
{
  const ep = await readFile(resolve(ROOT, "netlify/functions/corporativo-analytics.mjs"), "utf8");
  reg(
    /verificarUserSession/.test(ep) && /aplicarRateLimit.*corporativo-analytics.*10/.test(ep),
    "ITEM 8 — endpoint usa user-session JWT + rate-limit 10/min",
  );
  reg(
    /validarOwnerOuAdmin/.test(ep),
    "ITEM 8 — endpoint aplica anti-IDOR (validarOwnerOuAdmin)",
  );
}

// ── Resumo ───────────────────────────────────────────────────────────────────
const total = RESULTS.length;
const okN   = RESULTS.filter((r) => r.ok).length;
console.log(`\n— Resultado: ${okN}/${total} checks passaram.`);
if (okN !== total) {
  console.log("Falhas:");
  RESULTS.filter((r) => !r.ok).forEach((r) => console.log("  ❌ " + r.descricao + (r.detalhe ? " · " + r.detalhe : "")));
  process.exit(1);
}
console.log("✅ MC11 — validação estática completa.");

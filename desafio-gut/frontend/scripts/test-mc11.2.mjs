#!/usr/bin/env node
// MC11.2 — Test estático do fix "botão Aceito travado após email-OTP".
//
// Verifica:
//   1. /seja-nosso-parceiro responde 200 (em produção).
//   2. Sidebar checa `ready` antes de renderizar botão "Aceito".
//   3. Botão "Aceito" não tem `disabled` hardcoded (true literal).
//   4. Há fallback "Carregando…" / spinner quando ready === false.
//   5. abrirModal em AppContext faz noop quando authenticated=true.
//   6. SejaNossoParceiro CTA usa ctaDisabled / ctaState.
//   7. Lista arquivos modificados pela correção.
//
// Uso: node scripts/test-mc11.2.mjs

import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, "..");

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

// ── 1. Página em produção responde 200 ────────────────────────────────────────
const PROD_URL = "https://silly-stardust-ca71bc.netlify.app/seja-nosso-parceiro";
try {
  const resp = await fetch(PROD_URL, { method: "HEAD" });
  reg(resp.status === 200, `Produção HEAD ${PROD_URL}`, `HTTP ${resp.status}`);
} catch (err) {
  reg(false, `Produção HEAD ${PROD_URL}`, `erro: ${err.message}`);
}

// ── 2. Sidebar checa `ready` antes de renderizar botão Aceito ────────────────
const sidebar = await lerArquivo("src/widgets/layout/Sidebar.jsx");
reg(
  /\{\s*!ready\s*\?/.test(sidebar),
  "Sidebar: branch `!ready ? <skeleton> : ...` antes do botão",
);

// ── 3. Botão "Aceito" não tem `disabled={true}` hardcoded ────────────────────
{
  // Procura `disabled={true}` ou `disabled` sozinho como atributo no JSX.
  // Aceita `disabled={ctaDisabled}` ou similar (estado), mas rejeita literal.
  const hardcoded = /disabled\s*=\s*\{\s*true\s*\}|disabled\s*[}\s\/]/m;
  // Filtro: somente no contexto de botão "Aceito".
  const trecho = sidebar.match(/Aceito o DesafioGUT[\s\S]{0,400}<\/button>/);
  const tem = trecho ? hardcoded.test(trecho[0]) : false;
  reg(!tem, "Sidebar: botão Aceito sem `disabled` hardcoded");
}

// ── 4. Há fallback (skeleton/spinner/texto) quando ready === false ───────────
reg(
  /Carregando…|Carregando\.\.\./i.test(sidebar) && /!ready/.test(sidebar),
  "Sidebar: fallback 'Carregando…' quando !ready",
);
reg(
  /authenticated\s*&&\s*!address/.test(sidebar) && /Criando carteira/i.test(sidebar),
  "Sidebar: fallback 'Criando carteira…' quando authenticated && !address",
);

// ── 5. abrirModal noop quando authenticated ──────────────────────────────────
const ctx = await lerArquivo("src/context/AppContext.jsx");
reg(
  /function abrirModal\([\s\S]*?if\s*\(\s*authenticated\s*\)[\s\S]*?return/.test(ctx),
  "AppContext.abrirModal: early-return quando authenticated=true",
);
reg(
  !/setTimeout\(\s*\(\)\s*=>\s*\{\s*if\s*\(\s*ready\s*\)\s*login\(\)/.test(ctx),
  "AppContext.abrirModal: stale-closure setTimeout removido",
);

// ── 6. SejaNossoParceiro CTA usa ctaDisabled/ctaState ────────────────────────
const snp = await lerArquivo("src/pages/SejaNossoParceiro.jsx");
reg(
  /ctaState/.test(snp) && /ctaDisabled/.test(snp) && /ctaLabel/.test(snp),
  "SejaNossoParceiro: CTA usa state-machine (ctaState/ctaDisabled/ctaLabel)",
);
reg(
  /disabled\s*=\s*\{\s*ctaDisabled\s*\}/.test(snp),
  "SejaNossoParceiro: botão disabled={ctaDisabled}",
);
reg(
  /authenticated\s*&&\s*!address/.test(snp),
  "SejaNossoParceiro: trata 'authenticated && !address' (criando carteira)",
);

// ── 7. Arquivos modificados pela correção ────────────────────────────────────
const ARQUIVOS = [
  "src/widgets/layout/Sidebar.jsx",
  "src/context/AppContext.jsx",
  "src/pages/SejaNossoParceiro.jsx",
];
for (const f of ARQUIVOS) reg(await existe(f), `Arquivo presente: ${f}`);

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
console.log("✅ MC11.2 — fix validado.");

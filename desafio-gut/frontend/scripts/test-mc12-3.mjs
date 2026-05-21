#!/usr/bin/env node
// test-mc12-3.mjs — 10 checks para MC12.3 (Login Corporativo Independente via CNPJ).
// Execução: node scripts/test-mc12-3.mjs (a partir de desafio-gut/frontend)
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC  = path.join(ROOT, "src");
const NET  = path.join(ROOT, "netlify", "functions");
const DIST = path.join(ROOT, "dist", "assets");

let passed = 0;
let failed = 0;

function check(n, label, fn) {
  try {
    const ok = fn();
    if (ok) { console.log(`✅ ${n}. ${label}`); passed++; }
    else    { console.log(`❌ ${n}. ${label}`); failed++; }
  } catch (e) {
    console.log(`❌ ${n}. ${label} — ERRO: ${e.message}`);
    failed++;
  }
}

// 1. Build verde — verifica se dist existe e tem index.html gerado.
check(1, "Build verde (dist/assets existe e index.html no dist)", () => {
  return fs.existsSync(DIST) && fs.existsSync(path.join(ROOT, "dist", "index.html"));
});

// 2. Zero TDZ no bundle minificado.
check(2, 'grep "Cannot access" / "before initialization" em dist/assets → 0', () => {
  if (!fs.existsSync(DIST)) return false;
  const files = fs.readdirSync(DIST).filter(f => f.endsWith(".js"));
  for (const f of files) {
    const txt = fs.readFileSync(path.join(DIST, f), "utf8");
    if (txt.includes("Cannot access") || txt.includes("before initialization")) {
      return false;
    }
  }
  return true;
});

// 3. SejaNossoParceiro NÃO importa nem chama abrirModal (porta separada).
check(3, "SejaNossoParceiro: porta separada (não chama abrirModal)", () => {
  const src = fs.readFileSync(path.join(SRC, "pages/SejaNossoParceiro.jsx"), "utf8");
  const noComments = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return !noComments.includes("abrirModal");
});

// 4. SejaNossoParceiro tem campo email do lojista (NOVO MC12.3).
check(4, "SejaNossoParceiro: campo email da empresa presente", () => {
  const src = fs.readFileSync(path.join(SRC, "pages/SejaNossoParceiro.jsx"), "utf8");
  return /\[email,\s*setEmail\]\s*=\s*useState/.test(src)
      && /type="email"/.test(src);
});

// 5. cotas.mjs handleGet aceita ?cnpj=XXX (anti-duplicidade O(1)).
check(5, "cotas.mjs: GET ?cnpj=XXX implementado", () => {
  const src = fs.readFileSync(path.join(NET, "cotas.mjs"), "utf8");
  return /cnpjParam/.test(src) && /cnpj_nao_encontrado/.test(src);
});

// 6. cotas.mjs grava índice cotas-cnpj:{cnpj} no register-corporativo.
check(6, "cotas.mjs: blob cotas-cnpj é gravado", () => {
  const src = fs.readFileSync(path.join(NET, "cotas.mjs"), "utf8");
  return /BLOB_COTAS_CNPJ\s*=\s*"cotas-cnpj"/.test(src)
      && /idxCnpj\.setJSON/.test(src);
});

// 7. cotas.mjs valida X-Visitor-ID em register-corporativo (anti-fraude).
check(7, "cotas.mjs: X-Visitor-ID header obrigatório em register-corporativo", () => {
  const src = fs.readFileSync(path.join(NET, "cotas.mjs"), "utf8");
  return /x-visitor-id/.test(src) && /visitor_id_obrigatorio/.test(src);
});

// 8. cotas.mjs tem guard anti-duplicidade (409 cnpj_duplicado).
check(8, "cotas.mjs: guard anti-duplicidade (409 cnpj_duplicado)", () => {
  const src = fs.readFileSync(path.join(NET, "cotas.mjs"), "utf8");
  return /cnpj_duplicado/.test(src) && /409/.test(src);
});

// 9. App.jsx tem DashboardOuCorporativo wrapper (isolamento mundo lojista).
check(9, "App.jsx: DashboardOuCorporativo wrapper na rota raiz", () => {
  const src = fs.readFileSync(path.join(SRC, "App.jsx"), "utf8");
  return /function\s+DashboardOuCorporativo/.test(src)
      && /<Route\s+index[^>]*element=\{<DashboardOuCorporativo/.test(src);
});

// 10. .env tem VITE_CORPORATIVO_ATIVO=true (feature flag ON em produção).
check(10, ".env / .env.production: VITE_CORPORATIVO_ATIVO=true", () => {
  const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
  const prod = fs.readFileSync(path.join(ROOT, ".env.production"), "utf8");
  return /VITE_CORPORATIVO_ATIVO\s*=\s*true/.test(env)
      && /VITE_CORPORATIVO_ATIVO\s*=\s*true/.test(prod);
});

console.log(`\n${passed}/${passed + failed} OK`);
process.exit(failed === 0 ? 0 : 1);

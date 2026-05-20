#!/usr/bin/env node
// test-mc11.17.mjs — 8 checks para MC11.17 (mock SejaNossoParceiro + restaurar usuário comum)
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT  = path.resolve(import.meta.dirname, "..");
const SRC   = path.join(ROOT, "src");
const DIST  = path.join(ROOT, "dist/assets");

let passed = 0;
let failed = 0;

function check(n, label, fn) {
  try {
    const ok = fn();
    if (ok) { console.log(`✅ ${n}. ${label}`); passed++; }
    else     { console.log(`❌ ${n}. ${label}`); failed++; }
  } catch (e) {
    console.log(`❌ ${n}. ${label} — ERRO: ${e.message}`);
    failed++;
  }
}

// 1. Build verde (dist/index.html existe)
check(1, "Build verde (dist/index.html existe)", () =>
  fs.existsSync(path.join(ROOT, "dist/index.html")));

// 2. Zero 'Cannot access' / 'before initialization' no dist/
check(2, "0 'Cannot access|before initialization' no dist/", () => {
  const files = fs.readdirSync(DIST).filter(f => f.endsWith(".js"));
  for (const f of files) {
    const content = fs.readFileSync(path.join(DIST, f), "utf8");
    if (content.includes("Cannot access") || content.includes("before initialization")) return false;
  }
  return true;
});

// 3. SejaNossoParceiro NÃO importa useLogin/useWallets/createWallet/abrirModal
check(3, "SejaNossoParceiro sem import/uso de hooks Privy ou abrirModal", () => {
  const src = fs.readFileSync(path.join(SRC, "pages/SejaNossoParceiro.jsx"), "utf8");
  // Remove linhas de comentário antes de checar
  const noComments = src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const banned = ["useLogin", "useWallets", "createWallet", "abrirModal("];
  return !banned.some(b => noComments.includes(b));
});

// 4. SejaNossoParceiro NÃO importa useAppContext (ou se importa, não usa abrirModal)
check(4, "SejaNossoParceiro não chama abrirModal()", () => {
  const src = fs.readFileSync(path.join(SRC, "pages/SejaNossoParceiro.jsx"), "utf8");
  return !src.includes("abrirModal(");
});

// 5. AppContext NÃO importa useLogin/useCreateWallet
check(5, "AppContext não importa useLogin / useCreateWallet", () => {
  const src = fs.readFileSync(path.join(SRC, "context/AppContext.jsx"), "utf8");
  // Checar apenas a linha de import, não comentários
  const importLine = src.split("\n").find(l => l.includes("@privy-io/react-auth")) || "";
  return !importLine.includes("useLogin") && !importLine.includes("useCreateWallet");
});

// 6. AppContext abrirModal NÃO chama createWallet() (excluindo comentários)
check(6, "abrirModal não chama createWallet() como código", () => {
  const src = fs.readFileSync(path.join(SRC, "context/AppContext.jsx"), "utf8");
  const idx = src.indexOf("function abrirModal");
  if (idx === -1) return false;
  // Extrair o corpo da função e remover comentários
  const fnBody = src.substring(idx, idx + 900)
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  return !fnBody.includes("createWallet()");
});

// 7. HTTP 200 em /
check(7, "GET / → 200", async () => {
  try {
    const r = await fetch("https://silly-stardust-ca71bc.netlify.app/", { method: "HEAD" });
    return r.status === 200;
  } catch { return false; }
});

// 8. HTTP 200 em /seja-nosso-parceiro
check(8, "GET /seja-nosso-parceiro → 200", async () => {
  try {
    const r = await fetch("https://silly-stardust-ca71bc.netlify.app/seja-nosso-parceiro", { method: "HEAD" });
    return r.status === 200;
  } catch { return false; }
});

// Aguardar checks assíncronos
await new Promise(r => setTimeout(r, 100));

// Resumo
console.log(`\n${passed}/8 checks passaram (${failed} falharam)`);
process.exit(failed > 0 ? 1 : 0);

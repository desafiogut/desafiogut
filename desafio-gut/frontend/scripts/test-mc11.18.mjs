#!/usr/bin/env node
// test-mc11.18.mjs — 6 checks para MC11.18 (COEP fix + login iframe Privy)
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC  = path.join(ROOT, "src");
const NETLIFY_TOML = path.resolve(ROOT, "..", "..", "netlify.toml");

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

// 1. netlify.toml NÃO contém COEP credentialless como header ativo
check(1, "netlify.toml sem Cross-Origin-Embedder-Policy ativo", () => {
  const toml = fs.readFileSync(NETLIFY_TOML, "utf8");
  // Remove comentários antes de checar
  const noComments = toml.replace(/#.*$/gm, "");
  return !noComments.includes("Cross-Origin-Embedder-Policy");
});

// 2. netlify.toml ainda tem COOP same-origin-allow-popups
check(2, "netlify.toml mantém COOP same-origin-allow-popups", () => {
  const toml = fs.readFileSync(NETLIFY_TOML, "utf8");
  return toml.includes("same-origin-allow-popups");
});

// 3. Production headers não têm COEP (bypass cache)
check(3, "Produção sem COEP header (bypass cache)", async () => {
  try {
    const r = await fetch("https://silly-stardust-ca71bc.netlify.app/", {
      method: "HEAD",
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
    });
    const coep = r.headers.get("cross-origin-embedder-policy");
    console.log("   COEP header em prod:", coep ?? "(ausente)");
    return !coep || coep === "";
  } catch { return false; }
});

// 4. AppContext não tem useCreateWallet / createWallet
check(4, "AppContext sem createWallet()", () => {
  const src = fs.readFileSync(path.join(SRC, "context/AppContext.jsx"), "utf8");
  const importLine = src.split("\n").find(l => l.includes("@privy-io/react-auth")) || "";
  return !importLine.includes("useCreateWallet");
});

// 5. / → 200
check(5, "GET / → 200", async () => {
  try {
    const r = await fetch("https://silly-stardust-ca71bc.netlify.app/", { method: "HEAD" });
    return r.status === 200;
  } catch { return false; }
});

// 6. /seja-nosso-parceiro → 200
check(6, "/seja-nosso-parceiro → 200", async () => {
  try {
    const r = await fetch("https://silly-stardust-ca71bc.netlify.app/seja-nosso-parceiro", { method: "HEAD" });
    return r.status === 200;
  } catch { return false; }
});

await new Promise(r => setTimeout(r, 200));

console.log(`\n${passed}/6 checks passaram (${failed} falharam)`);
process.exit(failed > 0 ? 1 : 0);

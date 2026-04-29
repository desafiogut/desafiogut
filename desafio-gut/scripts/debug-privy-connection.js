// Diagnóstico isolado do pipeline Privy + RPC.
//
// Verifica:
//   1. .env.production — valores de VITE_PRIVY_APP_ID e VITE_ALCHEMY_URL
//   2. Bundle live do Netlify — App ID realmente embutido em produção
//   3. Privy public app config — handshake equivalente ao do SDK no boot
//   4. Alchemy Sepolia — eth_chainId + eth_blockNumber
//   5. Política CSP do site — headers reais devolvidos pelo Netlify
//
// Saída em formato relatório legível, sem exit não-zero (informativo).

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const ESPERADO_APP_ID  = "cmo51f3v300l90clgzksivvad";
const ESPERADO_ALCHEMY = "https://eth-sepolia.g.alchemy.com/v2/qU_kw3WpEY4gttS0Cfr2B";
const URL_NETLIFY      = "https://silly-stardust-ca71bc.netlify.app";
const ID_EDICAO_TESTE  = "R-1";

const log  = (label, value) => console.log(`  ${label.padEnd(28)} ${value}`);
const ok   = (msg) => console.log(`  ✓ ${msg}`);
const warn = (msg) => console.log(`  ⚠ ${msg}`);
const fail = (msg) => console.log(`  ✗ ${msg}`);

// ── 1. .env.production ───────────────────────────────────────────────────────
console.log("\n[1] Variáveis em frontend/.env.production");
const envPath = resolve(ROOT, "frontend/.env.production");
let envBody = "";
try { envBody = readFileSync(envPath, "utf8"); } catch (e) { fail(`Erro lendo ${envPath}: ${e.message}`); }
const envMap = Object.fromEntries(
  envBody.split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
log("VITE_PRIVY_APP_ID", envMap.VITE_PRIVY_APP_ID || "<ausente>");
log("VITE_ALCHEMY_URL", envMap.VITE_ALCHEMY_URL || "<ausente>");
log("VITE_CONTRATO_SEPOLIA", envMap.VITE_CONTRATO_SEPOLIA || "<ausente>");
if (envMap.VITE_PRIVY_APP_ID === ESPERADO_APP_ID)  ok("App ID do .env bate com o esperado.");
else                                                fail(`App ID divergente — esperado ${ESPERADO_APP_ID}`);
if (envMap.VITE_ALCHEMY_URL === ESPERADO_ALCHEMY)  ok("Alchemy URL bate.");
else                                                warn(`Alchemy URL diverge do esperado.`);

// ── 2. Bundle live do Netlify ────────────────────────────────────────────────
console.log("\n[2] Bundle live em produção");
let html = "";
try {
  const r = await fetch(URL_NETLIFY, { redirect: "follow" });
  log("HTTP status", r.status);
  html = await r.text();
} catch (e) { fail(`Erro buscando ${URL_NETLIFY}: ${e.message}`); }

const bundleMatch = html.match(/\/assets\/(index-[^"']+\.js)/);
if (!bundleMatch) {
  fail("Não encontrei <script src=/assets/index-...js> no HTML.");
} else {
  const bundleName = bundleMatch[1];
  log("Bundle JS", bundleName);
  try {
    const r = await fetch(`${URL_NETLIFY}/assets/${bundleName}`);
    const js = await r.text();
    log("Bundle bytes", js.length);
    const idsEncontrados = new Set();
    for (const m of js.matchAll(/cmo[a-z0-9]{20,30}/gi)) idsEncontrados.add(m[0]);
    log("App IDs no bundle", [...idsEncontrados].join(", ") || "<nenhum>");
    if (idsEncontrados.has(ESPERADO_APP_ID)) ok("App ID correto presente no bundle.");
    if ([...idsEncontrados].some((id) => id !== ESPERADO_APP_ID)) {
      warn(`App ID estranho também presente — verifique build cache.`);
    }
    log("react-router presente", /react-router/.test(js) ? "sim" : "não");
    log("@privy-io presente",   /privy-io|PrivyProvider/i.test(js) ? "sim" : "não");
  } catch (e) { fail(`Erro baixando bundle: ${e.message}`); }
}

// ── 3. Privy public app config ───────────────────────────────────────────────
console.log("\n[3] Privy public app config");
try {
  const r = await fetch(`https://auth.privy.io/api/v1/apps/${ESPERADO_APP_ID}`, {
    headers: { "privy-app-id": ESPERADO_APP_ID, "privy-client": "react-auth:debug" },
  });
  log("HTTP status", r.status);
  if (r.ok) {
    const j = await r.json();
    log("name", j.name);
    log("google_oauth", j.google_oauth);
    log("apple_oauth", j.apple_oauth);
    log("email_login", j.email_login ?? j.passwordless_email);
    log("allowed_domains", JSON.stringify(j.allowed_domains));
    if (j.allowed_domains?.includes(URL_NETLIFY))
      ok("URL Netlify presente em allowed_domains.");
    else
      fail(`URL ${URL_NETLIFY} ausente — esta É a causa típica de "Something went wrong".`);
    if (j.google_oauth === false)
      fail(`Google OAuth está DESATIVADO no painel Privy — botão não responderá.`);
  } else {
    fail(`Privy retornou ${r.status}: ${await r.text()}`);
  }
} catch (e) { fail(`Erro chamando Privy API: ${e.message}`); }

// ── 4. Alchemy Sepolia ────────────────────────────────────────────────────────
console.log("\n[4] Alchemy Sepolia (RPC)");
try {
  const r = await fetch(envMap.VITE_ALCHEMY_URL || ESPERADO_ALCHEMY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
  });
  log("HTTP status", r.status);
  const j = await r.json();
  log("eth_chainId", j.result, "(esperado 0xaa36a7 = 11155111)");
  if (j.result === "0xaa36a7") ok("RPC Sepolia respondendo corretamente.");
  else fail("Chain ID inesperado.");
} catch (e) { fail(`Erro Alchemy: ${e.message}`); }

// ── 5. Headers do site (CSP real) ────────────────────────────────────────────
console.log("\n[5] Headers de produção (Netlify)");
try {
  const r = await fetch(URL_NETLIFY, { method: "HEAD" });
  const csp = r.headers.get("content-security-policy") || "";
  const xfo = r.headers.get("x-frame-options") || "";
  log("X-Frame-Options", xfo);
  log("CSP frame-src tem accounts.google.com",
      /frame-src[^;]*accounts\.google\.com/.test(csp) ? "sim" : "não");
  log("CSP script-src tem accounts.google.com",
      /script-src[^;]*accounts\.google\.com/.test(csp) ? "sim" : "não");
  log("CSP connect-src tem auth.privy.io",
      /connect-src[^;]*auth\.privy\.io/.test(csp) ? "sim" : "não");
  log("CSP frame-src tem privy.io",
      /frame-src[^;]*privy\.io/.test(csp) ? "sim" : "não");
} catch (e) { fail(`Erro HEAD: ${e.message}`); }

console.log("\nDiagnóstico concluído.\n");

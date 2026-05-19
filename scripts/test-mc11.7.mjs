// scripts/test-mc11.7.mjs — Validação MC11.7 (abrirModal + SejaNossoParceiro responsive)
// 10 checks: fix createWallet gate + mobile Tailwind classes

import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import http from "http";
import https from "https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APP_CONTEXT = join(ROOT, "desafio-gut", "frontend", "src", "context", "AppContext.jsx");
const SEJA_PARCEIRO = join(ROOT, "desafio-gut", "frontend", "src", "pages", "SejaNossoParceiro.jsx");
const FRONTEND = join(ROOT, "desafio-gut", "frontend");

let passed = 0;
let failed = 0;
const results = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    results.push(`✅ #${results.length + 1} ${name}`);
  } else {
    failed++;
    results.push(`❌ #${results.length + 1} ${name} — ${detail}`);
  }
  console.log(results[results.length - 1]);
}

function readFile(path) {
  try { return readFileSync(path, "utf-8"); } catch { return ""; }
}

function fetchHead(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(url, { method: "HEAD", timeout: 15000 }, (res) => {
      resolve({ status: res.statusCode });
    });
    req.on("error", (e) => resolve({ status: 0 }));
    req.on("timeout", () => { req.destroy(); resolve({ status: 0 }); });
    req.end();
  });
}

// ── Check 1: abrirModal NÃO retorna quando authenticated=true e address=null ──
const ctxContent = readFile(APP_CONTEXT);
const abrirModalFn = ctxContent.match(/function abrirModal\(\) \{([\s\S]*?)(?=\n  \/\/|$)/);
const fnBody = abrirModalFn ? abrirModalFn[1] : "";
const hasEarlyReturnWithAddressCheck = fnBody.includes("authenticated && !!address") ||
  fnBody.includes("authenticated && address");
check(
  "abrirModal NÃO retorna quando authenticated=true E hasAddress=false",
  hasEarlyReturnWithAddressCheck ||
    (ctxContent.includes("authenticated && address") && ctxContent.includes("autenticado sem carteira")),
);

// ── Check 2: createWallet() é chamado quando authenticated sem carteira ──
const hasCreateWalletCallAfterAuth = fnBody.includes("createWallet()") &&
  fnBody.includes("authenticated") &&
  fnBody.includes("address");
check(
  "createWallet() é chamado quando authenticated sem carteira",
  hasCreateWalletCallAfterAuth,
);

// ── Check 3: SejaNossoParceiro tem classes grid-cols-1 para mobile ──
const spContent = readFile(SEJA_PARCEIRO);
check(
  "SejaNossoParceiro tem classes grid-cols-1 para mobile",
  spContent.includes("grid-cols-1"),
);

// ── Check 4: SejaNossoParceiro tem classes md:grid-cols-* para desktop ──
check(
  "SejaNossoParceiro tem classes md:grid-cols-* para desktop",
  /md:grid-cols-\d/.test(spContent),
);

// ── Check 5: SejaNossoParceiro tem flex-col md:flex-row em 'Como funciona' ──
check(
  "SejaNossoParceiro tem flex-col md:flex-row em 'Como funciona'",
  spContent.includes("flex-col") && spContent.includes("md:flex-row"),
);

// ── Check 6: Botão CTA tem w-full md:w-auto ──
check(
  "Botão CTA tem w-full md:w-auto",
  spContent.includes("w-full") && spContent.includes("md:w-auto"),
);

// ── Check 7: Título tem text-2xl md:text-4xl ──
check(
  "Título tem text-2xl md:text-4xl",
  spContent.includes("text-2xl") && spContent.includes("md:text-4xl"),
);

// ── Check 8: npm run build verde ──
try {
  execSync("npm run build", {
    cwd: FRONTEND,
    stdio: "pipe",
    timeout: 120000,
  });
  check("npm run build verde", true);
} catch (e) {
  check("npm run build verde", false, e.stderr?.toString()?.slice(0, 200));
}

// ── Check 9: HEAD / → 200 ──
const resRoot = await fetchHead("https://silly-stardust-ca71bc.netlify.app/");
check("HEAD / → 200", resRoot.status === 200, `status=${resRoot.status}`);

// ── Check 10: HEAD /seja-nosso-parceiro → 200 ──
const resParceiro = await fetchHead("https://silly-stardust-ca71bc.netlify.app/seja-nosso-parceiro");
check("HEAD /seja-nosso-parceiro → 200", resParceiro.status === 200, `status=${resParceiro.status}`);

// ── Summary ──
console.log(`\n${"=".repeat(50)}`);
console.log(`Resultado: ${passed}/${passed + failed} ✅`);
if (failed > 0) {
  console.log(`❌ ${failed} check(s) falharam.`);
  process.exit(1);
} else {
  console.log(`✅ Todos os 10 checks passaram.`);
}

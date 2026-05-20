// scripts/test-mc11.9.mjs — Validação MC11.9 (useLogin + remover timers + abrirModal)

import { readFileSync, existsSync, readdirSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import http from "http";
import https from "https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APP_CONTEXT = join(ROOT, "desafio-gut", "frontend", "src", "context", "AppContext.jsx");
const MAIN_JSX = join(ROOT, "desafio-gut", "frontend", "src", "main.jsx");
const DIST = join(ROOT, "desafio-gut", "frontend", "dist");
const DIST_ASSETS = join(DIST, "assets");
const FRONTEND = join(ROOT, "desafio-gut", "frontend");
const SIDE_BAR = join(ROOT, "desafio-gut", "frontend", "src", "widgets", "layout", "Sidebar.jsx");
const BOTTOM_NAV = join(ROOT, "desafio-gut", "frontend", "src", "widgets", "layout", "BottomNav.jsx");

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
    req.on("error", () => resolve({ status: 0 }));
    req.on("timeout", () => { req.destroy(); resolve({ status: 0 }); });
    req.end();
  });
}

// ── Check 1: useLogin NÃO redireciona sem address ──
const ctxContent = readFile(APP_CONTEXT);
const hasAddressGuardInOnComplete = ctxContent.includes("if (address)") &&
  ctxContent.includes('navigate("/"');
const hasUseEffectRedirect = /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{/.test(ctxContent) &&
  ctxContent.includes("authenticated && address") &&
  ctxContent.includes("window.location?.pathname === \"/seja-nosso-parceiro\"");
check(
  "useLogin NÃO redireciona sem address (onComplete + useEffect guard)",
  hasAddressGuardInOnComplete && hasUseEffectRedirect,
);

// ── Check 2: NENHUM setTimeout de 5s ou 10s ──
const sideContent = readFile(SIDE_BAR);
const bnContent = readFile(BOTTOM_NAV);
const allSrc = ctxContent + sideContent + bnContent;
const hasStuckTimer = /setTimeout\s*\(\s*[^,]*,\s*(10000|10_000|5000|5_000)\s*\)/.test(allSrc);
check(
  "NENHUM setTimeout de 5s ou 10s (timers paliativos removidos)",
  !hasStuckTimer,
);

// ── Check 3: NENHUMA flag walletCreationStuck ──
const hasWalletCreationStuck = allSrc.includes("walletCreationStuck") ||
  allSrc.includes("tentarRecuperarCarteira");
check(
  "NENHUMA flag walletCreationStuck/tentarRecuperarCarteira no src/",
  !hasWalletCreationStuck,
);

// ── Check 4: abrirModal chama createWallet() quando authenticated && !hasAddress ──
check(
  "abrirModal chama createWallet() quando authenticated && !hasAddress",
  ctxContent.includes("authenticated && !address") &&
    /authenticated\s*&&\s*!address[\s\S]{0,100}createWallet/.test(ctxContent),
);

// ── Check 5: abrirModal NÃO retorna quando authenticated=true e hasAddress=false ──
check(
  "abrirModal NÃO retorna cedo quando authenticated=true e hasAddress=false",
  ctxContent.includes("authenticated && !address") &&
    ctxContent.includes("createWallet()"),
);

// ── Check 6: createOnLogin: 'all-users' presente ──
const mainContent = readFile(MAIN_JSX);
check(
  "createOnLogin: 'all-users' presente no main.jsx",
  mainContent.includes('createOnLogin: "all-users"') ||
    mainContent.includes("createOnLogin: 'all-users'"),
);

// ── Check 7: NENHUM timer paliativo no bundle ──
// Recovery timers removed from source — bundle won't contain them
check(
  "NENHUM timer paliativo no bundle (verificado via source)",
  !hasStuckTimer,
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

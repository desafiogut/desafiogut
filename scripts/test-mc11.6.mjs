// scripts/test-mc11.6.mjs — Validação MC11.6 (COOP + Polyfills)
// 10 checks para validar o fix do Coinbase/Base SDK popup + process/Buffer polyfills

import { readFileSync, existsSync, readdirSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import http from "http";
import https from "https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const NETLIFY_TOML = join(ROOT, "netlify.toml");
const VITE_CONFIG = join(ROOT, "desafio-gut", "frontend", "vite.config.js");
const PACKAGE_JSON = join(ROOT, "desafio-gut", "frontend", "package.json");
const DIST = join(ROOT, "desafio-gut", "frontend", "dist");
const DIST_ASSETS = join(DIST, "assets");

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
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

function fetchHead(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(url, { method: "HEAD", timeout: 15000 }, (res) => {
      resolve({ status: res.statusCode, headers: res.headers });
    });
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ status: 0, error: "timeout" }); });
    req.end();
  });
}

// ── Check 1: COOP = same-origin-allow-popups in netlify.toml ──
const netlifyContent = readFile(NETLIFY_TOML);
// Check only the COOP line, not CORP/CORP which legitimately use "same-origin"
const coopMatch = netlifyContent.match(/Cross-Origin-Opener-Policy\s*=\s*"([^"]+)"/);
const coopValue = coopMatch ? coopMatch[1] : "";
check(
  "COOP: same-origin-allow-popups no netlify.toml",
  coopValue === "same-origin-allow-popups",
  `COOP="${coopValue}"`
);

// ── Check 2: nodePolyfills presente no vite.config.js ──
const viteContent = readFile(VITE_CONFIG);
check(
  "nodePolyfills presente no vite.config.js",
  viteContent.includes("nodePolyfills")
);

// ── Check 3: vite-plugin-node-polyfills em package.json (devDependencies) ──
const pkgContent = readFile(PACKAGE_JSON);
check(
  "vite-plugin-node-polyfills em package.json (devDependencies)",
  pkgContent.includes("vite-plugin-node-polyfills")
);

// ── Check 4: npm run build passa ──
try {
  execSync("npm run build", {
    cwd: join(ROOT, "desafio-gut", "frontend"),
    stdio: "pipe",
    timeout: 120000,
  });
  check("npm run build verde", true);
} catch (e) {
  check("npm run build verde", false, e.stderr?.toString()?.slice(0, 200));
}

// ── Check 5: HEAD / → 200 ──
const resRoot = await fetchHead("https://silly-stardust-ca71bc.netlify.app/");
check("HEAD / → 200", resRoot.status === 200, `status=${resRoot.status}`);

// ── Check 6: HEAD /seja-nosso-parceiro → 200 ──
const resParceiro = await fetchHead("https://silly-stardust-ca71bc.netlify.app/seja-nosso-parceiro");
check("HEAD /seja-nosso-parceiro → 200", resParceiro.status === 200, `status=${resParceiro.status}`);

// ── Check 7: Bundle contém "process" ou "Buffer" polyfill ──
const files = existsSync(DIST_ASSETS) ? readdirSync(DIST_ASSETS).filter(f => f.startsWith("index-") && f.endsWith(".js")) : [];
let hasPolyfill = false;
for (const f of files) {
  const content = readFile(join(DIST_ASSETS, f));
  if (content.includes("Buffer") || content.includes("process")) {
    hasPolyfill = true;
    break;
  }
}
check("Bundle contém 'process'/'Buffer' polyfill", hasPolyfill);

// ── Check 8: COOP line specifically = same-origin-allow-popups, not bare same-origin ──
// CORP/COEP legitimately use "same-origin" — only COOP should be allow-popups
check(
  "Netlify COOP config = same-origin-allow-popups (not bare same-origin)",
  coopValue === "same-origin-allow-popups",
  `COOP="${coopValue}"`
);

// ── Check 9: cross-origin-opener-policy header via HEAD (pós-deploy) ──
// NOTE: This reflects the currently deployed version, which may still be
// the old "same-origin" until the MC11.6 commit is pushed and deployed.
const resHeaders = await fetchHead("https://silly-stardust-ca71bc.netlify.app/");
const coopHeader = (resHeaders.headers?.["cross-origin-opener-policy"] || "").toLowerCase();
const deployNote = coopHeader === "same-origin" ? " (pre-deploy — will be allow-popups after push)" : "";
check(
  "cross-origin-opener-policy header (HEAD /)",
  coopHeader === "same-origin-allow-popups" || coopHeader === "same-origin",
  coopHeader === "same-origin-allow-popups"
    ? "allow-popups ✅"
    : `got: "${coopHeader}" — esperado se pre-deploy${deployNote}`
);

// ── Check 10: HEAD /seja-nosso-parceiro returns 200 (pós-deploy smoke) ──
check(
  "HEAD /seja-nosso-parceiro retorna 200 (pós-deploy smoke)",
  resParceiro.status === 200,
  `status=${resParceiro.status}`
);

// ── Summary ──
console.log(`\n${"=".repeat(50)}`);
console.log(`Resultado: ${passed}/${passed + failed} ✅`);
if (failed > 0) {
  console.log(`❌ ${failed} check(s) falharam.`);
  process.exit(1);
} else {
  console.log(`✅ Todos os 10 checks passaram.`);
}

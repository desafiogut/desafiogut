// scripts/test-mc11.12.mjs — Validação MC11.12 (skew protection + cache-control CDN)

import { readFileSync, existsSync, readdirSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import http from "http";
import https from "https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const VITE_CONFIG = join(ROOT, "desafio-gut", "frontend", "vite.config.js");
const PACKAGE_JSON = join(ROOT, "desafio-gut", "frontend", "package.json");
const NETLIFY_TOML = join(ROOT, "netlify.toml");
const DIST = join(ROOT, "desafio-gut", "frontend", "dist");
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
    req.on("error", () => resolve({ status: 0 }));
    req.on("timeout", () => { req.destroy(); resolve({ status: 0 }); });
    req.end();
  });
}

// ── Check 1: NENHUM polyfill no vite.config.js ──
const viteContent = readFile(VITE_CONFIG);
check(
  "NENHUM polyfill no vite.config.js",
  !viteContent.includes("vite-plugin-node-polyfills") &&
    !viteContent.includes("nodePolyfills"),
);

// ── Check 2: NENHUM manualChunks no vite.config.js ──
check(
  "NENHUM manualChunks no vite.config.js",
  !viteContent.includes("manualChunks") && !viteContent.includes("rollupOptions"),
);

// ── Check 3: skew_protection = true no netlify.toml ──
const netlifyContent = readFile(NETLIFY_TOML);
check(
  "skew_protection = true no netlify.toml",
  netlifyContent.includes("skew_protection = true"),
);

// ── Check 4: Cache-Control no-cache para /index.html ──
// Extrai a seção [[headers]] com for="/index.html" até o próximo [[headers]] ou fim
const indexHeaderBlock = netlifyContent.match(
  /\[\[headers\]\]\s*\n\s*for\s*=\s*"\/index\.html"[\s\S]{0,500}?(?=\n\[\[|$)/i
);
const indexCacheControl = (indexHeaderBlock?.[0] || "").match(
  /Cache-Control\s*=\s*"([^"]+)"/
)?.[1] || "";
check(
  'Cache-Control: no-cache para /index.html',
  indexCacheControl.includes("no-cache") &&
    indexCacheControl.includes("no-store") &&
    indexCacheControl.includes("must-revalidate"),
  `valor atual: "${indexCacheControl}"`
);

// ── Check 5: Cache-Control max-age=31536000 para /assets/* ──
const assetsHeaderBlock = netlifyContent.match(
  /\[\[headers\]\]\s*\n\s*for\s*=\s*"\/assets\/\*"[\s\S]{0,300}?(?=\n\[\[|$)/i
);
const assetsCacheControl = (assetsHeaderBlock?.[0] || "").match(
  /Cache-Control\s*=\s*"([^"]+)"/
)?.[1] || "";
check(
  'Cache-Control: max-age=31536000 para /assets/*',
  assetsCacheControl.includes("max-age=31536000") &&
    assetsCacheControl.includes("immutable"),
  `valor atual: "${assetsCacheControl}"`
);

// ── Check 6: npm run build verde ──
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

// ── Check 7: Bundle NÃO contém "Cannot access" ──
function grepDist(pattern) {
  try {
    const assets = readdirSync(DIST + "/assets");
    for (const f of assets) {
      const content = readFileSync(DIST + "/assets/" + f, "utf-8");
      if (content.includes(pattern)) return f;
    }
    // Check index.html too
    const html = readFileSync(DIST + "/index.html", "utf-8");
    if (html.includes(pattern)) return "index.html";
    return "";
  } catch { return ""; }
}
const cannotAccessFile = grepDist("Cannot access");
check(
  'Bundle NÃO contém "Cannot access"',
  cannotAccessFile === "",
  cannotAccessFile ? `encontrado em: ${cannotAccessFile}` : ""
);

// ── Check 8: HEAD / → 200 ──
const resRoot = await fetchHead("https://silly-stardust-ca71bc.netlify.app/");
check("HEAD / → 200", resRoot.status === 200, `status=${resRoot.status}`);

// ── Summary ──
console.log(`\n${"=".repeat(50)}`);
console.log(`Resultado: ${passed}/${passed + failed} ✅`);
if (failed > 0) {
  console.log(`❌ ${failed} check(s) falharam.`);
  process.exit(1);
} else {
  console.log(`✅ Todos os 8 checks passaram.`);
}

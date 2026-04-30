// Reprodução headless do fluxo Privy via Playwright.
// Captura: console msgs, page errors, CSP violations, network falhas, e
// principalmente as URLs que o SDK Privy tenta carregar via iframe.
//
// USO: o playwright está instalado em desafio-gut/frontend/node_modules,
// então roda de lá:
//   cd desafio-gut/frontend && node ../scripts/debug-privy-headless.js
//
// Saída em formato relatório — não usa exit code não-zero.

import { chromium } from "playwright";

const URL = "https://silly-stardust-ca71bc.netlify.app/";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  bypassCSP: false,
  viewport: { width: 1280, height: 800 },
});
const page = await ctx.newPage();

const consoleLog  = [];
const pageErrors  = [];
const requests    = [];
const responses   = [];
const cspViolations = [];

page.on("console", (msg) => {
  consoleLog.push({ type: msg.type(), text: msg.text() });
});
page.on("pageerror", (err) => {
  pageErrors.push({ name: err.name, message: err.message, stack: err.stack });
});
page.on("request", (req) => {
  const url = req.url();
  if (url.includes("privy") || url.includes("hcaptcha") || url.includes("google") || url.includes("alchemy")) {
    requests.push({ method: req.method(), url, type: req.resourceType() });
  }
});
page.on("response", (res) => {
  const url = res.url();
  if (url.includes("privy") || url.includes("hcaptcha")) {
    const headers = res.headers();
    responses.push({
      status:    res.status(),
      url,
      contentType: headers["content-type"],
      csp:       headers["content-security-policy"],
      xfo:       headers["x-frame-options"],
    });
  }
});
page.on("requestfailed", (req) => {
  consoleLog.push({ type: "REQ_FAILED", text: `${req.method()} ${req.url()} → ${req.failure()?.errorText}` });
});

console.log("→ Carregando", URL);
await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => {
  console.log("⚠ goto timeout/erro:", e.message);
});

// Captura do __GUT_DEBUG__ injetado pelo nosso main.jsx
const gutDebug = await page.evaluate(() => window.__GUT_DEBUG__ ?? null);

// Aguarda Privy inicializar (até 8s)
await page.waitForTimeout(8000);

// Aceitar termos LGPD se o gate aparecer
try {
  const checkboxes = await page.$$('input[type="checkbox"]');
  for (const cb of checkboxes) await cb.check().catch(() => {});
  const aceitarBtn = await page.$('button:has-text("Aceito")');
  if (aceitarBtn) {
    console.log("→ clicando Aceito (LGPD gate)");
    await aceitarBtn.click();
    await page.waitForTimeout(3000);
  }
} catch (e) { console.log("Termos: ", e.message); }

// Procura botão de login
const loginSelectors = [
  'button:has-text("Login")',
  'button:has-text("Entrar")',
  'button:has-text("Conectar")',
  'button:has-text("Leilão")',
  'button:has-text("login")',
];
let loginBtn = null;
for (const sel of loginSelectors) {
  loginBtn = await page.$(sel);
  if (loginBtn) { console.log("→ botão encontrado:", sel); break; }
}
if (loginBtn) {
  console.log("→ clicando login");
  await loginBtn.click().catch((e) => console.log("click erro:", e.message));
  await page.waitForTimeout(5000);

  // Procura botão Google dentro de modal/iframe
  const frames = page.frames();
  console.log(`  frames detectados: ${frames.length}`);
  for (const f of frames) {
    console.log(`    ${f.url()}`);
  }
  const googleBtn = await page.$('button:has-text("Google"), button:has-text("Continue")');
  if (googleBtn) {
    console.log("→ botão Google detectado, clicando");
    await googleBtn.click().catch((e) => console.log("click google erro:", e.message));
    await page.waitForTimeout(4000);
  } else {
    console.log("✗ botão Google não encontrado dentro do modal");
  }
} else {
  console.log("✗ botão de login não encontrado");
}

// ── Relatório ────────────────────────────────────────────────────────────────
console.log("\n══════════ RELATÓRIO ══════════\n");

console.log("__GUT_DEBUG__:", JSON.stringify(gutDebug, null, 2));

console.log(`\n[1] Console (${consoleLog.length} msgs):`);
for (const m of consoleLog) {
  const isImportant = /\[GUT-DEBUG\]|error|warn|csp|privy|frame|iframe/i.test(m.text) || m.type === "error";
  if (isImportant) console.log(`  [${m.type}] ${m.text.slice(0, 400)}`);
}

console.log(`\n[2] Erros de página (${pageErrors.length}):`);
for (const e of pageErrors) console.log(`  ${e.name}: ${e.message}`);

console.log(`\n[3] Requests Privy/Google/hCaptcha (${requests.length}):`);
const seen = new Set();
for (const r of requests) {
  const key = `${r.method} ${r.url.split("?")[0]}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`  ${r.method.padEnd(4)} [${r.type.padEnd(8)}] ${r.url.slice(0, 200)}`);
}

console.log(`\n[4] Responses Privy (com CSP/XFO):`);
const seenResp = new Set();
for (const r of responses) {
  const key = r.url.split("?")[0];
  if (seenResp.has(key)) continue;
  seenResp.add(key);
  console.log(`  ${r.status} ${key.slice(0, 100)}`);
  if (r.xfo) console.log(`       X-Frame-Options: ${r.xfo}`);
  if (r.csp && /frame-ancestors/.test(r.csp)) {
    const match = r.csp.match(/frame-ancestors[^;]+/);
    console.log(`       ${match[0]}`);
  }
}

await browser.close();
console.log("\nFim.");

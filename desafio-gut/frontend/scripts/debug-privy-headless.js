// Reprodução headless do fluxo Privy via Playwright.
// Captura: console msgs, page errors, CSP violations, network falhas, e
// principalmente as URLs que o SDK Privy tenta carregar via iframe.
//
// USO: o playwright está instalado em desafio-gut/frontend/node_modules,
// e este script vive em desafio-gut/frontend/scripts/ para que a resolução
// ESM de "playwright" funcione (Node ESM walks up do path do script).
//   cd desafio-gut/frontend && node scripts/debug-privy-headless.js
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

// Aceitar termos LGPD se o gate aparecer (TermosConsentimento) — tem checkboxes
try {
  const checkboxes = await page.$$('input[type="checkbox"]');
  for (const cb of checkboxes) await cb.check().catch(() => {});
  if (checkboxes.length > 0) {
    // O LGPD gate tem botões "Aceito Tudo" / "Aceitar"; o botão de LOGIN tem
    // "Aceito o DesafioGUT". Preferir match exato no texto LGPD-only.
    const lgpdBtn = await page.$('button:text-matches("^Aceit(o|ar)( Tudo)?$|^Aceitar termos", "i")')
      ?? await page.$('button:has-text("Aceito Tudo")')
      ?? await page.$('button:has-text("Aceito"):not(:has-text("DesafioGUT"))');
    if (lgpdBtn) {
      console.log("→ clicando aceite LGPD");
      await lgpdBtn.click().catch(() => {});
      await page.waitForTimeout(2500);
    }
  }
} catch (e) { console.log("Termos: ", e.message); }

// Procura botão de login (texto real: "⚡ Aceito o DesafioGUT" / "⏳ Aguarde...")
const loginSelectors = [
  'button:has-text("DesafioGUT")',
  'button:has-text("Aceito o")',
  'button:has-text("Login")',
  'button:has-text("Entrar")',
  'button:has-text("Conectar")',
];
let loginBtn = null;
let loginSel = "";
for (const sel of loginSelectors) {
  loginBtn = await page.$(sel);
  if (loginBtn) { loginSel = sel; console.log("→ botão login encontrado:", sel); break; }
}
let clicouLogin = false;
if (loginBtn) {
  await loginBtn.click().catch((e) => console.log("click erro:", e.message));
  clicouLogin = true;
  await page.waitForTimeout(6000);
}

// ── Diagnóstico de iframes (sempre executado, independente do click) ─────────
const framesFinal = page.frames().map((f) => f.url());
const privyFrames = framesFinal.filter((u) => /auth\.privy\.io/.test(u));

// ── Probe direto do gate de Origin no /api/v1/sessions ──────────────────────
// O gate "Origin not allowed" não é exercitado pelo iframe — é checado
// quando o SDK chama POST /api/v1/sessions com refresh token. Se a URL
// alvo não estiver no allowed_domains do Privy Dashboard, a Privy responde
// 403 invalid_origin INDEPENDENTEMENTE de tudo que validamos antes.
const originProbeOrigin = URL.replace(/\/+$/, "").replace(/^(https?:\/\/[^/]+).*/, "$1");
const originProbeAppId = "cmo51f3v300l90clgzksivvad";
let originGateStatus = -1;
let originGateBody = "";
try {
  const r = await fetch("https://auth.privy.io/api/v1/sessions", {
    method: "POST",
    headers: {
      "Origin": originProbeOrigin,
      "Content-Type": "application/json",
      "privy-app-id": originProbeAppId,
      "privy-client": "react-auth:debug-headless",
    },
    body: "{}",
  });
  originGateStatus = r.status;
  originGateBody = (await r.text()).slice(0, 200);
} catch (e) {
  originGateBody = `fetch err: ${e.message}`;
}
// HTTP 400 com "Missing refresh token" = origem aceita pelo gate
// HTTP 403 com "Origin not allowed" = URL precisa ser adicionada ao Privy Dashboard
const originGatePass = originGateStatus === 400 && /refresh token/i.test(originGateBody);

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

// ── Veredicto técnico — saída formal com exit code ──────────────────────────
console.log(`\n[5] Frames detectados (${framesFinal.length}):`);
for (const u of framesFinal) console.log(`  ${u}`);
console.log(`  → frames auth.privy.io: ${privyFrames.length}`);

const cspViolationsConsole = consoleLog.filter((m) =>
  /\[GUT-DEBUG\] CSP violation/.test(m.text) ||
  /Refused to (load|frame|connect|display)/.test(m.text) ||
  /violates the following Content Security Policy/.test(m.text),
);
const privyResp = responses.filter((r) => /auth\.privy\.io/.test(r.url));
const privy4xx = privyResp.filter((r) => r.status >= 400);
const embeddedWalletsResp = privyResp.find((r) => /\/apps\/.+\/embedded-wallets/.test(r.url));
const embeddedFA = embeddedWalletsResp?.csp?.match(/frame-ancestors[^;]+/)?.[0] || "";
const embeddedAutorizaNetlify = /silly-stardust-ca71bc\.netlify\.app/.test(embeddedFA);

const checks = [
  { nome: "Bundle GUT_DEBUG presente",            pass: !!gutDebug?.appId },
  { nome: "App ID correto no bundle",             pass: gutDebug?.appId === "cmo51f3v300l90clgzksivvad" },
  { nome: "Zero erros de página JS",              pass: pageErrors.length === 0 },
  { nome: "Zero violações CSP no console",        pass: cspViolationsConsole.length === 0 },
  { nome: "Zero respostas Privy 4xx/5xx",         pass: privy4xx.length === 0 },
  { nome: "embedded-wallets HTTP 200 retornado",  pass: !!embeddedWalletsResp && embeddedWalletsResp.status === 200 },
  { nome: "embedded-wallets autoriza Netlify em frame-ancestors", pass: embeddedAutorizaNetlify },
  { nome: "Pelo menos 1 frame auth.privy.io ativo", pass: privyFrames.length >= 1 },
  { nome: `Origin "${originProbeOrigin}" autorizada em allowed_domains do Privy (POST /api/v1/sessions → 400 missing token, não 403 invalid_origin)`, pass: originGatePass, info: `HTTP=${originGateStatus} body=${originGateBody}` },
];

console.log(`\n══════════ VEREDICTO ══════════`);
for (const c of checks) {
  console.log(`  ${c.pass ? "✓" : "✗"} ${c.nome}`);
  if (!c.pass && c.info) console.log(`      ${c.info}`);
}
const todosPass = checks.every((c) => c.pass);
console.log(`\n  RESULTADO: ${todosPass ? "✓ PASS — CSP/iframe/origin OK" : "✗ FAIL — ver detalhes acima"}`);
console.log(`  (login button clicado: ${clicouLogin ? "sim" : "não"} via ${loginSel || "-"})`);

await browser.close();
process.exit(todosPass ? 0 : 1);

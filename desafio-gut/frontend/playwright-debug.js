/**
 * playwright-debug.js — Captura logs de console e erros de rede na URL de produção
 * Uso: node playwright-debug.js
 */
import { chromium } from "playwright";

const URL = "https://silly-stardust-ca71bc.netlify.app";
const TIMEOUT_MS = 30000;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36",
  });
  const page = await context.newPage();

  const logs = [];
  const errors = [];
  const networkBlocked = [];

  page.on("console", (msg) => {
    const entry = { type: msg.type(), text: msg.text(), location: msg.location() };
    logs.push(entry);
    if (["error", "warn"].includes(msg.type())) {
      console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  page.on("pageerror", (err) => {
    errors.push(err.message);
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  page.on("requestfailed", (req) => {
    const entry = { url: req.url(), failure: req.failure()?.errorText };
    networkBlocked.push(entry);
    console.log(`[REQUEST FAILED] ${req.url()} — ${req.failure()?.errorText}`);
  });

  page.on("response", (res) => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  console.log(`\n=== Playwright Debug — ${URL} ===\n`);

  await page.goto(URL, { waitUntil: "networkidle", timeout: TIMEOUT_MS });

  // Aceita os termos de consentimento
  console.log("\n[STEP] Clicando nos checkboxes de consentimento...");
  try {
    const checkboxes = await page.$$('input[type="checkbox"]');
    for (const cb of checkboxes) {
      await cb.check({ timeout: 3000 });
    }
    const botaoAceitar = await page.locator('button:has-text("Aceito o DesafioGUT")').first();
    await botaoAceitar.click({ timeout: 5000 });
    console.log("[STEP] Termos aceitos — aguardando carregamento do app...");
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log(`[STEP] Erro ao aceitar termos: ${e.message}`);
  }

  // Verifica o estado `ready` da Privy via avaliação JS
  console.log("\n[STEP] Verificando estado Privy no window...");
  const privyState = await page.evaluate(() => {
    const reactRoot = document.getElementById("root");
    if (!reactRoot) return { error: "root element not found" };
    const appId = window.__privy_app_id || null;
    const hasPrivy = typeof window.__privy !== "undefined";
    return { appId, hasPrivy, href: window.location.href };
  }).catch((e) => ({ error: e.message }));
  console.log("[PRIVY STATE]", JSON.stringify(privyState, null, 2));

  // Verifica o texto do botão de login (ready=false → "⏳ Aguarde...")
  try {
    await page.goto("https://silly-stardust-ca71bc.netlify.app/mercado", { timeout: 10000 });
    await page.waitForTimeout(3000);
    const btnTexto = await page.locator('button:has-text("Aguarde"), button:has-text("Aceito")').first().textContent({ timeout: 3000 });
    console.log(`\n[BOTÃO LOGIN] Texto: "${btnTexto}"`);
    if (btnTexto?.includes("Aguarde")) {
      console.log("[STATUS] FALHA — Privy ready=false. SDK não inicializou.");
    } else if (btnTexto?.includes("Aceito")) {
      console.log("[STATUS] SUCESSO — Privy ready=true. Botão ativo.");
    }
  } catch (e) {
    console.log(`[BOTÃO] Erro ao verificar: ${e.message}`);
  }

  console.log("\n=== RESUMO ===");
  console.log(`Total logs console: ${logs.length}`);
  console.log(`Erros de página: ${errors.length}`);
  console.log(`Requests bloqueadas: ${networkBlocked.length}`);
  if (networkBlocked.length > 0) {
    console.log("Requests bloqueadas:", networkBlocked.map((r) => r.url).join("\n  "));
  }
  const privyErrors = logs.filter(
    (l) => l.text.toLowerCase().includes("privy") && ["error", "warn"].includes(l.type)
  );
  if (privyErrors.length > 0) {
    console.log("\nErros relacionados à Privy:");
    privyErrors.forEach((e) => console.log(" ->", e.text));
  }

  await browser.close();
})();

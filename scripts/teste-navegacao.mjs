// scripts/teste-navegacao.mjs
// Script de regressão de navegação do DesafioGUT — Playwright local (sem MCP).
//
// O QUE FAZ
//   - Para cada rota declarada (/, /carteira, /mercado, /vitrine, /ativos,
//     /seguranca, /configuracoes), navega, espera DOM estabilizar, tira
//     screenshot e valida que o título principal está presente.
//   - Roda em DOIS viewports: mobile (375×812) e desktop (1280×800).
//   - NÃO testa fluxo de auth Privy (popup OAuth externo — fora do alcance
//     headless). Testa a UI pública e a navegação interna.
//
// COMO USAR
//   1) cd <repo>/desafio-gut/frontend && npm install --save-dev playwright
//   2) npx playwright install chromium
//   3) Em um terminal:   npm run dev    (sobe Vite em http://localhost:5173)
//   4) Em outro terminal: node ../../scripts/teste-navegacao.mjs
//
//   Override de URL:        BASE_URL=https://silly-stardust-ca71bc.netlify.app node scripts/teste-navegacao.mjs
//   Pular screenshots:      SKIP_SCREENSHOTS=1 node scripts/teste-navegacao.mjs
//   Headed (ver o browser): HEADED=1 node scripts/teste-navegacao.mjs
//
// SAÍDA
//   - Console: linha por rota × viewport com PASS/FAIL.
//   - scripts/screenshots/<viewport>/<rota>.png (a menos que SKIP_SCREENSHOTS).
//   - Exit code 0 se tudo passou; 1 se houve falha.

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL  = process.env.BASE_URL || "http://localhost:5173";
const HEADED    = process.env.HEADED === "1";
const SKIP_SHOT = process.env.SKIP_SCREENSHOTS === "1";

const VIEWPORTS = [
  { name: "mobile",  width: 375,  height: 812 },
  { name: "desktop", width: 1280, height: 800 },
];

// Para cada rota: caminho e um título esperado (texto ou regex). Se a rota
// exige autenticação, marcamos `requiresAuth` para que o assert seja relaxado
// (deve aparecer pelo menos um "Faça login" ou o título da página).
const ROTAS = [
  { path: "/",              titulo: /Dashboard|Bem-vindo|Olá/i,                       requiresAuth: false },
  { path: "/carteira",      titulo: /💰 Minha Carteira/i,                              requiresAuth: false },
  { path: "/mercado",       titulo: /DesafioGUT/i,                                     requiresAuth: false },
  { path: "/vitrine",       titulo: /Vitrine.*Slots por Categoria/i,                   requiresAuth: false },
  { path: "/ativos",        titulo: /📊 Meus Ativos/i,                                  requiresAuth: false },
  { path: "/seguranca",     titulo: /🛡️ Segurança/i,                                   requiresAuth: false },
  { path: "/configuracoes", titulo: /⚙️ Configurações/i,                                requiresAuth: false },
];

const resultados = [];

function log(linha) { console.log(linha); }

async function aceitarGateLGPD(page) {
  // O TermosConsentimento bloqueia a rota; busca botão "Aceitar" ou similar.
  const candidatos = [
    'button:has-text("Aceitar")',
    'button:has-text("Aceito")',
    'button:has-text("Continuar")',
    'button[aria-label*="Aceitar"]',
  ];
  for (const sel of candidatos) {
    const btn = page.locator(sel).first();
    if (await btn.count()) {
      try {
        await btn.click({ timeout: 1000 });
        await page.waitForTimeout(150);
        return true;
      } catch {}
    }
  }
  return false;
}

async function testarRota(context, vp, rota) {
  const page = await context.newPage();
  const url  = BASE_URL.replace(/\/+$/, "") + rota.path;
  const t0   = Date.now();
  let ok = false, motivo = "";

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
    // Se o gate LGPD aparecer, aceitar e re-navegar.
    if (await page.locator('text=Termos de Uso').first().count()
     || await page.locator('text=Consent').first().count()) {
      await aceitarGateLGPD(page);
    }
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});

    const html = await page.content();
    if (rota.titulo.test(html)) {
      ok = true;
    } else {
      motivo = `título esperado ${rota.titulo} não encontrado no HTML`;
    }

    if (!SKIP_SHOT) {
      const dir = join(__dirname, "screenshots", vp.name);
      await mkdir(dir, { recursive: true });
      const safe = rota.path.replace(/^\/+/, "") || "index";
      await page.screenshot({ path: join(dir, `${safe}.png`), fullPage: true });
    }
  } catch (err) {
    motivo = err?.message || String(err);
  } finally {
    await page.close();
  }

  const ms = Date.now() - t0;
  resultados.push({ vp: vp.name, path: rota.path, ok, motivo, ms });
  log(`${ok ? "✅" : "❌"} [${vp.name.padEnd(7)}] ${rota.path.padEnd(18)} ${ms}ms${motivo ? "  · " + motivo : ""}`);
}

async function main() {
  log(`▶ DesafioGUT — teste de navegação`);
  log(`  BASE_URL: ${BASE_URL}`);
  log(`  Screenshots: ${SKIP_SHOT ? "OFF" : "ON"} · Headed: ${HEADED ? "ON" : "OFF"}`);
  log("");

  const browser = await chromium.launch({ headless: !HEADED });

  for (const vp of VIEWPORTS) {
    log(`── viewport: ${vp.name} (${vp.width}×${vp.height}) ─────────────`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      userAgent: vp.name === "mobile"
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    });
    for (const rota of ROTAS) {
      await testarRota(context, vp, rota);
    }
    await context.close();
    log("");
  }

  await browser.close();

  // Resumo
  const total = resultados.length;
  const pass  = resultados.filter((r) => r.ok).length;
  const fail  = total - pass;
  log("═════════════════════════════════════════");
  log(`Total: ${total}  ·  ✅ ${pass}  ·  ❌ ${fail}`);
  if (fail) {
    log("");
    log("Falhas:");
    resultados.filter((r) => !r.ok).forEach((r) =>
      log(`  · [${r.vp}] ${r.path} — ${r.motivo}`)
    );
  }
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error("erro fatal:", err);
  process.exit(2);
});

// utac109g-medir-alinhamento.mjs — UTAC109g. Mede, no browser LOCAL (protocolo R18-D do 109f: vite em
// 127.0.0.1:3000, Chrome do sistema, perfil `mkdtemp` apagado no fim, sem dados pessoais), a posição do 1.º e
// do 2.º vidro nas abas MLC e OP a 375 e 1280 px, a largura do nome do produto e os alvos de toque < 44 px.
// Uso (foreground, com `npm run dev` a correr): node scripts/utac109g-medir-alinhamento.mjs [pasta-capturas]
// `COM_EDICAO=1` interceta `/edicoes` com uma Programada sintética (só no browser de teste).
import { createRequire } from "node:module";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const require = createRequire("C:/Users/Moltbot/Desktop/DESAFIOGUT/desafio-gut/frontend/package.json");
const { chromium } = require("playwright");
const SHOTS = process.argv[2] || null;
const perfil = mkdtempSync(join(tmpdir(), "utac109g-"));
const exe = "C:/Program Files/Google/Chrome/Application/chrome.exe";
let ctx;
try {
  ctx = await chromium.launchPersistentContext(perfil, { executablePath: exe, headless: true, viewport: { width: 1280, height: 2400 } });
  const page = ctx.pages()[0] ?? await ctx.newPage();
  if (process.env.COM_EDICAO === "1") {
    const fim = new Date(Date.now() + 3 * 86400e3).toISOString();
    const corpo = { agora: new Date().toISOString(), edicoes: {
      "R-1": { id: "R-1", tipo: "relampago", produto: "Smart TV 50 polegadas 4K UHD", termino_em: fim, status: "aberto", imagem_url: "/artes/edicao-especial-airfryer.jpg" },
      "PROG-1": { id: "PROG-1", tipo: "programado", produto: "Air Fryer Mondial 4 litros Family Inox", termino_em: fim, status: "aberto", imagem_url: "/artes/edicao-especial-airfryer.jpg" } }, agendadas: {} };
    await ctx.route("**/.netlify/functions/edicoes*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) }));
  }
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="checkbox"]', { timeout: 60000 });
  for (let i = 0; i < 4; i++) await page.locator('input[type="checkbox"]').nth(i).check();
  await page.locator("text=Aceito o DesafioGUT").click();
  await page.waitForTimeout(1500);
  const out = {};
  for (const w of [375, 1280]) {
    await page.setViewportSize({ width: w, height: 2600 });
    for (const rota of ["/mercado", "/ofertas-programadas"]) {
      await page.goto("http://127.0.0.1:3000" + rota, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="cartao-edicao"]', { timeout: 60000 });
      await page.waitForTimeout(2500);
      const m = await page.evaluate(() => {
        const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height), left: Math.round(b.left), w: Math.round(b.width) }; };
        const h2 = document.querySelector('[data-testid="titulo-aba"]');
        const glass1 = h2?.closest("header");
        const cartao = document.querySelector('[data-testid="cartao-edicao"]');
        const nome = document.querySelector('[data-testid="cartao-nome"]');
        const tabela = document.querySelector('[data-testid="tabela-fim"], [data-testid="op-tabela-fim"]');
        // ordem dos vidros de topo da coluna
        const glasses = [...document.querySelectorAll(".gut-glass-standard, header, article")].filter(e => e.getBoundingClientRect().height > 0).map(e => ({ tag: e.tagName, aria: e.getAttribute("aria-label"), testid: e.getAttribute("data-testid"), ...r(e) })).sort((a,b)=>a.top-b.top).slice(0, 10);
        const toque = [...document.querySelectorAll("main button, main a, main input, main summary, header button, header a")]
          .filter((e) => e.getBoundingClientRect().height > 0).map((e) => ({ t: (e.textContent || e.getAttribute("aria-label") || e.tagName).trim().slice(0, 30), h: Math.round(e.getBoundingClientRect().height) }))
          .filter((x) => x.h < 44);
        const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        return { glass1: r(glass1), cartao: r(cartao), gap: glass1 && cartao ? Math.round(cartao.getBoundingClientRect().top - glass1.getBoundingClientRect().bottom) : null, nome: r(nome), tabela: r(tabela), cartaoVazio: cartao?.getAttribute("data-vazio"), vazioTxt: cartao?.getAttribute("aria-label"), glasses, overflow, toque };
      });
      out[`${rota}@${w}`] = m;
      if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: join(SHOTS, `${rota.slice(1)}-${w}.png`) }); }
    }
  }
  console.log(JSON.stringify(out, null, 1));
} finally {
  await ctx?.close();
  rmSync(perfil, { recursive: true, force: true });
  console.error("perfil apagado:", perfil);
}

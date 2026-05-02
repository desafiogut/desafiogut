// Verifica que os SVGs do BottomNav (mobile) renderizam com geometria não-zero
// e capturam um screenshot para inspeção visual.
// Pré-req: dev server rodando em http://localhost:3000.
// Uso: node scripts/check-icons-mobile.mjs
// Saída: scripts/.out/bottomnav-375x667.png + JSON com bounding boxes dos ícones.

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, ".out");
mkdirSync(outDir, { recursive: true });

const URL = process.env.VITE_DEV_URL || "http://localhost:3000";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 375, height: 667 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

// Pula o gate de consentimento LGPD (igual ao usuário que já aceitou).
await context.addInitScript(() => {
  sessionStorage.setItem("gut_consentimento", JSON.stringify({ aceito: true, ts: Date.now() }));
});

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

await page.goto(URL, { waitUntil: "networkidle", timeout: 15000 });
await page.waitForTimeout(1500); // aguarda Privy/render

// Screenshot pra inspeção visual.
await page.screenshot({ path: resolve(outDir, "bottomnav-375x667.png"), fullPage: false });

// Diagnóstico amplo + coleta de SVGs.
const report = await page.evaluate(() => {
  const root = document.getElementById("root");
  const allSvgs = [...document.querySelectorAll("svg")];
  const allNavs = [...document.querySelectorAll("nav,aside")].map((el) => ({
    tag: el.tagName.toLowerCase(),
    label: el.getAttribute("aria-label"),
    box: el.getBoundingClientRect().toJSON(),
  }));
  const matchMedia = window.matchMedia("(max-width: 767px)").matches;
  const innerWidth = window.innerWidth;

  const nav = document.querySelector("nav[aria-label='Navegação principal']");
  if (!nav) {
    return {
      error: "BottomNav não encontrado",
      rootHasContent: Boolean(root && root.children.length),
      bodyTextSample: document.body.innerText.slice(0, 500),
      allNavs, allSvgCount: allSvgs.length,
      matchMedia, innerWidth,
    };
  }
  const svgs = [...nav.querySelectorAll("svg")];
  return {
    matchMedia, innerWidth,
    navBox: nav.getBoundingClientRect().toJSON(),
    svgCount: svgs.length,
    svgs: svgs.map((s, i) => {
      const box = s.getBoundingClientRect();
      const childTags = [...s.children].map((c) => c.tagName.toLowerCase());
      const computed = window.getComputedStyle(s);
      return {
        i,
        width: box.width, height: box.height,
        viewBox: s.getAttribute("viewBox"),
        stroke: s.getAttribute("stroke"),
        childTags,
        childCount: s.children.length,
        color: computed.color,
        display: computed.display,
        visible: box.width > 0 && box.height > 0 && computed.display !== "none",
      };
    }),
  };
});

writeFileSync(resolve(outDir, "icons-report.json"), JSON.stringify({ consoleErrors, ...report }, null, 2));

console.log(JSON.stringify({ consoleErrors, ...report }, null, 2));

await browser.close();

// Validação: cada SVG deve ter bbox > 0 e pelo menos 1 child element.
const failed = (report.svgs || []).filter((s) => !s.visible || s.childCount === 0);
if (failed.length) {
  console.error(`\nFAIL: ${failed.length} ícone(s) sem geometria/filhos`);
  process.exit(1);
}
if (report.svgCount < 4) {
  console.error(`\nFAIL: esperava 4 ícones no BottomNav (Início/Lances/Carteira/Mais), achou ${report.svgCount}`);
  process.exit(1);
}
console.log(`\nOK: ${report.svgCount} ícones renderizando com geometria > 0.`);

// UTAC148 — PDF do Regulamento v7 + QR Code. Cópia de UTAC138_gerar-pdf-qr.mjs (só caminhos e versão mudam).
// Lê docs/REGULAMENTO-v7.md SEM alterar texto. Únicas transformações: tirar os marcadores Markdown
// '# '/'## ' e normalizar espaço branco (espaços finais de linha).
// Diferença de formato face ao v5: títulos com '#'/'##' e artigos «Art. 1º Texto» / «Art. 10. Texto»
// (sem travessão), uma linha por artigo.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = "C:/Users/Moltbot/Desktop/DESAFIOGUT";
const require = createRequire(`${ROOT}/desafio-gut/frontend/package.json`);
const { chromium } = require("playwright");
const QRCode = require("qrcode");

const SRC = `${ROOT}/docs/REGULAMENTO-v7.md`;
const OUT_PDF = "C:/Users/Moltbot/Desktop/REGULAMENTO-DesafioGUT-v7.pdf";
const OUT_QR = "C:/Users/Moltbot/Desktop/QRCODE-Regulamento-v7.png";
const URL_OFICIAL = "https://silly-stardust-ca71bc.netlify.app/regras-oficiais";
const SCRATCH = process.argv[2];
if (!SCRATCH) throw new Error("uso: node UTAC135_gerar-pdf-qr.mjs <pasta-scratch>");

// esc + «R$ 2,00» / «Art. 19» / «nº 23.040…» sem quebra de linha no meio (só CSS; nenhum caractere muda)
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/(R\$ [\d.,]+|Art\. \d+º?|nº [\d./-]+)/g, '<span style="white-space:nowrap">$1</span>');

// ---- parse: uma linha não vazia = um bloco ----
const texto = readFileSync(SRC, "utf8").replace(/\r\n/g, "\n");
const linhas = texto.split("\n").map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);

const RE_TIT = /^# (.+)$/;
const RE_CAP = /^## (CAPÍTULO [IVXL]+ — .+)$/;
const RE_ART = /^(Art\. \d+(?:º|\.)) (.+)$/;

let titulo = null;
const blocos = [];
const corpoRef = []; // texto do .md sem marcadores, p/ verificação de palavras
for (const l of linhas) {
  let m;
  if ((m = l.match(RE_TIT)) && titulo === null && !blocos.length) { titulo = m[1]; corpoRef.push(m[1]); }
  else if ((m = l.match(RE_CAP))) { blocos.push({ tipo: "cap", html: esc(m[1]) }); corpoRef.push(m[1]); }
  else if ((m = l.match(RE_ART))) { blocos.push({ tipo: "art", html: `<b>${esc(m[1])}</b> ${esc(m[2])}` }); corpoRef.push(l); }
  else throw new Error(`linha não reconhecida (parar, não adivinhar): ${l.slice(0, 80)}`);
}
writeFileSync(`${SCRATCH}/corpo.txt`, corpoRef.join("\n"), "utf8");
console.log("título:", JSON.stringify(titulo), "| caps:", blocos.filter((b) => b.tipo === "cap").length,
  "| arts:", blocos.filter((b) => b.tipo === "art").length);

// ---- HTML: capítulo agrupado com o 1.º artigo seguinte (sem títulos órfãos) ----
const tag = (b) => (b.tipo === "cap" ? `<h2>${b.html}</h2>` : `<p class="art">${b.html}</p>`);
let html = "";
for (let i = 0; i < blocos.length; i++) {
  if (blocos[i].tipo === "cap") {
    let grupo = tag(blocos[i]);
    if (i + 1 < blocos.length) grupo += tag(blocos[++i]);
    html += `<div class="keep">${grupo}</div>\n`;
  } else html += tag(blocos[i]) + "\n";
}

const doc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>DesafioGUT — Regulamento Oficial v7</title>
<style>
  @page { size: A4; }
  html { font-family: "Times New Roman", Times, Georgia, serif; font-size: 12pt; line-height: 1.5; color: #000; }
  body { margin: 0; }
  p { margin: 0 0 6pt; text-align: justify; hyphens: manual; orphans: 3; widows: 3; }
  .titulo { text-align: center; margin: 0 0 18pt; }
  .titulo h1 { font-size: 15pt; margin: 0; letter-spacing: .5pt; }
  .titulo hr { border: 0; border-top: .75pt solid #000; width: 40%; margin: 12pt auto 0; }
  h2 { font-size: 12pt; text-align: center; margin: 16pt 0 8pt; break-after: avoid; page-break-after: avoid; }
  .keep { break-inside: avoid; page-break-inside: avoid; }
</style></head><body>
<div class="titulo"><h1>${esc(titulo)}</h1><hr></div>
${html}</body></html>`;
writeFileSync(`${SCRATCH}/regulamento.html`, doc, "utf8");

// ---- PDF ----
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(doc, { waitUntil: "load" });
const hf = 'font-family:"Times New Roman",Times,serif;font-size:9pt;color:#333;width:100%;margin:0 2.5cm;';
await page.pdf({
  path: OUT_PDF,
  format: "A4",
  margin: { top: "2.5cm", bottom: "2.5cm", left: "2.5cm", right: "2.5cm" },
  displayHeaderFooter: true,
  headerTemplate: `<div style='${hf}padding-top:1.1cm;border:0'><div style="border-bottom:.5pt solid #555;padding-bottom:2pt;display:flex;justify-content:space-between"><span>DesafioGUT — Regulamento Oficial</span><span>Versão 7</span></div></div>`,
  footerTemplate: `<div style='${hf}padding-bottom:1.1cm;text-align:center'>Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`,
  printBackground: true,
});

// ---- link oficial: só leitura, para declarar que versão o site serve hoje (deploy proibido) ----
try {
  const resp = await page.goto(URL_OFICIAL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  const corpoSite = await page.evaluate(() => document.body.innerText);
  console.log("site HTTP:", resp && resp.status(), "| URL final:", page.url(),
    "| tem 'Versão 5.1':", corpoSite.includes("Versão 5.1"), "| tem 'VERSÃO 7':", corpoSite.includes("VERSÃO 7"),
    "| tem 'Art. 72º':", corpoSite.includes("Art. 72º"));
  await page.screenshot({ path: `${SCRATCH}/site.png` });
} catch (e) { console.log("site: leitura falhou —", e.message); }
await browser.close();

// ---- QR ----
await QRCode.toFile(OUT_QR, URL_OFICIAL, { errorCorrectionLevel: "H", width: 1200, margin: 4, color: { dark: "#000000", light: "#FFFFFF" } });
console.log("OK", OUT_PDF, OUT_QR);

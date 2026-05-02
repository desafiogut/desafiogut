// Valida (em modo NÃO-mock) que a Dashboard não exibe valores residuais
// de localStorage do Beta — i.e., que o gate MOCK_MODE no AppContext está
// efetivamente zerando carteiraFlash, fichasProgramadas e LANCES_MOCK.
//
// Pré-req:
//   - dev server rodando em http://localhost:3000 com VITE_MOCK_MODE=false
//   - injetamos localStorage "sujo" (R$ 196,00 de saldo, 99 fichas, 22 lances)
//     ANTES de carregar a app — se o gate funcionar, esses valores não chegam
//     ao DOM.
//
// Saída: exit 0 se UI mostra zeros + tabela vazia; exit 1 se vazou.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, ".out");
mkdirSync(outDir, { recursive: true });

const URL = process.env.VITE_DEV_URL || "http://localhost:3000";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

// Injeta consentimento + localStorage SUJO antes do bundle React rodar.
await context.addInitScript(() => {
  sessionStorage.setItem("gut_consentimento", JSON.stringify({ aceito: true, ts: Date.now() }));
  // Os keys que o saldoInterno.js usa em MOCK_MODE — em produção devem ser ignorados.
  localStorage.setItem("gut_carteira_flash", "196.00");
  localStorage.setItem("gut_fichas_programadas", "99");
  // 22 lances fake (similar ao que se acumula em testes locais).
  const lancesSujos = Array.from({ length: 22 }, (_, i) => ({
    endereco: "0xDEAD00000000000000000000000000000000BEEF",
    valor: 100 + i, repetido: i % 3 === 0, txHash: `0xfake${i}`,
  }));
  localStorage.setItem("gut_lances_r1", JSON.stringify(lancesSujos));
});

// Lista de palavras proibidas em produção (após A.2).
// Cada uma com `requireContext` opcional para não falsar com texto incidental.
const proibidos = [
  { needle: "R$ 196",                         label: "saldo flash sujo (R$ 196)" },
  { needle: "+ PIX R$ 10",                    label: "botão simulação PIX" },
  { needle: "→ 1 Ficha",                      label: "botão converter ficha" },
  { needle: "Simulação Beta",                 label: "label simulação Beta" },
  { needle: "SALDO FLASH",                    label: "card Saldo Flash" },
  { needle: "Saldo Flash",                    label: "KPI Saldo Flash" },
];

const rotas = ["/", "/carteira", "/mercado", "/ativos", "/seguranca", "/configuracoes"];
const violacoes = [];

for (const rota of rotas) {
  await page.goto(URL + rota, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(800);
  const text = await page.evaluate(() => document.body.innerText);
  for (const { needle, label } of proibidos) {
    if (text.includes(needle)) {
      violacoes.push({ rota, needle, label });
    }
  }
}

// Screenshots para inspeção visual: Dashboard, Carteira (deslogado), Mercado.
const screenshots = {};
for (const [nome, rota] of [["dashboard", "/"], ["carteira", "/carteira"], ["mercado", "/mercado"]]) {
  await page.goto(URL + rota, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const path = resolve(outDir, `no-placeholders-${nome}-390x844.png`);
  await page.screenshot({ path, fullPage: true });
  screenshots[nome] = path;
}
await browser.close();

if (violacoes.length) {
  console.error("FAIL: placeholders mockados vazaram para o DOM:");
  violacoes.forEach((v) => console.error(`  - ${v.rota}: ${v.label} ("${v.needle}")`));
  Object.entries(screenshots).forEach(([n, p]) => console.error(`  screenshot ${n}: ${p}`));
  process.exit(1);
}
console.log(`OK: ${rotas.length} rotas auditadas, nenhum placeholder vazou.`);
Object.entries(screenshots).forEach(([n, p]) => console.log(`  screenshot ${n}: ${p}`));

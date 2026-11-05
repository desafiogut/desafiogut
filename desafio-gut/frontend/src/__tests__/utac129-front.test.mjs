// utac129-front.test.mjs — UTAC129 (Frente C). Links partilhados e a UI do lance sem Passe.
//
// Contrato por FONTE (sem comentários: um comentário nunca satisfaz uma asserção) + o módulo REAL de origem.
// Porquê fonte: o CardLance só renderiza dentro do AppProvider (Privy/RPC); o comportamento do lance sem Passe
// é provado no handler real (`netlify/functions/_tests/utac129-lance-sem-passe.test.mjs`).
//
// Corre com:  node --test src/__tests__/utac129-front.test.mjs   (a partir de desafio-gut/frontend)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";

const SRC = caminho(dirname(fileURLToPath(import.meta.url)), "..");
const ler = (p) => readFileSync(caminho(SRC, p), "utf8");
const codigo = (src) => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

const PRODUCAO = "https://silly-stardust-ca71bc.netlify.app";

test("C1 a origem de produção é exportada e é a da Netlify (literal)", async () => {
  const m = await import("../lib/apiOrigin.js");
  assert.equal(m.ORIGEM_PRODUCAO, PRODUCAO);
});

test("C2 (furo F3) convite de indicação: PainelIndicacao e ChatbotWidget usam a origem de produção, nunca window.location.origin", () => {
  for (const f of ["components/PainelIndicacao.jsx", "components/ChatbotWidget.jsx"]) {
    const c = codigo(ler(f));
    assert.doesNotMatch(c, /window\.location\.origin/, `${f} ainda monta o link com window.location.origin`);
    assert.match(c, /\$\{ORIGEM_PRODUCAO\}\/\?ref=\$\{/, `${f} não monta o link com ORIGEM_PRODUCAO`);
    assert.match(c, /import \{ ORIGEM_PRODUCAO \} from "\.\.\/lib\/apiOrigin\.js"/, `${f} não importa ORIGEM_PRODUCAO`);
  }
});

test("C3 domínio morto: nenhum código aponta para https://desafiogut.com (só o .com.br do cliente existe)", () => {
  for (const f of ["pages/MercadoLances.jsx", "hooks/useComprarPasse.js"]) {
    const c = codigo(ler(f));
    assert.doesNotMatch(c, /https:\/\/desafiogut\.com(?!\.br)/, `${f} ainda aponta para desafiogut.com`);
    assert.doesNotMatch(c, />desafiogut\.com</, `${f} ainda MOSTRA desafiogut.com`);
    assert.match(c, /= ORIGEM_PRODUCAO;/, `${f} não usa a origem de produção`);
  }
});

test("C4 (Frente A na UI) o CardLance já não exige nem vende Passe para licitar", () => {
  const c = codigo(ler("components/CardLance.jsx"));
  assert.doesNotMatch(c, /Precisa de 1 Passe/);
  assert.doesNotMatch(c, /semPasseRelampago|useInventarioPasses|semPasses\(/);
  assert.doesNotMatch(c, /Comprar Passe Relâmpago|data-cta-comprar-passe/);
  assert.doesNotMatch(c, /sem_passes_disponiveis/);
  // o botão de lance continua lá e continua governado pelos PONTOS (fail-closed do UTAC110j.5)
  assert.match(c, /onClick=\{handleDarLance\}/);
  assert.match(c, /semPontosFlash && pontosL\.mensagem/);
});

test("C5 (R18-129-3) o PALPITE continua a pedir Passe Programado no Início", () => {
  const c = codigo(ler("pages/Dashboard.jsx"));
  assert.match(c, /Precisa de 1 Passe Programado para palpitar\./);
});

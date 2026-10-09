// UTAC109b — limpeza geral: guarda das 7 pendências do UTAC108g fechadas neste UTAC.
//
// node --test "src/__tests__/utac109b-limpeza.test.mjs"
//
// Fechado aqui:
//   P-1  `dash.outrasEdicoes` (src/i18n/pt.js:35) — chave órfã, 0 chamadas `t(...)` → REMOVIDA.
//   P-2  `public/robots.txt` — linha `Disallow: /corporativo` (rota inexistente desde o 108f) → REMOVIDA.
//   P-3  `scripts/test-mc12{,-3,.3.1}.mjs` — 3 scripts partidos que testavam o lojista apagado
//        no 108f/108g (SejaNossoParceiro.jsx, corporativoWallet, .env.production) → REMOVIDOS.
//
// Decisões do operador neste UTAC (R18, SEG0):
//   R18-D1  os 2 endpoints mortos FICAM: `info-pagamento.mjs` (0 chamadores, mas `docs/inventario-remocao.md`
//           diz «preservar» e `docs/aprovacoes-operador.md` #4 mantém-no aberto) e `debug-pedido.mjs`
//           (tem chamador no teste MC87 P1-3) ⇒ ambos PRESERVADOS (guarda de existência abaixo).
//   R18-D2  os 3 scripts `test-mc12*` saem.
//   R18-D3  `Privacidade.jsx:91` («fluxo corporativo») é TEXTO LEGAL → NÃO se altera (dívida nova no DEBT).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const RAIZ = fileURLToPath(new URL("../..", import.meta.url)); // desafio-gut/frontend
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");

// ── controlo de vitalidade: nada abaixo prova coisa nenhuma se os ficheiros não forem lidos ──
test("controlo positivo: os ficheiros-alvo existem e são lidos (não vazio)", () => {
  for (const rel of ["src/i18n/pt.js", "public/robots.txt"]) {
    assert.ok(existsSync(join(RAIZ, rel)), `${rel} desapareceu`);
    assert.ok(ler(rel).length > 200, `${rel} leu vazio — a régua ficou cega`);
  }
  // Um literal que SABEMOS existir no mesmo dicionário tem de aparecer (senão o «0» do P-1 é aritmética).
  assert.match(ler("src/i18n/pt.js"), /"dash\.edicaoAtiva":/, "o irmão do P-1 desapareceu também");
  // Uma directiva que SABEMOS existir no robots.txt tem de aparecer (senão o «0» do P-2 é aritmética).
  assert.match(ler("public/robots.txt"), /^Disallow: \/admin$/m, "o irmão do P-2 desapareceu também");
});

test("P-1: a chave i18n órfã `dash.outrasEdicoes` saiu do dicionário", () => {
  assert.doesNotMatch(ler("src/i18n/pt.js"), /outrasEdicoes/);
  assert.equal(ler("src/i18n/pt.js").includes("Outras Edi"), false);
  // O dicionário continua a ser um dicionário (a remoção não o esvaziou).
  assert.ok((ler("src/i18n/pt.js").match(/^\s*"dash\./gm) || []).length >= 5);
});

test("P-2: `Disallow: /corporativo` saiu do robots.txt e o resto ficou", () => {
  const txt = ler("public/robots.txt");
  assert.doesNotMatch(txt, /corporativo/);
  // «Fechar não apaga»: as outras directivas mantêm-se.
  assert.match(txt, /^User-agent: \*$/m);
  assert.match(txt, /^Allow: \/$/m);
  assert.match(txt, /^Disallow: \/admin$/m);
  assert.match(txt, /^Disallow: \/\.netlify\/$/m);
  assert.match(txt, /^Sitemap: https:\/\//m);
});

test("P-3: os 3 scripts test-mc12* partidos saíram (e a pasta scripts/ não ficou vazia)", () => {
  for (const f of ["test-mc12.mjs", "test-mc12-3.mjs", "test-mc12.3.1.mjs"]) {
    assert.equal(existsSync(join(RAIZ, "scripts", f)), false, `${f} voltou`);
  }
  // Controlo: outros scripts da mesma pasta continuam lá.
  assert.ok(existsSync(join(RAIZ, "scripts", "validar-dist-rede.mjs")));
});

test("R18-D1: os 2 endpoints mortos foram PRESERVADOS por decisão do operador", () => {
  for (const f of ["info-pagamento.mjs", "debug-pedido.mjs"]) {
    assert.ok(existsSync(join(RAIZ, "netlify", "functions", f)), `${f} foi removido — decisão R18-D1 violada`);
  }
  // O chamador que decidiu o debug-pedido (o teste MC87 P1-3) continua a existir.
  assert.match(ler("netlify/functions/_tests/mc87-seguranca.test.mjs"), /import\("\.\.\/debug-pedido\.mjs"\)/);
});

test("R18-D3: o texto legal da Privacidade não foi tocado por este UTAC", () => {
  assert.match(ler("src/pages/Privacidade.jsx"), /código OTP no fluxo corporativo/);
});

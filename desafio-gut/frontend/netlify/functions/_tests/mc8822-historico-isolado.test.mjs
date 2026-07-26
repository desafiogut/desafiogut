// MC88.22 — o histórico do GUTO tem de ser isolado por perfil + identidade.
//
// PORQUÊ ESTE TESTE EXISTE: o histórico vivia numa chave ÚNICA e GLOBAL do
// localStorage ("gut_chat_history"), sem carteira e sem perfil, e nada a limpava
// ao trocar de conta — quem abrisse o chat a seguir via as mensagens de quem
// esteve antes naquele aparelho. Não havia (nem há) histórico no servidor, logo
// nunca foi fuga entre utilizadores; era exposição local e confusão de UX.
//
// Não existe infraestrutura de testes no frontend (as 236 suites vivem em
// netlify/functions/_tests). Em vez de a introduzir só por isto — o que seria
// tudo menos alteração mínima — este teste lê o FICHEIRO-FONTE e afirma as
// propriedades estruturais que impedem a regressão. Mesma técnica do teste
// mc8816-polling-vs-ratelimit, que também atravessa a fronteira frontend/backend.
//
// node --test _tests/mc8822-historico-isolado.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const WIDGET = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../src/components/ChatbotWidget.jsx",
);
const src = readFileSync(WIDGET, "utf8");

/** Linhas de código, sem comentários — evita casar com texto explicativo. */
const codigo = src
  .split("\n")
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join("\n");

test("a chave do histórico NÃO é uma constante global", () => {
  assert.ok(
    !/const\s+LS_KEY\s*=\s*["'`]gut_chat_history["'`]\s*;/.test(codigo),
    'voltou a existir `const LS_KEY = "gut_chat_history"` — chave global, ' +
    "partilhada por todas as contas do aparelho",
  );
});

test("a chave é composta por perfil + identidade", () => {
  assert.match(codigo, /function\s+chaveHistorico\s*\(\s*perfil\s*,\s*identidade\s*\)/,
    "falta a função chaveHistorico(perfil, identidade)");
  // O prefixo tem de ser usado num template com os dois componentes.
  assert.match(codigo, /\$\{LS_PREFIXO\}\$\{perfil[^}]*\}:\$\{identidade/,
    "a chave não interpola perfil E identidade");
});

test("os helpers recebem a chave como argumento (não a fixam)", () => {
  assert.match(codigo, /function\s+carregarHistorico\s*\(\s*chave\s*\)/,
    "carregarHistorico tem de receber a chave");
  assert.match(codigo, /function\s+salvarHistorico\s*\(\s*chave\s*,\s*hist\s*\)/,
    "salvarHistorico tem de receber a chave");
});

test("visitantes usam o gut_visitor_id existente — nunca o IP", () => {
  assert.match(codigo, /getCachedVisitorId\s*\(\s*\)/,
    "visitantes deviam ser identificados pelo gut_visitor_id já existente");
  assert.ok(!/\bIP\b|ipAddress|remoteAddr/i.test(codigo),
    "o IP não é acessível ao cliente e mudaria a cada rede: isolamento falso");
});

test("a identidade autenticada é a carteira, em minúsculas", () => {
  assert.match(codigo, /String\(address\)\.toLowerCase\(\)/,
    "a carteira tem de ser normalizada para minúsculas na chave");
});

test("há guarda contra gravar o histórico antigo na chave nova", () => {
  // A armadilha: quando a identidade muda, o efeito de GRAVAÇÃO corre no mesmo
  // commit que o de CARGA, ainda com as mensagens da conta anterior. Sem guarda,
  // escreveria o histórico antigo na chave nova — recriando o vazamento.
  assert.match(codigo, /trocandoIdentidadeRef/,
    "falta a guarda de troca de identidade entre os efeitos de carga e gravação");
  assert.match(codigo, /if\s*\(\s*trocandoIdentidadeRef\.current\s*\)\s*\{[^}]*return/,
    "a guarda existe mas não salta a primeira gravação após a troca");
});

test("o blob global legado é apagado, não migrado", () => {
  assert.match(codigo, /removeItem\(\s*LS_KEY_LEGADO\s*\)/,
    "o blob global misturado tem de ser apagado");
  // Migrá-lo atribuiria a mistura de várias contas a quem entrasse primeiro.
  assert.ok(!/setItem\([^)]*LS_KEY_LEGADO/.test(codigo),
    "o legado não pode ser migrado para uma identidade — é a mistura das contas");
});

test("limpar o histórico afeta só a identidade atual", () => {
  assert.match(codigo, /removeItem\(\s*chaveHist\s*\)/,
    "limparHistorico tem de remover a chave da identidade atual, não uma global");
});

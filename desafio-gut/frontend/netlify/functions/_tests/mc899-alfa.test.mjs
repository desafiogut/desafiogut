// MC89.9 — testes do sistema de comandos ALFA (chatbot.mjs).
// node --test --experimental-test-module-mocks _tests/mc899-alfa.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { detectarIntent } from "../chatbot.mjs";

// O pattern não é exportado (const local), mas podemos testá-lo por via do
// detectarIntent. E construir uma instância equivalente para testar os grupos
// de captura, que é o que o handler precisa.

const PADRAO_ALFA = /^ALFA:\s*(\w+)(?:\s+(.*))?$/i;

// ── Pattern matching ───────────────────────────────────────────────────────

test("ALFA:status é detetado como comando_alfa", () => {
  assert.equal(detectarIntent("ALFA:status"), "comando_alfa");
  assert.equal(detectarIntent("alfa:status"), "comando_alfa");
  assert.equal(detectarIntent("ALFA: status"), "comando_alfa");
});

test("ALFA com ação e parâmetros captura ambos", () => {
  const m = "ALFA:fila todas".match(PADRAO_ALFA);
  assert.ok(m);
  assert.equal(m[1], "fila");
  assert.equal(m[2], "todas");
});

test("ALFA sem parâmetros funciona", () => {
  const m = "ALFA:ajuda".match(PADRAO_ALFA);
  assert.ok(m);
  assert.equal(m[1], "ajuda");
  // Grupo opcional: sem parâmetros é undefined (o handler faz ||"" depois)
  assert.equal(m[2] || "", "");
});

test("ALFA em maiúsculas/minúsculas funciona", () => {
  const m = "alfa:STATUS".match(PADRAO_ALFA);
  assert.ok(m);
  // O grupo de captura preserva o caso original — a normalização é aplicada
  // pelo handler depois da captura.
  assert.equal(m[1], "STATUS");
});

test("ALFA: status (com espaco apos dois pontos) captura acao corretamente", () => {
  const m = "ALFA: status".match(PADRAO_ALFA);
  assert.ok(m);
  assert.equal(m[1], "status");
});

test("frase que CONTÉM ALFA mas não COMEÇA com ALFA: não é comando_alfa", () => {
  assert.notEqual(detectarIntent("o que é o comando ALFA:status?"), "comando_alfa");
  assert.notEqual(detectarIntent("gostava de saber sobre ALFA:status"), "comando_alfa");
});

test("ALFA: sem ação (só dois pontos) não captura", () => {
  assert.equal(detectarIntent("ALFA:"), null,
    "ALFA: sem ação não é comando — pode cair no RAG ou noutro intent");
});

// ── Prioridade: ALFA é testado ANTES de métricas genéricas ─────────────────

test("ALFA:status NÃO é desviado para metricas_geral", () => {
  // "ALFA:status" contém "status" e "sistema" não — mas queremos garantir que
  // a ordem de deteção não deixa cair no intent errado.
  for (const alfa of ["ALFA:status", "ALFA:fila", "ALFA:panic"]) {
    assert.equal(detectarIntent(alfa), "comando_alfa",
      `"${alfa}" devia ser comando_alfa, não outro intent`);
  }
});

// ── Não captura frases normais ─────────────────────────────────────────────

test("/panic e /unpanic originais continuam a funcionar", () => {
  // O comando_alfa é prefixo fixo. As frases sem prefixo NÃO são ALFA.
  assert.equal(detectarIntent("/panic"), "panic");
  assert.equal(detectarIntent("/unpanic"), "unpanic");
  assert.equal(detectarIntent("modo panico"), "panic");
  assert.equal(detectarIntent("ALFA:panic"), "comando_alfa", "ALFA:panic é ALFA, não /panic");
});

// ── Nenhuma colisão com métricas ───────────────────────────────────────────

test("perguntas de métricas NÃO são desviadas para ALFA", () => {
  // Estas frases têm de continuar a ir para os intents de métricas (MC89.2)
  assert.equal(detectarIntent("quantos utilizadores ativos?"), "metricas_usuarios");
  assert.equal(detectarIntent("como esta o sistema?"), "metricas_geral");
  assert.equal(detectarIntent("qual o saldo da coordenadora?"), "metricas_eoa");
  assert.equal(detectarIntent("como esta a fila?"), "metricas_fila");
});

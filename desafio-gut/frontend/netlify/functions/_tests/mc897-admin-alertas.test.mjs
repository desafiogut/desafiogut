// MC89.7 — testes da computação de alertas do painel ADM.
// node --test --experimental-test-module-mocks _tests/mc897-admin-alertas.test.mjs
//
// A lógica de cada alerta vive em `_lib/admin-alertas.mjs` (pura, injetável).
// Testa-se com um duplo de Supabase — é o padrão do projeto: testar a lógica,
// não o handler HTTP.
//
// Validado por MUTAÇÃO: partir cada condição e ver o teste correspondente
// ficar vermelho ([[testar-teste-novo-por-mutacao]]).

import { test } from "node:test";
import assert from "node:assert/strict";
import { computarAlertas } from "../_lib/admin-alertas.mjs";

// ── Duplo de Supabase ──────────────────────────────────────────────────────
// Simula `sb.from(tabela).select(...).gte(...).filter(...)` devolvendo
// `{ data, error }` ou `{ count, error }`.

function criarSb(respostas = {}) {
  const padrao = { data: [], error: null, count: 0 };

  return {
    from(tabela) {
      const cfg = respostas[tabela] || padrao;
      let cadeia = {
        _cfg: cfg,
        select(_cols, opts = {}) {
          if (opts.head) {
            // count query
            return {
              gte: () => ({
                filter: () => Promise.resolve({ count: cfg.count ?? 0, error: cfg.error || null }),
              }),
            };
          }
          return {
            gte: () => ({
              order: () => Promise.resolve({ data: cfg.data || [], error: cfg.error || null }),
              lt: () => ({
                limit: () => Promise.resolve({ data: cfg.data || [], error: cfg.error || null }),
              }),
            }),
            neq: () => ({
              lt: () => ({
                limit: () => Promise.resolve({ data: cfg.data || [], error: cfg.error || null }),
              }),
            }),
          };
        },
      };
      return cadeia;
    },
  };
}

// ── A2: Fila travada ───────────────────────────────────────────────────────

test("A2: fila com tarefa pendente há > 10 min → alerta critical", async () => {
  const sb = criarSb({
    fila_tarefas: { data: [
      { id: "1", status: "pending", atualizado_em: "2026-07-30T00:00:00Z" },
    ], error: null },
  });
  const agora = () => new Date("2026-07-30T12:00:00Z");

  const alerts = await computarAlertas({ sb, env: { BLOBS_TOKEN: "x", REDIS_URL: "x" }, agora });

  const a = alerts.find((a) => a.id === "fila_travada");
  assert.ok(a, "esperava alerta de fila travada");
  assert.equal(a.nivel, "critical");
  assert.match(a.mensagem, /1 tarefa/);
});

test("A2: todas as tarefas 'done' → sem alerta de fila", async () => {
  const sb = criarSb({ fila_tarefas: { data: [], error: null } });
  const agora = () => new Date("2026-07-30T12:00:00Z");

  const alerts = await computarAlertas({ sb, env: { BLOBS_TOKEN: "x", REDIS_URL: "x" }, agora });

  assert.equal(alerts.find((a) => a.id === "fila_travada"), undefined,
    "sem pendentes = sem alerta — não se deve alarmar o que está bem");
});

test("A2: erro do Supabase → alerta de indisponibilidade, não explode", async () => {
  const sb = criarSb({ fila_tarefas: { data: null, error: { message: "connection refused" } } });

  const alerts = await computarAlertas({ sb, env: { BLOBS_TOKEN: "x", REDIS_URL: "x" } });

  const a = alerts.find((a) => a.id === "fila_indisponivel");
  assert.ok(a);
  assert.equal(a.nivel, "warning");
});

// ── A3: Webhook inativo ────────────────────────────────────────────────────

test("A3: zero créditos de webhook → alerta warning", async () => {
  const sb = criarSb({ saldo_rs_creditos: { count: 0, error: null } });
  const agora = () => new Date("2026-07-30T12:00:00Z");

  const alerts = await computarAlertas({ sb, env: { BLOBS_TOKEN: "x", REDIS_URL: "x" }, agora });

  const a = alerts.find((a) => a.id === "webhook_inativo");
  assert.ok(a);
  assert.equal(a.nivel, "warning");
  assert.match(a.mensagem, /7 dias/);
  assert.match(a.mensagem, /confirmados manualmente/);
});

test("A3: crédito de webhook nos últimos 7 dias → sem alerta", async () => {
  const sb = criarSb({ saldo_rs_creditos: { count: 3, error: null } });

  const alerts = await computarAlertas({ sb, env: { BLOBS_TOKEN: "x", REDIS_URL: "x" } });

  assert.equal(alerts.find((a) => a.id === "webhook_inativo"), undefined);
});

// ── A6: Blobs cego ─────────────────────────────────────────────────────────

test("A6: BLOBS_TOKEN ausente → alerta warning", async () => {
  const sb = criarSb({});
  const alerts = await computarAlertas({ sb, env: {}, agora: () => new Date() });

  const a = alerts.find((a) => a.id === "blobs_cego");
  assert.ok(a);
  assert.equal(a.nivel, "warning");
  assert.match(a.mensagem, /BLOBS_TOKEN/);
});

test("A6: BLOBS_TOKEN definido → sem alerta", async () => {
  const sb = criarSb({});
  const alerts = await computarAlertas({ sb, env: { BLOBS_TOKEN: "sim", REDIS_URL: "x" } });

  assert.equal(alerts.find((a) => a.id === "blobs_cego"), undefined);
});

// ── A7: Cache Redis ────────────────────────────────────────────────────────

test("A7: REDIS_URL ausente → alerta info", async () => {
  const sb = criarSb({});
  const alerts = await computarAlertas({ sb, env: { BLOBS_TOKEN: "x" } });

  const a = alerts.find((a) => a.id === "cache_sem_redis");
  assert.ok(a);
  assert.equal(a.nivel, "info");
});

// ── A5: RAG (sempre presente enquanto não houver metadado) ─────────────────

test("A5: alerta de RAG sem metadado está SEMPRE presente", async () => {
  const sb = criarSb({});
  const alerts = await computarAlertas({ sb, env: { BLOBS_TOKEN: "x", REDIS_URL: "x" } });

  const a = alerts.find((a) => a.id === "rag_sem_metadado");
  assert.ok(a);
  assert.equal(a.nivel, "info");
  assert.match(a.mensagem, /fora do reposit.rio/);
});

// ── Forma da resposta ──────────────────────────────────────────────────────

test("cada alerta tem os campos obrigatórios", async () => {
  const sb = criarSb({ fila_tarefas: { data: [
    { id: "1", status: "pending", atualizado_em: "2026-07-20T00:00:00Z" },
  ], error: null } });
  const alerts = await computarAlertas({ sb, env: {} });

  assert.ok(alerts.length >= 4, `esperava ≥ 4 alertas, vi ${alerts.length}`);
  for (const a of alerts) {
    assert.ok(a.id && typeof a.id === "string", `id ausente em ${JSON.stringify(a)}`);
    assert.ok(["critical", "warning", "info"].includes(a.nivel),
      `nivel inválido "${a.nivel}" em ${a.id}`);
    assert.ok(a.mensagem && a.mensagem.length > 10,
      `mensagem curta/ausente em ${a.id}`);
    assert.ok(a.fonte && typeof a.fonte === "string",
      `fonte ausente em ${a.id}`);
  }
});

test("computarAlertas não lança exceção — devolve alertas, nunca explode", async () => {
  // Um duplo que lança em qualquer operação não devia ser possível com a API
  // real do PostgREST, mas o handler tem de sobreviver.
  const sb = {
    from() {
      throw new Error("inesperado");
    },
  };
  let alerts;
  try {
    alerts = await computarAlertas({ sb, env: {} });
  } catch (err) {
    assert.fail(`computarAlertas não pode lançar: ${err.message}`);
  }
  assert.ok(Array.isArray(alerts));
});

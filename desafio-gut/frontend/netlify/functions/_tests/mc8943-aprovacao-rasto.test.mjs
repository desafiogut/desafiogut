// MC89.43 (S0) — aprovar/rejeitar deixa rasto, e o rasto vem ANTES da mudança.
//
// Era a única lacuna de auditoria CONFIRMADA do MC89.42: `admin-aprovacao` tinha
// zero chamadas ao log. Decidir quem entra no sistema não deixava rasto nenhum.
//
// O que este teste prende (e que uma leitura do código não garante):
//   1. uma transição real regista a ação e confirma-a com sucesso=true;
//   2. a ORDEM — registar ANTES de gravar. Se o log falhar, a transição NÃO
//      acontece (503) e o blob fica intocado. É o contrato fail-CLOSED: uma
//      aprovação sem rasto é pior do que uma aprovação que não aconteceu;
//   3. um pedido idempotente (mesmo status) NÃO polui a trilha.
//
// node --test --experimental-test-module-mocks _tests/mc8943-aprovacao-rasto.test.mjs

import { test, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

// ── Estado observável ──────────────────────────────────────────────────────
const eventos = [];               // sequência real de operações
let blobMem = new Map();
let registrarDeveLancar = false;

// ── Duplos ─────────────────────────────────────────────────────────────────
mock.module("@netlify/blobs", {
  namedExports: {
    getStore: () => ({
      get: async (k) => blobMem.get(k) ?? null,
      setJSON: async (k, v) => { eventos.push("gravou_blob"); blobMem.set(k, v); },
      list: async () => ({ blobs: [] }),
    }),
  },
});

mock.module("../_lib/admin-log.mjs", {
  namedExports: {
    registrarAcao: async (args) => {
      if (registrarDeveLancar) {
        eventos.push("registrar_falhou");
        throw new Error("admin_logs indisponível");
      }
      eventos.push("registrou");
      registos.push(args);
      return { id: "log-1" };
    },
    confirmarAcao: async (id, r) => { eventos.push(`confirmou:${r.sucesso}`); },
    lerLogs: async () => ({ linhas: [], total: 0 }),
  },
});

mock.module("../_lib/rate-limiter.mjs", {
  namedExports: { aplicarRateLimit: async () => null },
});
mock.module("../_lib/admin-auth.mjs", {
  namedExports: {
    autenticarAdmin: async () => ({
      ok: true, endereco: "0xADM", payload: { nivel: "super" },
    }),
    guardAdminNivel: async () => null,
  },
});
mock.module("../_lib/require-mfa.mjs", {
  namedExports: { requireMfa: () => null },
});
// `cors.mjs` NÃO é duplicado: `validate.mjs` importa dele e um duplo parcial
// partia o módulo real. Num POST o preflight devolve null — não estorva.

const registos = [];
let handler;
before(async () => { handler = (await import("../admin-aprovacao.mjs")).default; });

beforeEach(() => {
  eventos.length = 0;
  registos.length = 0;
  registrarDeveLancar = false;
  blobMem = new Map([[
    "0x1111111111111111111111111111111111111111",
    { cliente_id: "0x1111111111111111111111111111111111111111", status: "pendente", historico: [] },
  ]]);
});

function pedido(body) {
  return new Request("https://x/.netlify/functions/admin-aprovacao", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "teste" },
    body: JSON.stringify(body),
  });
}

const ALVO = "0x1111111111111111111111111111111111111111";

test("aprovar regista a ação e confirma sucesso", async () => {
  const res = await handler(pedido({ acao: "aprovar", cliente_id: ALVO, motivo: "documentos conferidos" }));

  assert.equal(res.status, 200);
  assert.deepEqual(eventos, ["registrou", "gravou_blob", "confirmou:true"]);

  const r = registos[0];
  assert.equal(r.tipo_acao, "aprovar_cliente");
  assert.equal(r.alvo, ALVO);
  assert.equal(r.admin_endereco, "0xADM");
  assert.equal(r.justificativa, "documentos conferidos");
  assert.deepEqual(r.payload, { de: "pendente", para: "aprovado", por: "admin" });
});

test("rejeitar usa o seu próprio tipo de ação", async () => {
  await handler(pedido({ acao: "rejeitar", cliente_id: ALVO, motivo: "CNPJ inválido" }));
  assert.equal(registos[0].tipo_acao, "rejeitar_cliente");
});

test("FAIL-CLOSED: log em baixo → 503 e o cliente NÃO muda de estado", async () => {
  registrarDeveLancar = true;

  const res = await handler(pedido({ acao: "aprovar", cliente_id: ALVO, motivo: "documentos conferidos" }));

  assert.equal(res.status, 503, "sem rasto, a ação tem de ser recusada");
  assert.equal((await res.json()).error.code, "log_indisponivel");
  assert.ok(
    !eventos.includes("gravou_blob"),
    "a aprovação foi gravada sem registo de auditoria — é exatamente o que o fail-CLOSED existe para impedir",
  );
  assert.equal(blobMem.get(ALVO).status, "pendente", "o estado do cliente devia ficar intocado");
});

test("pedido idempotente não escreve na trilha de auditoria", async () => {
  blobMem.set(ALVO, { cliente_id: ALVO, status: "aprovado", historico: [] });

  const res = await handler(pedido({ acao: "aprovar", cliente_id: ALVO, motivo: "repetido" }));

  assert.equal(res.status, 200);
  assert.equal((await res.json()).idempotent, true);
  assert.deepEqual(eventos, [], "nada mudou, logo não há ação para registar");
});

// MC94.3 — HARD GATE 6: a scheduled encerra e consolida a especial depois das
// 20:30, sozinha, sem nunca reenviar uma transacção.
//
// Regra de ouro herdada do consolidar-lances (ITEM 4.2): "NUNCA reenvia
// automaticamente". Um cron de minuto a minuto que repetisse a cada falha
// violá-la-ia 60 vezes por hora. Por isso: marcador gravado ANTES de chamar;
// 202 / 502 / excepção fecham o caminho automático; só falhas de ANTES do envio
// (409 / 422 / 503) se repetem, e no máximo 5 vezes.
//
// node --test --experimental-test-module-mocks _tests/mc943-scheduled-encerrar.test.mjs

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const stores = new Map();
function storeDe(nome) {
  if (!stores.has(nome)) {
    const mem = new Map();
    stores.set(nome, {
      mem,
      async get(k, { type } = {}) { const v = mem.get(k); if (v === undefined) return null; return type === "json" ? JSON.parse(v) : v; },
      async setJSON(k, o) { mem.set(k, JSON.stringify(o)); },
    });
  }
  return stores.get(nome);
}

const estado = {
  edicoes: {}, agendadas: {},
  encerradas: [], consolidadas: [], opcoesConsolidar: [],
  resultado: { status: 200, corpo: { ok: true } },
  lancarConsolidar: false, lancarEncerrar: false,
};

mock.module("@netlify/blobs", { namedExports: { getStore: ({ name }) => storeDe(name) } });
mock.module("@netlify/functions", { namedExports: { schedule: (_cron, fn) => fn } });
mock.module("../_lib/edicoes-core.mjs", {
  namedExports: {
    listarEdicoes: async () => ({ edicoes: estado.edicoes, agendadas: estado.agendadas }),
    encerrarEdicao: async ({ edicaoId, origem }) => {
      if (estado.lancarEncerrar) throw new Error("blob em baixo");
      estado.encerradas.push({ edicaoId, origem });
      estado.edicoes[edicaoId] = { ...estado.edicoes[edicaoId], status: "encerrado" };
      return { ok: true };
    },
  },
});
mock.module("../_lib/consolidacao.mjs", {
  namedExports: {
    consolidarEdicao: async (id, opts) => {
      estado.consolidadas.push(id);
      estado.marcaNaChamada = await storeDe("consolidacao-automatica").get(id, { type: "json" });
      estado.opcoesConsolidar.push(opts);
      if (estado.lancarConsolidar) throw new Error("rpc caiu");
      return estado.resultado;
    },
  },
});

const mod = await import("../scheduled-encerrar-especial.mjs");
const { tick, MAX_TENTATIVAS_ANTES_DO_ENVIO, STORE_MARCAS } = mod;

const TERMINO = Date.parse("2026-10-04T23:30:00.000Z");
const especial = (extra = {}) => ({
  id: "ESPECIAL-AIRFRYER", tipo: "programado", status: "aberto",
  inicio_em: "2026-10-04T23:00:00.000Z", termino_em: "2026-10-04T23:30:00.000Z", ...extra,
});

beforeEach(() => {
  stores.clear();
  Object.assign(estado, {
    edicoes: { "ESPECIAL-AIRFRYER": especial() }, agendadas: {},
    encerradas: [], consolidadas: [], opcoesConsolidar: [],
    resultado: { status: 200, corpo: { ok: true, vencedor: "0xaa" } },
    lancarConsolidar: false, lancarEncerrar: false, marcaNaChamada: null,
  });
});

test("antes do fim: não encerra nem consolida", async () => {
  await tick(TERMINO - 60_000);
  assert.deepEqual(estado.encerradas, []);
  assert.deepEqual(estado.consolidadas, []);
});

test("às 20:30 em ponto ainda NÃO (a janela de lances inclui o último instante)", async () => {
  await tick(TERMINO);
  assert.deepEqual(estado.encerradas, []);
  assert.deepEqual(estado.consolidadas, []);
});

test("depois do fim: encerra (origem scheduled) e consolida uma vez", async () => {
  await tick(TERMINO + 1_000);
  assert.deepEqual(estado.encerradas, [{ edicaoId: "ESPECIAL-AIRFRYER", origem: "scheduled" }]);
  assert.deepEqual(estado.consolidadas, ["ESPECIAL-AIRFRYER"]);
});

test("a janela de mineração cabe no limite da scheduled (< 30 s)", async () => {
  await tick(TERMINO + 1_000);
  const t = estado.opcoesConsolidar[0]?.timeoutMinerMs;
  assert.ok(Number.isFinite(t) && t > 0 && t <= 20_000, `timeoutMinerMs=${t}`);
});

test("não encerra nem consolida DUAS vezes", async () => {
  await tick(TERMINO + 1_000);
  await tick(TERMINO + 61_000);
  await tick(TERMINO + 121_000);
  assert.equal(estado.encerradas.length, 1);
  assert.equal(estado.consolidadas.length, 1);
});

test("já encerrada à mão: não re-encerra, mas consolida (uma vez)", async () => {
  estado.edicoes["ESPECIAL-AIRFRYER"] = especial({ status: "encerrado" });
  await tick(TERMINO + 1_000);
  await tick(TERMINO + 61_000);
  assert.deepEqual(estado.encerradas, []);
  assert.equal(estado.consolidadas.length, 1);
});

test("202 pendente: NUNCA reenvia (a tx pode estar no ar)", async () => {
  estado.resultado = { status: 202, corpo: { ok: false, status: "pendente", txHash: "0xtx" } };
  for (let i = 0; i < 5; i++) await tick(TERMINO + 1_000 + i * 60_000);
  assert.equal(estado.consolidadas.length, 1);
});

test("502 envio_falhou: também não reenvia", async () => {
  estado.resultado = { status: 502, erro: { code: "envio_falhou", message: "x" } };
  for (let i = 0; i < 3; i++) await tick(TERMINO + 1_000 + i * 60_000);
  assert.equal(estado.consolidadas.length, 1);
});

test("excepção a meio: não reenvia (não se sabe se a tx saiu) e o tick não rebenta", async () => {
  estado.lancarConsolidar = true;
  await tick(TERMINO + 1_000);
  await tick(TERMINO + 61_000);
  assert.equal(estado.consolidadas.length, 1);
});

test("o marcador é gravado ANTES de chamar (uma morte a meio não causa reenvio)", async () => {
  await tick(TERMINO + 1_000);
  assert.ok(estado.marcaNaChamada, "no instante da chamada ainda não havia marcador");
  assert.equal(estado.marcaNaChamada.tentativas, 1);
  assert.equal(STORE_MARCAS, "consolidacao-automatica");
});

test("422 sem_vencedor (antes do envio): tenta de novo, mas no máximo N vezes", async () => {
  estado.resultado = { status: 422, erro: { code: "sem_vencedor", message: "x" } };
  for (let i = 0; i < 12; i++) await tick(TERMINO + 1_000 + i * 60_000);
  assert.equal(estado.consolidadas.length, MAX_TENTATIVAS_ANTES_DO_ENVIO);
  assert.equal(MAX_TENTATIVAS_ANTES_DO_ENVIO, 5);
});

test("encerrar falha: fail-soft — consolida na mesma (a janela de lances já fechou)", async () => {
  estado.lancarEncerrar = true;
  await tick(TERMINO + 1_000);
  assert.equal(estado.consolidadas.length, 1);
});

test("ignora PROG/RELAMP/R-1 e as especiais ainda agendadas", async () => {
  estado.edicoes = {
    "R-1": { id: "R-1", status: "aberto", termino_em: "2026-01-01T00:00:00Z" },
    "RELAMP-3": { id: "RELAMP-3", status: "aberto", termino_em: "2026-01-01T00:00:00Z" },
    "PROG-ESPECIAL-1": { id: "PROG-ESPECIAL-1", status: "aberto", termino_em: "2026-01-01T00:00:00Z" },
  };
  estado.agendadas = { "ESPECIAL-X": especial({ id: "ESPECIAL-X" }) };
  await tick(TERMINO + 1_000);
  assert.deepEqual(estado.encerradas, []);
  assert.deepEqual(estado.consolidadas, []);
});

test("o handler exportado é o tick embrulhado no schedule de minuto a minuto", async () => {
  assert.equal(typeof mod.handler, "function");
  assert.equal(mod.CRON, "* * * * *");
});

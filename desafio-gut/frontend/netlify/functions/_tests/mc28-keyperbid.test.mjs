// MC28.1 — Testes do Key-Per-Bid (offline, mock @netlify/blobs).
// Executar: node --test --experimental-test-module-mocks mc28-keyperbid.test.mjs
//
// Cobre: anti-colisão de chaves (ITEM 2.2), concorrência 100+ (SEGMENTO 7.1),
// paginação por cursor + leitura paralela exaustiva de 1500+ (SEGMENTO 7.2).
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

// Store in-memory partilhado, com paginação por cursor (~1000/página) p/ validar
// o laço de cursor de listarChavesBids (SEGMENTO 5.1).
const mem = new Map();
const PAGE = 1000;
const fakeStore = {
  async setJSON(k, o) { mem.set(k, JSON.stringify(o)); },
  async get(k, { type } = {}) {
    const v = mem.get(k);
    if (v === undefined) return null;
    return type === "json" ? JSON.parse(v) : v;
  },
  async list({ prefix = "", cursor } = {}) {
    const all = [...mem.keys()].filter((k) => k.startsWith(prefix)).sort();
    const start = cursor ? Number(cursor) : 0;
    const slice = all.slice(start, start + PAGE);
    const next = start + PAGE < all.length ? String(start + PAGE) : undefined;
    return { blobs: slice.map((key) => ({ key })), cursor: next };
  },
  async delete(k) { mem.delete(k); },
};

mock.module("@netlify/blobs", { namedExports: { getStore: () => fakeStore } });

let lib;
before(async () => { lib = await import("../_lib/bids-store.mjs"); });

test("montarChaveBid: formato bid:{edicao}:{endereco}:{sufixo} e endereço minúsculo", () => {
  const k = lib.montarChaveBid("R-1", "0xAbCdEf0000000000000000000000000000000001");
  assert.match(k, /^bid:R-1:0xabcdef0000000000000000000000000000000001:[0-9a-f]{8}$/);
});

test("gravarBid: 150 lances concorrentes do MESMO utilizador → 150 chaves distintas, zero perda", async () => {
  mem.clear();
  const endereco = "0x1111111111111111111111111111111111111111";
  const N = 150;
  const chaves = await Promise.all(
    Array.from({ length: N }, (_, i) =>
      lib.gravarBid({ edicaoId: "R-1", endereco, registro: { valorCentavos: 100 + i } })),
  );
  assert.equal(new Set(chaves).size, N, "todas as chaves devem ser únicas (anti-colisão)");
  const lidos = await lib.listarBids("R-1");
  assert.equal(lidos.length, N, "todos os 150 lances devem persistir (sem sobrescrita)");
});

test("listarBids: paginação + paralelismo lê TODOS os 1500 lances em < 5s", async () => {
  mem.clear();
  const N = 1500;
  await Promise.all(
    Array.from({ length: N }, (_, i) =>
      lib.gravarBid({
        edicaoId: "R-1",
        endereco: "0x" + String(i).padStart(40, "0"),
        registro: { valorCentavos: i + 1 },
      })),
  );
  const t0 = Date.now();
  const lidos = await lib.listarBids("R-1");
  const dt = Date.now() - t0;
  assert.equal(lidos.length, N, "leitura exaustiva deve devolver os 1500 (>1 página de cursor)");
  assert.ok(dt < 5000, `leitura demorou ${dt}ms (esperado < 5000ms)`);
});

test("marcarConsolidado/estaConsolidado e exclusão do marcador na listagem", async () => {
  mem.clear();
  await lib.gravarBid({ edicaoId: "R-9", endereco: "0x2222222222222222222222222222222222222222", registro: { valorCentavos: 5 } });
  assert.equal(await lib.estaConsolidado("R-9"), null);
  await lib.marcarConsolidado("R-9", { vencedor: "0x2", menorUnico: 5 });
  const marca = await lib.estaConsolidado("R-9");
  assert.equal(marca.menorUnico, 5);
  const lidos = await lib.listarBids("R-9");
  assert.equal(lidos.length, 1, "o marcador :consolidado NÃO entra na lista de lances");
});

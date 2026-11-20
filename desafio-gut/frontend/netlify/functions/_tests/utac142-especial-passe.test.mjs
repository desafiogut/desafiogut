// UTAC142.1 (decisão do operador, substitui a R18-142-C) — na EDIÇÃO ESPECIAL o lance gasta SÓ pontos. Quem tem Passe
// Relâmpago gasta 1 a cada 3 lances (3.º, 6.º, 9.º…); sem Passe nessa altura o lance passa na mesma. O bónus +100 fica
// na compra (não é testado aqui: comprar-passe-relampago, UTAC138).
//
// REAIS: `lance-relampago.mjs`, `_lib/passe-a-cada-lances.mjs`, `_lib/especial-config.mjs`, `_lib/edicao-janela.mjs`.
// Duplos: inventário e ledger com estado; Blobs com ETag + `onlyIfMatch`/`onlyIfNew` e intercalação forçada entre a
// leitura e a escrita (para a corrida ser real).
// node --test --experimental-test-module-mocks _tests/utac142-especial-passe.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const ADDR = "0x5baf46609dd9188e081cc78f70e61a6ea07f32b8";
const ESP = "ESPECIAL-RELAMPAGO1";
let mockEdicao = null, mockPontos = 0, passes = 0, inventarioEmBaixo = false, falharBlindagem = false;
let chamadas = [];
let refsLedger = new Set();

const stores = new Map();
const etag = (v) => `"${createHash("sha1").update(v).digest("hex")}"`;
const pausa = () => new Promise((r) => setImmediate(r));
function store(name) {
  if (!stores.has(name)) {
    const m = new Map();
    stores.set(name, {
      m,
      async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
      async getWithMetadata(k, { type } = {}) {
        const v = m.get(k); await pausa();
        return v === undefined ? null : { data: type === "json" ? JSON.parse(v) : v, etag: etag(v) };
      },
      async set(k, v, o = {}) {
        await pausa();
        if (o.onlyIfNew && m.has(k)) return { modified: false };
        if (o.onlyIfMatch && (!m.has(k) || etag(m.get(k)) !== o.onlyIfMatch)) return { modified: false };
        m.set(k, String(v)); return { modified: true, etag: etag(String(v)) };
      },
      async setJSON(k, o) { m.set(k, JSON.stringify(o)); return { modified: true }; },
      async list() { return { blobs: [...m.keys()].map((key) => ({ key })) }; },
      async delete(k) { m.delete(k); },
    });
  }
  return stores.get(name);
}

mock.module("@netlify/blobs", { namedExports: { getStore: (o) => store(typeof o === "string" ? o : o.name) } });
mock.module("../_lib/jwt.mjs", { namedExports: { verificarLanceAuth: async () => ({ endereco: ADDR }) } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/rbac.mjs", { namedExports: { getRole: async () => ({ role: "user" }) } });
mock.module("../_lib/require-mfa.mjs", { namedExports: { requireMfa: () => null } });
mock.module("../_lib/system-state.mjs", { namedExports: { lerEstadoSistema: async () => ({}), sistemaPausado: () => false } });
mock.module("../_lib/notificacoes-usuario.mjs", { namedExports: { registrarEventosDeLance: async () => {} } });
mock.module("../_lib/data-store.mjs", { namedExports: { addLance: async (e, r) => `key-${e}-${r.lanceId}` } });
mock.module("../_lib/ranking-especial.mjs", { namedExports: { registarNoRankingEspecial: async () => ({ ok: true, posicao: 1 }) } });
mock.module("../_lib/contract.mjs", { namedExports: {
  comprometerLanceOnchain: async () => { if (falharBlindagem) throw new Error("rpc"); return {}; }, lerSaldoSenhas: async () => 5,
} });
mock.module("../_lib/edicoes-core.mjs", { namedExports: { buscarEdicao: async () => mockEdicao } });
mock.module("../_lib/saldoRs.mjs", { namedExports: { debitarSaldoRs: async () => ({ ok: true, resultado: {} }) } });
mock.module("../_lib/fontes-lance.mjs", { namedExports: {
  creditarMissaoLance: async () => ({ ok: true, creditado: false }), PONTOS_MISSAO_LANCE: 10 } });
mock.module("../_lib/passes-inventario.mjs", { namedExports: {
  consumirPasse: async ({ tipo }) => {
    chamadas.push(["consumir", tipo]);
    if (inventarioEmBaixo) return { ok: false, code: "inventario_indisponivel" };
    if (passes < 1) return { ok: false, code: "sem_passes" };
    passes -= 1; return { ok: true, restantes: passes };
  },
  devolverPasse: async ({ tipo }) => { chamadas.push(["devolver", tipo]); passes += 1; return { ok: true }; },
  creditarPasse: async () => ({ ok: true }), lerInventario: async () => ({ ok: true, passesRelampago: passes, passesProgramado: 0 }),
} });
mock.module("../_lib/ledger-lance.mjs", { namedExports: {
  consumirPontosLance: async (e, valor, ref) => {
    if (refsLedger.has(ref)) return { ok: true, criado: false, pontos: mockPontos };
    if (mockPontos < valor) return { ok: false, code: "PONTOS_LANCE_INSUFICIENTES", pontos: mockPontos };
    refsLedger.add(ref); mockPontos -= valor; return { ok: true, criado: true, pontos: mockPontos };
  },
  reverterMovimentoLance: async () => ({ ok: true, revertido: true }),
  creditarPontosLance: async () => ({ ok: true, criado: true, pontos: mockPontos }),
  lerLedgerLance: async () => ({ creditos: 0, pontos: mockPontos, historico: [] }),
  PONTOS_LANCE_BONUS_PASSE_RELAMPAGO: 100,
} });
mock.module("../_lib/cors.mjs", { namedExports: {
  respostaPreflight: () => null, CABECALHOS_CORS: { "access-control-allow-origin": "*" } } });

let handler;
before(async () => {
  process.env.NETWORK_STAGE = "mainnet";
  handler = (await import("../lance-relampago.mjs")).default;
});
const especial = (extra = {}) => ({
  id: ESP, tipo: "relampago", status: "ativo",
  inicio_em: new Date(Date.now() - 3600e3).toISOString(), termino_em: new Date(Date.now() + 3600e3).toISOString(), ...extra,
});
beforeEach(() => {
  stores.clear(); mockEdicao = especial(); mockPontos = 100; passes = 5; inventarioEmBaixo = false; falharBlindagem = false;
  chamadas = []; refsLedger = new Set();
});
async function lance(valor, { edicaoId = ESP, idempotencyKey } = {}) {
  const r = await handler({
    method: "POST",
    headers: { get: (h) => (h === "authorization" ? "Bearer t" : null) },
    text: async () => JSON.stringify({ endereco: ADDR, valorCentavos: valor, edicaoId, ...(idempotencyKey ? { idempotencyKey } : {}) }),
    url: "http://localhost/.netlify/functions/lance-relampago",
  });
  return { status: r.status, corpo: await r.json() };
}
const consumos = () => chamadas.filter((c) => c[0] === "consumir").length;
const contagem = () => JSON.parse(store("especial-lances-passe").m.get(`${ESP}:${ADDR}`) ?? "null");

test("C1 · os lances 1 e 2 gastam SÓ pontos; o 3.º gasta também 1 Passe Relâmpago", async () => {
  const r1 = await lance(1); const r2 = await lance(2);
  assert.equal(r1.status, 201); assert.equal(r2.status, 201);
  assert.equal(consumos(), 0, "gastou Passe antes do 3.º lance");
  assert.equal(r1.corpo.passeConsumido, false);
  const r3 = await lance(3);
  assert.equal(r3.status, 201);
  assert.equal(r3.corpo.passeConsumido, true);
  assert.equal(r3.corpo.passesRelampagoRestantes, 4);
  assert.equal(passes, 4);
  assert.equal(mockPontos, 100 - 6, "os pontos são sempre o valor do lance");
});

test("C2 · a cada 3: nove lances gastam exactamente 3 Passes (no 3.º, 6.º e 9.º)", async () => {
  const quando = [];
  for (let i = 1; i <= 9; i++) { const r = await lance(i); assert.equal(r.status, 201); if (r.corpo.passeConsumido) quando.push(i); }
  assert.deepEqual(quando, [3, 6, 9]);
  assert.equal(passes, 2);
  assert.deepEqual(contagem().lances, 9);
  assert.deepEqual(contagem().passesConsumidos, 3);
});

test("C3 · SEM Passe: todos os lances passam só com pontos (o Passe é opcional, nunca bloqueia)", async () => {
  passes = 0;
  for (let i = 1; i <= 4; i++) {
    const r = await lance(i);
    assert.equal(r.status, 201, JSON.stringify(r.corpo));
    assert.equal(r.corpo.passeConsumido, false);
  }
  assert.equal(mockPontos, 100 - 10);
  assert.equal(contagem().passesConsumidos, 0);
});

test("C4 · inventário em baixo no 3.º lance: o lance passa (fail-soft), nenhum Passe gasto", async () => {
  inventarioEmBaixo = true;
  for (let i = 1; i <= 3; i++) assert.equal((await lance(i)).status, 201);
  assert.equal(passes, 5);
});

test("C5 · nunca há devolução: o Passe só se gasta DEPOIS de o lance existir (blindagem a falhar ⇒ nem conta nem gasta)", async () => {
  await lance(1); await lance(2);
  falharBlindagem = true;
  const r = await lance(3);
  assert.equal(r.status, 502);
  assert.equal(consumos(), 0);
  assert.equal(chamadas.filter((c) => c[0] === "devolver").length, 0);
  assert.equal(contagem().lances, 2, "um lance falhado não pode contar");
});

test("C6 · BIDIRECCIONAL: o Relâmpago normal não conta nem toca no inventário", async () => {
  mockEdicao = { id: "RELAMP-1", tipo: "relampago" };
  for (let i = 1; i <= 3; i++) assert.equal((await lance(i, { edicaoId: "RELAMP-1" })).status, 201);
  assert.deepEqual(chamadas, []);
  assert.equal(stores.get("especial-lances-passe")?.m.size ?? 0, 0);
});

test("C7 · dinâmico: `passeACadaLances: 2` gasta no 2.º e 4.º; `0` desliga", async () => {
  mockEdicao = especial({ passeACadaLances: 2 });
  const quando = [];
  for (let i = 1; i <= 4; i++) { const r = await lance(i); if (r.corpo.passeConsumido) quando.push(i); }
  assert.deepEqual(quando, [2, 4]);
  stores.clear(); chamadas = []; mockEdicao = especial({ passeACadaLances: 0 });
  for (let i = 10; i <= 13; i++) await lance(i);
  assert.equal(consumos(), 0);
});

test("C8 · idempotência: a MESMA idempotencyKey repetida não conta um 2.º lance", async () => {
  const k = "0x" + "ab".repeat(16);
  assert.equal((await lance(5, { idempotencyKey: k })).status, 201);
  store("lance-idem").m.clear?.();
  for (const s of stores.values()) if (s !== stores.get("especial-lances-passe")) s.m.clear();
  assert.equal((await lance(5, { idempotencyKey: k })).status, 409);
  assert.equal(contagem().lances, 1);
});

test("C9 · CONCORRÊNCIA: 6 lances em paralelo ⇒ contagem 6 (sem números repetidos) e exactamente 2 Passes gastos", async () => {
  const rs = await Promise.all([1, 2, 3, 4, 5, 6].map((v) => lance(v)));
  assert.equal(rs.filter((r) => r.status === 201).length, 6);
  assert.equal(contagem().lances, 6);
  assert.equal(consumos(), 2, "a corrida gastou Passes a mais ou a menos");
  assert.equal(passes, 3);
});

test("C10 · lib: sem Passe no N-ésimo lance, a contagem fica ok e diz porquê (code sem_passes), sem marcar consumo", async () => {
  const { contarLanceEConsumirPasse } = await import("../_lib/passe-a-cada-lances.mjs");
  const s = store("c10");
  const semPasse = async () => ({ ok: false, code: "sem_passes" });
  for (let i = 1; i <= 2; i++) await contarLanceEConsumirPasse({ store: s, edicaoId: ESP, endereco: ADDR, consumirPasse: semPasse });
  const r = await contarLanceEConsumirPasse({ store: s, edicaoId: ESP, endereco: ADDR, consumirPasse: semPasse });
  assert.deepEqual(r, { ok: true, lances: 3, passeConsumido: false, code: "sem_passes" });
  assert.equal(JSON.parse(s.m.get(`${ESP}:${ADDR}`)).passesConsumidos, 0);
});

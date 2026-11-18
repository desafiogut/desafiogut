// UTAC138 (Frente G) — apuração instantânea da edição especial: vencedor + Top 10 dos menores lances
// únicos, gravados uma vez no Blob `edicoes-resultados` e servidos por GET /resultado-edicao.
//
// node --test --experimental-test-module-mocks _tests/utac138-apuracao-especial.test.mjs

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const stores = new Map();
function storeDe(nome) {
  if (!stores.has(nome)) {
    const mem = new Map();
    stores.set(nome, {
      mem,
      async get(k, { type } = {}) { const v = mem.get(k); if (v === undefined) return null; return type === "json" ? JSON.parse(v) : v; },
      async set(k, v) { mem.set(k, String(v)); },
      async setJSON(k, o) { mem.set(k, JSON.stringify(o)); },
      async list() { return { blobs: [...mem.keys()].map((key) => ({ key })) }; },
      async delete(k) { mem.delete(k); },
    });
  }
  return stores.get(nome);
}

const ID = "ESPECIAL-RELAMPAGO1";
const INICIO = Date.parse("2026-11-30T22:00:00.000Z");
const FIM = Date.parse("2026-11-30T23:00:00.000Z");
const estado = { edicoes: {}, lances: {}, leiturasLances: 0, lancarLances: false };

mock.module("@netlify/blobs", { namedExports: { getStore: ({ name }) => storeDe(name) } });
mock.module("../_lib/edicoes-core.mjs", {
  namedExports: {
    buscarEdicao: async (id) => estado.edicoes[id] ?? null,
    listarEdicoes: async () => ({ edicoes: estado.edicoes, agendadas: {} }),
    encerrarEdicao: async () => ({ ok: true }),
  },
});
mock.module("../_lib/data-store.mjs", {
  namedExports: {
    getLances: async (id) => {
      estado.leiturasLances++;
      if (estado.lancarLances) throw new Error("blob em baixo");
      return estado.lances[id] ?? [];
    },
  },
});

const M = await import("../_lib/apuracao-especial.mjs");
const { default: handler } = await import("../resultado-edicao.mjs");

const end = (n) => `0x${String(n).padStart(40, "0")}`;
const lance = (n, v, nome) => ({ endereco: end(n), valorCentavos: v, ...(nome ? { nomeExibicao: nome } : {}) });

beforeEach(() => {
  stores.clear();
  estado.edicoes = {
    [ID]: { id: ID, tipo: "relampago", produto: "Fritadeira", inicio_em: new Date(INICIO).toISOString(), termino_em: new Date(FIM).toISOString(), status: "aberto" },
  };
  estado.lances = {};
  estado.leiturasLances = 0;
  estado.lancarLances = false;
});

// ── calcularResultado (PURO) ─────────────────────────────────────────────────────────────────────
test("R1 vencedor = menor lance ÚNICO; os repetidos não ganham nem entram no Top 10", () => {
  const r = M.calcularResultado([lance(1, 1), lance(2, 1), lance(3, 2, "Ana"), lance(4, 5), lance(5, 3)]);
  assert.equal(r.vencedor.valorCentavos, 2, "o 1 está repetido ⇒ ganha o 2");
  assert.equal(r.vencedor.nome, "Ana");
  assert.deepEqual(r.top10.map((t) => t.valorCentavos), [2, 3, 5]);
  assert.deepEqual(r.top10.map((t) => t.posicao), [1, 2, 3]);
  assert.equal(r.totalLances, 5);
  assert.equal(r.participantes, 5);
  assert.equal(r.lancesUnicos, 3);
});

test("R2 Top 10 = exactamente os 10 MENORES únicos, por ordem crescente (de 15 únicos)", () => {
  const lances = Array.from({ length: 15 }, (_, i) => lance(i + 1, 100 - i * 3)); // 100, 97, …, 58
  const r = M.calcularResultado(lances);
  assert.equal(r.top10.length, 10);
  assert.deepEqual(r.top10.map((t) => t.valorCentavos), [58, 61, 64, 67, 70, 73, 76, 79, 82, 85]);
  assert.equal(r.vencedor.valorCentavos, 58);
});

test("R3 endereço SEMPRE encurtado (R4) — nunca os 40 hex inteiros", () => {
  const r = M.calcularResultado([lance(7, 9)]);
  assert.equal(r.vencedor.endereco, "0x0000…0007");
  assert.equal(JSON.stringify(r).includes(end(7)), false, "o endereço inteiro não pode sair");
});

test("R4 lances inválidos (null, 0, negativo, fracção, texto, sem endereço) não ganham nem contam para a unicidade", () => {
  const r = M.calcularResultado([
    { endereco: end(1), valorCentavos: null }, { endereco: end(2), valorCentavos: 0 },
    { endereco: end(3), valorCentavos: -1 }, { endereco: end(4), valorCentavos: 1.5 },
    { endereco: end(5), valorCentavos: "1" }, { valorCentavos: 4 }, { endereco: "x", valorCentavos: 4 },
    lance(6, 10), lance(7, 10), lance(8, 20),
  ]);
  assert.equal(r.vencedor.valorCentavos, 20, "10 está repetido; nenhum inválido ganha");
  assert.equal(r.totalLances, 3);
});

test("R5 sem lances / sem nenhum único ⇒ vencedor null e Top 10 vazio", () => {
  assert.equal(M.calcularResultado([]).vencedor, null);
  const r = M.calcularResultado([lance(1, 5), lance(2, 5)]);
  assert.equal(r.vencedor, null);
  assert.deepEqual(r.top10, []);
  assert.equal(r.totalLances, 2);
});

test("R6 o mesmo vencedor que o `apurarMenorUnico` da consolidação on-chain (sobre lances aleatórios)", async () => {
  const { apurarMenorUnico: ref } = await import("../_lib/consolidacao.mjs");
  for (let s = 0; s < 200; s++) {
    let seed = s + 1;
    const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    const ls = Array.from({ length: 1 + Math.floor(rnd() * 30) }, (_, i) => lance(i + 1, 1 + Math.floor(rnd() * 12)));
    const a = ref(ls);
    const b = M.calcularResultado(ls).vencedor;
    assert.equal(b?.valorCentavos ?? null, a?.menorUnico ?? null, `seed ${s}`);
    if (a) assert.equal(b.endereco, M.encurtarEndereco(a.vencedor), `seed ${s}`);
  }
});

// ── apurarEspecial (fronteira, gravação, idempotência) ───────────────────────────────────────────
test("A1 antes do início ⇒ agendada; durante (incluindo o último ms) ⇒ em_curso; nada gravado, nada lido", async () => {
  estado.lances[ID] = [lance(1, 3)];
  assert.equal((await M.apurarEspecial(ID, { agoraMs: INICIO - 1 })).motivo, "agendada");
  assert.equal((await M.apurarEspecial(ID, { agoraMs: INICIO + 1000 })).motivo, "em_curso");
  assert.equal((await M.apurarEspecial(ID, { agoraMs: FIM })).motivo, "em_curso", "o último ms ainda aceita lances");
  assert.equal(estado.leiturasLances, 0);
  assert.equal(storeDe(M.STORE_RESULTADOS).mem.size, 0);
});

test("A2 dentro da margem de fecho ⇒ a_apurar (um lance do último ms pode estar a ser escrito)", async () => {
  const r = await M.apurarEspecial(ID, { agoraMs: FIM + M.MARGEM_FECHO_MS });
  assert.equal(r.pronto, false);
  assert.equal(r.motivo, "a_apurar");
  assert.equal(storeDe(M.STORE_RESULTADOS).mem.size, 0);
});

test("A3 depois da margem ⇒ apura, grava no Blob e devolve criado:true", async () => {
  estado.lances[ID] = [lance(1, 4), lance(2, 4), lance(3, 7, "Bia")];
  const r = await M.apurarEspecial(ID, { agoraMs: FIM + M.MARGEM_FECHO_MS + 1 });
  assert.equal(r.pronto, true);
  assert.equal(r.criado, true);
  assert.equal(r.resultado.vencedor.valorCentavos, 7);
  const gravado = await storeDe(M.STORE_RESULTADOS).get(ID, { type: "json" });
  assert.equal(gravado.vencedor.nome, "Bia");
  assert.equal(gravado.edicaoId, ID);
  assert.equal(gravado.produto, "Fritadeira");
});

test("A4 idempotente: a 2.ª chamada serve o gravado SEM reler os lances (mesmo que tenham mudado)", async () => {
  estado.lances[ID] = [lance(1, 4)];
  await M.apurarEspecial(ID, { agoraMs: FIM + 10_000 });
  estado.lances[ID] = [lance(9, 1)];
  const r = await M.apurarEspecial(ID, { agoraMs: FIM + 20_000 });
  assert.equal(r.criado, false);
  assert.equal(r.resultado.vencedor.valorCentavos, 4);
  assert.equal(estado.leiturasLances, 1);
});

test("A5 concorrência: 10 pedidos simultâneos ⇒ todos o MESMO vencedor", async () => {
  estado.lances[ID] = [lance(1, 2), lance(2, 9)];
  const rs = await Promise.all(Array.from({ length: 10 }, () => M.apurarEspecial(ID, { agoraMs: FIM + 10_000 })));
  assert.ok(rs.every((r) => r.ok && r.pronto && r.resultado.vencedor.valorCentavos === 2));
});

test("A6 id inválido / não-especial / inexistente / lances em baixo ⇒ erro, nada gravado", async () => {
  assert.equal((await M.apurarEspecial("ESPECIAL-RELAMPAGO-1")).code, "edicao_id_invalido", "o 2.º hífen não passa o regex");
  assert.equal((await M.apurarEspecial("R-1")).code, "edicao_id_invalido");
  assert.equal((await M.apurarEspecial("ESPECIAL-NADA", { agoraMs: FIM + 10_000 })).code, "edicao_inexistente");
  estado.lancarLances = true;
  assert.equal((await M.apurarEspecial(ID, { agoraMs: FIM + 10_000 })).code, "lances_indisponiveis");
  assert.equal(storeDe(M.STORE_RESULTADOS).mem.size, 0);
});

// ── GET /resultado-edicao ────────────────────────────────────────────────────────────────────────
let ip = 0;
const pedir = (q, method = "GET") => handler(new Request(`https://x/.netlify/functions/resultado-edicao${q}`, {
  method, headers: { "x-nf-client-connection-ip": `10.13.8.${++ip % 250}` },
}));

test("E1 GET depois do fim ⇒ 200 pronto com vencedor + top10, endereços encurtados (1.º acesso apura)", async () => {
  estado.edicoes[ID] = { ...estado.edicoes[ID], termino_em: new Date(Date.now() - 60_000).toISOString(), inicio_em: new Date(Date.now() - 3_660_000).toISOString() };
  estado.lances[ID] = [lance(1, 3), lance(2, 3), lance(3, 8, "Caio"), lance(4, 11)];
  const r = await pedir(`?edicaoId=${ID}`);
  assert.equal(r.status, 200);
  const c = await r.json();
  assert.equal(c.pronto, true);
  assert.equal(c.vencedor.valorCentavos, 8);
  assert.equal(c.vencedor.nome, "Caio");
  assert.deepEqual(c.top10.map((t) => t.valorCentavos), [8, 11]);
  assert.equal(JSON.stringify(c).includes(end(3)), false);
  assert.equal(c.totalLances, 4);
});

test("E2 GET durante ⇒ 200 pronto:false em_curso; id inválido 400; inexistente 404; POST 405", async () => {
  estado.edicoes[ID] = { ...estado.edicoes[ID], inicio_em: new Date(Date.now() - 1000).toISOString(), termino_em: new Date(Date.now() + 3_600_000).toISOString() };
  const r = await pedir(`?edicaoId=${ID}`);
  assert.equal(r.status, 200);
  const c = await r.json();
  assert.equal(c.pronto, false);
  assert.equal(c.motivo, "em_curso");
  assert.equal((await pedir("?edicaoId=R-1")).status, 400);
  assert.equal((await pedir("?edicaoId=ESPECIAL-NADA")).status, 404);
  assert.equal((await pedir(`?edicaoId=${ID}`, "POST")).status, 405);
});

test("C1 o cron apura no tick (antes de encerrar/consolidar) e espera pela margem quando o tick cai nela", async () => {
  const { _apurarNoTick } = await import("../scheduled-encerrar-especial.mjs");
  estado.lances[ID] = [lance(1, 6)];
  let dormiu = 0;
  const r = await _apurarNoTick(estado.edicoes[ID], FIM + 1, { dormir: async (ms) => { dormiu = ms; } });
  assert.equal(r, "apurada");
  assert.equal(dormiu, M.MARGEM_FECHO_MS, "esperou até passar a margem");
  assert.equal((await _apurarNoTick(estado.edicoes[ID], FIM + 60_000)), "ja_apurada");
  assert.equal(estado.leiturasLances, 1);
});

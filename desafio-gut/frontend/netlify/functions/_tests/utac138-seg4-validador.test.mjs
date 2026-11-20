// UTAC138 — SEG4 (validador adversarial). Testes das correcções do validador:
//   V-A margem de fecho: em mainnet um lance aceite no último ms ainda está no `tx.wait(1)` on-chain
//       (`lance-relampago.mjs` → `comprometerLanceOnchain` ANTES do `addLance`); 3 s deixavam-no de fora
//       e o resultado gravado é definitivo.
//   V-B o «nome» do Top 10 público não pode ser um e-mail (o CardLance envia o userLabel do AppContext,
//       que é o e-mail de quem entra por e-mail).
//   V-C o TICK do cron apura (nenhum teste chamava `tick()` com a apuração — o mutante V12 sobrevivia).
//
// node --test --experimental-test-module-mocks _tests/utac138-seg4-validador.test.mjs

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
const estado = { edicoes: {}, lances: {}, consolidacoes: 0 };

mock.module("@netlify/blobs", { namedExports: { getStore: ({ name }) => storeDe(name) } });
mock.module("@netlify/functions", { namedExports: { schedule: (_c, fn) => fn } });
mock.module("../_lib/edicoes-core.mjs", {
  namedExports: {
    buscarEdicao: async (id) => estado.edicoes[id] ?? null,
    listarEdicoes: async () => ({ edicoes: estado.edicoes, agendadas: {} }),
    encerrarEdicao: async () => ({ ok: true }),
  },
});
mock.module("../_lib/data-store.mjs", { namedExports: { getLances: async (id) => estado.lances[id] ?? [] } });
mock.module("../_lib/consolidacao.mjs", {
  namedExports: { consolidarEdicao: async () => { estado.consolidacoes++; return { status: 409, erro: { code: "fora_de_mainnet" } }; } },
});

const M = await import("../_lib/apuracao-especial.mjs");
const CRON = await import("../scheduled-encerrar-especial.mjs");

const end = (n) => `0x${String(n).padStart(40, "0")}`;
const lance = (n, v, nome) => ({ endereco: end(n), valorCentavos: v, ...(nome ? { nomeExibicao: nome } : {}) });

beforeEach(() => {
  stores.clear();
  estado.edicoes = { [ID]: { id: ID, tipo: "relampago", produto: "Fritadeira", inicio_em: new Date(INICIO).toISOString(), termino_em: new Date(FIM).toISOString(), status: "aberto" } };
  estado.lances = {};
  estado.consolidacoes = 0;
});

// ── V-A margem de fecho ─────────────────────────────────────────────────────────────────────────
test("V-A1 a margem cobre um pedido inteiro ao lance-relampago (≥ 60 s, o limite de uma função síncrona)", () => {
  assert.ok(M.MARGEM_FECHO_MS >= 60_000, `MARGEM_FECHO_MS = ${M.MARGEM_FECHO_MS} ms`);
});

test("V-A2 30 s depois do fim ainda é «a_apurar» (o lance do último ms pode estar no tx.wait(1) on-chain)", async () => {
  estado.lances[ID] = [lance(1, 9)];
  const r = await M.apurarEspecial(ID, { agoraMs: FIM + 30_000 });
  assert.equal(r.pronto, false);
  assert.equal(r.motivo, "a_apurar");
  assert.equal(storeDe(M.STORE_RESULTADOS).mem.size, 0, "nada gravado dentro da margem");
});

test("V-A3 lance aceite às 19:59:59.999 e gravado 20 s depois (commit on-chain) ENTRA no resultado definitivo", async () => {
  estado.lances[ID] = [lance(1, 9), lance(2, 9)]; // 9 repetido: sem vencedor por agora
  // o pedido de quem licitou 4 passou a guarda no último ms e ainda está à espera do recibo on-chain
  const r1 = await M.apurarEspecial(ID, { agoraMs: FIM + 4_000 });
  assert.equal(r1.pronto, false, "aos 4 s não pode gravar (era aqui que os 3 s originais gravavam)");
  estado.lances[ID].push(lance(3, 4, "Rui")); // addLance às FIM + 20 s
  const r2 = await M.apurarEspecial(ID, { agoraMs: FIM + M.MARGEM_FECHO_MS + 1 });
  assert.equal(r2.pronto, true);
  assert.equal(r2.resultado.vencedor.valorCentavos, 4, "o lance em voo conta");
  assert.equal(r2.resultado.totalLances, 3);
});

// ── V-B e-mail não sai no Top 10 público ────────────────────────────────────────────────────────
test("V-B1 nome com «@» (o userLabel de quem entra por e-mail) não é publicado: cai para o endereço encurtado", async () => {
  estado.lances[ID] = [lance(1, 3, "maria.silva@gmail.com"), lance(2, 5, "  Ana Souza  "), lance(3, 8, "   ")];
  const r = await M.apurarEspecial(ID, { agoraMs: FIM + M.MARGEM_FECHO_MS + 1 });
  assert.equal(r.resultado.vencedor.nome, null);
  assert.equal(r.resultado.vencedor.endereco, "0x0000…0001");
  // UTAC142.2 (decisão do operador) — o nome normal sai REDUZIDO a «PrimeiroNome I.» (era o nome completo, aparado).
  assert.equal(r.resultado.top10[1].nome, "Ana S.", "um nome normal sai como «PrimeiroNome I.»");
  assert.equal(storeDe(M.STORE_RESULTADOS).mem.get(ID).includes("Souza"), false, "o apelido completo não é publicado");
  assert.equal(r.resultado.top10[2].nome, null);
  const gravado = storeDe(M.STORE_RESULTADOS).mem.get(ID);
  assert.equal(gravado.includes("@"), false, "o Blob definitivo não guarda o e-mail");
  assert.equal(gravado.includes("maria"), false);
});

// ── V-C o tick do cron apura ────────────────────────────────────────────────────────────────────
test("V-C1 tick() dentro da margem: «a_apurar», sem gravar; tick() depois da margem: «apurada» e grava", async () => {
  estado.lances[ID] = [lance(1, 2), lance(2, 7)];
  const [l1] = await CRON.tick(FIM + 10_000);
  assert.equal(l1.id, ID);
  assert.equal(l1.apuracao, "a_apurar");
  assert.equal(storeDe(M.STORE_RESULTADOS).mem.size, 0);
  const [l2] = await CRON.tick(FIM + M.MARGEM_FECHO_MS + 1_000);
  assert.equal(l2.apuracao, "apurada");
  const gravado = JSON.parse(storeDe(M.STORE_RESULTADOS).mem.get(ID));
  assert.equal(gravado.vencedor.valorCentavos, 2);
  const [l3] = await CRON.tick(FIM + M.MARGEM_FECHO_MS + 61_000);
  assert.equal(l3.apuracao, "ja_apurada");
});

// UTAC138 (R18-138-H, achado E2 deste validador, decidido pelo operador): a consolidação on-chain passou a esperar a
// MESMA margem de fecho da apuração. Era: «continua a correr no 1.º tick depois do fim (comportamento anterior)».
test("V-C2 (R18-138-H) a consolidação on-chain espera a margem de fecho; depois dela corre 1×", async () => {
  estado.lances[ID] = [lance(1, 2)];
  await CRON.tick(FIM + 10_000);
  assert.equal(estado.consolidacoes, 0, "dentro da margem não consolida on-chain");
  await CRON.tick(FIM + 65_001);
  assert.equal(estado.consolidacoes, 1, "depois da margem consolida");
});

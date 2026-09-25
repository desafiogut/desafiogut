// MC94.1 — edição especial ESPECIAL-AIRFRYER: dados, janela e listagem.
// Executar: node --experimental-test-module-mocks --test _tests/mc941-edicao-especial.test.mjs
//
// Os horários e o preço fixam-se em LITERAL (lição do MC93-A): comparar com a
// constante do próprio código não testa a decisão do operador.
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

// ── Store in-memory no lugar do Netlify Blobs ────────────────────────────────
const mem = new Map();
const fakeStore = {
  async setJSON(k, o) { mem.set(k, JSON.stringify(o)); },
  async get(k, { type } = {}) {
    const v = mem.get(k);
    if (v === undefined) return null;
    return type === "json" ? JSON.parse(v) : v;
  },
  async list() { return { blobs: [...mem.keys()].map((key) => ({ key })) }; },
  async delete(k) { mem.delete(k); },
};
mock.module("@netlify/blobs", { namedExports: { getStore: () => fakeStore } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });

const INICIO  = Date.parse("2026-10-04T23:00:00.000Z");
const TERMINO = Date.parse("2026-10-04T23:30:00.000Z");

let janela, core, seed, handlerEdicoes;
before(async () => {
  janela = await import("../_lib/edicao-janela.mjs");
  core   = await import("../_lib/edicoes-core.mjs");
  seed   = await import("../../../../../scripts/mc941-seed-edicao-especial.mjs");
  handlerEdicoes = (await import("../edicoes.mjs")).default;
});

function semear(extra = []) {
  mem.clear();
  mem.set("ESPECIAL-AIRFRYER", JSON.stringify(seed.EDICAO_ESPECIAL_AIRFRYER));
  mem.set("RELAMP-3", JSON.stringify({
    id: "RELAMP-3", tipo: "relampago", produto: "Smart TV",
    termino_em: "2026-05-31T03:52:13.827Z", lances: 0, status: "encerrado",
  }));
  for (const [k, v] of extra) mem.set(k, JSON.stringify(v));
}

// ── Os dados que o operador decidiu (R18) ────────────────────────────────────

test("seed: horários, prémio, preço e imagem são os decididos pelo operador", () => {
  const e = seed.EDICAO_ESPECIAL_AIRFRYER;
  assert.equal(e.id, "ESPECIAL-AIRFRYER");
  assert.equal(e.inicio_em, "2026-10-04T23:00:00.000Z");  // 20:00 Brasília
  assert.equal(e.termino_em, "2026-10-04T23:30:00.000Z"); // 20:30 Brasília
  assert.equal(e.produto, "Air Fryer");
  assert.equal(e.tipo, "programado");                     // D1: lance paga 1 senha
  assert.equal(e.regra, "menor_lance_unico");
  assert.equal(e.imagem_url, "/artes/edicao-especial-airfryer.jpg");
  assert.ok(Object.isFrozen(e));
});

test("seed: 20:00 de Brasília (UTC−3, sem horário de verão) é 23:00Z", () => {
  const fmt = (ms) => new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(ms));
  assert.equal(fmt(INICIO), "04/10/2026, 20:00");
  assert.equal(fmt(TERMINO), "04/10/2026, 20:30");
});

test("a imagem referida pela edição existe em public/", async () => {
  const { statSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const p = fileURLToPath(new URL("../../../public/artes/edicao-especial-airfryer.jpg", import.meta.url));
  assert.ok(statSync(p).size > 100_000, "imagem ausente ou truncada");
});

// ── O id tem de ser legível pelo resto do sistema ────────────────────────────

test("EDICAO_ID_RE aceita ESPECIAL-AIRFRYER e continua a aceitar PROG/RELAMP", () => {
  for (const ok of ["ESPECIAL-AIRFRYER", "ESPECIAL-X1", "PROG-3", "RELAMP-12"]) {
    assert.ok(core.EDICAO_ID_RE.test(ok), ok);
  }
  for (const nao of ["ESPECIAL-", "especial-airfryer", "ESPECIAL-AIR FRYER", "ESPECIAL-AIR-FRYER",
                     "PROG-3x", "PROG-", "R-1", "XESPECIAL-A", "ESPECIAL-A\n"]) {
    assert.ok(!core.EDICAO_ID_RE.test(nao), JSON.stringify(nao));
  }
});

test("buscarEdicao devolve a edição especial (antes do MC94.1 devolvia null)", async () => {
  semear();
  const meta = await core.buscarEdicao("ESPECIAL-AIRFRYER");
  assert.equal(meta?.tipo, "programado");
  assert.equal(meta?.inicio_em, "2026-10-04T23:00:00.000Z");
});

// ── A janela, pelo relógio do servidor ───────────────────────────────────────

test("janela: antes das 20:00 recusa com edicao_nao_iniciada", () => {
  const e = seed.EDICAO_ESPECIAL_AIRFRYER;
  assert.equal(janela.verificarJanelaLance(e, INICIO - 1)?.code, "edicao_nao_iniciada");
  assert.equal(janela.verificarJanelaLance(e, Date.parse("2026-09-25T12:00:00Z"))?.code, "edicao_nao_iniciada");
});

test("janela: das 20:00 às 20:30 (inclusive) aceita", () => {
  const e = seed.EDICAO_ESPECIAL_AIRFRYER;
  assert.equal(janela.verificarJanelaLance(e, INICIO), null);
  assert.equal(janela.verificarJanelaLance(e, INICIO + 15 * 60_000), null);
  assert.equal(janela.verificarJanelaLance(e, TERMINO), null);
});

test("janela: depois das 20:30 recusa com edicao_encerrada", () => {
  const e = seed.EDICAO_ESPECIAL_AIRFRYER;
  assert.equal(janela.verificarJanelaLance(e, TERMINO + 1)?.code, "edicao_encerrada");
});

test("janela: encerrada pelo admin dentro da janela recusa (o status manda)", () => {
  const e = { ...seed.EDICAO_ESPECIAL_AIRFRYER, status: "encerrado" };
  assert.equal(janela.verificarJanelaLance(e, INICIO + 60_000)?.code, "edicao_encerrada");
  assert.equal(janela.verificarJanelaLance({ ...e, status: "apurado" }, INICIO + 60_000)?.code, "edicao_encerrada");
});

test("janela: sem metadata, ou sem datas, não impõe nada (compat R-1)", () => {
  assert.equal(janela.verificarJanelaLance(null, INICIO), null);
  assert.equal(janela.verificarJanelaLance({ id: "PROG-1", tipo: "programado" }, INICIO), null);
  assert.equal(janela.verificarJanelaLance({ id: "X", inicio_em: "lixo", termino_em: "lixo" }, 0), null);
});

// ── A listagem pública: invisível até à hora (HARD GATE 4 do lado que importa) ─

test("listarEdicoes antes das 20:00: fora de `edicoes`, dentro de `agendadas`", async () => {
  semear();
  const { edicoes, agendadas } = await core.listarEdicoes(INICIO - 1);
  assert.equal(edicoes["ESPECIAL-AIRFRYER"], undefined, "apareceria no Dashboard antes da hora");
  const a = agendadas["ESPECIAL-AIRFRYER"];
  assert.equal(a.status, "agendado");
  assert.equal(a.inicio_em, "2026-10-04T23:00:00.000Z");
  assert.equal(a.termino_em, "2026-10-04T23:30:00.000Z");
  assert.equal(a.imagem_url, "/artes/edicao-especial-airfryer.jpg");
  assert.equal(a.produto, "Air Fryer");
  // o resto não muda
  assert.equal(edicoes["RELAMP-3"].status, "encerrado");
  assert.equal(edicoes["R-1"].id, "R-1", "R-1 continua garantida");
});

test("listarEdicoes às 20:00 em ponto: passa a `edicoes`, aberta", async () => {
  semear();
  const { edicoes, agendadas } = await core.listarEdicoes(INICIO);
  assert.equal(agendadas["ESPECIAL-AIRFRYER"], undefined);
  assert.equal(edicoes["ESPECIAL-AIRFRYER"].status, "aberto");
  assert.equal(edicoes["ESPECIAL-AIRFRYER"].imagem_url, "/artes/edicao-especial-airfryer.jpg");
});

test("edições sem inicio_em saem com inicio_em/imagem_url null (aditivo)", async () => {
  semear();
  const { edicoes } = await core.listarEdicoes(INICIO);
  assert.equal(edicoes["RELAMP-3"].inicio_em, null);
  assert.equal(edicoes["RELAMP-3"].imagem_url, null);
});

// ── O endpoint, com o relógio real (hoje é antes de 04/10) ───────────────────

// O handler usa o relógio real, por isso as datas são relativas a "agora": uma
// data fixa (04/10) faria este teste ficar vermelho para sempre a partir do dia.
test("GET /edicoes: por abrir só em `agendadas`, e `agora` vem do servidor", async () => {
  const antes = Date.now();
  semear([["ESPECIAL-AIRFRYER", {
    ...seed.EDICAO_ESPECIAL_AIRFRYER,
    inicio_em: new Date(antes + 3_600_000).toISOString(),
    termino_em: new Date(antes + 5_400_000).toISOString(),
  }]]);
  const resp = await handlerEdicoes({
    method: "GET",
    url: "http://localhost/.netlify/functions/edicoes",
    headers: { get: () => null },
  });
  assert.equal(resp.status, 200);
  const data = await resp.json();
  assert.equal(data.edicoes["ESPECIAL-AIRFRYER"], undefined);
  assert.equal(data.agendadas["ESPECIAL-AIRFRYER"].status, "agendado");
  assert.equal(data.agendadas["ESPECIAL-AIRFRYER"].imagem_url, "/artes/edicao-especial-airfryer.jpg");
  const agora = Date.parse(data.agora);
  assert.ok(agora >= antes && agora <= Date.now(), "agora tem de ser o relógio do servidor");
});

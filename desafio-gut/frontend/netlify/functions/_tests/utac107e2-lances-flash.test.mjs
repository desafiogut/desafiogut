// UTAC107e.2 — Frente A (revelação após o fecho) + Frente D (liderança reconstruída) + estado do titular.
//
// O `lances-flash.mjs` e o `_lib/jwt.mjs` testados são os REAIS (tokens assinados a sério — lição do
// UTAC106j-fix: mockar o verificador esconde o 401). Duplos SÓ nas fronteiras de I/O: o blob legado
// (`@netlify/blobs`), o marcador de consolidação (`bids-store`) e o Key-Per-Bid (`data-store`).
//
// node --test --experimental-test-module-mocks _tests/utac107e2-lances-flash.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "segredo-de-teste-utac107e2-com-comprimento-suficiente";

const A = "0xaaa0000000000000000000000000000000000001";
const B = "0xbbb0000000000000000000000000000000000002";
const C = "0xccc0000000000000000000000000000000000003";

let legado;        // blob lances-relampago (só o ramo blindado/legado o lê)
let marcador;      // estaConsolidado → objecto | null | Error
let kpb;           // getLances → array | Error
let leiturasKpb;   // quantas vezes o Key-Per-Bid foi lido
let META;          // id → metadata da edição (buscarEdicao); a janela é a REAL (_lib/edicao-janela.mjs)

mock.module("@netlify/blobs", {
  namedExports: { getStore: () => ({ get: async () => ({ lances: legado }) }) },
});
mock.module("../_lib/bids-store.mjs", {
  namedExports: {
    estaConsolidado: async () => { if (marcador instanceof Error) throw marcador; return marcador; },
  },
});
mock.module("../_lib/data-store.mjs", {
  namedExports: {
    getLances: async () => { leiturasKpb += 1; if (kpb instanceof Error) throw kpb; return kpb; },
  },
});

mock.module("../_lib/edicoes-core.mjs", {
  namedExports: { buscarEdicao: async (id) => META[id] ?? null },
});

const { assinarUserSession, assinarLanceAuth } = await import("../_lib/jwt.mjs");
const mod = await import("../lances-flash.mjs");
const handler = mod.default;
const TK_A = await assinarUserSession(A);
const TK_B = await assinarUserSession(B);
const TK_C = await assinarUserSession(C);
const TK_LANCE_A = await assinarLanceAuth(A);

const t0 = Date.parse("2026-10-06T20:00:00.000Z");
const lance = (endereco, valorCentavos, seg, extra = {}) => ({
  lanceId: `id-${endereco.slice(2, 5)}-${seg}`, edicaoId: "R-1", endereco, valorCentavos,
  nomeExibicao: null, processadoEm: new Date(t0 + seg * 1000).toISOString(), commitmentHash: "0xhash", ...extra,
});

async function chamar(query, token) {
  const req = new Request(`https://ex.test/.netlify/functions/lances-flash?${query}`, {
    method: "GET", headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  const res = await handler(req);
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  process.env.NETWORK_STAGE = "mainnet";
  legado = [lance(A, 100, 1), lance(B, 100, 2)];
  marcador = null;
  kpb = [lance(A, 100, 1), lance(B, 100, 2), lance(C, 50, 3)];
  leiturasKpb = 0;
  META = { "R-1": { id: "R-1", tipo: "relampago", status: "encerrado", termino_em: "2026-10-06T20:30:00.000Z" } };
  mod._limparCacheRevelados();
});

// ── Frente A — revelação ────────────────────────────────────────────────────────────────────────

test("A1 — mainnet, edição POR CONSOLIDAR: nenhum valor nem unicidade sai; o Key-Per-Bid nem é lido", async () => {
  const r = await chamar("edicaoId=R-1");
  assert.equal(r.status, 200);
  assert.equal(r.body.encerrado, false);
  assert.equal(r.body.ocultoAteConsolidar, true);
  assert.ok(r.body.lances.length > 0, "controlo: há participações para esconder");
  for (const l of r.body.lances) {
    assert.equal(l.valor, null, "valor blindado");
    assert.equal(l.repetido, null, "unicidade blindada");
  }
  assert.equal(leiturasKpb, 0, "durante a edição os valores reais não são lidos");
  assert.doesNotMatch(JSON.stringify(r.body), /"valor":\d/, "nenhum número em claro no corpo");
});

test("A2 — mainnet, edição CONSOLIDADA: os valores do Key-Per-Bid saem, com repetido", async () => {
  marcador = { vencedor: C, menorUnicoCentavos: 50 };
  const r = await chamar("edicaoId=R-1");
  assert.equal(r.status, 200);
  assert.equal(r.body.encerrado, true);
  assert.equal(r.body.ocultoAteConsolidar, false);
  const porEnd = Object.fromEntries(r.body.lances.map((l) => [l.endereco, l]));
  assert.equal(porEnd[A].valor, 100);
  assert.equal(porEnd[A].repetido, true);
  assert.equal(porEnd[C].valor, 50);
  assert.equal(porEnd[C].repetido, false);
  assert.equal(r.body.lances.length, 3, "os 3 lances do Key-Per-Bid (não o blob legado)");
  assert.equal("processadoEm" in porEnd[A], false, "o instante do lance não é publicado");
});

test("A3 — marcador ilegível ⇒ trata-se como POR CONSOLIDAR (nunca revela por engano)", async () => {
  marcador = new Error("blobs em baixo");
  const r = await chamar("edicaoId=R-1");
  assert.equal(r.status, 200);
  assert.equal(r.body.encerrado, false);
  for (const l of r.body.lances) assert.equal(l.valor, null);
  assert.equal(leiturasKpb, 0);
});

test("A4 — consolidada mas o Key-Per-Bid falha ⇒ 503 (não finge lista vazia)", async () => {
  marcador = { vencedor: C };
  kpb = new Error("kpb em baixo");
  const r = await chamar("edicaoId=R-1");
  assert.equal(r.status, 503);
  assert.equal(r.body.error.code, "store_indisponivel");
});

test("A5 — anti-bot MC28.1 intacto: acao=verificar continua 403 em mainnet (aberta E consolidada)", async () => {
  for (const m of [null, { vencedor: C }]) {
    marcador = m;
    const r = await chamar("edicaoId=R-1&acao=verificar&valor=100");
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, "verificacao_indisponivel");
  }
  assert.equal(leiturasKpb, 0);
});

test("A6 — fora de mainnet o comportamento legado não mudou (valor + repetido do blob)", async () => {
  process.env.NETWORK_STAGE = "sepolia";
  const r = await chamar("edicaoId=R-1");
  assert.equal(r.status, 200);
  assert.equal("encerrado" in r.body, false);
  assert.deepEqual(r.body.lances.map((l) => [l.valor, l.repetido]), [[100, true], [100, true]]);
});

// ── Frente D — liderança reconstruída no fecho ──────────────────────────────────────────────────

test("D1 — quem foi menor único e foi repetido depois FOI líder; quem nunca foi, não", () => {
  const lideres = mod.reconstruirLideranca([lance(A, 100, 1), lance(B, 100, 2), lance(C, 50, 3)]);
  assert.ok(lideres.has(A.toLowerCase()), "A liderou sozinho com 100 antes do B repetir");
  assert.ok(!lideres.has(B.toLowerCase()), "B nunca foi menor único");
  assert.ok(lideres.has(C.toLowerCase()));
});

test("D2 — a ordem é a de CHEGADA (processadoEm), não a da lista", () => {
  // Por chegada: C (50) → A (100, não é o menor) → B (100) ⇒ A nunca liderou.
  const lideres = mod.reconstruirLideranca([lance(A, 100, 2), lance(B, 100, 3), lance(C, 50, 1)]);
  assert.ok(!lideres.has(A.toLowerCase()), "A chegou depois de C — nunca foi o menor único");
  assert.deepEqual([...lideres], [C.toLowerCase()]);
});

test("D3 — destronado por um lance MENOR também conta como «foi líder»", () => {
  const lideres = mod.reconstruirLideranca([lance(A, 70, 1), lance(B, 40, 2)]);
  assert.ok(lideres.has(A.toLowerCase()));
  assert.ok(lideres.has(B.toLowerCase()));
});

test("D4 — valores inválidos não lideram (null, 0, texto, fracção)", () => {
  const lideres = mod.reconstruirLideranca([
    lance(A, null, 1), lance(A, 0, 2), lance(A, "5", 3), lance(A, 1.5, 4), lance(B, 90, 5),
  ]);
  assert.deepEqual([...lideres], [B.toLowerCase()]);
});

// ── Estado do titular (acao=meu-estado) ─────────────────────────────────────────────────────────

test("E1 — sem token ⇒ 401; token lance-auth ⇒ 401 (só user-session)", async () => {
  marcador = { vencedor: C };
  assert.equal((await chamar("edicaoId=R-1&acao=meu-estado")).status, 401);
  const r = await chamar("edicaoId=R-1&acao=meu-estado", TK_LANCE_A);
  assert.equal(r.status, 401);
  assert.equal(r.body.error.code, "token_invalido");
});

test("E2 — POR CONSOLIDAR ⇒ estado null e nenhum valor é lido (a etiqueta não existe durante a edição)", async () => {
  const r = await chamar("edicaoId=R-1&acao=meu-estado", TK_A);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { edicaoId: "R-1", encerrado: false, estado: null });
  assert.equal(leiturasKpb, 0);
});

test("E3 — consolidada: os 3 estados, cada titular vê o SEU", async () => {
  marcador = { vencedor: C, menorUnicoCentavos: 50 };
  const rC = await chamar("edicaoId=R-1&acao=meu-estado", TK_C);
  assert.equal(rC.body.estado, "menor");
  assert.equal(rC.body.eLiderFinal, true);
  const rA = await chamar("edicaoId=R-1&acao=meu-estado", TK_A);
  assert.equal(rA.body.estado, "deixou_de_ser");
  assert.equal(rA.body.eLiderFinal, false);
  assert.equal(rA.body.foiLiderAlgumaVez, true);
  const rB = await chamar("edicaoId=R-1&acao=meu-estado", TK_B);
  assert.equal(rB.body.estado, "nao_menor");
  assert.equal(rB.body.foiLiderAlgumaVez, false);
});

test("E4 — titular SEM lance na edição ⇒ estado null (não se inventa um «não é»)", async () => {
  marcador = { vencedor: C };
  kpb = [lance(B, 100, 1), lance(C, 50, 2)];
  const r = await chamar("edicaoId=R-1&acao=meu-estado", TK_A);
  assert.equal(r.status, 200);
  assert.equal(r.body.temLance, false);
  assert.equal(r.body.estado, null);
});

test("E5 — o endereço vem SÓ do token: ?endereco= de outro é ignorado", async () => {
  marcador = { vencedor: C };
  const r = await chamar(`edicaoId=R-1&acao=meu-estado&endereco=${C}`, TK_B);
  assert.equal(r.body.estado, "nao_menor", "o estado é o do B (token), não o do C (query)");
});

test("E6 — o vencedor OFICIAL decide «menor», mesmo com endereço EIP-55 no marcador", async () => {
  marcador = { vencedor: "0xCCC0000000000000000000000000000000000003" };
  const r = await chamar("edicaoId=R-1&acao=meu-estado", TK_C);
  assert.equal(r.body.estado, "menor");
});

test("E7 — a resposta do estado não traz valores nem os lances de outros", async () => {
  marcador = { vencedor: C };
  const r = await chamar("edicaoId=R-1&acao=meu-estado", TK_A);
  assert.deepEqual(Object.keys(r.body).sort(),
    ["eLiderFinal", "edicaoId", "encerrado", "estado", "foiLiderAlgumaVez", "temLance"]);
});

// ── Achado A1 do validador: «consolidado» não basta — a edição tem de estar FECHADA ─────────────
test("A7 — consolidada mas AINDA ABERTA (status aberto, prazo futuro) ⇒ nada se revela, KPB não lido", async () => {
  marcador = { vencedor: C };
  META["R-1"] = { id: "R-1", tipo: "relampago", status: "aberto", termino_em: "2099-01-01T00:00:00.000Z" };
  const r = await chamar("edicaoId=R-1");
  assert.equal(r.body.encerrado, false);
  for (const l of r.body.lances) assert.equal(l.valor, null);
  const e = await chamar("edicaoId=R-1&acao=meu-estado", TK_A);
  assert.deepEqual(e.body, { edicaoId: "R-1", encerrado: false, estado: null });
  assert.equal(leiturasKpb, 0);
});

test("A8 — consolidada SEM metadata (R-1 sintetizado, sem janela) ⇒ nunca revela", async () => {
  marcador = { vencedor: C };
  META = {};
  const r = await chamar("edicaoId=R-1");
  assert.equal(r.body.encerrado, false);
  assert.equal((await chamar("edicaoId=R-1&acao=meu-estado", TK_A)).body.estado, null);
  assert.equal(leiturasKpb, 0);
});

test("A9 — aberta com prazo VENCIDO conta como fechada (o lance-relampago já recusa)", async () => {
  marcador = { vencedor: C };
  META["R-1"] = { id: "R-1", tipo: "relampago", status: "aberto", termino_em: "2020-01-01T00:00:00.000Z" };
  assert.equal((await chamar("edicaoId=R-1")).body.encerrado, true);
});

test("A10 — a lista revelada é imutável: o 2.º pedido não volta a ler o Key-Per-Bid (achado A2)", async () => {
  marcador = { vencedor: C };
  await chamar("edicaoId=R-1");
  const r = await chamar("edicaoId=R-1");
  assert.equal(r.body.lances.length, 3);
  assert.equal(leiturasKpb, 1);
});

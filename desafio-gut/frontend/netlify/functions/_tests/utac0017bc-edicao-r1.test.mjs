// UTAC000.17bc — Frente B (DEBT-017): a R-1 passa a poder ser criada como edição REAL.
//
// O que este ficheiro prova:
//   1. sem id explícito NADA muda (RELAMP-N/PROG-N, o comportamento de sempre — não-regressão);
//   2. `criarEdicao({id:"R-1"})` cria a R-1 real, com `termino_em` REAL (agora + duração) e SEM o
//      marcador de sintética;
//   3. id explícito inválido é RECUSADO (`edicao_id_invalido`);
//   4. depois de existir a R-1 real, `listarEdicoes()` devolve a REAL (não a sintética) — é isto que
//      fecha a DEBT-017;
//   5. sem R-1 no store, `listarEdicoes()` devolve a sintética **MARCADA** (`sintetizada: true`) — é
//      isto que permite ao cliente não tratar um prazo inventado como prazo real (GATE 26).
//
// node --test --experimental-test-module-mocks _tests/utac0017bc-edicao-r1.test.mjs

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";

let B = criarBlobs();
mock.module("@netlify/blobs", { namedExports: { getStore: (o) => B.getStore(o) } });

const { criarEdicao, listarEdicoes, EDICAO_ID_RE } = await import("../_lib/edicoes-core.mjs");

const perto = (iso, esperadoSeg, tolSeg = 10) => {
  const d = Math.abs(Date.parse(iso) / 1000 - esperadoSeg);
  return d <= tolSeg;
};

beforeEach(() => { B = criarBlobs(); });

test("sem id explícito: RELAMP-N/PROG-N (comportamento de sempre, sem regressão)", async () => {
  const a = await criarEdicao({ tipo: "relampago", produto: "P1", duracaoSegundos: 600 });
  const b = await criarEdicao({ tipo: "relampago", produto: "P2", duracaoSegundos: 600 });
  const c = await criarEdicao({ tipo: "programado", produto: "P3", duracaoSegundos: 600 });
  assert.equal(a.ok, true);
  assert.equal(a.edicao.id, "RELAMP-1");
  assert.equal(b.edicao.id, "RELAMP-2");
  assert.equal(c.edicao.id, "PROG-1");
  assert.equal(a.edicao.sintetizada, undefined, "edição criada nunca é sintética");
});

test("id explícito R-1: cria a edição real com termino_em REAL", async () => {
  const agora = Math.floor(Date.now() / 1000);
  const r = await criarEdicao({ tipo: "relampago", produto: "P-R1", duracaoSegundos: 1800, id: "R-1" });
  assert.equal(r.ok, true);
  assert.equal(r.edicao.id, "R-1");
  assert.ok(perto(r.edicao.termino_em, agora + 1800), `termino_em devia ser agora+1800s, foi ${r.edicao.termino_em}`);
  assert.equal(r.edicao.status, "aberto");
  assert.equal(r.edicao.sintetizada, undefined, "uma edição CRIADA não pode vir marcada como sintética");
});

test("id explícito inválido é recusado", async () => {
  const r = await criarEdicao({ tipo: "relampago", produto: "P", duracaoSegundos: 600, id: "XX-1" });
  assert.equal(r.ok, false);
  assert.equal(r.code, "edicao_id_invalido");
  const r2 = await criarEdicao({ tipo: "relampago", produto: "P", duracaoSegundos: 600, id: "R-1;drop" });
  assert.equal(r2.ok, false);
  assert.equal(r2.code, "edicao_id_invalido");
});

test("EDICAO_ID_RE: aceita R-N e os formatos antigos, recusa o resto", () => {
  for (const bom of ["R-1", "R-42", "RELAMP-7", "PROG-3", "ESPECIAL-AIRFRYER"]) {
    assert.ok(EDICAO_ID_RE.test(bom), `devia aceitar ${bom}`);
  }
  for (const mau of ["R-", "R-x", "R1", "RELAMP", "XX-1", ""]) {
    assert.ok(!EDICAO_ID_RE.test(mau), `não devia aceitar ${JSON.stringify(mau)}`);
  }
});

test("DEBT-017 FECHADA: com a R-1 real criada, listarEdicoes devolve a REAL (não a sintética)", async () => {
  await criarEdicao({ tipo: "relampago", produto: "P-R1", duracaoSegundos: 3600, id: "R-1" });
  const { edicoes } = await listarEdicoes();
  const r1 = edicoes["R-1"];
  assert.ok(r1, "a R-1 tem de estar sempre presente");
  assert.equal(r1.sintetizada, undefined, "depois de criada, a R-1 NÃO pode vir marcada como sintética");
  const agora = Math.floor(Date.now() / 1000);
  assert.ok(perto(r1.termino_em, agora + 3600), `termino_em devia ser o REAL (agora+3600s), foi ${r1.termino_em}`);
  assert.equal(r1.produto, "P-R1", "é a edição persistida, não a sintética (que tem produto null)");
});

test("GATE 26: sem R-1 no store, a sintética vem MARCADA (prazo inventado, não real)", async () => {
  const { edicoes } = await listarEdicoes();
  const r1 = edicoes["R-1"];
  assert.ok(r1);
  assert.equal(r1.sintetizada, true, "a R-1 sintética TEM de vir marcada (o cliente não pode confiar no prazo)");
  assert.equal(r1.produto, null);
});

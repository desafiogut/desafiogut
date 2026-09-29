// MC102.1a — mapa de eventos → PT-BR + timeline (Frente B).
// node --test src/lib/rastreio.test.mjs   (a partir de desafio-gut/frontend)
//
// Rótulos em LITERAL (DEC-102.1-H): um teste que comparasse com MAPA_EVENTOS[...] não apanhava um rótulo trocado.

import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPA_EVENTOS, PASSOS, ALERTAS, traduzirEvento, construirTimeline, timelineDoRastreio } from "./rastreio.js";

const ev = (codigo, data, extra = {}) => ({ codigo, data, local: "Manaus/AM", descricao: `desc ${codigo}`, ...extra });

test("o mapa tem exactamente 5 passos + 3 alertas, com os rótulos do operador", () => {
  assert.deepEqual(PASSOS, ["0", "1", "2", "3", "4"]);
  assert.deepEqual(ALERTAS, ["A1", "A2", "A3"]);
  assert.deepEqual({ ...MAPA_EVENTOS }, {
    "0": "Postado", "1": "A caminho", "2": "Na cidade de destino", "3": "Saiu para entrega", "4": "Entregue",
    A1: "Tentativa de entrega sem sucesso", A2: "Aguardando retirada na agência", A3: "Devolvido ao remetente",
  });
  assert.ok(Object.isFrozen(MAPA_EVENTOS) && Object.isFrozen(PASSOS) && Object.isFrozen(ALERTAS));
});

test("traduzirEvento: código conhecido → PT-BR (inclui número vindo como número)", () => {
  assert.equal(traduzirEvento("1", "Objeto em trânsito"), "A caminho");
  assert.equal(traduzirEvento(4, "x"), "Entregue");
  assert.equal(traduzirEvento("A2", "x"), "Aguardando retirada na agência");
});

test("traduzirEvento: código desconhecido → a descrição original; sem descrição → \"\"", () => {
  assert.equal(traduzirEvento("99", "Objeto em fiscalização aduaneira"), "Objeto em fiscalização aduaneira");
  assert.equal(traduzirEvento("99"), "");
  assert.equal(traduzirEvento("constructor", "orig"), "orig", "propriedade herdada não é código");
  assert.equal(traduzirEvento("toString", "orig"), "orig");
});

test("timeline: SEMPRE 5 passos, mesmo sem eventos ou com lixo", () => {
  for (const entrada of [[], undefined, null, "x", {}, 42, { eventos: [] }, [null, {}, ev("99", "2026-09-20")]]) {
    const t = construirTimeline(entrada);
    assert.equal(t.passos.length, 5);
    assert.deepEqual(t.passos.map((p) => p.codigo), ["0", "1", "2", "3", "4"]);
    assert.ok(t.passos.every((p) => p.feito === false));
    assert.deepEqual(t.alertas, []);
  }
});

test("timeline sem alertas: 5 passos, feitos até ao mais adiantado, 0 alertas", () => {
  const t = construirTimeline([ev("0", "2026-09-20T12:00:00Z"), ev("1", "2026-09-21T08:00:00Z")]);
  assert.deepEqual(t.passos.map((p) => p.feito), [true, true, false, false, false]);
  assert.deepEqual(t.passos.map((p) => p.rotulo), ["Postado", "A caminho", "Na cidade de destino", "Saiu para entrega", "Entregue"]);
  assert.equal(t.passos[0].data, "2026-09-20T12:00:00Z");
  assert.equal(t.passos[2].data, null);
  assert.equal(t.alertas.length, 0);
});

test("um passo adiantado implica os anteriores feitos (sem data própria)", () => {
  const t = construirTimeline([ev("3", "2026-09-23T09:00:00Z")]);
  assert.deepEqual(t.passos.map((p) => p.feito), [true, true, true, true, false]);
  assert.deepEqual(t.passos.map((p) => p.data), [null, null, null, "2026-09-23T09:00:00Z", null]);
});

test("a ordem de chegada não importa: fica o passo mais adiantado e a data mais antiga de cada um", () => {
  // As duas ordens do evento repetido: nem «o primeiro» nem «o último» coincidem sempre com «o mais antigo».
  for (const repetidos of [["2026-09-22T00:00:00Z", "2026-09-21T00:00:00Z"], ["2026-09-21T00:00:00Z", "2026-09-22T00:00:00Z"]]) {
    const t = construirTimeline([ev("4", "2026-09-24T10:00:00Z"), ...repetidos.map((d) => ev("1", d)), ev("0", "2026-09-20T00:00:00Z")]);
    assert.ok(t.passos.every((p) => p.feito));
    assert.equal(t.passos[1].data, "2026-09-21T00:00:00Z");
  }
});

test("a data mais antiga compara-se por INSTANTE, não por texto (fuso no ISO — validador)", () => {
  // "…T10:00:00-03:00" = 13:00Z, depois de "…T12:30:00Z"; por texto ganhava o -03:00.
  for (const ordem of [["2026-09-20T10:00:00-03:00", "2026-09-20T12:30:00Z"], ["2026-09-20T12:30:00Z", "2026-09-20T10:00:00-03:00"]]) {
    const t = construirTimeline(ordem.map((d) => ev("0", d)));
    assert.equal(t.passos[0].data, "2026-09-20T12:30:00Z");
  }
});

test("com alertas: 5 passos + os alertas como banners, pela ordem, sem avançar passos", () => {
  const t = construirTimeline([ev("0", "2026-09-20"), ev("A1", "2026-09-23"), ev("A2", "2026-09-24")]);
  assert.equal(t.passos.length, 5);
  assert.deepEqual(t.passos.map((p) => p.feito), [true, false, false, false, false]);
  assert.deepEqual(t.alertas, [
    { codigo: "A1", rotulo: "Tentativa de entrega sem sucesso", data: "2026-09-23" },
    { codigo: "A2", rotulo: "Aguardando retirada na agência", data: "2026-09-24" },
  ]);
});

test("a timeline não carrega local nem descrição (P8: podem trazer morada)", () => {
  const t = construirTimeline([ev("0", "2026-09-20", { local: "Rua A, 1 — Manaus", descricao: "Entregue a Maria, CPF 123" }),
    ev("A1", "2026-09-21", { local: "Rua A, 1" })]);
  assert.doesNotMatch(JSON.stringify(t), /Rua A|Maria|CPF/);
});

test("timelineDoRastreio: sem eventos → null (o cartão fica no código em bruto); com eventos → a timeline", () => {
  assert.equal(timelineDoRastreio(null), null);
  assert.equal(timelineDoRastreio({ codigo: "AA123456789BR", transportadora: "Correios" }), null);
  assert.equal(timelineDoRastreio({ codigo: "AA123456789BR", eventos: [] }), null);
  const t = timelineDoRastreio({ codigo: "AA123456789BR", eventos: [ev("2", "2026-09-22")] });
  assert.equal(t.passos.length, 5);
  assert.deepEqual(t.passos.map((p) => p.feito), [true, true, true, false, false]);
});

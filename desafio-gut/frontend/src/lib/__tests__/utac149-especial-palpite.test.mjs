// UTAC149 — a especial PROGRAMADA (palpite): regras puras. Datas LITERAIS (lição do UTAC138: nunca o relógio real).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { edicoesProgramadasDe, estadoEdicaoProgramada } from "../palpite.js";
import { escolherEspecial, ehEspecialProgramada } from "../../components/edicao-especial/_estilo-especial.js";
import { escolherEspecialTop10 } from "../../components/meus-ativos/_top10-passe.js";
import { getEstadoEdicao } from "../../utils/edicao.js";

const PALPITE = Object.freeze({
  id: "ESPECIAL-PALPITE1", tipo: "programado", produto: "Air Fryer", status: "aberto",
  inicio_em: "2026-11-25T03:00:00.000Z", termino_em: "2026-12-10T02:59:00.000Z", imagem_url: "x.jpg",
});
const RELAMPAGO = Object.freeze({
  id: "ESPECIAL-RELAMPAGO1", tipo: "relampago", produto: "Quad Fry", status: "aberto",
  inicio_em: "2026-11-20T00:22:40.304Z", termino_em: "2026-11-30T23:00:00.000Z",
});
const PROG = Object.freeze({ id: "PROG-3", tipo: "programado", produto: "Fone", status: "aberto", termino_em: "2026-12-31T00:00:00.000Z" });
const AGORA = Date.parse("2026-11-26T12:00:00.000Z");
const DEPOIS_RELAMPAGO = Date.parse("2026-12-01T12:00:00.000Z"); // dentro das 24 h de retenção da Relâmpago
const FORA_RETENCAO = Date.parse("2026-12-03T12:00:00.000Z");   // Relâmpago já fora da retenção; palpite aberta
const DEPOIS_PALPITE = Date.parse("2026-12-10T12:00:00.000Z");

describe("UTAC149 · a especial palpite fica FORA do circuito Relâmpago", () => {
  test("ehEspecialProgramada: só ESPECIAL-* com tipo programado", () => {
    assert.equal(ehEspecialProgramada(PALPITE), true);
    assert.equal(ehEspecialProgramada(RELAMPAGO), false);
    assert.equal(ehEspecialProgramada(PROG), false);
    assert.equal(ehEspecialProgramada(null), false);
  });
  test("escolherEspecial (slot ⚡) ignora a palpite — antes e depois do fecho da Relâmpago", () => {
    const ed = { [PALPITE.id]: PALPITE, [RELAMPAGO.id]: RELAMPAGO };
    assert.equal(escolherEspecial(ed, {}, AGORA)?.id, "ESPECIAL-RELAMPAGO1");
    // depois de 30/11 a Relâmpago acabou; sem a guarda a palpite (aberta até 9/12) tomava o slot ⚡
    assert.equal(escolherEspecial(ed, {}, DEPOIS_RELAMPAGO)?.id, "ESPECIAL-RELAMPAGO1");
    assert.equal(escolherEspecial(ed, {}, FORA_RETENCAO), null, "a palpite tomou o slot ⚡ depois da Relâmpago");
    assert.equal(escolherEspecial({ [PALPITE.id]: PALPITE }, {}, AGORA), null);
  });
  test("Top 10 de Meus Ativos ignora a palpite encerrada", () => {
    assert.equal(escolherEspecialTop10({ [PALPITE.id]: PALPITE }, {}, DEPOIS_PALPITE), null);
  });
});

describe("UTAC149 · ordem das Programadas", () => {
  test("a especial ABERTA vem primeiro; abertas antes das encerradas", () => {
    const fechada = { ...PROG, id: "PROG-1", status: "encerrado" };
    const lista = edicoesProgramadasDe({ a: fechada, b: PROG, c: PALPITE });
    assert.deepEqual(lista.map((e) => e.id), ["ESPECIAL-PALPITE1", "PROG-3", "PROG-1"]);
  });
  test("especial encerrada não passa à frente de uma Programada aberta", () => {
    const lista = edicoesProgramadasDe({ b: PROG, c: { ...PALPITE, status: "encerrado" } });
    assert.deepEqual(lista.map((e) => e.id), ["PROG-3", "ESPECIAL-PALPITE1"]);
  });
  test("a especial Relâmpago nunca entra na lista das Programadas", () => {
    assert.deepEqual(edicoesProgramadasDe({ r: RELAMPAGO, p: PALPITE }).map((e) => e.id), ["ESPECIAL-PALPITE1"]);
  });
});

describe("UTAC149 · estadoEdicaoProgramada", () => {
  test("aberta: selo «🟢 Aberta» e faixa com o fecho em hora de Brasília", () => {
    const e = estadoEdicaoProgramada(PALPITE, AGORA);
    assert.equal(e.badge, "🟢 Aberta");
    assert.equal(e.rotuloLongo, "Palpites até 09/12 às 23:59");
    assert.equal(e.timer, null);
    assert.equal(e.ativa, true);
  });
  test("antes de abrir: «Abre 25/11 às 00:00»", () => {
    const e = estadoEdicaoProgramada(PALPITE, Date.parse("2026-11-20T00:00:00.000Z"));
    assert.equal(e.badge, "🕒 Em breve");
    assert.equal(e.rotuloLongo, "Abre 25/11 às 00:00");
  });
  test("depois do fecho: «Edição encerrada»", () => {
    const e = estadoEdicaoProgramada(PALPITE, DEPOIS_PALPITE);
    assert.equal(e.badge, "🔴 Encerrada");
    assert.equal(e.rotuloLongo, "Edição encerrada");
    assert.equal(e.encerrada, true);
  });
  test("Programada normal: exactamente o getEstadoEdicao (zero diff)", () => {
    assert.deepEqual(estadoEdicaoProgramada(PROG, AGORA), getEstadoEdicao(PROG));
  });
  test("especial sem datas legíveis: cai no getEstadoEdicao (não inventa estado)", () => {
    const sem = { ...PALPITE, inicio_em: null };
    assert.deepEqual(estadoEdicaoProgramada(sem, AGORA), getEstadoEdicao(sem));
  });
});

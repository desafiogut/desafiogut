// UTAC149-val (SEG4 ℹ️) — a faixa «Palpites até DD/MM às HH:MM» é em hora de BRASÍLIA, seja qual for o fuso do aparelho.
// Os testes do executor corriam com o fuso da máquina (America/Sao_Paulo): tirar o `timeZone` do formatador passava
// verde. Aqui o processo corre noutro fuso (fixado ANTES de qualquer formatação), o que torna o mutante visível.
process.env.TZ = "Asia/Tokyo";
import { test } from "node:test";
import assert from "node:assert/strict";
import { estadoEdicaoProgramada } from "../palpite.js";

const PALPITE = Object.freeze({
  id: "ESPECIAL-PALPITE1", tipo: "programado", status: "aberto",
  inicio_em: "2026-11-25T03:00:00.000Z", termino_em: "2026-12-10T02:59:00.000Z",
});

test("controlo: o processo está mesmo noutro fuso (senão este teste não mede nada)", () => {
  assert.notEqual(new Date(Date.parse(PALPITE.termino_em)).getHours(), 23);
});
test("fecho e abertura em hora de Brasília num aparelho em Tóquio", () => {
  assert.equal(estadoEdicaoProgramada(PALPITE, Date.parse("2026-11-26T12:00:00.000Z")).rotuloLongo, "Palpites até 09/12 às 23:59");
  assert.equal(estadoEdicaoProgramada(PALPITE, Date.parse("2026-11-20T00:00:00.000Z")).rotuloLongo, "Abre 25/11 às 00:00");
});

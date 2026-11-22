// UTAC148 (R18-148-D, Regulamento v7 Art. 24) — a indicação dá SÓ ECOQUILDO (2 ao indicante, 1 ao indicado), sem os
// +50 pontos de lance. O limite mensal (10) conta as indicações pagas em ECOQUILDO E as antigas do ledger, por indicado.
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const MES = "2026-11";
let LEDGER, ECO, CREDITOS_PONTOS, LASTRO;
const novoEstado = () => { LEDGER = new Map(); ECO = new Map(); CREDITOS_PONTOS = 0; LASTRO = 0; };
novoEstado();
const histEco = (e) => (ECO.get(e) ?? []);

mock.module("../_lib/ledger-lance.mjs", { namedExports: {
  creditarPontosLance: async () => { CREDITOS_PONTOS += 1; return { ok: true, criado: true, pontos: 50 }; },
  lerLedgerLance: async (e) => ({ creditos: 0, pontos: 0, historico: LEDGER.get(e) ?? [] }),
} });
mock.module("../_lib/eco-quildo.mjs", { namedExports: {
  creditarEcoQuildo: async (e, valor, motivo, ref) => {
    const h = histEco(e);
    if (h.some((x) => x.ref === ref)) return { ok: true, criado: false };
    ECO.set(e, [...h, { data: `${MES}-21T12:00:00.000Z`, motivo, delta: valor, ref }]);
    return { ok: true, criado: true };
  },
  lerEcoQuildo: async (e) => ({ saldo: histEco(e).reduce((s, x) => s + x.delta, 0), historico: histEco(e) }),
  registarEmissaoNoLastro: async (v) => { LASTRO += v; return { ok: true }; },
  reverterEcoQuildo: async () => ({ ok: true, revertido: true }),
} });
mock.module("../_lib/conversao-eco-passe.mjs", { namedExports: { converterEcoEmPassesSeguro: async () => ({ ok: true, convertidos: 0 }) } });
mock.module("../_lib/sentry-server.mjs", { namedExports: { captureSecurityAlert: async () => {} } });

const F = await import("../_lib/fontes-lance.mjs");
const AGORA = new Date(`${MES}-21T15:00:00.000Z`);
const A = "0xaaa0000000000000000000000000000000000148";
const ind = (n) => `0xbbb${String(n).padStart(37, "0")}`;
beforeEach(novoEstado);

test("I1 · indicação válida: 2 ECOQUILDO ao indicante e 1 ao indicado; NENHUM ponto de lance", async () => {
  const r = await F.creditarIndicacao(A, ind(1), AGORA);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(CREDITOS_PONTOS, 0, "a indicação voltou a creditar pontos de lance");
  assert.deepEqual(histEco(A).map((x) => [x.delta, x.ref]), [[2, `eco-indicacao:${ind(1)}`]]);
  assert.deepEqual(histEco(ind(1)).map((x) => [x.delta, x.ref]), [[1, "eco-indicacao-recebida"]]);
  assert.equal(LASTRO, 3);
  assert.equal(r.indicante.creditado, true);
  assert.equal(r.indicado.creditado, true);
});

test("I2 · idempotência: repetir a mesma indicação não paga outra vez", async () => {
  await F.creditarIndicacao(A, ind(1), AGORA);
  const r = await F.creditarIndicacao(A, ind(1), AGORA);
  assert.equal(r.indicante.creditado, false);
  assert.equal(histEco(A).length, 1);
  assert.equal(LASTRO, 3);
});

test("I3 · limite mensal: o 11.º indicado do mês não paga o indicante (o indicado recebe), contando ECO + ledger antigo", async () => {
  // 4 indicações ANTIGAS do mês no ledger de pontos (antes do UTAC148) + 6 novas pagas em ECOQUILDO = 10
  LEDGER.set(A, [1, 2, 3, 4].map((n) => ({ motivo: "indicacao", ref: `indicacao:${ind(100 + n)}`, data: `${MES}-02T00:00:00.000Z`, delta: 50 })));
  for (let n = 1; n <= 6; n++) assert.equal((await F.creditarIndicacao(A, ind(n), AGORA)).indicante.creditado, true, `a ${n}.ª devia pagar`);
  const r = await F.creditarIndicacao(A, ind(11), AGORA);
  assert.equal(r.indicante.code, "LIMITE_MENSAL");
  assert.equal(histEco(A).length, 6, "o indicante não recebe a 11.ª");
  assert.equal(histEco(ind(11)).length, 1, "o indicado recebe na mesma");
  assert.equal(F.indicacoesDoMes({ historico_lance: LEDGER.get(A) }, AGORA, histEco(A)).creditadas, 10, "o contador do painel conta as duas fontes");
});

test("I4 · um indicado já pago no ledger antigo não volta a pagar em ECOQUILDO ao mesmo indicante", async () => {
  LEDGER.set(A, [{ motivo: "indicacao", ref: `indicacao:${ind(7)}`, data: `${MES}-02T00:00:00.000Z`, delta: 50 }]);
  const r = await F.creditarIndicacao(A, ind(7), AGORA);
  assert.equal(r.indicante.ok, true);
  assert.equal(F.indicacoesDoMes({ historico_lance: LEDGER.get(A) }, AGORA, histEco(A)).creditadas, 1, "o mesmo indicado conta uma vez");
});

test("I5 · a cópia da indicação (notificação, GUTO, painel, widget) diz só ECOQUILDO — nunca pontos de lance", async () => {
  const { readFileSync } = await import("node:fs");
  const { mensagemInducao } = await import("../_lib/referral.mjs");
  assert.match(mensagemInducao(1, "Ana"), /\+2 ECOQUILDO creditados!/);
  assert.match(mensagemInducao(3), /\+6 ECOQUILDO creditados\./);
  for (const m of [mensagemInducao(1), mensagemInducao(3)]) assert.doesNotMatch(m, /pontos de lance/);
  const semComent = (f) => readFileSync(new URL(f, import.meta.url), "utf8").split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\{\/\*)/.test(l)).join("\n");
  for (const f of ["../_lib/guto-perfis.mjs", "../../../src/components/PainelIndicacao.jsx", "../../../src/components/ChatbotWidget.jsx"]) {
    assert.doesNotMatch(semComent(f), /\+50 pontos de lance/, `${f}: voltou a prometer +50 pontos de lance na indicação`);
  }
  assert.match(semComent("../../../src/components/PainelIndicacao.jsx"), /\+2 ECOQUILDO/);
});

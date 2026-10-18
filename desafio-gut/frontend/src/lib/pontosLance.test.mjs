// pontosLance.test.mjs — UTAC110j.4b (Frente B, só-UI). Lógica pura do painel «Seus pontos de lance».
// Corre com:  node --test src/lib/pontosLance.test.mjs   (a partir de desafio-gut/frontend)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { pontosLanceDaResposta, ganhosPorFonte, recentes, rotuloMotivo, FONTES, diaMes } from "./pontosLance.js";

const AQUI = dirname(fileURLToPath(import.meta.url));

const mov = (data, motivo, delta, campo = "pontos_lance") => ({ data, campo, motivo, delta, ref: `${motivo}:${data}` });

test("P1 leitura estrita: só um bloco `lance` legível; ilegível → null (sem zeros inventados)", () => {
  assert.equal(pontosLanceDaResposta(null), null);
  assert.equal(pontosLanceDaResposta({}), null);
  assert.equal(pontosLanceDaResposta({ lance: { pontos: "5", historico: [] } }), null);
  assert.equal(pontosLanceDaResposta({ lance: { pontos: -1, historico: [] } }), null);
  assert.equal(pontosLanceDaResposta({ lance: { pontos: 5.5, historico: [] } }), null);
  assert.equal(pontosLanceDaResposta({ lance: { pontos: 5 } }), null);
  assert.deepEqual(pontosLanceDaResposta({ lance: { pontos: 0, historico: [] } }), { pontos: 0, movimentos: [] });
});

test("P2 só entram movimentos de PONTOS legíveis (créditos, delta 0/não-inteiro, data má ficam de fora)", () => {
  const l = pontosLanceDaResposta({ lance: { pontos: 15, creditos: 1, historico: [
    mov("2026-10-10T10:00:00Z", "login", 5),
    mov("2026-10-10T11:00:00Z", "passe-relampago", 1, "creditos_lance"),
    mov("2026-10-10T12:00:00Z", "missao", 0),
    mov("2026-10-10T13:00:00Z", "missao", 2.5),
    mov("nao-e-data", "missao", 10),
    mov("2026-10-11T10:00:00Z", "missao", 10),
    null, "x",
  ] } });
  assert.equal(l.movimentos.length, 2);
  assert.deepEqual(l.movimentos.map((m) => m.motivo), ["login", "missao"]);
});

test("P3 ganhos por fonte somam só deltas positivos; motivo desconhecido → «outro»", () => {
  const l = pontosLanceDaResposta({ lance: { pontos: 0, historico: [
    mov("2026-10-10T10:00:00Z", "login", 5), mov("2026-10-11T10:00:00Z", "login", 5),
    mov("2026-10-11T11:00:00Z", "indicacao", 50), mov("2026-10-12T11:00:00Z", "sequencia", 50),
    mov("2026-10-12T12:00:00Z", "lance", -37), mov("2026-10-12T13:00:00Z", "constructor", 7),
  ] } });
  const g = ganhosPorFonte(l);
  assert.equal(g.login, 10);
  assert.equal(g.indicacao, 50);
  assert.equal(g.sequencia, 50);
  assert.equal(g.missao, 0);
  assert.equal(g.outro, 7, "um motivo fora da lista não pode ser somado a uma fonte (nem quebrar o objecto)");
  assert.equal(rotuloMotivo("constructor"), "Outro");
});

test("P4 recentes: mais recente primeiro, no máximo N", () => {
  const l = pontosLanceDaResposta({ lance: { pontos: 0, historico: [
    mov("2026-10-10T10:00:00Z", "login", 5), mov("2026-10-12T10:00:00Z", "missao", 10), mov("2026-10-11T10:00:00Z", "indicacao", 50),
  ] } });
  assert.deepEqual(recentes(l, 2).map((m) => m.motivo), ["missao", "indicacao"]);
});

test("P5 os motivos do painel existem no ledger do backend (sem rótulos para fontes inventadas)", () => {
  const ledger = readFileSync(resolve(AQUI, "../../netlify/functions/_lib/ledger-lance.mjs"), "utf8");
  const m = ledger.match(/MOTIVOS_PONTOS_LANCE\s*=\s*Object\.freeze\(\[([^\]]*)\]/);
  assert.ok(m, "não encontrei MOTIVOS_PONTOS_LANCE no ledger");
  const doBackend = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  for (const f of FONTES) assert.ok(doBackend.includes(f.motivo), `o motivo «${f.motivo}» não existe no ledger`);
});

test("P6 data em dd/mm no dia de Manaus (03:30Z de 11/10 ainda é 10/10 em Manaus)", () => {
  assert.equal(diaMes("2026-10-11T03:30:00Z"), "10/10");
  assert.equal(diaMes("2026-10-11T04:30:00Z"), "11/10");
  assert.equal(diaMes("lixo"), "—");
});

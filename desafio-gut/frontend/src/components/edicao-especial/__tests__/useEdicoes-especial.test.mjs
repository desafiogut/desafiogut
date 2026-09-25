// useEdicoes-especial.test.mjs — MC94.2. O hook `useEdicoes` expõe `agendadas`
// e o desvio do relógio do servidor. Corre o hook A SÉRIO (condutor do MC94) com
// o `apiGet` real e um duplo de `fetch`.
//
// Corre com:  node --test src/components/edicao-especial/__tests__/useEdicoes-especial.test.mjs

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { montar, duploDeFetch } from "../../../hooks/__tests__/_hook-runner.mjs";
import { useEdicoes } from "../../../hooks/useEdicoes.js";

// O hook ouve `visibilitychange`: o node não tem `document`.
let documentoOriginal;
before(() => {
  documentoOriginal = globalThis.document;
  globalThis.document = { visibilityState: "visible", addEventListener() {}, removeEventListener() {} };
});
after(() => { globalThis.document = documentoOriginal; });

async function ate(c, condicao, comoFalhou) {
  for (let i = 0; i < 40; i += 1) {
    if (condicao(c.resultado())) return c.resultado();
    await new Promise((r) => setTimeout(r, 0));
  }
  assert.fail(`${comoFalhou} — estado final: ${JSON.stringify(c.resultado())}`);
}

const R1 = { id: "R-1", tipo: "relampago", produto: null, termino_em: "2026-09-26T12:00:00.000Z", lances: 0, status: "aberto" };
const ESPECIAL = {
  id: "ESPECIAL-AIRFRYER", tipo: "programado", produto: "Air Fryer",
  termino_em: "2026-10-04T23:30:00.000Z", inicio_em: "2026-10-04T23:00:00.000Z",
  lances: 0, status: "agendado", imagem_url: "/artes/edicao-especial-airfryer.jpg",
};

describe("MC94.2 · useEdicoes — agendadas e relógio do servidor", () => {
  test("expõe `agendadas` normalizadas, com inicio_em e imagem_url", async () => {
    const f = duploDeFetch(() => ({ json: { edicoes: { "R-1": R1 }, agendadas: { "ESPECIAL-AIRFRYER": ESPECIAL }, agora: new Date().toISOString() } }));
    try {
      const c = montar(useEdicoes, []);
      const r = await ate(c, (e) => e.edicoesStatus === "ok", "não chegou a ok");
      const a = r.agendadas["ESPECIAL-AIRFRYER"];
      assert.ok(a, "agendadas foi ignorado");
      assert.equal(a.inicio_em, "2026-10-04T23:00:00.000Z");
      assert.equal(a.imagem_url, "/artes/edicao-especial-airfryer.jpg");
      assert.equal(a.tipo, "programado");
      assert.equal(r.edicoes["R-1"].inicio_em, null, "edições sem início ficam null");
      assert.match(f.chamadas[0].url, /^\/\.netlify\/functions\/edicoes$/);
      await c.desmontar();
    } finally { f.restaurar(); }
  });

  test("offset = hora do servidor − hora do aparelho (servidor 5 min à frente)", async () => {
    const f = duploDeFetch(() => ({ json: { edicoes: { "R-1": R1 }, agendadas: {}, agora: new Date(Date.now() + 300_000).toISOString() } }));
    try {
      const c = montar(useEdicoes, []);
      const r = await ate(c, (e) => e.offsetRelogioMs !== null, "offset nunca chegou");
      assert.ok(Math.abs(r.offsetRelogioMs - 300_000) < 1_000, `offset ${r.offsetRelogioMs}`);
      await c.desmontar();
    } finally { f.restaurar(); }
  });

  test("resposta sem `agora`: offset fica null — nunca um 0 inventado", async () => {
    const f = duploDeFetch(() => ({ json: { edicoes: { "R-1": R1 } } }));
    try {
      const c = montar(useEdicoes, []);
      const r = await ate(c, (e) => e.edicoesStatus === "ok", "não chegou a ok");
      assert.equal(r.offsetRelogioMs, null);
      assert.deepEqual(r.agendadas, {});
      await c.desmontar();
    } finally { f.restaurar(); }
  });

  test("index.html com 200 (SPA fallback): erro, e nenhuma agendada inventada", async () => {
    const f = duploDeFetch(() => ({ corpo: "<!doctype html><html></html>" }));
    try {
      const c = montar(useEdicoes, []);
      const r = await ate(c, (e) => e.edicoesStatus === "error", "não deu erro");
      assert.deepEqual(r.agendadas, {});
      assert.equal(r.offsetRelogioMs, null);
      await c.desmontar();
    } finally { f.restaurar(); }
  });
});

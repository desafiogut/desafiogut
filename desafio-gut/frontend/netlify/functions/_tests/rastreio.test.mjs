// MC102.1a — contrato do adaptador de rastreio + mock (Frente A).
// node --test _tests/rastreio.test.mjs   (a partir de netlify/functions)
//
// Bidireccional: o mock injectado dá eventos; sem adaptador (produção de hoje) dá fallback; e o mock não
// é importado por nenhum ficheiro de produção (HARD GATE 13).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { consultarRastreio, ADAPTADOR_REAL } from "../_lib/rastreio.mjs";
import { adaptadorMock, EVENTOS_MOCK } from "../_lib/rastreio-mock.mjs";

const CODIGO = "AA123456789BR";

test("mock injectado → ok:true com os eventos, só com os 4 campos do contrato", async () => {
  const r = await consultarRastreio(CODIGO, "Correios", { adaptador: adaptadorMock });
  assert.equal(r.ok, true);
  assert.equal(r.eventos.length, EVENTOS_MOCK.length);
  for (const e of r.eventos) assert.deepEqual(Object.keys(e).sort(), ["codigo", "data", "descricao", "local"]);
  assert.deepEqual(r.eventos.map((e) => e.codigo), ["0", "1", "2", "3", "A1", "4"]);
  assert.equal(r.fallback, undefined);
});

test("produção de hoje (sem adaptador real) → ok:false adaptador_indisponivel + fallback só com o código", async () => {
  assert.equal(ADAPTADOR_REAL, null, "o adaptador real é do MC102.1b");
  const r = await consultarRastreio(CODIGO, "Correios");
  assert.deepEqual(r, { ok: false, code: "adaptador_indisponivel", fallback: { codigo: CODIGO } });
});

test("o fallback nunca traz URL (P9)", async () => {
  const falha = { async consultar() { throw new Error("rede"); } };
  for (const r of [await consultarRastreio(CODIGO, "Correios"), await consultarRastreio(CODIGO, "Correios", { adaptador: falha })]) {
    assert.doesNotMatch(JSON.stringify(r), /https?:|www\./i);
  }
});

test("adaptador que rebenta → ok:false falha_adaptador + fallback (não propaga a excepção)", async () => {
  const r = await consultarRastreio(CODIGO, "Correios", { adaptador: { async consultar() { throw new Error("timeout"); } } });
  assert.deepEqual(r, { ok: false, code: "falha_adaptador", fallback: { codigo: CODIGO } });
});

test("adaptador com resposta sem array de eventos → ok:false resposta_invalida", async () => {
  for (const resp of [null, {}, { eventos: "x" }]) {
    const r = await consultarRastreio(CODIGO, "Correios", { adaptador: { async consultar() { return resp; } } });
    assert.deepEqual(r, { ok: false, code: "resposta_invalida", fallback: { codigo: CODIGO } });
  }
});

test("campos a mais da transportadora (nome, CPF, morada) não passam (P8)", async () => {
  const vaza = { async consultar() {
    return { eventos: [{ data: "2026-09-20", codigo: "0", local: "Manaus/AM", descricao: "Postado",
      destinatario: "Maria Silva", cpf: "12345678909", endereco: "Rua A, 1" }] };
  } };
  const r = await consultarRastreio(CODIGO, "Correios", { adaptador: vaza });
  assert.equal(r.ok, true);
  assert.doesNotMatch(JSON.stringify(r), /Maria Silva|12345678909|Rua A/);
});

// ── HARD GATE 13: o mock não entra em produção ────────────────────────────────────────────────
const FUNCOES = join(dirname(fileURLToPath(import.meta.url)), "..");
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
function ficheirosDeProducao(d = FUNCOES, out = []) {
  for (const e of readdirSync(d)) {
    if (e === "node_modules" || e === "_tests") continue;
    const p = join(d, e);
    if (statSync(p).isDirectory()) ficheirosDeProducao(p, out);
    else if (/\.(m?js|cjs|ts)$/.test(e) && e !== "rastreio-mock.mjs") out.push(p);
  }
  return out;
}

test("nenhum ficheiro de produção em netlify/functions importa o rastreio-mock (HARD GATE 13)", () => {
  const ficheiros = ficheirosDeProducao();
  // Controlo positivo: a varredura vê mesmo os ficheiros (um glob vazio passaria sempre).
  assert.ok(ficheiros.length > 50, `só ${ficheiros.length} ficheiros vistos`);
  assert.ok(ficheiros.some((p) => p.endsWith(join("_lib", "rastreio.mjs"))), "a varredura tem de ver _lib/rastreio.mjs");
  const culpados = ficheiros.filter((p) => /rastreio-mock/.test(semComentarios(readFileSync(p, "utf8"))));
  assert.deepEqual(culpados.map((p) => relative(FUNCOES, p)), []);
});

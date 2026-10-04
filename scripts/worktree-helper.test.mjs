#!/usr/bin/env node
// =============================================================================
// UTAC106x.3 — testes do scripts/worktree-helper.mjs (regra A13).
// NAO faz parte da suite canonica (essa corre src/**/*.test.mjs e _tests/*.test.mjs).
// Corre-se a mao:   node --test scripts/worktree-helper.test.mjs
//
// SEGURANCA: T1-T6/T8 usam alvos DESCARTÁVEIS. T7 exercita o caminho de PRODUCAO
// (junctions para o node_modules real) mas termina com o `remover` do helper (rmdir
// primeiro) e confirma que o node_modules REAL fica intacto.
//
// MUTACAO (R16/GATE 7): a copia mutada aponta-se por env WORKTREE_HELPER; o caso T5
// («alvo intacto») TEM de ficar RED. Ver _logs/UTAC106x.3-a13.md.
// =============================================================================
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync, readdirSync, mkdtempSync, lstatSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HELPER = process.env.WORKTREE_HELPER
  || new URL("./worktree-helper.mjs", import.meta.url).href;
const H = await import(HELPER);

const RAIZ = resolve(fileURLToPath(import.meta.url), "..", "..");
const sha = () => spawnSync("git", ["-C", RAIZ, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
const NM = ["desafio-gut/frontend/node_modules", "desafio-gut/frontend/netlify/functions/node_modules"];

let base, alvo, wt, link, wt7;
const limpar = (p) => { if (p && existsSync(p)) spawnSync("cmd", ["/c", "rmdir", p], { encoding: "utf8" }); };

before(() => {
  base = mkdtempSync(join(tmpdir(), "a13-test-"));
  alvo = join(base, "alvo-nm");                    // alvo DESCARTÁVEL
  mkdirSync(join(alvo, "pkg"), { recursive: true });
  for (const f of ["a.js", "b.js", "c.js"]) writeFileSync(join(alvo, f), "x");
  wt = join(base, "wt");
  H.criar(wt, sha(), { junctions: false });        // worktree SEM tocar no node_modules real
  link = join(wt, "desafio-gut", "frontend", "node_modules");
  const r = spawnSync("cmd", ["/c", "mklink", "/J", link, alvo], { encoding: "utf8" });
  assert.equal(r.status, 0, "mklink falhou: " + (r.stdout || r.stderr));
  wt7 = join(base, "wt7");
});

after(() => {
  limpar(link);
  // por seguranca: se T7 deixou junctions, remove-as so a elas antes de apagar a arvore
  for (const rel of NM) limpar(join(wt7, rel));
  if (base) rmSync(base, { recursive: true, force: true });
  spawnSync("git", ["-C", RAIZ, "worktree", "prune"]);
});

test("T1 — o helper criou o worktree", () => {
  assert.ok(existsSync(wt), "worktree nao existe");
});

test("T2 — a junction existe e e um reparse point", () => {
  assert.ok(existsSync(link), "junction nao existe");
  assert.equal(lstatSync(link).isSymbolicLink(), true, "nao detectada como reparse point");
});

test("T3 — listarReparse encontra o reparse point sem descer nele", () => {
  const r = H.listarReparse(wt);
  assert.equal(r.length, 1, `esperava 1 reparse point, vi ${r.length}: ${JSON.stringify(r)}`);
  assert.ok(r[0].endsWith("node_modules"));
});

test("T4 — remover() apaga a junction e o worktree", () => {
  const res = H.remover(wt);
  assert.equal(res.ok, true, `remover falhou: ${JSON.stringify(res)}`);
  assert.equal(existsSync(wt), false, "worktree ainda existe");
  assert.equal(H.listarReparse(wt).length, 0, "ainda ha reparse points");
});

// ⭐ O CASO QUE A MUTACAO TEM DE DERRUBAR: o alvo NAO pode ser esvaziado.
test("T5 — o ALVO ficou INTACTO (nao foi esvaziado pelo delete)", () => {
  const n = readdirSync(alvo).length;
  assert.equal(n, 4, `alvo ficou com ${n} entradas (esperadas 4: 3 ficheiros + pkg)`);
  for (const f of ["a.js", "b.js", "c.js"]) {
    assert.ok(existsSync(join(alvo, f)), `ficheiro perdido: ${f}`);
  }
});

test("T6 — remover() de um caminho inexistente e idempotente", () => {
  const res = H.remover(join(base, "nao-existe"));
  assert.equal(res.ok, true);
});

// F5 — fecha a lacuna de cobertura: exercita o caminho de PRODUCAO (junctions:true).
// ⚠️ NUNCA corre sobre uma copia MUTADA: uma mutacao que desligue o guarda/RMDIR faria
//    `git worktree remove` seguir a junction e DESTRUIR o node_modules real (ver A13).
test("T7 — criar({junctions:true}) faz as junctions e remover() NAO toca no node_modules REAL",
  { skip: process.env.WORKTREE_HELPER ? "modo mutacao: T7 mexe no node_modules REAL" : false },
  () => {
  const antes = NM.map((rel) => readdirSync(join(RAIZ, rel)).length);
  const res = H.criar(wt7, sha());                       // default: junctions
  assert.ok(res.junctions.length >= 1, `esperava junctions, vi ${JSON.stringify(res.junctions)}`);
  for (const rel of res.junctions) {
    assert.equal(lstatSync(join(wt7, rel)).isSymbolicLink(), true, `nao e reparse: ${rel}`);
  }
  const rem = H.remover(wt7);
  assert.equal(rem.ok, true, `remover falhou: ${JSON.stringify(rem)}`);
  assert.equal(existsSync(wt7), false, "worktree ainda existe");
  const depois = NM.map((rel) => readdirSync(join(RAIZ, rel)).length);
  assert.deepEqual(depois, antes, `o node_modules REAL mudou! ${antes} -> ${depois}`);
});

// F1 — a recusa do git por WORKTREE SUJO e' PROTECCAO: nao se contorna (nem se apaga nada).
test("T8 — worktree SUJO: remover() recusa e NAO apaga trabalho nao commitado", () => {
  const wtd = join(base, "wt-sujo");
  H.criar(wtd, sha(), { junctions: false });
  writeFileSync(join(wtd, "trabalho-nao-commitado.txt"), "nao me apagues");
  const res = H.remover(wtd);
  assert.equal(res.ok, false, "remover() nao devia ter sucesso num worktree sujo");
  assert.ok(existsSync(wtd), "o worktree sujo FOI apagado (perda de trabalho!)");
  assert.ok(existsSync(join(wtd, "trabalho-nao-commitado.txt")), "o ficheiro nao commitado FOI apagado!");
  // limpeza: forcar so nesta arvore descartavel
  spawnSync("git", ["-C", RAIZ, "worktree", "remove", "--force", wtd], { encoding: "utf8" });
});

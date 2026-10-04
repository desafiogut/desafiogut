#!/usr/bin/env node
// =============================================================================
// UTAC106x.3 — testes do scripts/worktree-helper.mjs (regra A13).
// NAO faz parte da suite canonica (essa corre src/**/*.test.mjs e _tests/*.test.mjs).
// Corre-se a mao:   node --test scripts/worktree-helper.test.mjs
//
// SEGURANCA: NUNCA se liga nem se apaga o node_modules REAL. O worktree e' criado
// SEM junctions ({junctions:false}) e a unica junction e' para um alvo descartavel.
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

let base, alvo, wt, link;

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
});

after(() => {
  // limpeza: rmdir da junction (so o link) ANTES de apagar a arvore de teste
  if (link && existsSync(link)) spawnSync("cmd", ["/c", "rmdir", link], { encoding: "utf8" });
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

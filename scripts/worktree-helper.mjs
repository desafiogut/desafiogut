#!/usr/bin/env node
// =============================================================================
// UTAC106x.3 — helper de worktrees com junctions de node_modules (regra A13).
// =============================================================================
// PORQUE EXISTE (medido no UTAC106x.3):
//   `git worktree remove` (tal como `rm -rf`) faz um delete recursivo que SEGUE os
//   reparse points e apaga o conteudo do node_modules REAL —
//     • caminhos curtos: exit 0 e o alvo fica VAZIO (perda SILENCIOSA);
//     • caminho > MAX_PATH: exit 255 «Filename too long» (aborta a meio).
//   Foi assim que o UTAC106x.1 destruiu dois node_modules. Este helper implementa a
//   ordem da A13: **rmdir das junctions PRIMEIRO**, e so entao remover o worktree.
//
// USO:
//   node scripts/worktree-helper.mjs criar   <path-do-worktree> <sha> [--no-junctions]
//   node scripts/worktree-helper.mjs check   <path-do-worktree>
//   node scripts/worktree-helper.mjs remover <path-do-worktree>
//
// INVARIANTES (a razao de ser):
//   1) NUNCA se faz delete recursivo enquanto existir um reparse point na arvore;
//      o fallback `rm -rf` so corre depois de PROVAR que nao resta nenhum.
//   2) ⚠️ NUNCA se contorna a recusa do git por WORKTREE SUJO (ha trabalho nao
//      commitado) — essa recusa e' proteccao, nao impedimento (achado F1 do validador).
// =============================================================================

import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..");

/** Caminhos de node_modules que precisam de junction num worktree (A9). */
const JUNCTIONS = [
  "desafio-gut/frontend/node_modules",
  "desafio-gut/frontend/netlify/functions/node_modules",
];

/** Uma junction é reportada pelo Node como symbolic link (medido). */
export function ehReparse(p) {
  try { return lstatSync(p).isSymbolicLink(); } catch { return false; }
}

/**
 * Varre a arvore e devolve os reparse points SEM descer neles (nunca segue o alvo).
 * **Fail-safe** (F6 + N2): se o `lstat` OU o `readdir` falharem, devolve um MARCADOR em
 * vez de ignorar — assim o `remover` ABORTA em vez de arriscar um delete recursivo.
 */
export function listarReparse(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  let entradas;
  try { entradas = readdirSync(dir, { withFileTypes: true }); }
  catch { acc.push(join(dir, "*ILEGIVEL*")); return acc; }   // N2: incerto => recolhe e NAO desce
  for (const e of entradas) {
    const p = join(dir, e.name);
    let st;
    try { st = lstatSync(p); } catch { acc.push(p); continue; }   // F6: incognita => recolhe e NAO desce
    if (st.isSymbolicLink()) acc.push(p);                          // junction => recolhe e NAO desce
    else if (st.isDirectory()) listarReparse(p, acc);
  }
  return acc;
}

const cmd = (args) => spawnSync("cmd", ["/c", ...args], { encoding: "utf8" });
const git = (args) => spawnSync("git", ["-C", RAIZ, ...args], { encoding: "utf8" });

/** remove UMA junction (rmdir remove so o link, nao o alvo — medido). */
export function removerJunction(p) {
  const r = cmd(["rmdir", p]);
  return { ok: r.status === 0 && !existsSync(p), status: r.status };
}

/**
 * DECISAO DE SEGURANCA (F1/G1/H1 — 2.ª e 3.ª rondas). Isolada e pura para poder ser testada exaustivamente.
 * Diz se e' permitido cair no `rm -rf` depois de o `git worktree remove` ter falhado.
 *
 * Regra (saida de muitas medicoes — ver _logs/UTAC106x.3-a13.md):
 *   • RECUSA EXPLICITA do git (proteccao deliberada) => NUNCA. Sao elas:
 *     «contains modified or untracked files, use --force» (sujo) ·
 *     «cannot remove a locked working tree» / «is locked» (locked) ·
 *     «validation failed, cannot remove working tree» (invalido) ·
 *     «working trees containing submodules cannot be moved or removed» (**submodulos** — H1).
 *   • Sem PROVA de que a arvore esta limpa => NUNCA. A prova exige `status --porcelain`
 *     vazio **com `--ignore-submodules=none`** E `submodule status` vazio — porque o
 *     `status` normal MENTE quando ha submódulos com `ignore=all` (medido pelo validador).
 *   • So com a arvore PROVADAMENTE limpa E sem recusa explicita => sim.
 *
 * @param {string} saida  stdout+stderr do `git worktree remove` que falhou
 * @param {boolean} statusLimpo  limpeza PROVADA (ver acima)
 */
export function podeFallback(saida, statusLimpo) {
  const s = saida || "";
  if (/contains modified or untracked files|use --force|is locked|cannot remove a locked|validation failed|submodules cannot be moved or removed/i.test(s)) return false;
  if (!statusLimpo) return false;
  return true;
}

/** Cria o worktree e as junctions. `path` e' resolvido UMA vez (F4: cwd vs RAIZ). */
export function criar(path, sha, { junctions = true } = {}) {
  path = resolve(path);
  if (existsSync(path)) throw new Error(`ja existe: ${path}`);
  const w = git(["worktree", "add", path, sha, "--detach"]);
  if (w.status !== 0) throw new Error(`git worktree add falhou: ${w.stderr || w.stdout}`);
  const criadas = [];
  if (junctions) {
    for (const rel of JUNCTIONS) {
      const alvo = join(RAIZ, rel);
      if (!existsSync(alvo)) continue;             // so liga o que existe no repo
      const link = join(path, rel);
      const r = cmd(["mklink", "/J", link, alvo]);
      if (r.status !== 0) throw new Error(`mklink falhou em ${rel}: ${r.stdout}${r.stderr}`);
      criadas.push(rel);
    }
  }
  return { path, junctions: criadas };
}

/** Remove o worktree pela ordem da A13. Nunca faz delete recursivo com junctions presentes. */
export function remover(path, { log = () => {} } = {}) {
  path = resolve(path);
  if (!existsSync(path)) return { ok: true, nota: "nao existe" };

  // 1) junctions primeiro
  const antes = listarReparse(path);
  log(`reparse points encontrados: ${antes.length}`);
  for (const p of antes) {
    const r = removerJunction(p);
    log(`  rmdir ${p.replace(RAIZ, "<raiz>")} -> ${r.ok ? "OK" : "FALHOU"}`);
  }

  // 2) GUARDA: se restar alguma junction (ou directoria ilegivel), ABORTAR
  const restam = listarReparse(path);
  if (restam.length) {
    return { ok: false, erro: `ABORTADO: ${restam.length} reparse point(s)/directoria(s) ilegivel(is) ainda presentes`, restam };
  }

  // 3) agora (e so agora) o worktree
  const w = git(["worktree", "remove", path]);
  log(`git worktree remove -> exit ${w.status}`);
  if (w.status !== 0) {
    const saida = `${w.stdout || ""}${w.stderr || ""}`;
    // F1/G1/H1: a decisao de cair no `rm -rf` e' uma FUNCAO PURA e testada.
    // A prova de limpeza usa `--ignore-submodules=none` E `submodule status` porque o
    // `status` normal omite submódulos com `ignore=all` (H1, medido pelo validador).
    const st = git(["-C", path, "status", "--porcelain", "--ignore-submodules=none"]);
    const sub = git(["-C", path, "submodule", "status"]);
    const statusLimpo = st.status === 0 && (st.stdout || "").trim() === ""
      && !(sub.status === 0 && (sub.stdout || "").trim() !== "");
    if (!podeFallback(saida, statusLimpo)) {
      return {
        ok: false,
        erro: "o git recusou/falhou remover o worktree e NAO ha prova de que esta limpo — nao e' seguro forcar. NADA foi apagado.",
        saida: saida.trim(),
        statusLimpo,
      };
    }
    log("fallback: rm recursivo (sem reparse points, sem recusa explicita, arvore PROVADAMENTE limpa)");
    rmSync(path, { recursive: true, force: true });
  }
  git(["worktree", "prune"]);
  return { ok: !existsSync(path), nota: "removido" };
}

// ---------------------------------- CLI ----------------------------------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [acao, alvo, arg3] = process.argv.slice(2);
  const mostrar = (o) => console.log(JSON.stringify(o, null, 2));
  try {
    if (acao === "criar") {
      if (!alvo || !arg3) throw new Error("uso: criar <path> <sha> [--no-junctions]");
      mostrar(criar(alvo, arg3, { junctions: !process.argv.includes("--no-junctions") }));
    } else if (acao === "check") {
      if (!alvo) throw new Error("uso: check <path>");
      mostrar({ alvo: resolve(alvo), reparse: listarReparse(resolve(alvo)) });   // N1: resolve como criar/remover
    } else if (acao === "remover") {
      if (!alvo) throw new Error("uso: remover <path>");
      const res = remover(alvo, { log: (m) => console.error(m) });
      mostrar(res);
      if (!res.ok) process.exit(1);      // N3: recusa => exit != 0 (quem lê o codigo de saida nao le sucesso)
    } else {
      console.error("uso: criar|check|remover <path>");
      process.exit(2);
    }
  } catch (e) {
    console.error("ERRO:", e.message);
    process.exit(1);
  }
}

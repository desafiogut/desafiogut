#!/usr/bin/env node
// MC102.1a — SEG5: verificação ad-hoc (correr UMA vez, depois do deploy).
// Uso: node scripts/mc1021a-verificacao-adhoc.mjs [--base <commit-base>]
//
// Verifica: (1) timeline com 5 passos (função real); (2) o mock fora de produção — nenhum ficheiro de produção
// o importa E nenhum chunk SERVIDO em produção contém o mock; (3) fallback sem URL; (4) suíte VERDE (harness
// de 3 estados); (5) escopo do diff contra a lista autorizada. Cada detector tem CONTROLO POSITIVO: é posto à
// prova com uma entrada que TEM de apanhar, antes de o seu «0» valer alguma coisa.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut", "frontend");
const FN = join(FE, "netlify", "functions");
const PROD = "https://silly-stardust-ca71bc.netlify.app";
const BASE = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "905bbf2";

let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? "OK  " : "FALHA"} ${msg}`); if (!cond) falhas++; };

// ── 1. timeline: função real ─────────────────────────────────────────────────────────────────
const lib = await import(pathToFileURL(join(FE, "src", "lib", "rastreio.js")).href);
for (const entrada of [[], [{ codigo: "2", data: "2026-09-22" }], [{ codigo: "A1" }], null]) {
  const t = lib.construirTimeline(entrada);
  ok(t.passos.length === 5, `construirTimeline(${JSON.stringify(entrada)}) → ${t.passos.length} passos`);
}
ok(lib.timelineDoRastreio({ codigo: "AA123456789BR", transportadora: "Correios" }) === null,
  "rastreio sem eventos (produção de hoje) → sem timeline");

// ── 2a. mock: nenhum ficheiro de produção o importa ─────────────────────────────────────────
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
function producao(d, out = []) {
  for (const e of readdirSync(d)) {
    if (e === "node_modules" || e === "_tests" || e === "__tests__" || e === "dist" || e === "android") continue;
    const p = join(d, e);
    if (statSync(p).isDirectory()) producao(p, out);
    else if (/\.(m?js|cjs|jsx|ts|tsx)$/.test(e) && !/\.test\.m?js$/.test(e) && e !== "rastreio-mock.mjs") out.push(p);
  }
  return out;
}
const importaMock = (txt) => /rastreio-mock/.test(semComentarios(txt));
ok(importaMock('import { adaptadorMock } from "./rastreio-mock.mjs";') && !importaMock("// rastreio-mock só em comentário"),
  "CONTROLO POSITIVO: o detector apanha um import e ignora um comentário");
const fontes = [...producao(FN), ...producao(join(FE, "src"))];
ok(fontes.length > 300, `varredura viu ${fontes.length} ficheiros de produção (functions + src)`);
const culpados = fontes.filter((p) => importaMock(readFileSync(p, "utf8"))).map((p) => relative(RAIZ, p));
ok(culpados.length === 0, `ficheiros de produção que referem rastreio-mock: ${culpados.length} ${culpados.join(", ")}`);

// ── 2b. mock: nenhum chunk SERVIDO em produção o contém (BFS a partir do index.html) ────────
const MARCAS_MOCK = ["EVENTOS_MOCK", "adaptadorMock", "Objeto saiu para entrega"];
const MARCA_TIMELINE = "Andamento da entrega";
async function texto(url) { const r = await fetch(url, { headers: { "cache-control": "no-cache" } }); return { status: r.status, tipo: r.headers.get("content-type") || "", corpo: await r.text() }; }
const vistos = new Set(); const fila = [];
const idx = await texto(`${PROD}/?v=${Date.now()}`);
for (const m of idx.corpo.matchAll(/\/assets\/[A-Za-z0-9_.-]+\.js/g)) fila.push(m[0]);
let comTimeline = 0, comMock = 0, jsLidos = 0;
while (fila.length) {
  const p = fila.shift(); if (vistos.has(p)) continue; vistos.add(p);
  const r = await texto(`${PROD}${p}`);
  if (!/javascript/.test(r.tipo)) continue; // o SPA fallback devolve HTML com 200: não conta como chunk
  jsLidos++;
  if (r.corpo.includes(MARCA_TIMELINE)) comTimeline++;
  if (MARCAS_MOCK.some((m) => r.corpo.includes(m))) comMock++;
  for (const m of r.corpo.matchAll(/(?:\/assets\/|\.\/)([A-Za-z0-9_.-]+\.js)/g)) fila.push(`/assets/${m[1]}`);
}
ok(jsLidos > 20, `produção: ${jsLidos} chunks JS lidos por BFS`);
ok(comTimeline >= 1, `CONTROLO POSITIVO: a timeline («${MARCA_TIMELINE}») está em ${comTimeline} chunk(s) servido(s) — o deploy tem este MC`);
ok(comMock === 0, `chunks servidos com marcas do mock: ${comMock}`);

// ── 3. fallback ──────────────────────────────────────────────────────────────────────────────
const back = await import(pathToFileURL(join(FN, "_lib", "rastreio.mjs")).href);
const fb = await back.consultarRastreio("AA123456789BR", "Correios");
ok(fb.ok === false && fb.code === "adaptador_indisponivel" && fb.fallback?.codigo === "AA123456789BR",
  `consultarRastreio sem adaptador → ${JSON.stringify(fb)}`);
ok(!/https?:|www\./i.test(JSON.stringify(fb)), "o fallback não traz URL");
ok(back.ADAPTADOR_REAL === null, "ADAPTADOR_REAL continua null (o real é do MC102.1b)");

// ── 4. suíte ─────────────────────────────────────────────────────────────────────────────────
const s = spawnSync("node", [join(RAIZ, "scripts", "mc966-suite-harness.mjs"), "ambos"], { encoding: "utf8", maxBuffer: 1 << 26 });
const saida = `${s.stdout}${s.stderr}`.trim();
console.log(saida.split("\n").map((l) => `      ${l}`).join("\n"));
ok(s.status === 0 && /VEREDITO: VERDE/.test(saida), "suíte (harness de 3 estados) VERDE");

// ── 5. escopo ────────────────────────────────────────────────────────────────────────────────
const PERMITIDOS = [
  /^desafio-gut\/frontend\/src\/components\/meus-ativos\/TimelineRastreio\.jsx$/,
  /^desafio-gut\/frontend\/src\/components\/meus-ativos\/MeusPedidos\.jsx$/,
  /^desafio-gut\/frontend\/src\/components\/meus-ativos\/__tests__\/[^/]+\.(mjs|jsx)$/,
  /^desafio-gut\/frontend\/src\/lib\/rastreio(\.test\.mjs|\.js)$/,
  /^desafio-gut\/frontend\/src\/lib\/pedidos(\.test\.mjs|\.js)$/,
  /^desafio-gut\/frontend\/netlify\/functions\/_lib\/rastreio(-mock)?\.mjs$/,
  /^desafio-gut\/frontend\/netlify\/functions\/_tests\/[^/]+\.test\.mjs$/,
  /^_logs\/MC102\.1a[_-][^/]+\.md$/,
  /^CLAUDE\.md$/,
  /^scripts\/mc1021a-[^/]+\.mjs$/,
];
const permitido = (f) => PERMITIDOS.some((re) => re.test(f));
ok(!permitido("desafio-gut/frontend/netlify/functions/_lib/pedidos.mjs") && !permitido("desafio-gut/frontend/netlify/functions/pedidos.mjs")
  && !permitido("desafio-gut/frontend/package.json") && permitido("desafio-gut/frontend/src/lib/rastreio.js"),
  "CONTROLO POSITIVO: a lista recusa _lib/pedidos.mjs, pedidos.mjs e package.json, e aceita rastreio.js");
const diff = spawnSync("git", ["-C", RAIZ, "diff", "--name-only", `${BASE}..HEAD`], { encoding: "utf8" }).stdout.trim().split("\n").filter(Boolean);
ok(diff.length > 0, `diff ${BASE}..HEAD: ${diff.length} ficheiro(s)`);
const fora = diff.filter((f) => !permitido(f));
ok(fora.length === 0, `ficheiros fora do escopo: ${fora.length} ${fora.join(", ")}`);

console.log(falhas ? `\nVEREDITO SEG5: VERMELHO (${falhas} falha(s))` : "\nVEREDITO SEG5: VERDE");
process.exit(falhas ? 1 : 0);

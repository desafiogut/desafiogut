#!/usr/bin/env node
// MC104.1 SEG3 — verificação ad-hoc (correr UMA vez). Produção + árvore local. Só leitura.
// Uso: node scripts/mc1041-verificacao-adhoc.mjs [--adulterar]   (controlo positivo: cada verificação TEM de acusar)
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://silly-stardust-ca71bc.netlify.app";
const ADULTERAR = process.argv.includes("--adulterar");
const NOVAS = ["isProgramadaSenhasAtiva", "isTorneioVisivel", "isSenhaBonusAtiva", "isCampanhaIndicacaoAtiva", "limitePassesIndicacao"];
const DEF = { isProgramadaSenhasAtiva: true, isTorneioVisivel: true, isSenhaBonusAtiva: true, isCampanhaIndicacaoAtiva: false, limitePassesIndicacao: 5 };

let falhas = 0;
const ok = (c, msg) => { console.log(`${c ? "OK  " : "FALHA"} ${msg}`); if (!c) falhas++; };

// V1 — as 5 chaves e os defaults no hook (árvore = commit publicado)
{
  let src = readFileSync(join(RAIZ, "desafio-gut/frontend/src/hooks/useRecursosApp.js"), "utf8");
  if (ADULTERAR) src = src.replace("limitePassesIndicacao:    5", "limitePassesIndicacao:    6");
  const m = src.match(/export const DEFAULT_FLAGS_TRANSICAO = \{([\s\S]*?)\};/);
  const lido = m ? Object.fromEntries([...m[1].matchAll(/(\w+):\s*(true|false|\d+)/g)].map(([, k, v]) => [k, v === "true" ? true : v === "false" ? false : Number(v)])) : {};
  ok(JSON.stringify(lido) === JSON.stringify(DEF), `V1 hook: 5 chaves com os defaults (${JSON.stringify(lido)})`);
}

// V2 — o bundle PUBLICADO contém o hook novo (as 5 chaves + a regra estrita)
{
  const html = await (await fetch(`${BASE}/?cb=${Date.now()}`)).text();
  const fila = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((x) => x[1]);
  const vistos = new Set(); let achou = false;
  while (fila.length && vistos.size < 250 && !achou) {
    const s = fila.shift(); if (vistos.has(s)) continue; vistos.add(s);
    const js = await (await fetch(BASE + s)).text();
    if (NOVAS.every((k) => js.includes(k)) && js.includes("isSafeInteger") && js.includes("config_remota")) achou = true;
    for (const x of js.matchAll(/["'`](\.?\/?(?:assets\/)?[\w.-]+\.js)["'`]/g)) {
      const n = `/assets/${x[1].replace(/^\.?\/?(assets\/)?/, "")}`;
      if (!vistos.has(n)) fila.push(n);
    }
  }
  if (ADULTERAR) achou = false;
  ok(achou, `V2 bundle publicado tem o hook com as 5 chaves e isSafeInteger (${vistos.size} chunks lidos)`);
}

// V3 — /recursos-app em produção: antigas iguais ao antes do MC103, novas no default (nenhuma ligada)
{
  const ANTES = { ios: [false, false], android: [false, false], pwa: [true, false] };
  for (const p of ["ios", "android", "pwa"]) {
    const r = await fetch(`${BASE}/.netlify/functions/recursos-app?plataforma=${p}&cb=${Date.now()}`);
    let b = await r.json();
    if (ADULTERAR && p === "pwa") b = { ...b, isTorneioVisivel: false };
    ok((r.headers.get("content-type") || "").includes("application/json"), `V3 ${p}: JSON`);
    ok(b.isLeilaoAtivo === ANTES[p][0] && b.isPagamentoNativoAtivo === ANTES[p][1] && NOVAS.every((k) => b[k] === DEF[k]), `V3 ${p}: antigas = antes · novas no default`);
  }
}

// V4 — A/B pareado local contra o commit anterior ao MC104.1 (0 diferenças nas chaves antigas)
{
  const r = spawnSync("node", [join(RAIZ, "scripts/mc1041-ab-recursos.mjs"), "526e991"], { cwd: RAIZ, encoding: "utf8" });
  const m = r.stdout.match(/diferenças nas chaves antigas: (\d+)/);
  const dif = ADULTERAR ? 1 : (m ? Number(m[1]) : NaN);
  ok(dif === 0, `V4 A/B pareado vs 526e991: ${m ? m[0] : "NÃO MEDIU"}`);
}

console.log(`\n${ADULTERAR ? "CONTROLO POSITIVO" : "VERIFICAÇÃO"}: ${falhas} falha(s)`);
process.exit(ADULTERAR ? (falhas >= 4 ? 0 : 1) : (falhas ? 1 : 0));

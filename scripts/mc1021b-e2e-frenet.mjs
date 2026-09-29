#!/usr/bin/env node
// MC102.1b — SEG4 (Frente D): E2E contra a Frenet REAL e o webhook em PRODUÇÃO. Correr à mão, UMA vez.
// Uso: node scripts/mc1021b-e2e-frenet.mjs
//
// ⛔ O FRENET_TOKEN é lido para a MEMÓRIA deste processo (netlify env:get, saída capturada) e NUNCA é impresso:
// só saem contagens e booleanos. Serve para (1) chamar a Frenet real e (2) provar que o valor não está em nenhum
// ficheiro versionado nem em nenhum chunk servido. Cada detector tem CONTROLO POSITIVO.
// Não cria pedidos em produção (não se inventam dados): o fluxo webhook → pedido é provado pelos testes com o
// handler e a lib reais; aqui prova-se o que só a produção pode provar.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FN = join(RAIZ, "desafio-gut", "frontend", "netlify", "functions");
const PROD = "https://silly-stardust-ca71bc.netlify.app";
let falhas = 0;
const ok = (c, m) => { console.log(`${c ? "OK  " : "FALHA"} ${m}`); if (!c) falhas++; };
const sh = (cmd) => spawnSync(cmd, { encoding: "utf8", shell: true, cwd: RAIZ, maxBuffer: 1 << 26 });

const TOKEN = (sh("netlify env:get FRENET_TOKEN --context production").stdout || "").trim().split(/\r?\n/).pop();
ok(/^[\w-]{20,}$/.test(TOKEN), `FRENET_TOKEN lido para memória (${TOKEN.length} caracteres; valor não impresso)`);
// Só a PRESENÇA deste segredo (validador: o `env:list` carregava todos os segredos de produção para memória).
// ⚠️ Medido: para uma variável AUSENTE o CLI escreve «No value set in the … context …» com exit 0 — um teste de
// «saída não vazia» dava DEFINIDO falso.
const saidaWh = (sh("netlify env:get FRENET_WEBHOOK_TOKEN --context production").stdout || "").trim().split(/\r?\n/).pop();
const webhookConfigurado = saidaWh.length > 0 && !/^No value set/i.test(saidaWh);
console.log(`      FRENET_WEBHOOK_TOKEN em produção: ${webhookConfigurado ? "DEFINIDO" : "AUSENTE"}`);

// ── 1. Adaptador real contra a Frenet VIVA ──────────────────────────────────────────────────
const { consultarRastreio } = await import(pathToFileURL(join(FN, "_lib", "rastreio.mjs")).href);
const { criarAdaptadorFrenet } = await import(pathToFileURL(join(FN, "_lib", "rastreio-frenet.mjs")).href);
const { timelineDoRastreio } = await import(pathToFileURL(join(RAIZ, "desafio-gut", "frontend", "src", "lib", "rastreio.js")).href);
let chamadasRede = 0;
const fetchContado = (...a) => { chamadasRede++; return fetch(...a); };
const real = criarAdaptadorFrenet({ token: () => TOKEN, fetchImpl: fetchContado });
const r1 = await consultarRastreio("AA123456789BR", "Correios", { adaptador: real });
ok(r1.ok === true && Array.isArray(r1.eventos) && r1.eventos.length === 0,
  `Frenet real, código sem eventos → ${JSON.stringify(r1)} (ok com lista vazia, como no PoC)`);
ok(timelineDoRastreio({ codigo: "AA123456789BR", eventos: r1.eventos }) === null, "sem eventos → sem timeline: o cartão mostra o código em bruto (P9)");
const r2 = await consultarRastreio("AA123456789BR", "Correios", { adaptador: criarAdaptadorFrenet({ token: () => "00000000-0000-0000-0000-000000000000" }) });
ok(r2.ok === false && r2.fallback?.codigo === "AA123456789BR" && !/https?:/.test(JSON.stringify(r2)),
  `Frenet recusa (token errado, erro vem com 200) → fallback só com o código: ${JSON.stringify(r2)}`);
const antes = chamadasRede;
const r3 = await consultarRastreio("JD000000000", "Jadlog", { adaptador: real });
ok(r3.ok === false && chamadasRede === antes, "transportadora não-Correios → fallback SEM chamar a Frenet");
ok(!JSON.stringify([r1, r2, r3]).includes(TOKEN), "o token não aparece em nenhum resultado");

// ── 2. Webhook em PRODUÇÃO ─────────────────────────────────────────────────────────────────
async function pedir(caminho, init = {}) {
  const r = await fetch(`${PROD}${caminho}`, { redirect: "manual", ...init });
  return { status: r.status, tipo: r.headers.get("content-type") || "", corpo: await r.text() };
}
const neg = await pedir("/.netlify/functions/nao-existe-mc1021b");
ok(/text\/html/.test(neg.tipo), `CONTROLO NEGATIVO: function inexistente → ${neg.status} ${neg.tipo} (SPA fallback)`);
const get = await pedir("/.netlify/functions/webhook-frenet");
ok(get.status === 405 && /application\/json/.test(get.tipo), `webhook-frenet GET → ${get.status} ${get.tipo} (a function existe em produção)`);
const corpo = JSON.stringify({ TrackingNumber: "ZZ000000000BR", TrackingEvents: [{ EventDateTime: "29/09/2026 10:00", EventType: "0" }] });
const semHeader = await pedir("/.netlify/functions/webhook-frenet", { method: "POST", headers: { "content-type": "application/json" }, body: corpo });
const esperado = webhookConfigurado ? 401 : 503;
ok(semHeader.status === esperado && /application\/json/.test(semHeader.tipo),
  `webhook-frenet POST sem token → ${semHeader.status} (esperado ${esperado}: ${webhookConfigurado ? "token inválido" : "fail-closed, segredo por configurar"}) · ${semHeader.corpo.slice(0, 120)}`);
const tokErrado = await pedir("/.netlify/functions/webhook-frenet", { method: "POST", headers: { "content-type": "application/json", "x-frenet-token": "errado" }, body: corpo });
ok(tokErrado.status === esperado, `webhook-frenet POST com token errado → ${tokErrado.status} (esperado ${esperado})`);
// (O FRENET_TOKEN real deixou de ser enviado ao webhook — validador: mínimo manuseio. Os segredos são
// separados por construção: o webhook só compara com FRENET_WEBHOOK_TOKEN; o «token errado» acima cobre-o.)
const ped = await pedir("/.netlify/functions/pedidos");
ok(ped.status === 401 && /application\/json/.test(ped.tipo), `/pedidos continua 401 JSON (não-regressão): ${ped.status}`);

// ── 3. O valor do token não está em código nem no bundle ────────────────────────────────────
const contem = (txt) => txt.includes(TOKEN);
ok(contem(`x${TOKEN}y`) && !contem("sem nada"), "CONTROLO POSITIVO: o detector vê o token plantado e não vê ausência");
const versionados = sh("git ls-files -z").stdout.split("\0").filter(Boolean);
let lidos = 0; const comToken = [];
for (const f of versionados) {
  let txt; try { txt = readFileSync(join(RAIZ, f), "latin1"); } catch { continue; }
  lidos++; if (contem(txt)) comToken.push(f);
}
ok(lidos > 1000, `ficheiros versionados lidos: ${lidos}`);
ok(comToken.length === 0, `ficheiros versionados que contêm o valor do FRENET_TOKEN: ${comToken.length} ${comToken.join(", ")}`);
const idx = await pedir(`/?v=${Date.now()}`);
const fila = [...idx.corpo.matchAll(/\/assets\/[A-Za-z0-9_.-]+\.js/g)].map((m) => m[0]);
const vistos = new Set(); let js = 0, chunksComToken = 0;
while (fila.length) {
  const p = fila.shift(); if (vistos.has(p)) continue; vistos.add(p);
  const r = await pedir(p); if (!/javascript/.test(r.tipo)) continue;
  js++; if (contem(r.corpo)) chunksComToken++;
  for (const m of r.corpo.matchAll(/(?:\/assets\/|\.\/)([A-Za-z0-9_.-]+\.js)/g)) fila.push(`/assets/${m[1]}`);
}
ok(js > 20, `chunks JS de produção lidos por BFS: ${js}`);
ok(chunksComToken === 0, `chunks servidos que contêm o valor do FRENET_TOKEN: ${chunksComToken}`);

console.log(falhas ? `\nVEREDITO SEG4: VERMELHO (${falhas})` : "\nVEREDITO SEG4: VERDE");
process.exit(falhas ? 1 : 0);

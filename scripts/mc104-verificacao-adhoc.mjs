#!/usr/bin/env node
// MC104 SEG4 — verificação ad-hoc em PRODUÇÃO (correr UMA vez). Só leitura / pedidos sem credencial.
// Uso: node scripts/mc104-verificacao-adhoc.mjs [--adulterar]
//   --adulterar = controlo positivo: cada verificação recebe um input adulterado e TEM de o detectar.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://silly-stardust-ca71bc.netlify.app";
const FN = `${BASE}/.netlify/functions`;
const ADULTERAR = process.argv.includes("--adulterar");
const QUALQUER = "0x1111111111111111111111111111111111111111"; // endereço sintético (não é de ninguém)
const RELATORIOS = ["_logs/MC104_SEG-1_MEDICAO.md", "_logs/MC104_SEG0.md", "_logs/MC104_SEG1.md", "_logs/MC104_SEG2_VALIDADOR.md"];

let falhas = 0;
const ok = (c, msg) => { console.log(`${c ? "OK  " : "FALHA"} ${msg}`); if (!c) falhas++; };
async function pedir(path, init) {
  const r = await fetch(`${FN}/${path}`, init);
  return { status: r.status, ct: r.headers.get("content-type") || "", corpo: await r.text() };
}

// V1 — o endpoint de consentimento EXISTE (JSON, não o index.html do SPA) e recusa sem sessão
{
  let r = await pedir(`consentimento?endereco=${QUALQUER}`);
  if (ADULTERAR) r = { status: 200, ct: "text/html", corpo: "<!doctype html>" };
  ok(r.ct.includes("application/json"), `V1 /consentimento existe (content-type ${r.ct})`);
  ok(r.status === 401, `V1 GET sem token → 401 (${r.status})`);
  let p = await pedir("consentimento", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ endereco: QUALQUER, versao: "2.0", aceitos: { lido: true, maiores: true, termos: true, privacidade: true }, aceiteDeclaradoEm: "2026-09-29T10:00:00.000Z" }) });
  if (ADULTERAR) p = { ...p, status: 201 };
  ok(p.status === 401, `V1 POST sem token → 401, nada gravado (${p.status})`);
}

// V2 — a exportação existe e recusa sem sessão (não há como pedir dados de terceiros sem token)
{
  let r = await pedir("exportar-dados", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endereco: QUALQUER }) });
  if (ADULTERAR) r = { ...r, status: 200 };
  ok(r.ct.includes("application/json") && r.status === 401, `V2 exportar-dados sem token → 401 JSON (${r.status})`);
}

// V3 — o código publicado inclui os tipos (fonte do commit publicado: os 5 tipos + Supabase)
{
  let src = readFileSync(join(RAIZ, "desafio-gut/frontend/netlify/functions/exportar-dados.mjs"), "utf8");
  if (ADULTERAR) src = src.replace("obj?.comprador", "obj?.xpto");
  const exige = ["obj?.comprador", "dados.lances_relampago", "dados.supabase", '["pontuacoes", "endereco"]', '["rankings_ciclo", "endereco"]', '["lances", "endereco"]', "dados.consent_log"];
  const faltam = exige.filter((e) => !src.includes(e));
  ok(faltam.length === 0, `V3 exportação com pedidos/lances/pontos/consentimento/Supabase (faltam: ${faltam.join(", ") || "nenhum"})`);
}

// V4 — o gate continua a responder (a SPA serve HTML) e o bundle publicado contém o envio do aceite
{
  const html = await (await fetch(`${BASE}/?cb=${Date.now()}`)).text();
  ok(/<div id="root"/.test(html), "V4 SPA publicada responde");
  const scripts = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
  const vistos = new Set(); const fila = [...scripts]; let achou = false;
  while (fila.length && vistos.size < 250 && !achou) {
    const s = fila.shift(); if (vistos.has(s)) continue; vistos.add(s);
    const js = await (await fetch(BASE + s)).text();
    if (js.includes("titularLocal") && js.includes("consentimento")) achou = true;
    for (const m of js.matchAll(/["'`](\.?\/?(?:assets\/)?[\w.-]+\.js)["'`]/g)) {
      const n = m[1].startsWith("/assets/") ? m[1] : `/assets/${m[1].replace(/^\.?\/?(assets\/)?/, "")}`;
      if (!vistos.has(n)) fila.push(n);
    }
  }
  if (ADULTERAR) achou = false;
  ok(achou, `V4 bundle publicado envia o aceite (titularLocal) — ${vistos.size} chunks lidos`);
}

// V5 — relatórios sem dados pessoais
for (const f of RELATORIOS) {
  let t = readFileSync(join(RAIZ, f), "utf8");
  if (ADULTERAR && f.endsWith("SEG1.md")) t += "\n0x2222222222222222222222222222222222222222 fulano@exemplo.com\n";
  const ends = t.match(/0x[0-9a-fA-F]{40}/g) || [];
  const mails = t.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
  ok(ends.length === 0 && mails.length === 0, `V5 ${f}: sem endereços (${ends.length}) nem e-mails (${mails.length})`);
}

console.log(`\n${ADULTERAR ? "CONTROLO POSITIVO" : "VERIFICAÇÃO"}: ${falhas} falha(s)`);
process.exit(ADULTERAR ? (falhas >= 7 ? 0 : 1) : (falhas ? 1 : 0));

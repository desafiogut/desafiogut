#!/usr/bin/env node
// MC103 SEG4 — verificação ad-hoc (correr UMA vez). Só leitura.
// Uso: node scripts/mc103-verificacao-adhoc.mjs [--adulterar]
//   --adulterar = controlo positivo: injecta um defeito em cópias em memória e exige que cada
//                 verificação o DETECTE (se alguma não detectar, o instrumento é cego).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FN = join(RAIZ, "desafio-gut", "frontend", "netlify", "functions");
const PROD = "https://silly-stardust-ca71bc.netlify.app/.netlify/functions/recursos-app";
const ADULTERAR = process.argv.includes("--adulterar");

const ESPERADO_NOVAS = { isProgramadaSenhasAtiva: true, isTorneioVisivel: true, isSenhaBonusAtiva: true,
  isCampanhaIndicacaoAtiva: false, limitePassesIndicacao: 5 };
// Output de produção ANTES do MC103 (curl de 2026-09-30, SEG0 0.1).
const ANTES = { ios: [false, false], android: [false, false], pwa: [true, false] };
const RELATORIOS = ["_logs/MC103_SEG-1_MEDICAO.md", "_logs/MC103_SEG0.md", "_logs/MC103_SEG1.md", "_logs/MC103_SEG2_VALIDADOR.md"];
const CONTRATO = "0x0052477a8ca81bcaf4a60e21e635f9e00a5d16cd";

let falhas = 0;
const ok = (c, msg) => { console.log(`${c ? "OK  " : "FALHA"} ${msg}`); if (!c) falhas++; };

// V1 — as 5 flags existem com os defaults (código publicado = HEAD)
const mod = await import(pathToFileURL(join(FN, "_lib", "recursos-app-config.mjs")).href);
const defaults = ADULTERAR ? { ...mod.DEFAULT_FLAGS_TRANSICAO, isCampanhaIndicacaoAtiva: true } : mod.DEFAULT_FLAGS_TRANSICAO;
ok(JSON.stringify(defaults) === JSON.stringify(ESPERADO_NOVAS), "V1 defaults das 5 flags = enunciado");

// V2 + V3 — produção: chaves antigas iguais ao ANTES (A/B) e novas no default (= nenhuma ligada)
for (const p of ["ios", "android", "pwa"]) {
  const r = await fetch(`${PROD}?plataforma=${p}&cb=${Date.now()}`);
  const ct = r.headers.get("content-type") || "";
  let b = await r.json();
  if (ADULTERAR && p === "pwa") b = { ...b, isLeilaoAtivo: false, limitePassesIndicacao: 6 };
  ok(r.status === 200 && ct.includes("application/json"), `V2 ${p}: 200 + JSON (${r.status}, ${ct})`);
  ok(b.isLeilaoAtivo === ANTES[p][0] && b.isPagamentoNativoAtivo === ANTES[p][1], `V2 ${p}: A/B chaves antigas iguais ao antes`);
  ok(Object.entries(ESPERADO_NOVAS).every(([k, v]) => b[k] === v), `V3 ${p}: 5 flags novas no default (nenhuma ligada)`);
}

// V4 — nenhum dado pessoal nos relatórios (endereços de 40 hex ≠ contrato; e-mails)
for (const f of RELATORIOS) {
  let t = readFileSync(join(RAIZ, f), "utf8");
  if (ADULTERAR && f.endsWith("SEG1.md")) t += "\nfuga 0x1111111111111111111111111111111111111111 e fulano@exemplo.com\n";
  const ends = (t.match(/0x[0-9a-fA-F]{40}/g) || []).filter((e) => e.toLowerCase() !== CONTRATO);
  const mails = t.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
  ok(ends.length === 0 && mails.length === 0, `V4 ${f}: sem endereços (${ends.length}) nem e-mails (${mails.length})`);
}

// V5 — queries registadas: nenhuma palavra-chave de escrita no bloco de queries do SEG1
{
  let t = readFileSync(join(RAIZ, "_logs/MC103_SEG1.md"), "utf8");
  if (ADULTERAR) t = t.replace("## Queries executadas", "## Queries executadas\n8. `UPDATE saldo_rs SET payload = '{}'`");
  const bloco = t.split("## Queries executadas")[1] || "";
  const esc = (bloco.split("\n").filter((l) => /^\d+\./.test(l)).join("\n").match(/\b(INSERT|UPDATE|DELETE|UPSERT|ALTER|DROP|TRUNCATE)\b/gi) || []);
  ok(bloco.length > 0, "V5 bloco de queries presente (não mede o vazio)");
  ok(esc.length === 0, `V5 queries só de leitura (palavras de escrita: ${esc.length})`);
}

console.log(`\n${ADULTERAR ? "CONTROLO POSITIVO" : "VERIFICAÇÃO"}: ${falhas} falha(s)`);
process.exit(ADULTERAR ? (falhas > 0 ? 0 : 1) : (falhas ? 1 : 0));

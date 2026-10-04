// UTAC106d-v2 — prova de mutação (GATE 7/8). Repositório (`_lib/passe-pontos.mjs`) e endpoint
// (`comprar-passe-pontos.mjs`). Cada mutante: alvo ÚNICO exigido, ficheiro confirmado a MUDAR (md5),
// testes em TAP, RED exigido, bytes repostos e md5 confirmado.
//
// ⚠️ Este ficheiro é o artefacto que torna a prova de mutação REPRODUZÍVEL do repo (fecha o achado ℹ️B
//    do validador adversarial: a prova do v2 vivia só no relatório do executor). O Via A tem o seu
//    análogo (`scripts/mc105a-prova-mutacao.mjs`) — este NÃO o substitui nem o toca.
//
// Uso: node scripts/mc106dv2-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FN = join(RAIZ, "desafio-gut/frontend/netlify/functions");
const LIB = join(FN, "_lib/passe-pontos.mjs");
const EP = join(FN, "comprar-passe-pontos.mjs");
const ARGS = ["--experimental-test-module-mocks", "--test", "--test-reporter=tap", "_tests/passe-pontos.test.mjs"];

const MUTANTES = [
  // Constantes da regra (não podem ser números mágicos).
  ["M1 PONTOS_POR_PASSE 1→2", LIB, "export const PONTOS_POR_PASSE = 1;", "export const PONTOS_POR_PASSE = 2;"],
  ["M2 PONTOS_POR_CARTAO 50→100", LIB, "export const PONTOS_POR_CARTAO = 50;", "export const PONTOS_POR_CARTAO = 100;"],
  ["M3 VALOR_PASSE_RS 2.00→5.00", LIB, "export const VALOR_PASSE_RS = 2.00;", "export const VALOR_PASSE_RS = 5.00;"],
  // Invariante de negócio: os pontos nunca ficam negativos.
  ["M4 debitar sem guarda de negativo", LIB, "if (novoPontos < 0) {", "if (false) {"],
  // Idempotência (as duas camadas).
  ["M5 lib: idempotência por ref removida", LIB, "if (atual && Array.isArray(atual.historico) && atual.historico.some((h) => h?.ref === ref)) {", "if (false) {"],
  ["M6 endpoint: fast-path de idempotência removido", EP, "  if (atual && Array.isArray(atual.historico) && atual.historico.some((h) => h?.ref === idempotencyKey)) {", "  if (false) {"],
  // Concorrência: o CAS (.eq("pontos", base)) — o guarda de lost-update.
  ["M10 lib: CAS removido (lost update)", LIB, '.update(payload).eq("endereco", e).eq("pontos", base).select("endereco"));', '.update(payload).eq("endereco", e).select("endereco"));'],
  // Auto-reembolso.
  ["M7 endpoint: auto-reembolso removido", EP, 'const reembolso = await reembolsarSaldoRs({ endereco, valorCentavos: VALOR_PASSE_CENTAVOS, motivo: "comprar-passe-pontos" });', "const reembolso = { ok: true };"],
  // Validação.
  ["M8 endpoint: idempotencyKey sem validação", EP, "const IDEMPOTENCY_RE = /^[A-Za-z0-9._:-]{8,200}$/;", "const IDEMPOTENCY_RE = /^[\\s\\S]{0,200}$/;"],
  ["M9 endpoint: gate de Bearer removido", EP, 'if (t.erro) return jsonError(401, t.erro, "Authorization: Bearer *** válido obrigatório");', "if (false) return jsonError(401, t.erro, \"x\");"],
];

const md5 = (b) => createHash("md5").update(b).digest("hex");
const originais = new Map([LIB, EP].map((f) => [f, readFileSync(f)]));
const correr = () => {
  const r = spawnSync(process.execPath, ARGS, { cwd: FN, encoding: "utf8", timeout: 300000 });
  const n = (k) => Number((r.stdout.match(new RegExp(`^# ${k} (\\d+)`, "m")) || [])[1]);
  return { pass: n("pass"), fail: n("fail"), tests: n("tests") };
};

let falhas = 0;
const base = correr();
if (!(base.tests > 0 && base.fail === 0)) { console.log("CONTROLO não VERDE:", base); process.exit(2); }
console.log(`controlo: ${base.pass}/${base.tests} VERDE`);
try {
  for (const [nome, f, de, para] of MUTANTES) {
    const orig = originais.get(f); const txt = orig.toString("utf8");
    const alvo = txt.includes("\r\n") ? de.replace(/\n/g, "\r\n") : de;
    const n = txt.split(alvo).length - 1;
    if (n !== 1) { console.log(`${nome}: ALVO ${n}× — mutante inválido`); falhas++; continue; }
    writeFileSync(f, txt.replace(alvo, txt.includes("\r\n") ? para.replace(/\n/g, "\r\n") : para));
    if (md5(readFileSync(f)) === md5(orig)) { console.log(`${nome}: NÃO ENTROU`); falhas++; continue; }
    const r = correr(); const morto = r.tests > 0 && r.fail > 0;
    console.log(`${nome}: ${morto ? "PROVADO (RED)" : "SOBREVIVEU"} — ${r.pass}/${r.tests}, fail ${r.fail}`);
    if (!morto) falhas++;
    writeFileSync(f, orig);
  }
} finally {
  for (const [f, orig] of originais) {
    writeFileSync(f, orig); const ok = md5(readFileSync(f)) === md5(orig); if (!ok) falhas++;
    console.log(`restauração ${f.split(/[\\/]/).pop()}: md5 ${ok ? "IDÊNTICO" : "DIFERENTE!"}`);
  }
}
console.log(falhas === 0 ? `VEREDITO: ${MUTANTES.length}/${MUTANTES.length} PROVADOS` : `VEREDITO: ${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);

// UTAC106f — prova de mutação (GATE 7/8) do ecrã Ofertas Programadas + palpite.
// Cada mutante: alvo ÚNICO exigido, ficheiro confirmado a MUDAR (md5), testes em TAP, RED exigido,
// bytes repostos e md5 confirmado. Versionado para a prova ser reprodutível do repo.
// Uso: node scripts/mc106f-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut/frontend");
const FN = join(FE, "netlify/functions");
const LIB = join(FN, "_lib/passe-pontos.mjs");
const PAGINA = join(FE, "src/pages/OfertasProgramadas.jsx");

const ALVO_FE = ["--test", "--test-concurrency=1", "--test-reporter=tap", "src/pages/__tests__/utac106f-ofertas.test.mjs"];
const ALVO_BE = ["--test", "--experimental-test-module-mocks", "--test-reporter=tap", "_tests/palpite.test.mjs"];

const MUTANTES = [
  ["MP1 bónus do palpite 2 → 3", LIB, "export const PONTOS_POR_PALPITE_CERTO = 2;", "export const PONTOS_POR_PALPITE_CERTO = 3;", FN, ALVO_BE],
  ["MP2 sem idempotência no registo", LIB, 'if (error.code === UNIQUE_VIOLATION) {', 'if (false) {', FN, ALVO_BE],
  ["MP3 apuração não escolhe o mais próximo", LIB, "if (Math.abs(p.valor - valorReal) < Math.abs(vencedor.valor - valorReal)) vencedor = p;", "if (false) vencedor = p;", FN, ALVO_BE],
  ["MP4 vencedor marcado como «perdeu»", LIB, '.update({ apurado: true, resultado: "mais_proximo" })', '.update({ apurado: true, resultado: "perdeu" })', FN, ALVO_BE],
  ["MP5 «Resgatar» visível a <50", PAGINA, "{podeResgatarCartao ? (", "{false ? (", FE, ALVO_FE],
  ["MP6 cartão passa a DEPENDER do palpite", PAGINA, "{podeResgatarCartao ? (", "{podeResgatarCartao && !palpite ? (", FE, ALVO_FE],
];

const md5 = (b) => createHash("md5").update(b).digest("hex");
const originais = new Map();
for (const f of [LIB, PAGINA]) originais.set(f, readFileSync(f));
const correr = (cwd, args) => {
  const r = spawnSync(process.execPath, args, { cwd, encoding: "utf8", timeout: 900000, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const n = (k) => Number((out.match(new RegExp(`^# ${k} (\\d+)`, "m")) || [])[1]);
  return { pass: n("pass"), fail: n("fail"), tests: n("tests") };
};

let falhas = 0;
for (const [nome, cwd, args] of [["frontend", FE, ALVO_FE], ["backend", FN, ALVO_BE]]) {
  const b = correr(cwd, args);
  console.log(`controlo ${nome}: ${b.pass}/${b.tests} (fail ${b.fail})`);
  if (!(b.tests > 0 && b.fail === 0)) { console.log("CONTROLO NÃO VERDE — abortar"); process.exit(2); }
}
try {
  for (const [nome, f, de, para, cwd, args] of MUTANTES) {
    const orig = originais.get(f); const txt = orig.toString("utf8");
    const crlf = txt.includes("\r\n");
    const a = crlf ? de.replace(/\n/g, "\r\n") : de;
    const b = crlf ? para.replace(/\n/g, "\r\n") : para;
    const n = txt.split(a).length - 1;
    if (n !== 1) { console.log(`${nome}: ALVO ${n}× — inválido`); falhas++; continue; }
    writeFileSync(f, txt.replace(a, () => b));
    if (md5(readFileSync(f)) === md5(orig)) { console.log(`${nome}: NÃO ENTROU`); falhas++; continue; }
    const r = correr(cwd, args); const morto = r.tests > 0 && r.fail > 0;
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

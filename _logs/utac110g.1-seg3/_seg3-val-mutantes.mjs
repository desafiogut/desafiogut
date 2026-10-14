// SEG3 / UTAC110g.1 — MUTANTES PRÓPRIOS DO VALIDADOR (instrumento independente).
// Não reutiliza o script do autor: alvos escolhidos por mim, incluindo o lado FRONTEND
// (a prova do autor só muta backend: nota-tecnica.mjs + resgatar-cartao.mjs).
//
// Uso: node scripts/_seg3-val-mutantes.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut/frontend");
const FN = join(FE, "netlify/functions");

const NOTA = join(FN, "_lib/nota-tecnica.mjs");
const CARTEIRA = join(FE, "src/pages/MinhaCarteira.jsx");
const OFERTAS = join(FE, "src/pages/OfertasProgramadas.jsx");

const FE_TEST = (f) => ["--test", "--test-concurrency=1", `src/pages/__tests__/${f}`];
const BE_TEST = ["--test", "--experimental-test-module-mocks", "--test-reporter=tap", "_tests/utac110g1-nota-tecnica.test.mjs"];

// [nome, ficheiro, de, para, cwd, args, resultado_esperado]
const MUTANTES = [
  // V1 — a decisão R18-110g.1-2 diz que o botão SAI das Ofertas Programadas. Devolvê-lo tem de morrer.
  ["V1 (frontend) o botão de resgate VOLTA às Ofertas Programadas", OFERTAS,
    "{CARTAO_DESCRICAO}</p>",
    '{CARTAO_DESCRICAO}</p>\n            <button type="button" data-acao="resgatar-cartao" aria-label="Resgatar cartão" onClick={() => {}}>🎁 Resgatar cartão</button>',
    FE, FE_TEST("utac106f-ofertas.test.mjs"), "RED"],

  // V2 — fuso do documento: Manaus (UTC-4) → São Paulo (UTC-3). Verifica se a guarda de data
  // distingue mesmo o fuso, ou só «não é UTC».
  ["V2 (backend) a data deixa de ser Manaus/AM e passa a São Paulo (UTC-3)", NOTA,
    'timeZone: "America/Manaus", day: "2-digit", month: "2-digit", year: "numeric",',
    'timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric",',
    FN, BE_TEST, "?"],

  // V3 — CONTROL O: fuso Manaus (UTC-4) → Noronha (UTC-2). Se V3 morrer e V2 não, a guarda
  // pina o OFFSET aos pares que muda a data, não o rótulo do fuso.
  ["V3 (backend) a data passa a Fernando de Noronha (UTC-2)", NOTA,
    'timeZone: "America/Manaus", day: "2-digit", month: "2-digit", year: "numeric",',
    'timeZone: "America/Noronha", day: "2-digit", month: "2-digit", year: "numeric",',
    FN, BE_TEST, "RED"],

  // V4 — o botão tem de ABRIR o balão (item §2.5). Um botão que não faz nada deve morrer.
  ["V4 (frontend) o clique do botão da Carteira torna-se no-op (não abre o balão)", CARTEIRA,
    "onClick={() => setResgateAberto(true)}",
    "onClick={() => { /* SEG3 no-op */ }}",
    FE, FE_TEST("utac106g-resgate.test.mjs"), "RED"],
];

const md5 = (b) => createHash("md5").update(b).digest("hex");
const ALVOS_F = [...new Set(MUTANTES.map((m) => m[1]))];
const originais = new Map(ALVOS_F.map((f) => [f, readFileSync(f)]));

function correr(cwd, args) {
  const r = spawnSync(process.execPath, args, { cwd, encoding: "utf8", timeout: 900000, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const RE = /^(?:#|ℹ) (pass|fail|tests) (\d+)$/gm;
  const todos = out.match(RE) || [];
  const num = (k) => {
    const m = todos.map((l) => l.match(/^(?:#|ℹ) (pass|fail|tests) (\d+)$/)).filter((x) => x[1] === k);
    return m.length ? Number(m[m.length - 1][2]) : 0;
  };
  const pass = num("pass"), fail = num("fail"), tests = num("tests");
  return { pass, fail, tests, out };
}

// CONTROLO: cada alvo, sem mutação, tem de estar VERDE e MEDIDO.
for (const [f, args, cwd] of [
  [OFERTAS, FE_TEST("utac106f-ofertas.test.mjs"), FE],
  [CARTEIRA, FE_TEST("utac106g-resgate.test.mjs"), FE],
  [NOTA, BE_TEST, FN],
]) {
  const r = correr(cwd, args);
  console.log(`controlo ${f.split(/[\\/]/).pop()} ← ${args[args.length - 1]}: ${r.pass}/${r.tests} pass, fail ${r.fail}`);
  if (!(r.tests > 0) || r.fail > 0) { console.log("CONTROLO NÃO VERDE/MEDIDO — abortar"); process.exit(2); }
}

let sobreviventes = 0, provados = 0, invalidos = 0;
try {
  for (const [nome, f, de, para, cwd, args, esperado] of MUTANTES) {
    const orig = originais.get(f);
    const txt = orig.toString("utf8");
    const crlf = txt.includes("\r\n");
    const a = crlf ? de.replace(/\n/g, "\r\n") : de;
    const b = crlf ? para.replace(/\n/g, "\r\n") : para;
    const n = txt.split(a).length - 1;
    if (n !== 1) { console.log(`${nome}: ALVO ${n}× — INVÁLIDO (não se mediu nada)`); invalidos++; continue; }
    const antes = md5(orig);
    writeFileSync(f, txt.replace(a, () => b));
    const depois = md5(readFileSync(f));
    if (depois === antes) { console.log(`${nome}: NÃO ENTROU (md5 igual) — INVÁLIDO`); invalidos++; continue; }
    const r = correr(cwd, args);
    const medido = r.tests > 0;
    const morreu = medido && r.fail > 0;
    console.log(`\n${nome}\n   alvo: ${f.replace(RAIZ + "\\", "")}\n   md5 ${antes.slice(0, 8)} → ${depois.slice(0, 8)} (MUTADO)` +
      `\n   ${medido ? `${r.pass}/${r.tests} pass, fail ${r.fail}` : "NÃO MEDIDO (0 testes) — tratar como suspeito"}` +
      `\n   => ${morreu ? "PROVADO (morreu)" : "SOBREVIVEU"}   [esperado: ${esperado}]`);
    if (morreu) provados++; else sobreviventes++;
    writeFileSync(f, orig);
    const reposto = md5(readFileSync(f)) === antes;
    console.log(`   restauração: md5 ${reposto ? "IDÊNTICO" : "DIFERENTE — ABORTAR"}`);
    if (!reposto) process.exit(3);
  }
} finally {
  for (const [f, orig] of originais) {
    writeFileSync(f, orig);
    console.log(`restauração final ${f.split(/[\\/]/).pop()}: md5 ${md5(readFileSync(f)) === md5(orig) ? "IDÊNTICO" : "DIFERENTE!"}`);
  }
}
console.log(`\nRESUMO SEG3: ${provados} provado(s) · ${sobreviventes} sobrevivente(s) · ${invalidos} inválido(s)`);
process.exit(invalidos ? 1 : 0);

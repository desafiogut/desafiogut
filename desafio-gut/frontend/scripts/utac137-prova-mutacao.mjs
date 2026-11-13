// UTAC137 — prova de mutação (GATE 7 / T1). Cada mutante repõe um texto/regra do v5.1 (ou parte o v6) e tem de pôr
// VERMELHO pelo menos um dos testes indicados. Restauro a partir de CÓPIA em memória (nunca `git checkout`), com md5.
// Uso (cwd = desafio-gut/frontend): node scripts/utac137-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const md5 = (s) => createHash("md5").update(s).digest("hex");
const FE = (t) => ({ cwd: ".", args: ["--test", "--test-concurrency=1", t] });
const BE = (t) => ({ cwd: "netlify/functions", args: ["--test", "--experimental-test-module-mocks", t] });
const T = {
  regras: FE("src/pages/__tests__/utac106h-regras.test.mjs"),
  j5: FE("src/__tests__/utac110j5-pontos-lance.test.mjs"),
  d: FE("src/__tests__/utac110d-front.test.mjs"),
  cit: FE("src/components/__tests__/citacoesRegulamento.test.mjs"),
  voc: FE("src/__tests__/utac110h1-vocabulario.test.mjs"),
  f129: FE("src/__tests__/utac129-front.test.mjs"),
  e: FE("src/__tests__/utac110e-front.test.mjs"),
  mc963: BE("_tests/mc963-guto-regulamento-v4.test.mjs"),
};
const MUTANTES = [
  ["M1 Regras Oficiais voltam a importar o v5", "src/pages/RegrasOficiais.jsx",
    'import REGULAMENTO_MD from "../../../../docs/REGULAMENTO-v6.md?raw";', 'import REGULAMENTO_MD from "../../../../docs/REGULAMENTO-v5.md?raw";', T.regras],
  ["M2 o parser só aceita o formato do v5", "src/pages/RegrasOficiais.jsx",
    "const RE_ARTIGO = /^(Art\\. \\d+(?:º|\\.))( — | )([\\s\\S]*)$/;", "const RE_ARTIGO = /^(Art\\. \\d+º)( — )([\\s\\S]*)$/;", T.regras],
  ["M3 fidelidade por Passe volta a 10 no frontend", "src/lib/pontosLance.js",
    "  fidelidadePorPasse: 1, //", "  fidelidadePorPasse: 10, //", T.j5],
  ["M4 o Passe volta a anunciar +200 pontos de lance", "src/lib/passes.js",
    'beneficio: "1 ponto de fidelidade + 1 ECOQUILDO + GUTO e dados analíticos",\n    sucesso: "Passe Relâmpago',
    'beneficio: "10 pontos de fidelidade + 200 pontos de lance + 1 ECOQUILDO",\n    sucesso: "Passe Relâmpago', T.d],
  ["M5 o gate cita o Art. 6º com texto que o v6 não tem", "src/components/TermosConsentimento.jsx",
    "o Passe não concede pontos de lance.", "o Passe concede 200 pontos de lance.", T.cit],
  ["M6 a versão do aceite volta a 3.3 só no app", "src/components/TermosConsentimento.jsx",
    'export const VERSAO_CONSENTIMENTO = "3.4";', 'export const VERSAO_CONSENTIMENTO = "3.3";', T.voc],
  ["M7 o palpite do Início volta a depender do Passe", "src/pages/Dashboard.jsx",
    "disabled={aPalpitar}", "disabled={aPalpitar || semPasses(inventario, \"passesProgramado\")}", T.f129],
  ["M8 a Carteira volta a dizer «Usável no site oficial»", "src/pages/MinhaCarteira.jsx",
    "1 = {VALOR_ECOQUILDO_TEXTO} · {PROPORCOES.ecoPorConversao} = 1 Passe", "Usável no site oficial", T.e],
  ["M9 o GUTO volta a declarar a versão 5.1", "netlify/functions/_lib/guto-regulamento.mjs",
    'export const REGULAMENTO_VERSAO = "6.0";', 'export const REGULAMENTO_VERSAO = "5.1";', T.mc963],
  ["M10 a âncora do Art. 6º do GUTO deixa de ser literal", "netlify/functions/_lib/guto-perfis.mjs",
    '"6":  "o Passe não concede pontos de lance.', '"6":  "o Passe concede 200 pontos de lance.', T.mc963],
];

let red = 0; const sobre = [];
for (const [nome, f, alvo, mut, t] of MUTANTES) {
  const orig = readFileSync(f, "utf8"); const h0 = md5(orig);
  if (orig.split(alvo).length !== 2) { console.log(`${nome}: ALVO NÃO CASA 1× — PARAR`); process.exit(2); }
  writeFileSync(f, orig.replace(alvo, () => mut));
  let r;
  try { r = spawnSync("node", t.args, { cwd: t.cwd, encoding: "utf8", timeout: 600000 }); }
  finally { writeFileSync(f, orig); }
  const igual = md5(readFileSync(f, "utf8")) === h0;
  const fail = Number((/^ℹ fail (\d+)$/m.exec(`${r.stdout}${r.stderr}`) || [])[1] ?? NaN);
  if (fail > 0) red++; else sobre.push(nome);
  console.log(`${nome}: ${fail > 0 ? `RED (${fail})` : `SOBREVIVEU (fail=${fail})`} · md5 ${igual ? "IDÊNTICO" : "DIFERENTE <-- PARAR"}`);
  if (!igual) process.exit(3);
}
console.log(`RESULTADO: ${red}/${MUTANTES.length} RED${sobre.length ? ` · sobreviventes: ${sobre.join("; ")}` : ""}`);
process.exit(sobre.length ? 1 : 0);

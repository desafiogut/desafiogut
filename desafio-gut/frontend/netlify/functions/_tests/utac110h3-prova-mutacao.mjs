// UTAC110h.3 — prova de mutação (GATE 7). NÃO é teste da suíte (não termina em .test.mjs).
// Corre: node _tests/utac110h3-prova-mutacao.mjs   (a partir de netlify/functions)
// Para cada mutante: confirma que ENTROU (md5 mudou), corre os testes-alvo do lado certo, exige VERMELHO,
// e restaura da cópia em memória com md5 IDÊNTICO. Baseline VERDE exigida antes de mutar.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");       // netlify/functions
const FRONT = join(RAIZ, "..", "..");                                  // desafio-gut/frontend
const md5 = (s) => createHash("md5").update(s).digest("hex");
const BACK_T = ["_tests/utac110h3-pendencias.test.mjs"];
const FRONT_T = ["src/__tests__/utac110h3-pendencias-front.test.mjs", "src/__tests__/utac110h3-boot-comportamento.test.mjs"];

function correr(lado) {
  const [cwd, args] = lado === "front"
    ? [FRONT, ["--test", "--test-concurrency=1", ...FRONT_T]]
    : [RAIZ, ["--experimental-test-module-mocks", "--test", ...BACK_T]];
  const r = spawnSync(process.execPath, args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const saida = `${r.stdout || ""}${r.stderr || ""}`;
  return { fail: Number((saida.match(/ℹ fail (\d+)/) ?? [])[1] ?? NaN),
    pass: Number((saida.match(/ℹ pass (\d+)/) ?? [])[1] ?? NaN) };
}

const L = "_lib/fontes-lance.mjs";                 // P1 (fonte única)
const LP = "ler-pontos.mjs";                       // P1 (endpoint)
const R = "_lib/referral.mjs";                     // P2
const EP = "referral.mjs";                         // P5 (endpoint)
const B = "../../src/Boot.jsx";                    // F
const PL = "../../src/components/PainelIndicacao.jsx"; // P1 (UI)
const PV = "../../src/pages/Privacidade.jsx";      // P4
const ES = "../../src/components/meus-ativos/_estilo.js"; // P3

const MUTANTES = [
  // ── P1 — contador do mês ───────────────────────────────────────────────────────────────────────
  ["P1a o contador conta TODOS os meses (perde o recorte UTC)", L,
    "&& String(h?.ref ?? \"\").startsWith(\"indicacao:\") && mesUTC(h?.data) === mes).length;",
    "&& String(h?.ref ?? \"\").startsWith(\"indicacao:\")).length;", "back"],
  ["P1b o contador passa a contar também o crédito do INDICADO", L,
    "&& String(h?.ref ?? \"\").startsWith(\"indicacao:\") && mesUTC(h?.data) === mes).length;",
    "&& String(h?.ref ?? \"\").startsWith(\"indicacao\") && mesUTC(h?.data) === mes).length;", "back"],
  ["P1c o `ler-pontos` deixa de expor o contador", LP,
    "    indicacoesMes,\n", "", "back"],
  ["P1d o limite devolvido é inventado (99)", L,
    "return { mes, creditadas, limite: LIMITE_INDICACOES_MES };",
    "return { mes, creditadas, limite: 99 };", "back"],
  ["P1e o painel deixa de mostrar o contador", PL,
    "          {dados.indicacoesMes && (", "          {null && (", "front"],
  // ── P2 — vocabulário do relatório ──────────────────────────────────────────────────────────────
  ["P2a o relatório admin volta a dizer «Senhas creditadas»", R,
    "`Recompensas on-chain creditadas: ${senhasCreditadas}. ` +",
    "`Senhas creditadas: ${senhasCreditadas}. ` +", "back"],
  ["P2b o campo `senhasCreditadas` desaparece da resposta", R,
    "  return { dia, totalConversoes, senhasCreditadas, topIndicadores, anomalias, falhasTransitorias: falhas.length, texto };",
    "  return { dia, totalConversoes, topIndicadores, anomalias, falhasTransitorias: falhas.length, texto };", "back"],
  // ── P4 — data da Privacidade ───────────────────────────────────────────────────────────────────
  ["P4a a data da Privacidade volta a agosto de 2026", PV,
    "Última atualização: 15 de outubro de 2026", "Última atualização: 15 de agosto de 2026", "front"],
  // ── P5 — o bug dos endereços mascarados (DEBT-025) ─────────────────────────────────────────────
  ["P5a o endpoint volta a passar endereços MASCARADOS (o bug)", EP,
    "{ codigo, indicador: r.indicador, indicado: endereco },",
    "{ codigo, indicador: mascararEndereco(r.indicador), indicado: mascararEndereco(endereco) },", "back"],
  ["P5b os papéis trocam-se no registo da conversão", EP,
    "{ codigo, indicador: r.indicador, indicado: endereco },",
    "{ codigo, indicador: endereco, indicado: r.indicador },", "back"],
  ["P5c o indicado sai do vínculo (conversão sem indicado)", EP,
    "{ codigo, indicador: r.indicador, indicado: endereco },",
    "{ codigo, indicador: r.indicador },", "back"],
  // ── F — Boot.jsx (comportamento do arranque) ───────────────────────────────────────────────────
  ["F1 o Boot ignora o consentimento e mostra sempre o gate", B,
    "const [aceito, setAceito] = useState(consentimentoJaAceito);",
    "const [aceito, setAceito] = useState(false);", "front"],
  ["F2 o Boot aceita um consentimento de QUALQUER versão", B,
    "return !!(c?.aceito && c?.versao === VERSAO_CONSENTIMENTO);",
    "return !!(c?.aceito || c?.versao === VERSAO_CONSENTIMENTO);", "front"],
  ["F3 o Boot deixa de ler o sessionStorage (compatibilidade MC88.31)", B,
    "    const salvo = localStorage.getItem(CHAVE_CONSENTIMENTO)\n               ?? sessionStorage.getItem(CHAVE_CONSENTIMENTO);",
    "    const salvo = localStorage.getItem(CHAVE_CONSENTIMENTO);", "front"],
  // ── P3 — vocabulário «torneio» ─────────────────────────────────────────────────────────────────
  ["P3a volta o vocabulário «torneio» num comentário de produção", ES,
    "partilhados pelas secções da competição.", "partilhados pelas secções do torneio.", "front"],
];

for (const lado of ["back", "front"]) {
  const base = correr(lado);
  if (!(base.fail === 0 && base.pass > 0)) { console.error(`BASELINE VERMELHA (${lado})`, base); process.exit(2); }
  console.log(`baseline ${lado} VERDE pass=${base.pass}`);
}

let provados = 0;
for (const [nome, rel, de, para, lado] of MUTANTES) {
  const p = join(RAIZ, rel);
  if (!existsSync(p)) { console.log(`✗ ${nome}: ficheiro não encontrado (${rel})`); continue; }
  const orig = readFileSync(p, "utf8");
  const nl = orig.includes("\r\n") ? "\r\n" : "\n";
  const a = de.replaceAll("\n", nl), b = para.replaceAll("\n", nl);
  const n = orig.split(a).length - 1;
  if (n !== 1) { console.log(`✗ ${nome}: âncora casou ${n}× — mutante INVÁLIDO`); continue; }
  writeFileSync(p, orig.replace(a, () => b));
  let r;
  try {
    if (md5(readFileSync(p, "utf8")) === md5(orig)) throw new Error("mutante não entrou");
    r = correr(lado);
  } finally {
    writeFileSync(p, orig);
  }
  const restaurado = md5(readFileSync(p, "utf8")) === md5(orig);
  const morde = r.fail > 0;
  if (morde && restaurado) provados++;
  console.log(`${morde ? "✓ PROVADO" : "✗ SOBREVIVE"} ${nome} — fail=${r.fail} · restauro md5 ${restaurado ? "idêntico" : "DIFERENTE"}`);
}
console.log(`\n${provados}/${MUTANTES.length} PROVADOS`);
process.exit(provados === MUTANTES.length ? 0 : 1);

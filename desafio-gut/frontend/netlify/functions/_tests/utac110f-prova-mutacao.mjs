// UTAC110f — prova de mutação (GATE 7). NÃO é teste da suíte (não termina em .test.mjs).
// Corre: node _tests/utac110f-prova-mutacao.mjs   (a partir de netlify/functions)
// Para cada mutante: confirma que ENTROU (md5 mudou), corre os testes-alvo, exige VERMELHO, e restaura
// de uma cópia em memória com md5 IDÊNTICO. Baseline VERDE exigida antes de mutar (backend E frontend).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");   // netlify/functions
const FRONT = join(RAIZ, "..", "..");                                 // desafio-gut/frontend
const md5 = (s) => createHash("md5").update(s).digest("hex");
const BACK = ["_tests/utac110f-fontes-lance.test.mjs", "_tests/utac110f-lance-missao.test.mjs",
  "_tests/utac110f-referral.test.mjs", "_tests/mc9112-integracao-lance.test.mjs", "_tests/mc941-lance-janela.test.mjs"];
const FRONT_T = ["src/__tests__/utac110f-login-diario.test.mjs"];

function correr(lado) {
  const [cwd, args] = lado === "front"
    ? [FRONT, ["--test", ...FRONT_T]]
    : [RAIZ, ["--experimental-test-module-mocks", "--test", ...BACK]];
  const r = spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
  const fail = Number((r.stdout.match(/ℹ fail (\d+)/) ?? [])[1] ?? NaN);
  const pass = Number((r.stdout.match(/ℹ pass (\d+)/) ?? [])[1] ?? NaN);
  return { fail, pass };
}

const L = "_lib/fontes-lance.mjs";
const CTX = "../../src/context/AppContext.jsx";
const MUTANTES = [
  ["M1 login dá 4 em vez de 5", L, "export const PONTOS_LOGIN_DIARIO = 5;", "export const PONTOS_LOGIN_DIARIO = 4;"],
  ["M2 dia de Brasília (UTC-3) em vez de Manaus", L, "const OFFSET_MANAUS_MS = 4 * 60 * 60 * 1000;", "const OFFSET_MANAUS_MS = 3 * 60 * 60 * 1000;"],
  ["M3 ref do login sem o dia (só 1 login na vida)", L, "export const refLoginDiario = (dia) => `login:${dia}`;", "export const refLoginDiario = (dia) => `login`;"],
  ["M4 ref da missão única por chamada (credita sempre)", L, "export const refMissaoLance = (dia) => `missao-lance:${dia}`;", "export const refMissaoLance = (dia) => `missao-lance:${dia}:${Math.random()}`;"],
  ["M5 sem a guarda de auto-indicação", L, "  if (a && a === b) return { ok: false, code: \"AUTO_INDICACAO\" };\n", ""],
  ["M6 indicado recebe uma vez POR INDICANTE", L, "creditarPontosLance(b, PONTOS_INDICACAO, \"indicacao\", REF_INDICACAO_RECEBIDA)", "creditarPontosLance(b, PONTOS_INDICACAO, \"indicacao\", `indicacao-recebida:${a}`)"],
  ["M7 sem o limite mensal", L, "if (!jaCreditado && noMes >= LIMITE_INDICACOES_MES) {", "if (false) {"],
  ["M8 o limite conta TODOS os meses", L, "\n      && mesUTC(h?.data) === mes).length;", ").length;"],
  ["M9 missão também no PROGRAMADO", "lance-relampago.mjs", "  if (!ehProgramado) {\n    try {\n      const m = await creditarMissaoLance(endereco);", "  if (true) {\n    try {\n      const m = await creditarMissaoLance(endereco);"],
  ["M10 o lance nunca credita a missão", "lance-relampago.mjs", "const m = await creditarMissaoLance(endereco);", "const m = { ok: true, creditado: false };"],
  ["M11 a indicação não credita pontos", "referral.mjs", "const pl = await creditarIndicacao(r.indicador, endereco);", "const pl = {};"],
  ["M12 a indicação usa os endereços MASCARADOS", "referral.mjs", "const pl = await creditarIndicacao(r.indicador, endereco);", "const pl = await creditarIndicacao(mascararEndereco(r.indicador), mascararEndereco(endereco));"],
  ["M13 login-diario aceita GET", "login-diario.mjs", "if (req.method !== \"POST\")", "if (false)"],
  ["M14 login-diario diz sempre creditado", "login-diario.mjs", "    creditado: r.creditado,\n", "    creditado: true,\n"],
  ["M15 AppContext chama sem authToken", CTX, "    if (!address || !authToken) return;\n    const chave = String(address).toLowerCase();", "    if (!address) return;\n    const chave = String(address).toLowerCase();", "front"],
  ["M16 AppContext marca feito mesmo quando falha", CTX, ".then((r) => { if (!r?.ok) loginDiarioFeitoRef.current.delete(chave); })", ".then(() => {})", "front"],
  ["M17 AppContext não envia o token", CTX, "apiPost(\"login-diario\", {}, { token: authToken })", "apiPost(\"login-diario\", {}, {})", "front"],
];

for (const lado of ["back", "front"]) {
  const base = correr(lado);
  if (!(base.fail === 0 && base.pass > 0)) { console.error(`BASELINE VERMELHA (${lado})`, base); process.exit(2); }
  console.log(`baseline ${lado} VERDE pass=${base.pass}`);
}

let provados = 0;
for (const [nome, rel, de, para, lado = "back"] of MUTANTES) {
  const p = join(RAIZ, rel);
  const orig = readFileSync(p, "utf8");
  const nl = orig.includes("\r\n") ? "\r\n" : "\n";
  const a = de.replaceAll("\n", nl), b = para.replaceAll("\n", nl);
  const n = orig.split(a).length - 1;
  if (n !== 1) { console.log(`✗ ${nome}: âncora casou ${n}× — mutante INVÁLIDO`); continue; }
  const mut = orig.replace(a, () => b);
  writeFileSync(p, mut);
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

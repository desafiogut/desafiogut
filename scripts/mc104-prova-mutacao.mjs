#!/usr/bin/env node
// MC104 — prova de mutação (R16). Cada mutante: confirma que o alvo existe (ENTROU), aplica, corre o
// teste que o deve matar, restaura BYTE-IDÊNTICO. Uso: node scripts/mc104-prova-mutacao.mjs [A|B|todos]
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut", "frontend");
const FN = join(FE, "netlify", "functions");
const qual = process.argv[2] || "todos";

const T_A_BE = { cwd: FN, args: ["--test", "--experimental-test-module-mocks", "_tests/mc104-consentimento.test.mjs"] };
const T_A_FE = { cwd: FE, args: ["--test", "src/lib/consentimento.test.mjs"] };
const T_B = { cwd: FN, args: ["--test", "--experimental-test-module-mocks", "_tests/mc104-exportar-dados.test.mjs"] };

const LIB = join(FN, "_lib", "consentimento.mjs");
const EP = join(FN, "consentimento.mjs");
const LFE = join(FE, "src", "lib", "consentimento.js");
const CTX = join(FE, "src", "context", "AppContext.jsx");
const GATE = join(FE, "src", "components", "TermosConsentimento.jsx");
const EXP = join(FN, "exportar-dados.mjs");

const A = [
  ["A1 não grava", LIB, "await abrir(getStore).setJSON(key, registo);", "void registo;", T_A_BE],
  ["A2 aceiteEm = hora do cliente", LIB, "aceiteEm: new Date(ts).toISOString(),", "aceiteEm: aceiteDeclaradoEm,", T_A_BE],
  ["A3 basta UMA declaração", LIB, "!DECLARACOES_GATE.every((k) => a[k] === true)", "!DECLARACOES_GATE.some((k) => a[k] === true)", T_A_BE],
  ["A4 sem idempotência", LIB, "if (igual) return { criado: false, registo: igual };", "", T_A_BE],
  ["A5 admin regista por outro", EP, 'if (String(payload?.endereco || "").toLowerCase() !== endereco) {', "if (false) {", T_A_BE],
  ["A6 histórico sem filtro de titular", LIB, 'if (!key.endsWith(":" + ender)) continue;', "", T_A_BE],
  ["A7 endereço completo no log", EP, "{ endereco: mascararEndereco(endereco), criado }", "{ endereco, criado }", T_A_BE],
  ["A8 sem ida e volta da data", LIB, "|| new Date(ms).toISOString().slice(0, 19) !== c.aceiteDeclaradoEm.slice(0, 19)", "", T_A_BE],
  ["A9 mesmo ms sobrescreve", LIB, "while (usadas.has(`${ts}:${ender}`)) ts += 1;", "", T_A_BE],
  ["A10 versão errada aceite", LIB, "if (c.versao !== VERSAO_GATE) {", "if (false) {", T_A_BE],
  ["A11 VERSAO_GATE deriva do gate", LIB, 'export const VERSAO_GATE = "2.0";', 'export const VERSAO_GATE = "2.1";', T_A_BE],
  ["A12 marca enviado mesmo com falha", LFE, 'if (!resp?.ok) return "falhou";', "", T_A_FE],
  ["A13 AppContext não envia", CTX, "    enviarConsentimentoPendente({\n", "    void ({\n", T_A_FE],
  ["A14 gate não guarda declarações", GATE, "      aceitos: { lido, maiores, termos, privacidade },\n", "", T_A_FE],
];

const B = [
  ["B1 pedidos sem 'comprador'", EXP, "obj?.endereco || obj?.address || obj?.comprador", "obj?.endereco || obj?.address", T_B],
  ["B2 lances-relampago fora", EXP, "dados.lances_relampago = await coletarLancesLegado(endereco);", "", T_B],
  ["B8 lance legado sem filtro de titular", EXP, 'if (String(l?.endereco || "").toLowerCase() === endereco) out.push', "out.push", T_B],
  ["B9 cotas só por cliente_id", EXP, ".or(`cliente_id.eq.${endereco},endereco.eq.${endereco}`);", ".or(`cliente_id.eq.${endereco}`);", T_B],
  ["B3 Supabase fora", EXP, "dados.supabase = await coletarSupabase(endereco);", "", T_B],
  ["B4 Supabase sem filtro de titular", EXP, ".eq(coluna, endereco);", ";", T_B],
  ["B5 pontuacoes fora", EXP, '["pontuacoes", "endereco"],', "", T_B],
  ["B6 endereço completo no log", EXP, "{ endereco: mascararEndereco(endereco), papel: guard.papel }", "{ endereco, papel: guard.papel }", T_B],
  ["B7 erro do Supabase engolido", EXP, "erros.push(`${tabela}: ${error.message}`);", "", T_B],
];

const lista = qual === "A" ? A : qual === "B" ? B : [...A, ...B];
let problemas = 0;
for (const [nome, ficheiro, de, para, t] of lista) {
  const orig = readFileSync(ficheiro, "utf8");
  const eol = orig.includes("\r\n") ? "\r\n" : "\n";
  const deE = de.replace(/\n/g, eol), paraE = para.replace(/\n/g, eol);
  const n = orig.split(deE).length - 1;
  if (n !== 1) { console.log(`NAO_ENTROU  ${nome} (ocorrências do alvo: ${n})`); problemas++; continue; }
  const mut = orig.replace(deE, paraE);
  try {
    writeFileSync(ficheiro, mut);
    if (readFileSync(ficheiro, "utf8") === orig) { console.log(`NAO_ENTROU  ${nome}`); problemas++; continue; }
    const r = spawnSync("node", t.args, { cwd: t.cwd, encoding: "utf8" });
    const fail = Number((r.stdout.match(/^ℹ fail (\d+)$/m) || [])[1]);
    if (Number.isNaN(fail)) { console.log(`NAO_MEDI    ${nome}`); problemas++; }
    else if (fail > 0) console.log(`RED ✓       ${nome}  (fail ${fail})`);
    else { console.log(`SOBREVIVEU  ${nome}`); problemas++; }
  } finally {
    writeFileSync(ficheiro, orig);
    if (readFileSync(ficheiro, "utf8") !== orig) { console.log(`!!! NÃO RESTAURADO: ${ficheiro}`); process.exit(3); }
  }
}
console.log(`total ${lista.length} · problemas ${problemas} · restauro byte-idêntico verificado`);
process.exit(problemas ? 1 : 0);

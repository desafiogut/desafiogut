// UTAC110d — prova de mutação (GATE 7). NÃO é teste da suíte (não termina em .test.mjs).
// Corre: node _tests/utac110d-prova-mutacao.mjs   (a partir de netlify/functions)
// Para cada mutante: confirma que ENTROU (md5 mudou), corre os testes-alvo, exige VERMELHO, e
// restaura de uma cópia em memória com md5 IDÊNTICO. Baseline VERDE exigida antes de mutar.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const md5 = (s) => createHash("md5").update(s).digest("hex");
const TESTES = ["_tests/utac110d-dois-passes.test.mjs", "_tests/mc9112-integracao-lance.test.mjs", "_tests/mc941-lance-janela.test.mjs"];

function correr() {
  const r = spawnSync(process.execPath, ["--experimental-test-module-mocks", "--test", ...TESTES], { cwd: RAIZ, encoding: "utf8" });
  const fail = Number((r.stdout.match(/ℹ fail (\d+)/) ?? [])[1] ?? NaN);
  const pass = Number((r.stdout.match(/ℹ pass (\d+)/) ?? [])[1] ?? NaN);
  return { fail, pass };
}

const MUTANTES = [
  ["M1 flag do débito R$ ligada", "lance-relampago.mjs", "const DEBITO_SALDO_LANCE_ATIVO = false;", "const DEBITO_SALDO_LANCE_ATIVO = true;"],
  ["M2 sem devolver o crédito na falha da blindagem", "lance-relampago.mjs", "      if (refCreditoLance) {", "      if (false && refCreditoLance) {"],
  ["M3 o lance consome 0 créditos", "_lib/ledger-lance.mjs", "export const CREDITOS_POR_LANCE = 1;", "export const CREDITOS_POR_LANCE = 0;"],
  ["M4 sem a guarda de negativo", "_lib/ledger-lance.mjs", "    if (novo < 0) {\n      return { ok: false, code: campo", "    if (false) {\n      return { ok: false, code: campo"],
  ["M5 pontos de lance aceitam «compra»", "_lib/ledger-lance.mjs", "[\"boas-vindas\", \"login\"", "[\"compra\", \"passe-relampago\", \"boas-vindas\", \"login\""],
  ["M6 o Programado também dá crédito", "_lib/comprar-passe-tipado.mjs", "const ehRelampago = tipoPasse === \"relampago\";", "const ehRelampago = true;"],
  ["M7 o Passe dá 1 ponto em vez de 10", "_lib/passe-pontos.mjs", "export const PONTOS_FIDELIDADE_POR_PASSE = 10;", "export const PONTOS_FIDELIDADE_POR_PASSE = 1;"],
  ["M8 sem desfazer os pontos quando o crédito falha", "_lib/comprar-passe-tipado.mjs", "const rev = await reverterMovimento(endereco, ref);", "const rev = { ok: false };"],
  ["M9 CAS sem o contador de créditos", "_lib/ledger-lance.mjs", "      ({ data, error } = await supabase.from(TABELA).update(payload)\n        .eq(\"endereco\", e).eq(\"creditos_lance\", creditos)", "      ({ data, error } = await supabase.from(TABELA).update(payload)\n        .eq(\"endereco\", e)"],
  ["M10 ler-pontos troca créditos por pontos", "ler-pontos.mjs", "creditos: Number(registo?.creditos_lance ?? 0),", "creditos: Number(registo?.pontos_lance ?? 0),"],
  ["M12 ref do consumo constante (V1)", "lance-relampago.mjs", "refCreditoLance = idempotencyKey ? `lance:${idempotencyKey}` : `lance:${lanceId}`;", "refCreditoLance = `lance:${endereco}`;"],
  ["M13 CAS sem pontos_lance (V2)", "_lib/ledger-lance.mjs", ".eq(\"endereco\", e).eq(\"creditos_lance\", creditos).eq(\"pontos_lance\", pontos)\n        .eq(\"atualizado_em\", atual.atualizado_em).select(\"endereco\"));", ".eq(\"endereco\", e).eq(\"creditos_lance\", creditos)\n        .eq(\"atualizado_em\", atual.atualizado_em).select(\"endereco\"));"],
  ["M14 CAS sem a versão (ABA, W3)", "_lib/ledger-lance.mjs", "        .eq(\"atualizado_em\", atual.atualizado_em).select(\"endereco\"));\n      if (!error && Array.isArray(data) && data.length === 0) continue; // CAS perdeu", "        .select(\"endereco\"));\n      if (!error && Array.isArray(data) && data.length === 0) continue; // CAS perdeu"],
  ["M15 consumo repetido não dá 409 (W5)", "lance-relampago.mjs", "    if (consumo.criado === false) {", "    if (false) {"],
  ["M11 o retry de compra a meio não completa o crédito", "_lib/comprar-passe-tipado.mjs", "if (st.completa) creditosLance = st.led.creditos;", "if (true) creditosLance = st.led.creditos;"],
];

const base = correr();
if (!(base.fail === 0 && base.pass > 0)) { console.error("BASELINE VERMELHA", base); process.exit(2); }
console.log(`baseline VERDE pass=${base.pass}`);

let provados = 0;
for (const [nome, rel, de, para] of MUTANTES) {
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
    r = correr();
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

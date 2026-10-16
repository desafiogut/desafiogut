// mc110i1d-prova-mutacao.mjs — UTAC110i.1 · FRENTE D (SEG2): prova de mutação da BIFURCAÇÃO do
// `useComprarPasse` (PIX vs Google Play Billing).
//
// Método herdado do `mc110i1-prova-mutacao.mjs` (FRENTE B): alvo ÚNICO exigido, ficheiro confirmado
// a MUDAR (md5), RED exigido, restauro byte-a-byte confirmado (T5). Baseline primeiro; sem verde o
// instrumento ABORTA (exit 2).
//
// Exit: 0 = prova completa · 1 = mutante sobreviveu · 2 = o instrumento não mediu.
//
// ⚠️ Cada corrida tem um TIMEOUT de 45 s. Um mutante que parte a bifurcação leva o código ao ramo
// nativo em testes que não prepararam a loja: aí a espera pela aprovação do utilizador dura
// `TIMEOUT_COMPRA_MS` (300 s) e o veredicto certo é «RED (pendurou)», não «verde por lentidão» —
// medido (o script pendurou 600 s antes desta guarda).
//
// Uso: node scripts/mc110i1d-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut", "frontend");
const HOOK = join(FE, "src", "hooks", "useComprarPasse.js");

// O teste novo do UTAC + a rede de segurança do UTAC106e (as invariantes do PIX que o 106e fixou).
const ALVO = ["--test", "--test-concurrency=1",
  "src/__tests__/utac110i1-front-billing.test.mjs",
  "src/pages/__tests__/utac106e-compra-passe.test.mjs"];

const MUTANTES = [
  ["D1  a bifurcação ignora a flag (todo o Android/browser vai ao Billing)", HOOK,
    "      if (isPagamentoNativoAtivo === true && billingDisponivel()) return await comprarNativo(tipo);",
    "      if (true) return await comprarNativo(tipo);"],
  ["D2  a bifurcação ignora a disponibilidade REAL da loja (o PWA iria ao Billing)", HOOK,
    "      if (isPagamentoNativoAtivo === true && billingDisponivel()) return await comprarNativo(tipo);",
    "      if (isPagamentoNativoAtivo === true) return await comprarNativo(tipo);"],
  ["D3  a bifurcação ignora a flag (o APK actual deixava o PIX)", HOOK,
    "      if (isPagamentoNativoAtivo === true && billingDisponivel()) return await comprarNativo(tipo);",
    "      if (billingDisponivel()) return await comprarNativo(tipo);"],
  ["D4  fecha a compra na loja ANTES de o servidor validar (entrega sem confirmação)", HOOK,
    "    // O SERVIDOR é a autoridade: valida o recibo na Google e credita os benefícios.\n    const { ok, status, data } = await apiPost(",
    "    const fimAntes = await confirmarCompra(compra);\n    void fimAntes;\n    // O SERVIDOR é a autoridade: valida o recibo na Google e credita os benefícios.\n    const { ok, status, data } = await apiPost("],
  ["D5  mesmo quando o SERVIDOR recusa, fecha a compra na loja (Passe queimado sem crédito)", HOOK,
    "      const message = MSG_POR_STATUS[status] ?? \"Erro do servidor\";\n      setErro(message);\n      return { ok: false, status, code: data?.error?.code, message };",
    "      await confirmarCompra(compra);\n      const message = MSG_POR_STATUS[status] ?? \"Erro do servidor\";\n      setErro(message);\n      return { ok: false, status, code: data?.error?.code, message };"],
  ["D6  o ramo nativo cai no PIX (dupla cobrança: loja + saldo)", HOOK,
    "      if (isPagamentoNativoAtivo === true && billingDisponivel()) return await comprarNativo(tipo);",
    "      if (isPagamentoNativoAtivo === true && billingDisponivel()) await comprarNativo(tipo);"],
  ["D7  o erro do Billing deixa de ser visível (silêncio)", HOOK,
    "    if (!compra.ok) {\n      const message = MSG_BILLING[compra.code] ?? \"Não foi possível concluir a compra na loja.\";\n      setErro(message);",
    "    if (!compra.ok) {\n      const message = MSG_BILLING[compra.code] ?? \"Não foi possível concluir a compra na loja.\";"],
  ["D8  o ramo nativo relê o saldo R$ (mente sobre um débito que não houve)", HOOK,
    "    const p = inteiroNaoNegativo(data?.pontosFidelidade);\n    setPontos(p);\n    return {\n      ok: true, tipo, pontos: p,",
    "    const p = inteiroNaoNegativo(data?.pontosFidelidade);\n    setPontos(p);\n    try { refetchSaldoRs?.(); } catch { /* idem */ }\n    return {\n      ok: true, tipo, pontos: p,"],
  ["D9  o cancelamento da loja passa a ser um erro genérico (perde a distinção)", HOOK,
    "  cancelada: \"Compra cancelada na loja.\",",
    "  cancelada: \"Não foi possível concluir a compra na loja.\","],
];

const md5 = (b) => createHash("md5").update(b).digest("hex");

function correr(timeout = 45000) {
  const r = spawnSync(process.execPath, ALVO, { cwd: FE, encoding: "utf8", timeout, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const n = (k) => {
    const m = out.match(new RegExp(`^\\u2139 ${k} (\\d+)$`, "m"));
    return m ? Number(m[1]) : null;
  };
  return { out, exit: r.status, sinal: r.signal, tests: n("tests"), pass: n("pass"), fail: n("fail"),
    red: /\u2716 /.test(out) || (n("fail") ?? 0) > 0 || (r.status ?? 0) !== 0 };
}

if (!readFileSync(HOOK, "utf8").includes("billingDisponivel")) {
  console.error(`ABORTA (exit 2): alvo inesperado -> ${HOOK}`);
  process.exit(2);
}
const original = readFileSync(HOOK);
const md5Original = md5(original);

console.log(`alvo: ${HOOK}\nmd5 inicial: ${md5Original}\n`);
const base = correr();
if (base.red || base.fail !== 0 || !(base.tests > 0)) {
  console.error(`ABORTA (exit 2): baseline não está verde -> ${base.pass}/${base.tests}, fail ${base.fail}, exit ${base.exit}, sinal ${base.sinal}`);
  console.error("--- últimas 20 linhas da saída do teste ---");
  console.error(base.out.split("\n").slice(-20).join("\n"));
  process.exit(2);
}
console.log(`controlo (sem mutação): VERDE ${base.pass}/${base.tests}\n`);

let mortos = 0;
for (const [nome, ficheiro, de, para] of MUTANTES) {
  const antes = readFileSync(ficheiro, "utf8");
  const ocorrencias = antes.split(de).length - 1;
  if (ocorrencias !== 1) {
    console.error(`ABORTA (exit 2): ${nome} -> ${ocorrencias} ocorrências do alvo (exige 1)`);
    writeFileSync(HOOK, original);
    process.exit(2);
  }
  writeFileSync(ficheiro, antes.replace(de, para));
  const entrou = md5(readFileSync(ficheiro)) !== md5Original;
  const r = correr();
  writeFileSync(ficheiro, original);
  const restaurado = md5(readFileSync(ficheiro)) === md5Original;
  const pendurou = r.sinal === "SIGTERM" || r.tests === null;
  const veredicto = !entrou ? "NAO_ENTROU" : pendurou ? "RED (pendurou)" : r.red ? "RED" : "SOBREVIVEU";
  if (veredicto === "RED" || veredicto === "RED (pendurou)") mortos += 1;
  console.log(`${veredicto.padEnd(14)} | entrou: ${entrou ? "sim" : "NAO"} | restaurado: ${restaurado ? "sim" : "NAO"} | ${nome}`);
  if (!restaurado) { console.error("ABORTA (exit 2): restauro não bateu byte a byte."); process.exit(2); }
}

console.log(`\nmutantes RED: ${mortos}/${MUTANTES.length}`);
const fim = md5(readFileSync(HOOK));
console.log(`md5 final: ${fim} ${fim === md5Original ? "(== inicial)" : "(DIVERGENTE!)"}`);
process.exit(mortos === MUTANTES.length ? 0 : 1);

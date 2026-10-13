// UTAC110e — prova de mutação (GATE 7). NÃO é teste da suíte (não termina em .test.mjs).
// Corre: node _tests/utac110e-prova-mutacao.mjs   (a partir de netlify/functions)
//
// Para cada mutante: confirma que ENTROU (md5 mudou), corre os testes-alvo, exige VERMELHO, e restaura
// de uma cópia em MEMÓRIA (nunca de `git checkout --`, que apagaria trabalho não commitado — incidente
// declarado no UTAC000.11) com md5 IDÊNTICO. Baseline VERDE exigida antes de mutar.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const md5 = (s) => createHash("md5").update(s).digest("hex");
const TESTES = [
  "_tests/utac110e-eco-quildo.test.mjs",
  "_tests/utac110d-dois-passes.test.mjs",
  "_tests/mc9112-integracao-lance.test.mjs",
  "_tests/mc941-lance-janela.test.mjs",
];

function correr() {
  const r = spawnSync(process.execPath, ["--experimental-test-module-mocks", "--test", ...TESTES], { cwd: RAIZ, encoding: "utf8" });
  const fail = Number((r.stdout.match(/ℹ fail (\d+)/) ?? [])[1] ?? NaN);
  const pass = Number((r.stdout.match(/ℹ pass (\d+)/) ?? [])[1] ?? NaN);
  return { fail, pass };
}

const MUTANTES = [
  // ── o lastro em R$ ─────────────────────────────────────────────────────────────────────────────
  ["M1 lastro convertido a 1 centavo por ECOQUILDO (em vez de 100)", "_lib/eco-quildo.mjs",
    "export const CENTAVOS_POR_ECOQUILDO = 100;", "export const CENTAVOS_POR_ECOQUILDO = 1;"],
  ["M2 reserva somada da emitido (não derivada do par emitido/usado)", "_lib/eco-quildo.mjs",
    "    const reserva = reservaDe(novoEmitido, novoUsado);", "    const reserva = novoEmitido;"],
  ["M3 estado impossível do lastro aceite (reserva negativa)", "_lib/eco-quildo.mjs",
    "    if (novoEmitido < 0 || novoUsado < 0 || novoEmitido < novoUsado) {", "    if (false) {"],
  ["M4 CAS do lastro removido por inteiro (nenhum contador é condição)", "_lib/eco-quildo.mjs",
    "      .eq(\"id\", 1).eq(\"total_emitido\", emitido).eq(\"total_usado\", usado)\n      .eq(\"reserva_rs_centavos\", Number(atual.reserva_rs_centavos ?? 0))\n      .eq(\"atualizado_em\", atual.atualizado_em).select(\"id\");",
    "      .eq(\"id\", 1).select(\"id\");"],
  ["M5 lastro ausente inventa zeros em vez de recusar", "_lib/eco-quildo.mjs",
    "    if (!atual) return { ok: false, code: \"LASTRO_AUSENTE\" };",
    "    if (!atual) return { ok: true, total_emitido: 0, total_usado: 0, reserva_rs_centavos: 0 };"],

  // ── o saldo do ECOQUILDO ───────────────────────────────────────────────────────────────────────
  ["M6 1 ECOQUILDO por Passe passa a 0", "_lib/eco-quildo.mjs",
    "export const ECOQUILDO_POR_PASSE = 1;", "export const ECOQUILDO_POR_PASSE = 0;"],
  ["M7 motivos de emissão aceitam «compra» (fonte fora do Art. 48º/51º)", "_lib/eco-quildo.mjs",
    "export const MOTIVOS_EMISSAO = Object.freeze([\"passe-relampago\", \"passe-programado\", \"boas-vindas\", \"indicacao\"]);",
    "export const MOTIVOS_EMISSAO = Object.freeze([\"compra\", \"passe-relampago\", \"passe-programado\", \"boas-vindas\", \"indicacao\"]);"],
  ["M8 debitar credita (sinal trocado no movimento de uso)", "_lib/eco-quildo.mjs",
    "  return aplicarMovimento(endereco, -valor, MOTIVO_USO, ref);", "  return aplicarMovimento(endereco, valor, MOTIVO_USO, ref);"],
  ["M9 guarda de saldo negativo removida", "_lib/eco-quildo.mjs",
    "    if (novo < 0) return { ok: false, code: \"SALDO_INSUFICIENTE\", saldo };", "    if (false) return { ok: false, code: \"SALDO_INSUFICIENTE\", saldo };"],
  ["M10 CAS do saldo removido por inteiro (saldo e versão deixam de ser condição)", "_lib/eco-quildo.mjs",
    "supabase.from(TABELA).update(payload)\n        .eq(\"endereco\", e).eq(\"saldo\", saldo).eq(\"atualizado_em\", atual.atualizado_em)",
    "supabase.from(TABELA).update(payload)\n        .eq(\"endereco\", e)"],
  ["M11 ref do uso constante (a mesma chave deixa de ser exigida)", "_lib/eco-quildo.mjs",
    "  const ref = refUso(idempotencyKey);", "  const ref = refUso(\"fixo\");"],

  // ── a FRENTE C (a compra) ──────────────────────────────────────────────────────────────────────
  ["M12 a compra deixa de creditar o ECOQUILDO", "_lib/comprar-passe-tipado.mjs",
    "  const eco = await garantirEcoQuildo();", "  const eco = { ok: true, saldo: 0 };"],
  ["M13 falha do ECOQUILDO não desfaz a compra (pontos/crédito/R$ ficam)", "_lib/comprar-passe-tipado.mjs",
    "    const desfeito = await desfazerCompra();", "    const desfeito = {};"],
  ["M14 a falha do lastro é silenciada (a compra responde 201 com moeda sem lastro)", "_lib/comprar-passe-tipado.mjs",
    "        return { ok: false, code: `lastro:${el.code}`, ecoDesfeito: rev.ok === true && rev.revertido === true };",
    "        return { ok: true, saldo: ec.saldo };"],

  // ── o endpoint de uso ──────────────────────────────────────────────────────────────────────────
  ["M15 usar-eco-quildo não actualiza o lastro", "usar-eco-quildo.mjs",
    "  const l = await registarUsoNoLastro(valor).catch(() => ({ ok: false, code: \"ERRO_DB\" }));",
    "  const l = { ok: true, total_emitido: 0, total_usado: 0, reserva_rs_centavos: 0 };"],
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

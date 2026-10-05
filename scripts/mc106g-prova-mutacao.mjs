// UTAC106g — prova de mutação (GATE 7/8) do RESGATE DO CARTÃO + R2 + validação da edição.
// Cada mutante: alvo ÚNICO exigido, ficheiro confirmado a MUDAR (md5), testes em TAP, RED exigido,
// bytes repostos e md5 confirmado. Versionado para a prova ser reprodutível do repo.
// Uso: node scripts/mc106g-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut/frontend");
const FN = join(FE, "netlify/functions");
const LIB = join(FN, "_lib/passe-pontos.mjs");
const REG_PALPITE = join(FN, "registar-palpite.mjs");

// Alvos de teste: cada mutante é julgado pelo teste que guarda a sua regra.
const ALVO_PALPITE = ["--test", "--experimental-test-module-mocks", "--test-reporter=tap", "_tests/palpite.test.mjs"];
const ALVO_RESGATE = ["--test", "--experimental-test-module-mocks", "--test-reporter=tap", "_tests/resgates.test.mjs"];

const MUTANTES = [
  // ── R2 — idempotência da apuração POR EDIÇÃO ──────────────────────────────────────────────────
  // (a) o literal do enunciado (a chave deixar de identificar a edição) — morre no teste da `ref`.
  ["R2-a chave do bónus deixa de incluir a edição", LIB,
    'export const refBonusPalpite = (edicaoId) => `palpite-certo:${edicaoId}`;',
    'export const refBonusPalpite = () => "palpite-certo:fixo";', FN, ALVO_PALPITE],
  // (b) o FIX REAL: sem o guarda, a edição apurada volta a aceitar palpites novos ⇒ paga 2×.
  ["R2-b edição apurada volta a aceitar palpites novos", LIB,
    "  if (jaApurada) return { ok: false, code: \"EDICAO_APURADA\" };",
    "  if (false && jaApurada) return { ok: false, code: \"EDICAO_APURADA\" };", FN, ALVO_PALPITE],
  // R2-b (facet do B2, 2.ª ronda): sem desfazer o crédito quando a MARCAÇÃO falha, o guarda
  // `edicaoApurada()` fica falso e uma 2.ª apuração paga +2 a outro endereço ⇒ a edição paga 4.
  ["B2 credito do bonus sobrevive a marcacao falhada (edicao paga 4)", LIB,
    "    if (credito.criado === true) {", "    if (false) {", FN, ALVO_PALPITE],
  // ── decisão #6 — a edição tem de estar ABERTA ─────────────────────────────────────────────────
  ["Nota validação da edição aberta removida", REG_PALPITE,
    'if (edicao.status !== "aberto") {', 'if (false) {', FN, ALVO_RESGATE],
  // ── resgate ───────────────────────────────────────────────────────────────────────────────────
  // O gate do CARTÃO volta a ser o TOTAL (a função ANTIGA, marcada «NÃO usar»).
  ["Resgate usa a podeResgatarCartao() ANTIGA (total)", LIB,
    "  try { pode = await podeResgatarCartaoComCompra(e); }",
    "  try { pode = await podeResgatarCartao(e); }", FN, ALVO_RESGATE],
  // Rollback COMPENSADO em vez de REVERTIDO ⇒ reintroduz o BLOQUEANTE B1: o retry com a mesma chave
  // cria o pedido SEM debitar (cartão grátis). Medido pelo validador adversarial (commit 7923e7a).
  ["B1 resgate: rollback COMPENSA em vez de reverter (cria sem cobrar)", LIB,
    "    const rev = await reverterMovimento(e, refResgate(key));",
    "    const rev = await creditarPontos(e, PONTOS_POR_CARTAO, TIPO_RESGATE, \"resgate-rollback:\" + key);",
    FN, ALVO_RESGATE],
  // Q1: sem o early-check por `idempotency_key`, o retry de um resgate com EXACTAMENTE 50 pontos
  // devolve 402 em vez de 200 idempotente (o gate deixa de ver pontos de compra).
  ["Q1 resgate: sem o early-check de idempotência (retry a 50 pontos → 402)", LIB,
    "  if (jaExiste) return { ok: true, idempotent: true, resgate: jaExiste, pontos: await getPontos(e) };",
    "  if (false && jaExiste) return { ok: true, idempotent: true, resgate: jaExiste, pontos: await getPontos(e) };",
    FN, ALVO_RESGATE],
];

const md5 = (b) => createHash("md5").update(b).digest("hex");
const originais = new Map();
for (const f of [LIB, REG_PALPITE]) originais.set(f, readFileSync(f));
const correr = (cwd, args) => {
  const r = spawnSync(process.execPath, args, { cwd, encoding: "utf8", timeout: 900000, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const n = (k) => Number((out.match(new RegExp(`^# ${k} (\\d+)`, "m")) || [])[1]);
  return { pass: n("pass"), fail: n("fail"), tests: n("tests") };
};

let falhas = 0;
for (const [nome, cwd, args] of [["palpite", FN, ALVO_PALPITE], ["resgate", FN, ALVO_RESGATE]]) {
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

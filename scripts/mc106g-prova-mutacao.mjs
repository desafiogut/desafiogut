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
  // ── decisão #6 — a edição tem de estar ABERTA ─────────────────────────────────────────────────
  ["Nota validação da edição aberta removida", REG_PALPITE,
    'if (edicao.status !== "aberto") {', 'if (false) {', FN, ALVO_RESGATE],
  // ── resgate ───────────────────────────────────────────────────────────────────────────────────
  // O gate do CARTÃO volta a ser o TOTAL (a função ANTIGA, marcada «NÃO usar»).
  ["Resgate usa a podeResgatarCartao() ANTIGA (total)", LIB,
    "  try { pode = await podeResgatarCartaoComCompra(e); }",
    "  try { pode = await podeResgatarCartao(e); }", FN, ALVO_RESGATE],
  // Idempotência do resgate removida ⇒ a mesma chave debita 2×.  [EQUIVALENTE — ver abaixo]
  // Rollback removido ⇒ o registo falha e os pontos ficam debitados (cobrança sem pedido).
  ["Resgate sem ROLLBACK quando o registo falha", LIB,
    "    const devolve = await creditarPontos(e, PONTOS_POR_CARTAO, TIPO_RESGATE, refResgateRollback(key));",
    "    const devolve = { ok: false };", FN, ALVO_RESGATE],
];

// ── MUTANTES EQUIVALENTES (declarados) — a mutação NÃO é um defeito, logo o verde está CERTO ─────
// Medido: a idempotência do resgate tem TRÊS camadas independentes — (1) o early-check por
// `idempotency_key`; (2) a `ref` do débito (`resgate:<chave>`, idempotente em `aplicarMovimento`);
// (3) o UNIQUE da tabela (23505 → devolve o existente). Desligar UMA delas deixa as outras duas a
// cobrir o caso ⇒ o comportamento NÃO regride e o teste manter-se verde é o resultado CORRECTO.
// Um mutante só vale se a sua remoção for uma regressão (lição da série: «mutante equivalente»).
const EQUIVALENTES = [
  ["Resgate sem o early-check de idempotência (3 camadas)", LIB,
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
  // Equivalentes declarados: a asserção é a INVERSA — têm de SOBREVIVER (senão a equivalência é falsa).
  console.log("── mutantes equivalentes (declarados: remover UMA camada não é regressão) ──");
  for (const [nome, f, de, para, cwd, args] of EQUIVALENTES) {
    const orig = originais.get(f); const txt = orig.toString("utf8");
    const crlf = txt.includes("\r\n");
    const a = crlf ? de.replace(/\n/g, "\r\n") : de;
    const b = crlf ? para.replace(/\n/g, "\r\n") : para;
    const n = txt.split(a).length - 1;
    if (n !== 1) { console.log(`${nome}: ALVO ${n}× — inválido`); falhas++; continue; }
    writeFileSync(f, txt.replace(a, () => b));
    if (md5(readFileSync(f)) === md5(orig)) { console.log(`${nome}: NÃO ENTROU`); falhas++; continue; }
    const r = correr(cwd, args); const sobrevive = r.tests > 0 && r.fail === 0;
    console.log(`${nome}: ${sobrevive ? "EQUIVALENTE (sobrevive, como esperado)" : "MORREU — a equivalência é FALSA"}`);
    if (!sobrevive) falhas++;
    writeFileSync(f, orig);
  }
} finally {
  for (const [f, orig] of originais) {
    writeFileSync(f, orig); const ok = md5(readFileSync(f)) === md5(orig); if (!ok) falhas++;
    console.log(`restauração ${f.split(/[\\/]/).pop()}: md5 ${ok ? "IDÊNTICO" : "DIFERENTE!"}`);
  }
}
console.log(falhas === 0
  ? `VEREDITO: ${MUTANTES.length}/${MUTANTES.length} PROVADOS + ${EQUIVALENTES.length} EQUIVALENTE(S) DECLARADO(S)`
  : `VEREDITO: ${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);

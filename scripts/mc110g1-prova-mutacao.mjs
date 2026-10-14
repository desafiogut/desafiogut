// UTAC110g.1 — prova de mutação (GATES 7/8) da NOTA TÉCNICA DE ENVIO (Frente A, R18-110g.1-1).
//
// Método herdado do `mc106g-prova-mutacao.mjs`: cada mutante tem alvo ÚNICO exigido, o ficheiro é
// confirmado a MUDAR (md5), o teste é corrido em TAP, exige-se RED, e os bytes originais são
// repostos com md5 confirmado no fim. Versionado para a prova ser reprodutível do repo.
//
// Uso: node scripts/mc110g1-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut/frontend");
const FN = join(FE, "netlify/functions");

const NOTA = join(FN, "_lib/nota-tecnica.mjs");
const ENDPOINT = join(FN, "resgatar-cartao.mjs");

// O teste que guarda cada regra mutada (o mesmo ficheiro serve todos os mutantes).
const ALVO = ["--test", "--experimental-test-module-mocks", "--test-reporter=tap", "_tests/utac110g1-nota-tecnica.test.mjs"];

const MUTANTES = [
  // ── o TEMPLATE (R18-110g.1-1: os 5 campos) ────────────────────────────────────────────────────
  ["M1 o produto perde a identificação («Cartão colecionável Família Quildo»)", NOTA,
    'export const PRODUTO_CARTAO = "Cartão colecionável Família Quildo";',
    'export const PRODUTO_CARTAO = "Cartão colecionável";', FN, ALVO],
  ["M2 o CNPJ do remetente é outro (deixa de ser o vendedor legal)", NOTA,
    '  cnpj: "23.040.066/0001-00",',
    '  cnpj: "00.000.000/0000-00",', FN, ALVO],
  ["M3 a data do documento deixa de ser a de Manaus (passa a UTC)", NOTA,
    '      timeZone: "America/Manaus", day: "2-digit", month: "2-digit", year: "numeric",',
    '      timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric",', FN, ALVO],
  ["M4 o remetente perde a praça (Manaus/AM sai do bloco)", NOTA,
    "    REMETENTE.cidade,\n",
    "", FN, ALVO],
  // ── a INTEGRAÇÃO no e-mail de confirmação ─────────────────────────────────────────────────────
  ["M5 a Nota Técnica deixa de ir no e-mail (o 110g.1 é revertido em silêncio)", ENDPOINT,
    "      notaTecnica,\n",
    '      "",\n', FN, ALVO],
  ["M6 a morada validada deixa de alimentar a Nota Técnica (destinatário cego)", ENDPOINT,
    "          morada,\n          produto: PRODUTO_CARTAO,",
    "          morada: null,\n          produto: PRODUTO_CARTAO,", FN, ALVO],
  ["M7 a guarda «sem e-mail de sessão não se envia» cai (tenta enviar sem destino)", ENDPOINT,
    "    if (email) {\n      try {\n        const { enviarEmail } = await import(\"./_lib/email.mjs\");",
    "    if (true) {\n      try {\n        const { enviarEmail } = await import(\"./_lib/email.mjs\");", FN, ALVO],
];

// ⚠️ EQUIVALENTE DECLARADO (medido nesta corrida, não escondido): trocar `para: email` por
// `para: email || "fallback@example.com"` NÃO muda comportamento nenhum — a guarda `if (email)`
// a montante torna o fallback INALCANÇÁVEL. Foi medido: o mutante sobreviveu (13/13). Fica
// registado em vez de apagado, porque um mutante que sobrevive sem explicação é lixo; com
// explicação é prova de que a guarda a montante já fecha a porta.
const EQUIVALENTES = [
  ["E1 `para: email || \"fallback@…\"` (inalcançável: a guarda `if (email)` fecha a porta)", ENDPOINT,
    "        await enviarEmail({ para: email, assunto: texto.assunto, mensagem: texto.mensagem });",
    '        await enviarEmail({ para: email || "fallback@example.com", assunto: texto.assunto, mensagem: texto.mensagem });',
    FN, ALVO],
];

const md5 = (b) => createHash("md5").update(b).digest("hex");
const originais = new Map();
for (const f of [NOTA, ENDPOINT]) originais.set(f, readFileSync(f));
const correr = (cwd, args) => {
  const r = spawnSync(process.execPath, args, { cwd, encoding: "utf8", timeout: 900000, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const n = (k) => Number((out.match(new RegExp(`^# ${k} (\\d+)`, "m")) || [])[1]);
  return { pass: n("pass"), fail: n("fail"), tests: n("tests") };
};

const base = correr(FN, ALVO);
console.log(`controlo (sem mutação): ${base.pass}/${base.tests} pass, fail ${base.fail}`);
if (!(base.tests > 0 && base.fail === 0)) { console.log("CONTROLO NÃO VERDE — abortar"); process.exit(2); }

let falhas = 0;
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
  // Equivalentes DECLARADOS: sobreviver é o resultado ESPERADO (e tem de sobreviver mesmo — se um
  // deles morrer, a minha explicação estava errada e isso é uma falha da prova).
  for (const [nome, f, de, para, cwd, args] of EQUIVALENTES) {
    const orig = originais.get(f); const txt = orig.toString("utf8");
    const crlf = txt.includes("\r\n");
    const a = crlf ? de.replace(/\n/g, "\r\n") : de;
    const b = crlf ? para.replace(/\n/g, "\r\n") : para;
    if (txt.split(a).length - 1 !== 1) { console.log(`${nome}: ALVO inválido`); falhas++; continue; }
    writeFileSync(f, txt.replace(a, () => b));
    const r = correr(cwd, args); const sobreviveu = r.tests > 0 && r.fail === 0;
    console.log(`${nome}: ${sobreviveu ? "EQUIVALENTE CONFIRMADO (sobreviveu)" : "MORREU — a explicação está errada"} — ${r.pass}/${r.tests}`);
    if (!sobreviveu) falhas++;
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

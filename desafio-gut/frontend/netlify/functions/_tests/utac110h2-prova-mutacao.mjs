// UTAC110h.2 — prova de mutação (GATE 7). NÃO é teste da suíte (não termina em .test.mjs).
// Corre: node _tests/utac110h2-prova-mutacao.mjs   (a partir de netlify/functions)
// Para cada mutante: confirma que ENTROU (md5 mudou), corre os testes-alvo do lado certo, exige
// VERMELHO, e restaura de uma cópia em memória com md5 IDÊNTICO. Baseline VERDE exigida antes de mutar.
//
// Dois lados: BACKEND (Frente A — o crédito de ECOQUILDO — e Frente C — o GUTO) e FRONTEND
// (Frente B — os 3 sítios de UI — e Frente D — as pendências).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");       // netlify/functions
const FRONT = join(RAIZ, "..", "..");                                   // desafio-gut/frontend
const md5 = (s) => createHash("md5").update(s).digest("hex");
const BACK_T = ["_tests/utac110h2-eco-indicacao.test.mjs", "_tests/utac110h2-guto-eco.test.mjs",
  "_tests/utac110h1-guto-indicacao.test.mjs"];
const FRONT_T = ["src/__tests__/utac110h2-indicacao-copy.test.mjs", "src/__tests__/utac110h2-pendencias.test.mjs"];

function correr(lado) {
  const [cwd, args] = lado === "front"
    ? [FRONT, ["--test", "--test-concurrency=1", ...FRONT_T]]
    : [RAIZ, ["--experimental-test-module-mocks", "--test", ...BACK_T]];
  const r = spawnSync(process.execPath, args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const saida = `${r.stdout || ""}${r.stderr || ""}`;
  const fail = Number((saida.match(/ℹ fail (\d+)/) ?? [])[1] ?? NaN);
  const pass = Number((saida.match(/ℹ pass (\d+)/) ?? [])[1] ?? NaN);
  return { fail, pass };
}

const L = "_lib/fontes-lance.mjs";     // Frente A
const G = "_lib/guto-perfis.mjs";      // Frente C
const R = "_lib/referral.mjs";         // Frente B3
const P = "../../src/components/PainelIndicacao.jsx";   // Frente B1
const C = "../../src/components/ChatbotWidget.jsx";     // Frente B2
const I = "../../src/i18n/pt.js";                       // Frente D2
const T = "../../src/components/TermosConsentimento.jsx"; // Frente D3
const V = "../../src/pages/Privacidade.jsx";            // Frente D1

const MUTANTES = [
  // ── Frente A — o crédito de ECOQUILDO (backend) ─────────────────────────────────────────────
  ["A1 ECOQUILDO ao indicante = 3 em vez de 2 (Art. 51º)", L,
    "export const ECOQUILDO_INDICACAO_INDICANTE = 2;", "export const ECOQUILDO_INDICACAO_INDICANTE = 3;", "back"],
  ["A2 ECOQUILDO ao indicado = 2 em vez de 1 (Art. 51º)", L,
    "export const ECOQUILDO_INDICACAO_INDICADO = 1;", "export const ECOQUILDO_INDICACAO_INDICADO = 2;", "back"],
  ["A3 motivo fora da lista FECHADA (MOTIVO_INVALIDO em silêncio)", L,
    'export const MOTIVO_ECO_INDICACAO = "indicacao";', 'export const MOTIVO_ECO_INDICACAO = "bonus";', "back"],
  ["A4 ref do indicante sem o indicado (idempotência global)", L,
    "export const refEcoIndicacao = (indicado) => `eco-indicacao:${indicado}`;",
    "export const refEcoIndicacao = (indicado) => `eco-indicacao`;", "back"],
  ["A5 sem o gate do limite mensal no ECOQUILDO", L,
    '  if (indicanteRes.ok && indicanteRes.code !== "LIMITE_MENSAL") {', "  if (indicanteRes.ok) {", "back"],
  ["A6 lastro com +3 fixo em vez do emitido REAL", L,
    "const lastro = await registarEmissaoNoLastro(total)", "const lastro = await registarEmissaoNoLastro(3)", "back"],
  ["A7 sem a reversão das emissões quando o lastro falha", L,
    "  for (const c of criados) {\n", "  for (const c of []) {\n", "back"],
  ["A8 papéis trocados: o ECOQUILDO do indicante vai para o indicado", L,
    "const r = await creditarEcoQuildo(indicante, ECOQUILDO_INDICACAO_INDICANTE, MOTIVO_ECO_INDICACAO, ref)",
    "const r = await creditarEcoQuildo(indicado, ECOQUILDO_INDICACAO_INDICANTE, MOTIVO_ECO_INDICACAO, ref)", "back"],
  ["A9 sem registo no lastro (ECOQUILDO sem reserva em R$)", L,
    '  const lastro = await registarEmissaoNoLastro(total).catch(() => ({ ok: false, code: "ERRO_DB" }));\n',
    "  const lastro = { ok: true };\n", "back"],
  ["A10 o ECOQUILDO do indicado passa a ser por indicante (deixa de ser 1×/vida)", L,
    "creditarEcoQuildo(indicado, ECOQUILDO_INDICACAO_INDICADO, MOTIVO_ECO_INDICACAO, REF_ECO_INDICACAO_RECEBIDA)",
    "creditarEcoQuildo(indicado, ECOQUILDO_INDICACAO_INDICADO, MOTIVO_ECO_INDICACAO, ref)", "back"],
  // ── Frente C — o GUTO (backend) ─────────────────────────────────────────────────────────────
  ["C1 o GUTO volta a não falar do ECOQUILDO do indicante (perfil visitante)", G,
    "você ganha +50 pontos de lance e +2 ECOQUILDO (e o seu amigo ganha +50 pontos de lance e +1 ECOQUILDO). 😊",
    "você ganha +50 pontos de lance (e o seu amigo também). 😊", "back"],
  ["C2 o GUTO promete o ECOQUILDO trocado ao indicante no perfil admin", G,
    "Recompensa: +50 pontos de lance e +2 ECOQUILDO ao indicante, +50 pontos de lance e +1 ECOQUILDO ao indicado (até 10 por mês por indicante).",
    "Recompensa: +50 pontos de lance e +1 ECOQUILDO ao indicante, +50 pontos de lance e +2 ECOQUILDO ao indicado (até 10 por mês por indicante).", "back"],
  ["C3 o GUTO volta a prometer «+1 senha» (perfil comum)", G,
    "você ganha +50 pontos de lance e +2 ECOQUILDO na hora (e o seu amigo ganha +50 pontos de lance e +1 ECOQUILDO), até 10 indicações por mês",
    "você ganha +1 senha na hora (e o seu amigo também), até 10 indicações por mês", "back"],
  // ── Frente B3 — a notificação (backend) ─────────────────────────────────────────────────────
  ["B3 a notificação volta a prometer «+1 senha creditada»", R,
    "Parabéns! ${quem} entrou no DESAFIOGUT. +50 pontos de lance e +2 ECOQUILDO creditados!",
    "Parabéns! ${quem} entrou no DESAFIOGUT. +1 senha creditada!", "back"],
  ["B3b o plural da notificação diz os números do dia em vez de n×50 e n×2", R,
    "`${n} amigos teus entraram hoje no DESAFIOGUT! +${n * 50} pontos de lance e +${n * 2} ECOQUILDO creditados.`",
    "`${n} amigos teus entraram hoje no DESAFIOGUT! +${n} pontos de lance e +${n} ECOQUILDO creditados.`", "back"],
  // ── Frente B1 — o painel da Carteira (frontend) ─────────────────────────────────────────────
  ["B1a o painel volta a dizer «+1 senha» no convite partilhado", P,
    "você ganha +50 pontos de lance e +1 ECOQUILDO, e eu ganho +50 pontos e +2 ECOQUILDO.",
    "nós dois ganhamos +1 senha.", "front"],
  ["B1b o painel volta a dizer «+1 senha» no parágrafo", P,
    "+50 pontos de lance e +2 ECOQUILDO </strong>\n        (e ele ganha +50 pontos e +1 ECOQUILDO).",
    "1º lance, vocês dois ganham +1 senha! </strong>\n        ", "front"],
  ["B1c o 3.º card volta ao contador «🎁 Senhas ganhas»", P,
    "🎁 Recompensa por indicação", "🎁 Senhas ganhas", "front"],
  ["B1d o painel volta a MOSTRAR o contador morto `senhas_ganhas`", P,
    "+50 pontos de lance e +2 ECOQUILDO\n          </div>",
    "{dados.senhas_ganhas}\n          </div>", "front"],
  // ── Frente B2 — o card do chat (frontend) ───────────────────────────────────────────────────
  ["B2 o card do chat volta a «Senhas ganhas»", C,
    'stat("Recompensa por indicação", "+50 pontos de lance e +2 ECOQUILDO")',
    'stat("Senhas ganhas", indicacao?.senhas_ganhas)', "front"],
  // ── Frente D — as pendências (frontend) ─────────────────────────────────────────────────────
  ["D1 a Privacidade volta a dizer «senhas»", V,
    "podem adquirir Passes Desafio mediante", "podem adquirir produtos/senhas mediante", "front"],
  ["D2 o aviso do lance volta a «regra do torneio»", I,
    "Projeção pela regra da competição.", "Projeção pela regra do torneio.", "front"],
  ["D3 a caixa de contacto volta a mostrar telefone e site", T,
    '📧 Dúvidas: desafiogut01@gmail.com\n            </p>',
    '📧 Dúvidas: desafiogut01@gmail.com &nbsp;·&nbsp; 📞 (92) 98428-5774 &nbsp;·&nbsp; 🌐 www.grupouniaoetrabalho.com.br\n            </p>', "front"],
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

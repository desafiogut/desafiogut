#!/usr/bin/env node
// utac138-seg4-mutacao.mjs — UTAC138 SEG4 (validador adversarial). Mutantes PRÓPRIOS do validador,
// além dos 17 do executor (`utac138-prova-mutacao.mjs`). Mesmo método: cópia de segurança FORA do repo →
// aplica (âncora tem de casar 1×) → corre o teste dirigido → tem de ficar VERMELHO → restaura → confere md5.
//
// Uso (raiz do repo):
//   node scripts/utac138-seg4-mutacao.mjs original   # V1..V22 contra o código entregue (procura testes fracos)
//   node scripts/utac138-seg4-mutacao.mjs correccoes # W1..W8 contra as correcções do validador
//
// Na fase «original», um VIVO é um ACHADO (teste fraco), não um erro do script.

import { readFileSync, writeFileSync, copyFileSync, mkdtempSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut", "frontend");
const FN = join(FE, "netlify", "functions");
const md5 = (f) => createHash("md5").update(readFileSync(f)).digest("hex");
const BAK = mkdtempSync(join(tmpdir(), "utac138-seg4-mut-"));

const back = (...t) => ({ cwd: FN, args: ["--test", "--experimental-test-module-mocks", "--test-concurrency=1", ...t.map((x) => `_tests/${x}`)] });
const front = (...t) => ({ cwd: FE, args: ["--test", "--test-concurrency=1", ...t] });

const CPT = join(FN, "_lib/comprar-passe-tipado.mjs");
const APU = join(FN, "_lib/apuracao-especial.mjs");
const CRON = join(FN, "scheduled-encerrar-especial.mjs");
const PAINEL = join(FE, "src/components/edicao-especial/PainelVencedorEspecial.jsx");
const HOOK = join(FE, "src/components/edicao-especial/useResultadoEspecial.js");
const LANCE = join(FN, "lance-relampago.mjs");
const T110D = "utac110d-dois-passes.test.mjs";
const T110E = "utac110e-eco-quildo.test.mjs";
const T110I1 = "utac110i1-validar-compra-google.test.mjs";
const T110N = "utac110n-pontos-lance.test.mjs";
const T138 = "utac138-apuracao-especial.test.mjs";
const T138V = "utac138-seg4-validador.test.mjs";
const FTOP10 = "src/components/edicao-especial/__tests__/utac138-top10.test.mjs";

const ORIGINAL = [
  { id: "V1", f: CPT, de: "  if (ctx.ehRelampago) {\n    let c;", para: "  if (true) {\n    let c;",
    t: back(T110D, T110I1), desc: "o Passe PROGRAMADO também recebe o bónus" },
  { id: "V2", f: CPT, de: "PONTOS_LANCE_BONUS_PASSE_RELAMPAGO * quantidade, MOTIVO_BONUS_PASSE_RELAMPAGO", para: "PONTOS_LANCE_BONUS_PASSE_RELAMPAGO, MOTIVO_BONUS_PASSE_RELAMPAGO",
    t: back(T110D, T110I1), desc: "bónus não multiplica por N" },
  { id: "V3", f: CPT, de: "? { bonusPontosLance: PONTOS_LANCE_BONUS_PASSE_RELAMPAGO * ctx.quantidade,", para: "? { bonusPontosLance: PONTOS_LANCE_BONUS_PASSE_RELAMPAGO,",
    t: back(T110D, T110I1), desc: "a resposta anuncia 100 em vez de 100 × N" },
  { id: "V4", f: CPT, de: "    ...camposLegadoRelampago(ctx), ...camposBonusRelampago(ctx, cred) };", para: "    ...camposLegadoRelampago(ctx) };",
    t: back(T110I1), desc: "Google: a 1.ª creditação não anuncia o bónus" },
  { id: "V5", f: join(FN, "validar-compra-google.mjs"), de: "...(Number.isInteger(creditado.bonusPontosLance)", para: "...(false && Number.isInteger(creditado.bonusPontosLance)",
    t: back(T110I1), desc: "validar-compra-google deixa cair os campos do bónus" },
  { id: "V6", f: CPT, de: "  const ctx = { ...ctxPedido, quantidade: quantidadeJaCreditada(st.reg, ref) };\n",
    para: "  const ctx = { ...ctxPedido, quantidade: quantidadeJaCreditada(st.reg, ref) };\n  if (ctx.ehRelampago) await creditarBonusLanceDoPasse(endereco, ref, ctx.quantidade);\n",
    t: back(T110D, T110I1), desc: "completarPendentes credita o bónus (retroactivo)" },
  { id: "V7", f: CPT, de: "    if (cred.etapa === \"lance\") {\n      const reembolsado = await reembolsar();", para: "    if (cred.etapa === \"lance\") {\n      const reembolsado = false;",
    t: back(T110D), desc: "falha do bónus não devolve os R$" },
  { id: "V8", f: join(FN, "_lib/ledger-lance.mjs"), de: "export const MOTIVO_BONUS_PASSE_RELAMPAGO = \"bonus-passe-relampago\";", para: "export const MOTIVO_BONUS_PASSE_RELAMPAGO = \"passe-relampago\";",
    t: back(T110N, T110D), desc: "bónus gravado com o motivo antigo (200)" },
  { id: "V9", f: APU, de: ".filter((l) => l && valorValido(l.valorCentavos) && typeof", para: ".filter((l) => l && true && typeof",
    t: back(T138), desc: "lances com valor inválido entram na apuração" },
  { id: "V10", f: APU, de: "participantes: new Set(validos.map((l) => l.endereco.toLowerCase())).size,", para: "participantes: validos.length,",
    t: back(T138), desc: "participantes = nº de lances (não de endereços distintos)" },
  { id: "V11", f: APU, de: "catch { return { ok: false, code: \"gravacao_falhou\" }; }", para: "catch { /* engolido */ }",
    t: back(T138), desc: "falha da gravação do Blob engolida (serve um resultado não gravado)" },
  { id: "V12", f: CRON, de: "    linha.apuracao = await apurarNoTick(e, agoraMs);", para: "    linha.apuracao = \"desligada\";",
    t: back(T138, "mc943-scheduled-encerrar.test.mjs"), desc: "o cron deixa de apurar (o tick nunca chama a apuração)" },
  { id: "V13", f: PAINEL, de: "  if (erro && !apurada) return moldura(", para: "  if (erro) return moldura(",
    t: front(FTOP10), desc: "erro on-chain esconde a apuração pronta" },
  { id: "V14", f: HOOK, de: "&& typeof respApuracao.data.pronto === \"boolean\" ? respApuracao.data : null;", para: "? respApuracao.data : null;",
    t: front(FTOP10, "src/components/edicao-especial/__tests__/especial.test.mjs"), desc: "hook aceita qualquer objecto como apuração" },
  { id: "V15", f: HOOK, de: "if (resultado?.consolidado && ap?.pronto && intervalo)", para: "if (resultado?.consolidado && intervalo)",
    t: front(FTOP10, "src/components/edicao-especial/__tests__/especial.test.mjs"), desc: "o polling pára sem esperar pela apuração" },
  { id: "V16", f: LANCE, de: "e o Passe Relâmpago dá +200.", para: "e o Passe Relâmpago dá +999.",
    t: back("utac110n-pontos-lance.test.mjs", "utac110d-dois-passes.test.mjs"), desc: "texto visível do 400 saldo_pontos_insuficiente com o número errado" },
  { id: "V17", f: APU, de: "export const MARGEM_FECHO_MS = 3_000;", para: "export const MARGEM_FECHO_MS = 1;",
    t: back(T138), desc: "margem de fecho de 1 ms" },
];

const CORRECCOES = [
  { id: "W1", f: APU, de: "export const MARGEM_FECHO_MS = 65_000;", para: "export const MARGEM_FECHO_MS = 3_000;",
    t: back(T138V), desc: "margem volta aos 3 s (lance mainnet ainda no tx.wait(1) fica de fora)" },
  { id: "W2", f: CRON, de: "    const r = await apurarEspecial(e.id, { agoraMs });", para: "    const r = await apurarEspecial(e.id, { agoraMs: agoraMs + 120_000 });",
    t: back(T138V), desc: "o cron salta a margem (apura antes de o lance em voo ser gravado)" },
  { id: "W3", f: APU, de: "const nomePublico = (n) => {", para: "const nomePublico = (n) => typeof n === \"string\" && n.trim() ? n.trim().slice(0, 80) : null;\nconst _nomePublicoOriginal = (n) => {",
    t: back(T138V), desc: "o e-mail volta a sair no Top 10 público" },
  { id: "W4", f: CRON, de: "    linha.apuracao = await apurarNoTick(e, agoraMs);", para: "    linha.apuracao = \"desligada\";",
    t: back(T138V), desc: "o tick deixa de apurar" },
  { id: "W5", f: LANCE, de: "e o Passe Relâmpago dá +${LEDGER_LANCE.PONTOS_LANCE_BONUS_PASSE_RELAMPAGO}.", para: "e o Passe Relâmpago dá +200.",
    t: back("utac129-lance-sem-passe.test.mjs"), desc: "a mensagem visível volta a dizer +200" },
  { id: "W6", f: PAINEL, de: "  const top10Coerente = !resultado?.consolidado", para: "  const top10Coerente = true || !resultado?.consolidado",
    t: front(FTOP10), desc: "Top 10 com um 🏆 diferente do vencedor on-chain" },
  { id: "W7", f: APU, de: "export const MARGEM_FECHO_MS = 65_000;", para: "export const MARGEM_FECHO_MS = 30_000;",
    t: back(T138V), desc: "margem abaixo do limite de uma função síncrona (30 s)" },
  { id: "W8", f: APU, de: "  return t && !t.includes(\"@\") ? t : null;", para: "  return t || null;",
    t: back(T138V), desc: "nomePublico deixa de filtrar o «@»" },
];

const fase = process.argv[2] === "correccoes" ? "correccoes" : "original";
const MUTANTES = fase === "correccoes" ? CORRECCOES : ORIGINAL;
console.log(`fase: ${fase} (${MUTANTES.length} mutantes)\n`);

let mortos = 0; const vivos = [];
for (const m of MUTANTES) {
  const antes = md5(m.f);
  const bak = join(BAK, `${m.id}.bak`);
  copyFileSync(m.f, bak);
  const src = readFileSync(m.f, "utf8");
  const n = src.split(m.de).length - 1;
  if (n !== 1) { console.log(`${m.id} ÂNCORA ${n}× — mutante inválido (${m.desc})`); vivos.push(`${m.id}(âncora)`); continue; }
  try {
    writeFileSync(m.f, src.replace(m.de, () => m.para));
    const r = spawnSync("node", m.t.args, { cwd: m.t.cwd, encoding: "utf8", timeout: 300_000 });
    const out = `${r.stdout}${r.stderr}`;
    const fail = Number((out.match(/(?:ℹ|#) fail (\d+)/) || [])[1] ?? NaN);
    const morto = r.status !== 0 && fail > 0;
    console.log(`${m.id} ${morto ? "RED  (morto)" : "VERDE (VIVO)"} fail=${fail} — ${m.desc}`);
    if (morto) mortos++; else vivos.push(m.id);
  } finally {
    copyFileSync(bak, m.f);
    const depois = md5(m.f);
    if (depois !== antes) { console.log(`${m.id} RESTAURO FALHOU — md5 ${depois} ≠ ${antes} — PARAR`); process.exit(2); }
  }
}
console.log(`\nmortos ${mortos}/${MUTANTES.length}${vivos.length ? ` · vivos: ${vivos.join(", ")}` : ""} · md5 restaurado em todos`);
process.exit(vivos.length ? 1 : 0);

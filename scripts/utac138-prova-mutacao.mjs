#!/usr/bin/env node
// utac138-prova-mutacao.mjs — UTAC138. Prova por mutação dos testes novos/alterados (GATE 7 / T1).
// Cada mutante: cópia de segurança FORA do repo → aplica (falha se a âncora não casar) → corre o teste
// dirigido → tem de ficar VERMELHO → restaura da cópia → confere o md5 (o repo nunca fica mutado).
// Uso (raiz do repo): node scripts/utac138-prova-mutacao.mjs

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
const BAK = mkdtempSync(join(tmpdir(), "utac138-mut-"));

const back = (t) => ({ cwd: FN, args: ["--test", "--experimental-test-module-mocks", `_tests/${t}`] });
const front = (t) => ({ cwd: FE, args: ["--test", "--test-concurrency=1", t] });

const MUTANTES = [
  { id: "M1", f: join(FN, "_lib/ledger-lance.mjs"), de: "export const PONTOS_LANCE_BONUS_PASSE_RELAMPAGO = 100;", para: "export const PONTOS_LANCE_BONUS_PASSE_RELAMPAGO = 0;",
    t: back("utac110d-dois-passes.test.mjs"), desc: "bónus 100 → 0" },
  { id: "M2", f: join(FN, "_lib/comprar-passe-tipado.mjs"), de: "  if (ctx.ehRelampago) {\n    let c;", para: "  if (false) {\n    let c;",
    t: back("utac110i1-validar-compra-google.test.mjs"), desc: "a cadeia deixa de creditar o bónus (Google Play)" },
  { id: "M3", f: join(FN, "_lib/comprar-passe-tipado.mjs"), de: "  if (ctx.ehRelampago) revLance = await reverterMovimentoLance", para: "  if (false) revLance = await reverterMovimentoLance",
    t: back("utac110e-eco-quildo.test.mjs"), desc: "falha do ECOQUILDO não desfaz o bónus" },
  { id: "M4", f: join(FN, "_lib/comprar-passe-tipado.mjs"), de: "      const rev = await reverterMovimento(endereco, ref).catch(() => ({ ok: false, code: \"ERRO_DB\" }));\n      if (!(rev.ok && rev.revertido)) {\n        captureSecurityAlert(`${ctx.nome}_reversao_pontos_falhou`",
    para: "      const rev = { ok: true, revertido: true };\n      if (!(rev.ok && rev.revertido)) {\n        captureSecurityAlert(`${ctx.nome}_reversao_pontos_falhou`",
    t: back("utac110d-dois-passes.test.mjs"), desc: "falha do bónus não desfaz o ponto de fidelidade" },
  { id: "M5", f: join(FN, "_lib/apuracao-especial.mjs"), de: ".filter((l) => contagem.get(l.valorCentavos) === 1)", para: ".filter((l) => contagem.get(l.valorCentavos) >= 1)",
    t: back("utac138-apuracao-especial.test.mjs"), desc: "lance repetido ganha" },
  { id: "M6", f: join(FN, "_lib/apuracao-especial.mjs"), de: ".sort((a, b) => a.valorCentavos - b.valorCentavos);", para: ".sort((a, b) => b.valorCentavos - a.valorCentavos);",
    t: back("utac138-apuracao-especial.test.mjs"), desc: "Top 10 dos MAIORES" },
  { id: "M7", f: join(FN, "_lib/apuracao-especial.mjs"), de: "  if (agoraMs <= fim) return { ok: true, pronto: false, motivo: \"em_curso\"", para: "  if (agoraMs < fim) return { ok: true, pronto: false, motivo: \"em_curso\"",
    t: back("utac138-apuracao-especial.test.mjs"), desc: "apura no último ms (ainda aceita lances)" },
  { id: "M8", f: join(FN, "_lib/apuracao-especial.mjs"), de: "  if (agoraMs <= fim + MARGEM_FECHO_MS) return", para: "  if (false) return",
    t: back("utac138-apuracao-especial.test.mjs"), desc: "sem margem de fecho" },
  { id: "M9", f: join(FN, "_lib/apuracao-especial.mjs"), de: "    if (gravado && gravado.edicaoId === edicaoId) return", para: "    if (false) return",
    t: back("utac138-apuracao-especial.test.mjs"), desc: "não idempotente (reapura sempre)" },
  { id: "M10", f: join(FN, "_lib/apuracao-especial.mjs"), de: "? `${e.slice(0, 6)}…${e.slice(-4)}`.toLowerCase() : null;", para: "? e.toLowerCase() : null;",
    t: back("utac138-apuracao-especial.test.mjs"), desc: "endereço inteiro sai (R4)" },
  { id: "M11", f: join(FN, "_lib/apuracao-especial.mjs"), de: "  const top10 = unicos.slice(0, topN).map", para: "  const top10 = unicos.slice(0, topN + 1).map",
    t: back("utac138-apuracao-especial.test.mjs"), desc: "Top 11" },
  // UTAC138-SEG4: o cron já não dorme (margem de 65 s); o M12 passa a ser «o cron apura dentro da margem».
  { id: "M12", f: join(FN, "scheduled-encerrar-especial.mjs"), de: "    const r = await apurarEspecial(e.id, { agoraMs });", para: "    const r = await apurarEspecial(e.id, { agoraMs: agoraMs + 120_000 });",
    t: back("utac138-apuracao-especial.test.mjs"), desc: "o cron apura dentro da margem de fecho" },
  { id: "M13", f: join(FE, "src/components/edicao-especial/PainelVencedorEspecial.jsx"), de: "  const apurada = apuracao?.pronto === true && Array.isArray(apuracao.top10);", para: "  const apurada = false;",
    t: front("src/components/edicao-especial/__tests__/utac138-top10.test.mjs"), desc: "o painel ignora a apuração" },
  { id: "M14", f: join(FE, "src/components/edicao-especial/ResultadosEdicao.jsx"), de: "    .slice(0, 10);", para: "    .slice(0, 11);",
    t: front("src/components/edicao-especial/__tests__/utac138-top10.test.mjs"), desc: "o painel mostra mais de 10" },
  { id: "M15", f: join(FE, "src/lib/pontosLance.js"), de: "  pontosLancePorPasse: 100,", para: "  pontosLancePorPasse: 200,",
    t: front("src/__tests__/utac110j5-pontos-lance.test.mjs"), desc: "o frontend anuncia um bónus diferente do backend" },
  { id: "M16", f: join(FE, "src/components/TermosConsentimento.jsx"), de: 'export const VERSAO_CONSENTIMENTO = "3.5";', para: 'export const VERSAO_CONSENTIMENTO = "3.4";',
    t: front("src/__tests__/utac110h1-vocabulario.test.mjs"), desc: "gate fica em 3.4" },
  { id: "M17", f: join(RAIZ, "docs/GUTO-REGULAMENTO.md"), de: "O Passe Relâmpago concede, adicionalmente, um bônus de 100 (cem)", para: "O Passe Relâmpago concede, adicionalmente, um bônus de 200 (duzentos)",
    t: back("utac110n-pontos-lance.test.mjs"), desc: "o GUTO lê um bónus diferente do Regulamento" },
  // ── R18-138-G/H/I (decisões do operador depois do validador) ──
  { id: "M18", f: join(FN, "scheduled-encerrar-especial.mjs"), de: "    if (marcas && agoraMs <= msDe(e.termino_em) + MARGEM_CONSOLIDACAO_MS) {", para: "    if (false) {",
    t: back("mc943-scheduled-encerrar.test.mjs"), desc: "consolidação on-chain sem margem (H)" },
  { id: "M19", f: join(FN, "_lib/comprar-passe-tipado.mjs"), de: "  if (ctx.ehRelampago && bonusDevidoNoRetry(st.reg, ref)) {", para: "  if (false) {",
    t: back("utac110d-dois-passes.test.mjs"), desc: "o retry não completa o bónus (I)" },
  { id: "M20", f: join(FN, "_lib/comprar-passe-tipado.mjs"), de: "  return Number.isFinite(ms) && ms >= Date.parse(CORTE_BONUS_RETRY_ISO);", para: "  return true;",
    t: back("utac110d-dois-passes.test.mjs"), desc: "o retry dá o bónus a compras antigas (I, retroactivo)" },
  { id: "M21", f: join(FN, "_lib/consentimento.mjs"), de: " && !VERSOES_GATE_LEGADO.includes(c.versao)", para: "",
    t: back("mc104-consentimento.test.mjs"), desc: "o APK v11 (3.4) volta a ser recusado (G)" },
];

let mortos = 0, vivos = [];
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

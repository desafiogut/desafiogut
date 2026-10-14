#!/usr/bin/env node
// UTAC110h.1 — PROVA DE MUTAÇÃO (GATE 7). Cada mutante reintroduz um defeito FECHADO neste UTAC
// (gate legal v4 · GUTO «+1 senha» · vocabulário antigo · rota do v5 atrás do gate) e exige RED
// nos testes do alvo.
//
// Padrão herdado do UTAC110g/109h.2: âncoras com o EOL do ficheiro EM DISCO, `count == 1`,
// backup FORA do repo, **baseline verde exigida antes de mutar** (um teste já vermelho tornaria
// todo o mutante «mordido» por vacuidade), MORDEU só com `fail > 0` medido (nunca «não li o número»),
// restauro conferido por sha256.
//
// Correr da raiz do repo:   node scripts/utac110h1-prova-mutacao.mjs
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut", "frontend");
const FN = join(FE, "netlify", "functions");
const TMP = mkdtempSync(join(tmpdir(), "utac110h1-mut-"));

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 12);
const eol = (d) => (d.includes("\r\n") ? "\r\n" : "\n");

function correr(qual, ficheiro) {
  const [args, cwd] = qual === "backend"
    ? [["--test", "--experimental-test-module-mocks", `_tests/${ficheiro}`], FN]
    : [["--test", "--test-concurrency=1", ficheiro], FE];
  const r = spawnSync("node", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  const s = `${r.stdout || ""}${r.stderr || ""}`;
  const n = {};
  for (const m of s.matchAll(/^ℹ (pass|fail) (\d+)/gm)) n[m[1]] = Number(m[2]);
  return { pass: n.pass, fail: n.fail };
}

const G = ["frontend", "src/components/__tests__/citacoesRegulamento.test.mjs"];
const R = ["frontend", "src/__tests__/utac110h1-gate-render.test.mjs"];
const V = ["frontend", "src/__tests__/utac110h1-vocabulario.test.mjs"];
const GU = ["backend", "utac110h1-guto-indicacao.test.mjs"];
const C104 = ["backend", "mc104-consentimento.test.mjs"];

// [nome, ficheiro (relativo a FE), antes, depois, alvos]
const MUTANTES = [
  ["M1  A  o gate volta a falar de senhas (Art. 8º)", "src/components/TermosConsentimento.jsx",
    "utilizador 10 (dez) pontos de fidelidade.", "utilizador 10 (dez) pontos de fidelidade ou 1 senha.", [G, R]],
  ["M2  A  texto inventado num bloco (Art. 14º «torneio»)", "src/components/TermosConsentimento.jsx",
    "A Oferta Relâmpago é uma competição de", "A Oferta Relâmpago é um torneio de", [G, R]],
  ["M3  A  a versão do gate volta a 2.0 (aceites do v4 continuam a valer)", "src/components/TermosConsentimento.jsx",
    'export const VERSAO_CONSENTIMENTO = "3.0";', 'export const VERSAO_CONSENTIMENTO = "2.0";', [R, V, C104]],
  ["M4  A  o servidor fica na 2.0 (recusaria o aceite novo)", "netlify/functions/_lib/consentimento.mjs",
    'export const VERSAO_GATE = "3.0";', 'export const VERSAO_GATE = "2.0";', [V, C104]],
  ["M5  A  o aceite deixa de exigir a 4.ª caixa (privacidade)", "src/components/TermosConsentimento.jsx",
    "const tudoAceito = lido && maiores && termos && privacidade;", "const tudoAceito = lido && maiores && termos;", [R]],
  ["M6  A  /regras-oficiais volta a ficar atrás do gate", "src/Boot.jsx",
    'const ROTAS_PUBLICAS = ["/excluir-conta", "/privacidade", "/regras-oficiais"];',
    'const ROTAS_PUBLICAS = ["/excluir-conta", "/privacidade"];', [G]],
  ["M7  A  o gate perde o link para as Regras Oficiais", "src/components/TermosConsentimento.jsx",
    '<a href="/regras-oficiais" style={estilos.link}>Regras Oficiais</a>.\n          </p>',
    'Regras Oficiais.\n          </p>', [G, R]],
  ["M7b A  a caixa «Li e compreendi» perde o link para o v5", "src/components/TermosConsentimento.jsx",
    '<a href="/regras-oficiais" style={estilos.link}>Regras Oficiais</a>.\n            </span>',
    'Regras Oficiais.\n            </span>', [G, R]],
  ["M8  A  vigência volta a 5 de outubro (data do v4)", "src/components/TermosConsentimento.jsx",
    ">2 de novembro de 2026</strong>", ">5 de outubro de 2026</strong>", [G, R]],
  ["M9  B  o GUTO volta a prometer +1 senha (comum)", "netlify/functions/_lib/guto-perfis.mjs",
    "você ganha +50 pontos de lance na hora", "você ganha +1 senha na hora", [GU]],
  ["M10 B  o GUTO promete o ECOQUILDO do Art. 51º (não ligado)", "netlify/functions/_lib/guto-perfis.mjs",
    "+50 pontos de lance para si e +50 para o indicado", "+50 pontos de lance e 2 ECOQUILDO para si e +50 para o indicado", [GU]],
  ["M11 B  o limite mensal dito pelo GUTO diverge do código", "netlify/functions/_lib/guto-perfis.mjs",
    "(até 10 indicações creditadas por mês)", "(até 20 indicações creditadas por mês)", [GU]],
  ["M12 C  Privacidade volta a «torneio de habilidade»", "src/pages/Privacidade.jsx",
    "plataforma de competição de habilidade", "plataforma de torneio de habilidade", [V]],
  ["M13 C  Meus Ativos volta a «Torneio de habilidade» (dicionário)", "src/i18n/pt.js",
    '"🏆 Competição de habilidade"', '"🏆 Torneio de habilidade"', [V, ["frontend", "src/i18n/__tests__/glossario.test.mjs"]]],
  ["M14 C  o erro 402 do resgate volta a «pontos de compra» (cliente)", "src/hooks/useResgatarCartao.js",
    "50 pontos de fidelidade para resgatar", "50 pontos de compra para resgatar", [V, ["frontend", "src/pages/__tests__/utac106g-resgate.test.mjs"]]],
  ["M15 C  o 402 do servidor volta a «pontos de compra»", "netlify/functions/resgatar-cartao.mjs",
    "pontos de fidelidade para resgatar o cartão`", "pontos de compra para resgatar o cartão`", [V]],
];

// ── baseline: todos os alvos verdes ANTES de mutar ─────────────────────────────
const todosAlvos = [...new Map(MUTANTES.flatMap((m) => m[4]).map((a) => [a.join(":"), a])).values()];
for (const [q, f] of todosAlvos) {
  const r = correr(q, f);
  if (!(r.fail === 0 && r.pass > 0)) { console.error(`BASELINE VERMELHA/NÃO MEDIDA: ${f} pass=${r.pass} fail=${r.fail}`); process.exit(2); }
}
console.log(`baseline verde em ${todosAlvos.length} ficheiros de teste · backup em ${TMP}\n`);

let sobreviventes = 0, ancoras = 0;
for (const [nome, rel, antes, depois, alvos] of MUTANTES) {
  const caminho = join(FE, rel);
  const original = readFileSync(caminho);
  const txt = original.toString("utf8");
  const nl = eol(txt);
  const a = antes.replaceAll("\n", nl), b = depois.replaceAll("\n", nl);
  const n = txt.split(a).length - 1;
  if (n !== 1) { console.log(`[ANCORA] ${nome}  count=${n}\n`); ancoras++; continue; }
  const hAntes = sha(caminho);
  const bak = join(TMP, `${rel.replace(/[\\/]/g, "_")}.bak`);
  copyFileSync(caminho, bak);
  writeFileSync(caminho, txt.replace(a, () => b), "utf8");
  if (sha(caminho) === hAntes) { console.log(`[NAO ENTROU] ${nome}\n`); ancoras++; continue; }
  try {
    const linhas = alvos.map(([q, f]) => { const r = correr(q, f); return { f, ...r }; });
    const mordeu = linhas.some((l) => Number.isInteger(l.fail) && l.fail > 0);
    console.log(`[${mordeu ? "MORDEU" : "SOBREVIVEU"}] ${nome}\n   ${linhas.map((l) => `${l.f.split("/").pop()}: pass=${l.pass} fail=${l.fail}`).join(" | ")}`);
    if (!mordeu) sobreviventes++;
  } finally {
    copyFileSync(bak, caminho);
    if (sha(caminho) !== hAntes) { console.error(`RESTAURO FALHOU: ${caminho}`); process.exitCode = 1; }
  }
}
console.log(`\n${MUTANTES.length - sobreviventes - ancoras}/${MUTANTES.length} MORDERAM · SOBREVIVENTES: ${sobreviventes} · ÂNCORAS: ${ancoras}`);
if (sobreviventes > 0 || ancoras > 0) process.exitCode = 1;

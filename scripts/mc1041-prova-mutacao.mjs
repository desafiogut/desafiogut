#!/usr/bin/env node
// MC104.1 — prova de mutação (R16) sobre src/hooks/useRecursosApp.js. Cada mutante: alvo com EXACTAMENTE
// 1 ocorrência (entrou), aplica, corre o teste, restaura BYTE-IDÊNTICO. Uso: node scripts/mc1041-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut", "frontend");
const HOOK = join(FE, "src", "hooks", "useRecursosApp.js");
const T = ["--test", "src/hooks/useRecursosApp.test.mjs"];

const M = [
  ["M1 default isProgramadaSenhasAtiva", "isProgramadaSenhasAtiva:  true", "isProgramadaSenhasAtiva:  false"],
  ["M2 default isTorneioVisivel", "isTorneioVisivel:         true", "isTorneioVisivel:         false"],
  ["M3 default isSenhaBonusAtiva", "isSenhaBonusAtiva:        true", "isSenhaBonusAtiva:        false"],
  ["M4 default isCampanhaIndicacaoAtiva", "isCampanhaIndicacaoAtiva: false", "isCampanhaIndicacaoAtiva: true"],
  ["M5 default limitePassesIndicacao", "limitePassesIndicacao:    5", "limitePassesIndicacao:    6"],
  ["M6 sem Object.hasOwn (protótipo conta)", "const v = Object.hasOwn(cfg, chave) ? cfg[chave] : undefined;", "const v = cfg[chave];"],
  ["M7 coerção de booleano", '(typeof v === "boolean" ? v : padrao)', "(v === undefined ? padrao : Boolean(v))"],
  ["M8 isInteger em vez de isSafeInteger", "Number.isSafeInteger(v) && v >= 0", "Number.isInteger(v) && v >= 0"],
  ["M9 aceita negativo", "Number.isSafeInteger(v) && v >= 0", "Number.isSafeInteger(v)"],
  ["M10 caminho Supabase sem as flags", "    ...lerFlagsTransicao(config),\n", ""],
  ["M11 caminho função sem as flags", "      ...lerFlagsTransicao(data), // a mesma regra estrita sobre a resposta da função\n", ""],
  ["M12 caminho função sem regra estrita", "...lerFlagsTransicao(data),", "...Object.fromEntries(Object.keys(DEFAULT_FLAGS_TRANSICAO).map((k) => [k, data[k] ?? DEFAULT_FLAGS_TRANSICAO[k]])),"],
  ["M13 fallback local sem as flags", "Boolean(DEFAULT_RECURSOS.isPagamentoNativoAtivo[plat]),\n    ...DEFAULT_FLAGS_TRANSICAO,\n", "Boolean(DEFAULT_RECURSOS.isPagamentoNativoAtivo[plat]),\n"],
  ["M14 estado inicial sem as flags", '    plataforma: "pwa",\n    ...DEFAULT_FLAGS_TRANSICAO,\n', '    plataforma: "pwa",\n'],
  ["M15 regressão numa chave antiga", 'isLeilaoAtivo: ler("isLeilaoAtivo"),', 'isLeilaoAtivo: ler("isPagamentoNativoAtivo"),'],
  ["M16 lê mapa por plataforma", "const v = Object.hasOwn(cfg, chave) ? cfg[chave] : undefined;", 'const v0 = Object.hasOwn(cfg, chave) ? cfg[chave] : undefined; const v = v0 && typeof v0 === "object" ? v0.pwa : v0;'],
  // Pós-validador (SEG1): os 2 sobreviventes dele, agora com teste de COMPORTAMENTO (hook montado).
  ["V3 tempo real ignora as flags", "setEstado({ ...resolverParaPlataforma(valor, detectarPlataforma()), isLoading: false });", "setEstado({ ...resolverParaPlataforma(valor, detectarPlataforma()), ...DEFAULT_FLAGS_TRANSICAO, isLoading: false });"],
  ["V9 estado inicial sobrescreve uma flag", "    ...DEFAULT_FLAGS_TRANSICAO,\n    isLoading: true,\n", "    ...DEFAULT_FLAGS_TRANSICAO,\n    isLoading: true,\n    isTorneioVisivel: false,\n"],
];

const orig = readFileSync(HOOK, "utf8");
const eol = orig.includes("\r\n") ? "\r\n" : "\n";
let problemas = 0;
try {
  for (const [nome, de, para] of M) {
    const deE = de.replace(/\n/g, eol), paraE = para.replace(/\n/g, eol);
    const n = orig.split(deE).length - 1;
    if (n !== 1) { console.log(`NAO_ENTROU  ${nome} (ocorrências: ${n})`); problemas++; continue; }
    writeFileSync(HOOK, orig.replace(deE, paraE));
    const r = spawnSync("node", T, { cwd: FE, encoding: "utf8" });
    const fail = Number((r.stdout.match(/^ℹ fail (\d+)$/m) || [])[1]);
    if (Number.isNaN(fail)) { console.log(`NAO_MEDI    ${nome}`); problemas++; }
    else if (fail > 0) console.log(`RED ✓       ${nome}  (fail ${fail})`);
    else { console.log(`SOBREVIVEU  ${nome}`); problemas++; }
  }
} finally {
  writeFileSync(HOOK, orig);
}
console.log(readFileSync(HOOK, "utf8") === orig ? "restaurado: byte-idêntico" : "!!! NÃO RESTAURADO");
console.log(`total ${M.length} · problemas ${problemas}`);
process.exit(problemas ? 1 : 0);

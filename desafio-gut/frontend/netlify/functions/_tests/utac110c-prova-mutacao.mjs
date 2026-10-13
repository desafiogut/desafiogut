// utac110c-prova-mutacao.mjs — MARTELO DE MUTAÇÃO do UTAC110c-1 (R16 / GATE 7 / T1).
//
// ⚠️ NÃO É UM FICHEIRO DA SUÍTE: o harness canónico descobre `_tests/*.test.mjs`; este ficheiro
// chama-se `.mjs` (sem `.test.`) de propósito, para não ser apanhado pela descoberta. É uma
// FERRAMENTA de desenvolvimento, corrida à mão quando o GUTO muda.
//
// O que faz, por mutante: (1) lê o ficheiro e conta a âncora (tem de aparecer EXACTAMENTE 1×);
// (2) aplica a substituição e imprime a linha mutada — prova de que o mutante ENTROU (T5: sem
// isto, um «sem RED» pode ser um mutante que nunca chegou ao ficheiro); (3) corre o teste ALVO;
// (4) restaura do original guardado em memória e confirma o sha256 idêntico.
//
// Uso (a partir de `desafio-gut/frontend/netlify/functions`):
//   node _tests/utac110c-prova-mutacao.mjs
//
// Um mutante equivalente declarar-se-ia; aqui não há nenhum: todos os 8 têm um teste que os mata.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const FUNCTIONS = process.cwd();
const BACKUP = join(tmpdir(), "utac110c-mutacao-backup");
mkdirSync(BACKUP, { recursive: true });

const P = (rel) => join(FUNCTIONS, rel);
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const curto = (s) => s.slice(0, 12);

const GUTO = "_lib/guto-perfis.mjs";
const MOD = "_lib/guto-regulamento.mjs";
const CHAT = "chatbot.mjs";
const DOC = "../../../../docs/GUTO-REGULAMENTO.md";   // UTAC110c-1b: o ficheiro do Regulamento
const T_VIA_B = "_tests/utac110c-guto-via-b.test.mjs";
const T_MC963 = "_tests/mc963-guto-regulamento-v4.test.mjs";

/** @type {{n:string, ficheiro:string, ancora:string, substituto:string, alvo:string, porque:string}[]} */
const MUTANTES = [
  {
    n: "M1", ficheiro: GUTO, alvo: T_VIA_B,
    ancora: "REGRA DE LINGUAGEM (obrigatória):",
    substituto: "REGRA DE LINGUAGEM (obrigatória — Portaria SPA/MF 1.207/2024):\n- O DesafioGUT é um TORNEIO DE HABILIDADE.",
    porque: "repõe o modelo antigo na regra de linguagem",
  },
  {
    n: "M2", ficheiro: CHAT, alvo: T_VIA_B,
    ancora: "max_tokens:  4000,",
    substituto: "max_tokens:  512,",
    porque: "volta a cortar a resposta a meio (max_tokens 512)",
  },
  {
    n: "M3", ficheiro: GUTO, alvo: T_VIA_B,
    ancora: 'return base + REGRA_LINGUAGEM + REGRA_REGULAMENTO + "\\n\\n" + REGULAMENTO_TEXTO;',
    substituto: "return base + REGRA_LINGUAGEM + REGRA_REGULAMENTO;",
    porque: "tira o Regulamento do prompt (volta a responder «de memória»)",
  },
  {
    n: "M4", ficheiro: GUTO, alvo: T_MC963,
    ancora: '"6":  "O Passe Desafio é o produto digital adquirido pelo utilizador, com preço fixo de R$ 2,00',
    substituto: '"6":  "O Passe Desafio é o produto digital adquirido pelo utilizador, com preço fixo de R$ 5,00',
    porque: "âncora com um preço que o Regulamento não diz",
  },
  {
    n: "M5", ficheiro: MOD, alvo: T_MC963,
    ancora: "Art. 8º — Cada Passe Desafio adquirido concede ao utilizador 10 (dez) pontos de fidelidade.",
    substituto: "Art. 8º — Cada Passe Desafio adquirido concede ao utilizador 5 (cinco) pontos de fidelidade.",
    porque: "o módulo do runtime divergir do documento (índice de 10 → 5 pontos)",
  },
  {
    n: "M6", ficheiro: CHAT, alvo: T_VIA_B,
    ancora: 'import { respostaPreflight } from "./_lib/cors.mjs";\n',
    substituto: 'import { respostaPreflight } from "./_lib/cors.mjs";\nconst STORE_NAME = "rag";\n',
    porque: "reabre o Blob do índice RAG",
  },
  {
    n: "M7", ficheiro: CHAT, alvo: T_VIA_B,
    ancora: 'import { respostaPreflight } from "./_lib/cors.mjs";\n',
    substituto: 'import { respostaPreflight } from "./_lib/cors.mjs";\nimport { gerarEmbeddingHF } from "./_lib/rag.mjs";\n',
    porque: "reintroduz o HuggingFace em runtime (e o import apagado)",
  },
  {
    n: "M8", ficheiro: GUTO, alvo: T_MC963,
    ancora: "NUNCA cites um artigo que não esteja no texto abaixo e nunca inventes o número de um artigo.",
    substituto: "",
    porque: "tira a proibição de inventar artigos",
  },
  {
    // ⭐ UTAC110c-1b — guarda NOVO (as marcas de formatação). Sem mutante, um teste que nasce
    // verde neste UTAC não provava nada (T1): este repõe o escape do Art. 6º no ficheiro do repo.
    n: "M9", ficheiro: DOC, alvo: T_MC963,
    ancora: "com preço fixo de R$ 2,00 (dois reais)",
    substituto: "com preço fixo de R" + String.fromCharCode(92) + "$ 2,00 (dois reais)",
    porque: "repõe a marca de formatação no Regulamento (o GUTO leria o valor defeituoso)",
  },
  {
    // ⭐ UTAC110c-1b — guarda do ACHADO ⚠️ do validador do 110c-1: o needle-set do teste (1) era
    // CEGO a «Painel Lojista»/«cotas comerciais». Este mutante mete «Painel Lojista» no prompt do
    // perfil `comum` (que NÃO tem resíduo declarado) — se sobrevivesse, o ponto cego continuava lá.
    n: "M10", ficheiro: GUTO, alvo: T_VIA_B,
    ancora: "PERFIL: UTILIZADOR COMUM (autenticado). Amigável e didático. Ajuda com lances, passes,",
    substituto: "PERFIL: UTILIZADOR COMUM (autenticado). Amigável e didático. Ajuda com lances, passes, cotas comerciais, Painel Lojista,",
    porque: "mete modelo antigo NÃO declarado no prompt do perfil comum (ponto cego do needle-set)",
  },
];

function correr(alvo) {
  const r = spawnSync(
    process.execPath,
    ["--test", "--experimental-test-module-mocks", alvo],
    { cwd: FUNCTIONS, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 300_000 },
  );
  const out = (r.stdout || "") + (r.stderr || "");
  const pass = Number((out.match(/^ℹ pass (\d+)$/m) || [])[1] ?? -1);
  const fail = Number((out.match(/^ℹ fail (\d+)$/m) || [])[1] ?? -1);
  const falhados = [...out.matchAll(/^✖ (.+?) \(/gm)].map((m) => m[1]).slice(0, 4);
  return { pass, fail, falhados, code: r.status, saiuVazio: out.trim() === "" };
}

console.log(`MARTELO DE MUTAÇÃO — UTAC110c-1 · ${MUTANTES.length} mutantes`);
console.log(`cwd: ${FUNCTIONS}\n`);

const REFERENCIA = new Map();      // alvo -> resultado sem mutação (medido UMA vez por alvo)
function referencia(alvo) {
  if (!REFERENCIA.has(alvo)) REFERENCIA.set(alvo, correr(alvo));
  return REFERENCIA.get(alvo);
}

let mordem = 0;
let invalidos = 0;
const linhas = [];

for (const m of MUTANTES) {
  const f = P(m.ficheiro);
  const original = readFileSync(f, "utf8");
  const shaAntes = sha(original);

  const n = original.split(m.ancora).length - 1;
  if (n !== 1) {
    invalidos++;
    linhas.push(`${m.n}  ANULADO   âncora aparece ${n}× (esperado 1×) — ${m.ficheiro}`);
    console.log(`✖ ${m.n} ANULADO: a âncora aparece ${n}× em ${m.ficheiro}`);
    continue;
  }

  // ⚠️ A REFERÊNCIA TEM DE SER MEDIDA ANTES DE ESCREVER O MUTANTE. Na 1.ª versão deste ficheiro
  // media-se depois, e o «antes» já continha o mutante: os 8 mutantes apareceram como
  // «SOBREVIVE» com os RED certos no sítio — erro de instrumento, medido e corrigido.
  const antesRun = referencia(m.alvo);

  const mutado = original.split(m.ancora).join(m.substituto);
  writeFileSync(f, mutado, "utf8");
  const relido = readFileSync(f, "utf8");
  const shaDepois = sha(relido);
  const entrou = relido !== original && shaDepois !== shaAntes;
  const linhaMutante = m.substituto
    ? (relido.split("\n").find((l) => l.includes(m.substituto.split("\n")[0])) ?? "(linha não localizada)")
    : "(instrução removida)";

  const res = correr(m.alvo);
  writeFileSync(f, original, "utf8");
  const shaRestaurado = sha(readFileSync(f, "utf8"));
  const restaurado = shaRestaurado === shaAntes;

  const morde = entrou && res.fail > 0 && !res.saiuVazio && antesRun.fail === 0 && !antesRun.saiuVazio;
  if (morde) mordem++;

  console.log(`${morde ? "✅" : "❌"} ${m.n} — ${m.porque}`);
  console.log(`   ficheiro alvo : ${m.alvo}`);
  console.log(`   mutante entrou: ${entrou}  (sha ${curto(shaAntes)} → ${curto(shaDepois)})`);
  console.log(`   linha mutada  : ${linhaMutante.trim().slice(0, 150)}`);
  console.log(`   alvo antes    : pass=${antesRun.pass} fail=${antesRun.fail}${antesRun.saiuVazio ? " [SAÍDA VAZIA]" : ""}`);
  console.log(`   alvo depois   : pass=${res.pass} fail=${res.fail}${res.saiuVazio ? " [SAÍDA VAZIA = NÃO MEDI]" : ""}`);
  if (res.falhados.length) console.log(`   RED em        : ${res.falhados.join(" | ")}`);
  console.log(`   restaurado    : ${restaurado ? `sha256 idêntico (${curto(shaRestaurado)})` : "❌ DIVERGIU"}`);
  console.log("");

  linhas.push(
    `${m.n}  ${morde ? "MORDE" : "SOBREVIVE"}  pass=${res.pass} fail=${res.fail}  restauro=${restaurado ? "idêntico" : "DIVERGIU"}  ${m.porque}`,
  );
}

console.log("─".repeat(78));
console.log("RESUMO");
linhas.forEach((l) => console.log("  " + l));
console.log(`\nmutantes que mordem: ${mordem}/${MUTANTES.length}   anulados: ${invalidos}`);
process.exit(mordem === MUTANTES.length && invalidos === 0 ? 0 : 1);

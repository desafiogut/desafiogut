// utac110c-guto-via-b.test.mjs — UTAC110c-1 (2026-10-12).
//
// O que este ficheiro vigia: o GUTO deixou de ensinar o **modelo ANTIGO** (torneio de habilidade,
// Portaria SPA/MF, senhas) e passou a responder a partir do **Regulamento Oficial 5.0 inteiro**,
// injectado no system prompt. A causa-raiz foi medida no UTAC110b/110b.1 — as 3 fontes de
// conhecimento do GUTO (persona, resumo `ARTIGOS_V4` e índice RAG de 3 excertos) traziam todas o
// vocabulário antigo, e o LLM espelhava-o ao utilizador («o DESAFIOGUT é tipo um leilão sim»).
//
// Os 7 testes pedidos pelo enunciado do UTAC110c-1:
//   (1) o system prompt NÃO contém «Portaria SPA/MF», «senha», «torneio»
//   (2) o system prompt contém «competição de habilidade», «Passe», «pontos»
//   (3) o Regulamento INTEIRO é injectado no prompt
//   (4) `max_tokens` = 4000 — medido no corpo REAL enviado ao LLM, não no fonte
//   (5) BIDIRECCIONAL: o verificador de (1) RECUSA o prompt antigo
//   (6) zero referências ao HuggingFace em código de runtime (+ `_lib/rag.mjs` apagado)
//   (7) zero referências ao Blob `rag` (+ os 2 scripts de build apagados)
//
// ⚠️ CWD da suíte do backend = `netlify/functions`.
//
// node --test --experimental-test-module-mocks _tests/utac110c-guto-via-b.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { obterPromptSystem } from "../_lib/guto-perfis.mjs";
import { REGULAMENTO_TEXTO } from "../_lib/guto-regulamento.mjs";

const FUNCTIONS = process.cwd();                    // .../desafio-gut/frontend/netlify/functions
const RAIZ = resolve(FUNCTIONS, "..", "..", "..", "..");
const PERFIS = ["visitante", "comum", "corporativo", "admin"];

/** Todos os prompts que o GUTO pode receber (4 perfis + o modo de conformidade). */
const PROMPTS = [
  ...PERFIS.map((p) => [p, obterPromptSystem(p, {})]),
  ["conformidade", obterPromptSystem("visitante", { conformidade: true })],
];

// ── (1)+(5) o modelo antigo, e o verificador que o detecta ───────────────────
//
// O verificador é uma FUNÇÃO ISOLADA de propósito: é o mesmo objecto que o teste (5) exercita
// contra o texto antigo. Sem isso, (1) seria uma asserção que nunca se provou capaz de falhar.
const MODELO_ANTIGO = [
  { nome: "Portaria SPA/MF", re: /Portaria\s+SPA/i },
  { nome: "SPA/MF", re: /SPA\s*\/\s*MF/i },
  { nome: "1.207/2024", re: /1\.207\s*\/\s*2024/ },
  { nome: "torneio (de habilidade)", re: /torneio/i },
  { nome: "senha/senhas", re: /\bsenhas?\b/i },
];

/** @returns {string[]} nomes dos marcadores do modelo antigo presentes em `t`. */
function violacoesDeModeloAntigo(t) {
  return MODELO_ANTIGO.filter(({ re }) => re.test(t)).map(({ nome }) => nome);
}

test("(1) o system prompt NÃO ensina o modelo antigo — nos 4 perfis e na conformidade", () => {
  for (const [nome, prompt] of PROMPTS) {
    assert.deepEqual(violacoesDeModeloAntigo(prompt), [],
      `${nome}: o prompt ainda fala em ${violacoesDeModeloAntigo(prompt).join(", ")}`);
  }
});

test("(5) BIDIRECCIONAL: o mesmo verificador RECUSA o prompt ANTIGO (senão (1) não prova nada)", () => {
  const ANTIGO = `REGRA DE LINGUAGEM (obrigatória — Portaria SPA/MF 1.207/2024):
- O DesafioGUT é um TORNEIO DE HABILIDADE com ranking acumulado. NUNCA o chames leilão.
- USA sempre: "torneio de habilidade", "edição", "lance", "estratégia", "saldo", "senha".
- Programado (consome SENHAS); Senha: R$ 2,00 cada.`;
  const v = violacoesDeModeloAntigo(ANTIGO);
  assert.ok(v.length >= 4, `o verificador não mordeu o prompt antigo — viu só ${v.length}: ${v.join(", ")}`);
  // e o positivo continua a passar pelo MESMO verificador
  assert.deepEqual(violacoesDeModeloAntigo(obterPromptSystem("comum", {})), []);
});

// ── (2) o vocabulário Via B ──────────────────────────────────────────────────

test("(2) o system prompt usa o vocabulário Via B", () => {
  for (const [nome, prompt] of PROMPTS) {
    for (const termo of ["competição de habilidade", "Passe", "pontos de fidelidade",
                          "programa de fidelidade", "ECOQUILDO"]) {
      assert.ok(prompt.includes(termo), `${nome}: falta «${termo}»`);
    }
  }
});

// ── (3) o Regulamento inteiro é injectado ────────────────────────────────────

test("(3) o Regulamento INTEIRO é injectado no prompt (12 capítulos, 72 artigos)", () => {
  assert.ok(REGULAMENTO_TEXTO.length > 17_000,
    `o texto do Regulamento tem ${REGULAMENTO_TEXTO.length} chars — medição inválida`);
  assert.match(REGULAMENTO_TEXTO, /CAPÍTULO XII/);
  assert.match(REGULAMENTO_TEXTO, /Art\. 72º/);
  for (const [nome, prompt] of PROMPTS) {
    assert.ok(prompt.includes(REGULAMENTO_TEXTO), `${nome}: o prompt não leva o Regulamento inteiro`);
    assert.ok(prompt.length > 20_000, `${nome}: prompt de ${prompt.length} chars — curto demais`);
  }
});

// ── (4) max_tokens, medido no corpo REAL enviado ao LLM ─────────────────────

test("(4) max_tokens = 4000 no corpo REAL enviado ao LLM (não no fonte)", async () => {
  const { chamarLLM } = await import("../chatbot.mjs?utac110c-maxtokens");
  const antes = { api: process.env.LLM_API_KEY, fetch: globalThis.fetch };
  process.env.LLM_API_KEY = "chave-de-teste-nao-sai-daqui";
  let corpo = null;
  globalThis.fetch = async (_url, init) => {
    corpo = JSON.parse(init.body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: "ok" } }] }) };
  };
  let resposta;
  try {
    resposta = await chamarLLM("quanto custa o passe?", "", {
      systemPrompt: obterPromptSystem("comum", {}),
    });
  } finally {
    globalThis.fetch = antes.fetch;
    if (antes.api === undefined) delete process.env.LLM_API_KEY; else process.env.LLM_API_KEY = antes.api;
  }
  assert.equal(resposta, "ok");
  assert.ok(corpo, "não capturei nenhum corpo — a medição seria vacuosa");
  assert.equal(corpo.max_tokens, 4000, "max_tokens não é 4000 no pedido real");

  const sistema = corpo.messages.find((m) => m.role === "system")?.content || "";
  assert.ok(sistema.includes(REGULAMENTO_TEXTO), "o pedido real não levou o Regulamento inteiro");
  // e a mensagem do utilizador já NÃO mente: não há «sem contexto encontrado» (o contexto é o prompt)
  const util = corpo.messages.at(-1).content;
  assert.match(util, /^Pergunta do usuário: /, `mensagem do utilizador inesperada: ${util.slice(0, 80)}`);
  assert.doesNotMatch(util, /sem contexto encontrado/);
});

// ── (6) e (7) o que SAIU: HF, Blob `rag`, os scripts ────────────────────────

/** Ficheiros de runtime das functions (sem testes, sem dependências, sem artefactos). */
function ficheirosDeRuntime(dir = FUNCTIONS, saida = []) {
  for (const nome of readdirSync(dir)) {
    if (nome === "node_modules" || nome === "_tests" || nome === "graphify-out") continue;
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) ficheirosDeRuntime(p, saida);
    else if (nome.endsWith(".mjs")) saida.push(p);
  }
  return saida;
}

test("(6) ZERO referências ao HuggingFace em código de runtime, e `_lib/rag.mjs` apagado", () => {
  const NEEDLES = [/HF_API_TOKEN/, /huggingface\.co/, /HF_EMBED_URL/, /HF_FORCE_REMOTE/, /gerarEmbeddingHF/];
  // CONTROLO POSITIVO — sem isto, um matcher inerte daria «0 ocorrências» e ler-se-ia como aprovação.
  assert.ok(NEEDLES.some((re) => re.test(`const t = process.env.HF_API_TOKEN;`)),
    "o matcher não morde nem num caso positivo — medição inválida");

  const lista = ficheirosDeRuntime();
  assert.ok(lista.length > 20, `varri só ${lista.length} ficheiros — a varredura estaria morta`);
  const achados = [];
  for (const f of lista) {
    const src = readFileSync(f, "utf8");
    for (const re of NEEDLES) if (re.test(src)) achados.push(`${relative(FUNCTIONS, f)} → ${re}`);
  }
  assert.deepEqual(achados, [], `ainda há uso de HuggingFace em runtime:\n  ${achados.join("\n  ")}`);

  assert.ok(!existsSync(join(FUNCTIONS, "_lib", "rag.mjs")), "`_lib/rag.mjs` devia estar apagado");
  const imports = lista.filter((f) => /[\"'`]\.{1,2}\/_lib\/rag\.mjs[\"'`]|[\"'`]\.\/_lib\/rag\.mjs[\"'`]/.test(readFileSync(f, "utf8")));
  assert.deepEqual(imports.map((f) => relative(FUNCTIONS, f)), [], "alguém voltou a importar rag.mjs");
});

test("(7) ZERO referências ao Blob `rag`, e os 2 scripts de build apagados", () => {
  const NEEDLES = [
    /getStore\(\s*\{[^}]*name:\s*["'`]rag["'`]/,
    /["'`]rag:meta["'`]/,
    /STORE_NAME\s*=\s*["'`]rag["'`]/,
  ];
  assert.ok(NEEDLES.some((re) => re.test(`getStore({ name: "rag", consistency: "strong" })`)),
    "o matcher não morde nem num caso positivo — medição inválida");
  assert.ok(NEEDLES.some((re) => re.test(`const STORE_NAME = "rag";`)),
    "o matcher do STORE_NAME não morde");

  const achados = [];
  for (const f of ficheirosDeRuntime()) {
    const src = readFileSync(f, "utf8");
    for (const re of NEEDLES) if (re.test(src)) achados.push(`${relative(FUNCTIONS, f)} → ${re}`);
  }
  assert.deepEqual(achados, [], "o Blob do índice RAG ainda é usado:\n  " + achados.join("\n  "));

  for (const rel of ["scripts/build-rag-index.mjs", "scripts/mc964-gerar-chunks.mjs",
                     "desafio-gut/frontend/scripts/test-mc9.1.mjs"]) {
    assert.ok(!existsSync(resolve(RAIZ, rel)), `${rel} devia estar apagado`);
  }
});

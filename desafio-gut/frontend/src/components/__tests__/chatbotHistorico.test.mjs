// chatbotHistorico.test.mjs — MC96.1.
//
// O widget tem de ENVIAR o histórico que já tem em memória. Sem isto, o backend fica sem
// contexto e o «sim» volta a ser órfão.
//
// ⚠️ HISTÓRIA DESTE TESTE (a lição do MC95.2, aplicada a mim):
// A 1.ª versão testava só o HELPER (`historicoParaEnviar`). A mutação «o widget deixa de
// enviar o histórico» SOBREVIVEU — remover a chamada não afecta um teste do helper. Ou seja:
// eu estava a verificar num só sentido outra vez. A cablagem passou a ser medida também.
//
// node --test --test-concurrency=1 src/components/__tests__/chatbotHistorico.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { historicoParaEnviar, HISTORICO_MAX_UI } from "../../lib/historicoChat.js";

const lerWidget = () => readFileSync(resolve(process.cwd(), "src/components/ChatbotWidget.jsx"), "utf8");

test("mapeia as mensagens do widget para {role, content}", () => {
  const out = historicoParaEnviar([
    { role: "user", texto: "Como funciona o DesafioGUT?" },
    { role: "bot", texto: "É um torneio de habilidade." },
  ]);
  assert.deepEqual(out, [
    { role: "user", content: "Como funciona o DesafioGUT?" },
    { role: "assistant", content: "É um torneio de habilidade." },
  ]);
});

test("descarta itens sem texto e cartões decorativos", () => {
  const out = historicoParaEnviar([
    { role: "bot", type: "card", texto: "" },
    { role: "user", texto: "   " },
    null, undefined,
    { role: "user", texto: "vale" },
  ]);
  assert.deepEqual(out, [{ role: "user", content: "vale" }]);
});

test("limita aos últimos N turnos (o mais recente fica)", () => {
  const ms = Array.from({ length: HISTORICO_MAX_UI + 5 }, (_, i) => ({ role: i % 2 ? "bot" : "user", texto: `t${i}` }));
  const out = historicoParaEnviar(ms);
  assert.equal(out.length, HISTORICO_MAX_UI);
  assert.equal(out[out.length - 1].content, `t${HISTORICO_MAX_UI + 4}`);
});

test("não é array → vazio, nunca lança", () => {
  for (const v of [undefined, null, 3, "x", {}]) assert.deepEqual(historicoParaEnviar(v), []);
});

test("CABLAGEM: o ChatbotWidget realmente passa o histórico no POST", () => {
  // ⚠️ A 1.ª versão casava o texto-fonte CRU e por isso passava com a chamada COMENTADA
  // (`// historico: historicoParaEnviar(mensagens),`). A auditoria adversarial do MC96.1
  // demonstrou-o (M4a → GREEN). Comparar código com comentários removidos é o mínimo:
  // um teste que aceita código comentado não verifica cablagem nenhuma.
  const src = lerWidget()
    .replace(/\/\*[\s\S]*?\*\//g, "")   // /* … */
    .replace(/^[ \t]*\/\/.*$/gm, "");     // // …
  assert.match(src, /historico:\s*historicoParaEnviar\(mensagens\)/,
    "o widget tem de enviar historico: historicoParaEnviar(mensagens) no corpo do POST");
  assert.match(src, /from "\.\.\/lib\/historicoChat\.js"/, "o widget tem de importar o helper");
});

test("(c3) o system leva a instrução de contexto MESMO sem histórico (alteração declarada)", () => {
  // Declarado de propósito: `INSTRUCAO_CONTEXTO` acrescenta-se SEMPRE, inclusive a clientes
  // antigos que não mandam histórico. É uma alteração comportamental GLOBAL do system, e a
  // auditoria do MC96.1 assinalou com razão que a 1.ª versão deste teste só fixava
  // `length`/roles e nunca o conteúdo do system — deixando a mudança por declarar.
  const src = readFileSync(resolve(process.cwd(), "netlify/functions/chatbot.mjs"), "utf8");
  assert.match(src, /content: systemPrompt \+ INSTRUCAO_CONTEXTO/,
    "o system tem de ser sempre systemPrompt + INSTRUCAO_CONTEXTO");
  assert.match(src, /export const INSTRUCAO_CONTEXTO/, "a instrução tem de estar exportada (testável)");
});

test("O DEFEITO DO CLOSURE: `mensagens` tem de estar nas deps do enviarMensagem", () => {
  // Achado da auditoria adversarial do MC96.1 (deleg_5fecd2ad), NÃO medido pelo autor:
  // `enviarMensagem` é useCallback e `mensagens` não estava nas deps. Em regime normal
  // funcionava por ACIDENTE (o `carregando` alterna a cada turno e força recriação), mas
  // APÓS UM RELOAD — em que o efeito que carrega o histórico não muda nenhuma dessas deps —
  // a 1.ª mensagem podia enviar histórico vazio/obsoleto. Este teste fixa a dependência;
  // nenhum teste anterior a cobria (nem a asserção de cablagem, que só vê a chamada).
  const src = lerWidget().replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
  const m = src.match(/const enviarMensagem = useCallback\([\s\S]*?\}, \[([^\]]*)\]\)/);
  assert.ok(m, "não encontrei o useCallback do enviarMensagem");
  const deps = m[1].split(",").map((x) => x.trim());
  assert.ok(deps.includes("mensagens"),
    `as deps do enviarMensagem têm de incluir \`mensagens\` (closure obsoleta); tem: [${deps}]`);
});

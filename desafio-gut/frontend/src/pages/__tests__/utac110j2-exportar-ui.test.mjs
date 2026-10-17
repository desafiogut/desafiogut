// UTAC110j.2 — FRENTE C: o utilizador consegue PEDIR a exportação na app (LGPD art. 18, V).
//
// Antes deste UTAC não havia UI nenhuma de exportação: só quem soubesse chamar o endpoint o fazia.
// A portabilidade exige um caminho utilizável, não um endpoint à espera.
//
// O `Configuracoes.jsx` depende de AppContext + router + Privy (não renderizável isolado) → lê-se a
// FONTE sem comentários, como nos testes de texto do 110j.1. O que se verifica é o COMPORTAMENTO
// escrito no código: endpoint, método, autenticação, download e caminho de recurso.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PAGINA = fileURLToPath(new URL("../Configuracoes.jsx", import.meta.url));
const bruto = readFileSync(PAGINA, "utf8");
const semComentarios = (s) =>
  s.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const src = semComentarios(bruto);

test("UI: existe um botão de exportação no cartão de conta", () => {
  assert.match(src, /Baixar meus dados/, "o utilizador tem de ver a opção");
  assert.match(src, /onClick=\{baixarMeusDados\}/, "o botão tem de chamar o handler");
  assert.match(src, /disabled=\{baixandoDados\}/, "tem de bloquear durante a geração (evita pedidos duplos)");
});

test("UI: chama o endpoint certo, por POST, com o JWT do titular", () => {
  assert.match(src, /\/\.netlify\/functions\/exportar-dados/, "rota da function");
  assert.match(src, /method:\s*"POST"/);
  assert.match(src, /Authorization:\s*`Bearer \$\{authToken\}`/, "sem token o backend responde 401");
  assert.match(src, /JSON\.stringify\(\{\s*endereco:\s*address\s*\}\)/, "o endereço vem do contexto, não de input");
});

test("UI: entrega o ficheiro como download (não imprime JSON no ecrã)", () => {
  assert.match(src, /resp\.blob\(\)/, "o corpo É o ficheiro");
  assert.match(src, /createObjectURL/, "download via Blob URL");
  assert.match(src, /a\.download\s*=\s*`desafio-gut-meus-dados-/, "nome de ficheiro identificável");
  assert.match(src, /revokeObjectURL/, "liberta a URL (não deixa memória presa)");
});

test("UI: se falhar, o utilizador recebe um caminho alternativo (não fica sem resposta)", () => {
  assert.match(src, /setAvisoDados\(\{\s*tipo:\s*"erro"/, "o erro tem de chegar ao ecrã");
  assert.match(src, /desafiogut01@gmail\.com/, "canal alternativo por e-mail (art. 19)");
  assert.match(src, /artigo 18, inciso V/, "diz ao utilizador qual é o seu direito (sem «Art. 18º», que colidiria com o Regulamento)");
});

test("UI: a nota da exclusão deixou de prometer remoção total (coerência com o 110j.1)", () => {
  assert.doesNotMatch(src, /remove permanentemente seus dados pessoais/i,
    "a frase antiga contradizia a política de exclusão do 110j.1");
  assert.match(src, /elimina ou pseudonimiza/i);
});

// mc967-fontes-rag.test.mjs — MC96.7, HARD GATE 4.
//
// As duas fontes de verdade do RAG (o validador apontou-as como divergentes):
//   FONTE:    docs/RAG-GUTO-v2.md            (editorial, escrita a mao)
//   DERIVADA: docs/chatbot/regulamento.md    (o que build-rag-index.mjs le por omissao)
// A DERIVADA tem de ser exactamente o corpo da FONTE, sem os comentarios HTML (o script do
// Opus nao os remove — seriam indexados como conhecimento; licao do MC96.4).
//
// Sem este teste, quem editasse uma e esquecesse a outra reconstruiria o indice com conteudo
// antigo — que foi, exactamente, a armadilha que o MC96.5 fechou e o MC96.7 veio confirmar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { corpoDerivado } from "../../../../../scripts/mc967-unificar-fontes.mjs";

// ⚠️ ATENCAO A DUAS BASES DIFERENTES:
//   - o IMPORT e' relativo ao FICHEIRO (em `functions/_tests/`) -> 5 niveis;
//   - este `R` e' relativo ao CWD (a suite corre em `functions/`) -> 4 niveis.
// Trocar as duas e' facil: a 1.a tentativa usou 5 aqui e leu `Desktop/docs/...`.
const R = resolve(process.cwd(), "..", "..", "..", "..");
const ler = (f) => readFileSync(resolve(R, f), "utf8");

test("a fonte editorial e' legivel (guarda contra medicao vazia)", () => {
  const v2 = ler("docs/RAG-GUTO-v2.md");
  assert.ok(v2.length > 3000, "o RAG-GUTO-v2.md nao foi lido — medicao invalida");
});

test("a derivada corresponde EXACTAMENTE ao corpo da fonte (nao divergem)", () => {
  const derivada = ler("docs/chatbot/regulamento.md");
  const esperada = corpoDerivado();
  assert.equal(derivada, esperada,
    "docs/chatbot/regulamento.md divergiu de docs/RAG-GUTO-v2.md — correr: node scripts/mc967-unificar-fontes.mjs");
});

test("a derivada nao leva comentarios HTML para o indice", () => {
  const derivada = ler("docs/chatbot/regulamento.md");
  const semCabecalho = derivada.replace(/^<!--[\s\S]*?-->\n/, "");
  assert.ok(!semCabecalho.includes("<!--"), "ha um comentario HTML fora do cabecalho: seria indexado");
  assert.ok(!/\bleil[ãõa]o/i.test(derivada), "a derivada cita leilao");
  assert.ok(!derivada.includes("suporte@desafiogut.com.br"), "a derivada cita o dominio morto");
});

test("BIDIRECCIONAL: alterar a fonte sem regenerar TEM de falhar", () => {
  // simula a divergencia: o que o teste compara e' o ficheiro real contra o gerado.
  const derivada = ler("docs/chatbot/regulamento.md");
  const adulterada = derivada.replace("torneio de habilidade", "leilao de habilidade");
  assert.notEqual(adulterada, derivada, "a mutacao nao entrou (ancora ausente)");
  assert.notEqual(adulterada, corpoDerivado(), "a versao adulterada NAO seria detectada — teste vacuoso");
});

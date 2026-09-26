#!/usr/bin/env node
// MC96.7 — unifica as 2 fontes de verdade do RAG.
// FONTE:  docs/RAG-GUTO-v2.md      (editorial, escrita a mao)
// DERIVADA: docs/chatbot/regulamento.md  (o que `build-rag-index.mjs` le por omissao)
// O cabecalho em comentario HTML NAO vai para a derivada: o script do Opus nao remove
// comentarios, logo eles seriam indexados como conhecimento (licao do MC96.4).
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const R = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FONTE = resolve(R, "docs/RAG-GUTO-v2.md");
const DERIV = resolve(R, "docs/chatbot/regulamento.md");
const CAB = `<!-- MC96.7 — FONTE DERIVADA. Nao editar a mao: e' gerado do docs/RAG-GUTO-v2.md (a fonte editorial) por scripts/mc967-unificar-fontes.mjs. O teste fontesRAG.test.mjs falha se os dois divergirem. -->\n`;
export function corpoDerivado() {
  const v2 = readFileSync(FONTE, "utf8");
  return CAB + v2.replace(/<!--[\s\S]*?-->/g, "").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
if (process.argv[1] && process.argv[1].endsWith("mc967-unificar-fontes.mjs")) {
  writeFileSync(DERIV, corpoDerivado(), "utf8");
  console.log("[mc967] docs/chatbot/regulamento.md regenerado a partir de docs/RAG-GUTO-v2.md");
}

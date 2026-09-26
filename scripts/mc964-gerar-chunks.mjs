#!/usr/bin/env node
// MC96.4 — gerador de chunks do RAG v2 (LOCAL, sem credenciais).
//
// Porque existe: `scripts/build-rag-index.mjs` (do Opus) exige NETLIFY_SITE_ID +
// NETLIFY_AUTH_TOKEN no ambiente — e a R5 proíbe ler credenciais. Este script faz só a parte
// que NÃO precisa de credencial: lê o Markdown, divide com as MESMAS primitivas do motor
// (`splitIntoChunks`), gera os embeddings com o MESMO modelo local (Xenova/all-MiniLM-L6-v2,
// 384 dim) e escreve um JSON por chunk em `_rag-out/`. O upload é feito pelo CLI
// (`netlify blobs:set`), que já está autenticado — assim nenhum token passa por aqui.
//
// Uso: node scripts/mc964-gerar-chunks.mjs [fonte.md]
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const RAG_LIB = join(REPO_ROOT, "desafio-gut", "frontend", "netlify", "functions", "_lib", "rag.mjs");
const { splitIntoChunks, gerarEmbedding } = await import(`file://${RAG_LIB.replace(/\\/g, "/")}`);

const TAMANHO = 500, OVERLAP = 50;
const fonte = resolve(REPO_ROOT, process.argv[2] || "docs/RAG-GUTO-v2.md");
const SAIDA = join(REPO_ROOT, "_rag-out");

const bruto = await readFile(fonte, "utf8");
// ⚠️ Remover comentários HTML: o cabeçalho do ficheiro tem INSTRUÇÕES DE INGESTÃO para o
// operador («este ficheiro é o conteúdo a ingerir…»). Isso é meta-texto do processo, não
// conhecimento do produto — e ficaria num chunk que o LLM lê como conteúdo. Medido: aparecia
// no início do rag:0. Um índice não deve conter instruções sobre o próprio índice.
const texto = bruto.replace(/<!--[\s\S]*?-->/g, "").trim();
const chunks = splitIntoChunks(texto, TAMANHO, OVERLAP);
console.log(`[mc964] fonte: ${fonte.replace(REPO_ROOT, "")} (${texto.length} chars)`);
console.log(`[mc964] ${chunks.length} chunks (alvo ${TAMANHO} palavras / overlap ${OVERLAP})`);

await mkdir(SAIDA, { recursive: true });
let dimensao = null;
for (let i = 0; i < chunks.length; i++) {
  const emb = await gerarEmbedding(chunks[i]);
  if (!dimensao) dimensao = emb.length;
  // MESMA forma do índice antigo (lida de rag:0): {id, ordem, texto, embedding}
  const obj = { id: `rag:${i}`, ordem: i, texto: chunks[i], embedding: emb };
  await writeFile(join(SAIDA, `rag-${i}.json`), JSON.stringify(obj), "utf8");
  console.log(`[mc964] rag:${i} -> ${chunks[i].length} chars, dim ${emb.length}`);
}
const meta = {
  totalChunks: chunks.length, dimensao,
  modelo: "Xenova/all-MiniLM-L6-v2",
  tamanho: TAMANHO, overlap: OVERLAP,
  fonte: process.argv[2] || "docs/RAG-GUTO-v2.md",
  criadoEm: new Date().toISOString(),
};
await writeFile(join(SAIDA, "rag-meta.json"), JSON.stringify(meta), "utf8");
console.log(`[mc964] meta: ${JSON.stringify(meta)}`);
console.log(`[mc964] pronto em _rag-out/ — upload com: netlify blobs:set rag rag:N --input ...`);

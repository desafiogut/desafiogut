#!/usr/bin/env node
// Build do índice RAG — Mega Comando 9 / Item 2.
//
// Lê `docs/chatbot/regulamento.md`, divide em chunks de ~500 palavras com
// overlap de 50, gera embedding (OpenAI `text-embedding-3-small`, 1536 dim)
// para cada um e persiste em Blob `rag:{n}` no store `rag`. Metadados em
// `rag:meta`. Idempotente: pergunta antes de sobrescrever se `rag:meta` existe.
//
// Pré-requisitos:
//   - Variáveis de ambiente: NETLIFY_SITE_ID, NETLIFY_AUTH_TOKEN, OPENAI_API_KEY
//   - Node 18+ (fetch nativo, ESM)
//   - Dependência `@netlify/blobs` (instalada em `desafio-gut/frontend/netlify/functions/node_modules`).
//
// Uso:
//   $ node scripts/build-rag-index.mjs                          # interativo (pergunta antes de overwrite)
//   $ node scripts/build-rag-index.mjs --yes                    # não pergunta
//   $ node scripts/build-rag-index.mjs --fonte docs/outra.md    # fonte custom
//
// Custo estimado: ~100 chunks × ~500 tokens × $0.02/1M = $0.001 (uma execução).

import { readFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
// Raiz do repo: dois níveis acima de scripts/. Usado para construir caminhos absolutos.
const REPO_ROOT  = resolve(__dirname, "..");

// Importa as primitivas do motor RAG. O arquivo `_lib/rag.mjs` está dentro do
// projeto frontend — usamos caminho relativo a partir da raiz do repo.
const RAG_LIB = join(REPO_ROOT, "desafio-gut", "frontend", "netlify", "functions", "_lib", "rag.mjs");
const { splitIntoChunks, gerarEmbedding } = await import(`file://${RAG_LIB.replace(/\\/g, "/")}`);

// @netlify/blobs vive em node_modules de functions. Resolvemos manualmente
// porque este script está fora desse package.
const BLOBS_PKG = join(REPO_ROOT, "desafio-gut", "frontend", "netlify", "functions", "node_modules", "@netlify", "blobs", "dist", "main.js");
const { getStore } = await import(`file://${BLOBS_PKG.replace(/\\/g, "/")}`);

const STORE_NAME = "rag";
const TAMANHO_CHUNK = 500;
const OVERLAP       = 50;

function parseArgs(argv) {
  const out = { yes: false, fonte: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--yes" || a === "-y") out.yes = true;
    else if (a === "--fonte" || a === "-f") out.fonte = argv[++i];
  }
  return out;
}

async function pergunta(texto) {
  const rl = createInterface({ input, output });
  try {
    const r = await rl.question(texto);
    return r.trim().toLowerCase();
  } finally { rl.close(); }
}

function abrirStore() {
  // Em ambiente CLI, getStore exige NETLIFY_SITE_ID + NETLIFY_AUTH_TOKEN
  // OU os flags { siteID, token }. Aqui dependemos das env vars — falha
  // explícita se ausente.
  const siteID = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_AUTH_TOKEN;
  if (!siteID || !token) {
    throw new Error("NETLIFY_SITE_ID e NETLIFY_AUTH_TOKEN são obrigatórios para build local do índice RAG");
  }
  return getStore({ name: STORE_NAME, consistency: "strong", siteID, token });
}

async function main() {
  const args = parseArgs(process.argv);
  const fonte = args.fonte
    ? resolve(REPO_ROOT, args.fonte)
    : join(REPO_ROOT, "docs", "chatbot", "regulamento.md");

  console.log(`[build-rag] fonte: ${fonte}`);
  const texto = await readFile(fonte, "utf8");
  console.log(`[build-rag] tamanho fonte: ${texto.length} caracteres`);

  const chunks = splitIntoChunks(texto, TAMANHO_CHUNK, OVERLAP);
  console.log(`[build-rag] ${chunks.length} chunks (alvo ${TAMANHO_CHUNK} palavras / overlap ${OVERLAP})`);

  // MC12.3.x — embedding agora é local (Xenova/all-MiniLM-L6-v2, 384 dim).
  // Sem dependência de OPENAI_API_KEY. Modelo baixado no primeiro uso.

  const store = abrirStore();

  // Idempotência: se índice já existe, confirma antes de sobrescrever.
  const metaAntiga = await store.get("rag:meta", { type: "json" }).catch(() => null);
  if (metaAntiga && !args.yes) {
    console.log(`[build-rag] índice existente: ${metaAntiga.totalChunks} chunks · modelo ${metaAntiga.modelo} · ${metaAntiga.criadoEm}`);
    const r = await pergunta("Sobrescrever? (s/N) ");
    if (r !== "s" && r !== "sim" && r !== "y" && r !== "yes") {
      console.log("[build-rag] abortado");
      process.exit(0);
    }
  }

  // Limpa entradas antigas se sobrescrevendo (best-effort — chunks órfãos
  // ficam sem referência em rag:meta e não são lidos pelo buscarChunksRelevantes).
  if (metaAntiga?.totalChunks) {
    console.log(`[build-rag] limpando ${metaAntiga.totalChunks} entradas antigas`);
    for (let i = 0; i < metaAntiga.totalChunks; i++) {
      await store.delete(`rag:${i}`).catch(() => {});
    }
  }

  let dimensao = null;
  for (let i = 0; i < chunks.length; i++) {
    const texto = chunks[i];
    process.stdout.write(`[build-rag] chunk ${i + 1}/${chunks.length} (${texto.length} chars) … `);
    const embedding = await gerarEmbedding(texto);
    if (!dimensao) dimensao = embedding.length;
    await store.setJSON(`rag:${i}`, { id: `rag:${i}`, ordem: i, texto, embedding });
    process.stdout.write(`ok (dim ${embedding.length})\n`);
  }

  const meta = {
    totalChunks: chunks.length,
    dimensao,
    modelo:   process.env.EMBED_MODEL || "Xenova/all-MiniLM-L6-v2",
    tamanho:  TAMANHO_CHUNK,
    overlap:  OVERLAP,
    fonte:    args.fonte || "docs/chatbot/regulamento.md",
    criadoEm: new Date().toISOString(),
  };
  await store.setJSON("rag:meta", meta);
  console.log(`[build-rag] concluído: ${chunks.length} chunks · dimensão ${dimensao}`);
  console.log(`[build-rag] meta: ${JSON.stringify(meta)}`);
}

main().catch((err) => {
  console.error("[build-rag] erro:", err?.stack || err);
  process.exit(1);
});

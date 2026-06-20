#!/usr/bin/env node
// seed-recursos-app.mjs — MC29.1
//
// Semeia o Blob config-experiencia:recursos_app com os valores padrão do
// modelo de entrega híbrido transparente:
//   isLeilaoAtivo:          { ios:false, android:false, pwa:true }
//   isPagamentoNativoAtivo: { ios:false, android:false, pwa:false }
//
// Idempotente: por omissão NÃO sobrescreve se a chave já existir (use --force).
// Fail-soft de produção: mesmo sem semear, o endpoint recursos-app cai no
// DEFAULT (recursos-app-config.mjs) — este script só fixa o estado no Blob para
// permitir a TROCA remota (ativar/desativar o leilão por plataforma) sem deploy.
//
// Pré-requisitos: NETLIFY_SITE_ID + NETLIFY_AUTH_TOKEN (ambiente CLI).
// Uso:
//   $ node scripts/seed-recursos-app.mjs            # cria se não existir
//   $ node scripts/seed-recursos-app.mjs --force    # sobrescreve
//   $ node scripts/seed-recursos-app.mjs --print    # só mostra o valor atual

import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const BLOBS_PKG = join(REPO_ROOT, "desafio-gut", "frontend", "netlify", "functions", "node_modules", "@netlify", "blobs", "dist", "main.js");
const { getStore } = await import(`file://${BLOBS_PKG.replace(/\\/g, "/")}`);

const STORE_NAME = "config-experiencia";
const CHAVE = "recursos_app";

const DEFAULT_RECURSOS_APP = {
  isLeilaoAtivo:          { ios: false, android: false, pwa: true },
  isPagamentoNativoAtivo: { ios: false, android: false, pwa: false },
};

function abrirStore() {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_AUTH_TOKEN;
  if (!siteID || !token) {
    throw new Error("NETLIFY_SITE_ID e NETLIFY_AUTH_TOKEN são obrigatórios para semear o Blob");
  }
  return getStore({ name: STORE_NAME, consistency: "strong", siteID, token });
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const print = args.includes("--print");
  const store = abrirStore();

  const atual = await store.get(CHAVE, { type: "json" });

  if (print) {
    console.log(JSON.stringify(atual ?? null, null, 2));
    return;
  }

  if (atual && !force) {
    console.log(`[seed] ${STORE_NAME}:${CHAVE} já existe. Use --force para sobrescrever.`);
    console.log(JSON.stringify(atual, null, 2));
    return;
  }

  await store.setJSON(CHAVE, DEFAULT_RECURSOS_APP);
  console.log(`[seed] ${STORE_NAME}:${CHAVE} gravado:`);
  console.log(JSON.stringify(DEFAULT_RECURSOS_APP, null, 2));
}

main().catch((err) => {
  console.error("[seed] falhou:", err?.message);
  process.exit(1);
});

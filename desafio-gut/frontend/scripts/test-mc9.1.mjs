#!/usr/bin/env node
// test-mc9.1.mjs — 8 checks para MC9.1 (Chatbot 24/7 RAG funcional).
//
// Validações:
//   1. ChatbotWidget no bundle
//   2. Endpoint chatbot responde 200 a POST
//   3. Índice RAG existe (rag:meta acessível com totalChunks > 0)
//   4. rag.mjs tem buscarChunksTextual (fallback sem credentials)
//   5. chatbot.mjs aceita pipeline em camadas (template como fallback)
//   6. Resposta produção contém termos do regulamento
//   7. netlify.toml externaliza @xenova/transformers
//   8. npm run build verde
//
// Uso: node scripts/test-mc9.1.mjs
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC  = path.join(ROOT, "src");
const NET  = path.join(ROOT, "netlify", "functions");
const DIST = path.join(ROOT, "dist", "assets");
const TOML = path.resolve(ROOT, "..", "..", "netlify.toml");
const PROD = "https://silly-stardust-ca71bc.netlify.app";

let passed = 0;
let failed = 0;

async function check(n, label, fn) {
  try {
    const ok = await fn();
    if (ok) { console.log(`✅ ${n}. ${label}`); passed++; }
    else    { console.log(`❌ ${n}. ${label}`); failed++; }
  } catch (e) {
    console.log(`❌ ${n}. ${label} — ERRO: ${e.message}`);
    failed++;
  }
}

// 1. ChatbotWidget no bundle (procura nos arquivos js do dist)
await check(1, "ChatbotWidget no bundle (dist/assets/index-*.js)", () => {
  if (!fs.existsSync(DIST)) return false;
  const files = fs.readdirSync(DIST).filter(f => f.startsWith("index-") && f.endsWith(".js"));
  return files.some(f => {
    const txt = fs.readFileSync(path.join(DIST, f), "utf8");
    return txt.includes("Assistente DESAFIOGUT") || txt.includes("gut_chat") || txt.includes("ChatbotWidget");
  });
});

// 2. Endpoint chatbot responde 200 a POST em produção
await check(2, "Endpoint /chatbot responde 200 OK em produção", async () => {
  const r = await fetch(`${PROD}/.netlify/functions/chatbot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pergunta: "qual o valor minimo do lance?" }),
  });
  return r.status === 200;
});

// 3. Índice RAG existe (testa via endpoint que retorna fontes)
let respostaProd = null;
await check(3, "Índice RAG existe (fontes retornadas pelo endpoint)", async () => {
  const r = await fetch(`${PROD}/.netlify/functions/chatbot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pergunta: "Como funciona o leilão de menor lance único?" }),
  });
  if (r.status !== 200) return false;
  const data = await r.json();
  respostaProd = data;
  return Array.isArray(data.fontes) && data.fontes.length > 0;
});

// 4. rag.mjs tem buscarChunksTextual (fallback)
await check(4, "rag.mjs exporta buscarChunksTextual (fallback sem credentials)", () => {
  const src = fs.readFileSync(path.join(NET, "_lib", "rag.mjs"), "utf8");
  return /export\s+async\s+function\s+buscarChunksTextual/.test(src);
});

// 5. chatbot.mjs pipeline em camadas (modoResposta no body)
await check(5, "chatbot.mjs retorna modoBusca + modoResposta (pipeline em camadas)", () => {
  const src = fs.readFileSync(path.join(NET, "chatbot.mjs"), "utf8");
  return /modoBusca/.test(src) && /modoResposta/.test(src) && /buscarChunksTextual/.test(src);
});

// 6. Resposta produção contém termos do regulamento (Menor Lance Único, leilão, regulamento)
await check(6, "Resposta de produção contém termos do regulamento", () => {
  if (!respostaProd) return false;
  const resposta = String(respostaProd.resposta || "").toLowerCase();
  return resposta.includes("menor lance") ||
         resposta.includes("relâmpago") ||
         resposta.includes("regulamento") ||
         resposta.includes("desafiogut");
});

// 7. netlify.toml externaliza @xenova/transformers
await check(7, "netlify.toml externaliza @xenova/transformers", () => {
  if (!fs.existsSync(TOML)) return false;
  const txt = fs.readFileSync(TOML, "utf8");
  return /external_node_modules\s*=\s*\[[^\]]*"@xenova\/transformers"/.test(txt);
});

// 8. Build verde (dist/index.html + zero TDZ)
await check(8, "Build verde (dist/index.html existe + zero TDZ)", () => {
  if (!fs.existsSync(path.join(ROOT, "dist", "index.html"))) return false;
  if (!fs.existsSync(DIST)) return false;
  const files = fs.readdirSync(DIST).filter(f => f.endsWith(".js"));
  for (const f of files) {
    const txt = fs.readFileSync(path.join(DIST, f), "utf8");
    if (txt.includes("Cannot access") || txt.includes("before initialization")) {
      return false;
    }
  }
  return true;
});

console.log(`\n${passed}/${passed + failed} OK`);
if (respostaProd) {
  console.log(`\nProdução respondeu (preview):`);
  console.log(`  modoBusca: ${respostaProd.modoBusca}`);
  console.log(`  modoResposta: ${respostaProd.modoResposta}`);
  console.log(`  fontes: ${respostaProd.fontes?.map(f => f.id).join(", ")}`);
  console.log(`  resposta: ${String(respostaProd.resposta).slice(0, 200)}...`);
}
process.exit(failed === 0 ? 0 : 1);

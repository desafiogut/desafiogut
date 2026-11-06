#!/usr/bin/env node
// scripts/validar-dist-rede.mjs — MC88.25 (P0b)
//
// Falha se o bundle construído apontar para a rede errada.
//
// PORQUÊ ESTE GUARDA EXISTE: no MC88.22/88.23 o APK foi gerado com
// `npm run build`, que é Vite puro e lê os `.env` do DISCO — e esses apontam para
// Sepolia e para o contrato ABANDONADO 0x59A73Acc…F6D5. Só o `netlify build`
// injecta o ambiente do contexto de produção. Resultado: uma app em produção a ler
// um contrato onde a carteira do utilizador nunca teve nada. Apareceu como
// "o PIX debitou e a senha não creditou" (MC88.24) — a senha ESTAVA creditada em
// mainnet; era o bundle que olhava para o lado errado.
//
// A única defesa, nesse dia, foi um utilizador pagar e estranhar. Este script é
// para que não volte a ser.
//
// NÃO valida um endereço hardcoded como fonte de verdade: valida COERÊNCIA entre
// os quatro sinais que a app usa, e trava o endereço abandonado. Assim continua a
// funcionar na próxima migração de contrato, sem virar mentira.
//
// Uso:  node scripts/validar-dist-rede.mjs [caminho-do-dist]
//       GUT_PERMITIR_TESTNET=1  → aceita um bundle de testnet (build deliberado)
//
// Saída: 0 = coerente · 1 = incoerente (falha o build)

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(process.argv[2] || join(AQUI, "..", "dist"));

// Endereço do contrato abandonado (MC56/MC59.15). Nunca deve ser o contrato ativo
// de um bundle de produção. Este SIM é hardcoded, de propósito: é uma lista negra.
const CONTRATO_ABANDONADO = "0x59a73acc8e8b210c874b0e3a9ec9b8b64847f6d5";
const PERMITIR_TESTNET = process.env.GUT_PERMITIR_TESTNET === "1";

function jsRecursivo(dir) {
  const out = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...jsRecursivo(p));
    else if (nome.endsWith(".js")) out.push(p);
  }
  return out;
}

/** Lê um valor do objecto `import.meta.env` que o Vite embute no bundle. */
function lerEnvInlined(conteudos, chave) {
  const re = new RegExp(`${chave}:\\s*\`([^\`]*)\``);
  for (const txt of conteudos) {
    const m = txt.match(re);
    if (m) return m[1];
  }
  return null;   // ausente = o Vite não tinha a variável no momento do build
}

if (!existsSync(DIST)) {
  console.error(`✖ dist não encontrado em ${DIST}. Correr o build primeiro.`);
  process.exit(1);
}

const ficheiros = jsRecursivo(DIST);
if (ficheiros.length === 0) {
  console.error(`✖ nenhum .js em ${DIST} — build incompleto?`);
  process.exit(1);
}
const conteudos = ficheiros.map((f) => readFileSync(f, "utf8"));

const contrato = lerEnvInlined(conteudos, "VITE_CONTRATO_SEPOLIA");
const rpc      = lerEnvInlined(conteudos, "VITE_ALCHEMY_URL");
const chainId  = lerEnvInlined(conteudos, "VITE_CHAIN_ID");
const stage    = lerEnvInlined(conteudos, "VITE_NETWORK_STAGE");
// UTAC123 (DEBT-082) — Supabase: sem ele o APK cai no fallback do Blob (DEBT-061). Só se
// regista a PRESENÇA; os valores não são impressos.
const supabaseUrl  = lerEnvInlined(conteudos, "VITE_SUPABASE_URL");
const supabaseAnon = lerEnvInlined(conteudos, "VITE_SUPABASE_ANON_KEY");

const redeRpc = rpc && /eth-mainnet/i.test(rpc) ? "mainnet"
              : rpc && /sepolia/i.test(rpc)     ? "sepolia"
              : rpc ? "desconhecida" : null;

console.log(`ficheiros .js analisados : ${ficheiros.length}`);
console.log(`VITE_CONTRATO_SEPOLIA    : ${contrato ?? "(AUSENTE)"}`);
console.log(`VITE_ALCHEMY_URL (rede)  : ${redeRpc ?? "(AUSENTE)"}`);
console.log(`VITE_CHAIN_ID            : ${chainId ?? "(AUSENTE)"}`);
console.log(`VITE_NETWORK_STAGE       : ${stage ?? "(AUSENTE)"}`);
console.log(`VITE_SUPABASE_URL        : ${supabaseUrl ? "presente" : "(AUSENTE)"}`);
console.log(`VITE_SUPABASE_ANON_KEY   : ${supabaseAnon ? "presente" : "(AUSENTE)"}`);
console.log("");

const erros = [];

// 1. Sem contrato, network.js devolve CONTRATO="" e os call-sites falham alto.
//    Um bundle assim não deve sequer sair da máquina.
if (!contrato) erros.push("VITE_CONTRATO_SEPOLIA ausente: CONTRATO fica \"\" e o lance/saldo falham.");

// 2. Lista negra: o contrato abandonado nunca é o ativo.
if (contrato && contrato.toLowerCase() === CONTRATO_ABANDONADO) {
  erros.push(
    `contrato ABANDONADO (${contrato}) embutido como ativo.\n` +
    "    Sintoma: saldos a zero, como no MC88.24. Provável causa: build feito com\n" +
    "    `npm run build` (lê os .env do disco) em vez de `netlify build`.",
  );
}

// 3. VITE_CHAIN_ID ausente é a armadilha silenciosa: src/lib/network.js faz
//    `Number(env.VITE_CHAIN_ID ?? 11155111)` — o default é SEPOLIA. Um bundle sem
//    esta variável manda o utilizador para a testnet sem dizer nada.
if (!chainId) {
  erros.push(
    "VITE_CHAIN_ID ausente: network.js cai no default 11155111 (Sepolia) EM SILÊNCIO.\n" +
    "    É este o sinal de que o env do contexto de produção não foi injectado.",
  );
}

// 3b. UTAC123 (DEBT-082) — RPC ausente: antes passava em silêncio e o src/utils/web3.js caía
//     num URL Alchemy de SEPOLIA escrito no código (removido no UTAC123; hoje lança erro).
if (!rpc) {
  erros.push("VITE_ALCHEMY_URL ausente: sem RPC configurado as leituras on-chain falham.");
}

// 3c. UTAC123 — Supabase ausente: o APK lê a config pelo fallback (DEBT-061) e não pelo Supabase.
if (!supabaseUrl || !supabaseAnon) {
  erros.push("VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausente: a app perde o Supabase (config cai no fallback).");
}

// 3d. UTAC123 — nenhuma CHAVE de RPC Sepolia embutida num bundle de produção. No v7 a chave
//     removida do web3.js voltou a entrar pela var MORTA VITE_RPC_URL_SEPOLIA do Netlify, porque
//     src/lib/network.js lê `import.meta.env` inteiro e o Vite embute TODAS as VITE_*.
//     O URL só conta se trouxer chave (16+ caracteres) — as definições de rede do viem/Privy
//     têm URLs de Sepolia sem chave e esses não são segredo. A chave nunca é impressa.
const RE_CHAVE_SEPOLIA = /https:\/\/eth-sepolia\.g\.alchemy\.com\/v2\/[A-Za-z0-9_-]{16,}/;
const comChaveSepolia = ficheiros.filter((f, i) => RE_CHAVE_SEPOLIA.test(conteudos[i]));
console.log(`chave RPC Sepolia embutida: ${comChaveSepolia.length ? `SIM (${comChaveSepolia.length} ficheiro(s))` : "não"}`);
if (comChaveSepolia.length && !PERMITIR_TESTNET) {
  erros.push("chave de RPC Sepolia (Alchemy) embutida no bundle — segredo exposto e var de testnet num build de produção.");
}

// 4. Coerência: os quatro sinais têm de descrever a MESMA rede.
if (!PERMITIR_TESTNET) {
  if (stage && stage !== "mainnet") erros.push(`VITE_NETWORK_STAGE="${stage}" (esperado "mainnet").`);
  if (redeRpc && redeRpc !== "mainnet") erros.push(`RPC aponta para ${redeRpc} (esperado mainnet).`);
  if (chainId && chainId !== "1") erros.push(`VITE_CHAIN_ID="${chainId}" (esperado "1" para mainnet).`);
}
// Incoerência interna é sempre erro, mesmo num build de testnet deliberado:
// meia app numa rede e meia noutra é pior que qualquer das duas.
if (stage === "mainnet" && redeRpc && redeRpc !== "mainnet") {
  erros.push(`INCOERENTE: NETWORK_STAGE=mainnet mas o RPC é ${redeRpc}.`);
}
if (chainId === "1" && redeRpc === "sepolia") {
  erros.push("INCOERENTE: chainId=1 (mainnet) com RPC de Sepolia.");
}

// 5. UTAC132 (R18-132-1) — este guarda só corre sobre bundles do APK (`build:apk` e a tarefa Gradle
//    `validarAmbienteProducao`). No APK o PIX/Saldo R$ não pode existir (política de Pagamentos da
//    Play): exige-se o corte de build (VITE_IS_ANDROID_APP=true, injectado pelo `build:apk`) E que as
//    strings tenham saído de facto do bundle. A 2.ª verificação é a que conta — prova o artefacto, não a intenção.
const flagApk = lerEnvInlined(conteudos, "VITE_IS_ANDROID_APP");
const STRINGS_PROIBIDAS_APK = ["Depositar PIX", "Saldo Disponível"];
const proibidasEncontradas = STRINGS_PROIBIDAS_APK
  .map((s) => ({ s, n: conteudos.filter((c) => c.includes(s)).length }))
  .filter((x) => x.n > 0);
console.log(`VITE_IS_ANDROID_APP      : ${flagApk ?? "(AUSENTE)"}`);
console.log(`strings PIX/Saldo no APK : ${proibidasEncontradas.length ? proibidasEncontradas.map((x) => `«${x.s}» em ${x.n}`).join(", ") : "nenhuma"}`);
if (flagApk !== "true") {
  erros.push("VITE_IS_ANDROID_APP ausente/diferente de \"true\": o corte de PIX/Saldo em tempo de build não foi aplicado (usar `npm run build:apk`).");
}
if (proibidasEncontradas.length) {
  erros.push(`strings proibidas no APK: ${proibidasEncontradas.map((x) => `«${x.s}»`).join(", ")} — PIX/Saldo R$ não pode ir no AAB (política de Pagamentos da Play).`);
}

if (erros.length) {
  console.error("✖ BUNDLE REJEITADO — não sincronizar para o APK nem publicar:\n");
  erros.forEach((e, i) => console.error(`  ${i + 1}. ${e}`));
  console.error("\n  Build correcto de produção:");
  console.error("    netlify build   (injecta o env do contexto)  →  npx cap sync android  →  gradlew");
  console.error("  Para um build de testnet deliberado: GUT_PERMITIR_TESTNET=1\n");
  process.exit(1);
}

console.log(PERMITIR_TESTNET
  ? "✓ bundle coerente (modo testnet permitido explicitamente)."
  : "✓ bundle coerente com PRODUÇÃO (mainnet).");
process.exit(0);

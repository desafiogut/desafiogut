// mc302-smoke.mjs — Handshake REAL do MC30.2.1 (KMS + Biconomy). READ-ONLY.
//
// Ao contrário dos testes em _tests/ (que MOCKAM os SDKs), este script valida as
// credenciais REAIS: assina via AWS KMS de verdade e deriva o Smart Account real
// no Bundler. NÃO envia transações nem faz nada irreversível.
//
// Uso: node scripts/mc302-smoke.mjs
//   Requer no ambiente (ou em .env.local): KMS_PROVIDER=aws, KMS_KEY_ID, APP_AWS_REGION,
//   APP_AWS_ACCESS_KEY_ID/APP_AWS_SECRET_ACCESS_KEY (ou papel IAM), BICONOMY_BUNDLER_URL,
//   BICONOMY_PROJECT_ID, RPC_URL e CONTRATO_MAINNET (ou CONTRATO_SEPOLIA).
//   COORDENACAO_PRIVATE_KEY deve estar AUSENTE. Exit 0 se todos passam; 1 caso contrário.
//
//   Nota: o prefixo APP_AWS_* evita colidir com as variáveis AWS_* que o runtime das
//   Netlify Functions injeta para o seu próprio papel de execução. Este script mapeia
//   APP_AWS_* → AWS_* para o SDK, sem alterar o código de produção.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Contract, JsonRpcProvider, verifyMessage } from "ethers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoFrontend = resolve(__dirname, "..");

// Carrega .env.local manualmente (sem dep nova) — mesmo padrão dos outros scripts.
try {
  const env = readFileSync(resolve(repoFrontend, ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  console.warn("aviso: .env.local não encontrado — env vars devem estar no shell\n");
}

// Defaults fornecidos pelo operador (sobrepostos pelo ambiente/.env.local se presentes).
if (!process.env.BICONOMY_PROJECT_ID) process.env.BICONOMY_PROJECT_ID = "e59cc5f3-c894-408a-8d95-4dea202638bb";
// Alvo: Ethereum Sepolia (chainId 11155111) — alinhado com o contrato LeilaoGUT.
if (!process.env.BICONOMY_BUNDLER_URL) process.env.BICONOMY_BUNDLER_URL = "https://bundler.biconomy.io/api/v2/11155111/e59cc5f3-c894-408a-8d95-4dea202638bb";

// Mapeia APP_AWS_* → AWS_* (o @aws-sdk e aws-kms.mjs leem os nomes padrão).
// Guardas evitam atribuir a string "undefined" a process.env.
if (process.env.APP_AWS_ACCESS_KEY_ID && !process.env.AWS_ACCESS_KEY_ID) process.env.AWS_ACCESS_KEY_ID = process.env.APP_AWS_ACCESS_KEY_ID;
if (process.env.APP_AWS_SECRET_ACCESS_KEY && !process.env.AWS_SECRET_ACCESS_KEY) process.env.AWS_SECRET_ACCESS_KEY = process.env.APP_AWS_SECRET_ACCESS_KEY;
if (process.env.APP_AWS_REGION && !process.env.AWS_REGION) process.env.AWS_REGION = process.env.APP_AWS_REGION;

const importLib = (rel) => import(pathToFileURL(resolve(repoFrontend, "netlify/functions/_lib", rel)).href);

let falhas = 0;
const ok = (msg) => console.log(`  ✅ ${msg}`);
const bad = (msg) => { console.log(`  ❌ ${msg}`); falhas++; };
const sec = (t) => console.log(`\n── ${t} ──`);

console.log("MC30.2.1 — Smoke handshake REAL (KMS + Biconomy) · READ-ONLY\n");

// ── Estágio 1: variáveis de ambiente (set/missing — sem expor valores) ───────
sec("1. Ambiente (set/missing — valores nunca impressos)");
const obrigatorias = ["KMS_PROVIDER", "KMS_KEY_ID", "APP_AWS_REGION", "BICONOMY_BUNDLER_URL", "RPC_URL"];
for (const k of obrigatorias) (process.env[k] ? ok(`${k} set`) : bad(`${k} EM FALTA`));
console.log(`  ℹ️  BICONOMY_PROJECT_ID: ${process.env.BICONOMY_PROJECT_ID} (não consumido pelo signer; o id já está no BUNDLER_URL)`);
console.log(`  ℹ️  APP_AWS_ACCESS_KEY_ID: ${process.env.APP_AWS_ACCESS_KEY_ID ? "set" : "missing"} · APP_AWS_SECRET_ACCESS_KEY: ${process.env.APP_AWS_SECRET_ACCESS_KEY ? "set" : "missing"}`);
const contrato = process.env.CONTRATO_MAINNET || process.env.CONTRATO_SEPOLIA || null;
contrato ? ok("CONTRATO_MAINNET/SEPOLIA set") : console.log("  ⚠️  CONTRATO_* ausente — verificação on-chain saltada");
if (!process.env.SIGNER_BACKEND) console.log("  ⚠️  SIGNER_BACKEND não definido — o smoke força 'biconomy' só para esta validação");
process.env.SIGNER_BACKEND = "biconomy";

// ── Estágio 2: guarda anti-chave-bruta (R9/R12) ──────────────────────────────
sec("2. Guarda assertChaveBrutaAusenteEmMainnet");
const signer = await importLib("signer.mjs");
if (signer.resolverChaveCoordenacao()) {
  bad("COORDENACAO_PRIVATE_KEY presente — REMOVER do ambiente (R9/R12)");
} else {
  try { signer.assertChaveBrutaAusenteEmMainnet(); ok("guarda passa (sem chave bruta; KMS/Bundler configurados)"); }
  catch (e) { bad(`guarda recusou: ${e.message}`); }
}

// ── Estágio 3: handshake KMS real (assina + verifica recuperação) ────────────
sec("3. Owner KMS (assinatura real)");
const provider = new JsonRpcProvider(process.env.RPC_URL);
let ownerAddr = null;
try {
  const { criarKmsSigner } = await importLib("kms-signer.mjs");
  const owner = await criarKmsSigner(provider);
  ownerAddr = await owner.getAddress();
  ok(`owner EOA (KMS): ${ownerAddr}`);
  const msg = "mc302-smoke";
  const sig = await owner.signMessage(msg);
  if (verifyMessage(msg, sig).toLowerCase() === ownerAddr.toLowerCase()) ok("assinatura KMS recupera o owner ✔");
  else bad("assinatura KMS NÃO recupera o owner");
} catch (e) { bad(`KMS falhou: ${e.message}`); }

// ── Estágio 4: Smart Account real (Bundler) ──────────────────────────────────
sec("4. Smart Account Biconomy (Bundler)");
let saAddr = null;
try {
  const { address, backend } = await signer.obterSignerCoordenacao(process.env.RPC_URL);
  saAddr = address;
  ok(`backend ativo: ${backend}`);
  ok(`Smart Account (alvo da transferência): ${saAddr}`);
  if (ownerAddr && saAddr && ownerAddr.toLowerCase() === saAddr.toLowerCase()) {
    bad("Smart Account == owner EOA (inesperado — o SA deve ser um contrato ≠ EOA)");
  } else {
    ok("Smart Account ≠ owner EOA (esperado em ERC-4337)");
  }
} catch (e) { bad(`Biconomy falhou: ${e.message}`); }

// ── Estágio 5: leitura on-chain — coordenação atual vs Smart Account ─────────
sec("5. Estado on-chain (coordenação atual vs Smart Account)");
if (contrato && saAddr) {
  try {
    const ro = new Contract(contrato, ["function coordenacao() view returns (address)"], provider);
    const coordAtual = await ro.coordenacao();
    ok(`coordenacao() on-chain: ${coordAtual}`);
    if (coordAtual.toLowerCase() === saAddr.toLowerCase()) {
      ok("coordenação JÁ é o Smart Account — transferência two-step concluída ✔");
    } else {
      console.log("  ⏳ coordenação ainda NÃO é o Smart Account — transferência two-step PENDENTE (PASSO 6).");
    }
  } catch (e) { bad(`leitura on-chain falhou: ${e.message}`); }
} else {
  console.log("  ⚠️  saltado (faltam CONTRATO_* ou Smart Account)");
}

// ── Estágio 6: sanidade da RPC ───────────────────────────────────────────────
sec("6. RPC");
try {
  const net = await provider.getNetwork();
  const bloco = await provider.getBlockNumber();
  ok(`chainId ${net.chainId} · bloco ${bloco}`);
} catch (e) { bad(`RPC falhou: ${e.message}`); }

// ── Veredicto ────────────────────────────────────────────────────────────────
console.log(`\n${falhas === 0 ? "✅ SMOKE OK — handshake real validado (nenhuma transação enviada)" : `❌ SMOKE FALHOU — ${falhas} verificação(ões) em falha`}`);
process.exit(falhas === 0 ? 0 : 1);

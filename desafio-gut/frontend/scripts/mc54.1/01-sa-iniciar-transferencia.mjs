// scripts/mc54.1/01-sa-iniciar-transferencia.mjs
// ─────────────────────────────────────────────────────────────────────────────
// MC54.1 · ETAPA 1 (de 2) — o Smart Account coordenador INICIA a transferência
// da coordenação de volta para uma EOA. Espelha netlify/functions/mc302-aceitar.mjs
// (mesmo padrão: owner KMS + createSmartAccountClient + sendTransaction, SEM
// paymaster → o SA paga o próprio gás), mas na direção INVERSA.
//
// Porquê: coordenacao() do contrato A é o Smart Account (EntryPoint v0.6). Só o SA
// pode chamar iniciarTransferenciaCoordenacao (apenasCoordenacao). O bundler
// Biconomy morreu → usamos um bundler EP-0.6 externo (Pimlico) para esta ÚNICA
// UserOperation. Depois disto, o backend passa a 'local-key' e o ERC-4337 é
// abandonado (a EOA nova assina tudo diretamente).
//
// ⚠️ ESCRITA ON-CHAIN IRREVERSÍVEL (inicia transferência de autoridade).
//    Dry-run por omissão; só envia com `--confirm`.
//
// Segredos vêm SÓ do ambiente (R9). NUNCA hardcode. O operador corre este script.
//
// ENV necessário:
//   RPC_URL                     RPC Sepolia (ex.: Alchemy)
//   BICONOMY_BUNDLER_URL        Bundler EP-0.6 externo. Pimlico (forma com chainId):
//                                 https://api.pimlico.io/v2/11155111/rpc?apikey=<PIMLICO>
//   NOVA_COORDENACAO            EOA que passará a coordenar (ex.: 0xDa3a83…e84E)
//   CONTRATO_SEPOLIA           opcional; default = contrato A abaixo
//   KMS_PROVIDER=aws, KMS_KEY_ID, APP_AWS_REGION,
//   APP_AWS_ACCESS_KEY_ID, APP_AWS_SECRET_ACCESS_KEY   (owner do SA via AWS KMS)
//   (NÃO definir COORDENACAO_PRIVATE_KEY aqui — não é usado nesta etapa.)
//
// Uso:
//   node scripts/mc54.1/01-sa-iniciar-transferencia.mjs            # dry-run
//   node scripts/mc54.1/01-sa-iniciar-transferencia.mjs --confirm  # ENVIA

import { JsonRpcProvider, Contract, Interface, Network, isAddress, getAddress } from "ethers";
import { criarKmsSigner } from "../../netlify/functions/_lib/kms-signer.mjs";

const CONTRATO_A_DEFAULT = "0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5"; // A (SA coord)
const OWNER_ESPERADO = "0xAEFe11EDBb32fb6727693e5994a51df8ADb5EdFF";     // dono KMS do SA

const ABI = [
  "function coordenacao() view returns (address)",
  "function coordenacaoPendente() view returns (address)",
  "function iniciarTransferenciaCoordenacao(address novaCoordenacao)",
];

const CONFIRM = process.argv.includes("--confirm");
const fail = (m) => { console.error(`\n❌ ${m}`); process.exit(1); };

const rpcUrl = process.env.RPC_URL;
const bundlerUrl = process.env.BICONOMY_BUNDLER_URL;
const contrato = process.env.CONTRATO_SEPOLIA || CONTRATO_A_DEFAULT;
const nova = process.env.NOVA_COORDENACAO;

if (!rpcUrl) fail("RPC_URL em falta.");
if (!bundlerUrl) fail("BICONOMY_BUNDLER_URL em falta (use um bundler EP-0.6, ex. Pimlico).");
if (!nova || !isAddress(nova)) fail("NOVA_COORDENACAO em falta ou inválida.");
if (process.env.COORDENACAO_PRIVATE_KEY) {
  fail("COORDENACAO_PRIVATE_KEY presente — remova do ambiente nesta etapa (o owner é KMS).");
}
const novaChecksum = getAddress(nova);

console.log("── MC54.1 · Etapa 1: SA inicia transferência ──────────────────────");
console.log("  modo        :", CONFIRM ? "CONFIRM (ENVIA)" : "DRY-RUN (não envia)");
console.log("  contrato    :", contrato);
console.log("  novaCoord   :", novaChecksum);

const { createSmartAccountClient, extractChainIdFromBundlerUrl } = await import("@biconomy/account");
let chainId = null;
try { chainId = Number(extractChainIdFromBundlerUrl(bundlerUrl)); } catch { /* fica null */ }
if (!chainId || Number.isNaN(chainId)) chainId = null;
const provider = chainId
  ? new JsonRpcProvider(rpcUrl, Network.from(chainId), { staticNetwork: true })
  : new JsonRpcProvider(rpcUrl);

const net = await provider.getNetwork();
console.log("  chainId     :", net.chainId.toString(), chainId ? "(fixado pelo bundler)" : "(detetado pelo RPC)");
if (net.chainId !== 11155111n) fail(`chainId inesperado (${net.chainId}); esperado 11155111 (Sepolia).`);

// Owner KMS + Smart Account
const owner = await criarKmsSigner(provider);
const ownerAddr = await owner.getAddress();
console.log("  owner (KMS) :", ownerAddr, ownerAddr.toLowerCase() === OWNER_ESPERADO.toLowerCase() ? "✓" : "⚠ ≠ esperado");
if (ownerAddr.toLowerCase() !== OWNER_ESPERADO.toLowerCase()) {
  fail(`owner KMS (${ownerAddr}) ≠ dono esperado do SA (${OWNER_ESPERADO}). Aborta por segurança.`);
}

const sa = await createSmartAccountClient({ signer: owner, bundlerUrl, rpcUrl });
const smartAccount = await sa.getAccountAddress();
console.log("  smartAccount:", smartAccount);

// Pré-checagem: o SA TEM de ser o coordenador atual.
const ro = new Contract(contrato, ABI, provider);
const coordAtual = await ro.coordenacao();
const pendenteAtual = await ro.coordenacaoPendente();
console.log("  coordenacao():", coordAtual);
console.log("  coordenacaoPendente():", pendenteAtual);
if (coordAtual.toLowerCase() !== smartAccount.toLowerCase()) {
  fail(`coordenacao() (${coordAtual}) ≠ Smart Account (${smartAccount}). O SA não é o coordenador atual — nada a fazer.`);
}
if (pendenteAtual.toLowerCase() === novaChecksum.toLowerCase()) {
  console.log("\n✅ coordenacaoPendente já é a nova EOA — Etapa 1 já concluída. Avance para a Etapa 2 (aceitar).");
  process.exit(0);
}

const bal = await provider.getBalance(smartAccount);
console.log("  saldo SA    :", (Number(bal) / 1e18).toFixed(6), "ETH (paga o gás desta UserOp)");
if (bal === 0n) fail("Smart Account sem ETH — financie antes de enviar (sem paymaster).");

if (!CONFIRM) {
  console.log("\n🔎 DRY-RUN concluído. Tudo pronto. Para ENVIAR (irreversível):");
  console.log("   node scripts/mc54.1/01-sa-iniciar-transferencia.mjs --confirm\n");
  process.exit(0);
}

console.log("\n⏳ A enviar UserOperation: iniciarTransferenciaCoordenacao(novaCoord)…");
const data = new Interface(ABI).encodeFunctionData("iniciarTransferenciaCoordenacao", [novaChecksum]);
const userOp = await sa.sendTransaction({ to: contrato, data, value: 0n }, {}); // sem paymaster
const { transactionHash } = await userOp.waitForTxHash();
console.log("  txHash:", transactionHash);
try {
  const res = await userOp.wait(1);
  const ok = res?.success !== false;
  const pendenteDepois = await ro.coordenacaoPendente();
  console.log("  minerado:", ok ? "✓" : "✗ (revert?)");
  console.log("  coordenacaoPendente() agora:", pendenteDepois);
  console.log(pendenteDepois.toLowerCase() === novaChecksum.toLowerCase()
    ? "\n✅ ETAPA 1 OK. Agora a EOA nova deve ACEITAR (Etapa 2: 02-eoa-aceitar.mjs)."
    : "\n⚠ coordenacaoPendente não bate — verifique o recibo antes de prosseguir.");
} catch (e) {
  console.log("  (espera expirou; verifique o tx no explorador):", e?.shortMessage || e?.message);
  console.log("  txHash:", transactionHash);
}

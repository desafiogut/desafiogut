// scripts/mc54.1/02-eoa-aceitar.mjs
// ─────────────────────────────────────────────────────────────────────────────
// MC54.1 · ETAPA 2 (de 2) — a EOA nova ACEITA a coordenação. Transação EOA normal
// (SEM Smart Account, SEM bundler): aceitarTransferenciaCoordenacao() exige
// msg.sender == coordenacaoPendente. Após isto, coordenacao() = EOA nova e o
// sistema pode passar para SIGNER_BACKEND=local-key definitivamente.
//
// ⚠️ ESCRITA ON-CHAIN. Dry-run por omissão; só envia com `--confirm`.
// Segredos SÓ do ambiente (R9). O operador corre este script com a chave da EOA.
//
// ENV necessário:
//   RPC_URL                     RPC Sepolia
//   COORDENACAO_PRIVATE_KEY     chave privada da EOA nova (ex.: 0xDa3a83…e84E)
//   CONTRATO_SEPOLIA            opcional; default = contrato A abaixo
//
// Uso:
//   node scripts/mc54.1/02-eoa-aceitar.mjs            # dry-run
//   node scripts/mc54.1/02-eoa-aceitar.mjs --confirm  # ENVIA

import { JsonRpcProvider, Contract, Wallet } from "ethers";

const CONTRATO_A_DEFAULT = "0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5";
const ABI = [
  "function coordenacao() view returns (address)",
  "function coordenacaoPendente() view returns (address)",
  "function aceitarTransferenciaCoordenacao()",
];

const CONFIRM = process.argv.includes("--confirm");
const fail = (m) => { console.error(`\n❌ ${m}`); process.exit(1); };

const rpcUrl = process.env.RPC_URL;
const chave = process.env.COORDENACAO_PRIVATE_KEY;
const contrato = process.env.CONTRATO_SEPOLIA || CONTRATO_A_DEFAULT;
if (!rpcUrl) fail("RPC_URL em falta.");
if (!chave) fail("COORDENACAO_PRIVATE_KEY em falta (chave da EOA nova).");

const provider = new JsonRpcProvider(rpcUrl);
const wallet = new Wallet(chave, provider);
const ro = new Contract(contrato, ABI, provider);

console.log("── MC54.1 · Etapa 2: EOA aceita coordenação ───────────────────────");
console.log("  modo     :", CONFIRM ? "CONFIRM (ENVIA)" : "DRY-RUN (não envia)");
console.log("  contrato :", contrato);
console.log("  EOA      :", wallet.address);

const net = await provider.getNetwork();
if (net.chainId !== 11155111n) fail(`chainId inesperado (${net.chainId}); esperado 11155111.`);

const [coordAtual, pendente, bal] = await Promise.all([
  ro.coordenacao(), ro.coordenacaoPendente(), provider.getBalance(wallet.address),
]);
console.log("  coordenacao():", coordAtual);
console.log("  coordenacaoPendente():", pendente);
console.log("  saldo EOA:", (Number(bal) / 1e18).toFixed(6), "ETH");

if (coordAtual.toLowerCase() === wallet.address.toLowerCase()) {
  console.log("\n✅ coordenacao() já é esta EOA — Etapa 2 concluída. Prossiga para o flip de env (local-key).");
  process.exit(0);
}
if (pendente.toLowerCase() !== wallet.address.toLowerCase()) {
  fail(`coordenacaoPendente (${pendente}) ≠ esta EOA (${wallet.address}). Falta a Etapa 1 (SA inicia) para ESTA EOA.`);
}
if (bal === 0n) fail("EOA sem ETH para pagar o gás desta transação.");

if (!CONFIRM) {
  console.log("\n🔎 DRY-RUN concluído. Para ENVIAR:");
  console.log("   node scripts/mc54.1/02-eoa-aceitar.mjs --confirm\n");
  process.exit(0);
}

console.log("\n⏳ A enviar aceitarTransferenciaCoordenacao()…");
const c = new Contract(contrato, ABI, wallet);
const tx = await c.aceitarTransferenciaCoordenacao();
console.log("  txHash:", tx.hash);
const rec = await tx.wait(1);
const coordDepois = await ro.coordenacao();
console.log("  minerado no bloco:", rec.blockNumber, "| status:", rec.status);
console.log("  coordenacao() agora:", coordDepois);
console.log(coordDepois.toLowerCase() === wallet.address.toLowerCase()
  ? "\n✅ ETAPA 2 OK. coordenacao() = EOA nova. Agora faça o flip de env para SIGNER_BACKEND=local-key."
  : "\n⚠ coordenacao() não bate — verifique o recibo.");

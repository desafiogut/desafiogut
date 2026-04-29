// Teste de ponta a ponta: chama darLance("R-1", 42) com a coordenacao,
// extrai o evento LanceDado do receipt, e valida o estado pré/pós.

import "dotenv/config";
import { JsonRpcProvider, Wallet, Contract } from "ethers";

const CONTRATO  = "0x273Ef96f5be04601FD39DAcDFB039d6fB552445e";
const ID_EDICAO = "R-1";
const VALOR     = 42;          // centavos = R$ 0,42

const ABI = [
  "function darLance(string idEdicao, uint256 valorEmCentavos) public",
  "function saldoSenhas(address) view returns (uint256)",
  "function edicoes(string) view returns (string nome, bool ativa, uint256 prazo)",
  "event LanceDado(string idEdicao, address indexed lancador, uint256 valorEmCentavos, bool repetido, uint256 timestamp)",
];

const provider = new JsonRpcProvider(process.env.RPC_URL);
const wallet   = new Wallet(process.env.PRIVATE_KEY, provider);
const contrato = new Contract(CONTRATO, ABI, wallet);

console.log("Carteira         :", wallet.address);
console.log("Contrato         :", CONTRATO);

const [ed, saldoAntes] = await Promise.all([
  contrato.edicoes(ID_EDICAO),
  contrato.saldoSenhas(wallet.address),
]);
const agora = Math.floor(Date.now() / 1000);
const restante = Number(ed.prazo) - agora;

console.log(`Edição "${ID_EDICAO}":`);
console.log("  ativa  :", ed.ativa);
console.log("  prazo  :", new Date(Number(ed.prazo) * 1000).toISOString(), `(${restante}s restantes)`);
console.log("Saldo de senhas (antes):", saldoAntes.toString());

if (!ed.ativa) { console.error("✗ Edição não está ativa."); process.exit(1); }
if (restante <= 0) { console.error("✗ Prazo da edição expirado."); process.exit(1); }
if (saldoAntes === 0n) { console.error("✗ Carteira sem senhas."); process.exit(1); }

console.log(`\n→ darLance("${ID_EDICAO}", ${VALOR})...`);
const tx = await contrato.darLance(ID_EDICAO, VALOR);
console.log("  tx hash:", tx.hash);

const receipt = await tx.wait();
console.log("  block  :", receipt.blockNumber);
console.log("  gasUsed:", receipt.gasUsed.toString());

// ── Parse evento LanceDado do receipt ────────────────────────────────────────
const iface  = contrato.interface;
const evento = receipt.logs
  .map((log) => { try { return iface.parseLog(log); } catch { return null; } })
  .find((e) => e?.name === "LanceDado");

if (!evento) { console.error("\n✗ Evento LanceDado NÃO emitido no receipt."); process.exit(1); }

console.log("\n✓ Evento LanceDado capturado:");
console.log("  idEdicao        :", evento.args.idEdicao);
console.log("  lancador        :", evento.args.lancador);
console.log("  valorEmCentavos :", evento.args.valorEmCentavos.toString());
console.log("  repetido        :", evento.args.repetido);
console.log("  timestamp       :", new Date(Number(evento.args.timestamp) * 1000).toISOString());

// ── Validação pós-estado ─────────────────────────────────────────────────────
const saldoDepois = await contrato.saldoSenhas(wallet.address);
console.log("\nSaldo de senhas (depois):", saldoDepois.toString());

const expected = saldoAntes - 1n;
if (saldoDepois !== expected) {
  console.error(`✗ Saldo esperado ${expected}, obtido ${saldoDepois}.`);
  process.exit(1);
}
if (evento.args.idEdicao !== ID_EDICAO)                 { console.error("✗ idEdicao divergente."); process.exit(1); }
if (evento.args.lancador.toLowerCase() !== wallet.address.toLowerCase()) {
  console.error("✗ lancador divergente."); process.exit(1);
}
if (Number(evento.args.valorEmCentavos) !== VALOR)      { console.error("✗ valor divergente."); process.exit(1); }

console.log("\n✓✓ Pipeline on-chain validado ponta a ponta.");
console.log(`Etherscan tx: https://sepolia.etherscan.io/tx/${tx.hash}`);

import { ethers } from "ethers";
import "dotenv/config";
import fs from "fs";

const [enderecoArg, quantidadeArg] = process.argv.slice(2);

if (!enderecoArg) {
  console.error("Uso: node setup-operacional.js <enderecoUsuario> [quantidade]");
  console.error("  enderecoUsuario  endereço EVM 0x... que receberá as senhas");
  console.error("  quantidade       inteiro positivo (padrão: 100)");
  process.exit(1);
}

if (!ethers.isAddress(enderecoArg)) {
  console.error(`Endereço inválido: ${enderecoArg}`);
  process.exit(1);
}

const quantidade = quantidadeArg ? Number(quantidadeArg) : 100;
if (!Number.isInteger(quantidade) || quantidade <= 0) {
  console.error(`Quantidade inválida: ${quantidadeArg} — use inteiro positivo.`);
  process.exit(1);
}

console.log("RPC_URL:", process.env.RPC_URL ? "loaded" : "MISSING");
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "loaded" : "MISSING");

const artifact = JSON.parse(
  fs.readFileSync("./artifacts/contracts/Leilao.sol/LeilaoGUT.json", "utf8")
);

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contrato = new ethers.Contract(
  "0x273Ef96f5be04601FD39DAcDFB039d6fB552445e",
  artifact.abi,
  wallet
);

async function run() {
  console.log("Coordenacao:", wallet.address);
  console.log(`Creditando ${quantidade} senha(s) para ${enderecoArg}...`);

  const saldoAntes = await contrato.saldoSenhas(enderecoArg);
  console.log("  saldo antes:", saldoAntes.toString());

  const tx = await contrato.adicionarSenhas(enderecoArg, quantidade);
  console.log("  adicionarSenhas tx:", tx.hash);
  await tx.wait();

  const saldoDepois = await contrato.saldoSenhas(enderecoArg);
  console.log("  saldo depois:", saldoDepois.toString());

  console.log("Concluído.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

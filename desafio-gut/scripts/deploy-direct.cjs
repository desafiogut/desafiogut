const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/qU_kw3WpEY4gttS0Cfr2B");
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("PRIVATE_KEY não definida");
  const wallet = new ethers.Wallet(privateKey, provider);

  const artifactPath = path.join(process.cwd(), "artifacts/contracts/Leilao.sol/LeilaoGUT.json");
  if (!fs.existsSync(artifactPath)) {
    throw new Error("Artifact não encontrado em: " + artifactPath);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log("📤 Implantando contrato (sem argumentos)...");
  
  // Tentar deploy sem argumentos (construtor padrão)
  const leilao = await factory.deploy({ gasLimit: 5000000 });
  await leilao.waitForDeployment();
  const endereco = await leilao.getAddress();
  console.log("✅ Contrato implantado em:", endereco);
}

main().catch(console.error);

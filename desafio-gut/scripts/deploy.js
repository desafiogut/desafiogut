const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const signer = await provider.getSigner(0);

  console.log("Deploy feito pelo endereço:", await signer.getAddress());

  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/Leilao.sol/LeilaoGUT.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    signer
  );

  console.log("Fazendo deploy do contrato LeilaoGUT...");
  const contrato = await factory.deploy();
  await contrato.waitForDeployment();

  const endereco = await contrato.getAddress();
  console.log("Contrato LeilaoGUT deployado em:", endereco);
  console.log("Coordenacao:", await contrato.coordenacao());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

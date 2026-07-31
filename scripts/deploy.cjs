const hre = require("hardhat");

async function main() {
  const coordenador = "0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E";
  const LeilaoGUT = await hre.ethers.getContractFactory("LeilaoGUT");
  const leilao = await LeilaoGUT.deploy(coordenador);
  await leilao.waitForDeployment();
  console.log("✅ Contrato implantado em:", await leilao.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

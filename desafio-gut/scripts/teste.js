const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const CONTRATO_ENDERECO = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const EDICAO = "R-1";

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  // Coordenador e 3 usuários (contas do Hardhat local)
  const coordenador = await provider.getSigner(0);
  const usuario1    = await provider.getSigner(1);
  const usuario2    = await provider.getSigner(2);
  const usuario3    = await provider.getSigner(3);

  const artifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/Leilao.sol/LeilaoGUT.json"),
      "utf8"
    )
  );

  const contrato = new ethers.Contract(CONTRATO_ENDERECO, artifact.abi, coordenador);

  console.log("=== SETUP: Distribuindo senhas ===");
  await (await contrato.adicionarSenhas(await usuario1.getAddress(), 1)).wait();
  await (await contrato.adicionarSenhas(await usuario2.getAddress(), 2)).wait(); // 2 lances
  await (await contrato.adicionarSenhas(await usuario3.getAddress(), 1)).wait();

  console.log(`Usuario1 (${(await usuario1.getAddress()).slice(0,10)}...) → 1 senha`);
  console.log(`Usuario2 (${(await usuario2.getAddress()).slice(0,10)}...) → 2 senhas`);
  console.log(`Usuario3 (${(await usuario3.getAddress()).slice(0,10)}...) → 1 senha`);

  console.log("\n=== LANCES ===");

  // Usuario1: 5 centavos (único)
  await (await contrato.connect(usuario1).darLance(EDICAO, 5)).wait();
  console.log(`Usuario1 deu lance: R$ 0,05`);

  // Usuario2: 3 centavos (REPETIDO por Usuario3) + 8 centavos (único)
  await (await contrato.connect(usuario2).darLance(EDICAO, 3)).wait();
  console.log(`Usuario2 deu lance: R$ 0,03`);

  await (await contrato.connect(usuario3).darLance(EDICAO, 3)).wait();
  console.log(`Usuario3 deu lance: R$ 0,03  ← REPETIDO! Deve ser eliminado`);

  await (await contrato.connect(usuario2).darLance(EDICAO, 8)).wait();
  console.log(`Usuario2 deu lance: R$ 0,08`);

  console.log("\n=== APURAÇÃO ===");
  console.log("Lances registrados:");
  console.log("  R$ 0,03 → 2 lances (NÃO único)");
  console.log("  R$ 0,05 → 1 lance  (único - Usuario1)");
  console.log("  R$ 0,08 → 1 lance  (único - Usuario2)");

  const [menorUnico, ganhador] = await contrato.apurarVencedor(EDICAO);

  console.log("\n=== RESULTADO ===");
  if (ganhador === ethers.ZeroAddress) {
    console.log("Nenhum lance único encontrado!");
  } else {
    console.log(`Menor Lance Único: R$ 0,0${menorUnico.toString()}`);
    console.log(`Ganhador:          ${ganhador}`);
    console.log(`Usuario1:          ${await usuario1.getAddress()}`);
    const correto = ganhador.toLowerCase() === (await usuario1.getAddress()).toLowerCase();
    console.log(`\nResultado correto? ${correto ? "✅ SIM — Usuario1 venceu com R$ 0,05!" : "❌ NÃO"}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

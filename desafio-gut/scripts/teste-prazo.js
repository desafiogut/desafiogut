const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const CONTRATO_ENDERECO = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
const EDICAO = "R-2";

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  const coordenador = await provider.getSigner(0);
  const usuario1    = await provider.getSigner(1);
  const usuario2    = await provider.getSigner(2);

  const artifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/Leilao.sol/LeilaoGUT.json"),
      "utf8"
    )
  );

  const contrato = new ethers.Contract(CONTRATO_ENDERECO, artifact.abi, coordenador);

  console.log("=== SETUP ===");

  // Abre edição com prazo de 5 segundos
  await (await contrato.abrirEdicao(EDICAO, "Edicao R-2", 5)).wait();
  console.log(`Edicao "${EDICAO}" aberta com prazo de 5 segundos`);

  await (await contrato.adicionarSenhas(await usuario1.getAddress(), 2)).wait();
  await (await contrato.adicionarSenhas(await usuario2.getAddress(), 2)).wait();

  // LANCE DENTRO DO PRAZO
  console.log("\n=== LANCE DENTRO DO PRAZO ===");
  await (await contrato.connect(usuario1).darLance(EDICAO, 5)).wait();
  console.log("Usuario1 deu lance de R$ 0,05 ✅");

  await (await contrato.connect(usuario2).darLance(EDICAO, 9)).wait();
  console.log("Usuario2 deu lance de R$ 0,09 ✅");

  // Avança o tempo da blockchain local em 10 segundos
  console.log("\n=== AVANÇANDO O TEMPO 10 SEGUNDOS (prazo encerrado) ===");
  await provider.send("evm_increaseTime", [10]);
  await provider.send("evm_mine", []);
  console.log("Tempo avancado. Prazo encerrado.");

  // LANCE FORA DO PRAZO
  console.log("\n=== LANCE FORA DO PRAZO ===");
  try {
    await contrato.connect(usuario1).darLance(EDICAO, 3);
    console.log("PASSOU — contrato NAO bloqueou ❌");
  } catch (err) {
    const motivo = err?.revert?.args?.[0] ?? err?.reason ?? "erro";
    console.log(`BLOQUEADO ✅ — Motivo: "${motivo}"`);
  }

  // APURAÇÃO APÓS ENCERRAMENTO
  console.log("\n=== APURAÇÃO APÓS ENCERRAMENTO ===");
  const [menor, ganhador] = await contrato.apurarVencedor(EDICAO);
  console.log(`Menor Lance Unico: R$ 0,0${menor.toString()}`);
  console.log(`Ganhador: ${ganhador}`);
  console.log(`Usuario1: ${await usuario1.getAddress()}`);
  const correto = ganhador.toLowerCase() === (await usuario1.getAddress()).toLowerCase();
  console.log(`\nResultado correto? ${correto ? "✅ SIM — Usuario1 venceu com R$ 0,05!" : "❌ NAO"}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

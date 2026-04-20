const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const CONTRATO_ENDERECO = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
const EDICAO = "R-1";

async function testar(descricao, fn) {
  process.stdout.write(`\nTeste: ${descricao}\n`);
  try {
    await fn();
    console.log("  Resultado: PASSOU (sem erro)");
  } catch (err) {
    const motivo = err?.revert?.args?.[0] ?? err?.reason ?? err?.message?.split("(")?.[0]?.trim() ?? "erro desconhecido";
    console.log(`  Resultado: BLOQUEADO ✅`);
    console.log(`  Motivo:    "${motivo}"`);
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  const coordenador = await provider.getSigner(0);
  const usuario2    = await provider.getSigner(2); // sem saldo extra
  const semSaldo    = await provider.getSigner(4); // nunca recebeu senhas

  const artifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/Leilao.sol/LeilaoGUT.json"),
      "utf8"
    )
  );

  const contrato = new ethers.Contract(CONTRATO_ENDERECO, artifact.abi, coordenador);

  console.log("==============================");
  console.log("  TESTES DE SEGURANÇA");
  console.log("==============================");

  // TESTE 1: Lance com saldo zero de senhas
  await testar(
    "Lance com saldo ZERO de senhas (conta4 nunca recebeu senhas)",
    async () => {
      await contrato.connect(semSaldo).darLance(EDICAO, 10);
    }
  );

  // TESTE 2: apurarVencedor por não-coordenador
  await testar(
    "apurarVencedor() chamado pelo Usuario2 (não é coordenador)",
    async () => {
      const [menor, ganhador] = await contrato.connect(usuario2).apurarVencedor(EDICAO);
      // Se passou, mostrar o resultado
      console.log(`  ⚠️  ATENÇÃO: qualquer um pode apurar! Menor=${menor}, Ganhador=${ganhador}`);
    }
  );

  // TESTE 3: Lance de valor zero
  await testar(
    "Lance com valor ZERO centavos",
    async () => {
      // Primeiro garante uma senha para o teste não falhar pelo motivo errado
      await (await contrato.adicionarSenhas(await semSaldo.getAddress(), 1)).wait();
      await contrato.connect(semSaldo).darLance(EDICAO, 0);
    }
  );

  console.log("\n==============================");
  console.log("  RESUMO");
  console.log("==============================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

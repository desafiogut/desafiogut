const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Rede esperada. 1 = Ethereum mainnet. Sobrescreva com EXPECTED_CHAIN_ID se precisar
// (ex.: 11155111 para um ensaio em Sepolia com este mesmo script).
const EXPECTED_CHAIN_ID = BigInt(process.env.EXPECTED_CHAIN_ID || "1");

function confirmar(pergunta) {
  // Permite pular a confirmação interativa em CI com AUTO_CONFIRM=1 (use com cautela).
  if (process.env.AUTO_CONFIRM === "1") return Promise.resolve(true);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(pergunta, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === "s");
    });
  });
}

async function main() {
  // ── Validação de ambiente ────────────────────────────────────────────────
  const rpcUrl = process.env.MAINNET_RPC_URL;
  if (!rpcUrl) throw new Error("MAINNET_RPC_URL não definida");
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("PRIVATE_KEY não definida");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  // ── Guarda de rede (evita deploy na cadeia errada) ───────────────────────
  const net = await provider.getNetwork();
  if (net.chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(
      `Rede inesperada: chainId=${net.chainId} (esperado ${EXPECTED_CHAIN_ID}). ` +
      `Verifique MAINNET_RPC_URL. Abortando.`
    );
  }

  // ── Artifact (Hardhat: rodar 'npx hardhat compile' antes) ────────────────
  const artifactPath = path.join(process.cwd(), "artifacts/contracts/Leilao.sol/LeilaoGUT.json");
  if (!fs.existsSync(artifactPath)) {
    throw new Error("Artifact não encontrado em: " + artifactPath + " (rode 'npx hardhat compile')");
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  // ── Preflight: quem vai deployar, com quanto, e quanto custa ──────────────
  const deployer = await wallet.getAddress();
  const balance = await provider.getBalance(deployer);
  if (balance === 0n) throw new Error(`Deployer ${deployer} tem saldo ZERO. Financie a EOA antes.`);

  const deployTx = await factory.getDeployTransaction();
  const gasEstimate = await provider.estimateGas({ ...deployTx, from: deployer });
  const gasLimit = (gasEstimate * 120n) / 100n; // +20% de folga
  const fee = await provider.getFeeData();
  const maxFee = fee.maxFeePerGas ?? fee.gasPrice ?? 0n;
  const custoMax = gasLimit * maxFee;

  console.log("──────────────────────────────────────────────");
  console.log("📋 PREFLIGHT DO DEPLOY (mainnet)");
  console.log(`  Rede/chainId : ${net.chainId}`);
  console.log(`  Deployer     : ${deployer}  (será a coordenacao)`);
  console.log(`  Saldo        : ${ethers.formatEther(balance)} ETH`);
  console.log(`  Gás estimado : ${gasEstimate} (limite c/ folga: ${gasLimit})`);
  console.log(`  maxFeePerGas : ${ethers.formatUnits(maxFee, "gwei")} gwei`);
  console.log(`  Custo máx    : ~${ethers.formatEther(custoMax)} ETH`);
  console.log("──────────────────────────────────────────────");

  if (balance < custoMax) {
    throw new Error(
      `Saldo insuficiente: ${ethers.formatEther(balance)} ETH < custo máx ` +
      `~${ethers.formatEther(custoMax)} ETH. Financie mais a EOA.`
    );
  }

  const ok = await confirmar("Confirmar deploy na MAINNET com esta EOA? (s/n) ");
  if (!ok) {
    console.log("❌ Deploy cancelado pelo operador.");
    return;
  }

  // ── Deploy ────────────────────────────────────────────────────────────────
  console.log("📤 Implantando contrato na mainnet...");
  const leilao = await factory.deploy({ gasLimit });
  console.log("   tx enviada:", leilao.deploymentTransaction()?.hash);
  await leilao.waitForDeployment();
  const endereco = await leilao.getAddress();
  console.log("✅ Contrato implantado em:", endereco);

  // ── Verificação pós-deploy: coordenacao() deve ser o deployer ─────────────
  try {
    const coord = await leilao.coordenacao();
    const bate = coord.toLowerCase() === deployer.toLowerCase();
    console.log(`🔎 coordenacao() = ${coord} ${bate ? "✅ (== deployer)" : "⚠️ NÃO bate com deployer!"}`);
    if (!bate) {
      console.error("⚠️ ATENÇÃO: coordenacao() não é o deployer. Investigue antes de usar.");
      process.exit(2);
    }
  } catch (e) {
    console.error("⚠️ Não foi possível ler coordenacao() para verificar:", e.message);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error("❌ Falha no deploy:", err.message || err);
  process.exit(1);
});

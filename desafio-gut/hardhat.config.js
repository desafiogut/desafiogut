import "dotenv/config";
import HardhatEthers from "@nomicfoundation/hardhat-ethers";
import HardhatIgnitionEthers from "@nomicfoundation/hardhat-ignition-ethers";

export default {
  plugins: [HardhatEthers, HardhatIgnitionEthers],
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    sepolia: {
      type: "http",
      url: process.env.RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    // MC40 — rede mainnet (chain 1). INERTE sem MAINNET_RPC_URL + DEPLOYER_PRIVATE_KEY
    // e sem `--network mainnet` explícito. DEPLOYER_PRIVATE_KEY é uma EOA EFÊMERA,
    // financiada só p/ o deploy e totalmente divestida pelo two-step transfer (a
    // coordenação final é a Smart Account ERC-4337 owner-KMS). NUNCA commitar chaves (R9).
    // O deploy/transfer é OPERADOR-ONLY (ETH real, irreversível) — ver plans/001-mc40-mainnet-deploy.md.
    mainnet: {
      type: "http",
      url: process.env.MAINNET_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 1,
    },
  },
};

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
  },
};

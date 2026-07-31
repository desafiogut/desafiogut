import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/qU_kw3WpEY4gttS0Cfr2B",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

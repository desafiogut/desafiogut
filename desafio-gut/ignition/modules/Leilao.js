const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("LeilaoModule", (m) => {
  const leilao = m.contract("LeilaoGUT");
  return { leilao };
});

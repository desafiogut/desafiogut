import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("LeilaoModule", (m) => {
  const leilao = m.contract("LeilaoGUT");
  return { leilao };
});

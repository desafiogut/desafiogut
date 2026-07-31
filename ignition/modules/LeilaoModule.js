import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("LeilaoModule", (m) => {
  const coordenador = "0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E";
  const leilao = m.contract("LeilaoGUT", [coordenador]);
  return { leilao };
});

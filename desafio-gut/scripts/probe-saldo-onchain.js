// Probe da camada de leitura on-chain de saldoSenhas adicionada à
// frontend/src/utils/web3.js (getSaldoSenhasOnChain) na migração Opção B.
//
// Reproduz o mesmo caminho ethers (JsonRpcProvider Alchemy → Contract.saldoSenhas)
// que a função em web3.js usa. Se este probe retornar o valor esperado, a
// função em web3.js retornará o mesmo (código idêntico).
//
// USO:
//   node scripts/probe-saldo-onchain.js
//   node scripts/probe-saldo-onchain.js 0xWalletEspecifica
//
// Requer (opcional): RPC_URL no .env. Sem isso, usa o Alchemy default.

import "dotenv/config";
import { JsonRpcProvider, Contract } from "ethers";

const RPC      = process.env.RPC_URL ?? "https://eth-sepolia.g.alchemy.com/v2/qU_kw3WpEY4gttS0Cfr2B";
const CONTRATO = "0x273Ef96f5be04601FD39DAcDFB039d6fB552445e";
const ABI      = ["function saldoSenhas(address) view returns (uint256)"];

const padrao = [
  ["coordenacao (deployer)", "0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E"],
  ["address vazio (BEEF)  ", "0x000000000000000000000000000000000000bEEF"],
];
const argv  = process.argv.slice(2);
const alvos = argv.length > 0 ? argv.map((a) => [a, a]) : padrao;

const provider = new JsonRpcProvider(RPC);
const contrato = new Contract(CONTRATO, ABI, provider);

console.log("RPC      :", RPC.replace(/\/v2\/.*$/, "/v2/<chave>"));
console.log("Contrato :", CONTRATO);
console.log("");
for (const [nome, addr] of alvos) {
  const t0 = Date.now();
  try {
    const raw = await contrato.saldoSenhas(addr);
    const ms  = Date.now() - t0;
    console.log(`  ${nome}: saldoSenhas(${addr.slice(0,6)}…${addr.slice(-4)}) = ${Number(raw)}   (${ms}ms)`);
  } catch (e) {
    console.log(`  ${nome}: ERRO = ${e.message}`);
  }
}

await provider.destroy?.();

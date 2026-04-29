// Abre a edição "R-1" e credita senhas para testes on-chain.
//
// Uso:
//   node scripts/setup-edicao.js                       → credita 10 senhas no deployer
//   node scripts/setup-edicao.js 0xUser1 0xUser2 ...   → credita 5 senhas em cada endereço passado
//
// Pré-requisitos:
//   .env com PRIVATE_KEY (deployer = coordenacao) e RPC_URL Sepolia.

import "dotenv/config";
import { JsonRpcProvider, Wallet, Contract, isAddress } from "ethers";

const CONTRATO   = "0x273Ef96f5be04601FD39DAcDFB039d6fB552445e";
const ID_EDICAO  = "R-1";
const NOME       = "Edição R-1 — Beta";
const DURACAO_S  = 1800;     // 30 minutos
const SENHAS_PADRAO = 10;
const SENHAS_POR_USUARIO = 5;

const ABI = [
  "function coordenacao() view returns (address)",
  "function edicoes(string) view returns (string nome, bool ativa, uint256 prazo)",
  "function abrirEdicao(string idEdicao, string nome, uint256 duracaoSegundos) public",
  "function adicionarSenhas(address usuario, uint256 quantidade) public",
  "function saldoSenhas(address) view returns (uint256)",
  "event EdicaoAberta(string idEdicao, string nome, uint256 prazo)",
  "event SenhasCreditadas(address indexed usuario, uint256 quantidade)",
];

function fail(msg) { console.error("✗", msg); process.exit(1); }

if (!process.env.PRIVATE_KEY) fail("PRIVATE_KEY ausente em .env");
if (!process.env.RPC_URL)     fail("RPC_URL ausente em .env");

const provider = new JsonRpcProvider(process.env.RPC_URL);
const wallet   = new Wallet(process.env.PRIVATE_KEY, provider);
const contrato = new Contract(CONTRATO, ABI, wallet);

console.log("Deployer / coordenacao :", wallet.address);
console.log("Contrato               :", CONTRATO);

const coord = await contrato.coordenacao();
if (coord.toLowerCase() !== wallet.address.toLowerCase()) {
  fail(`Carteira (${wallet.address}) NÃO é a coordenacao do contrato (${coord}).`);
}

// ── 1. Abrir edição (idempotente: se já estiver ativa, pula) ─────────────────
const ed = await contrato.edicoes(ID_EDICAO);
const agora = Math.floor(Date.now() / 1000);
const aindaAtiva = ed.ativa && Number(ed.prazo) > agora;

if (aindaAtiva) {
  const restante = Number(ed.prazo) - agora;
  console.log(`✓ Edição "${ID_EDICAO}" já ativa (resta ${restante}s) — pulando abrirEdicao.`);
} else {
  console.log(`→ abrirEdicao("${ID_EDICAO}", "${NOME}", ${DURACAO_S})...`);
  const tx = await contrato.abrirEdicao(ID_EDICAO, NOME, DURACAO_S);
  const r = await tx.wait();
  console.log(`✓ abrirEdicao confirmada — tx ${r.hash} (block ${r.blockNumber})`);
}

// ── 2. Creditar senhas ───────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const alvos = argv.length > 0
  ? argv.map((a) => { if (!isAddress(a)) fail(`Argumento inválido: ${a}`); return a; })
  : [wallet.address];
const quantidade = argv.length > 0 ? SENHAS_POR_USUARIO : SENHAS_PADRAO;

for (const alvo of alvos) {
  const antes = await contrato.saldoSenhas(alvo);
  console.log(`→ adicionarSenhas(${alvo}, ${quantidade})  [saldo atual: ${antes}]`);
  const tx = await contrato.adicionarSenhas(alvo, quantidade);
  const r = await tx.wait();
  const depois = await contrato.saldoSenhas(alvo);
  console.log(`✓ tx ${r.hash} — saldo agora: ${depois}`);
}

console.log("\nSetup concluído.");
console.log(`Etherscan: https://sepolia.etherscan.io/address/${CONTRATO}`);

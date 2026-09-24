const solc = require("solc"), fs = require("fs"), crypto = require("crypto");
const SRC = "contracts/Leilao.sol";
const raw = fs.readFileSync(SRC);
const source = raw.toString("utf8");
const settings = { optimizer: { enabled: true, runs: 200 }, evmVersion: "paris",
                   outputSelection: { "*": { "*": ["abi","evm.bytecode.object"] } } };
const out = JSON.parse(solc.compile(JSON.stringify({
  language: "Solidity", sources: { "Leilao.sol": { content: source } }, settings })));
const errs = (out.errors||[]).filter(e => e.severity === "error");
if (errs.length) { console.error(errs.map(e=>e.formattedMessage).join("\n")); process.exit(1); }
const c = out.contracts["Leilao.sol"]["LeilaoGUT"];
const fixture = {
  _comentario: "MC93-E. Gerado por scripts/gerar-fixture-evm.cjs. NAO editar a mao.",
  _porque: "artifacts/ esta em .gitignore, logo o CI nao tem o artefacto compilado. Esta fixture torna o teste de EVM executavel em qualquer maquina sem solc e sem rede.",
  contrato: "LeilaoGUT",
  fonte: SRC,
  fonteSha256: crypto.createHash("sha256").update(raw).digest("hex"),
  solcVersion: solc.version(),
  settings,
  abi: c.abi,
  bytecode: "0x" + c.evm.bytecode.object,
};
const dest = "frontend/netlify/functions/_tests/fixtures/leilao-gut.evm.json";
fs.writeFileSync(dest, JSON.stringify(fixture, null, 2) + "\n");
console.log("  escrito:", dest);
console.log("  solc   :", fixture.solcVersion);
console.log("  sha256 :", fixture.fonteSha256.slice(0,16) + "...");
console.log("  abi    :", fixture.abi.length, "| bytecode:", fixture.bytecode.length, "chars");

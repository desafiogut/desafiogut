// scripts/utac120-prova-mutacao.mjs — R16: prova que os testes do UTAC120 mordem.
// M1: o LANCE deixa de consumir o Passe        -> teste de cablagem do lance RED
// M2: a COMPRA deixa de creditar o inventário  -> teste de cablagem da compra RED
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const TESTE = "_tests/utac120-inventario.test.mjs";
const md5 = (b) => createHash("md5").update(b).digest("hex");

const mutacoes = [
  {
    nome: "M1 — o lance não consome o Passe Relâmpago",
    ficheiro: "lance-relampago.mjs",
    de: 'const passe = await consumirPasse({ endereco, tipo: "relampago" });',
    para: "const passe = { ok: true }; // M1",
  },
  {
    nome: "M2 — a compra não credita o inventário",
    ficheiro: "validar-compra-google.mjs",
    de: "inventario = await creditarPasse({ endereco, tipo, quantidade: v.quantity });",
    para: "inventario = null; // M2",
  },
];

let mortos = 0;
for (const m of mutacoes) {
  const original = readFileSync(m.ficheiro);
  const src = original.toString("utf8");
  if (!src.includes(m.de)) { console.log(`⚠️  padrão ausente: ${m.nome}`); continue; }
  writeFileSync(m.ficheiro, src.replace(m.de, m.para));
  let passou = true, saida = "";
  try { execFileSync(process.execPath, ["--test", "--experimental-test-module-mocks", TESTE], { stdio: "pipe", timeout: 120000 }); }
  catch (e) { passou = false; saida = (e.stdout?.toString() || "") + (e.stderr?.toString() || ""); }
  writeFileSync(m.ficheiro, original);
  const alvo = saida.includes("UTAC120");
  console.log(`${passou ? "❌ SOBREVIVEU" : "✅ MORTO"} — ${m.nome}${!passou && alvo ? " (teste UTAC120 em RED)" : ""}`);
  console.log(`   md5 restaurado: ${md5(readFileSync(m.ficheiro)) === md5(original) ? "sim" : "NÃO"}`);
  if (!passou) mortos += 1;
}
console.log(`RESULTADO: ${mortos}/${mutacoes.length} mutantes mortos`);
process.exit(mortos === mutacoes.length ? 0 : 1);

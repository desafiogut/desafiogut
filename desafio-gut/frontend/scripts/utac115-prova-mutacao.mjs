// scripts/utac115-prova-mutacao.mjs — R16: prova que o teste do ALTO-1 morde.
// Remove a guarda de corrida entre contas e exige RED no teste novo.
// Restaura sempre o ficheiro original (md5 no fim tem de bater).
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const F = "netlify/functions/validar-compra-google.mjs";
const T = "netlify/functions/_tests/utac110i1-validar-compra-google.test.mjs";
const md5 = (b) => createHash("md5").update(b).digest("hex");
const original = readFileSync(F);
console.log("md5 original:", md5(original));

const guarda = `      if (registo && registo.endereco && registo.endereco !== endereco) {
        captureSecurityAlert(\`\${NOME}_recibo_de_outra_conta_corrida\`, { produto: sku }, "warning").catch(() => {});
        return jsonError(409, "compra_nao_encontrada", "compra não encontrada para esta conta");
      }`;

if (!original.toString("utf8").includes(guarda)) {
  console.log("✖ padrão da guarda não encontrado — mutação não aplicada");
  process.exit(1);
}
writeFileSync(F, original.toString("utf8").replace(guarda, "      // M1: guarda de corrida entre contas removida"));

let passou = true, saida = "";
try {
  execFileSync(process.execPath, ["--test", "--experimental-test-module-mocks", T], { stdio: "pipe" });
} catch (e) {
  passou = false;
  saida = (e.stdout?.toString() || "") + (e.stderr?.toString() || "");
}
writeFileSync(F, original);

const alvoFalhou = saida.includes("CORRIDA ENTRE CONTAS");
console.log(`${passou ? "❌ SOBREVIVEU" : "✅ MORTO"} — M1 sem guarda de corrida entre contas`);
if (!passou) console.log(alvoFalhou ? "   (o teste do ALTO-1 é o que fica RED)" : "   (suíte RED, mas não está claro que foi o teste alvo)");
console.log("md5 final:  ", md5(readFileSync(F)), md5(readFileSync(F)) === md5(original) ? "== original ✔" : "DIVERGIU ✖");
process.exit(!passou ? 0 : 1);

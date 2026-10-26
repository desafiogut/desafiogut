// scripts/utac116-prova-mutacao.mjs — R16: prova que o teste do PIX no APK morde.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const LIB = "src/lib/google-play-billing.js";
const T = "src/__tests__/utac116-pix-apk.test.mjs";
const md5 = (b) => createHash("md5").update(b).digest("hex");
const original = readFileSync(LIB);
console.log("md5 original:", md5(original));
const mutacoes = [
  { nome: "M1 — sem o sinal https://localhost (o bug do AAB v3)", de: 'if (loc && loc.protocol === "https:" && loc.hostname === "localhost" && !loc.port) return "android";', para: "// M1: sinal removido" },
  { nome: "M2 — sem o sinal androidBridge", de: 'if (w?.androidBridge) return "android";', para: "// M2: sinal removido" },
  { nome: "M3 — pixPermitido sempre true (PIX em todo o lado)", de: 'return plataforma !== "android";', para: "return true; // M3" },
];
let mortos = 0;
for (const m of mutacoes) {
  const src = original.toString("utf8");
  if (!src.includes(m.de)) { console.log(`aviso: padrao ausente em ${m.nome}`); continue; }
  writeFileSync(LIB, src.replace(m.de, m.para));
  let passou = true;
  try { execFileSync(process.execPath, ["--test", T], { stdio: "pipe" }); } catch { passou = false; }
  writeFileSync(LIB, original);
  console.log(`${passou ? "SOBREVIVEU" : "MORTO"} — ${m.nome}`);
  if (!passou) mortos += 1;
}
writeFileSync(LIB, original);
console.log("md5 final:  ", md5(readFileSync(LIB)), md5(readFileSync(LIB)) === md5(original) ? "== original" : "DIVERGIU");
console.log(`RESULTADO: ${mortos}/${mutacoes.length}`);
process.exit(mortos === mutacoes.length ? 0 : 1);

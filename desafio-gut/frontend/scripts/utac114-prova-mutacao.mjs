// scripts/utac114-prova-mutacao.mjs — R16: prova que os testes do UTAC114 mordem.
// Aplica 3 mutações cirúrgicas ao _lib/google-play-billing.mjs, corre a suíte dirigida e
// exige RED em cada uma. Restaura sempre o ficheiro original (byte a byte).
import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const LIB = "netlify/functions/_lib/google-play-billing.mjs";
const TESTE = "netlify/functions/_tests/utac114-credencial-supabase.test.mjs";
const BAK = `${process.env.TEMP || "/tmp"}/utac114-lib.bak`;

const md5 = (b) => createHash("md5").update(b).digest("hex");
const original = readFileSync(LIB);
copyFileSync(LIB, BAK);
console.log("md5 original:", md5(original));

const mutacoes = [
  {
    nome: "M1 — sem cache em memória (volta ao banco em cada chamada)",
    de: '  if (_contaCache) return { ok: true, conta: _contaCache, origem: "cache" };',
    para: "  // M1: cache removida de propósito",
    teste: "T5",
  },
  {
    nome: "M2 — sem fallback para o Supabase (só env var)",
    de: '  if (daEnv.code === "google_play_credencial_invalida") return daEnv;',
    para: '  if (daEnv.code === "google_play_credencial_invalida") return daEnv;\n  return { ok: false, code: "google_play_nao_configurado" }; // M2',
    teste: "T2",
  },
  {
    nome: "M3 — env var inválida cai para o banco (mascara o erro de configuração)",
    de: '  if (daEnv.code === "google_play_credencial_invalida") return daEnv;',
    para: "  // M3: a env inválida passou a cair para o banco",
    teste: "T6",
  },
];

let mortos = 0;
for (const m of mutacoes) {
  const src = original.toString("utf8");
  if (!src.includes(m.de)) {
    console.log(`⚠️  ${m.nome}: padrão não encontrado — mutação NÃO aplicada`);
    continue;
  }
  writeFileSync(LIB, src.replace(m.de, m.para));
  let passou = true, saida = "";
  try {
    execFileSync(process.execPath, ["--test", TESTE], { stdio: "pipe" });
  } catch (e) {
    passou = false;
    saida = (e.stdout?.toString() || "") + (e.stderr?.toString() || "");
  }
  writeFileSync(LIB, original);
  const falhouOAlvo = !passou && (saida.includes(`✖ ${m.teste}`) || saida.includes(m.teste));
  console.log(`${passou ? "❌ SOBREVIVEU" : "✅ MORTO"} — ${m.nome} (esperado: ${m.teste} em RED)`);
  if (!passou && !falhouOAlvo) console.log("   (a suíte ficou RED, mas não está claro que foi o teste alvo)");
  if (!passou) mortos += 1;
}

writeFileSync(LIB, original);
copyFileSync(BAK, LIB);
unlinkSync(BAK);
console.log("md5 final:  ", md5(readFileSync(LIB)), md5(readFileSync(LIB)) === md5(original) ? "== original ✔" : "DIVERGIU ✖");
console.log(`RESULTADO: ${mortos}/${mutacoes.length} mutantes mortos`);
process.exit(mortos === mutacoes.length ? 0 : 1);

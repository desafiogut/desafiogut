// scripts/utac110j4b-prova-mutacao.mjs — UTAC110j.4b (Frente B, só-UI). Cada mutante tem de pôr um teste VERMELHO.
// Corre com:  node scripts/utac110j4b-prova-mutacao.mjs   (a partir de desafio-gut/frontend)
// Restauro a partir do conteúdo original em memória + verificação md5 (nunca do HEAD: há trabalho por commitar).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const md5 = (s) => createHash("md5").update(s).digest("hex");
const PAGINA = "src/pages/__tests__/MeusAtivos.test.mjs";
const LIB = "src/lib/pontosLance.test.mjs";
const HOOK = "src/__tests__/utac110j4b-usepontos-lance.test.mjs";

const MUTANTES = [
  ["M1 a página deixa de passar o `lance`", "src/pages/MeusAtivos.jsx", "lance={pontos.lance}", "lance={null}", PAGINA],
  ["M2 janela do token esquecida", "src/pages/MeusAtivos.jsx", "pontos.loading || (temSessao && !authToken)", "pontos.loading", PAGINA],
  ["M3 ganhos somam deltas negativos", "src/lib/pontosLance.js", "    if (m.delta <= 0) continue;\n", "", LIB],
  ["M4 créditos contados como pontos", "src/lib/pontosLance.js", ' || h.campo !== CAMPO_PONTOS) return null;', ") return null;", LIB],
  ["M5 anónimo vê números", "src/components/meus-ativos/PainelPontosLance.jsx", 'if (!temSessao) estado = "sem-sessao";', 'if (false) estado = "sem-sessao";', PAGINA],
  ["M6 o hook real não passa o `lance`", "src/hooks/usePontos.js", "lance: pontosLanceDaResposta(data),", "lance: null,", HOOK],
  ["M7 o erro não chega ao painel", "src/components/meus-ativos/PainelPontosLance.jsx", 'else if (erro) estado = "erro";', 'else if (false) estado = "erro";', PAGINA],
];

let provados = 0;
for (const [nome, ficheiro, de, para, teste] of MUTANTES) {
  const original = readFileSync(ficheiro, "utf8");
  const h0 = md5(original);
  const n = original.split(de).length - 1;
  if (n !== 1) { console.log(`ABORTA ${nome}: âncora casou ${n}×`); process.exit(2); }
  writeFileSync(ficheiro, original.replace(de, () => para));
  let fail = null;
  try {
    const r = spawnSync(process.execPath, ["--test", teste], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 300000 });
    const m = (r.stdout + r.stderr).match(/ℹ fail (\d+)/);
    fail = m ? Number(m[1]) : null;
  } finally {
    writeFileSync(ficheiro, original);
  }
  const ok = md5(readFileSync(ficheiro, "utf8")) === h0;
  const morde = fail !== null && fail > 0;
  if (morde) provados += 1;
  console.log(`${morde ? "PROVADO " : "SOBREVIVE"} ${nome} — fail=${fail} · restauro md5 ${ok ? "idêntico" : "DIFERENTE ⛔"}`);
  if (!ok) process.exit(3);
}
console.log(`\n${provados}/${MUTANTES.length} PROVADOS`);
process.exit(provados === MUTANTES.length ? 0 : 1);

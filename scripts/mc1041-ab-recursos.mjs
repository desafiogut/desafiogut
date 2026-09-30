#!/usr/bin/env node
// MC104.1 — A/B pareado do useRecursosApp (HARD GATE 2). Mesmos cenários, mesmo arnês, dois braços:
//   antes  = o hook do HEAD (`git show <ref>:…`) numa cópia TEMPORÁRIA com UMA transformação mecânica
//            (`async function carregarRecursos` → `export async function carregarRecursos`), apagada no fim;
//   depois = o hook da árvore de trabalho.
// Uso: node scripts/mc1041-ab-recursos.mjs [ref=HEAD]   → escreve o relatório e sai 0 se as chaves antigas são iguais.
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut", "frontend");
const REF = process.argv[2] || "HEAD";
const TMP_REL = "src/hooks/__ab_antes_useRecursosApp.js";
const TMP = join(FE, TMP_REL);

const antigo = execFileSync("git", ["-C", RAIZ, "show", `${REF}:desafio-gut/frontend/src/hooks/useRecursosApp.js`], { encoding: "utf8" });
const alvo = "async function carregarRecursos";
if (antigo.split(alvo).length !== 2) throw new Error("transformação mecânica não aplicável (alvo ≠ 1 ocorrência)");
const antigoExp = antigo.includes(`export ${alvo}`) ? antigo : antigo.replace(alvo, `export ${alvo}`);

const { carregarModulo, correr, fecharArnes } = await import(pathToFileURL(join(FE, "src/hooks/__tests__/_recursos-arnes.mjs")).href);

const PROD = { isLeilaoAtivo: { ios: false, pwa: true, android: false }, isPagamentoNativoAtivo: { ios: false, pwa: false, android: false } };
const CONFIGS = {
  producao: PROD, nulo: null, vazio: {}, string: "x",
  leilaoTudoOn: { isLeilaoAtivo: { ios: true, android: true, pwa: true } },
  malformado: { isLeilaoAtivo: "sim", isPagamentoNativoAtivo: null },
  comFlagsNovas: { ...PROD, isTorneioVisivel: false, limitePassesIndicacao: 7 },
};
const cenarios = [];
for (const [n, v] of Object.entries(CONFIGS)) cenarios.push([`supabase:${n}`, { via: "supabase", valor: v }]);
cenarios.push(["supabase:linhaAusente", { via: "supabase", valor: undefined }]);
cenarios.push(["supabase-erro→funcao", { via: "supabase-erro", corpo: { plataforma: "pwa", isLeilaoAtivo: true, isPagamentoNativoAtivo: false } }]);
cenarios.push(["funcao:prodAntes", { via: "funcao", corpo: { plataforma: "pwa", isLeilaoAtivo: true, isPagamentoNativoAtivo: false } }]);
cenarios.push(["funcao:prodDepoisMC103", { via: "funcao", corpo: { plataforma: "pwa", isLeilaoAtivo: true, isPagamentoNativoAtivo: false, isProgramadaSenhasAtiva: true, isTorneioVisivel: true, isSenhaBonusAtiva: true, isCampanhaIndicacaoAtiva: false, limitePassesIndicacao: 5 } }]);
cenarios.push(["funcao:http500", { via: "funcao", status: 500, corpo: {} }]);
cenarios.push(["local", { via: "local" }]);
const PLATS = ["ios", "android", "pwa"];

async function braco(caminho) {
  const mod = await carregarModulo(caminho);
  const out = {};
  for (const [nome, c] of cenarios) for (const p of PLATS) out[`${nome}|${p}`] = await correr(mod, c, p);
  return out;
}

const ANTIGAS = ["plataforma", "isLeilaoAtivo", "isPagamentoNativoAtivo"];
let resultado;
try {
  writeFileSync(TMP, antigoExp);
  const antes = await braco("/" + TMP_REL);
  const depois = await braco("/src/hooks/useRecursosApp.js");
  let difAntigas = 0; const novasPorCaso = {};
  for (const k of Object.keys(antes)) {
    for (const c of ANTIGAS) if (JSON.stringify(antes[k][c]) !== JSON.stringify(depois[k][c])) { difAntigas++; console.log("DIF", k, c, antes[k][c], "→", depois[k][c]); }
    const extra = Object.keys(depois[k]).filter((c) => !(c in antes[k]));
    novasPorCaso[k] = Object.fromEntries(extra.map((c) => [c, depois[k][c]]));
  }
  resultado = { ref: REF, casos: Object.keys(antes).length, difAntigas, antes, depois, novasPorCaso };
  writeFileSync(join(RAIZ, "_logs", "MC104.1_AB.json"), JSON.stringify(resultado, null, 1));
  console.log(`A/B: ${resultado.casos} casos · diferenças nas chaves antigas: ${difAntigas}`);
} finally {
  if (existsSync(TMP)) rmSync(TMP);
  await fecharArnes();
}
process.exit(resultado.difAntigas ? 1 : 0);

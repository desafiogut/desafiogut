// UTAC136 — prova de mutação (GATE 7 / T1). Cada mutante repõe uma regra antiga (ou parte a nova) e tem de
// pôr VERMELHO pelo menos um dos testes indicados. O restauro é feito a partir de uma CÓPIA em memória
// (nunca `git checkout` — lição do UTAC000.11) e confirmado por md5.
// Uso: node _tests/utac136-prova-mutacao.mjs   (cwd = netlify/functions)
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const md5 = (s) => createHash("md5").update(s).digest("hex");
const T = {
  conv: "_tests/utac136-conversao-eco-passe.test.mjs",
  palp: "_tests/utac136-palpite-gratis.test.mjs",
  d: "_tests/utac110d-dois-passes.test.mjs",
  e: "_tests/utac110e-eco-quildo.test.mjs",
  n: "_tests/utac110n-pontos-lance.test.mjs",
  i: "_tests/utac110i1-validar-compra-google.test.mjs",
  h2: "_tests/utac110h2-eco-indicacao.test.mjs",
};
const MUTANTES = [
  ["M1 fidelidade volta a 10", "_lib/passe-pontos.mjs", "export const PONTOS_FIDELIDADE_POR_PASSE = 1;", "export const PONTOS_FIDELIDADE_POR_PASSE = 10;", [T.conv, T.d]],
  ["M2 ECOQUILDO volta a R$ 1,00", "_lib/eco-quildo.mjs", "export const CENTAVOS_POR_ECOQUILDO = 50;", "export const CENTAVOS_POR_ECOQUILDO = 100;", [T.conv, T.e]],
  ["M3 +200 pontos de lance de volta no Relâmpago", "_lib/comprar-passe-tipado.mjs",
    "  const eco = await garantirEcoDoPasse(ctx, endereco, ref);\n  if (!eco.ok) return { ok: false, etapa: \"eco\", code: eco.code, pontos: p.pontos };",
    "  if (ctx.ehRelampago) await (await import(\"./ledger-lance.mjs\")).creditarPontosLance(endereco, 200 * ctx.quantidade, \"passe-relampago\", ref);\n  const eco = await garantirEcoDoPasse(ctx, endereco, ref);\n  if (!eco.ok) return { ok: false, etapa: \"eco\", code: eco.code, pontos: p.pontos };",
    [T.n, T.d, T.conv]],
  ["M4 palpite volta a consumir Passe", "registar-palpite.mjs",
    "  let r;\n  try { r = await registarPalpite(t.endereco, edicaoId, valor); }",
    "  const _inv = await (await import(\"./_lib/passes-inventario.mjs\")).consumirPasse({ endereco: t.endereco, tipo: \"programado\" });\n  if (!_inv.ok) return jsonError(400, \"sem_passes_disponiveis\", \"x\");\n  let r;\n  try { r = await registarPalpite(t.endereco, edicaoId, valor); }",
    [T.palp]],
  ["M5 conversão credita sem ter ganho o CAS (dupla emissão)", "_lib/conversao-eco-passe.mjs",
    "    if (d.criado !== true) continue; // outra chamada fez esta conversão — relê\n", "", [T.conv]],
  ["M6 conversão credita Passe Relâmpago", "_lib/conversao-eco-passe.mjs",
    "export const TIPO_PASSE_CONVERSAO = \"programado\";", "export const TIPO_PASSE_CONVERSAO = \"relampago\";", [T.conv]],
  ["M7 conversão não regista o «usado» no lastro", "_lib/conversao-eco-passe.mjs",
    "    const l = await registarUsoNoLastro(ECOQUILDO_POR_CONVERSAO).catch(() => ({ ok: false, code: \"ERRO_DB\" }));",
    "    const l = { ok: true };", [T.conv]],
  ["M8 conversão não dá o ponto de fidelidade", "_lib/conversao-eco-passe.mjs",
    "    const p = await creditarPontos(endereco, PONTOS_FIDELIDADE_POR_PASSE, TIPO_COMPRA, ref).catch(() => ({ ok: false, code: \"ERRO_DB\" }));",
    "    const p = { ok: true, criado: false };", [T.conv]],
  ["M9 compra de Passe não chama a conversão", "_lib/comprar-passe-tipado.mjs",
    "  const conv = await converterEcoEmPassesSeguro(endereco, ctx.nome);", "  const conv = null;", [T.conv, T.d]],
  ["M10 crédito de admin não chama a conversão", "creditar-eco-quildo.mjs",
    "  const conv = await converterEcoEmPassesSeguro(endereco, \"creditar-eco-quildo\");", "  const conv = null;", [T.conv]],
  ["M11 indicação não chama a conversão", "_lib/fontes-lance.mjs",
    "    for (const c of criados) await converterEcoEmPassesSeguro(c.endereco, \"indicacao\");\n", "", [T.h2, T.conv]],
  ["M12 falha do inventário não desfaz o débito", "_lib/conversao-eco-passe.mjs",
    "      const rev = await reverterEcoQuildo(endereco, ref).catch(() => ({ ok: false }));\n      if (!(rp.ok && rl.ok && rev.ok && rev.revertido))",
    "      const rev = { ok: true, revertido: true };\n      if (!(rp.ok && rl.ok && rev.ok && rev.revertido))", [T.conv]],
];

let vermelhos = 0, sobreviventes = [];
for (const [nome, ficheiro, alvo, mutacao, testes] of MUTANTES) {
  const original = readFileSync(ficheiro, "utf8");
  const h0 = md5(original);
  if (original.split(alvo).length !== 2) { console.log(`${nome}: ALVO NÃO CASA 1× — PARAR`); process.exit(2); }
  writeFileSync(ficheiro, original.replace(alvo, () => mutacao));
  let r;
  try {
    r = spawnSync("node", ["--test", "--experimental-test-module-mocks", ...testes], { encoding: "utf8", timeout: 300000 });
  } finally {
    writeFileSync(ficheiro, original);
  }
  const igual = md5(readFileSync(ficheiro, "utf8")) === h0;
  const fail = Number((/^ℹ fail (\d+)$/m.exec(`${r.stdout}${r.stderr}`) || [])[1] ?? NaN);
  const red = fail > 0;
  if (red) vermelhos++; else sobreviventes.push(nome);
  console.log(`${nome}: ${red ? `RED (${fail} falha(s))` : "SOBREVIVEU"} · md5 restaurado ${igual ? "IDÊNTICO" : "DIFERENTE <-- PARAR"}`);
  if (!igual) process.exit(3);
}
console.log(`RESULTADO: ${vermelhos}/${MUTANTES.length} RED${sobreviventes.length ? ` · sobreviventes: ${sobreviventes.join("; ")}` : ""}`);
process.exit(sobreviventes.length ? 1 : 0);

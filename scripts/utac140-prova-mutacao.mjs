// UTAC140 — prova de mutação (GATE 7 / T1). Cada mutante: cópia de segurança FORA do repo → mutação (asserta
// que casou) → teste dirigido → RED esperado → restauro da cópia → md5 idêntico. Corre de qualquer cwd.
//   node scripts/utac140-prova-mutacao.mjs
import { readFileSync, writeFileSync, copyFileSync, mkdtempSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "desafio-gut", "frontend");
const FN = join(RAIZ, "netlify", "functions");
const BAK = mkdtempSync(join(tmpdir(), "utac140-mut-"));
const md5 = (f) => createHash("md5").update(readFileSync(f)).digest("hex");

const BACK = { cwd: FN, args: ["--test", "--experimental-test-module-mocks", "_tests/utac140-especial-aberta.test.mjs"] };
const FRONT = (t) => ({ cwd: RAIZ, args: ["--test", t] });
const F140 = "src/components/edicao-especial/__tests__/utac140-especial-aberta.test.mjs";

const MUTANTES = [
  ["M1 o valor vai para o ranking", join(FN, "_lib/ranking-especial.mjs"),
    "p_id: lanceId, p_edicao_id: edicaoId, p_endereco: curto,", "p_id: lanceId, p_edicao_id: edicaoId, p_endereco: curto, p_valor: arguments[0].valorCentavos,", BACK],
  ["M2 endereço inteiro no ranking", join(FN, "_lib/ranking-especial.mjs"),
    "p_endereco: curto,", "p_endereco: endereco,", BACK],
  ["M3 Top 10 público sem valores (a v12 deixava de o ver)", join(FN, "resultado-edicao.mjs"),
    "return jsonResponse({ ...comum, top10: resultado.top10 });", "return jsonResponse({ ...comum, top10: (resultado.top10 || []).map(({ posicao, endereco }) => ({ posicao, endereco })) });", BACK],
  ["M4 sem exigir Passe", join(FN, "resultado-edicao.mjs"),
    "if (!(Number(inv.passesRelampago) > 0 || Number(inv.passesProgramado) > 0)) {", "if (false) {", BACK],
  ["M5 sem janela de 24 h", join(FN, "resultado-edicao.mjs"),
    "if (!Number.isFinite(fim) || Date.now() > fim + janelaMs) {", "if (!Number.isFinite(fim)) {", BACK],
  ["M6 sem produto por omissão", join(FN, "_lib/guto-perfis.mjs"),
    "  const produto = typeof especial.produto === \"string\" && especial.produto.trim()\n    ? especial.produto.trim() : PRODUTO_ESPECIAL_PADRAO;",
    "  const produto = typeof especial.produto === \"string\" && especial.produto.trim()\n    ? especial.produto.trim() : \"o produto\";", BACK],
  ["M7 simulador da especial aberto", join(FN, "chatbot.mjs"),
    "  return fim == null || agoraMs <= fim;\n}", "  return false;\n}", BACK],
  ["M8 revelar antes do resultado gravado", join(FN, "_lib/apuracao-especial.mjs"),
    "  if (agoraMs <= fim) return { ok: true, pronto: false, motivo: \"em_curso\", termino_em: meta.termino_em };",
    "  if (agoraMs <= fim) { await revelar(edicaoId, await lerLances(edicaoId)); return { ok: true, pronto: false, motivo: \"em_curso\", termino_em: meta.termino_em }; }", BACK],
  ["M9 linhas do ranking com o valor", join(RAIZ, "src/components/edicao-especial/_ranking-especial.js"),
    ".map((l) => ({ posicao: l.posicao, endereco: l.endereco }))", ".map((l) => ({ posicao: l.posicao, endereco: l.endereco, valor: l.valor_oculto }))", FRONT(F140)],
  ["M10 Top 10 público esconde linhas sem valor", join(RAIZ, "src/components/edicao-especial/ResultadosEdicao.jsx"),
    ".filter((l) => l && inteiroSeguro(l.posicao) !== null)", ".filter((l) => l && inteiroSeguro(l.valorCentavos) !== null && inteiroSeguro(l.posicao) !== null)", FRONT(F140)],
  ["M11 cronómetro sem «A apuração será em»", join(RAIZ, "src/components/edicao-especial/CardEdicaoEspecial.jsx"),
    "tempo = `${t(\"edicao.especial.apuracaoEm\", \"A apuração será em:\")} ${formatarContagem(restanteMs)}`;", "tempo = formatarContagem(restanteMs);",
    FRONT("src/components/edicao-especial/__tests__/especial.test.mjs")],
  ["M12 lance-relampago sem ranking", join(FN, "lance-relampago.mjs"),
    "const r = await registarNoRankingEspecial({ lanceId, edicaoId, endereco })", "const r = await Promise.resolve({ ok: false, code: \"desligado\" })", BACK],
  ["M13 configuração da edição ignorada", join(FN, "_lib/especial-config.mjs"),
    "  const t = meta && typeof meta.top10 === \"object\" && meta.top10 ? meta.top10 : {};", "  const t = {};", BACK],
  ["M14 GUTO com a frase fixa (ignora a da edição)", join(FN, "_lib/guto-perfis.mjs"),
    "const base = typeof modelo === \"string\" && modelo.trim() ? modelo.replace(/\\s+/g, \" \").trim().slice(0, 600) : BOAS_VINDAS_PADRAO;", "const base = BOAS_VINDAS_PADRAO;", BACK],
  // (M15 «pede sem edição» retirado: o efeito não corre no arnês SSR — mutante que não se consegue observar aqui;
  //  a guarda observável é a de Meus Ativos, `especialTop10 && …`. Declarado no relatório.)
  ["M16 sal fixo no lance (zero)", join(FN, "lance-relampago.mjs"),
    "const salCompromisso = novoSal();", "const salCompromisso = \"0x\" + \"0\".repeat(64);", BACK],
  ["M17 compromisso sem o sal", join(FN, "_lib/compromisso-lance.mjs"),
    "encode([\"uint256\", \"address\", \"bytes32\"], [valorCentavos, endereco, sal])", "encode([\"uint256\", \"address\"], [valorCentavos, endereco])", BACK],
  ["M18 tabela aceita endereço curto numa linha COM valor", join(RAIZ, "src/components/TabelaLances.jsx"),
    "if (lance.oculto === true && typeof lance.enderecoCurto === \"string\" && ENDERECO_CURTO_RE.test(lance.enderecoCurto)) {",
    "if (typeof lance.enderecoCurto === \"string\" && ENDERECO_CURTO_RE.test(lance.enderecoCurto)) {",
    FRONT("src/components/__tests__/utac140-tabela-especial.test.mjs")],
  ["M19 especial volta a ter a tabela vazia (sem os lances ao vivo)", join(RAIZ, "src/pages/MercadoLances.jsx"),
    "<TabelaLances lances={edicaoEspecial ? lancesEspecial : lances}", "<TabelaLances lances={edicaoEspecial ? [] : lances}",
    FRONT("src/components/edicao-especial/__tests__/utac140-especial-aberta.test.mjs")],
];

let falhas = 0;
// SO=M6,M14 corre só esses (re-corrida dirigida).
const SO = process.env.SO ? process.env.SO.split(",") : null;
for (const [nome, ficheiro, de, para, corrida] of MUTANTES.filter(([n]) => !SO || SO.includes(n.split(" ")[0]))) {
  const original = readFileSync(ficheiro, "utf8");
  const antes = md5(ficheiro);
  const bak = join(BAK, `${nome.split(" ")[0]}.bak`);
  copyFileSync(ficheiro, bak);
  if (original.split(de).length !== 2) { console.log(`${nome}: ⛔ ÂNCORA NÃO CASA (1 vez) — mutante inválido`); falhas++; continue; }
  writeFileSync(ficheiro, original.replace(de, () => para));
  const r = spawnSync(process.execPath, corrida.args, { cwd: corrida.cwd, encoding: "utf8", timeout: 300_000 });
  copyFileSync(bak, ficheiro);
  const depois = md5(ficheiro);
  const red = r.status !== 0;
  const nFalhas = (r.stdout.match(/^ℹ fail (\d+)/m) || [])[1] ?? "?";
  const ok = red && antes === depois;
  if (!ok) falhas++;
  console.log(`${nome}: ${red ? "RED" : "VERDE ⚠️ sobreviveu"} (falhas=${nFalhas}) · md5 ${antes === depois ? "idêntico" : "DIFERENTE ⛔"} ${antes}`);
}
console.log(`\nRESULTADO: ${MUTANTES.length - falhas}/${MUTANTES.length} mortos e restaurados`);
process.exit(falhas ? 1 : 0);

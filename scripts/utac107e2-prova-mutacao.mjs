// UTAC107e.2 — prova de mutação (GATE 7). Cada mutante: aplica-se (a âncora tem de casar EXACTAMENTE 1 vez
// e o ficheiro tem de MUDAR — T5), corre o teste dirigido e TEM de dar VERMELHO; restaura da cópia em
// memória (nunca do git — lição do UTAC000.11) e confere o sha256. Fins de linha preservados (lê/escreve bytes).
//
// node scripts/utac107e2-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FE = resolve(RAIZ, "desafio-gut", "frontend");
const FN = resolve(FE, "netlify", "functions");
const T_FLASH = ["--experimental-test-module-mocks", "_tests/utac107e2-lances-flash.test.mjs"];
const T_PALP = ["--experimental-test-module-mocks", "_tests/utac107e2-ler-palpites.test.mjs"];
const T_FE = ["src/__tests__/utac107e2-etiqueta.test.mjs"];

const M = [
  ["M1 valor em claro durante a edição", FN, "lances-flash.mjs", "valor:          null,", "valor:          l.valorCentavos,", T_FLASH],
  ["M2 revela sem consolidação", FN, "lances-flash.mjs", "    if (marcador && await edicaoFechada(edicaoId)) {", "    if (true) {", T_FLASH],
  ["M18 A1: revela consolidada AINDA ABERTA (lista)", FN, "lances-flash.mjs",
    "    if (marcador && await edicaoFechada(edicaoId)) {", "    if (marcador) {", T_FLASH],
  ["M19 A1: meu-estado consolidada ainda aberta", FN, "lances-flash.mjs",
    "    if (!marcador || !(await edicaoFechada(edicaoId))) {", "    if (!marcador) {", T_FLASH],
  ["M20 A1: fechada = qualquer meta", FN, "lances-flash.mjs",
    'return Boolean(meta) && verificarJanelaLance(meta)?.code === "edicao_encerrada";', "return true;", T_FLASH],
  ["M21 A2: cache da lista revelada desligada", FN, "lances-flash.mjs",
    "      REVELADOS.set(edicaoId, lances);", "      void 0;", T_FLASH],
  ["M22 A4: ler-palpites ignora a pausa", FN, "ler-palpites.mjs",
    "if (sistemaPausado(await lerEstadoSistema())) {", "if (false) {", T_PALP],
  ["M3 meu-estado sem guarda de consolidação", FN, "lances-flash.mjs",
    "    if (!marcador || !(await edicaoFechada(edicaoId))) {", "    if (false) {", T_FLASH],
  ["M4 anti-bot desligado (verificar sem 403)", FN, "lances-flash.mjs",
    '    if (process.env.NETWORK_STAGE === "mainnet") {\r\n      return jsonError(403',
    '    if (false) {\r\n      return jsonError(403', T_FLASH],
  ["M5 registo do laranja não acontece", FN, "lances-flash.mjs",
    "    if (menor !== Infinity) lideres.add(dono.get(menor));", "", T_FLASH],
  ["M6 laranja vira vermelho (não distingue)", FN, "lances-flash.mjs",
    'foiLiderAlgumaVez ? "deixou_de_ser" : "nao_menor"', 'foiLiderAlgumaVez ? "nao_menor" : "nao_menor"', T_FLASH],
  ["M7 ordem do lote em vez da chegada", FN, "lances-flash.mjs",
    "    .sort((a, b) => (instante(a) - instante(b))", "    .sort((a, b) => 0", T_FLASH],
  ["M8 endereço do query em vez do token", FN, "lances-flash.mjs",
    "endereco: t.endereco, vencedorOficial", 'endereco: url.searchParams.get("endereco") || t.endereco, vencedorOficial', T_FLASH],
  ["M9 palpites revelados durante a edição", FN, "ler-palpites.mjs",
    "const revelado = apurada || !STATUS_EM_CURSO.has(edicao.status);", "const revelado = true;", T_PALP],
  ["M10 palpites nunca revelados", FN, "ler-palpites.mjs",
    "const revelado = apurada || !STATUS_EM_CURSO.has(edicao.status);", "const revelado = !STATUS_EM_CURSO.has(edicao.status);", T_PALP],
  ["M11 palpites de todas as edições", FN, "_lib/passe-pontos.mjs",
    '.select("endereco,valor,criado_em").eq("edicao_id", edicaoId)', '.select("endereco,valor,criado_em")', T_PALP],
  ["M12 etiqueta: estado errado", FE, "src/components/EtiquetaEstadoLance.jsx",
    'if (foiLiderAlgumaVez === true) return "deixou_de_ser";', 'if (foiLiderAlgumaVez === true) return "nao_menor";', T_FE],
  ["M13 etiqueta pergunta durante a edição", FE, "src/components/EtiquetaEstadoLance.jsx",
    "if (!encerrado || !authToken || !edicaoId) return undefined;", "if (!authToken || !edicaoId) return undefined;", T_FE],
  ["M14 «SEU LANCE» também colorido", FE, "src/components/EtiquetaEstadoLance.jsx",
    "<span style={{ color: COR_FIXA }}>SEU LANCE</span>", "<span style={{ color: cor }}>SEU LANCE</span>", T_FE],
  ["M15 Início sem o gate de encerrada", FE, "src/pages/Dashboard.jsx",
    "{estAtiva.encerrada && (\r\n            <div", "{true && (\r\n            <div", T_FE],
  ["M16 OP mostra o valor sem `revelado`", FE, "src/pages/OfertasProgramadas.jsx",
    "tabelaPalpites.revelado && Number.isInteger(p.valor)", "Number.isInteger(p.valor)", T_FE],
  ["M23 A3: etiqueta não volta a perguntar", FE, "src/components/EtiquetaEstadoLance.jsx",
    "      if (!cancelado) id = setTimeout(ler, intervaloMs);", "", T_FE],
  ["M17 OP tabela sem dados (volta ao vazio)", FE, "src/pages/OfertasProgramadas.jsx",
    "const tabelaPalpites = usePalpitesDaEdicao(edicaoTabela?.id ?? null);",
    "const tabelaPalpites = { palpites: [], revelado: false };", T_FE],
];

const sha = (b) => createHash("sha256").update(b).digest("hex");
let red = 0;
for (let [nome, cwd, rel, de, para, args] of M) {
  const alvo = resolve(cwd, rel);
  const original = readFileSync(alvo);
  const texto = original.toString("utf8");
  // Âncoras escritas com CRLF; num checkout LF (o .gitattributes normaliza *.mjs) adaptam-se ao ficheiro.
  if (!texto.includes("\r\n")) { de = de.replaceAll("\r\n", "\n"); para = para.replaceAll("\r\n", "\n"); }
  const n = texto.split(de).length - 1;
  if (n !== 1) { console.log(`ABORTA ${nome}: âncora casa ${n}× em ${rel}`); process.exit(2); }
  const mutado = texto.replace(de, () => para);
  if (mutado === texto) { console.log(`ABORTA ${nome}: o ficheiro não mudou`); process.exit(2); }
  let r;
  try {
    writeFileSync(alvo, mutado, "utf8");
    r = spawnSync(process.execPath, ["--test", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 300000 });
  } finally {
    writeFileSync(alvo, original);
  }
  if (sha(readFileSync(alvo)) !== sha(original)) { console.log(`RESTAURO FALHOU em ${rel}`); process.exit(3); }
  const out = `${r.stdout}\n${r.stderr}`;
  const falhas = Number((out.match(/ℹ fail (\d+)/) || [])[1] ?? NaN);
  const vermelho = r.status !== 0 && falhas > 0;
  if (vermelho) red += 1;
  console.log(`${vermelho ? "RED     " : "SOBREVIVE"} ${nome} — falhas=${falhas} exit=${r.status}`);
}
console.log(`\nMUTAÇÃO: ${red}/${M.length} RED · restauro sha256 conferido em todos`);
process.exit(red === M.length ? 0 : 1);

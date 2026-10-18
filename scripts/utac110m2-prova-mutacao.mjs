// utac110m2-prova-mutacao.mjs — UTAC110m.2 · SEG5/SEG6: prova de mutação das correcções de TEXTO.
//
// Método da série (mc110i1d): baseline verde, senão ABORTA; cada mutante confirmado a ENTRAR (md5);
// RED exigido; restauro byte-a-byte por mutante; md5 NO FIM verificado em TODOS os ficheiros.
// Backups escritos FORA do repo ANTES do primeiro mutante (se o processo morrer, o ficheiro fica
// mutado e a cópia permite repor).
//
// Cobre as 4 frentes (A, B, C, D) e o bump do gate de consentimento (3.2 → 3.3).
//
// Exit: 0 = prova completa · 1 = mutante sobreviveu · 2 = o instrumento não mediu.
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import { tmpdir } from "node:os";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut", "frontend");
const V5 = join(RAIZ, "docs", "REGULAMENTO-v5.md");
const GUTO = join(RAIZ, "docs", "GUTO-REGULAMENTO.md");
const MJS = join(FE, "netlify", "functions", "_lib", "guto-regulamento.mjs");
const PERFIS = join(FE, "netlify", "functions", "_lib", "guto-perfis.mjs");
const TERMOS = join(FE, "src", "components", "TermosConsentimento.jsx");
const CONSENT = join(FE, "netlify", "functions", "_lib", "consentimento.mjs");

// O teste do UTAC + as redes de segurança que tocam o MESMO texto.
const ALVO = ["--test", "--test-concurrency=1",
  "src/components/__tests__/utac110m2-regulamento.test.mjs",
  "src/components/__tests__/utac110k1-conformidade-pre-aab.test.mjs",
  "src/components/__tests__/citacoesRegulamento.test.mjs",
  "src/components/__tests__/artigosUI.test.mjs",
  "src/pages/__tests__/utac106h-regras.test.mjs"];

// ── textos actuais (as âncoras dos mutantes) ────────────────────────────────────────────────────
const ART9 = "Art. 9º — A cada 50 (cinquenta) pontos de fidelidade acumulados, o utilizador poderá resgatar gratuitamente 1 (um) cartão colecionável físico da Família Quildo, sem qualquer pagamento adicional. Esta proporção é fixa e igual para todos os utilizadores.";
const ART9_ADQUIRIR = "Art. 9º — A cada 50 (cinquenta) pontos de fidelidade acumulados, o utilizador poderá adquirir 1 (um) cartão colecionável físico da Família Quildo. Esta proporção é fixa e igual para todos os utilizadores.";
const ART21 = "Art. 21º — O participante que não vencer mantém integralmente os pontos de fidelidade e o ECOQUILDO adquiridos com o Passe, bem como o acesso ao assistente virtual GUTO e às métricas e dados estratégicos a que o Passe adquirido dá acesso.";
const ART21_PERDE = "Art. 21º — O participante que não vencer perde o acesso às métricas do Desafio e ao benefício de lance opcional da edição seguinte, porém mantém os pontos de fidelidade e o ECOQUILDO adquiridos com o Passe, bem como o acesso ao assistente virtual GUTO.";
const ART48_CAPUT = "Art. 48º — O ECOQUILDO é concedido ao utilizador como benefício da aquisição do Passe Desafio e é utilizado exclusivamente no site oficial do Grupo União e Trabalho (ecossistema GUT), não sendo aceite como forma de pagamento dentro do aplicativo DesafioGUT. Pode ser utilizado para:";
const ART48_SEM_RESTRICAO = "Art. 48º — O ECOQUILDO é concedido ao utilizador como benefício da aquisição do Passe Desafio, e pode ser utilizado para:";
const ART57 = "Art. 57º — O titular poderá exercer os seus direitos (acesso, correção, portabilidade, eliminação e revogação do consentimento) através do e-mail do Encarregado de Proteção de Dados (DPO) dpo@grupouniaoetrabalho.com.br, do e-mail desafiogut01@gmail.com ou pela função de eliminação de conta do próprio aplicativo.";
const ART57_SEM_DPO = "Art. 57º — O titular poderá exercer os seus direitos (acesso, correção, portabilidade, eliminação e revogação do consentimento) através do e-mail desafiogut01@gmail.com ou pela função de eliminação de conta do próprio aplicativo.";
const ART53 = "Art. 53º — A aquisição de produtos físicos (produto patrocinado do Relâmpago) poderá ser realizada via PIX";
const ART53_COM_CARTAO = "Art. 53º — A aquisição de produtos físicos (cartão colecionável, produto patrocinado do Relâmpago) poderá ser realizada via PIX";
const GATE9 = "o utilizador poderá resgatar gratuitamente 1 (um) cartão colecionável físico";
const GATE9_ADQUIRIR = "o utilizador poderá adquirir 1 (um) cartão colecionável físico";
const PERFIS9 = `"9":  "A cada 50 (cinquenta) pontos de fidelidade acumulados, o utilizador poderá resgatar gratuitamente`;
const PERFIS9_ADQUIRIR = `"9":  "A cada 50 (cinquenta) pontos de fidelidade acumulados, o utilizador poderá adquirir`;

const MUTANTES = [
  // ── FRENTE A — o cartão é resgatado ──────────────────────────────────────────────────────────
  ["A1  o Art. 9º volta a «adquirir» (só na transcrição v5)", V5, ART9, ART9_ADQUIRIR],
  ["A2  o gate legal volta a «adquirir» (deixa de ser trecho literal)", TERMOS, GATE9, GATE9_ADQUIRIR],
  ["A3  a âncora do GUTO volta a «adquirir» (deixa de ser verbatim)", PERFIS, PERFIS9, PERFIS9_ADQUIRIR],
  ["A4  o cartão volta à lista do PIX no Art. 53º", V5, ART53, ART53_COM_CARTAO],
  // ── FRENTE B — a «perda de métricas» ────────────────────────────────────────────────────────
  ["B1  a «perda de métricas» volta ao Art. 21º (só no v5)", V5, ART21, ART21_PERDE],
  ["B2  o Art. 21º do GUTO volta ao texto antigo (divergência)", GUTO, ART21, ART21_PERDE],
  // ── FRENTE C — o ECOQUILDO fica no site ─────────────────────────────────────────────────────
  ["C1  a restrição do ECOQUILDO sai do caput (no runtime do GUTO)", MJS, ART48_CAPUT, ART48_SEM_RESTRICAO],
  // ── FRENTE D — DPO ──────────────────────────────────────────────────────────────────────────
  ["D1  o DPO sai do Art. 57º (o Gmail volta a ser o único canal)", V5, ART57, ART57_SEM_DPO],
  // ── A INVARIANTE ────────────────────────────────────────────────────────────────────────────
  ["I1  um espaço a mais no corpo do v5 (parte a invariante byte-a-byte)", V5,
    "Art. 47º — O ECOQUILDO é uma moeda social interna", "Art. 47º — O ECOQUILDO é  uma moeda social interna"],
  // ── O GATE DE CONSENTIMENTO ─────────────────────────────────────────────────────────────────
  ["G1  o backend fica em 3.2 e o frontend em 3.3 (paridade do gate partida)", CONSENT,
    'export const VERSAO_GATE = "3.3";', 'export const VERSAO_GATE = "3.2";'],
];

const md5 = (b) => createHash("md5").update(b).digest("hex");

function correr(timeout = 240000) {
  const r = spawnSync(process.execPath, ALVO, { cwd: FE, encoding: "utf8", timeout, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const n = (k) => { const m = out.match(new RegExp(`^\\u2139 ${k} (\\d+)$`, "m")); return m ? Number(m[1]) : null; };
  const nomes = out.split("\n").filter((l) => /^\u2716 /.test(l)).map((l) => l.trim());
  return { out, exit: r.status, sinal: r.signal, tests: n("tests"), pass: n("pass"), fail: n("fail"), nomes,
    red: /^\u2716 /m.test(out) || (n("fail") ?? 0) > 0 || (r.status ?? 0) !== 0 };
}

// ── guardas de instrumento: o alvo tem de ser o esperado, senão ABORTA em vez de medir lixo ─────
const FICHEIROS = [["v5", V5], ["guto", GUTO], ["mjs", MJS], ["perfis", PERFIS], ["termos", TERMOS], ["consent", CONSENT]];
const originais = new Map();
for (const [rot, f] of FICHEIROS) {
  const b = readFileSync(f);
  originais.set(f, b);
  const bak = join(tmpdir(), `utac110m2-${rot}-${basename(f)}.bak`);
  copyFileSync(f, bak);
  console.log(`backup FORA do repo: ${bak}`);
}
const md5Orig = new Map([...originais].map(([f, b]) => [f, md5(b)]));

for (const [f, agulha] of [[V5, "resgatar gratuitamente 1 (um) cartão"], [TERMOS, "resgatar gratuitamente"], [CONSENT, 'VERSAO_GATE = "3.3"']]) {
  if (!readFileSync(f, "utf8").includes(agulha)) {
    console.error(`ABORTA (exit 2): ${basename(f)} não tem «${agulha}» — a frente A/gate não está aplicada.`);
    process.exit(2);
  }
}

console.log(`\nmd5 inicial: ${[...md5Orig].map(([f, h]) => `${basename(f)}=${h.slice(0, 8)}`).join(" ")}\n`);
const base = correr();
if (base.red || base.fail !== 0 || !(base.tests > 0)) {
  console.error(`ABORTA (exit 2): baseline não está verde -> ${base.pass}/${base.tests}, fail ${base.fail}`);
  console.error(base.out.split("\n").slice(-25).join("\n"));
  process.exit(2);
}
console.log(`controlo (sem mutação): VERDE ${base.pass}/${base.tests}\n`);

let mortos = 0;
for (const [nome, ficheiro, deBruto, paraBruto] of MUTANTES) {
  const antes = readFileSync(ficheiro, "utf8");
  const crlf = antes.includes("\r\n");
  const conv = (t) => (crlf ? t.replace(/\r?\n/g, "\r\n") : t);
  const de = conv(deBruto), para = conv(paraBruto);
  const ocorrencias = antes.split(de).length - 1;
  if (ocorrencias !== 1) {
    console.error(`ABORTA (exit 2): ${nome} -> ${ocorrencias} ocorrências (exige 1)`);
    for (const [f, b] of originais) writeFileSync(f, b);
    process.exit(2);
  }
  writeFileSync(ficheiro, antes.replace(de, para));
  const entrou = md5(readFileSync(ficheiro)) !== md5Orig.get(ficheiro);
  const r = correr();
  writeFileSync(ficheiro, originais.get(ficheiro));
  const restaurado = md5(readFileSync(ficheiro)) === md5Orig.get(ficheiro);
  const pendurou = r.sinal === "SIGTERM" || r.tests === null;
  const veredicto = !entrou ? "NAO_ENTROU" : pendurou ? "RED (pendurou)" : r.red ? "RED" : "SOBREVIVEU";
  if (veredicto.startsWith("RED")) mortos += 1;
  console.log(`${veredicto.padEnd(14)} | entrou: ${entrou ? "sim" : "NAO"} | restaurado: ${restaurado ? "sim" : "NAO"} | fail=${r.fail} | ${nome}`);
  for (const n of r.nomes.slice(0, 2)) console.log(`                 ↳ ${n}`);
  if (!restaurado) { console.error("ABORTA (exit 2): restauro não bateu byte a byte."); process.exit(2); }
}

console.log(`\nmutantes RED: ${mortos}/${MUTANTES.length}`);
let igual = true;
for (const [f, b] of originais) {
  const fim = md5(readFileSync(f));
  const ok = fim === md5Orig.get(f);
  if (!ok) igual = false;
  console.log(`md5 final ${basename(f).padEnd(26)} ${fim.slice(0, 8)} ${ok ? "(== inicial)" : "(DIVERGENTE!)"}`);
}
process.exit(mortos === MUTANTES.length && igual ? 0 : 1);

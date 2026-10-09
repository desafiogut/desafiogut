// utac109e-prova-mutacao.mjs — UTAC109e. Prova de que os testes MORDEM (GATE 7/8).
// Uso (raiz do repo):  node scripts/utac109e-prova-mutacao.mjs < /dev/null
// Cada mutante: confirma que ENTROU (o ficheiro mudou), corre o(s) teste(s)-alvo e exige RED; restaura da
// cópia em memória e confirma md5 idêntico. O repo nunca fica mutado (restauro em `finally`).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FRONT = resolve(RAIZ, "desafio-gut", "frontend");
const F = (p) => resolve(FRONT, "src", p);
const CARTAO = F("components/CartaoEdicao.jsx");
const OP = F("pages/OfertasProgramadas.jsx");
const MLC = F("pages/MercadoLances.jsx");
const INICIO = F("pages/Dashboard.jsx");
const CARDLANCE = F("components/CardLance.jsx");
const CARROSSEL = F("components/CarrosselGUTO.jsx");
const T_UNICO = "src/components/__tests__/utac109e-cartao-unico.test.mjs";
const T_OP = "src/pages/__tests__/utac106f-ofertas.test.mjs";
const T_MLC = "src/pages/__tests__/utac108e1-mlc-op.test.mjs";
const T_INICIO = "src/pages/__tests__/Dashboard.test.mjs";
const md5 = (b) => createHash("md5").update(b).digest("hex");

const MUTANTES = [
  // os 3 do enunciado (SEG4)
  { id: "M1", desc: "trocar «Dar palpite» por «Dar lance»", f: CARTAO, t: [T_UNICO, T_OP],
    de: 'palpite: Object.freeze({ botao: "Dar palpite"', para: 'palpite: Object.freeze({ botao: "Dar lance"' },
  { id: "M2", desc: "esconder o GUTO animado 7 do cartão vazio", f: CARTAO, t: [T_UNICO, T_MLC, T_INICIO],
    de: "              <CarrosselGUTO size={isMobile ? 112 : 128} slides={GUTO_ANIMADO_7} />\n", para: "" },
  { id: "M3", desc: "mostrar o GUTO animado 7 também com edição ativa", f: CARTAO, t: [T_UNICO, T_OP, T_INICIO],
    de: "      {vazio && temAcao && <AcaoDesativada",
    para: '      {!vazio && <div data-testid="guto-animado-7"><CarrosselGUTO size={96} slides={GUTO_ANIMADO_7} /></div>}\n      {vazio && temAcao && <AcaoDesativada' },
  // o resto do contrato
  { id: "M4", desc: "o rótulo do palpite ganha «(em centavos)»", f: CARTAO, t: [T_UNICO, T_OP],
    de: 'rotulo: "Seu palpite (nº de lances)"', para: 'rotulo: "Seu palpite (em centavos)"' },
  { id: "M5", desc: "a OP vazia esquece a acção (sem formulário do palpite)", f: OP, t: [T_UNICO, T_OP],
    de: '<CartaoEdicao vazio acao="palpite" isMobile', para: "<CartaoEdicao vazio isMobile" },
  { id: "M6", desc: "o botão real da OP volta a «Palpitar»", f: OP, t: [T_UNICO, T_OP],
    de: '{aPalpitar ? "Enviando…" : ACOES.palpite.botao}', para: '{aPalpitar ? "Enviando…" : "Palpitar"}' },
  { id: "M7", desc: "o MLC vazio passa a acao=\"palpite\"", f: MLC, t: [T_UNICO, T_MLC],
    de: '<CartaoEdicao vazio acao="lance" isMobile', para: '<CartaoEdicao vazio acao="palpite" isMobile' },
  { id: "M8", desc: "o Início volta a «Palpitar» (R18-C)", f: INICIO, t: [T_UNICO, T_INICIO],
    de: '{aPalpitar ? "Enviando…" : "Dar palpite"}', para: '{aPalpitar ? "Enviando…" : "Palpitar"}' },
  { id: "M9", desc: "o CardLance volta a «⚡ Lance Relâmpago» (R18-B)", f: CARDLANCE, t: [T_UNICO],
    de: '    : "Dar lance"; //', para: '    : "⚡ Lance Relâmpago"; //' },
  { id: "M10", desc: "a acção lida pela cadeia de protótipos (sem Object.hasOwn)", f: CARTAO, t: [T_UNICO],
    de: 'typeof acao === "string" && Object.hasOwn(ACOES, acao)', para: "Boolean(ACOES[acao])" },
  { id: "M11", desc: "formato diverge entre famílias (o palpite sem a arte na largura toda)", f: CARTAO, t: [T_UNICO, T_OP],
    de: 'style={{ display: "block", width: "100%", aspectRatio: formato, objectFit: "cover" }} />',
    para: 'style={acao === "palpite" ? { width: 64, height: 64 } : { display: "block", width: "100%", aspectRatio: formato, objectFit: "cover" }} />' },
  // achados V2/V8 do validador (SEG6), agora cobertos
  { id: "M12", desc: "(V2) o <video> do carrossel perde o loop", f: CARROSSEL, t: [T_UNICO],
    de: "            loop\n", para: "" },
  { id: "M13", desc: "(V8) o carrossel do topo reduzido a 7 vídeos", f: CARROSSEL, t: [T_UNICO],
    de: "const N = 8;", para: "const N = 7;" },
];

let provados = 0;
for (const m of MUTANTES) {
  const orig = readFileSync(m.f);
  const md5Orig = md5(orig);
  const txt = orig.toString("utf8").replace(/\r\n/g, "\n");
  const crlf = orig.includes("\r\n");
  try {
    if (txt.split(m.de).length - 1 !== 1) throw new Error(`âncora não única/ausente (${txt.split(m.de).length - 1})`);
    const mut = txt.replace(m.de, () => m.para);
    const bytes = Buffer.from(crlf ? mut.replace(/\n/g, "\r\n") : mut, "utf8");
    if (md5(bytes) === md5Orig) throw new Error("o mutante NÃO entrou (ficheiro igual)");
    writeFileSync(m.f, bytes);
    let fail = 0, pass = 0, red = false;
    for (const t of m.t) {
      const r = spawnSync(process.execPath, ["--test", t], { cwd: FRONT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      const f = Number((r.stdout.match(/ℹ fail (\d+)/) || [])[1] ?? NaN);
      const p = Number((r.stdout.match(/ℹ pass (\d+)/) || [])[1] ?? NaN);
      if (!Number.isFinite(f)) throw new Error(`não medi ${t} (saída sem resumo)`);
      fail += f; pass += p;
      if (r.status !== 0 && f > 0) red = true;
    }
    if (red) provados++;
    console.log(`${m.id} ${red ? "PROVADO (RED)" : "SOBREVIVEU"} · fail=${fail} pass=${pass} · ${m.desc}`);
  } catch (e) {
    console.log(`${m.id} INVÁLIDO · ${e.message} · ${m.desc}`);
  } finally {
    writeFileSync(m.f, orig);
    if (md5(readFileSync(m.f)) !== md5Orig) { console.log(`!!! ${m.id} RESTAURO FALHOU — PARAR`); process.exit(2); }
  }
}
console.log(`\nMUTAÇÃO: ${provados}/${MUTANTES.length} PROVADOS · restauro md5 idêntico em todos`);
process.exit(provados === MUTANTES.length ? 0 : 1);

// utac108d-prova-mutacao.mjs — UTAC108d. Prova de que os testes MORDEM (GATE 7).
// Uso (raiz do repo):  node scripts/utac108d-prova-mutacao.mjs < /dev/null
// Cada mutante: confirma que ENTROU, corre o teste-alvo e exige RED; restaura da cópia em memória (md5 idêntico).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FRONT = resolve(RAIZ, "desafio-gut", "frontend");
const MLC = resolve(FRONT, "src/pages/MercadoLances.jsx");
const HDR = resolve(FRONT, "src/components/glass/GlassHeader.jsx");
const VAZ = resolve(FRONT, "src/components/SemEdicaoAviso.jsx");
const T = "src/pages/__tests__/utac108d-mlc-sempre.test.mjs";
const md5 = (b) => createHash("md5").update(b).digest("hex");

const MUTANTES = [
  { id: "D1", desc: "reintroduzir o herói «EM BREVE» no cabeçalho", f: HDR, t: T,
    de: 'import ModeSelector from "./ModeSelector.jsx";\n', para: 'import ModeSelector from "./ModeSelector.jsx";\nimport ComingSoonHero from "./ComingSoonHero.jsx";\n',
    tambem: ["          <ModeSelector ", "          <ComingSoonHero isMobile={isMobile} edicao={null} />\n          <ModeSelector "] },
  { id: "D2", desc: "remover o estado vazio", f: MLC, t: T,
    de: "? <SemEdicaoAviso />", para: "? null" },
  { id: "D3", desc: "os dois avisos juntos (sem edição também mostra «Sem saldo»)", f: MLC, t: T,
    de: "? <SemEdicaoAviso />", para: "? <><SemEdicaoAviso /><SemSaldoBanner /></>" },
  { id: "D4", desc: "estado vazio fora de vidro (Regra 1)", f: VAZ, t: T,
    de: "<GlassCard role=", para: "<div role=", tambem: ["</GlassCard>", "</div>"] },
  { id: "D5", desc: "reintroduzir o early return (sem edição ⇒ vista de conformidade)", f: MLC, t: T,
    de: "  if (!isLeilaoAtivo)     return <MercadoConformidade isMobile={isMobile} />;\n",
    para: "  if (!isLeilaoAtivo)     return <MercadoConformidade isMobile={isMobile} />;\n  if (EM_BREVE_MODE)      return <MercadoConformidade isMobile={isMobile} />;\n" },
  { id: "D6", desc: "o sinal deixa de ser o EM_BREVE_MODE (estado vazio sempre)", f: MLC, t: T,
    de: "{EM_BREVE_MODE\n", para: "{true\n" },
];

let provados = 0;
for (const m of MUTANTES) {
  const orig = readFileSync(m.f);
  const md5Orig = md5(orig);
  const txt = orig.toString("utf8").replace(/\r\n/g, "\n");
  const crlf = orig.includes("\r\n");
  try {
    if (txt.split(m.de).length - 1 !== 1) throw new Error(`âncora não única/ausente (${txt.split(m.de).length - 1})`);
    let mut = txt.replace(m.de, () => m.para);
    if (m.tambem) {
      if (mut.split(m.tambem[0]).length - 1 < 1) throw new Error("âncora secundária ausente");
      mut = mut.replace(m.tambem[0], () => m.tambem[1]);
    }
    const bytes = Buffer.from(crlf ? mut.replace(/\n/g, "\r\n") : mut, "utf8");
    if (md5(bytes) === md5Orig) throw new Error("o mutante NÃO entrou (ficheiro igual)");
    writeFileSync(m.f, bytes);
    const r = spawnSync(process.execPath, ["--test", m.t], { cwd: FRONT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const fail = Number((r.stdout.match(/ℹ fail (\d+)/) || [])[1] ?? NaN);
    const pass = Number((r.stdout.match(/ℹ pass (\d+)/) || [])[1] ?? NaN);
    const red = r.status !== 0 && fail > 0;
    if (red) provados++;
    console.log(`${m.id} ${red ? "PROVADO (RED)" : "SOBREVIVEU"} · fail=${fail} pass=${pass} · ${m.desc}`);
  } catch (e) {
    console.log(`${m.id} INVÁLIDO · ${e.message} · ${m.desc}`);
  } finally {
    writeFileSync(m.f, orig);
    const ok = md5(readFileSync(m.f)) === md5Orig;
    if (!ok) { console.log(`!!! ${m.id} RESTAURO FALHOU — PARAR`); process.exit(2); }
  }
}
console.log(`\nMUTAÇÃO: ${provados}/${MUTANTES.length} PROVADOS · restauro md5 idêntico em todos`);
process.exit(provados === MUTANTES.length ? 0 : 1);

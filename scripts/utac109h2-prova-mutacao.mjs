// utac109h2-prova-mutacao.mjs — UTAC109h.2. Cada mutante tem de pôr VERMELHO o teste
// `src/__tests__/utac109h2-carteira.test.mjs`. Restauro a partir de cópia em memória (nunca do HEAD:
// o trabalho pode não estar commitado) e verificação md5 no fim.
// Uso (foreground): node scripts/utac109h2-prova-mutacao.mjs [M1 M2 …]   (sem argumentos = todos)
// Correr em lotes pequenos: um `timeout` externo que mate o processo salta o `finally`.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FRONT = resolve(RAIZ, "desafio-gut", "frontend");
const CART = resolve(FRONT, "src/pages/MinhaCarteira.jsx");
const PAINEL = resolve(FRONT, "src/components/PainelIndicacao.jsx");
const TESTE = "src/__tests__/utac109h2-carteira.test.mjs";

const MUTANTES = [
  ["M1 PIX volta a ciano", CART, '  pix: "#f5a623",', '  pix: "#00d4ff",'],
  ["M2 paleta retirada volta", CART, 'success: "#f5a623", danger: "#ef4444", blue300: "#f5a623", purple: "#f5a623",', 'success: "#10b981", danger: "#ef4444", blue300: "#fbbf24", purple: "#a78bfa",'],
  ["M3 laranja volta ao destaque", CART, '  primary: "#f5a623", primaryDim: "rgba(245,166,35,0.15)",', '  primary: "#ff6b35", primaryDim: "rgba(255,107,53,0.15)",'],
  ["M4 Indique volta a verde-água", PAINEL, '  primary:    "#f5a623",', '  primary:    "#00d4aa",'],
  ["M5 CTA volta ao gradiente de 2 tons", CART, 'background: "#f5a623",', 'background: "linear-gradient(135deg,#f5a623,#e89400)",'],
  ["M6 texto branco no CTA dourado", CART, 'const ON_GOLD = "#0a0f1a";', 'const ON_GOLD = "#ffffff";'],
  ["M7 título volta ao tamanho do 109h", CART, 'fontSize: isMobile ? "0.85rem" : "0.88rem",', 'fontSize: isMobile ? "1.5rem" : "1.75rem",'],
  ["M8 erro deixa de ser vermelho", CART, 'danger: "#ef4444",', 'danger: "#f5a623",'],
  ["M9 secundário do Indique perde o amarelo", PAINEL, '  gold:       "#f5a623",', '  gold:       "#6b7db8",'],
  ["M10 botões da Carteira a 44 px", CART, 'width: "100%",\n    minHeight: "48px",', 'width: "100%",\n    minHeight: "44px",'],
];

const SEL = process.argv.slice(2);
const ESCOLHIDOS = SEL.length ? MUTANTES.filter(([n]) => SEL.includes(n.split(" ")[0])) : MUTANTES;
const md5 = (b) => createHash("md5").update(b).digest("hex");
const originais = new Map([CART, PAINEL].map((f) => [f, readFileSync(f)]));
const antes = new Map([...originais].map(([f, b]) => [f, md5(b)]));
process.on("SIGTERM", () => { for (const [f, b] of originais) writeFileSync(f, b); process.exit(1); });
let falhas = 0;
try {
  for (const [nome, ficheiro, de, para] of ESCOLHIDOS) {
    const orig = originais.get(ficheiro);
    const crlf = orig.includes(Buffer.from("\r\n"));
    const txt = orig.toString("utf8").replace(/\r\n/g, "\n");
    const n = txt.split(de).length - 1;
    if (n !== 1) { console.log(`${nome}: INVÁLIDO (âncora casou ${n}×)`); falhas++; continue; }
    const mut = txt.replace(de, () => para);
    writeFileSync(ficheiro, crlf ? mut.replace(/\n/g, "\r\n") : mut);
    const r = spawnSync(process.execPath, ["--test", TESTE], { cwd: FRONT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 280000 });
    const fail = Number((r.stdout.match(/ℹ fail (\d+)/) || [])[1] ?? NaN);
    writeFileSync(ficheiro, orig);
    const ok = fail > 0;
    if (!ok) falhas++;
    console.log(`${nome}: ${ok ? `PROVADO (${fail} RED)` : `SOBREVIVEU (fail=${fail})`}`);
  }
} finally {
  for (const [f, b] of originais) writeFileSync(f, b);
}
for (const [f, h] of antes) {
  const igual = md5(readFileSync(f)) === h;
  console.log(`restauro ${f.split(/[\\/]/).pop()}: ${igual ? "md5 idêntico" : "DIFERENTE <-- PARAR"}`);
  if (!igual) falhas++;
}
console.log(falhas === 0 ? `MUTAÇÃO ${ESCOLHIDOS.length}/${ESCOLHIDOS.length} PROVADOS` : `FALHAS: ${falhas}`);
process.exit(falhas === 0 ? 0 : 1);

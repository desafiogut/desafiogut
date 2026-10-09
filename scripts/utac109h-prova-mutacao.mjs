// utac109h-prova-mutacao.mjs — UTAC109h. Cada mutante tem de pôr VERMELHO o teste
// `src/__tests__/utac109h-carteira.test.mjs`. Restauro a partir de cópia em memória (nunca do HEAD:
// o trabalho pode não estar commitado) e verificação md5 no fim.
// Uso (foreground): node scripts/utac109h-prova-mutacao.mjs [M1 M2 …]   (sem argumentos = todos)
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
const TESTE = "src/__tests__/utac109h-carteira.test.mjs";

const MUTANTES = [
  ["M1 título volta a amarelo", CART, "fontSize: TAM_TITULO, color: COR.primary,", "fontSize: TAM_TITULO, color: COR.gold,"],
  ["M2 PIX volta a ciano", CART, "style={botaoPrimario}\n                title=\"Depósito PIX", "style={{ ...botaoPrimario, color: \"#00d4ff\" }}\n                title=\"Depósito PIX"],
  ["M3 botões a 44 px", CART, 'width: "100%", minHeight: "48px",', 'width: "100%", minHeight: "44px",'],
  ["M4 Indique volta a verde-água", PAINEL, 'primary:    "#ff6b35",', 'primary:    "#00d4aa",'],
  ["M5 título pequeno (desktop)", CART, 'const TAM_TITULO = isMobile ? "1.5rem" : "1.75rem";', 'const TAM_TITULO = isMobile ? "1.5rem" : "0.88rem";'],
  ["M6 texto branco no primário", CART, 'const ON_COR = "#0a0f1a";', 'const ON_COR = "#ffffff";'],
  ["M7 vermelho fora de erro", CART, "fontSize: TAM_SUBTITULO, fontWeight: 700,\n                    color: COR.gold,", "fontSize: TAM_SUBTITULO, fontWeight: 700,\n                    color: COR.danger,"],
  ["M8 terciário sem alvo 48", CART, 'display: "inline-flex", alignItems: "center", minHeight: "48px", minWidth: "48px",', 'display: "inline-flex", alignItems: "center",'],
  ["M9 secundário do Indique com fundo", PAINEL, 'background: "transparent", border: `1px solid ${COR.gold}`', 'background: "rgba(0,212,170,0.12)", border: `1px solid ${COR.gold}`'],
  ["M10 Passe volta ao 1.º vidro", CART, "              {/* UTAC107b (Regra 1, decisão 6) — o aviso 402", "              <button type=\"button\" style={botaoPrimario}>Comprar Passe Desafio x</button>\n              {/* UTAC107b (Regra 1, decisão 6) — o aviso 402"],
  ["M11 título sem Orbitron", CART, "margin: 0, fontFamily: \"'Orbitron', sans-serif\", fontWeight: 800,", "margin: 0, fontWeight: 800,"],
  ["M12 Indique: botão do código < 48", PAINEL, 'width: "100%", minHeight: "48px",', 'width: "100%",'],
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

// utac109g-prova-mutacao.mjs — UTAC109g. Cada mutante tem de pôr VERMELHO o teste
// `src/pages/__tests__/utac109g-op-alinhamento.test.mjs`. Restauro a partir de cópia em memória (nunca do HEAD:
// o trabalho pode não estar commitado) e verificação md5 no fim.
// Uso (foreground): node scripts/utac109g-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FRONT = resolve(RAIZ, "desafio-gut", "frontend");
const OP = resolve(FRONT, "src/pages/OfertasProgramadas.jsx");
const CARTAO = resolve(FRONT, "src/components/CartaoEdicao.jsx");
const EDICAO = resolve(FRONT, "src/utils/edicao.js");
const TESTE = "src/pages/__tests__/utac109g-op-alinhamento.test.mjs";

const MUTANTES = [
  ["M1 coluna volta a 640 px", OP, 'padding: isMobile ? "1rem" : "1.5rem 2rem", flex: 1, minWidth: 0,', 'padding: isMobile ? "1rem" : "1.5rem 2rem", flex: 1, minWidth: 0, maxWidth: "640px",'],
  ["M2 envelope diferente do MLC", OP, 'display: "grid", gridTemplateColumns: "1fr", gap: isMobile ? "1rem" : "1.5rem",', 'display: "grid", gridTemplateColumns: "1fr", gap: "1rem",'],
  ["M3 vidro entre o cabeçalho e a edição", OP, '<section aria-label="Edições programadas" style={{ display: "grid", gap: isMobile ? "1rem" : "1.5rem", minWidth: 0 }}>', '<GlassCard>x</GlassCard><section aria-label="Edições programadas" style={{ display: "grid", gap: isMobile ? "1rem" : "1.5rem", minWidth: 0 }}>'],
  ["M4 título sem 📋", OP, "📋 Palpites{id ?", "Palpites{id ?"],
  ["M5 telemóvel com tabela", OP, ") : isMobile ? (\n        <div data-testid=\"op-tabela-lista\"", ") : false ? (\n        <div data-testid=\"op-tabela-lista\""],
  ["M6 sem «valores ocultos»", OP, "!tabela?.revelado && linhas.length > 0 && (", "false && ("],
  ["M7 vazio com tabela", OP, "{linhas.length === 0 ? (", "{false ? ("],
  ["M8 nome volta a 9rem", CARTAO, 'flex: "1 1 12.5rem"', 'flex: "1 1 9rem"'],
  ["M9 P1 desligada", EDICAO, 'estado === ESTADO_EDICAO.ATIVA && edicao?.tipo === "programado"', "false"],
  ["M10 P2 desligada", CARTAO, 'palpite: Object.freeze({ mensagem: "Sem edições programadas no momento."', 'palpite: Object.freeze({ mensagem: "Nenhuma edição em andamento"'],
  // Sobreviventes do validador adversarial (SEG3) — fechados com os testes «SEG3 ·».
  ["M11 (V6) login desligado", OP, "onLogin={abrirModal}", "onLogin={() => {}}"],
  ["M12 (V7) isConnected fixo", OP, "isConnected={isConnected}", "isConnected={false}"],
  ["M13 (V8) encerrado true", OP, "encerrado={false}", "encerrado={true}"],
  ["M14 (V5) prazo com EM BREVE", OP, "{est.timer == null && (", "{true && ("],
  ["M15 (V2) sem alignContent", OP, 'alignContent: "start",', ""],
  ["M16 selo branco (< AA)", OP, 'fontWeight: 700, color: "#0a0f1a" },', 'fontWeight: 700, color: "#fff" },'],
];

// Lotes: `node scripts/utac109g-prova-mutacao.mjs M1 M2 …` (sem argumentos = todos). Correr em lotes
// pequenos: um `timeout` externo que mate o processo salta o `finally` e deixa o mutante no disco.
const SEL = process.argv.slice(2);
const ESCOLHIDOS = SEL.length ? MUTANTES.filter(([n]) => SEL.includes(n.split(" ")[0])) : MUTANTES;
let originais;
process.on("SIGTERM", () => { for (const [f, b] of originais) writeFileSync(f, b); process.exit(1); });
const md5 = (b) => createHash("md5").update(b).digest("hex");
originais = new Map([OP, CARTAO, EDICAO].map((f) => [f, readFileSync(f)]));
const antes = new Map([...originais].map(([f, b]) => [f, md5(b)]));
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

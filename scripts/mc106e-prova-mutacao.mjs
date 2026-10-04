// UTAC106e — prova de mutação (GATE 7/8) da UI da compra do Passe.
// Cada mutante: alvo ÚNICO exigido, ficheiro confirmado a MUDAR (md5), testes em TAP, RED exigido,
// bytes repostos e md5 confirmado. Artefacto versionado para a prova ser REPRODUZÍVEL do repo.
// Uso: node scripts/mc106e-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut/frontend");
const LIB   = join(FE, "src/hooks/useComprarPasse.js");
const UTIL  = join(FE, "src/utils/idempotency.js");
const CART  = join(FE, "src/pages/MinhaCarteira.jsx");
const MODAL = join(FE, "src/components/ComprarPasseModal.jsx");
const TESTES = [
  "src/pages/__tests__/utac106e-compra-passe.test.mjs",
  "src/__tests__/utac106c-carteira-render.test.mjs",
  "src/__tests__/utac106c-carteira.test.mjs",
];
const ARGS = ["--test", "--test-concurrency=1", "--test-reporter=tap", ...TESTES];

const MUTANTES = [
  ["MF1 hook: sem idempotencyKey no corpo", LIB, 'apiPost("comprar-passe-pontos", { idempotencyKey }, { token })', 'apiPost("comprar-passe-pontos", {}, { token })'],
  ["MF2 hook: sem Bearer", LIB, 'apiPost("comprar-passe-pontos", { idempotencyKey }, { token })', 'apiPost("comprar-passe-pontos", { idempotencyKey }, {})'],
  ["MF3 hook: 402 não mapeado", LIB, '  402: "Saldo insuficiente",\n', ''],
  ["MF8 util: chave CONSTANTE", UTIL, 'if (typeof c?.randomUUID === "function") return c.randomUUID();', 'return "00000000-0000-4000-8000-000000000000";'],
  ["MF4 Carteira: não fecha o balão no sucesso", CART, '            setPasseAberto(false);\n            setPasseSemSaldo(false);', '            setPasseSemSaldo(false);'],
  ["MF5 Carteira: sem toast de sucesso", CART, 'setToastPasse({ variant: "success", message: "1 ponto creditado" });', 'setToastPasse(null);'],
  ["MF7 Carteira: Confirmar não chama o hook", CART, 'const r = await comprarPasse();', 'const r = { ok: true };'],
  ["MF9 hook: sem a guarda de corrida (ref)", LIB, '    if (emCurso.current) return { ok: false, code: "em_curso", message: "Compra em curso" };', '    if (false) return { ok: false, code: "em_curso", message: "Compra em curso" };'],
  ["MF6 modal: sem spinner", MODAL, 'data-spinner="true"', 'data-spinner="false"'],
];

const md5 = (b) => createHash("md5").update(b).digest("hex");
const originais = new Map();
for (const f of [LIB, UTIL, CART, MODAL]) originais.set(f, readFileSync(f));
const correr = () => {
  const r = spawnSync(process.execPath, ARGS, { cwd: FE, encoding: "utf8", timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const n = (k) => Number((out.match(new RegExp(`^# ${k} (\\d+)`, "m")) || [])[1]);
  return { pass: n("pass"), fail: n("fail"), tests: n("tests") };
};

let falhas = 0;
const base = correr();
if (!(base.tests > 0 && base.fail === 0)) { console.log("CONTROLO não VERDE:", base); process.exit(2); }
console.log(`controlo: ${base.pass}/${base.tests} VERDE`);
try {
  for (const [nome, f, de, para] of MUTANTES) {
    const orig = originais.get(f); const txt = orig.toString("utf8");
    const crlf = txt.includes("\r\n");
    const a = crlf ? de.replace(/\n/g, "\r\n") : de;
    const b = crlf ? para.replace(/\n/g, "\r\n") : para;
    const n = txt.split(a).length - 1;
    if (n !== 1) { console.log(`${nome}: ALVO ${n}× — mutante inválido`); falhas++; continue; }
    writeFileSync(f, txt.replace(a, () => b));
    if (md5(readFileSync(f)) === md5(orig)) { console.log(`${nome}: NÃO ENTROU`); falhas++; continue; }
    const r = correr(); const morto = r.tests > 0 && r.fail > 0;
    console.log(`${nome}: ${morto ? "PROVADO (RED)" : "SOBREVIVEU"} — ${r.pass}/${r.tests}, fail ${r.fail}`);
    if (!morto) falhas++;
    writeFileSync(f, orig);
  }
} finally {
  for (const [f, orig] of originais) {
    writeFileSync(f, orig); const ok = md5(readFileSync(f)) === md5(orig); if (!ok) falhas++;
    console.log(`restauração ${f.split(/[\\/]/).pop()}: md5 ${ok ? "IDÊNTICO" : "DIFERENTE!"}`);
  }
}
console.log(falhas === 0 ? `VEREDITO: ${MUTANTES.length}/${MUTANTES.length} PROVADOS` : `VEREDITO: ${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);

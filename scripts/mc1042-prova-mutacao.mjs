// MC104.2 — prova de mutação (R16) do conta-delete sobre pedidos.
// Cada mutante: (1) exige que o alvo exista, (2) confirma que o ficheiro MUDOU, (3) corre os testes
// (TAP), (4) exige RED, (5) repõe os bytes originais e confirma o md5. Uso: node scripts/mc1042-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FN = join(RAIZ, "desafio-gut/frontend/netlify/functions");
const ALVO = join(FN, "_lib/conta-delete.mjs");
const TESTES = ["_tests/mc1042-conta-delete-pedidos.test.mjs", "_tests/mc72-conta-delete.test.mjs"];

const md5 = (b) => createHash("md5").update(b).digest("hex");
const original = readFileSync(ALVO);
const md5Original = md5(original);

const MUTANTES = [
  ["M1 sem `comprador` na procura", "obj?.address ?? obj?.comprador)", "obj?.address)"],
  ["M2 comprador não substituído", 'if ("comprador" in obj) obj.comprador = ENDERECO_ANONIMO;', ""],
  ["M3 morada não anonimizada", 'obj.morada = Object.fromEntries(Object.keys(obj.morada).map((k) => [k, "***"]));', ""],
  ["M4 NF-e apagada junto", 'if ("comprador" in obj) obj.comprador = ENDERECO_ANONIMO;',
    'if ("comprador" in obj) obj.comprador = ENDERECO_ANONIMO; obj.nfe = null;'],
  ["M5 casa qualquer pedido (terceiros)", "if (e === endereco) alvo.push(key);", "alvo.push(key);"],
  ["M6 apaga em vez de anonimizar", "await store.setJSON(key, anonimizarPayload(obj));", "await store.delete(key);"],
  ["M7 morada só parcial (cpf fica)", '.map((k) => [k, "***"])', '.map((k) => [k, k === "cpf" ? obj.morada[k] : "***"])'],
  // Mutantes do validador que sobreviviam (V1/V2/V3/V5) — agora têm de morrer.
  ["V1 apaga edicaoId + criado_em", 'if ("comprador" in obj) obj.comprador = ENDERECO_ANONIMO;',
    'if ("comprador" in obj) { obj.comprador = ENDERECO_ANONIMO; delete obj.edicaoId; delete obj.criado_em; }'],
  ["V2 rastreio = null", 'if ("comprador" in obj) obj.comprador = ENDERECO_ANONIMO;',
    'if ("comprador" in obj) { obj.comprador = ENDERECO_ANONIMO; obj.rastreio = null; }'],
  ["V3 historico = []", 'if ("comprador" in obj) obj.comprador = ENDERECO_ANONIMO;',
    'if ("comprador" in obj) { obj.comprador = ENDERECO_ANONIMO; obj.historico = []; }'],
  ["V5 casa por prefixo", "if (e === endereco) alvo.push(key);", "if (e.slice(0, 40) === endereco.slice(0, 40)) alvo.push(key);"],
];

function correr() {
  const r = spawnSync(process.execPath, ["--test", "--test-reporter=tap", ...TESTES], { cwd: FN, encoding: "utf8" });
  const n = (k) => Number((r.stdout.match(new RegExp(`^# ${k} (\\d+)`, "m")) || [])[1]);
  return { pass: n("pass"), fail: n("fail"), tests: n("tests") };
}

let falhas = 0;
const base = correr();
if (!(base.tests > 0 && base.fail === 0)) { console.log("CONTROLO base não está VERDE:", base); process.exit(2); }
console.log(`controlo (sem mutação): ${base.pass}/${base.tests} VERDE`);

try {
  for (const [nome, de, para] of MUTANTES) {
    const txt = original.toString("utf8");
    const n = txt.split(de).length - 1;
    if (n !== 1) { console.log(`${nome}: ALVO NÃO ENCONTRADO (${n}×) — mutante inválido`); falhas++; continue; }
    const mutado = txt.replace(de, para);
    writeFileSync(ALVO, mutado);
    if (md5(readFileSync(ALVO)) === md5Original) { console.log(`${nome}: NÃO ENTROU`); falhas++; continue; }
    const r = correr();
    const morto = r.tests > 0 && r.fail > 0;
    console.log(`${nome}: ${morto ? "PROVADO (RED)" : "SOBREVIVEU"} — ${r.pass}/${r.tests}, fail ${r.fail}`);
    if (!morto) falhas++;
    writeFileSync(ALVO, original);
  }
} finally {
  writeFileSync(ALVO, original);
  const ok = md5(readFileSync(ALVO)) === md5Original;
  console.log(`restauração: md5 ${ok ? "IDÊNTICO" : "DIFERENTE!"} (${md5Original})`);
  if (!ok) falhas++;
}
console.log(falhas === 0 ? `VEREDITO: ${MUTANTES.length}/${MUTANTES.length} PROVADOS` : `VEREDITO: ${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);

// MC102.0 — prova de mutação (R16). Cada mutante: aplica (e PROVA que entrou), corre os testes do
// CAS, espera RED, e restaura byte a byte (md5 conferido). Foreground.
//   node scripts/mc1020-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FN = join(dirname(fileURLToPath(import.meta.url)), "..", "desafio-gut", "frontend", "netlify", "functions");
const LIB = join(FN, "_lib", "pedidos.mjs");
const LOCK = join(FN, "package-lock.json");
const md5 = (b) => createHash("md5").update(b).digest("hex");

const MUTANTES = [
  ["M1 escrever sem onlyIfMatch", LIB, "pedido, { onlyIfMatch: etag });", "pedido, {});"],
  ["M2 sem guarda de etag (fail-open)", LIB, 'if (!etag) return { ok: false, code: "etag_indisponivel" };', ""],
  ["M3 ignorar modified:false", LIB, 'if (!w?.modified) return { ok: false, code: "conflito_escrita" };', ""],
  ["M4 sem retry", LIB, 'if (r.code !== "conflito_escrita") return r;', "return r;"],
  ["M5 desenho do enunciado (etag relido no fim)", LIB, "r = await gravar(pedido, passo.evento, lido.etag);",
    "r = await gravar(pedido, passo.evento, (await s.getWithMetadata(chavePedido(produtoId), { type: \"json\" }))?.etag);"],
  ["M6 5 tentativas em vez de 3", LIB, "export const MAX_TENTATIVAS_CAS = 3;", "export const MAX_TENTATIVAS_CAS = 5;"],
  ["M7 lock de volta à 8.2.0", LOCK, '"node_modules/@netlify/blobs": {\n      "version": "10.0.0"', '"node_modules/@netlify/blobs": {\n      "version": "8.2.0"'],
];

function suite() {
  const r = spawnSync(process.execPath, ["--test", "--test-reporter=tap", "--experimental-test-module-mocks",
    "_tests/mc1020-cas.test.mjs", "_tests/mc102-recebido.test.mjs"], { cwd: FN, encoding: "utf8" });
  const n = (k) => Number((r.stdout.match(new RegExp(`^# ${k} (\\d+)`, "m")) || [])[1]);
  return { pass: n("pass"), fail: n("fail") };
}

const base = suite();
if (!(base.pass > 0) || base.fail !== 0) { console.log("BASE não está verde:", base); process.exit(2); }
console.log("base", base);
let provados = 0;
for (const [nome, f, de, para] of MUTANTES) {
  const orig = readFileSync(f); const s = orig.toString("utf8").replace(/\r\n/g, "\n");
  const ocorr = s.split(de).length - 1;
  if (ocorr !== 1) { console.log(`${nome}: ÂNCORA com ${ocorr} ocorrências — ABORTA`); process.exit(3); }
  const mut = s.replace(de, para);
  if (mut === s) { console.log(`${nome}: NÃO ENTROU — ABORTA`); process.exit(3); }
  writeFileSync(f, mut);
  const r = suite();
  writeFileSync(f, orig);
  if (md5(readFileSync(f)) !== md5(orig)) { console.log(`${nome}: RESTAURO FALHOU`); process.exit(4); }
  const red = r.fail > 0 || !(r.pass > 0);
  if (red) provados++;
  console.log(`${nome}: ${red ? "PROVADO (RED)" : "SOBREVIVEU"} ${JSON.stringify(r)}`);
}
console.log(`${provados}/${MUTANTES.length} provados · restauro md5 OK`);
process.exit(provados === MUTANTES.length ? 0 : 1);

// SEG3 — verificação independente do EQUIVALENTE DECLARADO E1 do autor (o mutante entrou mesmo?).
// Uso: node _logs/_tmp-seg3/e1-eq.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const F = "desafio-gut/frontend/netlify/functions/resgatar-cartao.mjs";
const orig = readFileSync(F);
const md5 = (b) => createHash("md5").update(b).digest("hex");
const DE = "        await enviarEmail({ para: email, assunto: texto.assunto, mensagem: texto.mensagem });";
const PARA = '        await enviarEmail({ para: email || "fallback@example.com", assunto: texto.assunto, mensagem: texto.mensagem });';
const txt = orig.toString("utf8");
const crlf = txt.includes("\r\n");
const de = crlf ? DE.replace(/\n/g, "\r\n") : DE, para = crlf ? PARA.replace(/\n/g, "\r\n") : PARA;
console.log("EOL do ficheiro:", crlf ? "CRLF" : "LF");
console.log("alvo presente", txt.split(de).length - 1, "×");

// GUARDA ESTRUTURAL: a guarda `if (email)` a montante torna o fallback inalcançável?
const guarda = txt.includes("    if (email) {");
console.log("guarda `if (email) {` presente antes do envio:", guarda);

const antes = md5(orig);
writeFileSync(F, txt.replace(de, () => para));
const depois = md5(readFileSync(F));
console.log(`md5 ${antes.slice(0, 8)} → ${depois.slice(0, 8)} — o mutante ${depois === antes ? "NÃO ENTROU" : "ENTROU"}`);

const r = spawnSync(process.execPath, ["--test", "--experimental-test-module-mocks", "--test-reporter=tap", "_tests/utac110g1-nota-tecnica.test.mjs"],
  { cwd: "desafio-gut/frontend/netlify/functions", encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const out = `${r.stdout}${r.stderr}`;
const n = (k) => Number((out.match(new RegExp(`^# ${k} (\\d+)`, "m")) || [])[1] ?? -1);
console.log(`teste com E1 aplicado: pass ${n("pass")} fail ${n("fail")} tests ${n("tests")} ⇒ ${n("fail") === 0 ? "SOBREVIVEU (equivalente confirmado)" : "MORREU (a explicação do autor seria falsa)"}`);
console.log("trecho do mutante no ficheiro:", readFileSync(F).toString("utf8").includes("fallback@example.com") ? "presente ✓" : "AUSENTE ✗");

writeFileSync(F, orig);
console.log("restauração:", md5(readFileSync(F)) === antes ? "md5 IDÊNTICO ✓" : "DIFERENTE ✗");

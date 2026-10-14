#!/usr/bin/env node
// UTAC110g — PROVA DE MUTAÇÃO (GATE 7). 12 mutantes, cada um dirigido a um defeito FECHADO neste UTAC.
//
// Padrão que funcionou (registo pedido pelo enunciado): **âncoras em BYTES com o EOL do FICHEIRO EM DISCO**
// (não o do HEAD — lição do §11.g), `assert count == 1`, backup em `%TEMP%` (FORA do repo), RED dirigido
// (só os testes do alvo), restauro e conferência por sha256.
//
// Correr da raiz do repo:   node scripts/utac110g-prova-mutacao.mjs
// Saída: uma linha por mutante (MORDEU / SOBREVIVEU) + o resumo. Sobrevivente ⇒ exit code 1.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut", "frontend");
const FN = join(FE, "netlify", "functions");
const TMP = mkdtempSync(join(tmpdir(), "utac110g-mut-"));

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 12);
const eol = (d) => (d.includes("\r\n") ? "\r\n" : "\n");

function correr(qual, ficheiro) {
  const [cmd, args, cwd] = qual === "backend"
    ? ["node", ["--test", "--experimental-test-module-mocks", `_tests/${ficheiro}`], FN]
    : ["node", ["--test", "--test-concurrency=1", ficheiro], FE];
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  return `${r.stdout || ""}${r.stderr || ""}`;
}
const resumo = (saida) => {
  const n = {};
  for (const m of saida.matchAll(/^ℹ (tests|pass|fail) (\d+)/gm)) n[m[1]] = Number(m[2]);
  return { pass: n.pass, fail: n.fail };
};

// [nome, qual, relativo, antes, depois, alvos]
const MUTANTES = [
  ["M1  P-1  o endpoint volta a fazer o 2.º SELECT da mesma linha", "backend", "ler-pontos.mjs",
    "    registo = await lerPontos(t.endereco);",
    '    registo = await lerPontos(t.endereco);\n    await (await import("./_lib/ledger-lance.mjs")).lerLedgerLance(t.endereco);',
    [["backend", "utac110g-p1-leitura-unica.test.mjs"], ["backend", "utac110f-front-missoes.test.mjs"]]],

  ["M2  P-1  as missões deixam de vir do registo lido (fonte errada)", "backend", "ler-pontos.mjs",
    "  const missoesHoje = missoesDeHoje(registo);",
    "  const missoesHoje = missoesDeHoje({});",
    [["backend", "utac110g-p1-leitura-unica.test.mjs"]]],

  ["M3  F2   o login diário deixa de mandar reler os pontos", "frontend", "src/context/AppContext.jsx",
    "        setPontosNonce((n) => n + 1);",
    "        void 0;",
    [["frontend", "src/__tests__/utac110f-login-diario.test.mjs"]]],

  ["M4  P-2  o tick horário passa a 1 minuto", "frontend", "src/context/AppContext.jsx",
    "setInterval(refetchPontosAgora, 60 * 60 * 1000)",
    "setInterval(refetchPontosAgora, 60 * 1000)",
    [["frontend", "src/__tests__/utac110g-p2-refetch-horario.test.mjs"]]],

  ["M5  P-2  o `pontosNonce` sai do `value` do provider", "frontend", "src/context/AppContext.jsx",
    "    pontosNonce,\n    // MC15.6 ITEM 2",
    "    // MC15.6 ITEM 2",
    [["frontend", "src/__tests__/utac110g-p2-refetch-horario.test.mjs"]]],

  ["M6  P-2  o `usePontos` deixa de depender do nonce", "frontend", "src/hooks/usePontos.js",
    "  }, [address, authToken, pontosNonce]);",
    "  }, [address, authToken]);",
    [["frontend", "src/__tests__/utac110g-p2-refetch-horario.test.mjs"]]],

  ["M7  B    a guarda de corrida `emCurso` do hook do resgate é desligada", "frontend", "src/hooks/useResgatarCartao.js",
    'if (emCurso.current) return { ok: false, code: "em_curso", message: "Resgate em curso" };',
    'if (false) return { ok: false, code: "em_curso", message: "Resgate em curso" };',
    [["frontend", "src/pages/__tests__/utac110g-resgate-hook.test.mjs"]]],

  ["M8  C1   o prazo de 30 dias sai da notificação in-app", "backend", "resgatar-cartao.mjs",
    "export const PRAZO_ENTREGA_DIAS = 30;",
    "export const PRAZO_ENTREGA_DIAS = 0;",
    [["backend", "utac110g-c1c2-email.test.mjs"]]],

  ["M9  C1   o envio do e-mail é desligado", "backend", "resgatar-cartao.mjs",
    "    if (email) {",
    "    if (false && email) {",
    [["backend", "utac110g-c1c2-email.test.mjs"]]],

  ["M10 C1   o e-mail deixa de ser validado", "backend", "resgatar-cartao.mjs",
    "    try { email = validarEmail(body.email); }",
    "    try { email = body.email; }",
    [["backend", "utac110g-c1c2-email.test.mjs"]]],

  ["M11 C1   o e-mail é reenviado na repetição idempotente", "backend", "resgatar-cartao.mjs",
    "  if (r.idempotent !== true) {",
    "  if (true) {",
    [["backend", "utac110g-c1c2-email.test.mjs"]]],

  ["M12 C1   o e-mail do login deixa de ir no corpo (cliente)", "frontend", "src/hooks/useResgatarCartao.js",
    "      if (emailLogin) corpo.email = emailLogin;",
    "      if (false && emailLogin) corpo.email = emailLogin;",
    [["frontend", "src/pages/__tests__/utac110g-resgate-hook.test.mjs"]]],
];

console.log(`UTAC110g — prova de mutação · backup em ${TMP}\n`);
let sobreviventes = 0, ancoras = 0;
for (const [nome, qual, rel, antes, depois, alvos] of MUTANTES) {
  const caminho = rel.startsWith("src") ? join(FE, rel) : join(FN, rel);
  const original = readFileSync(caminho);
  const nl = eol(original.toString("utf8"));
  const a = Buffer.from(antes.replaceAll("\n", nl), "utf8");
  const b = Buffer.from(depois.replaceAll("\n", nl), "utf8");
  const ocorrencias = original.toString("utf8").split(a.toString("utf8")).length - 1;
  if (ocorrencias !== 1) {
    console.log(`[ANCORA] ${nome}\n   count=${ocorrencias} (eol=${JSON.stringify(nl)}) — mutante NÃO aplicado\n`);
    ancoras++; continue;
  }
  const hAntes = sha(caminho);
  const bak = join(TMP, `${rel.replace(/[\\/]/g, "_")}.bak`);
  copyFileSync(caminho, bak);
  writeFileSync(caminho, Buffer.concat([original.subarray(0, original.indexOf(a)), b, original.subarray(original.indexOf(a) + a.length)]));
  try {
    const linhas = [];
    for (const [q, f] of alvos) {
      const r = resumo(correr(q, f));
      linhas.push(`${f}: pass=${r.pass} fail=${r.fail}`);
    }
    const mordeu = linhas.some((l) => !l.endsWith("fail=0"));
    console.log(`[${mordeu ? "MORDEU" : "SOBREVIVEU"}] ${nome}\n   ${linhas.join(" | ")}`);
    if (!mordeu) sobreviventes++;
  } finally {
    copyFileSync(bak, caminho);
    if (sha(caminho) !== hAntes) { console.error(`RESTAURO FALHOU: ${caminho}`); process.exitCode = 1; }
  }
}
console.log(`\nSOBREVIVENTES: ${sobreviventes} · ÂNCORAS FALHADAS: ${ancoras}`);
if (sobreviventes > 0 || ancoras > 0) process.exitCode = 1;

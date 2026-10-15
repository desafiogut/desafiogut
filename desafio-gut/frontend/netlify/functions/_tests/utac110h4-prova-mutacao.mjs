// UTAC110h.4 — prova de mutação (GATE 7). NÃO é teste da suíte (não termina em .test.mjs).
// Corre: node _tests/utac110h4-prova-mutacao.mjs   (a partir de netlify/functions)
// Para cada mutante: confirma que ENTROU (md5 mudou), corre os testes-alvo do lado certo, exige
// VERMELHO, e restaura da cópia em memória com md5 IDÊNTICO. Baseline VERDE exigida antes de mutar.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");  // netlify/functions
const FRONT = join(RAIZ, "..", "..");                             // desafio-gut/frontend
const md5 = (s) => createHash("md5").update(s).digest("hex");
const BACK_T = ["_tests/utac110h4-quota.test.mjs", "_tests/utac110h4-grafo.test.mjs", "_tests/utac110h4-sentry-mascara.test.mjs"];
const FRONT_T = ["src/__tests__/utac110h4-mascarar.test.mjs"];

function correr(lado) {
  const [cwd, args] = lado === "front"
    ? [FRONT, ["--test", "--test-concurrency=1", ...FRONT_T]]
    : [RAIZ, ["--experimental-test-module-mocks", "--test", ...BACK_T]];
  const r = spawnSync(process.execPath, args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const saida = `${r.stdout || ""}${r.stderr || ""}`;
  return { fail: Number((saida.match(/ℹ fail (\d+)/) ?? [])[1] ?? NaN),
    pass: Number((saida.match(/ℹ pass (\d+)/) ?? [])[1] ?? NaN) };
}

const R  = "_lib/referral.mjs";       // Frente A — quota/fail-closed
const EP = "referral.mjs";            // Frente C — aresta do grafo no endpoint
const AA = "auth-admin.mjs";          // Frente C — endereço isolado noutro ficheiro
const AC = "src/context/AppContext.jsx"; // Frente C — browser (caminho relativo à frontend)
const SS = "_lib/sentry-server.mjs";     // SEG5/F2-F3 — ponto de estrangulamento do Sentry (servidor)
const SL = "src/lib/sentryLazy.js";      // SEG5/F3 — choke point do Sentry cliente (frontend)
const GT = "_tests/utac110h4-grafo.test.mjs"; // a PRÓPRIA guarda (o seu ponto cego)

const MUTANTES = [
  // ── FRENTE A — a quota ─────────────────────────────────────────────────────────────────────────
  ["Q1 a quota deixa de travar (o `if (!limite.ok)` nunca entra)", R,
    "  if (!limite.ok) {\n    // UTAC110h.4 (GAP-1)",
    "  if (false) {\n    // UTAC110h.4 (GAP-1)", "back"],
  ["Q2 o contador mensal perde o recorte de MÊS (chave sem `${mes}`)", R,
    "  const chave = `referral-monthly:${enderecoIndicador}:${mes}`;",
    "  const chave = `referral-monthly:${enderecoIndicador}`;", "back"],
  ["Q3 o contador volta a FALHAR ABERTO (Blobs em baixo ⇒ credita sem quota)", R,
    '  if (!store) return { ok: false, conversoes: null, motivo: "quota_indisponivel", fonte: "fail-closed" };',
    '  if (!store) return { ok: true, conversoes: 0, motivo: null, fonte: "fail-open" };', "back"],
  ["Q4 a leitura que falhou é reportada como LIMITE DO MÊS (sela a conversão para sempre)", R,
    '    if (limite.motivo === "quota_indisponivel") {',
    "    if (false) {", "back"],
  ["Q5 a 11.ª credita (o limite passa a 11)", R,
    "  const limite = await verificarLimiteMensal(enderecoLower);",
    "  const limite = await verificarLimiteMensal(enderecoLower); limite.ok = true;", "back"],

  // ── FRENTE C — o grafo social ──────────────────────────────────────────────────────────────────
  ["G1 a aresta volta CRUA ao console do endpoint (o defeito da DEBT-031)", EP,
    "    indicado:             mascararEndereco(endereco),\n    indicador:            mascararEndereco(r.indicador),",
    "    indicado:             endereco,\n    indicador:            r.indicador,", "back"],
  ["G2 o payload do Sentry volta a levar o par inteiro (`indicador` + `contexto.indicado`)", R,
    "      indicador: mascararEndereco(enderecoLower), err: err?.message, // UTAC110h.4 (DEBT-031) — o `contexto` trazia o par inteiro\n      contexto: { ...contexto, indicado: mascararEndereco(contexto?.indicado) },",
    "      indicador: enderecoLower, err: err?.message, contexto,", "back"],
  ["G3 um console de OUTRO ficheiro volta a escrever o endereço cru", AA,
    '  console.info("[auth-admin] login ok", { endereco: mascararEndereco(endereco), jti: par.jti }); // UTAC110h.4 (DEBT-031)',
    '  console.info("[auth-admin] login ok", { endereco, jti: par.jti });', "back"],
  ["G4 o console do BROWSER volta a escrever o endereço cru", AC,
    "        address: mascararEnderecoLog(address), message: err?.message, name: err?.name,",
    "        address, message: err?.message, name: err?.name,", "front"],

  // ── OS MUTANTES DO VALIDADOR ADVERSARIAL (SEG5) — os dois que SOBREVIVERAM à 1.ª versão ────────
  // ⚠️ Ele correu 5 mutantes próprios e 2 sobreviveram (V1, V4). Estes são os mesmos, agora com a
  // guarda que os mata. Ficam aqui como prova permanente, não como nota de rodapé.
  ["V1 (F4) o `catch` da LEITURA do contador volta a FALHAR ABERTO (era o buraco que ele achou)", R,
    '  catch { return { ok: false, conversoes: null, motivo: "quota_indisponivel", fonte: "fail-closed" }; }',
    '  catch { return { ok: true, conversoes: 0, motivo: null, fonte: "fail-open" }; }', "back"],
  ["V4 (F2/F3) o ponto de estrangulamento do Sentry deixa de mascarar o payload", SS,
    "  const payloadSeguro = mascararEnderecosProfundo(payload);",
    "  const payloadSeguro = payload;", "back"],
  ["V6 (F3) o `beforeSend` do cliente volta a devolver o evento SEM mascarar", SL,
    "          return mascararEnderecosProfundo(event);", "          return event;", "front"],
  ["V7 (F2) a guarda volta a ter a allowlist ESTREITA (addresses/lancador/wallet cegos)", GT,
    "|\\baddresses\\b|",
    "|", "back"],
];

// Baseline verde obrigatória antes de mutar (mutar sobre vermelho não prova nada).
const base = correr("back");
if (!(base.fail === 0 && base.pass > 0)) {
  console.log(`ABORTADO: baseline do backend não está VERDE (fail=${base.fail}, pass=${base.pass}).`);
  process.exit(1);
}
const baseF = correr("front");
if (!(baseF.fail === 0 && baseF.pass > 0)) {
  console.log(`ABORTADO: baseline do frontend não está VERDE (fail=${baseF.fail}, pass=${baseF.pass}).`);
  process.exit(1);
}
console.log(`Baseline VERDE: backend ${base.pass} pass · frontend ${baseF.pass} pass\n`);

let provados = 0;
const falhas = [];
for (const [nome, ficheiro, antesBruto, depoisBruto, lado] of MUTANTES) {
  const abs = join(lado === "front" ? FRONT : RAIZ, ficheiro);
  const original = readFileSync(abs, "utf8");
  const h0 = md5(original);
  // ⚠️ Armadilha medida: estes ficheiros são CRLF. Uma âncora multi-linha escrita com \n casa 0×.
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  const antes = antesBruto.replace(/\r?\n/g, eol), depois = depoisBruto.replace(/\r?\n/g, eol);
  if (original.split(antes).length - 1 !== 1) { falhas.push(`${nome} — âncora casou ${original.split(antes).length - 1}× (exige 1)`); continue; }
  const mutado = original.replace(antes, depois);
  writeFileSync(abs, mutado, "utf8");
  const mudou = md5(readFileSync(abs, "utf8")) !== h0;
  const r = correr(lado);
  writeFileSync(abs, original, "utf8");
  const restaurado = md5(readFileSync(abs, "utf8")) === h0;
  const morreu = mudou && restaurado && r.fail > 0;
  if (morreu) provados++; else falhas.push(`${nome} — ${!mudou ? "o mutante NÃO entrou" : !restaurado ? "RESTAURO FALHOU (md5 diferente!)" : `SOBREVIVEU (fail=${r.fail}, pass=${r.pass})`}`);
  console.log(`${morreu ? "✓ MORREU" : "✗ SOBREVIVEU"}  ${nome}  (fail=${r.fail}, pass=${r.pass})`);
}
console.log(`\nPROVADOS: ${provados}/${MUTANTES.length}`);
if (falhas.length) { console.log("Falhas:"); falhas.forEach((f) => console.log("  - " + f)); process.exit(1); }

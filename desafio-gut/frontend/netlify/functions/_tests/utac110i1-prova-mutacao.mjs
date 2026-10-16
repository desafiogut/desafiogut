// utac110i1-prova-mutacao.mjs — UTAC110i.1 · FRENTE C (SEG1): prova de mutação do backend de
// validação do Google Play (`_lib/google-play-billing.mjs`, `validar-compra-google.mjs`) e da
// refactorização da cadeia de crédito em `_lib/comprar-passe-tipado.mjs`.
//
// Método: cada mutante tem alvo ÚNICO exigido, o ficheiro é confirmado a MUDAR (md5), o teste é
// corrido e exige-se RED, os bytes originais são repostos e o md5 final tem de ser idêntico (T5).
// Baseline primeiro: sem verde, o instrumento ABORTA (exit 2).
//
// Exit: 0 = prova completa · 1 = mutante sobreviveu · 2 = o instrumento não mediu.
//
// Uso: node _tests/utac110i1-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const FN = resolve(AQUI, "..");
const GOOGLE = join(FN, "_lib", "google-play-billing.mjs");
const ENDPOINT = join(FN, "validar-compra-google.mjs");
const TIPADO = join(FN, "_lib", "comprar-passe-tipado.mjs");
const ALVO = ["--test", "--experimental-test-module-mocks", "--test-concurrency=1",
  "_tests/utac110i1-validar-compra-google.test.mjs"];
const ALVO_PIX = ["--test", "--experimental-test-module-mocks", "--test-concurrency=1",
  "_tests/utac110d-dois-passes.test.mjs", "_tests/utac110e-eco-quildo.test.mjs"];
// Para os mutantes da cadeia PARTILHADA: corre o teste novo E a rede de segurança do PIX.
const ALVO_AMBOS = ["--test", "--experimental-test-module-mocks", "--test-concurrency=1",
  "_tests/utac110i1-validar-compra-google.test.mjs",
  "_tests/utac110d-dois-passes.test.mjs", "_tests/utac110e-eco-quildo.test.mjs"];

const MUTANTES = [
  // ── a decisão central do UTAC (R18-110i.1-1) ──────────────────────────────────────────────────
  ["B1  o Google Play passa a DEBITAR saldo R$ (deixa de ser «só PIX debita»)", TIPADO,
    '  const cred = await creditarBeneficios(ctx, endereco, ref);\n  if (!cred.ok) {\n    if (cred.etapa === "pontos" && cred.jaExistia) {',
    '  await debitarSaldoRs({ endereco, valorCentavos: VALOR_PASSE_CENTAVOS, motivo: ctx.nome });\n  const cred = await creditarBeneficios(ctx, endereco, ref);\n  if (!cred.ok) {\n    if (cred.etapa === "pontos" && cred.jaExistia) {', ALVO],
  ["B2  o Google Play deixa de creditar o ECOQUILDO (entrega a meio)", TIPADO,
    "  const eco = await garantirEcoDoPasse(ctx, endereco, ref);\n  if (!eco.ok) return { ok: false, etapa: \"eco\", code: eco.code, pontos: p.pontos, creditosLance };",
    "  const eco = { ok: true, saldo: 0 };\n  if (!eco.ok) return { ok: false, etapa: \"eco\", code: eco.code, pontos: p.pontos, creditosLance };", ALVO],
  // ── idempotência pelo recibo ──────────────────────────────────────────────────────────────────
  ["B3  o registo 'creditada' deixa de travar uma 2.ª entrega do MESMO recibo", ENDPOINT,
    '  if (registo?.estado === "creditada") {',
    "  if (false) {", ALVO],
  ["B4  dois pedidos concorrentes do mesmo token deixam de colidir na PK (23505 ignorado)", GOOGLE,
    '    if (error.code === "23505") return { ok: true, criado: false, registo: null };',
    '    if (error.code === "23505") return { ok: true, criado: true, registo: null };', ALVO],
  // ── validação contra a Google ─────────────────────────────────────────────────────────────────
  ["B5  compra CANCELADA (purchaseState 1) passa a ser aceite", GOOGLE,
    '  if (estado === 1) return { ok: false, code: "compra_cancelada" };',
    "  if (false) return { ok: false, code: \"compra_cancelada\" };", ALVO],
  ["B6  compra PENDENTE (purchaseState 2) passa a ser aceite", GOOGLE,
    '  if (estado === 2) return { ok: false, code: "compra_pendente" };',
    "  if (false) return { ok: false, code: \"compra_pendente\" };", ALVO],
  ["B7  uma falha HTTP da Google passa a valer como recibo bom", GOOGLE,
    "  if (!resposta.ok) {\n    return { ok: false, code: CODIGO_POR_STATUS[resposta.status] ?? \"validacao_indisponivel\" };\n  }",
    "  if (!resposta.ok) {\n    return { ok: true, pago: true, purchaseState: 0, consumptionState: 0, acknowledgementState: 0, orderId: null, purchaseTimeMillis: null, quantity: 1 };\n  }", ALVO],
  ["B8  o guarda do SKU ↔ tipo cai (aceita o produto do OUTRO Passe)", ENDPOINT,
    '  if (typeof sku !== "string" || TIPO_POR_SKU[sku] !== tipo || SKU_PASSE[tipo] !== sku) {\n    return jsonError(400, "sku_divergente", "o sku não corresponde ao tipo de Passe pedido");\n  }',
    "  if (false) {\n    return jsonError(400, \"sku_divergente\", \"o sku não corresponde ao tipo de Passe pedido\");\n  }", ALVO],
  ["B9  a env var da credencial deixa de ser exigida (vai à Google sem credencial)", ENDPOINT,
    "  const cred = lerCredencial();\n  if (!cred.ok) {",
    "  const cred = lerCredencial();\n  if (false) {", ALVO],
  ["B10 o recibo de OUTRA conta passa a creditar no endereço do atacante", ENDPOINT,
    '  if (registo && registo.endereco && registo.endereco !== endereco) {',
    "  if (false) {", ALVO],
  ["B11 o `ref` deixa de levar o token (dois recibos colidem no mesmo crédito)", ENDPOINT,
    "  const h = createHash(\"sha256\").update(String(purchaseToken)).digest(\"hex\").slice(0, 32);\n  return `passe-${tipoPasse}:gpl-${h}`;",
    "  return `passe-${tipoPasse}:gpl-fixo`;", ALVO],
  ["B12 o fecho do registo deixa de marcar 'creditada' (o retry reprocessaria para sempre)", ENDPOINT,
    '  const fecho = await fecharCompra(purchaseToken, "creditada", {',
    '  const fecho = await fecharCompra(purchaseToken, "falhada", {', ALVO],
  // ── a refactorização da cadeia partilhada (GATE 4) ────────────────────────────────────────────
  ["B13 a cadeia partilhada perde a idempotência por `ref` (o PIX passaria a creditar 2×)", TIPADO,
    "  if (!p.ok || !p.criado) {",
    "  if (!p.ok) {", ALVO_PIX],
  ["B14 o ECOQUILDO passa a ser creditado ANTES do crédito de lance (a ordem que o 110e fixou)", TIPADO,
    "  let creditosLance;\n  if (ctx.ehRelampago) {\n    let c;\n    try { c = await creditarCreditoLance(endereco, ref); }",
    "  const ecoAntes = await garantirEcoDoPasse(ctx, endereco, ref);\n  let creditosLance;\n  if (ctx.ehRelampago) {\n    let c;\n    try { c = await creditarCreditoLance(endereco, ref); }", ALVO_AMBOS],
];

const md5 = (b) => createHash("md5").update(b).digest("hex");

function correr(args, timeout = 300000) {
  const r = spawnSync(process.execPath, args, { cwd: FN, encoding: "utf8", timeout, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const n = (k) => {
    const m = out.match(new RegExp(`^\\u2139 ${k} (\\d+)$`, "m"));
    return m ? Number(m[1]) : null;
  };
  return { out, exit: r.status, sinal: r.signal, tests: n("tests"), pass: n("pass"), fail: n("fail"),
    red: /\u2716 /.test(out) || (n("fail") ?? 0) > 0 || (r.status ?? 0) !== 0 };
}

const ficheiros = [GOOGLE, ENDPOINT, TIPADO];
for (const f of ficheiros) {
  if (!readFileSync(f, "utf8").includes("export")) {
    console.error(`ABORTA (exit 2): alvo suspeito -> ${f}`);
    process.exit(2);
  }
}
const originais = new Map(ficheiros.map((f) => [f, readFileSync(f)]));
const md5Originais = new Map(ficheiros.map((f) => [f, md5(originais.get(f))]));

console.log("controlo (sem mutação), backend Google Play:");
const base = correr(ALVO);
if (base.red || base.fail !== 0 || !(base.tests > 0)) {
  console.error(`ABORTA (exit 2): baseline não está verde -> ${base.pass}/${base.tests}, fail ${base.fail}`);
  process.exit(2);
}
console.log(`  VERDE ${base.pass}/${base.tests}`);
console.log("controlo (sem mutação), suite PIX 110d/110e (rede de segurança da refactorização):");
const basePix = correr(ALVO_PIX);
if (basePix.red || basePix.fail !== 0 || !(basePix.tests > 0)) {
  console.error(`ABORTA (exit 2): a suite PIX não está verde -> ${basePix.pass}/${basePix.tests}, fail ${basePix.fail}`);
  process.exit(2);
}
console.log(`  VERDE ${basePix.pass}/${basePix.tests}\n`);

let mortos = 0;
const sobreviventes = [];
for (const [nome, ficheiro, de, para, args] of MUTANTES) {
  const antes = readFileSync(ficheiro, "utf8");
  const ocorrencias = antes.split(de).length - 1;
  if (ocorrencias !== 1) {
    console.error(`ABORTA (exit 2): ${nome} -> ${ocorrencias} ocorrências do alvo (exige 1)`);
    for (const [f, b] of originais) writeFileSync(f, b);
    process.exit(2);
  }
  writeFileSync(ficheiro, antes.replace(de, para));
  const entrou = md5(readFileSync(ficheiro)) !== md5Originais.get(ficheiro);
  const r = correr(args);
  writeFileSync(ficheiro, originais.get(ficheiro));
  const restaurado = md5(readFileSync(ficheiro)) === md5Originais.get(ficheiro);
  const pendurou = r.sinal === "SIGTERM" || r.tests === null;
  const veredicto = !entrou ? "NAO_ENTROU" : pendurou ? "RED (pendurou)" : r.red ? "RED" : "SOBREVIVEU";
  if (veredicto === "RED" || veredicto === "RED (pendurou)") mortos += 1;
  else sobreviventes.push(nome);
  console.log(`${veredicto.padEnd(14)} | entrou: ${entrou ? "sim" : "NAO"} | restaurado: ${restaurado ? "sim" : "NAO"} | ${nome}`);
  if (!restaurado) { console.error("ABORTA (exit 2): restauro não bateu byte a byte."); process.exit(2); }
}

console.log(`\nmutantes RED: ${mortos}/${MUTANTES.length}`);
for (const f of ficheiros) {
  const ok = md5(readFileSync(f)) === md5Originais.get(f);
  console.log(`  ${ok ? "== inicial" : "DIVERGENTE!"} ${f.split(/[\\/]/).pop()}`);
}
process.exit(mortos === MUTANTES.length ? 0 : 1);

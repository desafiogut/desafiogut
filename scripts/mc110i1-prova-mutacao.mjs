// mc110i1-prova-mutacao.mjs — UTAC110i.1 · FRENTE B (SEG0): prova de mutação da abstracção do
// Google Play Billing (`src/lib/google-play-billing.js`).
//
// Método herdado do `mc110g1-prova-mutacao.mjs`:
//   · cada mutante tem ALVO ÚNICO exigido (o `replace` tem de encontrar exactamente 1 ocorrência);
//   · o ficheiro é confirmado a MUDAR (md5 antes ≠ depois) — T5: sem isto o RED poderia ser falso;
//   · o teste é corrido e exige-se RED (`✖` presente ou `ℹ fail > 0` ou exit ≠ 0);
//   · os bytes originais são repostos e o md5 final tem de ser IDÊNTICO ao do início.
//   Baseline primeiro: se a suíte não estiver VERDE sem mutação, o instrumento ABORTA (exit 2).
//
// Exit: 0 = prova completa (n/n mutantes RED) · 1 = algum mutante sobreviveu · 2 = o instrumento
// não mediu (baseline vermelha, alvo ausente, mutante que não entrou, restauro falhado).
//
// ⚠️ M10 é especial e está declarado: o defeito que ele repõe (timer de `TIMEOUT_COMPRA_MS` não
// cancelado no caminho de erro) NÃO se manifesta por uma asserção — manifesta-se por o processo
// NÃO SAIR. O veredicto dele é «pendurou» (timeout), não «ficou vermelho». Medido: sem o
// `cancelar()` o ficheiro não termina em 180 s (e o harness da suíte, que corre os ficheiros num
// processo só e sem timeout, ficava preso).
//
// Uso: node scripts/mc110i1-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut", "frontend");
const SUT = join(FE, "src", "lib", "google-play-billing.js");
const TESTE = "src/__tests__/utac110i1-google-play-billing.test.mjs";
const ARGS = ["--test", "--test-concurrency=1", TESTE];

/** [nome, ficheiro, texto-original, texto-mutado, timeoutMs] */
const MUTANTES = [
  ["M1  billingDisponivel() liga sempre (o PWA passaria a ir à loja)", SUT,
    "    return (\n      Capacitor?.isNativePlatform?.() === true &&\n      Capacitor?.getPlatform?.() === \"android\" &&\n      Capacitor?.isPluginAvailable?.(\"PurchasePlugin\") === true\n    );",
    "    return true;", 120000],
  ["M2  o guarda deixa de exigir Android (iOS ligava o Billing do Google)", SUT,
    'Capacitor?.getPlatform?.() === "android" &&',
    'Capacitor?.getPlatform?.() !== "nada" &&', 120000],
  ["M3  o guarda deixa de exigir o plugin nativo", SUT,
    'Capacitor?.isPluginAvailable?.("PurchasePlugin") === true',
    "true", 120000],
  ["M4  falha ABERTA: a excepção da ponte nativa passa a ligar o Billing", SUT,
    "  } catch {\n    return false;\n  }\n}",
    "  } catch {\n    return true;\n  }\n}", 120000],
  ["M5  os DOIS SKUs trocados (Relâmpago compra o produto do Programado)", SUT,
    '  relampago: "passe_relampago_r2",\n  programado: "passe_programado_r2",',
    '  relampago: "passe_programado_r2",\n  programado: "passe_relampago_r2",', 120000],
  ["M6  tipo inválido deixa de ser recusado localmente (vai à loja)", SUT,
    "  const sku = skuDoTipo(tipo);\n  if (!sku) return { ok: false, code: \"tipo_invalido\", message: \"Escolha um Passe Desafio válido.\" };",
    "  const sku = SKU_PASSE[tipo] ?? SKU_PASSE.relampago;", 120000],
  ["M7  o listener `approved` é instalado em cada compra (o pacote real lança)", SUT,
    "function garantirListenerAprovado(store) {\n  if (_listenerAprovado) return;\n  _listenerAprovado = true;",
    "function garantirListenerAprovado(store) {\n  if (false) return;", 120000],
  ["M8  o purchaseToken deixa de ser lido do `nativePurchase` (recibo cego)", SUT,
    "  const purchaseToken = cru.purchaseToken ?? recibo?.purchaseToken ?? transacao?.purchaseId ?? null;",
    "  const purchaseToken = recibo?.purchaseToken ?? null;", 120000],
  ["M9  o SKU aprovado deixa de ser conferido com o pedido", SUT,
    '    if (n.sku !== sku) {\n      // Defesa em profundidade (R18-110i-7): o SKU aprovado tem de ser o que se pediu.\n      return { ok: false, code: "sku_divergente", message: "A loja aprovou um produto diferente do pedido." };\n    }',
    "", 120000],
  ["M10 o `confirmarCompra` aceita uma transacção sem produtos (TypeError no adaptador real)", SUT,
    '  if (!alvo || typeof alvo !== "object" || typeof alvo.products?.[0]?.id !== "string") {',
    '  if (!alvo || typeof alvo !== "object") {', 120000],
  // ⚠️ M11 — o mutante que a MEDIÇÃO exigiu (não uma asserção): repõe o timer pendente.
  ["M11 (PENDURA) o timer da espera deixa de ser cancelado no caminho de erro", SUT,
    "    if (resultado && resultado.isError) {\n      cancelar();",
    "    if (resultado && resultado.isError) {", 45000],
];

const md5 = (b) => createHash("md5").update(b).digest("hex");

function correr(timeout) {
  const r = spawnSync(process.execPath, ARGS, { cwd: FE, encoding: "utf8", timeout, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const n = (k) => {
    const m = out.match(new RegExp(`^\\u2139 ${k} (\\d+)$`, "m"));
    return m ? Number(m[1]) : null;
  };
  return { out, exit: r.status, sinal: r.signal, tests: n("tests"), pass: n("pass"), fail: n("fail"),
    red: /\u2716 /.test(out) || (n("fail") ?? 0) > 0 || (r.status ?? 0) !== 0 };
}

if (!readFileSync(SUT, "utf8").includes("billingDisponivel")) {
  console.error(`ABORTA (exit 2): o alvo não parece ser o ficheiro esperado -> ${SUT}`);
  process.exit(2);
}
const original = readFileSync(SUT);
const md5Original = md5(original);

console.log(`alvo: ${SUT}\nmd5 inicial: ${md5Original}\n`);
const base = correr(180000);
if (!base.red && base.fail === 0 && base.tests > 0) {
  console.log(`controlo (sem mutação): VERDE ${base.pass}/${base.tests} (fail ${base.fail})`);
} else {
  console.error(`ABORTA (exit 2): a baseline NÃO está verde -> ${base.pass}/${base.tests}, fail ${base.fail}, exit ${base.exit}`);
  console.error(base.out.split("\n").filter((l) => l.startsWith("\u2716")).slice(0, 8).join("\n"));
  process.exit(2);
}

let mortos = 0;
const resultados = [];
for (const [nome, ficheiro, de, para, timeout] of MUTANTES) {
  const antes = readFileSync(ficheiro, "utf8");
  const ocorrencias = antes.split(de).length - 1;
  if (ocorrencias !== 1) {
    console.error(`ABORTA (exit 2): ${nome} -> o alvo tem ${ocorrencias} ocorrências (exige 1)`);
    writeFileSync(SUT, original);
    process.exit(2);
  }
  writeFileSync(ficheiro, antes.replace(de, para));
  const md5Mutado = md5(readFileSync(ficheiro));
  const entrou = md5Mutado !== md5Original;
  const r = correr(timeout);
  writeFileSync(ficheiro, original);
  const restaurado = md5(readFileSync(ficheiro)) === md5Original;
  const pendurou = r.sinal === "SIGTERM" || r.tests === null;
  const veredicto = !entrou ? "NAO_ENTROU" : pendurou ? "RED (pendurou)" : r.red ? "RED" : "SOBREVIVEU";
  if (veredicto === "RED" || veredicto === "RED (pendurou)") mortos += 1;
  resultados.push([nome, veredicto, r.pass, r.tests, r.fail, restaurado]);
  console.log(`${veredicto.padEnd(14)} | mutante entrou: ${entrou ? "sim" : "NAO"} | restaurado: ${restaurado ? "sim" : "NAO"} | ${nome}`);
  if (!restaurado) {
    console.error("ABORTA (exit 2): o restauro não bateu byte a byte.");
    process.exit(2);
  }
}

console.log(`\nmutantes RED: ${mortos}/${MUTANTES.length}`);
console.log(`md5 final: ${md5(readFileSync(SUT))} ${md5(readFileSync(SUT)) === md5Original ? "(== inicial)" : "(DIVERGENTE!)"}`);
for (const [nome, v, p, t, f, ok] of resultados) if (v === "SOBREVIVEU" || v === "NAO_ENTROU") console.log(`  SOBREVIVENTE/INVALIDO: ${nome}`);
process.exit(mortos === MUTANTES.length ? 0 : 1);

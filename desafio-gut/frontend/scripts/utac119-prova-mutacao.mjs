// scripts/utac119-prova-mutacao.mjs — R16: prova que os testes do UTAC119 mordem.
// M1: volta ao bug original (regista só o SKU pedido, DEPOIS do initialize) -> teste da ordem RED
// M2: remove o fallback store.update()                                        -> teste do fallback RED
// Restaura sempre o ficheiro original (md5 no fim tem de bater).
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const LIB = "src/lib/google-play-billing.js";
const T = "src/__tests__/utac110i1-google-play-billing.test.mjs";
const md5 = (b) => createHash("md5").update(b).digest("hex");
const original = readFileSync(LIB);
console.log("md5 original:", md5(original));

const blocoNovo = `  const novos = SKUS_TODOS.filter((s) => !_registados.has(s));
  if (novos.length) {
    store.register(novos.map((id) => ({ id, type: ProductType.CONSUMABLE, platform: Platform.GOOGLE_PLAY })));
    for (const id of novos) _registados.add(id);
  }
  if (!_inicializada) {
    await store.initialize();
    _inicializada = true;
  }`;

const blocoAntigo = `  if (!_inicializada) {
    await store.initialize();
    _inicializada = true;
  }
  if (!_registados.has(sku)) {
    store.register([{ id: sku, type: ProductType.CONSUMABLE, platform: Platform.GOOGLE_PLAY }]);
    _registados.add(sku);
  }`;

const updateCall = `      const p = store.update?.();
      if (p && typeof p.catch === "function") p.catch(() => {});`;

const mutacoes = [
  { nome: "M1 — registo tardio: só o SKU pedido e DEPOIS do initialize (o bug do ITEM_UNAVAILABLE)", de: blocoNovo, para: blocoAntigo },
  { nome: "M2 — sem fallback: não pede reload à loja quando o SKU não está carregado", de: updateCall, para: "      // M2: fallback removido" },
];

let mortos = 0;
for (const m of mutacoes) {
  const src = original.toString("utf8");
  if (!src.includes(m.de)) { console.log(`⚠️  padrão ausente: ${m.nome}`); continue; }
  writeFileSync(LIB, src.replace(m.de, m.para));
  let passou = true, saida = "";
  try { execFileSync(process.execPath, ["--test", T], { stdio: "pipe", timeout: 120000 }); }
  catch (e) { passou = false; saida = (e.stdout?.toString() || "") + (e.stderr?.toString() || ""); }
  writeFileSync(LIB, original);
  const alvo = saida.includes("UTAC119");
  console.log(`${passou ? "❌ SOBREVIVEU" : "✅ MORTO"} — ${m.nome}${!passou && alvo ? " (teste UTAC119 em RED)" : ""}`);
  if (!passou) mortos += 1;
}

writeFileSync(LIB, original);
console.log("md5 final:  ", md5(readFileSync(LIB)), md5(readFileSync(LIB)) === md5(original) ? "== original ✔" : "DIVERGIU ✖");
console.log(`RESULTADO: ${mortos}/${mutacoes.length} mutantes mortos`);
process.exit(mortos === mutacoes.length ? 0 : 1);

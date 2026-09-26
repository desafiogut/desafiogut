#!/usr/bin/env node
// MC97 — mede a ficha da Play e RECUSA escrever/validar se algum campo exceder o limite.
// As contagens da ficha sao MEDIDAS, nao escritas a mao: a 1.a versao tinha-as inventadas e
// 5 dos 9 campos excediam o limite com um ✅ ao lado.
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const R = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LIM = { titulo: 30, curta: 80, longa: 4000 };
const doc = readFileSync(resolve(R, "docs/FICHA-PLAY-3-IDIOMAS.md"), "utf8");
const blocos = [...doc.matchAll(/```\n([\s\S]*?)```/g)].map((m) => m[1].trim());
if (blocos.length !== 9) { console.error(`esperava 9 blocos, vi ${blocos.length} — medicao invalida`); process.exit(2); }
const campos = ["titulo","curta","longa"], langs = ["PT","EN","ES"];
let mau = 0;
langs.forEach((l, i) => {
  campos.forEach((c, j) => {
    const n = blocos[i * 3 + j].length, lim = LIM[c];
    const ok = n <= lim; if (!ok) mau++;
    console.log(`${ok ? "OK  " : "FALHA"} ${l} ${c}: ${n}/${lim}`);
  });
});
if (mau) { console.error(`\n${mau} campo(s) EXCEDEM o limite da Play — a ficha nao pode ser colada`); process.exit(1); }
console.log("\nTodos os campos dentro dos limites da Play Console.");

#!/usr/bin/env node
// MC97, actualizado no MC98 — mede a ficha da Play e RECUSA aprovar se algum campo
// exceder o limite. As contagens da ficha sao MEDIDAS, nao escritas a mao: a 1.a versao
// tinha-as inventadas e 5 dos 9 campos excediam o limite com um ✅ ao lado.
//
// MC98 — o DesafioGUT passou a PT-BR only e a ficha passou de `FICHA-PLAY-3-IDIOMAS.md`
// (9 blocos) para `FICHA-PLAY-PT.md` (3 blocos). Medido no SEG-1: apontar o script para um
// ficheiro que deixou de existir teria deixado o medidor de ficha QUEBRADO — e a regra da
// serie e' que a ficha e' medida, nunca contada a mao.
//
// Duas guardas novas:
//   (a) a contagem DECLARADA no titulo de cada campo tem de ser igual a' MEDIDA
//       («**29 caracteres**» vs o que o regex conta) — apanha a contagem a mao, que foi
//       exactamente o defeito do MC97;
//   (b) o documento tem de ser PT-only: se voltar a ter uma seccao EN/ES, falha.
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const R = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LIM = { titulo: 30, curta: 80, longa: 4000 };
const DOC = resolve(R, "docs/FICHA-PLAY-PT.md");

if (!existsSync(DOC)) { console.error(`nao existe ${DOC}`); process.exit(2); }
const doc = readFileSync(DOC, "utf8");

// GUARDA (b) — PT-only, sem seccoes de outro idioma.
const OUTRO_IDIOMA = /^##\s+(EN|ES)\s*$/m;
if (OUTRO_IDIOMA.test(doc)) {
  console.error("a ficha tem uma seccao EN/ES — o DesafioGUT e' PT-BR only (MC98)");
  process.exit(1);
}
if (/English \(US\)|Espa[nñ]ol/.test(doc)) {
  console.error("a ficha ainda contem copy de outro idioma (English (US) / Espanol)");
  process.exit(1);
}

// ⚠️ CRLF: um `git worktree` limpo faz checkout CRLF nos .md (o .gitattributes não tinha
// regra para *.md e core.autocrlf=true). A 1.ª versão exigia `` ```\n `` e num worktree
// limpo via `esperava 3 blocos, vi 0 — medicao invalida` (exit 2) NUM FICHEIRO CORRECTO.
// Apanhado pelo validador independente do MC98. Agora tolera CRLF — e o .gitattributes
// ganhou `*.md text eol=lf` para a causa-raiz.
const blocos = [...doc.matchAll(/```\r?\n([\s\S]*?)```/g)].map((m) => m[1].trim());
if (blocos.length !== 3) { console.error(`esperava 3 blocos, vi ${blocos.length} — medicao invalida`); process.exit(2); }

// GUARDA (a) — as contagens declaradas no texto tem de ser as medidas.
const declaradas = [...doc.matchAll(/\*\*(\d+)\s+caracteres?\*\*/g)].map((m) => Number(m[1]));
if (declaradas.length !== 3) {
  console.error(`esperava 3 contagens declaradas («**N caracteres**»), vi ${declaradas.length}`);
  process.exit(2);
}

const campos = ["titulo", "curta", "longa"];
let mau = 0;
campos.forEach((c, j) => {
  const s = blocos[j];
  // O ficheiro e' LF; o conteudo da ficha pode trazer CR de um copiar/colar. A Play conta
  // caracteres, nao bytes — normalizar evita um falso «excede o limite» por fim de linha.
  const n = s.replace(/\r\n/g, "\n").length, lim = LIM[c];
  const decl = declaradas[j];
  let estado = "OK   ";
  if (decl !== n) { estado = "FALHA"; mau++; console.log(`${estado} PT ${c}: o texto declara ${decl} caracteres, medidos sao ${n}`); return; }
  if (n > lim) { estado = "FALHA"; mau++; }
  console.log(`${estado} PT ${c}: ${n}/${lim} (declarado ${decl})`);
});
if (mau) { console.error(`\n${mau} problema(s) na ficha — nao pode ser colada no MC101`); process.exit(1); }
console.log("\nFicha PT-BR: 3/3 campos dentro dos limites da Play Console e contagens declaradas == medidas.");

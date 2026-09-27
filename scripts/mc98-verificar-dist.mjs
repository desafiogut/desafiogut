// MC98 — instrumento preservado (estava em _tmp/mc98/, movido para scripts/ na limpeza
// final). Uso: node scripts/mc98-verificar-dist.mjs
// Ficam os instrumentos que FUNCIONAM; o scratch que falhou foi apagado.
// MC98 — verificação do ARTEFACTO (dist/) construído pelo vite.
// Prova ao nível do que embarca, não do que se lê no código.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIST = "desafio-gut/frontend/dist";
if (!existsSync(DIST)) { console.error("dist/ nao existe — corra o build primeiro"); process.exit(2); }

const ficheiros = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else ficheiros.push(p);
  }
})(DIST);

let bytes = 0;
const texto = [];
for (const f of ficheiros) {
  const b = readFileSync(f);
  bytes += b.length;
  texto.push([f, b.toString("utf8")]);
}
console.log(`dist/: ${ficheiros.length} ficheiros, ${bytes} bytes`);

const PROIBIDOS = [
  ["English (US)", /English\s*\(US\)/],
  ["Español", /Espa[nñ]ol/],
  ["Português (Brasil)", /Portugu[eê]s\s*\(Brasil\)/],
  ['option value="en"', /value:"en"/],
  ['option value="es"', /value:"es"/],
  ["nav.lances em ES (Pujas)", /Pujas/],
  ["nav.lances em EN (Bids)", /Bids/],
];
const OBRIGATORIOS = [
  ["html lang=pt-BR", /lang="pt-BR"/],
  ["texto PT nosso (Lance relâmpago)", /Rel[âa]mpago/],
  ["texto PT do torneio", /menor lance [úu]nico/i],
];

let mau = 0;
for (const [nome, re] of PROIBIDOS) {
  const achados = texto.filter(([, t]) => re.test(t)).map(([f]) => f);
  console.log(`${achados.length ? "FALHA" : "OK   "} proibido «${nome}»: ${achados.length} ficheiro(s)`);
  if (achados.length) { mau++; for (const a of achados) console.log("        " + a); }
}
for (const [nome, re] of OBRIGATORIOS) {
  const achados = texto.filter(([, t]) => re.test(t)).map(([f]) => f);
  console.log(`${achados.length ? "OK   " : "FALHA"} presente  «${nome}»: ${achados.length} ficheiro(s)`);
  if (!achados.length) mau++;
}
console.log(`\n${mau ? "ARTEFACTO COM PROBLEMAS: " + mau : "ARTEFACTO LIMPO"}`);
process.exit(mau ? 1 : 0);

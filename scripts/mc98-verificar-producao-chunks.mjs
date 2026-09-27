// MC98 — instrumento preservado (estava em _tmp/mc98/, movido para scripts/ na limpeza
// final). Uso: node scripts/mc98-verificar-producao-chunks.mjs
// Ficam os instrumentos que FUNCIONAM; o scratch que falhou foi apagado.
// MC98 — verificação cirúrgica dos 2 chunks decisivos em produção, com identidade
// (o hash do chunk mudou = é outro build) e asserção positiva/negativa explícita.
const BASE = "https://silly-stardust-ca71bc.netlify.app/";

const html = await (await fetch(BASE)).text();
const entrada = html.match(/src="(\/assets\/index-[^"]+\.js)"/)[1];
const tEntrada = await (await fetch(new URL(entrada, BASE))).text();
const nomes = [...new Set([...tEntrada.matchAll(/["'`](\.?\/?assets\/[A-Za-z0-9_.-]+\.js)["'`]/g)].map((m) => m[1]))];

// percorrer o mapa para achar os chunks que nos interessam
const mapa = new Map();
async function baixar(rel) {
  const r = rel.startsWith("/") ? rel : "/" + rel.replace(/^\.?\/*/, "");
  if (mapa.has(r)) return mapa.get(r);
  try { const x = await fetch(new URL(r, BASE)); const t = x.ok ? await x.text() : ""; mapa.set(r, t); return t; }
  catch { mapa.set(r, ""); return ""; }
}
await baixar(entrada);
for (let n = 0; n < 3; n++) {
  const antes = mapa.size;
  for (const [, t] of [...mapa]) for (const m of t.matchAll(/["'`](\.?\/?assets\/[A-Za-z0-9_.-]+\.js)["'`]/g)) await baixar(m[1]);
  if (mapa.size === antes) break;
}
for (const [, t] of [...mapa]) for (const m of t.matchAll(/["'`](\.?\/?assets\/[A-Za-z0-9_.-]+\.js)["'`]/g)) await baixar(m[1]);

const achar = (re) => [...mapa.entries()].filter(([u, t]) => re.test(u) && t.length);
const ctx = achar(/IdiomaContext/);
const cfg = achar(/\/Configuracoes-/);

console.log(`=== IDENTIDADE DO BUILD EM PRODUÇÃO ===`);
console.log(`  entrada: ${entrada}`);
for (const [u, t] of ctx) console.log(`  idioma : ${u} (${t.length} bytes)`);
for (const [u, t] of cfg) console.log(`  config : ${u} (${t.length} bytes)`);
console.log(`  (no build ANTERIOR eram /assets/index-BB1St7-V.js, /assets/IdiomaContext-BxrxdkSw.js, /assets/Configuracoes-ChbFqgwZ.js)`);

const CHECKS = [];
const add = (nome, ok, extra = "") => { CHECKS.push([nome, ok]); console.log(`  ${ok ? "OK   " : "FALHA"} ${nome}${extra ? "  " + extra : ""}`); };

console.log(`\n=== CHUNK DO i18n (o dicionário) ===`);
if (!ctx.length) { console.log("  FALHA: chunk do IdiomaContext não encontrado — varrimento cego"); CHECKS.push(["chunk i18n encontrado", false]); }
else for (const [u, t] of ctx) {
  add("só UM idioma suportado (" + "\"pt\"" + ")", /\[`pt`\]|\["pt"\]/.test(t));
  add("sem navigator.language", !/navigator\s*[,.]?\s*language|navigator\.language/.test(t));
  add("sem dicionário EN (Skill-based tournament)", !/Skill-based tournament/i.test(t));
  add("sem dicionário ES (Torneo de habilidad)", !/Torneo de habilidad/i.test(t));
  add("sem navegador/idioma do aparelho", !/navigator/.test(t) || /navigator\.userAgent/.test(t));
  add("mantém o texto PT (Torneio de habilidade)", /Torneio de habilidade/i.test(t));
  const m = t.match(/\{pt:[^}]{0,40}\}/);
  console.log(`       DICTS em produção: ${m ? m[0].slice(0, 60) : "(padrão diferente — ver abaixo)"}`);
  const i = t.indexOf("l=[") > -1 ? t.indexOf("l=[") : t.indexOf("=[`pt`]");
  if (i > -1) console.log(`       SUPPORTED: ${JSON.stringify(t.slice(i, i + 30))}`);
}

console.log(`\n=== CHUNK DA PÁGINA CONFIGURAÇÕES (onde vivia o selector) ===`);
if (!cfg.length) { console.log("  FALHA: chunk da Configuracoes não encontrado — varrimento cego"); CHECKS.push(["chunk config encontrado", false]); }
else for (const [u, t] of cfg) {
  add("sem <option> de idioma", !/<option[^>]*value\s*=\s*["'](pt|en|es)["']/i.test(t));
  add("sem «Português (Brasil)»", !/Portugu[eê]s\s*\(Brasil\)/.test(t));
  add("sem «English»", !/\bEnglish\b/.test(t));
  add("sem «Español»", !/\bEspa[nñ]ol\b/.test(t));
  add("sem a chave config.idioma", !/config\.idioma/.test(t));
  add("sem a chave config.preferencias", !/config\.preferencias/.test(t));
  add("mantém o resto da página (config.titulo/config.sobre)", /config\.titulo/.test(t) && /config\.sobre/.test(t));
}

const maus = CHECKS.filter(([, ok]) => !ok);
console.log(`\n=== VEREDITO ===`);
console.log(maus.length === 0
  ? `PRODUCAO OK — ${CHECKS.length}/${CHECKS.length} verificações passaram.`
  : `FALHAS: ${maus.map(([n]) => n).join(" | ")}`);
process.exit(maus.length ? 1 : 0);

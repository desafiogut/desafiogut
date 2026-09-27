// MC98 — instrumento preservado (estava em _tmp/mc98/, movido para scripts/ na limpeza
// final). Uso: node scripts/mc98-medir-producao.mjs
// Ficam os instrumentos que FUNCIONAM; o scratch que falhou foi apagado.
// MC98 — mede o ESTADO DE PRODUÇÃO.
// Uso: node _tmp/mc98/medir-producao.mjs [seletor|ausente]
//
// ⚠️ LIÇÃO MEDIDA NESTE MC: o HTML inicial só referencia o chunk de ENTRADA. As páginas
// são lazy (code-split) e o chunk de `Configuracoes.jsx` — que é onde vive o selector de
// idioma — NÃO aparece no HTML. A 1.ª versão deste medidor leu só o HTML e concluiu
// «produção sem selector»; era um extractor CEGO a dar um falso verde (a classe de defeito
// do MC96.3). Agora percorre o MAPA DE CHUNKS do bundle de entrada, recursivamente.
const BASE = "https://silly-stardust-ca71bc.netlify.app/";
const esperado = (process.argv[2] || "seletor").toLowerCase();

const baixados = new Map();          // url relativo -> texto
async function baixar(rel) {
  if (baixados.has(rel)) return baixados.get(rel);
  const r = await fetch(new URL(rel, BASE));
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${rel}`);
  const t = await r.text();
  baixados.set(rel, t);
  return t;
}

const html = await baixar("/");
console.log(`GET ${BASE} -> ${html.length} bytes`);
console.log(`  <html lang>: ${(html.match(/<html[^>]*lang="([^"]*)"/) || [, "(sem lang)"])[1]}`);
console.log(`  <title>: ${(html.match(/<title>([^<]*)<\/title>/) || [, "(sem title)"])[1]}`);

// 1. ponto de entrada
const raizes = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]))];
console.log(`  chunks no HTML inicial: ${raizes.length}`);
for (const r of raizes) await baixar(r);

// 2. percorrer o mapa de chunks recursivamente (o mapa pode estar em qualquer chunk já lido)
let novos = 1, niveis = 0;
while (novos > 0 && niveis++ < 4) {
  novos = 0;
  for (const [, t] of [...baixados]) {
    for (const m of t.matchAll(/["'`](\.?\/?assets\/[A-Za-z0-9_.-]+\.js)["'`]/g)) {
      const rel = "/" + m[1].replace(/^\.?\/*/, "");
      if (!baixados.has(rel)) {
        try { await baixar(rel); novos++; }
        catch { baixados.set(rel, ""); }
      }
    }
  }
  console.log(`  nivel ${niveis}: +${novos} chunks`);
}

const chunks = [...baixados.entries()].filter(([, t]) => t.length);
console.log(`\nchunks analisados: ${chunks.length} (${chunks.reduce((a, [, t]) => a + t.length, 0)} bytes)`);
console.log(`  guarda: o chunk do selector está entre eles? ${chunks.some(([u]) => /Configura/i.test(u)) ? "SIM (" + chunks.filter(([u]) => /Configura/i.test(u)).map(([u]) => u).join(", ") + ")" : "NAO — varrimento possivelmente cego"}`);

const TESTES = [
  ["seletor PT (Português (Brasil))", /Portugu[eê]s\s*\(Brasil\)/],
  ["seletor EN (English (US))", /English\s*\(US\)/],
  ["seletor ES (Español)", /Espa[nñ]ol/],
  ["dicionário EN presente (Skill-based tournament)", /Skill-based tournament/i],
  ["dicionário ES presente (Torneo de habilidad)", /Torneo de habilidad/i],
  ["navigator.language (detecção automática de idioma)", /navigator\.language|navigator,t\.language/],
  ["texto PT presente (Relâmpago)", /Rel[âa]mpago/],
  ["texto PT presente (Torneio de habilidade)", /Torneio de habilidade/i],
];
const res = {};
for (const [nome, re] of TESTES) {
  const achados = chunks.filter(([, t]) => re.test(t)).map(([u]) => u);
  res[nome] = achados.length;
  console.log(`  ${achados.length ? "PRESENTE" : "ausente "}  ${nome}   (${achados.length}) ${achados[0] || ""}`);
}

console.log("\n=== VEREDITO ===");
const marcasEN = ["seletor PT (Português (Brasil))", "seletor EN (English (US))", "seletor ES (Español)"];
const vestigios = marcasEN.filter((k) => res[k] > 0);
if (esperado === "seletor") {
  const ok = vestigios.length === 3;
  console.log(ok
    ? "BASELINE CONFIRMADO: produção AINDA tem o selector de idioma (os 3) — o deploy do MC98 ainda não aconteceu."
    : `INESPERADO: só ${vestigios.length}/3 marcas do selector presentes.`);
  process.exit(ok ? 0 : 1);
} else {
  const ptOk = res["texto PT presente (Relâmpago)"] > 0 && res["texto PT presente (Torneio de habilidade)"] > 0;
  console.log(vestigios.length === 0 && ptOk
    ? "PRODUCAO PT-BR ONLY CONFIRMADA: nenhum vestígio do selector EN/ES e o texto PT está presente."
    : `PROBLEMAS: vestigios=[${vestigios.join(" | ")}] textoPT=${ptOk}`);
  process.exit(vestigios.length === 0 && ptOk ? 0 : 1);
}

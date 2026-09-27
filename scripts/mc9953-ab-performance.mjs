// mc9953-ab-performance.mjs — MC99.5.3, A/B PAREADO da Frente A (byte-level, re-executável).
//
// Uso: node scripts/mc9953-ab-performance.mjs <dist-A> <dist-B> [N]
//   dist-A = build ANTES (15 fontes, fundo mobile 200 068 B, 2 preloads de fonte)
//   dist-B = build DEPOIS (3 fontes, fundo mobile 106 942 B, 1 preload de fonte)
//
// ⚠️ PORQUE ESTE FICHEIRO EXISTE: o relatório do MC99.5.3 citava um A/B feito à mão no browser. Um
// número que só existe na narrativa não é re-verificável — e «o instrumento que foi citado sem
// correr» é o modo nº 1 de mentir descrito em docs/METODOLOGIA-SEGURANCA.md §9. Este script
// reproduz a parte DETERMINÍSTICA da medição (bytes na primeira carga), sem browser.
//
// O que ele mede, por braço:
//   - os bytes dos recursos que a página PEDE PARA DESCARREGAR cedo: preloads do index.html
//     + os url() de fonte/fundo referenciados pelo CSS do bundle — é o CONJUNTO REFERENCIADO
//     (o browser só descarrega os pesos que realmente usa: medido no gate real, 4 ficheiros de
//     fonte → 1; aqui, o conjunto todo, 15 → 3). Os dois números são verdadeiros sobre conjuntos
//     diferentes e NÃO se substituem — ver o relatório do MC99.5.3.
//   - separadamente: quantos FICHEIROS DE FONTE DISTINTOS são pedidos (é a métrica que não depende
//     de cache: no ANTES o gate usa os pesos 400/700/800/900 e cada um era um ficheiro diferente)
// Alterna os braços (A,B,A,B,…) e reporta a diferença PAREADA — duas medições separadas não são
// uma comparação.
//
// O que ele NÃO mede: FCP/LCP/INP (exige browser; foram medidos à parte e estão no relatório).
// Ser honesto sobre isto faz parte do método.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join, resolve } from "node:path";

const DIR_A = resolve(process.argv[2] || "");
const DIR_B = resolve(process.argv[3] || "");
const N = Number(process.argv[4] || 5);
for (const [nome, d] of [["A", DIR_A], ["B", DIR_B]]) {
  if (!existsSync(join(d, "index.html"))) { console.error("ABORTA: " + nome + " sem index.html em " + d); process.exit(2); }
}

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".webp": "image/webp", ".png": "image/png", ".webm": "video/webm", ".json": "application/json", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
async function servir(dir) {
  const srv = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
    if (p === "" || extname(p) === "") p = "index.html";
    const alvo = join(dir, p);
    if (!existsSync(alvo) || statSync(alvo).isDirectory()) { res.writeHead(404); res.end("404"); return; }
    const b = readFileSync(alvo);
    res.writeHead(200, { "Content-Type": MIME[extname(alvo).toLowerCase()] || "application/octet-stream", "Content-Length": b.length });
    res.end(b);
  });
  await new Promise((ok, err) => { srv.once("error", err); srv.listen(0, "127.0.0.1", ok); });
  return { base: "http://127.0.0.1:" + srv.address().port, fechar: () => new Promise((ok) => srv.close(ok)) };
}

/** Recursos que o browser é mandado buscar CEDO: preloads + url() de fonte/fundo no CSS. */
async function recursos(base, dir) {
  const html = readFileSync(join(dir, "index.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const preloads = [...html.matchAll(/<link\b[^>]*\brel="preload"[^>]*\bhref="([^"]+)"/g)].map((m) => m[1]);
  const cssHref = (html.match(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/) || [])[1] || null;
  let doCss = [];
  if (cssHref) {
    const css = await (await fetch(base + cssHref)).text();
    doCss = [...new Set([...css.matchAll(/url\((['"]?)(\/[^'")]+)\1\)/g)].map((m) => m[2]))]
      .filter((u) => u.startsWith("/fonts/") || u.includes("/assets/backgrounds/"));
  }
  const todos = [...new Set([...preloads, ...doCss])].filter((u) => u.startsWith("/") && !u.includes("/assets/guto/custom/"));
  const detalhe = [];
  let bytes = 0;
  for (const u of todos) {
    const r = await fetch(base + u);
    const b = r.ok ? Buffer.from(await r.arrayBuffer()) : Buffer.alloc(0);
    bytes += b.length;
    detalhe.push({ u, st: r.status, b: b.length });
  }
  const fontes = detalhe.filter((d) => d.u.startsWith("/fonts/"));
  const md5s = new Set(fontes.map((f) => createHash("md5").update(readFileSync(join(dir, f.u.slice(1)))).digest("hex")));
  return { bytes, nFicheiros: detalhe.length, nFontes: fontes.length, nFontesConteudoUnico: md5s.size, detalhe, fontes };
}

const A = await servir(DIR_A), B = await servir(DIR_B);
const resA = await recursos(A.base, DIR_A), resB = await recursos(B.base, DIR_B);
console.log("A (ANTES) : " + DIR_A);
console.log("B (DEPOIS): " + DIR_B);
console.log("\n--- inventário (medido, não estimado) ---");
const linha = (r) => `  bytes=${String(r.bytes).padStart(7)}  ficheiros=${String(r.nFicheiros).padStart(2)}  ficheiros-de-fonte=${r.nFontes}  conteúdos-de-fonte distintos=${r.nFontesConteudoUnico}`;
console.log("A" + linha(resA));
for (const f of resA.fontes) console.log("    " + f.u + " = " + f.b + " B");
console.log("B" + linha(resB));
for (const f of resB.fontes) console.log("    " + f.u + " = " + f.b + " B");

const pares = [];
for (let i = 0; i < N; i++) {
  const ordem = i % 2 === 0 ? ["A", "B"] : ["B", "A"];
  const vals = {};
  for (const k of ordem) vals[k] = (await recursos(k === "A" ? A.base : B.base, k === "A" ? DIR_A : DIR_B)).bytes;
  pares.push(vals.A - vals.B);
}
const ordenado = [...pares].sort((x, y) => x - y);
const med = (a) => (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2);
console.log("\n--- A/B PAREADO (" + N + " pares, braços alternados) ---");
console.log("  diferença A-B por par (B pelo menos): " + pares.join(", "));
console.log("  mediana=" + med(ordenado) + " B   min=" + Math.min(...pares) + "   max=" + Math.max(...pares));
console.log("\n--- diferença de CONTAGEM (independente de cache) ---");
console.log("  ficheiros de fonte pedidos: A=" + resA.nFontes + " (" + resA.nFontesConteudoUnico + " conteúdos distintos)  ->  B=" + resB.nFontes + " (" + resB.nFontesConteudoUnico + " conteúdos distintos)");
const esperado = resA.bytes - resB.bytes;
const constante = pares.every((p) => p === esperado);
console.log("  bytes: A=" + resA.bytes + "  B=" + resB.bytes + "  diferença=" + esperado + " B   (constante em todos os pares: " + constante + ")");
console.log("\n" + (esperado > 0 && constante ? "VEREDITO: B é mais leve E a diferença é determinística" : "VEREDITO: medir de novo — a diferença não é constante (instrumento instável)"));
await A.fechar(); await B.fechar();
process.exitCode = esperado > 0 && constante ? 0 : 1;

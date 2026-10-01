// UTAC105b SEG5b — o 1.º verificador só leu o chunk de entrada (crawl parcial, lição MC95.1) e deu FALHA falsa possível.
// Este segue TODOS os chunks por BFS a partir do index.html. Controlo positivo: uma string que sabemos estar no app
// ("/corporativo/cotas", rota antiga) tem de ser encontrada; uma inventada não.
const SITE = "https://silly-stardust-ca71bc.netlify.app";
const html = await (await fetch(SITE + "/")).text();
const fila = [...html.matchAll(/(\/assets\/[\w.-]+\.js)/g)].map((m) => m[1]);
const vistos = new Set(), textos = [];
while (fila.length) {
  const p = fila.shift(); if (vistos.has(p)) continue; vistos.add(p);
  const js = await (await fetch(SITE + p)).text(); textos.push([p, js]);
  for (const m of js.matchAll(/["'`(/]((?:\/)?assets\/[\w.-]+\.js)/g)) fila.push(m[1].startsWith("/") ? m[1] : "/" + m[1]);
  for (const m of js.matchAll(/["'`]\.\/([\w.-]+\.js)["'`]/g)) fila.push("/assets/" + m[1]);
}
const tem = (s) => textos.filter(([, js]) => js.includes(s)).map(([p]) => p);
const r = [
  ["chunks percorridos > 20", vistos.size > 20, vistos.size],
  ["CONTROLO +: rota antiga /corporativo/cotas encontrada", tem("/corporativo/cotas").length > 0],
  ["CONTROLO −: string inventada NÃO encontrada", tem("/corporativo/nao-existe-utac105b").length === 0],
  ["rota /corporativo/cupons no bundle servido", tem("/corporativo/cupons").length > 0, tem("/corporativo/cupons").join(",")],
  ["chunk da página CorporativoCupons servido", [...vistos].some((p) => /CorporativoCupons-[\w-]+\.js$/.test(p)), [...vistos].filter((p) => /CorporativoCupons/.test(p)).join(",")],
  ["texto da página no bundle («Meus cupons»)", tem("Meus cupons").length > 0],
];
for (const [n, c, d = ""] of r) console.log(`${c ? "OK " : "FALHA"} | ${n} | ${d}`);
const f = r.filter((x) => !x[1]).length;
console.log(f ? `VEREDITO: VERMELHO (${f})` : `VEREDITO: VERDE (${r.length}/${r.length})`);
process.exit(f ? 1 : 0);

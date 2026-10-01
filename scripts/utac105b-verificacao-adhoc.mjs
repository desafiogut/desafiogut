// UTAC105b SEG5 — verificação ad-hoc (corre UMA vez). Produção HTTP por content-type (não por status — MC93-F) + ficheiros.
// Controlo positivo: (1) função inventada tem de dar HTML; (2) o verificador tem de DETECTAR uma entrada adulterada.
import fs from "node:fs";
const SITE = "https://silly-stardust-ca71bc.netlify.app";
const r = []; const ok = (n, c, d = "") => r.push([c ? "OK " : "FALHA", n, d]);
const json = async (u, o) => { const x = await fetch(u, o); return { s: x.status, ct: x.headers.get("content-type") || "", b: await x.text() }; };

const g = await json(`${SITE}/.netlify/functions/cupons?cliente_id=0x${"a".repeat(40)}`);
ok("produção cupons.mjs viva (JSON) e exige token", g.ct.includes("application/json") && g.s === 401, `${g.s} ${g.ct}`);
const c = await json(`${SITE}/.netlify/functions/comprar-passe`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
ok("produção comprar-passe viva (JSON)", c.ct.includes("application/json"), `${c.s}`);
const inv = await json(`${SITE}/.netlify/functions/nao-existe-utac105b-${Date.now()}`);
ok("CONTROLO: função inventada dá HTML", inv.ct.includes("text/html"), `${inv.s}`);

// Bundle: a rota /corporativo/cupons e o chunk da página estão no build servido.
const html = await (await fetch(SITE + "/")).text();
const entradas = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
let achouRota = false, achouChunk = false;
for (const e of entradas) {
  const js = await (await fetch(SITE + e)).text();
  if (js.includes("/corporativo/cupons")) achouRota = true;
  if (/CorporativoCupons-[\w-]+\.js/.test(js)) achouChunk = true;
}
ok("bundle servido tem a rota /corporativo/cupons", achouRota, entradas.join(","));
ok("bundle servido referencia o chunk CorporativoCupons", achouChunk);

const F = "desafio-gut/frontend/";
ok("CorporativoCupons.jsx existe", fs.existsSync(F + "src/pages/CorporativoCupons.jsx"));
const cupom = fs.readFileSync(F + "netlify/functions/_lib/cupom.mjs", "utf8");
ok("valores da plataforma = [5, 10, 20] e validade 30", /VALORES_CUPOM = Object\.freeze\(\[5, 10, 20\]\)/.test(cupom) && /VALIDADE_CUPOM_DIAS = 30;/.test(cupom));
const cp = fs.readFileSync(F + "netlify/functions/comprar-passe.mjs", "utf8");
ok("comprar-passe grava cuponsIds no INSERT", /criarPasse\(\{ endereco, edicaoId, produtoId, cuponsIds \}\)/.test(cp));

// Controlo positivo do VERIFICADOR: a mesma regra aplicada a uma cópia adulterada tem de FALHAR.
const adulterado = cupom.replace("[5, 10, 20]", "[5, 10, 15, 20]");
ok("CONTROLO: verificador detecta valores adulterados", !/VALORES_CUPOM = Object\.freeze\(\[5, 10, 20\]\)/.test(adulterado));

for (const l of r) console.log(l.join(" | "));
const f = r.filter((l) => l[0] !== "OK ").length;
console.log(f ? `VEREDITO: VERMELHO (${f})` : `VEREDITO: VERDE (${r.length}/${r.length})`);
process.exit(f ? 1 : 0);

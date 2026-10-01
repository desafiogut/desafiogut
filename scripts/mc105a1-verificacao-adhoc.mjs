// MC105a.1 SEG5 — verificação ad-hoc (corre UMA vez). Ficheiros + produção HTTP (content-type, não só status — MC93-F).
import fs from "node:fs";
const B = "https://silly-stardust-ca71bc.netlify.app/.netlify/functions/";
const r = []; const ok = (n, c, d = "") => r.push([c ? "OK " : "FALHA", n, d]);
const M = "desafio-gut/frontend/supabase/migrations/";
const lf = (p) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
ok("migração MC105a em supabase/migrations = _logs", lf(M + "20260930_mc105a_passes.sql") === lf("_logs/MC105a_MIGRACAO.sql"));
ok("migração saneamento = _logs", lf(M + "20260930_mc105a_passes_saneamento.sql") === lf("_logs/MC105a.1_MIGRACAO_PERMISSOES.sql"));
ok("migração unique = _logs", lf(M + "20260930_mc105a_passes_saneamento_unique.sql") === lf("_logs/MC105a.1_MIGRACAO_UNIQUE.sql"));
const exp = lf("desafio-gut/frontend/netlify/functions/exportar-dados.mjs");
ok("exportação inclui passes", /\["passes", "endereco"\]/.test(exp));
const del = lf("desafio-gut/frontend/netlify/functions/_lib/conta-delete.mjs");
ok("exclusão anonimiza passes com chaveAnonima", /\.update\(\{ endereco: chaveAnonima\(endereco\) \}\)/.test(del) && /anonimizarPasses\(supabase, ender, dryRun\)/.test(del));
ok("exclusão nunca apaga passes", !/from\("passes"\)\s*\.delete/.test(del));
for (const [f, metodo] of [["exportar-dados", "POST"], ["delete-account", "POST"], ["comprar-passe", "POST"]]) {
  const res = await fetch(B + f, { method: metodo, headers: { "content-type": "application/json" }, body: "{}" });
  const ct = res.headers.get("content-type") || "";
  ok(`produção ${f} viva (JSON)`, ct.includes("application/json"), `${res.status} ${ct}`);
}
// Controlo positivo do instrumento: uma função inventada tem de dar HTML (SPA fallback), senão a sonda é cega.
const inv = await fetch(B + "nao-existe-mc105a1-" + Date.now(), { method: "POST", body: "{}" });
ok("CONTROLO: função inventada dá HTML", (inv.headers.get("content-type") || "").includes("text/html"), `${inv.status}`);
for (const l of r) console.log(l.join(" | "));
const f = r.filter((l) => l[0] !== "OK ").length;
console.log(f ? `VEREDITO: VERMELHO (${f})` : `VEREDITO: VERDE (${r.length}/${r.length})`);
process.exit(f ? 1 : 0);

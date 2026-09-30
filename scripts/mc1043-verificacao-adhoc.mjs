// MC104.3 — SEG6 verificação ad-hoc (corre UMA vez). Uso: DEPLOY_JSON="$(netlify api listSiteDeploys …)" node scripts/mc1043-verificacao-adhoc.mjs
// Backend: corre o A/B (_tests/mc1043-ab.script.mjs, @netlify/blobs = duplo com ETag) sobre o conta-delete do repo
//   (confirmado = HEAD) e sobre 2 CONTROLOS POSITIVOS que TÊM de falhar: a base 7648192 e uma cópia adulterada (NF-e apagada).
// Frontend: o chunk da página /excluir-conta SERVIDO em produção tem o texto novo; o do deploy anterior (controlo) não.
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FN = join(RAIZ, "desafio-gut/frontend/netlify/functions");
const REL = "desafio-gut/frontend/netlify/functions/_lib/conta-delete.mjs";
const git = (...a) => execFileSync("git", ["-C", RAIZ, ...a], { encoding: "utf8" });
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const linhas = [];
const ok = (nome, v, ev = "") => { linhas.push([nome, !!v]); console.log(`  ${v ? "OK   " : "FALHA"} ${nome}${ev ? " — " + ev : ""}`); return !!v; };

// ── Backend ──────────────────────────────────────────────────────────────────
const repo = readFileSync(join(RAIZ, REL), "utf8");
const head = git("show", `HEAD:${REL}`);
const norm = (s) => s.replace(/\r\n/g, "\n");
const TMP = mkdtempSync(join(tmpdir(), "mc1043-"));
const base = join(TMP, "base.mjs"); writeFileSync(base, git("show", `7648192:${REL}`));
const adulterado = join(FN, "_lib", "_mc1043-adulterado.tmp.mjs");
const alvo = 'if ("comprador" in obj) obj.comprador = ENDERECO_ANONIMO;';
if (!repo.includes(alvo)) throw new Error("alvo da adulteração ausente");
writeFileSync(adulterado, repo.replace(alvo, alvo + " obj.nfe = null;"));
let ab;
try {
  const r = spawnSync(process.execPath, ["--experimental-test-module-mocks", "_tests/mc1043-ab.script.mjs", base, "_lib/conta-delete.mjs", adulterado],
    { cwd: FN, encoding: "utf8" });
  ab = r.stdout.trim().split(/\r?\n/).filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
} finally { unlinkSync(adulterado); }
if (ab.length !== 3) throw new Error(`A/B devolveu ${ab.length} braços`);
const passa = (o) => !o.A_indice_antigo_existe && o.A_indice_anon === '{"ids":[]}' && !o.B_notif_chave_endereco
  && o.B_notif_chave_anon_msg_igual && !o.B_bids_endereco_na_chave && !o.B_legado_endereco_titular
  && o.D_evento_concorrente_preservado && o.D_pedido_anonimizado && o.fiscal_nfe_txhash_rastreio && o.terceiros_intactos;
const [aBase, aNovo, aAdult] = ab;
console.log("backend (conta-delete do repo):");
ok("ficheiro do repo = HEAD", norm(repo) === norm(head));
ok("índice → anon:<sha256> = {ids:[]}, antigo fora", !aNovo.A_indice_antigo_existe && aNovo.A_indice_anon === '{"ids":[]}');
ok("notificações do titular em anon: (conteúdo igual)", !aNovo.B_notif_chave_endereco && aNovo.B_notif_chave_anon_msg_igual);
ok("lances do titular anonimizados (bids + legado)", !aNovo.B_bids_endereco_na_chave && !aNovo.B_legado_endereco_titular && aNovo.B_bid_anon?.nome === "***");
ok("NF-e, txHash e rastreio preservados", aNovo.fiscal_nfe_txhash_rastreio);
ok("CAS: escrita concorrente preservada", aNovo.D_evento_concorrente_preservado);
ok("terceiros intactos", aNovo.terceiros_intactos);
ok("usa atualizarPedido (código sem comentários)", /atualizarPedido\(produtoId,/.test(semComentarios(repo)));
ok("pedidos.mjs exporta atualizarPedido", /^export async function atualizarPedido\(/m.test(readFileSync(join(FN, "_lib/pedidos.mjs"), "utf8")));
console.log("controlos positivos (TÊM de falhar):");
ok("base 7648192 detectada", !passa(aBase), "índice/notificações/lances/evento concorrente");
ok("cópia adulterada (NF-e apagada) detectada", !passa(aAdult) && !aAdult.fiscal_nfe_txhash_rastreio);

// ── Frontend servido ─────────────────────────────────────────────────────────
const deploy = JSON.parse(process.env.DEPLOY_JSON || "[{}]")[0];
const HEADSHA = git("rev-parse", "HEAD").trim();
async function chunkExcluir(origem) {
  const html = await (await fetch(origem + "/")).text();
  const entradas = [...html.matchAll(/\/assets\/[\w.-]+\.js/g)].map((m) => m[0]);
  const vistos = new Set(), fila = [...entradas];
  while (fila.length && vistos.size < 250) {
    const u = fila.shift(); if (vistos.has(u)) continue; vistos.add(u);
    const js = await (await fetch(origem + u)).text();
    if (/Retido para cumprimento legal|Retido por imposição legal/.test(js) && /O QUE ACONTECE AO EXCLUIR/.test(js)) return { u, js, n: vistos.size };
    for (const m of js.matchAll(/(?:\.\/|\/assets\/)([\w.-]+\.js)/g)) fila.push("/assets/" + m[1]);
  }
  return { u: null, js: "", n: vistos.size };
}
const temNovo = (js) => js.includes("NF-e (número, série e chave de acesso)") && js.includes("identificador pseudônimo")
  && js.includes("auditoria on-chain") && !/identificador anônimo/.test(js) && !/consentimento/i.test(js.match(/Retido para cumprimento legal[\s\S]{0,1500}/)?.[0] ?? "");
console.log("produção:");
ok("deploy ready", deploy.state === "ready", deploy.id);
ok(`deploy commit_ref = HEAD (${HEADSHA.slice(0, 7)})`, deploy.commit_ref === HEADSHA);
const prod = await chunkExcluir("https://silly-stardust-ca71bc.netlify.app");
ok("página /excluir-conta servida com o texto novo", prod.u && temNovo(prod.js), `${prod.u} (${prod.n} chunks)`);
const antigo = await chunkExcluir("https://6abcf4126981df00098da634--silly-stardust-ca71bc.netlify.app");
ok("CONTROLO: deploy anterior (MC104.2) NÃO tem o texto novo", antigo.u && !temNovo(antigo.js), `${antigo.u} (${antigo.n} chunks)`);

const falhas = linhas.filter(([, v]) => !v).length;
console.log(`VEREDITO SEG6: ${falhas === 0 ? "VERDE" : `VERMELHO (${falhas})`} · ${linhas.length} verificações`);
process.exitCode = falhas === 0 ? 0 : 1;

// A/B PAREADO (skill §8d) + controlo de CAPACIDADE.
// ANTIGA = f0749a0 (o commit imediatamente anterior; guard md5 != NOVA) ; NOVA = worktree (3fb6d1e).
// CAPACIDADE = 933de6d (6.ª geração, o `v4 = results.filter(...)` que ignorava o AAAA) contra um
// isco local que escuta SÓ em ::1 -> se der 200, o rig produz SSRF VIVO quando a guarda não defende.
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, unlinkSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..");
const DIR_FN = resolve(RAIZ, "desafio-gut", "frontend", "netlify", "functions");
const GUARD = resolve(DIR_FN, "img-proxy.mjs");
const REL = "desafio-gut/frontend/netlify/functions/img-proxy.mjs";
if (!existsSync(GUARD)) { console.error("ABORTA: guard ausente"); process.exit(2); }
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");

const TEMPS = [];
const extrair = (commit) => {
  const t = resolve(DIR_FN, "_val9953-" + commit + "-" + process.pid + ".mjs");
  try { writeFileSync(t, execFileSync("git", ["-C", RAIZ, "show", commit + ":" + REL], { encoding: "utf8" }), "utf8"); }
  catch (e) { console.error("ABORTA: git show " + commit + ": " + e.message); process.exit(2); }
  TEMPS.push(t); return t;
};
const limpar = () => { for (const t of TEMPS) { try { unlinkSync(t); } catch { } } };
process.on("exit", limpar);

const NOVA = await import(pathToFileURL(GUARD).href);
const ANTIGA = await import(pathToFileURL(extrair("f0749a0")).href);
const SEXTA = await import(pathToFileURL(extrair("933de6d")).href);
console.log("NOVA   (3fb6d1e) md5=" + md5(GUARD));
console.log("ANTIGA (f0749a0) carregada | SEXTA (933de6d, controlo de capacidade) carregada\n");

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5e0000000049454e44ae426082", "hex");
let iscoHits = 0;
const isco = createServer((_q, r) => { iscoHits++; r.writeHead(200, { "Content-Type": "image/png" }); r.end(PNG); });
await new Promise((ok, err) => { isco.once("error", err); isco.listen(0, "::1", ok); });
const P = isco.address().port;
console.log("isco escutando SÓ em [::1]:" + P + "\n");

const BASE = "http://localhost/.netlify/functions/img-proxy";
const TO = (p, ms) => Promise.race([p, new Promise((ok) => setTimeout(() => ok({ __t: true }), ms))]);
const chamar = async (h, alvo, ms = 9500) => {
  const p = (async () => {
    try {
      const r = await h(new Request(BASE + "?url=" + encodeURIComponent(alvo)));
      let c = ""; try { c = String(await r.text()).slice(0, 40); } catch { }
      return { st: r.status, c };
    } catch (e) { return { st: "ERRO", c: String(e.message).slice(0, 40) }; }
  })();
  const r = await TO(p, ms);
  return r && r.__t ? { st: "TO", c: "" } : r;
};
const marca = (st) => st === 403 ? "403 bloquou" : st === 502 ? "502 PASSOU" : st === 200 ? "200 VIVO" : String(st);

const CASOS = [
  ["-- LIMITES das 6 faixas (o alvo da correcção) --", null],
  ["192.0.0.0", "http://192.0.0.0/x.png"], ["192.0.0.255", "http://192.0.0.255/x.png"],
  ["192.88.99.0", "http://192.88.99.0/x.png"], ["192.88.99.255", "http://192.88.99.255/x.png"],
  ["192.0.2.0", "http://192.0.2.0/x.png"], ["192.0.2.255", "http://192.0.2.255/x.png"],
  ["198.18.0.0", "http://198.18.0.0/x.png"], ["198.19.255.255", "http://198.19.255.255/x.png"],
  ["198.51.100.0", "http://198.51.100.0/x.png"], ["198.51.100.255", "http://198.51.100.255/x.png"],
  ["203.0.113.0", "http://203.0.113.0/x.png"], ["203.0.113.255", "http://203.0.113.255/x.png"],
  ["-- faixa NOVA via DNS (A vindo do DNS, nao literal) --", null],
  ["192-0-2-1.sslip.io", "http://192-0-2-1.sslip.io/x.png"],
  ["198-18-0-1.sslip.io", "http://198-18-0-1.sslip.io/x.png"],
  ["-- LACUNAS do registo IANA (fora do alvo) --", null],
  ["192.31.196.1", "http://192.31.196.1/x.png"], ["192.175.48.1", "http://192.175.48.1/x.png"],
  ["192.52.193.1", "http://192.52.193.1/x.png"],
  ["-- controlo positivo --", null],
  ["cdn.jsdelivr.net", "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/svgs/brands/github.svg"],
  ["exemplo.com (upstream 404)", "https://exemplo.com/a.jpg"],
];

console.log("CASO".padEnd(34) + "ANTIGA(f0749a0)   NOVA(3fb6d1e)     marcas");
console.log("-".repeat(96));
const resumo = { mudou: [], igual: 0 };
for (const [nome, alvo] of CASOS) {
  if (!alvo) { console.log("\n" + nome); continue; }
  const v = await chamar(ANTIGA.default, alvo);
  const n = await chamar(NOVA.default, alvo);
  const mudou = v.st !== n.st;
  if (mudou) resumo.mudou.push(nome + ": " + v.st + " -> " + n.st); else resumo.igual++;
  console.log(nome.padEnd(34) + marca(v.st).padEnd(18) + marca(n.st).padEnd(18) + (mudou ? "<-- MUDOU" : ""));
}

// ─────────── CONTROLO DE CAPACIDADE (rig produz 200 SSRF VIVO?) ───────────
console.log("\n═══ CONTROLO DE CAPACIDADE: isco em [::1] + nome A-publico/AAAA-::1 ═══");
const alvoIsco = "http://1-1-1-1.--1.sslip.io:" + P + "/x.png";
const antes = iscoHits;
const r6 = await chamar(SEXTA.default, alvoIsco, 12000);
const r7 = await chamar(NOVA.default, alvoIsco, 12000);
console.log("  SEXTA (933de6d) st=" + r6.st + " iscoHits+=" + (iscoHits - antes) + "   <- 200 = o rig PRODUZ SSRF VIVO");
const antes2 = iscoHits;
const r7b = await chamar(NOVA.default, alvoIsco, 12000);
console.log("  NOVA  (3fb6d1e) st=" + r7b.st + " iscoHits+=" + (iscoHits - antes2) + "   <- 403 = bloqueou");
const capOk = r6.st === 200;
console.log("  CAPACIDADE " + (capOk ? "PROVADA (o rig detecta 200 vivo)" : "NAO PROVADA — 'nao encontrei' nao vale"));

console.log("\n═══ RESUMO A/B ═══");
console.log("  casos com resultado IDENTICO: " + resumo.igual);
console.log("  casos que MUDARAM: " + resumo.mudou.length);
for (const m of resumo.mudou) console.log("    ~ " + m);
console.log("  isco alcancado por payloads de nome-prefixado: " + iscoHits + " (esperado 1: so o controlo de capacidade)");
isco.close();
limpar();
process.exitCode = 0;

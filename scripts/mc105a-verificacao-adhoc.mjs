// MC105a — SEG5 verificação ad-hoc (corre UMA vez). Uso: DEPLOY_JSON="$(netlify api listSiteDeploys …)" node scripts/mc105a-verificacao-adhoc.mjs
// Produção (sem escrever nada — P12/R5): deploy do HEAD; `comprar-passe` e `comprar-senhas` vivos e a recusar sem sessão
//   (JSON das próprias funções; controlo: função inventada dá text/plain); preflight.
// Local: os testes do MC105a verdes e, CONTROLO POSITIVO, uma cópia adulterada do endpoint (sem idempotência) apanhada.
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FN = join(RAIZ, "desafio-gut/frontend/netlify/functions");
const EP = join(FN, "comprar-passe.mjs");
const SITE = "https://silly-stardust-ca71bc.netlify.app/.netlify/functions";
const git = (...a) => execFileSync("git", ["-C", RAIZ, ...a], { encoding: "utf8" }).trim();
const res = [];
const ok = (nome, v, ev = "") => { res.push(!!v); console.log(`  ${v ? "OK   " : "FALHA"} ${nome}${ev ? " — " + ev : ""}`); };
const testes = () => {
  const r = spawnSync(process.execPath, ["--experimental-test-module-mocks", "--test", "--test-reporter=tap",
    "_tests/mc105a-passe.test.mjs", "_tests/mc105a-e2e.test.mjs"], { cwd: FN, encoding: "utf8", timeout: 300000 });
  const n = (k) => Number((r.stdout.match(new RegExp(`^# ${k} (\\d+)`, "m")) || [])[1]);
  return { tests: n("tests"), fail: n("fail") };
};

console.log("produção:");
const deploy = JSON.parse(process.env.DEPLOY_JSON || "[{}]")[0];
const HEAD = git("rev-parse", "HEAD");
ok("deploy ready", deploy.state === "ready", deploy.id);
ok(`commit_ref = HEAD (${HEAD.slice(0, 7)})`, deploy.commit_ref === HEAD);
async function sonda(fn, init) {
  const r = await fetch(`${SITE}/${fn}`, init);
  return { status: r.status, ct: r.headers.get("content-type") || "", corpo: await r.text() };
}
const cp = await sonda("comprar-passe", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
ok("comprar-passe vivo: 401 JSON token_ausente sem sessão", cp.status === 401 && cp.ct.includes("application/json") && /token_ausente/.test(cp.corpo), `${cp.status} ${cp.ct}`);
const pf = await sonda("comprar-passe", { method: "OPTIONS", headers: { origin: "https://silly-stardust-ca71bc.netlify.app", "access-control-request-method": "POST" } });
ok("comprar-passe preflight 2xx", pf.status >= 200 && pf.status < 300, String(pf.status));
const gt = await sonda("comprar-passe", { method: "GET" });
ok("comprar-passe GET → 405 JSON", gt.status === 405 && gt.ct.includes("application/json"), String(gt.status));
const cs = await sonda("comprar-senhas", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
ok("comprar-senhas continua vivo: 401 JSON sem token", cs.status === 401 && cs.ct.includes("application/json") && /token_ausente/.test(cs.corpo), `${cs.status}`);
const ctl = await sonda("nao-existe-mc105a", { method: "POST", body: "{}" });
ok("CONTROLO: função inventada NÃO é JSON", !ctl.ct.includes("application/json"), `${ctl.status} ${ctl.ct}`);

console.log("local:");
const t = testes();
ok("testes MC105a verdes", t.tests > 0 && t.fail === 0, `${t.tests} testes, ${t.fail} falhas`);
const orig = readFileSync(EP);
const alvo = "if (existente) return jsonResponse({ ok: true, idempotent: true, passe: existente }, 200);";
if (!orig.toString("utf8").includes(alvo)) throw new Error("alvo da adulteração ausente");
try {
  writeFileSync(EP, orig.toString("utf8").replace(alvo, ""));
  const a = testes();
  ok("CONTROLO: endpoint adulterado (sem idempotência) é apanhado", a.fail > 0, `${a.fail} falha(s)`);
} finally {
  writeFileSync(EP, orig);
  ok("restauração md5 idêntica", createHash("md5").update(readFileSync(EP)).digest("hex") === createHash("md5").update(orig).digest("hex"));
}
const falhas = res.filter((v) => !v).length;
console.log(`VEREDITO SEG5: ${falhas === 0 ? "VERDE" : `VERMELHO (${falhas})`} · ${res.length} verificações`);
process.exitCode = falhas ? 1 : 0;

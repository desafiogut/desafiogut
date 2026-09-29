// MC102.0 — SEG5: verificação ad-hoc (correr UMA vez). `--controlo` adultera 3 entradas e EXIGE que
// o verificador as apanhe (controlo positivo: um verificador cego dá verde a tudo).
//   node scripts/mc1020-verificacao-adhoc.mjs && node scripts/mc1020-verificacao-adhoc.mjs --controlo
import { readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FN = join(RAIZ, "desafio-gut", "frontend", "netlify", "functions");
const CONTROLO = process.argv.includes("--controlo");
const URL_PROD = "https://silly-stardust-ca71bc.netlify.app/.netlify/functions";
let falhas = 0;
const conferir = (nome, ok, info = "") => { console.log(`${ok ? "OK   " : "FALHA"} ${nome}${info ? " — " + info : ""}`); if (!ok) falhas++; };
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// 1. Versão instalada = alvo (node_modules E lock).
const alvo = CONTROLO ? "10.0.1" : "10.0.0";
const inst = JSON.parse(readFileSync(join(FN, "node_modules", "@netlify", "blobs", "package.json"), "utf8")).version;
const lock = JSON.parse(readFileSync(join(FN, "package-lock.json"), "utf8")).packages["node_modules/@netlify/blobs"].version;
conferir("@netlify/blobs instalado = alvo", inst === alvo, `instalado ${inst}, alvo ${alvo}`);
conferir("@netlify/blobs no lock = alvo", lock === alvo, `lock ${lock}`);

// 2. gravar() tem CAS pelo set() (nunca setJSON) e confirma pelo etag.
let lib = semComentarios(readFileSync(join(FN, "_lib", "pedidos.mjs"), "utf8"));
if (CONTROLO) lib = lib.replace("await s.set(chavePedido(pedido.produtoId), JSON.stringify(pedido)", "await s.setJSON(chavePedido(pedido.produtoId), pedido");
const corpoGravar = (lib.match(/async function gravar\([\s\S]*?\n}\n/) || [""])[0];
conferir("gravar() escreve com set(…, { onlyIfMatch: etag })", /\bs\.set\(chavePedido\(pedido\.produtoId\), JSON\.stringify\(pedido\), \{ onlyIfMatch: etag \}\)/.test(corpoGravar));
conferir("gravar() não usa setJSON", !/setJSON/.test(corpoGravar));
conferir("gravar() confirma pelo etag da resposta", /if \(!w\.etag\)/.test(corpoGravar));
conferir("retry limitado a 3", /MAX_TENTATIVAS_CAS = 3;/.test(lib));

// 3. Teste de concorrência + cliente real.
const t = spawnSync(process.execPath, ["--test", "--test-reporter=tap", "--experimental-test-module-mocks", "_tests/mc1020-cas.test.mjs"],
  { cwd: FN, encoding: "utf8" });
const n = (k) => Number((t.stdout.match(new RegExp(`^# ${k} (\\d+)`, "m")) || [])[1]);
conferir("mc1020-cas verde", n("pass") > 0 && n("fail") === 0, `pass ${n("pass")} fail ${n("fail")}`);
const cr = spawnSync(process.execPath, [join(RAIZ, "scripts", "mc1020-cliente-real.mjs")], { encoding: "utf8" });
conferir("cliente real VERDE", cr.status === 0 && /VEREDITO: VERDE/.test(cr.stdout));

// 4. Suíte (harness de 3 estados).
const h = spawnSync(process.execPath, [join(RAIZ, "scripts", "mc966-suite-harness.mjs"), "ambos"], { cwd: RAIZ, encoding: "utf8" });
conferir("suíte VERDE (harness)", /VEREDITO: VERDE/.test(h.stdout), (h.stdout.match(/^(frontend|backend):.*$/gm) || []).join(" · "));

// 5. Escopo: só ficheiros autorizados desde a linha de base.
const PERMITIDOS = [/^desafio-gut\/frontend\/netlify\/functions\/_lib\/pedidos\.mjs$/, /^desafio-gut\/frontend\/netlify\/functions\/pedidos\.mjs$/,
  /^desafio-gut\/frontend\/netlify\/functions\/package(-lock)?\.json$/, /^desafio-gut\/frontend\/netlify\/functions\/_tests\/[^/]+\.test\.mjs$/,
  /^scripts\/mc1020-[^/]+\.mjs$/, /^_logs\/MC102\.0_[^/]+\.md$/, /^CLAUDE\.md$/];
const nomes = execFileSync("git", ["diff", "--name-only", "d27ae33..HEAD"], { cwd: RAIZ, encoding: "utf8" }).trim().split("\n");
if (CONTROLO) nomes.push("desafio-gut/frontend/netlify/functions/_lib/saldoRs.mjs");
const fora = nomes.filter((f) => !PERMITIDOS.some((re) => re.test(f)));
conferir("nada fora do escopo", fora.length === 0, fora.length ? fora.join(", ") : `${nomes.length} ficheiros`);
const hand = execFileSync("git", ["diff", "d27ae33..HEAD", "--", "desafio-gut/frontend/netlify/functions/pedidos.mjs"], { cwd: RAIZ, encoding: "utf8" });
const linhas = hand.split("\n").filter((l) => /^[+-][^+-]/.test(l));
conferir("pedidos.mjs: só +1 linha (mapa 409/503)", linhas.length === 1 && /conflito_escrita: 409, etag_indisponivel: 503/.test(linhas[0]));

// 6. Produção: a função responde JSON (não o index.html do rewrite), com controlo de endpoint inventado.
const ct = async (u) => { const r = await fetch(u); return `${r.status} ${r.headers.get("content-type") || ""}`; };
const pedidos = await ct(`${URL_PROD}/pedidos`);
const inventado = await ct(`${URL_PROD}/mc1020-nao-existe-${Date.now()}`);
conferir("produção /pedidos = 401 JSON", /^401 application\/json/.test(pedidos), pedidos);
conferir("controlo: endpoint inventado NÃO é JSON", !/application\/json/.test(inventado), inventado);

console.log(`${CONTROLO ? "[CONTROLO] " : ""}falhas: ${falhas}`);
process.exitCode = CONTROLO ? (falhas >= 3 ? 0 : 1) : (falhas === 0 ? 0 : 1);
if (CONTROLO) console.log(falhas >= 3 ? "CONTROLO: o verificador VÊ as adulterações" : "CONTROLO FALHOU: verificador cego");

// utac110m2-verificar.mjs — UTAC110m.2. Verificador PERMANENTE (independente da suíte).
//
// Porque existe: a prova deste UTAC não pode depender de um script temporário que se apaga. Este
// ficheiro corre em segundos, não precisa de RAM (A14), e morde nos três acoplamentos que fizeram a
// frente A parar: o bloco do gate tem de ser TRECHO LITERAL do artigo (citacoesRegulamento), a âncora
// do GUTO tem de ser EXCERTO VERBATIM (mc963), e os três ficheiros da invariante têm de concordar byte
// a byte. Corre também os testes que dependem do Regulamento, para não se ficar por asserções de texto.
//
// Uso:  node scripts/utac110m2-verificar.mjs        (exit 0 = tudo OK; 1 = falha; 2 = não mediu)
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut", "frontend");
const L = (rel) => readFileSync(join(RAIZ, rel), "utf8").replace(/\r\n/g, "\n");

const V5 = L("docs/REGULAMENTO-v5.md");
const GUTO = L("docs/GUTO-REGULAMENTO.md");
const MJS = L("desafio-gut/frontend/netlify/functions/_lib/guto-regulamento.mjs");
const PERFIS = L("desafio-gut/frontend/netlify/functions/_lib/guto-perfis.mjs");
const GATE = L("desafio-gut/frontend/src/components/TermosConsentimento.jsx");
const CONSENT = L("desafio-gut/frontend/netlify/functions/_lib/consentimento.mjs");

const artigo = (n) => (V5.match(new RegExp(`^Art\\. ${n}º[^\\n]*`, "m")) ?? [])[0] ?? "";
const campo = (fonte, re, rotulo) => {
  const v = (fonte.match(re) ?? [])[1];
  if (!v) { console.error(`exit 2: não encontrei ${rotulo}`); process.exit(2); }
  return v;
};

let falhas = 0;
const ok = (cond, nome, extra = "") => {
  console.log(`${cond ? "OK  " : "FALHA"} ${nome}${extra ? ` -> ${extra}` : ""}`);
  if (!cond) falhas += 1;
};

// ── FRENTE A: o cartão é resgatado, não adquirido nem pago por PIX ────────────────────────────────
ok(/poderá resgatar gratuitamente 1 \(um\) cartão/.test(artigo(9)), "Art. 9º: resgate gratuito");
ok(!/adquirir 1 \(um\) cartão/.test(artigo(9)), "Art. 9º: sem «adquirir»");
ok(/não é adquirido por PIX: é resgatado gratuitamente/.test(artigo(53)), "Art. 53º: remete ao 9º");
ok(!/cartão colecionável, produto patrocinado/.test(artigo(53)), "Art. 53º: cartão fora do PIX");
ok(/produto patrocinado do Relâmpago\) poderá ser realizada via PIX/.test(artigo(53)), "Art. 53º: produto patrocinado por PIX (pin do parser)");

// ── FRENTE B/C/D: as outras três correcções ───────────────────────────────────────────────────────
ok(/mantém integralmente os pontos de fidelidade/.test(artigo(21)), "Art. 21º: sem perda de métricas");
ok(!/perde o acesso às métricas/.test(V5), "nenhum artigo promete «perda de métricas»");
ok(/não sendo aceite como forma de pagamento dentro do aplicativo DesafioGUT\. Pode ser utilizado para:/.test(artigo(48)),
  "Art. 48º: restrição no CAPUT (não dentro da alínea)");
ok(/dpo@grupouniaoetrabalho\.com\.br/.test(artigo(57)) && /dpo@grupouniaoetrabalho\.com\.br/.test(artigo(69)), "Arts. 57º/69º: DPO");
ok(!/exclusivamente através do e-mail desafiogut01/.test(artigo(69)), "Art. 69º: sem «exclusivamente»");

// ── os três acoplamentos que fizeram a frente A parar ────────────────────────────────────────────
const bloco = campo(GATE, /artLabel\}>Art\. 9º<\/strong> — ([\s\S]*?)<\/p>/, "o bloco do Art. 9º no gate")
  .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().replace(/\.$/, "");
ok(artigo(9).includes(bloco), "gate: bloco é TRECHO LITERAL do Art. 9º", `${bloco.length} chars`);
ok(/resgatar gratuitamente/.test(bloco), "gate: diz o mesmo que o artigo");
const ancora = campo(PERFIS, /"9":\s+"([^"]+)"/, "a âncora do Art. 9º no GUTO").replace(/\.$/, "");
ok(artigo(9).includes(ancora), "GUTO: âncora é EXCERTO VERBATIM");
ok(/resgatar gratuitamente/.test(ancora), "GUTO: responde o mesmo que o artigo");

// ── invariante byte-a-byte nos três sítios ───────────────────────────────────────────────────────
const corpoV5 = V5.slice(V5.indexOf("\n---\n\n") + 6);
const corpoGUTO = GUTO.slice(GUTO.indexOf("\nREGULAMENTO OFICIAL DO DESAFIOGUT\n") + 1);
ok(corpoV5 === corpoGUTO, "invariante corpo(v5) == corpo(GUTO)", `${corpoV5.length} bytes`);
ok(MJS.includes(artigo(9)) && MJS.includes(artigo(53)) && MJS.includes(artigo(21)), "runtime do GUTO tem os artigos novos");

// ── gate de consentimento em 3.3 dos dois lados (Art. 39º: aviso prévio) ─────────────────────────
const vGate = campo(CONSENT, /VERSAO_GATE = "([^"]+)"/, "VERSAO_GATE");
const vFront = campo(GATE, /VERSAO_CONSENTIMENTO = "([^"]+)"/, "VERSAO_CONSENTIMENTO");
ok(vGate === vFront, "gate: paridade frontend/backend", `${vFront} / ${vGate}`);
ok(vGate === "3.3", "gate: 3.3 (o re-aceite que o Art. 39º exige)", vGate);

// ── execução real dos testes que dependem do Regulamento ─────────────────────────────────────────
const contar = (saida, k) => Number((saida.match(new RegExp(`^\\u2139 ${k} (\\d+)$`, "m")) ?? [])[1] ?? -1);
const correr = (cwd, args) => {
  const r = spawnSync(process.execPath, args, { cwd, encoding: "utf8", timeout: 300000, maxBuffer: 32 * 1024 * 1024 });
  const saida = `${r.stdout || ""}${r.stderr || ""}`;
  return { ok: r.status === 0 && contar(saida, "fail") === 0, pass: contar(saida, "pass"), fail: contar(saida, "fail") };
};

const fe = correr(FE, ["--test", "--test-concurrency=1",
  "src/components/__tests__/utac110m2-regulamento.test.mjs",
  "src/components/__tests__/citacoesRegulamento.test.mjs",
  "src/components/__tests__/artigosUI.test.mjs",
  "src/pages/__tests__/utac106h-regras.test.mjs",
  "src/components/__tests__/dadosPagamento.test.mjs",
  "src/components/__tests__/utac110k1-conformidade-pre-aab.test.mjs",
  "src/__tests__/utac110h1-gate-render.test.mjs",
  "src/__tests__/utac110h1-vocabulario.test.mjs",
  "src/__tests__/utac110h2-pendencias.test.mjs"]);
ok(fe.ok, "9 ficheiros que dependem do Regulamento/gate", `pass=${fe.pass} fail=${fe.fail}`);

const be = correr(join(FE, "netlify", "functions"), ["--test", "_tests/mc963-guto-regulamento-v4.test.mjs"]);
ok(be.ok, "mc963: âncoras verbatim do GUTO", `pass=${be.pass} fail=${be.fail}`);

console.log(`\n${falhas ? `${falhas} FALHA(S)` : "TUDO OK"} — verificador do UTAC110m.2 (não substitui a suíte: scripts/utac110i2-suite.sh)`);
process.exit(falhas ? 1 : 0);

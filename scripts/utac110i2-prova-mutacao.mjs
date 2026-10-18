// utac110i2-prova-mutacao.mjs — UTAC110i.2 · SEG3: prova de mutação das FRENTES A, B e C.
//
// Método herdado do `mc110i1d-prova-mutacao.mjs`: baseline primeiro (sem verde o instrumento ABORTA,
// exit 2), cada mutante confirmado a ENTRAR (md5), RED exigido, restauro byte-a-byte confirmado (T5).
//
// ⚠️ Diferença em relação ao 110i1d: aqui há **TRÊS** ficheiros-alvo. O restauro é feito **por
// mutante** (não do ficheiro único do script antigo) e há uma cópia de segurança FORA do repo
// (`os.tmpdir()`) escrita ANTES do primeiro mutante — se este processo morrer a meio, o ficheiro
// fica mutado e a cópia permite repor. No fim verifica-se o md5 dos três.
//
// Exit: 0 = prova completa · 1 = mutante sobreviveu · 2 = o instrumento não mediu.
//
// Uso: node scripts/utac110i2-prova-mutacao.mjs
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import { tmpdir } from "node:os";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut", "frontend");

const DETETOR = join(FE, "src", "hooks", "useRecursosApp.js");
const HOOK = join(FE, "src", "hooks", "useComprarPasse.js");
const BILLING = join(FE, "src", "lib", "google-play-billing.js");

// Os testes do UTAC + as redes de segurança: o arnês partilhado (MC104.1) e as invariantes do PIX
// que o UTAC106e fixou.
const ALVO = ["--test", "--test-concurrency=1",
  "src/hooks/__tests__/utac110i2-plataforma-billing.test.mjs",
  "src/__tests__/utac110i1-front-billing.test.mjs",
  "src/hooks/useRecursosApp.test.mjs",
  "src/pages/__tests__/utac106e-compra-passe.test.mjs"];

const MUTANTES = [
  // ── FRENTE A: o detetor ────────────────────────────────────────────────────────────────────────
  ["A1  o detetor volta a não reconhecer o Capacitor (o APK é «pwa» outra vez)", DETETOR,
    "    if (Capacitor?.isNativePlatform?.() === true) {\n      const nativaCapacitor = Capacitor.getPlatform?.();\n      if (nativaCapacitor === \"android\" || nativaCapacitor === \"ios\") return nativaCapacitor;\n    }\n",
    ""],
  ["A2  o detetor aceita a STRING da plataforma sem a ponte nativa (falsificável na web)", DETETOR,
    "    if (Capacitor?.isNativePlatform?.() === true) {",
    "    if (Capacitor?.getPlatform?.()) {"],
  ["A3  o detetor deixa de honrar o marcador antigo GUT_NATIVE (regressão de builds)", DETETOR,
    "    if (nativa === \"ios\" || nativa === \"android\") return nativa;",
    "    if (false) return nativa;"],
  ["A4  o detetor só reconhece Android (o wrapper iOS passa a «pwa»)", DETETOR,
    "      if (nativaCapacitor === \"android\" || nativaCapacitor === \"ios\") return nativaCapacitor;",
    "      if (nativaCapacitor === \"android\") return nativaCapacitor;"],
  // ── FRENTE C: o PIX dentro do APK ─────────────────────────────────────────────────────────────
  ["C1  o bloco da frente C desaparece (o APK volta a poder comprar por PIX)", HOOK,
    "      if (androidNativo()) {\n        setErro(MSG_PIX_NO_APK);\n        return { ok: false, code: \"pix_indisponivel_no_apk\", message: MSG_PIX_NO_APK };\n      }\n",
    ""],
  ["C2  `androidNativo()` passa a «qualquer nativo» (o iOS perderia o PIX que hoje funciona)", BILLING,
    "    return Capacitor?.isNativePlatform?.() === true && Capacitor?.getPlatform?.() === \"android\";",
    "    return Capacitor?.isNativePlatform?.() === true;"],
  ["C3  `androidNativo()` passa a ser sempre true (o PWA perderia o PIX)", BILLING,
    "    return Capacitor?.isNativePlatform?.() === true && Capacitor?.getPlatform?.() === \"android\";",
    "    return true;"],
  // ⚠️ C4 nasceu do veredicto do validador adversarial: era o M7 dele, e SOBREVIVIA à bateria
  // original (pass=58 fail=0) porque nenhum teste lia o ESTADO `erro` do hook — só o objecto
  // devolvido. Fechado pelo teste «(C/estado)» em `utac110i1-front-billing.test.mjs`.
  ["C4  o bloqueio deixa de pôr o erro no ESTADO (o balão fica mudo)", HOOK,
    "      if (androidNativo()) {\n        setErro(MSG_PIX_NO_APK);\n        return { ok: false, code: \"pix_indisponivel_no_apk\", message: MSG_PIX_NO_APK };\n      }\n",
    "      if (androidNativo()) {\n        return { ok: false, code: \"pix_indisponivel_no_apk\", message: MSG_PIX_NO_APK };\n      }\n"],
];

const md5 = (b) => createHash("md5").update(b).digest("hex");

function correr(timeout = 180000) {
  const r = spawnSync(process.execPath, ALVO, { cwd: FE, encoding: "utf8", timeout, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const n = (k) => {
    const m = out.match(new RegExp(`^\\u2139 ${k} (\\d+)$`, "m"));
    return m ? Number(m[1]) : null;
  };
  const nomes = out.split("\n").filter((l) => /^\u2716 /.test(l)).map((l) => l.trim());
  return { out, exit: r.status, sinal: r.signal, tests: n("tests"), pass: n("pass"), fail: n("fail"), nomes,
    red: /^\u2716 /m.test(out) || (n("fail") ?? 0) > 0 || (r.status ?? 0) !== 0 };
}

// ── Guardas de instrumento (GATE 2): se o alvo não for o esperado, ABORTA em vez de medir lixo ──
const originais = new Map();
for (const [rotulo, ficheiro] of [["detetor", DETETOR], ["hook", HOOK], ["billing", BILLING]]) {
  const bytes = readFileSync(ficheiro);
  originais.set(ficheiro, bytes);
  const bak = join(tmpdir(), `utac110i2-${rotulo}-${basename(ficheiro)}.bak`);
  copyFileSync(ficheiro, bak);
  console.log(`backup FORA do repo: ${bak}`);
}
const md5Orig = new Map([...originais].map(([f, b]) => [f, md5(b)]));
if (!readFileSync(DETETOR, "utf8").includes("Capacitor.getPlatform")) {
  console.error("ABORTA (exit 2): o detetor não tem a correcção da frente A."); process.exit(2);
}
if (!readFileSync(HOOK, "utf8").includes("pix_indisponivel_no_apk")) {
  console.error("ABORTA (exit 2): o hook não tem o bloqueio da frente C."); process.exit(2);
}

console.log(`\nmd5 inicial: detetor=${md5Orig.get(DETETOR)} hook=${md5Orig.get(HOOK)} billing=${md5Orig.get(BILLING)}\n`);
const base = correr();
if (base.red || base.fail !== 0 || !(base.tests > 0)) {
  console.error(`ABORTA (exit 2): baseline não está verde -> ${base.pass}/${base.tests}, fail ${base.fail}, exit ${base.exit}, sinal ${base.sinal}`);
  console.error(base.out.split("\n").slice(-25).join("\n"));
  process.exit(2);
}
console.log(`controlo (sem mutação): VERDE ${base.pass}/${base.tests}\n`);

let mortos = 0;
/** As âncoras estão escritas com \n; os ficheiros do repo estão em CRLF. Sem esta conversão a
 *  âncora não casa e o instrumento aborta (medido na 1.ª corrida: 0 ocorrências em A1). */
const comFimDeLinha = (texto, amostra) => (amostra.includes("\r\n") ? texto.replace(/\r?\n/g, "\r\n") : texto);

for (const [nome, ficheiro, deBruto, paraBruto] of MUTANTES) {
  let antes = readFileSync(ficheiro, "utf8");
  const original = originais.get(ficheiro).toString("utf8");
  const de = comFimDeLinha(deBruto, antes);
  const para = comFimDeLinha(paraBruto, antes);
  const ocorrencias = antes.split(de).length - 1;
  if (ocorrencias !== 1) {
    console.error(`ABORTA (exit 2): ${nome} -> ${ocorrencias} ocorrências do alvo (exige 1)`);
    for (const [f, b] of originais) writeFileSync(f, b);
    process.exit(2);
  }
  writeFileSync(ficheiro, antes.replace(de, para));
  const entrou = md5(readFileSync(ficheiro)) !== md5Orig.get(ficheiro);
  const r = correr();
  writeFileSync(ficheiro, originais.get(ficheiro));
  const restaurado = md5(readFileSync(ficheiro)) === md5Orig.get(ficheiro);
  const pendurou = r.sinal === "SIGTERM" || r.tests === null;
  const veredicto = !entrou ? "NAO_ENTROU" : pendurou ? "RED (pendurou)" : r.red ? "RED" : "SOBREVIVEU";
  if (veredicto.startsWith("RED")) mortos += 1;
  console.log(`${veredicto.padEnd(14)} | entrou: ${entrou ? "sim" : "NAO"} | restaurado: ${restaurado ? "sim" : "NAO"} | fail=${r.fail} | ${nome}`);
  for (const n of r.nomes.slice(0, 4)) console.log(`                 ↳ ${n}`);
  if (!restaurado) { console.error("ABORTA (exit 2): restauro não bateu byte a byte."); process.exit(2); }
}

console.log(`\nmutantes RED: ${mortos}/${MUTANTES.length}`);
let tudoIgual = true;
for (const [f, b] of originais) {
  const fim = md5(readFileSync(f));
  const igual = fim === md5Orig.get(f);
  if (!igual) tudoIgual = false;
  console.log(`md5 final ${basename(f)}: ${fim} ${igual ? "(== inicial)" : "(DIVERGENTE!)"}`);
}
process.exit(mortos === MUTANTES.length && tudoIgual ? 0 : 1);

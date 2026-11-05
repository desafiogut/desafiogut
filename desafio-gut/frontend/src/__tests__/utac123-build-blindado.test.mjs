// UTAC123 — build blindado (DEBT-081/082) + título da Carteira (R18).
//
// 1. src/utils/web3.js não tem fallback de RPC escrito no código (a chave Alchemy de Sepolia saiu)
//    e getProvider() falha alto quando VITE_ALCHEMY_URL não existe.
// 2. scripts/validar-dist-rede.mjs recusa bundles sem RPC / sem Supabase (o buraco do UTAC122) e
//    continua a aceitar um bundle de produção completo (CONTROLO POSITIVO — sem ele, um guarda que
//    rejeitasse tudo passaria nestes testes).
// 3. android/app/build.gradle liga o guarda a todo o build release (preReleaseBuild) e versionCode 7.
// 4. O nome «Carteira» ficou maior do que o tituloStyle base das secções.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FRONT = resolve(SRC, "..");
const ler = (p) => readFileSync(resolve(FRONT, p), "utf8");

/** Código sem comentários (mesmo padrão do utac106c-carteira.test.mjs). */
function codigo(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1"))
    .filter((l) => !/^\s*\*/.test(l))
    .join("\n");
}

// ── 1. web3.js ───────────────────────────────────────────────────────────────────
const WEB3 = codigo(ler("src/utils/web3.js"));

test("UTAC123 · controlo positivo do extractor: vê o getProvider do web3.js", () => {
  assert.match(WEB3, /export function getProvider\(\)/);
});

test("UTAC123/A · web3.js não tem nenhum URL Alchemy escrito no código (nem a chave vazada)", () => {
  assert.doesNotMatch(WEB3, /alchemy\.com\/v2\//, "há um URL Alchemy literal no web3.js");
  assert.doesNotMatch(WEB3, /eth-sepolia\.g\.alchemy/, "o fallback de Sepolia voltou");
});

test("UTAC123/A · ALCHEMY_RPC vem SÓ do env, sem `||` para um literal", () => {
  const m = WEB3.match(/const ALCHEMY_RPC\s*=\s*([^;]+);/);
  assert.ok(m, "não encontrei a declaração de ALCHEMY_RPC");
  assert.match(m[1], /import\.meta\.env\.VITE_ALCHEMY_URL/);
  assert.doesNotMatch(m[1], /\|\|\s*["'`]/, `ALCHEMY_RPC tem fallback literal: «${m[1]}»`);
  assert.doesNotMatch(m[1], /\?\?\s*["'`]https?:/, `ALCHEMY_RPC tem fallback de URL: «${m[1]}»`);
});

test("UTAC123/A · getProvider() lança erro claro ANTES de criar o provider quando não há RPC", () => {
  const i = WEB3.indexOf("export function getProvider()");
  const corpo = WEB3.slice(i, WEB3.indexOf("return _provider;", i));
  const iGuarda = corpo.search(/if \(!ALCHEMY_RPC\)\s*\{\s*throw new Error\(/);
  const iNew = corpo.indexOf("new JsonRpcProvider(");
  assert.ok(iGuarda > -1, "getProvider() já não falha alto sem VITE_ALCHEMY_URL");
  assert.ok(iNew > iGuarda, "a guarda tem de vir ANTES do new JsonRpcProvider");
  assert.match(corpo, /VITE_ALCHEMY_URL ausente/, "a mensagem do erro deixou de nomear a variável");
});

// ── 2. guarda do bundle ──────────────────────────────────────────────────────────
const PROD = {
  VITE_CONTRATO_SEPOLIA: "0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd",
  VITE_ALCHEMY_URL: "https://eth-mainnet.g.alchemy.com/v2/TESTE",
  VITE_CHAIN_ID: "1",
  VITE_NETWORK_STAGE: "mainnet",
  VITE_SUPABASE_URL: "https://exemplo.supabase.co",
  VITE_SUPABASE_ANON_KEY: "anon-teste",
};

/** Corre o guarda sobre um dist sintético com o objecto env embutido como o Vite o escreve. */
function correrGuarda(env) {
  const dir = mkdtempSync(join(tmpdir(), "utac123-dist-"));
  try {
    mkdirSync(join(dir, "assets"));
    const campos = Object.entries(env).map(([k, v]) => `${k}:\`${v}\``).join(",");
    writeFileSync(join(dir, "assets", "web3-x.js"), `var Dd={BASE_URL:\`/\`,MODE:\`production\`,${campos}};`);
    const r = spawnSync(process.execPath, [resolve(FRONT, "scripts/validar-dist-rede.mjs"), dir], {
      encoding: "utf8",
      env: { ...process.env, GUT_PERMITIR_TESTNET: "" },
    });
    return { code: r.status, out: `${r.stdout}\n${r.stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const sem = (k) => Object.fromEntries(Object.entries(PROD).filter(([c]) => c !== k));

test("UTAC123/B · CONTROLO POSITIVO: bundle de produção completo é ACEITE (exit 0)", () => {
  const r = correrGuarda(PROD);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /coerente com PRODU/);
});

for (const [nome, env, padrao] of [
  ["sem RPC (o buraco do UTAC122)", sem("VITE_ALCHEMY_URL"), /VITE_ALCHEMY_URL ausente/],
  ["sem VITE_SUPABASE_URL", sem("VITE_SUPABASE_URL"), /VITE_SUPABASE_URL\/VITE_SUPABASE_ANON_KEY ausente/],
  ["sem VITE_SUPABASE_ANON_KEY", sem("VITE_SUPABASE_ANON_KEY"), /VITE_SUPABASE_URL\/VITE_SUPABASE_ANON_KEY ausente/],
  ["sem VITE_CHAIN_ID (bundle do AAB v6)", sem("VITE_CHAIN_ID"), /VITE_CHAIN_ID ausente/],
  ["sem contrato", sem("VITE_CONTRATO_SEPOLIA"), /VITE_CONTRATO_SEPOLIA ausente/],
  ["chainId Sepolia", { ...PROD, VITE_CHAIN_ID: "11155111" }, /esperado "1"/],
  ["contrato abandonado", { ...PROD, VITE_CONTRATO_SEPOLIA: "0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5" }, /ABANDONADO/],
]) {
  test(`UTAC123/B · guarda REJEITA bundle ${nome}`, () => {
    const r = correrGuarda(env);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, padrao);
  });
}

test("UTAC123/B · o guarda nunca imprime a chave anon do Supabase", () => {
  const r = correrGuarda(PROD);
  assert.doesNotMatch(r.out, /anon-teste/);
});

// ── 3. Gradle ────────────────────────────────────────────────────────────────────
const GRADLE = ler("android/app/build.gradle");

// UTAC129 subiu para 8 (AAB v8) sem actualizar este teste: só o backend foi re-corrido depois do bump.
// Achado e corrigido no UTAC130. O número tem de acompanhar o AAB entregue.
test("UTAC123/B · versionCode 8 (era 7; AAB v8 — UTAC129/UTAC130)", () => {
  assert.match(GRADLE, /^\s*versionCode 8\s*$/m);
});

test("UTAC123/B · tarefa validarAmbienteProducao corre o guarda sobre os assets do AAB", () => {
  const m = GRADLE.match(/tasks\.register\("validarAmbienteProducao", Exec\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(m, "a tarefa validarAmbienteProducao não está registada como Exec");
  assert.match(m[1], /commandLine\s+"node",\s*"scripts\/validar-dist-rede\.mjs",\s*file\("src\/main\/assets\/public"\)/);
  assert.match(m[1], /upToDateWhen\s*\{\s*false\s*\}/, "a tarefa pode ser saltada como up-to-date");
});

test("UTAC123/B · todo o build release depende da trava (preReleaseBuild → validarAmbienteProducao)", () => {
  assert.match(GRADLE, /t\.name == "preReleaseBuild"\)\s*\{\s*t\.dependsOn validarAmbienteProducao/);
});

// ── 4. título da Carteira ────────────────────────────────────────────────────────
test("UTAC123 (R18) · o nome «Carteira» é maior do que o tituloStyle base", () => {
  const cart = codigo(ler("src/pages/MinhaCarteira.jsx"));
  const base = cart.match(/const tituloStyle = \{[\s\S]*?fontSize: isMobile \? "([\d.]+)rem" : "([\d.]+)rem"/);
  const h3 = cart.match(/<h3 style=\{\{([^}]*)\}\}>Carteira<\/h3>/);
  assert.ok(base && h3, "não encontrei o tituloStyle ou o <h3> da Carteira");
  const f = h3[1].match(/fontSize: isMobile \? "([\d.]+)rem" : "([\d.]+)rem"/);
  assert.ok(f, `o <h3> da Carteira não define fontSize próprio: «${h3[1]}»`);
  assert.ok(Number(f[1]) > Number(base[1]) && Number(f[2]) > Number(base[2]),
    `«Carteira» (${f[1]}/${f[2]}rem) não ficou maior que a base (${base[1]}/${base[2]}rem)`);
  assert.match(h3[1], /color:\s*COR\.gold/, "o título perdeu o amarelo do UTAC106c");
});

// ── 5. ícone adaptativo (R18) ────────────────────────────────────────────────────
for (const nome of ["ic_launcher", "ic_launcher_round"]) {
  test(`UTAC123 (R18) · ${nome} é ADAPTATIVO e usa a arte em ecrã cheio`, () => {
    const xml = ler(`android/app/src/main/res/mipmap-anydpi-v26/${nome}.xml`);
    assert.match(xml, /<adaptive-icon/);
    assert.match(xml, /<background android:drawable="@color\/ic_launcher_background"/);
    assert.match(xml, /android:drawable="@mipmap\/ic_launcher_foreground"/,
      "o foreground tem de ser a ARTE (@mipmap), não o robô por omissão do Capacitor (@drawable)");
  });
}

test("UTAC123 (R18) · o fundo do ícone nunca é branco", () => {
  const cor = ler("android/app/src/main/res/values/ic_launcher_background.xml")
    .match(/name="ic_launcher_background">(#[0-9A-Fa-f]{6})</);
  assert.ok(cor, "a cor ic_launcher_background desapareceu");
  assert.notEqual(cor[1].toUpperCase(), "#FFFFFF", "o fundo voltou a branco");
});

test("UTAC123 (R18) · os PNG do ícone têm o tamanho certo em cada densidade (48 dp legado · 108 dp adaptativo)", () => {
  const dim = (rel) => { const b = readFileSync(resolve(FRONT, rel)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  for (const [d, k] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
    const base = `android/app/src/main/res/mipmap-${d}/`;
    assert.deepEqual(dim(base + "ic_launcher.png"), [48 * k, 48 * k], `${d}/ic_launcher.png`);
    assert.deepEqual(dim(base + "ic_launcher_round.png"), [48 * k, 48 * k], `${d}/ic_launcher_round.png`);
    assert.deepEqual(dim(base + "ic_launcher_foreground.png"), [108 * k, 108 * k], `${d}/ic_launcher_foreground.png`);
  }
});

// ── 6. chave de RPC Sepolia embutida (achado do SEG3: veio pela var morta VITE_RPC_URL_SEPOLIA) ──
test("UTAC123/B · guarda REJEITA bundle com chave de RPC Sepolia embutida (mesmo com o resto de produção)", () => {
  const r = correrGuarda({ ...PROD, VITE_RPC_URL_SEPOLIA: "https://eth-sepolia.g.alchemy.com/v2/AbCdEfGhIjKlMnOpQrSt" });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /chave de RPC Sepolia/);
  assert.doesNotMatch(r.out, /AbCdEfGhIjKlMnOpQrSt/, "o guarda imprimiu a chave");
});

test("UTAC123/B · URL de Sepolia SEM chave (definições do viem/Privy) não é falso positivo", () => {
  const r = correrGuarda({ ...PROD, VIEM_X: "https://eth-sepolia.g.alchemy.com/v2" });
  assert.equal(r.code, 0, r.out);
});

// ── 7. fail-fast não pode derrubar a app (achado ⚠️2 do validador SEG4) ─────────────
for (const fn of ["subscribeLanceDado", "subscribeSaldoSenhas"]) {
  test(`UTAC123 · ${fn} degrada (unsubscribe vazio) em vez de lançar quando não há RPC`, () => {
    const i = WEB3.indexOf(`export function ${fn}(`);
    assert.ok(i > -1, `${fn} desapareceu`);
    const corpo = WEB3.slice(i, WEB3.indexOf("\n}\n", i));
    assert.doesNotMatch(corpo, /=\s*getContratoLeitura\(\)/, `${fn} chama getContratoLeitura() sem protecção`);
    assert.match(corpo, /contratoLeituraOuNull\(/);
    assert.match(corpo, /if \(!contrato\) return \(\) => \{\};/);
  });
}

test("UTAC123 · contratoLeituraOuNull apanha o erro do getProvider (try/catch → null)", () => {
  const i = WEB3.indexOf("function contratoLeituraOuNull(");
  const corpo = WEB3.slice(i, WEB3.indexOf("\n}\n", i));
  assert.match(corpo, /try\s*\{\s*return getContratoLeitura\(\);\s*\}\s*catch/);
  const bloco = corpo.slice(corpo.indexOf("catch"));
  assert.match(bloco, /return null;/, "o catch não devolve null");
  assert.doesNotMatch(bloco, /\bthrow\b/, "o catch relança o erro — a app volta a cair no ecrã de erro");
});

// UTAC132 — PIX/Saldo R$ cortados do APK em TEMPO DE BUILD + sem splash nativo.
//
// 1. O guarda `validar-dist-rede.mjs` (corre no `build:apk` e no `preReleaseBuild` do Gradle) recusa um
//    bundle sem `VITE_IS_ANDROID_APP=true` e um bundle que ainda contenha «Depositar PIX»/«Saldo Disponível».
// 2. A flag só existe no `build:apk` (variável de processo) — NUNCA num `.env*`, que o build do site também lê
//    (R18-132-1: o PWA mantém o PIX).
// 3. Carteira e balão do Passe cortam o PIX pela flag; o modal de depósito só é montado com `depositoPix`.
// 4. Splash nativo removido (R18-132-2), incluindo o ícone do sistema no Android 12+.
//
// A prova de que o minificador apaga de facto as strings está no artefacto (SEG2/SEG3: `vite build` com e sem a
// flag, e o `.aab` extraído). Aqui fixa-se o contrato que a torna possível e o guarda que a exige.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const FRONT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ler = (p) => readFileSync(resolve(FRONT, p), "utf8");

// ── 1. guarda ────────────────────────────────────────────────────────────────────────────────────
const PROD = {
  VITE_CONTRATO_SEPOLIA: "0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd",
  VITE_ALCHEMY_URL: "https://eth-mainnet.g.alchemy.com/v2/TESTE",
  VITE_CHAIN_ID: "1",
  VITE_NETWORK_STAGE: "mainnet",
  VITE_SUPABASE_URL: "https://exemplo.supabase.co",
  VITE_SUPABASE_ANON_KEY: "anon-teste",
  VITE_IS_ANDROID_APP: "true",
};

function correrGuarda(env, extra = "") {
  const dir = mkdtempSync(join(tmpdir(), "utac132-dist-"));
  try {
    mkdirSync(join(dir, "assets"));
    const campos = Object.entries(env).map(([k, v]) => `${k}:\`${v}\``).join(",");
    writeFileSync(join(dir, "assets", "web3-x.js"), `var Dd={BASE_URL:\`/\`,MODE:\`production\`,${campos}};`);
    if (extra) writeFileSync(join(dir, "assets", "MinhaCarteira-x.js"), extra);
    const r = spawnSync(process.execPath, [resolve(FRONT, "scripts/validar-dist-rede.mjs"), dir], {
      encoding: "utf8",
      env: { ...process.env, GUT_PERMITIR_TESTNET: "" },
    });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const sem = (k) => Object.fromEntries(Object.entries(PROD).filter(([c]) => c !== k));

test("UTAC132 · guarda ACEITA o bundle do APK com a flag e sem strings de PIX/Saldo (controlo positivo)", () => {
  const r = correrGuarda(PROD, 'var x="💰 Comprar Passe Desafio";');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /strings PIX\/Saldo no APK : nenhuma/);
});

test("UTAC132 · guarda RECUSA o bundle sem VITE_IS_ANDROID_APP (build sem o corte)", () => {
  const r = correrGuarda(sem("VITE_IS_ANDROID_APP"));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /VITE_IS_ANDROID_APP ausente/);
});

test("UTAC132 · guarda RECUSA VITE_IS_ANDROID_APP diferente de \"true\"", () => {
  const r = correrGuarda({ ...PROD, VITE_IS_ANDROID_APP: "false" });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /VITE_IS_ANDROID_APP ausente\/diferente/);
});

for (const s of [
  "Depositar PIX", "Saldo Disponível", "Saldo R$ insuficiente. Recarregue via PIX.",
  // UTAC132.2 (DEBT-088)
  "Não foi possível ler o saldo R$ agora.", "Saldo insuficiente. Carregar agora?", "Confirmação de depósito PIX",
]) {
  test(`UTAC132 · guarda RECUSA o bundle com «${s}» mesmo com a flag (prova o artefacto, não a intenção)`, () => {
    const r = correrGuarda(PROD, `var t="${s}";`);
    assert.equal(r.code, 1, r.out);
    assert.ok(r.out.includes(`«${s}»`) && /strings proibidas no APK:/.test(r.out), r.out);
  });
}

// ── 2. a flag só no build:apk ────────────────────────────────────────────────────────────────────
test("UTAC132 · build:apk injecta VITE_IS_ANDROID_APP=true ANTES do netlify build", () => {
  const pkg = JSON.parse(ler("package.json"));
  const s = pkg.scripts["build:apk"];
  const iFlag = s.indexOf("VITE_IS_ANDROID_APP=true");
  const iBuild = s.indexOf("netlify build --context production");
  assert.ok(iFlag >= 0, "build:apk sem a flag");
  assert.ok(iBuild > iFlag, "a flag tem de estar definida antes do netlify build");
  assert.match(s, /validar:dist/, "o guarda continua no build:apk");
});

test("UTAC132 · nenhum .env* do frontend define VITE_IS_ANDROID_APP (o site mantém o PIX)", () => {
  for (const f of [".env", ".env.local", ".env.production", ".env.production.local", ".env.example"]) {
    const p = resolve(FRONT, f);
    if (!existsSync(p)) continue;
    assert.doesNotMatch(readFileSync(p, "utf8"), /VITE_IS_ANDROID_APP/, `${f} define a flag: o build do site perderia o PIX`);
  }
});

// ── 3. corte no código ───────────────────────────────────────────────────────────────────────────
test("UTAC132 · Carteira: APK_BUILD vem da flag e corta depositoPix; o modal de depósito só monta com depositoPix", () => {
  const f = ler("src/pages/MinhaCarteira.jsx");
  assert.match(f, /const APK_BUILD = import\.meta\.env\.VITE_IS_ANDROID_APP === "true";/);
  assert.match(f, /const depositoPix = !APK_BUILD && pixPermitido\(plataformaNativa\);/);
  assert.match(f, /\{depositoPix && <ComprarFichasModal\b/);
  // O modal não pode voltar a ser montado sem condição (o seu «Depositar PIX» voltaria ao bundle do APK).
  assert.equal((f.match(/<ComprarFichasModal\b/g) || []).length, 1);
});

test("UTAC132 · balão do Passe: depositoPix também corta pela flag", () => {
  const f = ler("src/components/BalaoComprarPasse.jsx");
  assert.match(f, /const depositoPix = import\.meta\.env\.VITE_IS_ANDROID_APP !== "true" && pixPermitido\(detectarPlataformaNativa\(\)\);/);
});

test("UTAC132.1 · CardLance: a frase de recarga por PIX só existe fora do APK (corte pela flag)", () => {
  const f = ler("src/components/CardLance.jsx");
  assert.match(f, /const APK_BUILD = import\.meta\.env\.VITE_IS_ANDROID_APP === "true";/);
  assert.match(f, /saldo_insuficiente:\s*APK_BUILD \? "Saldo insuficiente para este lance\." : "Saldo R\$ insuficiente\. Recarregue via PIX\.",/);
  // A mensagem do APK não pode falar em R$ nem em PIX.
  assert.doesNotMatch("Saldo insuficiente para este lance.", /R\$|PIX/);
  assert.equal((f.match(/Recarregue via PIX/g) || []).length, 1, "a frase não pode aparecer fora do ramo do site");
});

test("UTAC132.2 · Carteira: erro de leitura do saldo R$ e toast «Carregar agora?» só com depositoPix", () => {
  const f = ler("src/pages/MinhaCarteira.jsx");
  assert.match(f, /\{depositoPix && saldoRsStatus === "error" && \(/);
  assert.match(f, /message: depositoPix \? "Saldo insuficiente\. Carregar agora\?" : "Saldo insuficiente\." \}/);
  assert.equal((f.match(/Não foi possível ler o saldo R\$ agora\./g) || []).length, 1);
  assert.equal((f.match(/"Saldo insuficiente\. Carregar agora\?"/g) || []).length, 1);
});

test("UTAC132.2 · Configurações: interruptor e chave de PIX cortados pela flag", () => {
  const c = ler("src/pages/Configuracoes.jsx");
  assert.match(c, /const APK_BUILD = import\.meta\.env\.VITE_IS_ANDROID_APP === "true";/);
  assert.match(c, /\.\.\.\(APK_BUILD \? \[\] : \[\{ label: t\("config\.notifPix"\)/);
  assert.equal((c.match(/config\.notifPix/g) || []).length, 1, "notifPix usado fora do corte");
  const pt = ler("src/i18n/pt.js");
  assert.match(pt, /\.\.\.\(import\.meta\.env\.VITE_IS_ANDROID_APP === "true" \? \{\} : \{ "config\.notifPix": "Confirmação de depósito PIX" \}\),/);
  assert.equal((pt.match(/Confirmação de depósito PIX/g) || []).length, 1, "a frase aparece fora do corte no pt.js");
});

// ── 4. splash ────────────────────────────────────────────────────────────────────────────────────
const RES = "android/app/src/main/res";
function estiloLaunch(xml) {
  const m = xml.match(/<style name="AppTheme\.NoActionBarLaunch"[^>]*>[\s\S]*?<\/style>/);
  assert.ok(m, "estilo AppTheme.NoActionBarLaunch não encontrado");
  return m[0];
}

test("UTAC132 · tema de arranque sem Theme.SplashScreen e sem @drawable/splash", () => {
  const s = estiloLaunch(ler(`${RES}/values/styles.xml`));
  assert.match(s, /parent="AppTheme\.NoActionBar"/);
  assert.doesNotMatch(s, /Theme\.SplashScreen/);
  assert.doesNotMatch(s, /@drawable\/splash/);
});

test("UTAC132 · Android 12+: ícone do splash do sistema transparente", () => {
  const s = estiloLaunch(ler(`${RES}/values-v31/styles.xml`));
  assert.match(s, /parent="AppTheme\.NoActionBar"/);
  assert.match(s, /<item name="android:windowSplashScreenAnimatedIcon">@android:color\/transparent<\/item>/);
  assert.match(s, /<item name="android:windowSplashScreenBackground">#050818<\/item>/);
});

test("UTAC132 · versionCode 11 (UTAC137/SEG3; era 10)", () => {
  assert.match(ler("android/app/build.gradle"), /^\s*versionCode 11\s*$/m);
});

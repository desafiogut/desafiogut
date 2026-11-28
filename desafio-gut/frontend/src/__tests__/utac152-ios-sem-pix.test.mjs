// UTAC152 — PIX, recarga e site externo fora do iOS (R18-152-B: runtime + build `VITE_IS_IOS_APP`).
//
// 1. Runtime: `pixPermitido("ios") === false` e `iosNativo()` lê a ponte nativa; Android e web iguais.
// 2. Build: `build:ios` injecta a flag antes do `netlify build` e corre o guarda `--ios`; nenhum `.env*` a define.
// 3. O guarda `validar-dist-rede.mjs --ios` aceita o bundle certo e recusa flag ausente, dist do APK e cada
//    frase proibida; SEM `--ios` o comportamento do APK não mudou.
// 4. Cada sítio do corte tem as DUAS camadas (fonte).
//
// A prova de que o minificador apaga as strings está no artefacto (`npm run build:ios` + guarda, SEG2).
// node --test src/__tests__/utac152-ios-sem-pix.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { pixPermitido, iosNativo, androidNativo, detectarPlataformaNativa } from "../lib/google-play-billing.js";

const FRONT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ler = (p) => readFileSync(resolve(FRONT, p), "utf8");

// ── 1. runtime ───────────────────────────────────────────────────────────────────────────────────
test("UTAC152 · pixPermitido: iOS e Android false; web true (o PWA mantém o PIX)", () => {
  assert.equal(pixPermitido("ios"), false);
  assert.equal(pixPermitido("android"), false);
  assert.equal(pixPermitido("web"), true);
});

function comWindow(w, fn) {
  const antes = globalThis.window;
  globalThis.window = w;
  try { return fn(); } finally { if (antes === undefined) delete globalThis.window; else globalThis.window = antes; }
}
const janela = (extra = {}) => ({ location: { protocol: "https:", hostname: "silly-stardust-ca71bc.netlify.app", port: "" }, ...extra });

test("UTAC152 · iosNativo(): true só com a ponte iOS; false no PWA e no APK Android", () => {
  const ios = janela({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" } });
  assert.equal(comWindow(ios, iosNativo), true);
  assert.equal(comWindow(ios, androidNativo), false, "o iOS não pode ser tratado como APK Android");
  assert.equal(comWindow(janela(), iosNativo), false, "o PWA não é iOS");
  const apk = janela({ location: { protocol: "https:", hostname: "localhost", port: "" } });
  assert.equal(comWindow(apk, iosNativo), false, "o APK não é iOS");
  assert.equal(comWindow(apk, androidNativo), true);
});

test("UTAC152 · iosNativo() é fail-closed: ponte que rebenta ⇒ false (nunca esconde o PIX por engano)", () => {
  const partida = janela({ Capacitor: { isNativePlatform: () => { throw new Error("x"); } } });
  assert.equal(comWindow(partida, iosNativo), false);
  assert.equal(detectarPlataformaNativa(janela()), "web");
});

// ── 2. build ─────────────────────────────────────────────────────────────────────────────────────
test("UTAC152 · build:ios injecta VITE_IS_IOS_APP=true ANTES do netlify build e corre o guarda --ios antes do cap sync", () => {
  const s = JSON.parse(ler("package.json")).scripts;
  const b = s["build:ios"];
  assert.ok(b, "falta o script build:ios");
  const iFlag = b.indexOf("VITE_IS_IOS_APP=true");
  const iBuild = b.indexOf("netlify build --context production");
  const iGuarda = b.indexOf("validar:dist:ios");
  const iSync = b.indexOf("npx cap sync ios");
  assert.ok(iFlag >= 0 && iBuild > iFlag, "a flag tem de vir antes do netlify build");
  assert.ok(iGuarda > iBuild && iSync > iGuarda, "o guarda tem de correr entre o build e o cap sync");
  assert.doesNotMatch(b, /VITE_IS_ANDROID_APP/, "o build do iOS não pode levar a flag do Android");
  assert.equal(s["validar:dist:ios"], "node scripts/validar-dist-rede.mjs --ios");
  assert.equal(s["validar:dist"], "node scripts/validar-dist-rede.mjs", "o guarda do APK não muda");
  assert.doesNotMatch(s["build:apk"], /VITE_IS_IOS_APP/, "o build do APK não pode levar a flag do iOS");
});

test("UTAC152 · nenhum .env* do frontend define VITE_IS_IOS_APP (o site mantém o PIX)", () => {
  for (const f of [".env", ".env.local", ".env.production", ".env.production.local", ".env.example"]) {
    const p = resolve(FRONT, f);
    if (!existsSync(p)) continue;
    assert.doesNotMatch(readFileSync(p, "utf8"), /VITE_IS_IOS_APP/, `${f} define a flag: o build do site perderia o PIX`);
  }
});

// ── 3. guarda ────────────────────────────────────────────────────────────────────────────────────
const BASE = {
  VITE_CONTRATO_SEPOLIA: "0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd",
  VITE_ALCHEMY_URL: "https://eth-mainnet.g.alchemy.com/v2/TESTE",
  VITE_CHAIN_ID: "1",
  VITE_NETWORK_STAGE: "mainnet",
  VITE_SUPABASE_URL: "https://exemplo.supabase.co",
  VITE_SUPABASE_ANON_KEY: "anon-teste",
};
const IOS = { ...BASE, VITE_IS_IOS_APP: "true" };

function correrGuarda(env, extra = "", args = ["--ios"]) {
  const dir = mkdtempSync(join(tmpdir(), "utac152-dist-"));
  try {
    mkdirSync(join(dir, "assets"));
    const campos = Object.entries(env).map(([k, v]) => `${k}:\`${v}\``).join(",");
    writeFileSync(join(dir, "assets", "web3-x.js"), `var Dd={BASE_URL:\`/\`,MODE:\`production\`,${campos}};`);
    if (extra) writeFileSync(join(dir, "assets", "Pagina-x.js"), extra);
    const r = spawnSync(process.execPath, [resolve(FRONT, "scripts/validar-dist-rede.mjs"), ...args, dir], {
      encoding: "utf8",
      env: { ...process.env, GUT_PERMITIR_TESTNET: "" },
    });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("UTAC152 · guarda --ios ACEITA o bundle do iOS com a flag e sem frases proibidas (controlo positivo)", () => {
  const r = correrGuarda(IOS, 'var x="Edições em breve no app";');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /strings PIX\/site no iOS  : nenhuma/);
});

test("UTAC152 · guarda --ios RECUSA o bundle sem VITE_IS_IOS_APP", () => {
  const r = correrGuarda(BASE);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /VITE_IS_IOS_APP ausente/);
});

test("UTAC152 · guarda --ios RECUSA o dist do APK (VITE_IS_ANDROID_APP=true)", () => {
  const r = correrGuarda({ ...IOS, VITE_IS_ANDROID_APP: "true" });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /dist do APK/);
});

for (const s of [
  "Depositar PIX", "Saldo Disponível", "Saldo R$ insuficiente. Recarregue via PIX.",
  "Não foi possível ler o saldo R$ agora.", "Saldo insuficiente. Carregar agora?", "Confirmação de depósito PIX",
  "Carregar PIX", "Pagar Produto via PIX", "PIX copia e cola", "Copiar código PIX", "Deposite via PIX",
  "Edições na versão Web", "Abrir versão Web", "no seu navegador",
]) {
  test(`UTAC152 · guarda --ios RECUSA o bundle com «${s}» mesmo com a flag`, () => {
    const r = correrGuarda(IOS, `var t="${s}";`);
    assert.equal(r.code, 1, r.out);
    assert.ok(r.out.includes(`«${s}»`) && /strings proibidas no iOS:/.test(r.out), r.out);
  });
}

test("UTAC152 · SEM --ios o guarda continua a ser o do APK (exige a flag do Android; o «versão Web» não conta)", () => {
  const semFlag = correrGuarda(IOS, "", []);
  assert.equal(semFlag.code, 1, semFlag.out);
  assert.match(semFlag.out, /VITE_IS_ANDROID_APP ausente/);
  const apk = correrGuarda({ ...BASE, VITE_IS_ANDROID_APP: "true" }, 'var t="Abrir versão Web";', []);
  assert.equal(apk.code, 0, apk.out);
});

// ── 4. as duas camadas em cada sítio (fonte) ─────────────────────────────────────────────────────
const FLAG = 'import.meta.env.VITE_IS_IOS_APP === "true"';
for (const [ficheiro, runtime] of [
  ["src/components/SemSaldoBanner.jsx", /if \(import\.meta\.env\.VITE_IS_IOS_APP === "true" \|\| iosNativo\(\)\) return null;/],
  ["src/pages/MercadoLances.jsx", /if \(import\.meta\.env\.VITE_IS_IOS_APP === "true" \|\| iosNativo\(\)\) return <MercadoConformidadeIOS/],
  ["src/components/meus-ativos/MeusPedidos.jsx", /if \(import\.meta\.env\.VITE_IS_IOS_APP === "true" \|\| iosNativo\(\)\) return <PagarProdutoIndisponivelIOS/],
  ["src/hooks/useComprarPasse.js", /if \(IOS_BUILD \|\| iosNativo\(\)\) \{/],
  ["src/components/CardLance.jsx", /\(APK_BUILD \|\| IOS_BUILD \|\| iosNativo\(\)\)/],
  ["src/pages/Configuracoes.jsx", /\(APK_BUILD \|\| IOS_BUILD \|\| iosNativo\(\)\)/],
]) {
  test(`UTAC152 · ${ficheiro}: corte de build (VITE_IS_IOS_APP) + runtime (iosNativo)`, () => {
    const f = ler(ficheiro);
    assert.ok(f.includes(FLAG), "falta a camada de build");
    assert.match(f, runtime, "falta a camada de runtime");
  });
}

test("UTAC152 · vista de conformidade e cartão do vencedor no iOS: sem PIX, sem site, sem link", () => {
  const m = ler("src/pages/MercadoLances.jsx");
  const ios = m.slice(m.indexOf("function MercadoConformidadeIOS"), m.indexOf("function MercadoConformidade("));
  assert.ok(ios.length > 100, "não encontrei MercadoConformidadeIOS");
  assert.doesNotMatch(ios, /<a\b|href=|PWA_|versão Web|navegador|PIX/i);
  const p = ler("src/components/meus-ativos/MeusPedidos.jsx");
  const card = p.slice(p.indexOf("function PagarProdutoIndisponivelIOS"), p.indexOf("function PagarProdutoPix"));
  assert.ok(card.length > 100, "não encontrei PagarProdutoIndisponivelIOS");
  assert.doesNotMatch(card, /PIX|usePagarProduto|href=/i);
});

test("UTAC152 · a mensagem do iOS no hook de compra não cita PIX nem o site; a do APK ficou sem cópia no build iOS", () => {
  const h = ler("src/hooks/useComprarPasse.js");
  const m = h.match(/const MSG_COMPRA_IOS = "([^"]+)";/);
  assert.ok(m, "falta MSG_COMPRA_IOS");
  assert.doesNotMatch(m[1], /pix|netlify|navegador|site|http/i);
  assert.match(h, /const MSG_PIX_NO_APK = IOS_BUILD \? "" :/);
});

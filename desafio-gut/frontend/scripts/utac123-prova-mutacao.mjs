#!/usr/bin/env node
// UTAC123 — prova de mutação dos testes de src/__tests__/utac123-build-blindado.test.mjs.
// Cada mutante repõe um defeito real; o teste tem de ficar VERMELHO. Restauro por cópia de
// segurança feita ANTES (fora do repo) e verificação de md5 — nunca `git checkout` (lição UTAC000.11).
import { readFileSync, writeFileSync, copyFileSync, mkdtempSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const FRONT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TESTE = "src/__tests__/utac123-build-blindado.test.mjs";
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");
const BAK = mkdtempSync(join(tmpdir(), "utac123-mut-"));

const MUTANTES = [
  ["M1 fallback Alchemy de volta", "src/utils/web3.js",
    'const ALCHEMY_RPC = String(import.meta.env.VITE_ALCHEMY_URL ?? "").trim();',
    'const ALCHEMY_RPC = import.meta.env.VITE_ALCHEMY_URL || "https://eth-sepolia.g.alchemy.com/v2/XXXXXXXXXXXX";'],
  ["M2 getProvider sem fail-fast", "src/utils/web3.js", "    if (!ALCHEMY_RPC) {", "    if (false) {"],
  ["M3 guarda aceita bundle sem RPC", "scripts/validar-dist-rede.mjs", "if (!rpc) {", "if (false) {"],
  ["M4 guarda aceita bundle sem Supabase", "scripts/validar-dist-rede.mjs",
    "if (!supabaseUrl || !supabaseAnon) {", "if (false) {"],
  ["M5 Gradle sem trava no release", "android/app/build.gradle",
    "        t.dependsOn validarAmbienteProducao", "        // t.dependsOn validarAmbienteProducao"],
  ["M6 versionCode 6", "android/app/build.gradle", "        versionCode 7", "        versionCode 6"],
  ["M7 título Carteira pequeno", "src/pages/MinhaCarteira.jsx",
    ', fontSize: isMobile ? "1.15rem" : "1.25rem" }}>Carteira</h3>', " }}>Carteira</h3>"],
  ["M8 fundo do ícone branco", "android/app/src/main/res/values/ic_launcher_background.xml", "#0C1A3D", "#FFFFFF"],
  ["M10 guarda ignora chave Sepolia embutida", "scripts/validar-dist-rede.mjs",
    "if (comChaveSepolia.length && !PERMITIR_TESTNET) {", "if (false) {"],
  ["M11 subscribeLanceDado sem protecção", "src/utils/web3.js",
    "const contrato = contratoLeituraOuNull(\"subscribeLanceDado\");", "const contrato = getContratoLeitura();"],
  ["M12 contratoLeituraOuNull relança", "src/utils/web3.js",
    "console.warn(`[web3] ${origem}: sem eventos em tempo real —`, e?.message ?? e);", "throw e;"],
  ["M9 ícone com o robô do Capacitor", "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml",
    "@mipmap/ic_launcher_foreground", "@drawable/ic_launcher_foreground"],
];

function correr() {
  const r = spawnSync(process.execPath, ["--test", TESTE], { cwd: FRONT, encoding: "utf8" });
  const fail = Number((r.stdout.match(/ℹ fail (\d+)/) || [])[1] ?? NaN);
  return { code: r.status, fail };
}

const base = correr();
console.log(`baseline: exit=${base.code} fail=${base.fail}`);
if (base.code !== 0) { console.error("baseline vermelho — PARAR"); process.exit(2); }

let mortos = 0;
for (const [nome, rel, de, para] of MUTANTES) {
  const p = resolve(FRONT, rel);
  const bak = join(BAK, rel.replace(/[\\/]/g, "__"));
  copyFileSync(p, bak);
  const antes = md5(p);
  try {
    const src = readFileSync(p, "utf8");
    if (!src.includes(de)) { console.log(`${nome}: ÂNCORA NÃO CASOU — mutante inválido`); continue; }
    writeFileSync(p, src.replace(de, () => para));
    const r = correr();
    const morreu = r.code !== 0;
    if (morreu) mortos++;
    console.log(`${nome}: ${morreu ? `MORTO (${r.fail} RED)` : "SOBREVIVEU"}`);
  } finally {
    copyFileSync(bak, p);
    const ok = md5(p) === antes;
    if (!ok) { console.error(`${nome}: RESTAURO FALHOU (md5) — PARAR`); process.exit(3); }
  }
}
const fim = correr();
console.log(`\nmutantes mortos: ${mortos}/${MUTANTES.length} · pós-restauro exit=${fim.code} fail=${fim.fail} · md5 restaurado em todos`);
process.exit(mortos === MUTANTES.length && fim.code === 0 ? 0 : 1);

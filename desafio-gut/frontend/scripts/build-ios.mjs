#!/usr/bin/env node
// scripts/build-ios.mjs — UTAC152 (SEG4 ⚠️1 + ⚠️2)
//
// Build do iOS em QUALQUER sistema (Windows ou Mac). A 1.ª versão do `build:ios` usava
// `set VITE_IS_IOS_APP=true&& …`, que só funciona no cmd.exe: no `sh` do Mac a flag não chegava ao
// build e o guarda recusava (fail-closed, mas horas de Mac perdidas). Aqui a flag vai no `env` do processo.
//
// Passos (param no primeiro erro):
//   1. `netlify build --context production` na raiz do repo, com VITE_IS_IOS_APP=true (env de produção = mainnet);
//   2. guarda `validar-dist-rede.mjs --ios` (flag presente, sem flag do Android, sem frases de PIX/site);
//   3. `npx cap sync ios`;
//   4. normalizar `ios/App/CapApp-SPM/Package.swift` (no Windows o Capacitor escreve «\» e o SPM não compila).
//
// ⛔ Nunca `npm run build` + `cap sync`: o Vite puro lê os .env do disco (Sepolia). Ver MC88.24/UTAC122.
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizarFicheiro } from "./normalizar-package-swift.mjs";

const FRONT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(FRONT, "..", "..");

const env = { ...process.env, VITE_IS_IOS_APP: "true" };
delete env.VITE_IS_ANDROID_APP; // um bundle do iOS nunca leva a flag do Android

function correr(comando, cwd) {
  console.log(`\n▶ ${comando}`);
  // Comando fixo, sem input externo; shell para resolver `netlify`/`npx` (.cmd no Windows).
  const r = spawnSync(comando, { cwd, env, stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(`✖ falhou (exit ${r.status}): ${comando}`);
    process.exit(r.status || 1);
  }
}

correr("netlify build --context production", RAIZ);
correr("node scripts/validar-dist-rede.mjs --ios", FRONT);
correr("npx cap sync ios", FRONT);
const r = normalizarFicheiro(resolve(FRONT, "ios", "App", "CapApp-SPM", "Package.swift"));
if (!r.existe) { console.error("✖ ios/App/CapApp-SPM/Package.swift não existe (correr `npx cap add ios`)."); process.exit(1); }
console.log(r.alterado ? "✓ Package.swift: caminhos normalizados para «/»." : "✓ Package.swift já estava com «/».");
console.log("\n✓ build:ios concluído — abrir ios/App/App.xcodeproj no Xcode.");

#!/usr/bin/env node
// scripts/normalizar-package-swift.mjs — UTAC152 (SEG4 ⚠️1)
//
// PORQUÊ: no Windows o `npx cap sync ios` escreve `ios/App/CapApp-SPM/Package.swift` com os caminhos dos
// plugins em barras invertidas (`path: "..\..\..\node_modules\@capacitor\app"`). Num literal Swift,
// `\.`, `\@` e `\c` são escapes inválidos e `\n` vira quebra de linha ⇒ o manifest SPM não compila e o
// Xcode não resolve os pacotes. Este passo troca as barras SÓ dentro de `path: "…"`. É idempotente.
//
// Uso: node scripts/normalizar-package-swift.mjs [caminho-do-Package.swift]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Pura: normaliza as barras dos `path: "…"`; o resto do texto fica byte a byte. */
export function normalizarCaminhosSwift(texto) {
  return texto.replace(/(path:\s*")([^"]*)(")/g, (_, a, caminho, b) => a + caminho.replace(/\\/g, "/") + b);
}

export function normalizarFicheiro(caminho) {
  if (!existsSync(caminho)) return { alterado: false, existe: false };
  const antes = readFileSync(caminho, "utf8");
  const depois = normalizarCaminhosSwift(antes);
  if (depois !== antes) writeFileSync(caminho, depois, "utf8");
  return { alterado: depois !== antes, existe: true };
}

const correDirecto = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (correDirecto) {
  const AQUI = dirname(fileURLToPath(import.meta.url));
  const alvo = resolve(process.argv[2] || resolve(AQUI, "..", "ios", "App", "CapApp-SPM", "Package.swift"));
  const r = normalizarFicheiro(alvo);
  if (!r.existe) { console.error(`✖ Package.swift não encontrado em ${alvo}`); process.exit(1); }
  console.log(r.alterado ? "✓ Package.swift: caminhos normalizados para «/»." : "✓ Package.swift já estava com «/».");
}

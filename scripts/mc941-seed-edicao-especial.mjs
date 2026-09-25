#!/usr/bin/env node
// mc941-seed-edicao-especial.mjs — MC94.1
//
// Grava a edição especial ESPECIAL-AIRFRYER no Blob "edicoes-metadata" (onde
// edicoes.mjs, lance-relampago.mjs e o GUTO já leem as edições).
//
// Horários fixados pelo operador (R18, 2026-09-25), em UTC:
//   início 04/10/2026 20:00 Brasília = 2026-10-04T23:00:00.000Z
//   fim    04/10/2026 20:30 Brasília = 2026-10-04T23:30:00.000Z
// O status gravado é "aberto": antes do início, listarEdicoes() põe-na em
// `agendadas` (fora do mapa que o Dashboard desenha) e o lance-relampago
// recusa-a com 409 — tudo pelo relógio do servidor, sem flip manual.
//
// Escreve pelo CLI do Netlify (`netlify blobs:set --input`), com o login que o
// CLI já tem: este script não lê nem pede token nenhum (R5).
// Corre a partir da raiz do repositório (é onde está o link do site).
//
// Uso:
//   node scripts/mc941-seed-edicao-especial.mjs --print   # mostra o que gravaria
//   node scripts/mc941-seed-edicao-especial.mjs           # grava se não existir
//   node scripts/mc941-seed-edicao-especial.mjs --force   # sobrescreve

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const STORE = "edicoes-metadata";
export const CHAVE = "ESPECIAL-AIRFRYER";

export const EDICAO_ESPECIAL_AIRFRYER = Object.freeze({
  id:         CHAVE,
  // MC94.4.1 — R18: o operador REVERTEU a decisão D1 do MC94.1. A especial é uma
  // edição RELÂMPAGO: o lance debita SALDO em dinheiro a partir de R$ 0,01, e NÃO
  // consome senha. O `tipo` é o que decide o débito no backend (lance-relampago.mjs:
  // `ehProgramado = tipoEdicao === "programado"` → senha; senão → saldo R$), logo
  // era ESTE campo que fazia a especial cobrar senha, sem nenhum bug de código.
  tipo:       "relampago",
  produto:    "Air Fryer",
  inicio_em:  "2026-10-04T23:00:00.000Z",
  termino_em: "2026-10-04T23:30:00.000Z",
  lances:     0,
  status:     "aberto",
  imagem_url: "/artes/edicao-especial-airfryer.jpg",
  regra:      "menor_lance_unico",
  criadoPor:  null,
  origem:     "seed-mc94.1",
});

function netlify(args) {
  // shell:true porque no Windows o CLI é um .cmd; os argumentos são constantes.
  return execFileSync("netlify", args, { encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] });
}

function lerAtual() {
  try {
    const out = netlify(["blobs:get", STORE, CHAVE]).trim();
    return out ? JSON.parse(out) : null;
  } catch {
    return null; // chave ausente → o CLI sai com erro
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--print")) {
    console.log(JSON.stringify(EDICAO_ESPECIAL_AIRFRYER, null, 2));
    return;
  }
  const atual = lerAtual();
  if (atual && !args.includes("--force")) {
    console.log(`[seed] ${STORE}:${CHAVE} já existe — nada gravado. Use --force para sobrescrever.`);
    console.log(JSON.stringify(atual));
    return;
  }
  const valor = { ...EDICAO_ESPECIAL_AIRFRYER, criadoEm: new Date().toISOString() };
  const dir = mkdtempSync(join(tmpdir(), "mc941-"));
  const ficheiro = join(dir, "edicao.json");
  try {
    writeFileSync(ficheiro, JSON.stringify(valor), "utf8");
    netlify(["blobs:set", STORE, CHAVE, "--input", `"${ficheiro}"`, "--force"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const lido = lerAtual();
  if (!lido || lido.id !== CHAVE || lido.inicio_em !== valor.inicio_em) {
    throw new Error(`[seed] releitura não confere: ${JSON.stringify(lido)}`);
  }
  console.log(`[seed] ${STORE}:${CHAVE} gravado e relido:`);
  console.log(JSON.stringify(lido));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => { console.error(err?.message || err); process.exit(1); });
}

// UTAC140 (Frente A) — abertura IMEDIATA da ESPECIAL-RELAMPAGO1 (Blob `edicoes-metadata`).
//
// Muda SÓ `status` → "aberto" e `inicio_em` → agora (ISO 8601). `termino_em` mantém-se (R18-140-A:
// 30/11 20:00 BRT = 2026-11-30T23:00:00.000Z). Guarda o valor anterior em `_logs/UTAC140_BLOB-ANTES.json`
// e regista a abertura antecipada no próprio objecto (`aberturaAntecipada`), para o `--reverter`.
// Escreve pelo CLI do Netlify (login do CLI, sem token — R5), como o seed do UTAC138.
//
//   node scripts/utac140-abrir-especial.mjs --print      # mostra o que gravaria
//   node scripts/utac140-abrir-especial.mjs              # abre agora
//   node scripts/utac140-abrir-especial.mjs --reverter   # repõe o inicio_em original

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const STORE = "edicoes-metadata";
const CHAVE = "ESPECIAL-RELAMPAGO1";
const TERMINO = "2026-11-30T23:00:00.000Z";
const LOGS = join(dirname(fileURLToPath(import.meta.url)), "..", "_logs");

const netlify = (args) => execFileSync("netlify", args, { encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] });
function ler() {
  const out = netlify(["blobs:get", STORE, CHAVE]).trim();
  return out ? JSON.parse(out) : null;
}
function gravar(valor) {
  const dir = mkdtempSync(join(tmpdir(), "utac140-"));
  const f = join(dir, "edicao.json");
  try { writeFileSync(f, JSON.stringify(valor), "utf8"); netlify(["blobs:set", STORE, CHAVE, "--input", `"${f}"`, "--force"]); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

const args = process.argv.slice(2);
const atual = ler();
if (!atual || atual.id !== CHAVE) throw new Error(`[utac140] ${STORE}:${CHAVE} ausente ou ilegível`);
if (atual.termino_em !== TERMINO) throw new Error(`[utac140] termino_em inesperado (${atual.termino_em}) — PARAR`);

if (args.includes("--reverter")) {
  const original = atual.aberturaAntecipada?.inicio_original;
  if (!original) throw new Error("[utac140] sem inicio_original registado — nada a reverter");
  const { aberturaAntecipada, ...resto } = atual;
  gravar({ ...resto, inicio_em: original });
  console.log("[utac140] revertido:", JSON.stringify(ler()));
  process.exit(0);
}

const agora = new Date().toISOString();
const novo = {
  ...atual,
  status: "aberto",
  inicio_em: agora,
  termino_em: TERMINO,
  aberturaAntecipada: atual.aberturaAntecipada ?? { em: agora, por: "UTAC140", inicio_original: atual.inicio_em },
};
if (args.includes("--print")) { console.log(JSON.stringify(novo, null, 2)); process.exit(0); }

const antes = join(LOGS, "UTAC140_BLOB-ANTES.json");
if (!existsSync(antes)) writeFileSync(antes, JSON.stringify(atual, null, 2) + "\n", "utf8");
gravar(novo);
const lido = ler();
if (lido?.inicio_em !== agora || lido?.status !== "aberto" || lido?.termino_em !== TERMINO || lido?.produto !== atual.produto) {
  throw new Error(`[utac140] releitura não confere: ${JSON.stringify(lido)}`);
}
console.log("[utac140] aberta e relida:", JSON.stringify(lido));

#!/usr/bin/env node
// utac149-seed-especial-palpite.mjs — UTAC149 (Frente A).
//
// Grava a 1.ª Edição Especial PROGRAMADA (palpite) no Blob "edicoes-metadata". Mesmo padrão do
// `utac138-seed-edicao-especial.mjs` (a especial Relâmpago).
//
// Decisões do operador (R18-149, 2026-11-26 — `_logs/UTAC149_SEG-1_MEDICAO.md`):
//   - A datas: 25/11 00:00 → 09/12 23:59 Brasília (UTC−3 fixo) = 2026-11-25T03:00:00.000Z → 2026-12-10T02:59:00.000Z
//   - B id: `ESPECIAL-PALPITE1` — o `ESPECIAL-PALPITE-1` do enunciado é recusado pelo regex `ESPECIAL-[A-Z0-9]+`
//   - C layout oficial da Programada (`tipo:"programado"`: é o que o `registar-palpite` exige)
//   - D produto: air fryer — sem nome dado, reusa-se o da especial Relâmpago (a arte mostra uma air fryer)
//   - imagem: a arte «EDICAO ESPECIAL PALPITE» do Desktop no bucket público `artes-edicoes`
//     (sha256 1b7c3984…9476, download público 200 com o mesmo sha256).
//
// Escreve pelo CLI do Netlify (`netlify blobs:set --input`), com o login do CLI: sem token (R5).
// Corre a partir da raiz do repositório.
//   node scripts/utac149-seed-especial-palpite.mjs --print     # mostra o que gravaria
//   node scripts/utac149-seed-especial-palpite.mjs             # grava se não existir
//   node scripts/utac149-seed-especial-palpite.mjs --force     # sobrescreve
//   node scripts/utac149-seed-especial-palpite.mjs --reverter  # apaga a chave (desfaz o seed)

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const STORE = "edicoes-metadata";
export const CHAVE = "ESPECIAL-PALPITE1";
export const IMAGEM_URL =
  "https://vjslwowwrpcawijdiksm.supabase.co/storage/v1/object/public/artes-edicoes/especial-palpite-1.jpg";

export const EDICAO_ESPECIAL_PALPITE1 = Object.freeze({
  id:         CHAVE,
  tipo:       "programado",
  produto:    "Fritadeira Elétrica Sem Óleo Quad Fry 4,2 L Elgin",
  inicio_em:  "2026-11-25T03:00:00.000Z",
  termino_em: "2026-12-10T02:59:00.000Z",
  lances:     0,
  status:     "aberto",
  imagem_url: IMAGEM_URL,
  regra:      "palpite_mais_proximo",
  criadoPor:  null,
  origem:     "seed-utac149",
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
    console.log(JSON.stringify(EDICAO_ESPECIAL_PALPITE1, null, 2));
    return;
  }
  if (args.includes("--reverter")) {
    netlify(["blobs:delete", STORE, CHAVE, "--force"]);
    console.log(`[seed] ${STORE}:${CHAVE} apagado; releitura: ${JSON.stringify(lerAtual())}`);
    return;
  }
  const atual = lerAtual();
  if (atual && !args.includes("--force")) {
    console.log(`[seed] ${STORE}:${CHAVE} já existe — nada gravado. Use --force para sobrescrever.`);
    console.log(JSON.stringify(atual));
    return;
  }
  const valor = { ...EDICAO_ESPECIAL_PALPITE1, criadoEm: new Date().toISOString() };
  const dir = mkdtempSync(join(tmpdir(), "utac149-"));
  const ficheiro = join(dir, "edicao.json");
  try {
    writeFileSync(ficheiro, JSON.stringify(valor), "utf8");
    netlify(["blobs:set", STORE, CHAVE, "--input", `"${ficheiro}"`, "--force"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const lido = lerAtual();
  if (!lido || lido.id !== CHAVE || lido.tipo !== "programado" || lido.inicio_em !== valor.inicio_em
      || lido.termino_em !== valor.termino_em || lido.produto !== valor.produto) {
    throw new Error(`[seed] releitura não confere: ${JSON.stringify(lido)}`);
  }
  console.log(`[seed] ${STORE}:${CHAVE} gravado e relido:`);
  console.log(JSON.stringify(lido));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => { console.error(err?.message || err); process.exit(1); });
}

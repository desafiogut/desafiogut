#!/usr/bin/env node
// utac138-seed-edicao-especial.mjs — UTAC138 (Frente B).
//
// Grava a 1.ª Edição Especial Relâmpago no Blob "edicoes-metadata" (é aí que vivem as edições: edicoes.mjs,
// lance-relampago.mjs, o cron scheduled-encerrar-especial e o GUTO leem-nas — a tabela Supabase `edicoes`
// do enunciado NÃO existe; medido no SEG-1). Mesmo padrão do `mc941-seed-edicao-especial.mjs`.
//
// Decisões (R18-138, 2026-11-17):
//   - data: «corre apenas no dia 30 às 19h» → 30/11/2026 19:00–20:00 Brasília (UTC−3 fixo)
//           = 2026-11-30T22:00:00.000Z – 2026-11-30T23:00:00.000Z
//   - id: `ESPECIAL-RELAMPAGO1` — o `ESPECIAL-RELAMPAGO-1` do enunciado é recusado pelo regex
//         `ESPECIAL-[A-Z0-9]+` (edicoes-core.mjs:46) e a edição ficava invisível em silêncio;
//   - produto: o nome que a arte mostra (o enunciado deixava-o ao operador);
//   - imagem: a arte «EDICAO ESPECIAL» do Desktop, no Supabase Storage (bucket público `artes-edicoes`).
//   - `tipo: "relampago"`: é o campo que decide o débito no backend (pontos de lance); o «especial» do
//     enunciado é o prefixo do id (o frontend reconhece-a por `ESPECIAL-*`).
//
// Escreve pelo CLI do Netlify (`netlify blobs:set --input`), com o login do CLI: sem token (R5).
// Corre a partir da raiz do repositório.
//   node scripts/utac138-seed-edicao-especial.mjs --print   # mostra o que gravaria
//   node scripts/utac138-seed-edicao-especial.mjs           # grava se não existir
//   node scripts/utac138-seed-edicao-especial.mjs --force   # sobrescreve

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const STORE = "edicoes-metadata";
export const CHAVE = "ESPECIAL-RELAMPAGO1";
export const IMAGEM_URL =
  "https://vjslwowwrpcawijdiksm.supabase.co/storage/v1/object/public/artes-edicoes/especial-relampago-1.jpg";

export const EDICAO_ESPECIAL_RELAMPAGO1 = Object.freeze({
  id:         CHAVE,
  tipo:       "relampago",
  produto:    "Fritadeira Elétrica Sem Óleo Quad Fry 4,2 L Elgin",
  inicio_em:  "2026-11-30T22:00:00.000Z",
  termino_em: "2026-11-30T23:00:00.000Z",
  lances:     0,
  status:     "aberto",
  imagem_url: IMAGEM_URL,
  regra:      "menor_lance_unico",
  criadoPor:  null,
  origem:     "seed-utac138",
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
    console.log(JSON.stringify(EDICAO_ESPECIAL_RELAMPAGO1, null, 2));
    return;
  }
  const atual = lerAtual();
  if (atual && !args.includes("--force")) {
    console.log(`[seed] ${STORE}:${CHAVE} já existe — nada gravado. Use --force para sobrescrever.`);
    console.log(JSON.stringify(atual));
    return;
  }
  const valor = { ...EDICAO_ESPECIAL_RELAMPAGO1, criadoEm: new Date().toISOString() };
  const dir = mkdtempSync(join(tmpdir(), "utac138-"));
  const ficheiro = join(dir, "edicao.json");
  try {
    writeFileSync(ficheiro, JSON.stringify(valor), "utf8");
    netlify(["blobs:set", STORE, CHAVE, "--input", `"${ficheiro}"`, "--force"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const lido = lerAtual();
  if (!lido || lido.id !== CHAVE || lido.inicio_em !== valor.inicio_em || lido.produto !== valor.produto) {
    throw new Error(`[seed] releitura não confere: ${JSON.stringify(lido)}`);
  }
  console.log(`[seed] ${STORE}:${CHAVE} gravado e relido:`);
  console.log(JSON.stringify(lido));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => { console.error(err?.message || err); process.exit(1); });
}

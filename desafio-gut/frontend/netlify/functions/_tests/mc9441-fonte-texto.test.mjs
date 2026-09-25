// mc9441-fonte-texto.test.mjs — MC94.4.1. Trava a regressão do achado #2.
//
// ⛔ O DEFEITO (medido no SEG-1 do MC94.4.1): `_lib/edicoes-core.mjs` — um ficheiro de
// PRODUÇÃO — continha TRÊS BYTES DE CONTROLO CRUS dentro da classe de caracteres de uma
// regex: `/[\0-\x1f\x7f]/` escrito com os bytes 0x00, 0x1F e 0x7F LITERAIS, em vez dos
// escapes `\x00`, `\x1f`, `\x7f`.
//
// A regex funcionava (semanticamente é o mesmo), e é por isso que ninguém notou. O custo
// estava nas FERRAMENTAS, e é grande:
//   - `file` classificava o ficheiro como "data" (binário);
//   - `grep` imprimia "Binary file ... matches" e SALTava o ficheiro em silêncio — ou
//     seja, TODAS as varreduras por grep (incluindo auditorias de segredos e buscas de
//     consumidores) ficavam cegas a ele;
//   - o `git diff` mostrava "Bin N -> M bytes", tornando a revisão deste ficheiro
//     impossível de ler.
//
// Um ficheiro invisível ao grep é um ficheiro invisível à auditoria. Este teste existe para
// que nenhum volte a sê-lo.
//
// Corre:  node --test _tests/mc9441-fonte-texto.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, ".."); // .../netlify/functions

/** Controlo cru = byte de controlo que NÃO é tab/CR/LF (esses são legítimos em texto). */
function controlosCrus(buf) {
  const maus = [];
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    const permitido = b === 0x09 || b === 0x0a || b === 0x0d; // \t \n \r
    const ehControlo = b < 0x20 || b === 0x7f;
    if (ehControlo && !permitido) maus.push({ byte: b, offset: i });
  }
  return maus;
}

function ficheirosMjs(dir, acc = []) {
  for (const nome of readdirSync(dir)) {
    if (nome === "node_modules") continue;
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) ficheirosMjs(p, acc);
    else if (nome.endsWith(".mjs")) acc.push(p);
  }
  return acc;
}

test("nenhum ficheiro .mjs de produção tem bytes de controlo crus (senão o grep salta-o)", () => {
  const ficheiros = ficheirosMjs(RAIZ);
  assert.ok(ficheiros.length > 50, `esperava muitos .mjs, achei ${ficheiros.length}`);

  const culpados = [];
  for (const f of ficheiros) {
    const maus = controlosCrus(readFileSync(f));
    if (maus.length) {
      culpados.push(`${relative(RAIZ, f).replace(/\\/g, "/")} -> ` +
        maus.map((m) => `0x${m.byte.toString(16).padStart(2, "0")}@${m.offset}`).join(", "));
    }
  }
  assert.deepEqual(culpados, [],
    "ficheiro(s) com controlo cru: o grep trata-os como binários e salta-os em silêncio, " +
    "deixando-os fora de qualquer auditoria:\n  " + culpados.join("\n  "));
});

test("_lib/edicoes-core.mjs usa o ESCAPE \\x00 na classe de controlo (o caso que originou isto)", () => {
  const src = readFileSync(join(RAIZ, "_lib/edicoes-core.mjs"), "utf8");
  // O escape tem de estar lá (é o que mantém o ficheiro texto)...
  assert.ok(src.includes("\\x00-\\x1f\\x7f"),
    "esperava a classe de controlo escrita com escapes '\\x00-\\x1f\\x7f'");
  // ...e nenhum byte cru pode ter voltado.
  assert.deepEqual(controlosCrus(Buffer.from(src, "utf8")), [],
    "voltou a haver controlo cru em edicoes-core.mjs");
});

// vocabularioUI.test.mjs — MC96.3, Frente B.
//
// Medido no SEG-1: «leilão» aparecia em 33 ficheiros / 141 ocorrências em `src/` — e o briefing
// listava 8. A maior parte são IDENTIFICADORES (`tipoLeilao`, `isLeilaoAtivo`, `FimLeilaoOverlay`,
// `leilaoTimer.js`) ou o NOME DO CONTRATO ON-CHAIN (`LeilaoGUT`, que não se renomeia).
//
// O que este teste trava é o que o UTILIZADOR VÊ: texto JSX, strings, aria-labels.
//
// HARD GATE 7 — bidireccional:
//   (a) não há «leilão» VISÍVEL nos ficheiros da UI;
//   (b) o vocabulário correcto («edição»/«torneio») está presente;
//   (c) repor «leilão» visível → RED.
//
// ⚠️ Comentários são removidos, mas SÓ os que abrem a linha — a 1.ª versão desta técnica no
// MC96.2 tinha 2 pontos cegos (string com «// leilões» dentro, e «/* leilões */» em string), e o
// auditor apanhou-os. Aqui também se distingue identificador de texto visível.
//
// node --test --test-concurrency=1 src/components/__tests__/vocabularioUI.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Ficheiros com texto visível ao utilizador (medidos no SEG-1).
const FICHEIROS = [
  "src/pages/Vitrine.jsx", "src/pages/MercadoLances.jsx", "src/pages/Dashboard.jsx",
  "src/pages/MinhaCarteira.jsx", "src/pages/CorporativoCarteira.jsx", "src/pages/Privacidade.jsx",
  "src/pages/Seguranca.jsx", "src/components/FimLeilaoOverlay.jsx",
  "src/components/glass/ComingSoonHero.jsx", "src/utils/edicao.js",
];
const ler = (f) => readFileSync(resolve(process.cwd(), f), "utf8");

/** Só comentários que ABREM a linha (a lição do MC96.2). */
const semComentarios = (s) =>
  s.split("\n").map((l) => (/^[ \t]*(\/\/|\/?\*)/.test(l) ? "" : l)).join("\n");

/** Extrai o que o utilizador LÊ: texto entre >…<, e strings/aria-labels entre aspas. */
function textoVisivel(src) {
  const fora = [];
  for (const m of src.matchAll(/>([^<>{}\n]{3,})</g)) fora.push(m[1]);
  for (const m of src.matchAll(/"[^"\n]{3,}"/g)) fora.push(m[1]);
  for (const m of src.matchAll(/`[^`\n]{3,}`/g)) fora.push(m[1]);
  return fora.join(" \n ");
}

const PAD = /leil[ãõa]o|leil[õo]es/i;
// Excepções DECLARADAS: o nome do contrato on-chain. Renomeá-lo seria falsear um facto —
// o contrato publicado chama-se mesmo LeilaoGUT (fora do escopo deste MC).
const EXCEPCOES = /LeilaoGUT/g;

test("(a) nenhum texto VISÍVEL da UI diz «leilão»", () => {
  const achados = [];
  for (const f of FICHEIROS) {
    const texto = textoVisivel(semComentarios(ler(f))).replace(EXCEPCOES, "@");
    for (const linha of texto.split("\n")) {
      if (PAD.test(linha)) achados.push(`${f}: «${linha.trim().slice(0, 70)}»`);
    }
  }
  assert.deepEqual(achados, [], `texto visível com «leilão»:\n  ${achados.join("\n  ")}`);
});

test("(b) o vocabulário correcto está presente nos ficheiros tocados", () => {
  for (const f of FICHEIROS) {
    const s = semComentarios(ler(f));
    assert.doesNotMatch(textoVisivel(s).replace(EXCEPCOES, "@"), PAD, `${f}: ainda diz «leilão»`);
  }
  // e as substituições concretas existem (não basta apagar)
  assert.match(ler("src/pages/Vitrine.jsx"), /"Edição em breve"/, "Vitrine: falta «Edição em breve»");
  assert.match(ler("src/pages/MercadoLances.jsx"), /EDIÇÃO ENCERRADA/, "Mercado: falta «EDIÇÃO ENCERRADA»");
  assert.match(ler("src/pages/MinhaCarteira.jsx"), /participar da edição/, "Carteira: falta «participar da edição»");
  assert.match(ler("src/utils/edicao.js"), /rotuloLongo: "Edição encerrada"/, "edicao.js: falta o rótulo");
});

test("os IDENTIFICADORES e o NOME DO CONTRATO são preservados (não é um refactor)", () => {
  // Se algum destes desaparecer, alguém renomeou um símbolo — o que quebraria imports/contrato.
  assert.match(ler("src/pages/Vitrine.jsx"), /tipoLeilao/, "o campo tipoLeilao é um contrato interno");
  assert.match(ler("src/context/AppContext.jsx"), /leilaoTimer\.js/, "o import de leilaoTimer é interno");
  assert.match(ler("src/pages/Seguranca.jsx"), /LeilaoGUT/, "o nome do contrato on-chain é um facto");
});

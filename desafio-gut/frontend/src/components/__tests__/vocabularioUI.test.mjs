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
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve as _res } from "node:path";
import { resolve } from "node:path";

// Ficheiros com texto visível ao utilizador (medidos no SEG-1).
// MC96.7 — VARREDURA TOTAL (era uma lista fixa de 10 ficheiros, num universo de 164).
// ⚠️ Uma guarda que só vigia os ficheiros que EU escolhi vigia o que eu já sabia. O validador
// provou-o: a mesma string introduzida em `CardLance.jsx` (não-listado) SOBREVIVEU verde.
// Agora enumera-se tudo sob `src/` e excluem-se só os testes (que contêm as palavras proibidas
// por direito próprio — é o que ESTÃO a testar).
const FICHEIROS = (() => {
  const out = [];
  const IGNORAR = new Set(["node_modules", "dist", ".vite", "android", "__tests__"]);
  (function walk(dir) {
    for (const e of readdirSync(dir)) {
      if (IGNORAR.has(e)) continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(jsx?|tsx?)$/.test(e)) {
        // caminho relativo a `frontend/` (o `ler` resolve a partir do cwd)
        out.push(p.replace(/\\/g, "/").replace(/^.*\/frontend\//, ""));
      }
    }
  })(_res(process.cwd(), "src"));
  return out.sort();
})();
const ler = (f) => readFileSync(resolve(process.cwd(), f), "utf8");

/** Só comentários que ABREM a linha (a lição do MC96.2). */
const semComentarios = (s) =>
  s.split("\n").map((l) => (/^[ \t]*(\/\/|\/?\*)/.test(l) ? "" : l)).join("\n");

/**
 * Extrai o que o utilizador LÊ.
 *
 * ⚠️ ESTA FUNÇÃO ESTAVA MORTA E EU NÃO SABIA. A 1.ª versão usava `m[1]` em regexes **sem grupo
 * de captura** → `undefined` → concatenava `""`. Só a regex `>…<` capturava, e ela excluía `\n`
 * e `{` — logo **JSX multi-linha e texto interpolado eram invisíveis**. A auditoria adversarial
 * provou-o: um `<p>` multi-linha com «leilão» e um `ariaLabel` alterado passavam em VERDE.
 * Um extractor cego faz um teste vacuoso — e um teste vacuoso é pior que nenhum, porque afirma.
 */
function textoVisivel(src) {
  // MC96.7 — REMOVER COMENTÁRIOS ANTES DE EXTRAIR. Sem isto, um comentário (ou uma anotação
  // JSDoc `@param`) que mencione «leilão»/'tipoLeilao' passa por TEXTO VISÍVEL — falso positivo.
  // Foi o que a guarda alargada apanhou à 1.ª corrida, em `CardEdicaoEspecial.jsx`, onde as
  // 3 ocorrências estão todas em comentários.
  // A ordem importa: blocos primeiro (englobam o `{/* */}` do JSX), e `//` só quando precedido
  // de início-de-linha ou espaço — assim `https://…` dentro de uma string não é truncado.
  const semComentarios = src
    .replace(/\/\*[\s\S]*?\*\//g, "")        // /* … */ (inclui JSDoc /** … */)
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");       // // … (não apanha o `//` de `https://`)
  const fora = [];
  const add = (m) => fora.push(m[1]);
  for (const m of semComentarios.matchAll(/>([^<>]{4,})</g)) add(m);            // texto JSX (1 linha)
  for (const m of semComentarios.matchAll(/"([^"\n]{4,})"/g)) add(m);          // atributos/strings
  for (const m of semComentarios.matchAll(/'([^'\n]{4,})'/g)) add(m);
  for (const m of semComentarios.matchAll(/`([^`]{4,}?)`/gs)) add(m);           // templates (MULTI-LINHA)
  // JSX multi-linha: blocos de texto entre > e < que atravessam linhas
  for (const m of semComentarios.matchAll(/>([^<>]{4,}?)</gs)) add(m);
  return fora.join("\n").split("\n").map((l) => l.trim()).filter(Boolean);
}

const PAD = /leil[ãõa]o|leil[õo]es/i;
// Excepções DECLARADAS: o nome do contrato on-chain. Renomeá-lo seria falsear um facto —
// o contrato publicado chama-se mesmo LeilaoGUT (fora do escopo deste MC).
// Excepções DECLARADAS. Aqui está a decisão deste MC, escrita em código:
//  - `LeilaoGUT` é o NOME DO CONTRATO ON-CHAIN (está em `desafio-gut/contracts/Leilao.sol`) —
//    renomeá-lo seria falsear um facto publicado;
//  - os IDENTIFICADORES internos não são texto visível. O extractor largo (multi-linha) apanha
//    object literals como `tipoLeilao: "Programado · 24 h"` — o NOME da chave é código; o valor
//    é que é visível, e esse já é verificado.
// MC96.6 — a lista tem de conter os identificadores que AINDA EXISTEM, e só esses:
//   renomeados (fora daqui): tipoLeilao, setTipoLeilao, FimLeilaoOverlay
//   não autorizados a renomear (aqui): buscarClienteDoLeilaoAtivo (função), isLeilaoAtivo
//     (chave de config, categoria c), leilaoTimer/leilaoLock (nomes de ficheiro/binding),
//     AuctionStatusBar, LeilaoGUT (contrato on-chain)
// ⚠️ A 1.ª versão desta lista removeu `buscarClienteDoLeilaoAtivo` por engano — e o teste
// acusou-o, com razão: ele continua no código. Um teste que acusa correctamente não é ruído.
const EXCEPCOES = /LeilaoGUT|buscarClienteDoLeilaoAtivo|isLeilaoAtivo|leilaoTimer|leilaoLock|AuctionStatusBar/g;

test("(a) nenhum texto VISÍVEL da UI diz «leilão»", () => {
  const achados = [];
  for (const f of FICHEIROS) {
    const texto = textoVisivel(semComentarios(ler(f))).join("\n")
      .replace(EXCEPCOES, "@")
      // comentários JSX ({/* … */}) são DOCUMENTAÇÃO, não texto visível: preservam-se.
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    for (const linha of texto.split("\n")) {
      if (PAD.test(linha)) achados.push(`${f}: «${linha.slice(0, 70)}»`);
    }
  }
  assert.deepEqual(achados, [], `texto visível com «leilão»:\n  ${achados.join("\n  ")}`);
});

test("(b) o vocabulário correcto está presente nos ficheiros tocados", () => {
  for (const f of FICHEIROS) {
    const s = semComentarios(ler(f));
    // JSX comments ({/* … */}) são DOCUMENTAÇÃO (HARD GATE 5) — a mesma exclusão do teste (a).
    const semJsxComment = textoVisivel(s).join("\n").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    assert.doesNotMatch(semJsxComment.replace(EXCEPCOES, "@"), PAD, `${f}: ainda diz «leilão»`);
  }
  // e as substituições concretas existem (não basta apagar)
  assert.match(ler("src/pages/Vitrine.jsx"), /"Edição em breve"/, "Vitrine: falta «Edição em breve»");
  assert.match(ler("src/pages/MercadoLances.jsx"), /EDIÇÃO ENCERRADA/, "Mercado: falta «EDIÇÃO ENCERRADA»");
  assert.match(ler("src/pages/MinhaCarteira.jsx"), /participar da edição/, "Carteira: falta «participar da edição»");
  assert.match(ler("src/utils/edicao.js"), /rotuloLongo: "Edição encerrada"/, "edicao.js: falta o rótulo");
});

test("os IDENTIFICADORES e o NOME DO CONTRATO são preservados (não é um refactor)", () => {
  // Se algum destes desaparecer, alguém renomeou um símbolo — o que quebraria imports/contrato.
  // MC96.6 — este assert foi ESCRITO NO MC96.3 a afirmar que `tipoLeilao` se preservava (a
  // decisão de então era não renomear identificadores). A decisão do operador no MC96.6 revogou
  // essa premissa: o campo continua a ser contrato interno, agora com o nome novo.
  assert.match(ler("src/pages/Vitrine.jsx"), /\bmodalidade\b/, "o campo modalidade (ex-tipoLeilao) é contrato interno");
  assert.match(ler("src/context/AppContext.jsx"), /leilaoTimer\.js/, "o import de leilaoTimer é interno");
  assert.match(ler("src/pages/Seguranca.jsx"), /LeilaoGUT/, "o nome do contrato on-chain é um facto");
});

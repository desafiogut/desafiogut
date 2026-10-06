// utac107g2-pt-br.test.mjs — UTAC107g.2. O app é pt-BR: nenhuma copy em pt-PT (2.ª pessoa «tu»,
// «A + infinitivo») em todo o `src/` — não só nos ficheiros que cada UTAC tocou.
//
// Corre com:  node --test src/__tests__/utac107g2-pt-br.test.mjs   (a partir de desafio-gut/frontend)
//
// Porquê global: o UTAC107g.1 guardou só Meus Ativos e a Carteira, e ficou pt-PT nas Ofertas
// Programadas, no balão do Passe, no resgate, nos hooks de erro e no admin (medido no 107g.2).
// Uma guarda por ficheiro deixa de fora o próximo ficheiro. Esta varre TODO o código (sem comentários)
// à procura de marcadores que o pt-BR do app nunca usa. ⚠️ Fora do âmbito (registado como pendência):
// o vocabulário pt-PT que NÃO é 2.ª pessoa (utilizador, contacto, morada, bónus, registo) — sobretudo
// nas páginas legais, ligadas a docs/regras-oficiais.md.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Código sem comentários, preservando a numeração das linhas. */
function semComentarios(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    // ⚠️ `\r?\n`: nos ficheiros CRLF um `\r` fica no fim da linha e o `.` do JS NÃO casa `\r` —
    // a 1.ª versão desta guarda não removia comentários nenhuns nesses ficheiros (erro medido).
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|[^:"'`\\])\/\/.*$/, "$1"))
    .join("\n");
}

/** Marcadores pt-PT. Insensíveis a maiúsculas: pronomes/verbos da 2.ª pessoa «tu», sem uso em
 *  pt-BR. Sensíveis (início de frase de UI): «A + infinitivo» e imperativos/verbos que, em
 *  minúsculas, também são 3.ª pessoa válida («nada aqui escreve», «senhas ganhas» = obtidas). */
const PT_PT_I = /\b(tens|teu|tua|teus|tuas|vais|podes|estás|precisas|usas|consegues|queres|fazes|deves)\b/i;
const PT_PT_S = /\bA (carregar|processar|ler|enviar|verificar|guardar|criar|confirmar)\b|\b(Escreve|Ganhas|Compra o|Confirma os|Tenta de novo|Abre o teu)\b/;

function ocorrencias(texto) {
  const out = [];
  semComentarios(texto).split("\n").forEach((l, i) => {
    const m = l.match(PT_PT_I) || l.match(PT_PT_S);
    if (m) out.push([i + 1, m[0], l.trim().slice(0, 120)]);
  });
  return out;
}

function ficheiros(d, acc = []) {
  for (const e of readdirSync(d)) {
    if (["node_modules", "__tests__", "_stubs"].includes(e)) continue;
    const p = join(d, e);
    if (statSync(p).isDirectory()) ficheiros(p, acc);
    else if (/\.(jsx?|mjs)$/.test(e) && !/\.bak-|\.test\.mjs$/.test(e)) acc.push(p); // testes citam pt-PT de propósito
  }
  return acc;
}

test("controlo positivo: a guarda vê pt-PT em código e ignora-o em comentários", () => {
  assert.equal(ocorrencias(`const m = "Vais comprar 1 Passe";`).length, 1);
  assert.equal(ocorrencias(`<p>A carregar os teus pontos…</p>`).length, 1);
  assert.equal(ocorrencias(`{loading ? "A processar…" : "Ok"}`).length, 1);
  assert.equal(ocorrencias(`// Vais comprar — comentário\nconst x = 1;`).length, 0);
  assert.equal(ocorrencias(`/* A carregar os teus pontos */ const y = 2;`).length, 0);
  // falsos positivos de 3.ª pessoa (pt-BR válido) não contam
  assert.equal(ocorrencias(`"Ganha o menor lance que ninguém repetir."`).length, 0);
  assert.equal(ocorrencias(`"Você pode acompanhar; a edição está aberta."`).length, 0);
  assert.equal(ocorrencias(`{stat("Senhas ganhas", n)}`).length, 0, "«senhas ganhas» (particípio) é pt-BR");
  assert.equal(ocorrencias(`"nada aqui escreve no log"`).length, 0);
  assert.equal(ocorrencias(`"Abre o Mercado no Menor Lance Único"`).length, 0, "descrição de botão (3.ª pessoa) é pt-BR");
  assert.equal(ocorrencias(`"Ganhas 1 ponto"\r\n// comentário CRLF: Vais comprar\r\n`).length, 1,
    "CRLF: o comentário tem de sair, a copy tem de ficar");
});

test("UTAC107g.2 · nenhuma copy pt-PT (2.ª pessoa / «A + infinitivo») em TODO o src/", () => {
  const lista = ficheiros(SRC);
  assert.ok(lista.length > 150, `controlo: só ${lista.length} ficheiros varridos — o walker está cego`);
  const achados = [];
  for (const p of lista) {
    for (const [linha, marca, txt] of ocorrencias(readFileSync(p, "utf8"))) {
      achados.push(`${relative(SRC, p).split("\\").join("/")}:${linha}  «${marca}»  ${txt}`);
    }
  }
  assert.deepEqual(achados, [], `copy pt-PT no app (é pt-BR):\n${achados.join("\n")}`);
});

test("UTAC107g.2 · as frases corrigidas estão em pt-BR nos ficheiros", () => {
  const ler = (r) => readFileSync(join(SRC, r), "utf8");
  assert.match(ler("pages/OfertasProgramadas.jsx"), /Você ainda não tem pontos\. Compre o seu primeiro Passe na Carteira\./);
  assert.match(ler("pages/OfertasProgramadas.jsx"), /Carregando seus pontos…/);
  assert.match(ler("components/ComprarPasseModal.jsx"), /Você vai comprar <strong/);
  assert.match(ler("components/ComprarPasseModal.jsx"), /Você ganha\{" "\}/);
  assert.match(ler("components/ResgatarCartaoModal.jsx"), /Confirme os dados de entrega\./);
  assert.match(ler("hooks/usePalpite.js"), /Você precisa ter comprado um Passe para palpitar/);
});

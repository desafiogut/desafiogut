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

/** Código sem comentários, preservando a numeração das linhas.
 *  ⚠️ Percorre carácter a carácter e SABE quando está dentro de uma string (' " `) — achado G-cega
 *  do validador: a versão por regex tratava o `/*` de `"/.netlify/functions/*"` (dentro de um
 *  comentário `//`) como início de bloco e apagava 98 linhas de `main.jsx`, incluindo copy visível.
 *  Também: `\r?\n` (o `.` do JS não casa `\r` em ficheiros CRLF) e `//` dentro de string não corta. */
function semComentarios(src) {
  const linhas = src.split(/\r?\n/);
  const out = [];
  let emBloco = false;
  let template = false; // template literal pode atravessar linhas
  for (const l of linhas) {
    let r = "", aspa = template ? "`" : null;
    for (let i = 0; i < l.length; i++) {
      const c = l[i], n = l[i + 1];
      if (emBloco) { if (c === "*" && n === "/") { emBloco = false; i++; } r += " "; continue; }
      if (aspa) { r += c; if (c === "\\") { r += n ?? ""; i++; } else if (c === aspa) aspa = null; continue; }
      if (c === "/" && n === "/") break;                       // resto da linha é comentário
      if (c === "/" && n === "*") { emBloco = true; i++; r += " "; continue; }
      if (c === '"' || c === "'" || c === "`") {
        // apóstrofo em texto JSX («d'água») não abre string: só abre se não vier colado a uma letra
        if (c === "'" && /[\p{L}]/u.test(l[i - 1] ?? "")) { r += c; continue; }
        aspa = c;
      }
      r += c;
    }
    template = aspa === "`";
    out.push(r);
  }
  return out.join("\n");
}

/** Marcadores pt-PT. Insensíveis a maiúsculas: pronomes/verbos da 2.ª pessoa «tu», sem uso em
 *  pt-BR. Sensíveis (início de frase de UI): «A + infinitivo», imperativos «tu» e construções que,
 *  em minúsculas, também são 3.ª pessoa válida («nada aqui escreve», «senhas ganhas» = obtidas).
 *  «A confirmar» NÃO entra: é rótulo de estado pt-BR legítimo (falso positivo FP1 do validador). */
const PT_PT_I = /\b(tens|teu|tua|teus|tuas|vais|podes|estás|precisas|usas|consegues|queres|fazes|deves|fizeste|compraste|registaste|acertaste|ganhaste|escolheste|pagaste|perdeste)\b|\bganhas \d|\b(continua|continuar|continuam|está|estão|estamos|estou|fica) a [a-zà-ú]+r\b|\ba decorrer\b/i;

/** Excepções DECLARADAS (decisão do operador R18-A, UTAC107g.2): páginas legais com vocabulário e
 *  construções pt-PT que pedem uma revisão PRÓPRIA (a RegrasOficiais espelha docs/regras-oficiais.md
 *  e tem teste de consistência do UTAC106h). Pendência registada no log/R14 — não é silêncio. */
const EXCECOES_LEGAIS = new Set(["pages/Privacidade.jsx", "pages/RegrasOficiais.jsx"]);
const PT_PT_S = /\bA (carregar|processar|ler|enviar|verificar|guardar|criar)\b|\b(Escreve|Ganhas|Compra o|Confirma os|Confere|Chega a|Clica|Toca em|Partilha o|Introduz|Tenta de novo|Abre o teu|Vê (o|a|os|as))\b/;

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
  assert.equal(ocorrencias(`"Data de entrega: A confirmar"`).length, 0, "FP1 do validador: rótulo de estado pt-BR");
  // G-cega do validador: um `/*` DENTRO de um comentário `//` não pode abrir bloco e esconder copy
  assert.equal(ocorrencias(`// rota "/.netlify/functions/*"\n<p>Tenta de novo: tens a sessão expirada.</p>\n/* fim */`).length, 1,
    "o `/*` de dentro do `//` abriu um falso bloco e escondeu copy visível");
  // G10: `//` dentro de uma string não corta a linha
  assert.equal(ocorrencias(`const s = "Lances 1//2 - tens pouco";`).length, 1, "o `//` dentro da string cortou a linha");
  // apóstrofo em texto JSX não abre string (senão o resto da linha deixaria de ser comentário)
  assert.equal(ocorrencias(`<p>Copo d'água</p> // tens — comentário`).length, 0);
  // novos marcadores (achados A1–A4, «Ganhaste», «Perdeste», «estamos a»)
  for (const s of ["Por aqui, continua a explorar a loja.", "Confere os dados", "Chega a 50 pontos", "Sem edição a decorrer",
                   "🏆 Ganhaste!", "⚠️ Perdeste exclusividade", "estamos a restabelecer a sessão", "Hoje ganhas 1 ponto."]) {
    assert.equal(ocorrencias(JSON.stringify(s)).length, 1, `não apanhou: ${s}`);
  }
  assert.equal(ocorrencias(`"Ganhas 1 ponto"\r\n// comentário CRLF: Vais comprar\r\n`).length, 1,
    "CRLF: o comentário tem de sair, a copy tem de ficar");
});

test("UTAC107g.2 · nenhuma copy pt-PT (2.ª pessoa / «A + infinitivo») em TODO o src/", () => {
  const lista = ficheiros(SRC);
  assert.ok(lista.length > 150, `controlo: só ${lista.length} ficheiros varridos — o walker está cego`);
  const achados = [];
  for (const p of lista) {
    if (EXCECOES_LEGAIS.has(relative(SRC, p).split("\\").join("/"))) continue;
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

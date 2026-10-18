// utac110j4-produto-patrocinado.test.mjs — UTAC110j.4 Frente C. Sem nome de produto, os cartões de edição
// diziam «Prêmio a anunciar» (vocabulário de concurso; contradiz a troca «Prêmio → Produto» do 110j e o
// Regulamento v5.1, onde o produto é PATROCINADO — Cotas, Arts. 12º/18º/24º/30º). O nome do patrocinador
// NÃO existe nos dados da edição (medido no SEG-1) ⇒ o texto é «Produto patrocinado».
//
// Corre com:  node --test src/components/__tests__/utac110j4-produto-patrocinado.test.mjs   (a partir de desafio-gut/frontend)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";
import { opcoesServidorTeste, ALIASES } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = caminho(AQUI, "..", "..");
const ler = (p) => readFileSync(caminho(SRC, p), "utf8");
// fonte sem comentários — o comentário da correcção nomeia o texto antigo e não pode satisfazer/reprovar a guarda
const codigo = (src) => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

let React = null, renderToStaticMarkup = null, vite = null, Cartao = null;

before(async () => {
  vite = await createServer({
    ...opcoesServidorTeste(),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    resolve: { alias: [...ALIASES] },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  Cartao = (await vite.ssrLoadModule("/src/components/CartaoEdicao.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

const nomeDoCartao = (props) => {
  const html = renderToStaticMarkup(React.createElement(Cartao, props));
  const m = html.match(/data-testid="cartao-nome"[^>]*>([^<]*)</);
  return m ? m[1] : null;
};
const BASE = { id: "E-1", estado: { texto: "ABERTA" }, arteUrl: "/artes/x.jpg", tempo: "12:00" };

test("C1 CartaoEdicao sem produto mostra «Produto patrocinado» (renderizado)", () => {
  assert.equal(nomeDoCartao({ ...BASE }), "Produto patrocinado");
  assert.equal(nomeDoCartao({ ...BASE, produto: "" }), "Produto patrocinado");
});

test("C2 CartaoEdicao com produto continua a mostrar o nome do produto (controlo)", () => {
  assert.equal(nomeDoCartao({ ...BASE, produto: "Air Fryer" }), "Air Fryer");
});

test("C3 nenhum dos dois cartões tem «Prêmio a anunciar» no código", () => {
  for (const f of ["components/CartaoEdicao.jsx", "components/EdicaoCard.jsx"]) {
    assert.doesNotMatch(codigo(ler(f)), /a anunciar/i, `${f} ainda diz «a anunciar»`);
  }
});

test("C4 EdicaoCard usa «Produto patrocinado» como fallback do produto", () => {
  assert.match(codigo(ler("components/EdicaoCard.jsx")),
    /edicao\.produto\s*\?\s*edicao\.produto\s*:\s*"Produto patrocinado"/);
});

// MC89.4 — a decisão "esta rota é de trabalho" tem de estar certa.
//
// PORQUÊ ESTE TESTE EXISTE: `ehRotaDeTrabalho` decide se o produto mostra ou não
// a sua identidade visual (fundo animado, vinheta, rodapé). Um `true` a mais aqui
// apaga a atmosfera numa rota de CONSUMO — e ninguém repara logo, porque o ecrã
// continua a funcionar; só fica pobre. É uma regressão silenciosa por construção,
// e por isso vale um teste apesar de a alteração ser de apresentação.
//
// node --test --experimental-test-module-mocks _tests/mc894-rotas-trabalho.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { ehRotaDeTrabalho, escondeNavegacaoConsumo } from "../../../src/lib/rotasTrabalho.js";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../../../src");
const ler = (rel) => readFileSync(resolve(SRC, rel), "utf8");

test("rotas de trabalho: só /admin e /corporativo", () => {
  for (const p of ["/admin", "/admin/", "/corporativo", "/corporativo/cotas", "/corporativo/banners"]) {
    assert.equal(ehRotaDeTrabalho(p), true, `${p} devia ser rota de trabalho`);
  }
});

test("⚠️ as rotas de CONSUMO mantêm a identidade visual do produto", () => {
  // É a asserção que importa. Se uma destas passar a `true`, o produto perde o
  // fundo animado e a vinheta onde eles SÃO o produto.
  const consumo = [
    "/", "/mercado", "/carteira", "/vitrine", "/vitrine/diamante",
    "/edicao/R-1", "/produto/1", "/programacao", "/ativos", "/configuracoes",
    "/seguranca", "/excluir-conta", "/seja-nosso-parceiro",
  ];
  for (const p of consumo) {
    assert.equal(ehRotaDeTrabalho(p), false, `${p} NÃO é rota de trabalho`);
  }
});

test("não casa por prefixo solto — /administracao não é /admin", () => {
  // `startsWith("/admin")` cru casaria "/administracao" e "/admins". A função usa
  // igualdade ou "prefixo + /", precisamente para não adivinhar.
  for (const p of ["/administracao", "/admins", "/corporativos", "/corporativo-x"]) {
    assert.equal(ehRotaDeTrabalho(p), false, `${p} não devia casar`);
  }
});

test("entradas inválidas devolvem false (nunca explodem)", () => {
  for (const p of [undefined, null, "", 0, {}]) {
    assert.equal(ehRotaDeTrabalho(p), false);
  }
});

test("a navegação de consumo só sai onde há outra saída", () => {
  // Diferença FUNCIONAL, não estética: em /corporativo a barra inferior é a única
  // navegação do lojista (Painel · Cotas · Banners). Só o /admin ganhou um
  // "Sair do painel", logo só o /admin pode dispensá-la.
  assert.equal(escondeNavegacaoConsumo("/admin"), true);
  assert.equal(escondeNavegacaoConsumo("/corporativo"), false,
    "o lojista ficaria sem navegação nenhuma");
  assert.equal(escondeNavegacaoConsumo("/corporativo/cotas"), false);
  assert.equal(escondeNavegacaoConsumo("/"), false);
});

test("o /admin tem uma saída explícita — senão a remoção da barra tranca o ADM", () => {
  // Esta guarda existe porque as duas alterações são separáveis: alguém pode
  // remover o botão e deixar a barra escondida, e aí não há como sair no
  // telemóvel a não ser pelo botão físico.
  // MC89.6 — a casca do painel mudou de `pages/AdminPanel.jsx` para
  // `components/admin/AdminLayout.jsx` (rotas aninhadas, D-NAV). A guarda é a
  // mesma e continua a valer: quem herdar o layout não pode deixar cair a saída.
  const painel = ler("components/admin/AdminLayout.jsx");
  assert.match(painel, /Sair do painel/, "o painel perdeu o botão de saída");
  assert.match(painel, /useNavigate/, "o botão de saída precisa de navigate");
});

test("os três consumidores usam a fonte única, não a sua própria lista", () => {
  for (const rel of [
    "widgets/layout/BackgroundCanvas.jsx",
    "widgets/layout/AppLayout.jsx",
    "widgets/layout/Layout.jsx",
  ]) {
    assert.match(ler(rel), /rotasTrabalho\.js/,
      `${rel} tem de importar a decisão, não repetir a lista de rotas`);
  }
});

test("o fundo fica ESTÁTICO nas rotas de trabalho — não desaparece", () => {
  // Decisão do operador: "tire a animação do fundo, deixe ele estático". As
  // camadas de imagem (.gut-bg-layer) continuam a ser montadas; só o <video> sai.
  const canvas = ler("widgets/layout/BackgroundCanvas.jsx");
  assert.match(canvas, /showVideo\s*=.*!trabalho/,
    "o vídeo tem de ser suprimido nas rotas de trabalho");
  assert.match(canvas, /gut-bg-layer/,
    "as camadas de imagem estática TÊM de continuar a ser montadas");
  assert.doesNotMatch(canvas, /if\s*\(\s*trabalho\s*\)\s*return null/,
    "não é `return null`: o fundo fica estático, não ausente");
});

test("o painel tem superfície opaca declarada no CSS", () => {
  const css = ler("globals.css");
  assert.match(css, /\.admin-panel\s*\{[^}]*background:\s*rgba\(13,\s*18,\s*53,\s*0\.92\)/,
    ".admin-panel tem de ter o navy opaco (o mesmo valor do .gut-glass--solid)");
  assert.match(ler("components/admin/AdminLayout.jsx"), /className="admin-panel"/,
    "o container raiz do painel tem de usar a classe");
});

test("zero emojis em NENHUM ecrã do painel, fora dos comentários", () => {
  // MC89.6 — antes o painel era um ficheiro; agora são onze. A guarda passa a
  // varrer a pasta inteira: com nove telas, verificar só uma delas seria dar por
  // cumprida uma regra que nem se está a medir onde ela pode ser quebrada.
  const alvos = [
    "components/admin/AdminLayout.jsx",
    "components/admin/NavAdmin.jsx",
    ...readdirSync(resolve(SRC, "pages/admin")).map((f) => `pages/admin/${f}`),
  ];
  assert.ok(alvos.length >= 11, `esperava ≥11 ficheiros de painel, vi ${alvos.length}`);

  for (const rel of alvos) {
    const codigo = ler(rel)
      .split("\n")
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join("\n");
    const emojis = codigo.match(/\p{Extended_Pictographic}/gu) || [];
    assert.equal(emojis.length, 0, `${rel} tem emojis: ${[...new Set(emojis)].join(" ")}`);
  }
});

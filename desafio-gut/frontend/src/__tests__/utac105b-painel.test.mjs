// UTAC105b Frente B (frontend) — página «Meus cupons» + rota + entrada no painel.
// Renderiza a PÁGINA REAL pelo Vite (SSR) com o duplo do AppContext (alias, como MeusAtivos.test.mjs). O SSR não corre
// efeitos: o estado inicial é «carregando»; a lógica de leitura/gravação vive nos helpers exportados, testados aqui.
// Corre com: node --test src/__tests__/utac105b-painel.test.mjs   (a partir de desafio-gut/frontend)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
// ⚠️ React e o renderizador vêm do MESMO pipeline do servidor (`_ponte-ssr.mjs`), não do Node:
// importá-los pelo Node dá uma instância diferente da que o componente recebe pelo runner SSR,
// deixando o `ReactCurrentDispatcher` a null (`Cannot read properties of null (reading 'useState')`).
let React = null;
let renderToStaticMarkup = null;
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";
import { opcoesServidorTeste, ALIASES } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = caminho(AQUI, "../..");
const STUBS = caminho(AQUI, "../pages/__tests__/_stubs");
let vite, Mod, definirContexto;

before(async () => {
  vite = await createServer({
      ...opcoesServidorTeste(),
    root: RAIZ, server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
    resolve: { alias: [...ALIASES, { find: /^\.\.\/context\/AppContext\.jsx$/, replacement: `${STUBS}/AppContext.jsx` }] },
  });
  // A ponte PRIMEIRO: é ela que fixa a instância de React do processo.
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule(`${STUBS}/AppContext.jsx`));
  Mod = await vite.ssrLoadModule("/src/pages/CorporativoCupons.jsx");
});
after(async () => { if (vite) await vite.close(); });

const render = (contexto) => {
  definirContexto({ cotaCorporativa: null, authToken: null, obterAuthToken: async () => null, ...contexto });
  return renderToStaticMarkup(React.createElement(Mod.default));
};
const RESP = { lojistaId: "0xa", validadeDias: 30, cupons: [{ valorRs: 5, ativo: false }, { valorRs: 10, ativo: true }, { valorRs: 20, ativo: false }] };

test("P1 lê a resposta do servidor (os 3 valores e o estado) e recusa formas erradas", () => {
  assert.deepEqual(Mod.cuponsDaResposta(RESP), RESP.cupons);
  for (const mau of [null, {}, { cupons: [] }, { cupons: [{ valorRs: "5", ativo: true }] }, { cupons: [{ valorRs: 5, ativo: "sim" }] },
    { error: { code: "store_indisponivel" } }]) {
    assert.equal(Mod.cuponsDaResposta(mau), null, JSON.stringify(mau));
  }
});

test("P2 «Guardar» envia todos os valores mostrados com o estado escolhido e o cliente_id da cota", () => {
  assert.deepEqual(Mod.pedidoGuardar("cnpj:12345678000199", RESP.cupons), {
    cliente_id: "cnpj:12345678000199",
    cupons: [{ valorRs: 5, ativo: false }, { valorRs: 10, ativo: true }, { valorRs: 20, ativo: false }],
  });
});

test("P3 a página renderiza: sem cota → aviso; com cota → «carregando» (nunca inventa os 3 desactivados antes de ler)", () => {
  assert.match(render({}), /data-estado="sem-cota"/);
  const html = render({ cotaCorporativa: { cliente_id: "0xa" }, authToken: "t" });
  assert.match(html, /data-estado="carregando"/);
  assert.doesNotMatch(html, /Inativo|R\$ 5,00/);
  assert.match(html, /Meus cupons/);
});

test("P4 os valores não estão duplicados no frontend (fonte única = servidor)", () => {
  const fonte = readFileSync(caminho(RAIZ, "src/pages/CorporativoCupons.jsx"), "utf8").split(/\r?\n/)
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  assert.doesNotMatch(fonte, /\[\s*5\s*,\s*10\s*,\s*20\s*\]/);
});

test("P5 rota /corporativo/cupons registada (gated por CorporativoRoute) e entrada «Meus cupons» no painel", () => {
  const app = readFileSync(caminho(RAIZ, "src/App.jsx"), "utf8");
  assert.match(app, /<Route path="\/corporativo\/cupons"\s+element=\{<CorporativoRoute><CorporativoCupons \/><\/CorporativoRoute>\}/);
  assert.match(app, /const CorporativoCupons\s+= lazy\(\(\) => import\("\.\/pages\/CorporativoCupons\.jsx"\)\)/);
  const dash = readFileSync(caminho(RAIZ, "src/pages/CorporativoDashboard.jsx"), "utf8");
  assert.match(dash, /label: "Meus cupons",[^\n]*to: "\/corporativo\/cupons"/);
});

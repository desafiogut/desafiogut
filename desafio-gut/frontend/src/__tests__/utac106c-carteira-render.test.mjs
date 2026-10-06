// utac106c-carteira-render.test.mjs — UTAC106c · verificação por RENDER + CLIQUE da Carteira.
//
// PORQUE ESTE FICHEIRO EXISTE (achado ℹ️2 do validador adversarial do UTAC106c):
// a verificação de RENDER do SEG6 nasceu **ad-hoc em `%TEMP%`** (como no UTAC106b); o validador
// apontou que, sem artefacto no repo, **a prova morre com a sessão** e ninguém a pode re-correr.
// Este ficheiro é a promoção dessa verificação a artefacto VERSIONADO (GATE 14) — e é o que fecha o
// limite ℹN5 do UTAC106b («os testes são proxy de texto-fonte, não de render»).
//
// COMO FUNCIONA (instrumentos do PRÓPRIO repo, nenhum ficheiro de produção alterado):
//   · `_servidor-teste.mjs` — opções do servidor Vite dos testes (configFile:false + dedupe do React);
//   · `_ponte-ssr.mjs`      — carregado PRIMEIRO: fixa a instância única de React (regra A12);
//   · `_hook-runner.mjs`    — condutor de hooks sem DOM: os hooks REAIS correm e o estado actualiza;
//   · duplo de AppContext   — `src/pages/__tests__/_stubs/AppContext.jsx` (já existia);
//   · duplos de fronteira   — `_stubs-106c/` (react-router com REGISTO das navegações, `useAdmin`,
//                             `useTrocarPorSenhas`, componentes-filhos pesados).
//
// ⚠️ LIMITE DECLARADO: o «clique» é exercido **chamando o `onClick` do elemento React** (árvore de
// elementos) — não há DOM, hit-testing nem CSS. Prova-se «handler → estado → novo render» e o
// destino da navegação; **não** se prova layout/visibilidade. Igual ao limite que o executor já
// declarara no log do UTAC106c (§6.3).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUBS = resolve(AQUI, "_stubs-106c");
const STUB_CONTEXTO = resolve(AQUI, "..", "pages", "__tests__", "_stubs", "AppContext.jsx");

// `opcoesServidorTeste({ alias })` é quem COLOCA os aliases em `resolve.alias` (com o dedupe do
// React). ⚠️ Passar `alias` como chave de topo do `createServer` NÃO faz nada — a página recebia o
// `react-router` REAL e rebentava com «useNavigate() may be used only in the context of a <Router>».
const ALIASES_106C = [
  { find: /^\.\.\/context\/AppContext\.jsx$/,       replacement: STUB_CONTEXTO },
  { find: /^\.\.\/\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\.\/hooks\/useTrocarPorSenhas\.js$/,  replacement: `${STUBS}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/components\/ComprarFichasModal\.jsx$/,  replacement: `${STUBS}/child.jsx` },
  { find: /^\.\.\/components\/CreditoStatus\.jsx$/,       replacement: `${STUBS}/child.jsx` },
  { find: /^\.\.\/components\/PainelIndicacao\.jsx$/,     replacement: `${STUBS}/child.jsx` },
  { find: /^\.\.\/components\/BotaoLoginPrincipal\.jsx$/, replacement: `${STUBS}/child.jsx` },
  { find: /^\.\.\/\.\.\/hooks\/useAdmin\.js$/,      replacement: `${STUBS}/useAdmin.js` },
  { find: /^react-router-dom$/,                     replacement: `${STUBS}/rr.jsx` },
];

let vite = null;
let React = null;
let renderToStaticMarkup = null;
let montar = null;
let definirContexto = null;
let MinhaCarteira = null;

before(async () => {
  // O `vite` resolve-se pelo node_modules do PRÓPRIO repo (o ficheiro de teste vive lá dentro).
  const { createServer } = await import(pathToFileURL(resolve(AQUI, "..", "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES_106C }),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  MinhaCarteira = (await vite.ssrLoadModule("/src/pages/MinhaCarteira.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

// ─── utilidades sobre a ÁRVORE de elementos React ──────────────────────────────────
function arvore(raiz) {
  const fora = [];
  (function walk(n) {
    if (n == null || typeof n === "boolean") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n !== "object") return;
    fora.push(n);
    // UTAC106e — o balão do Passe passou a COMPONENTE (`ComprarPasseModal`); a árvore de ELEMENTOS
    // não desce para dentro de um componente (os filhos nascem no corpo dele, não em `props.children`).
    // Como este componente é PURO (sem hooks), chamá-lo aqui materializa o seu output SEM correr hooks
    // do React — e os botões «Cancelar»/«Confirmar» voltam a ser clicáveis. NÃO se chama o `Modal` do
    // design system (tem hooks): só se andam os `children` do elemento que ele RECEBE.
    if (typeof n.type === "function" && n.type.name === "ComprarPasseModal") {
      const saida = n.type(n.props);
      if (saida && saida.props) walk(saida.props.children);
    }
    if (n.props) walk(n.props.children);
  })(raiz);
  return fora;
}
function texto(n) {
  if (n == null || typeof n === "boolean") return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(texto).join("");
  return n.props ? texto(n.props.children) : "";
}

/** Monta a Carteira com o contexto dado e devolve { ctrl, html, botoes, clicar }. */
async function montarCarteira(contexto) {
  definirContexto(contexto);
  const ctrl = montar(MinhaCarteira, []);
  await ctrl.assentar();
  const html = () => renderToStaticMarkup(React.createElement(React.Fragment, null, ctrl.resultado()));
  const botoes = () => arvore(ctrl.resultado()).filter((n) => n.type === "button");
  const botaoCom = (t) => botoes().find((b) => texto(b).includes(t));
  async function clicar(rotulo) {
    const b = botaoCom(rotulo);
    assert.ok(b, `não encontrei o botão que contém «${rotulo}»; existem: ${JSON.stringify(botoes().map(texto))}`);
    b.props.onClick();
    await ctrl.assentar();
  }
  return { ctrl, html, botoes, botaoCom, clicar };
}

const CONECTADO = {
  isConnected: true, abrirModal: () => {}, address: "0xAbC1230000000000000000000000000000004567",
  user: { email: { address: "a@b.c" } },
  refetchSaldo: () => {}, saldoRsCentavos: 1234, saldoRsStatus: "ok",
  refetchSaldoRs: () => {}, setModalidade: () => {},
  privyWallet: null, saldoSenhas: 7, saldoSenhasStatus: "ok", userLabel: "Teste", desconectar: () => {},
};

// ═══ SEG0 — render do topo da Carteira ══════════════════════════════════════════════
test("UTAC106c/RENDER · a Carteira renderiza «Carteira» + «Saldo Disponível» em AMARELO e o VALOR", async () => {
  const { html } = await montarCarteira(CONECTADO);
  const h = html();
  // ⚠️ BURACO DE VERIFICAÇÃO FECHADO (achado do MEU próprio mutante MR1): a 1.ª versão contava
  // `#f5a623` no HTML TODO (≥2) — e o mutante que punha o TÍTULO a cinza (`COR.muted`) passava
  // VERDE, porque outros sítios do ecrã têm amarelo (o gradiente do botão do Passe, o valor do
  // saldo). Uma contagem global NÃO é uma medição do alvo (classe `verification-blindspots`).
  // Agora mede-se a COR NA PRÓPRIA TAG do título e do subtítulo.
  const mTitulo = h.match(/<h3([^>]*)>\s*Carteira\s*<\/h3>/);
  assert.ok(mTitulo, "o título «Carteira» não está no HTML renderizado");
  assert.match(mTitulo[1], /#f5a623/i, `o TÍTULO não está em amarelo: «${mTitulo[1]}»`);

  const iEtiqueta = h.indexOf("Saldo Disponível");
  assert.ok(iEtiqueta > -1, "o subtítulo «Saldo Disponível» não está no HTML");
  const iniTag = h.lastIndexOf("<", iEtiqueta);
  const tagSub = h.slice(iniTag, h.indexOf(">", iniTag));
  assert.match(tagSub, /#f5a623/i, `o SUBTÍTULO não está em amarelo: «${tagSub}»`);

  assert.ok(h.includes("R$ 12.34"), "o VALOR do saldo não renderizou");
});

test("UTAC106c/RENDER · com o balão fechado, NÃO há «Cancelar»/«Confirmar» no render inicial", async () => {
  const { html } = await montarCarteira(CONECTADO);
  const h = html();
  assert.ok(!h.includes("Cancelar") && !h.includes("Confirmar"),
    "o balão aparece aberto no 1.º render — o estado inicial tem de ser fechado");
});

test("UTAC106c/RENDER · sem login: pedido de login E sem botão do Passe (A/B do ramo)", async () => {
  const { html } = await montarCarteira({ isConnected: false, abrirModal: () => {} });
  const h = html();
  assert.ok(h.includes("Faça login"), "o ramo de não-logado perdeu o pedido de login");
  assert.ok(!h.includes("Comprar Passe Desafio"), "o botão do Passe aparece sem sessão");
});

// ═══ SEG1 — os botões e o BALÃO (por clique) ════════════════════════════════════════
// UTAC107b — a grelha de botões mudou (decisão 1/4 do operador): saiu «Trocar R$ 2,00 → 1 Senha»
// (Via A, sem caminho visível) e entrou «Ofertas Programadas»; a ordem passou a
// Depositar PIX → Comprar Passe Desafio → Menor Lance Único → Ofertas Programadas.
test("UTAC106c/RENDER · UTAC107b · os 4 botões (nova ordem) e «Trocar R$» já não existe", async () => {
  const { botoes, html } = await montarCarteira(CONECTADO);
  const rotulos = botoes().map(texto);
  assert.ok(rotulos.some((t) => t.includes("Depositar PIX")), `faltou Depositar PIX: ${JSON.stringify(rotulos)}`);
  assert.ok(rotulos.some((t) => t.includes("Comprar Passe Desafio R$ 2,00")), "faltou Comprar Passe");
  assert.ok(rotulos.some((t) => t.includes("Menor Lance Único")), "faltou Menor Lance Único");
  assert.ok(rotulos.some((t) => t.includes("Ofertas Programadas")), "faltou Ofertas Programadas");
  assert.ok(!rotulos.some((t) => t.includes("Trocar R$")), "«Trocar R$ 2,00 → 1 Senha» ainda existe (decisão 1)");
  assert.ok(!rotulos.some((t) => t.includes("Lance Relâmpago")), "«Lance Relâmpago» continua a ser rótulo");
  // ordem decidida (decisão 4): PIX antes do Passe antes do MLC antes das OP
  const t = rotulos.join("|");
  const i = (s) => t.indexOf(s);
  assert.ok(i("Depositar PIX") < i("Comprar Passe Desafio") &&
            i("Comprar Passe Desafio") < i("Menor Lance Único") &&
            i("Menor Lance Único") < i("Ofertas Programadas"),
    `a ordem dos botões não é a decidida: ${JSON.stringify(rotulos)}`);
});

test("UTAC107b/RENDER · CLICAR «Ofertas Programadas» NAVEGA para /ofertas-programadas", async () => {
  const c = await montarCarteira(CONECTADO);
  globalThis.__NAVEGADAS.length = 0;
  await c.clicar("Ofertas Programadas");
  assert.deepEqual(globalThis.__NAVEGADAS, ["/ofertas-programadas"],
    `o clique não navegou para /ofertas-programadas: ${JSON.stringify(globalThis.__NAVEGADAS)}`);
});

test("UTAC106c/RENDER · CLICAR «Menor Lance Único» NAVEGA para /mercado", async () => {
  const c = await montarCarteira(CONECTADO);
  globalThis.__NAVEGADAS.length = 0;
  await c.clicar("Menor Lance Único");
  assert.deepEqual(globalThis.__NAVEGADAS, ["/mercado"],
    `o clique não navegou para /mercado: ${JSON.stringify(globalThis.__NAVEGADAS)}`);
});

test("UTAC106c/RENDER · CLICAR «Comprar Passe» ABRE o balão (com o preço) e «Cancelar» FECHA", async () => {
  const c = await montarCarteira(CONECTADO);
  assert.ok(!c.html().includes("Cancelar"), "pré-condição: o balão devia estar fechado");
  await c.clicar("Comprar Passe Desafio R$ 2,00");
  const aberto = c.html();
  assert.ok(aberto.includes("Cancelar") && aberto.includes("Confirmar"),
    "o clique no botão NÃO abriu o balão");
  assert.ok(aberto.includes("R$ 2,00"), "o balão não mostra o preço do Passe");
  assert.match(aberto, /aria-modal="true"/, "o balão não é um diálogo modal acessível");
  await c.clicar("Cancelar");
  assert.ok(!c.html().includes("Cancelar"), "«Cancelar» NÃO fechou o balão");
});

test("UTAC106c/RENDER · CLICAR «Confirmar» NÃO navega (o balão passou a COMPRAR — UTAC106e)", async () => {
  // UTAC106e — MUDANÇA DE CONTRATO (declarada): o 106c encaminhava «Confirmar» para as Ofertas
  // Programadas. O 106e deu-lhe o trabalho real — chamar `POST /comprar-passe-pontos` e FICAR na
  // Carteira (permite compras seguidas). Este teste guarda o que NÃO se perdeu: **não navega**.
  const c = await montarCarteira(CONECTADO);
  await c.clicar("Comprar Passe Desafio R$ 2,00");
  globalThis.__NAVEGADAS.length = 0;
  await c.clicar("Confirmar");
  assert.deepEqual(globalThis.__NAVEGADAS, [],
    `«Confirmar» navegou — devia ficar na Carteira: ${JSON.stringify(globalThis.__NAVEGADAS)}`);
});

// ═══ SEG5 — BottomNav e Sidebar em SINCRONIA (por render) ═══════════════════════════
test("UTAC106c/RENDER · barra e rail: 4 principais na ordem canónica e 5 secundários em SINCRONIA", async () => {
  globalThis.__ADMIN = false;
  const BottomNav = (await vite.ssrLoadModule("/src/widgets/layout/BottomNav.jsx")).default;
  const Sidebar = (await vite.ssrLoadModule("/src/widgets/layout/Sidebar.jsx")).default;
  definirContexto(CONECTADO);
  const cB = montar(BottomNav, []); await cB.assentar();
  const cS = montar(Sidebar, []); await cS.assentar();
  const semTags = (h) => h.replace(/<[^>]+>/g, "|");

  const ROT = ["Carteira", "Menor Lance Único", "Início", "Ofertas Programadas"];
  const SEC = ["Vitrine (4 Slots)", "Programação", "Meus Ativos", "🤝 Seja nosso parceiro!", "Configurações"];
  const ordemOk = (t, lista) => lista.every((r, i) => t.indexOf(r) > -1 && (i === 0 || t.indexOf(r) > t.indexOf(lista[i - 1])));

  const tB = semTags(renderToStaticMarkup(React.createElement(React.Fragment, null, cB.resultado())));
  const tS = semTags(renderToStaticMarkup(React.createElement(React.Fragment, null, cS.resultado())));
  assert.ok(ordemOk(tB, ROT), `barra: os 4 principais fora de ordem (${JSON.stringify(ROT.map((r) => tB.indexOf(r)))})`);
  assert.ok(ordemOk(tS, ROT), `rail: os 4 principais fora de ordem (${JSON.stringify(ROT.map((r) => tS.indexOf(r)))})`);
  // ⚠️ O rail mostra os secundários SEMPRE, mas a barra guarda-os no sheet «Mais», que só existe
  // ABERTO (moreOpen=false no 1.º render). Sem abrir o sheet os rótulos dão -1 — era o check que
  // estava errado na 1.ª versão, não a app. Abre-se o sheet com um clique.
  const btnMais = arvore(cB.resultado()).find((n) => n.type === "button" && texto(n).includes("Mais"));
  assert.ok(btnMais, "não encontrei o botão «Mais» da barra");
  btnMais.props.onClick();
  await cB.assentar();
  const tB2 = semTags(renderToStaticMarkup(React.createElement(React.Fragment, null, cB.resultado())));
  assert.ok(ordemOk(tB2, SEC), `barra (sheet aberto): secundários fora de ordem (${JSON.stringify(SEC.map((r) => tB2.indexOf(r)))})`);
  assert.ok(ordemOk(tS, SEC), `rail: secundários dessincronizados da barra (${JSON.stringify(SEC.map((r) => tS.indexOf(r)))})`);
  // e o rail tem MESMO a ordem na forma antiga? (controlo negativo: a divergência era Config. antes de Parceiro)
  assert.ok(tS.indexOf("Meus Ativos") < tS.indexOf("🤝 Seja nosso parceiro!") &&
            tS.indexOf("🤝 Seja nosso parceiro!") < tS.indexOf("Configurações"),
    "a ordem antiga (Configurações antes de Parceiro) voltou ao rail");
});

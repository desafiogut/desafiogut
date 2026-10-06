// Dashboard.test.mjs — MC94.2, revisto no MC94.3.1. Renderiza a PÁGINA INTEIRA do
// Dashboard, a sério.
//
// Corre com:  node --test src/pages/__tests__/Dashboard.test.mjs
// (a partir de desafio-gut/frontend). Mesmo arnês do MeusAtivos.test.mjs: Vite
// transpila, react-dom/server renderiza, `resolve.alias` troca o AppContext, o
// IdiomaContext e o CardLance por duplos. Nenhum ficheiro do projeto muda.
//
// ⚠️ MC94.3.1 (adendo do operador, 2026-09-25) — REVERSÃO DO DESIGN DO MC94.2.
// O MC94.2 montava a especial numa SECÇÃO PRÓPRIA entre "Edição Ativa" e
// "Acesso Rápido", com a R-1 a continuar ao lado. O operador confirmou que isso
// foi um erro: a especial tem de PREENCHER O SLOT EXISTENTE. Este ficheiro testa
// o novo contrato:
//
//   • sem especial  -> o slot mostra a R-1 de sempre ("🎯 Edição Ativa")
//   • com especial  -> o slot é preenchido pela especial (marca `data-slot`),
//                      o cabeçalho da R-1 DESAPARECE, e o ícone de presente
//                      usa o TAMANHO PADRÃO do ícone, igual às outras edições (MC94.3.2)
//   • a especial continua a NÃO aparecer em "Outras Edições"
//
// ⚠️ Em SSR o `useEffect` não corre, logo o relógio de 1 s do card não avança:
// o card usa o instante do render. As datas são RELATIVAS ao relógio real — uma
// data fixa caducaria no dia do evento (achado da validação do MC94.1).

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
// ⚠️ React e o renderizador vêm do MESMO pipeline do servidor (`_ponte-ssr.mjs`), não do Node:
// importá-los pelo Node dá uma instância diferente da que o componente recebe pelo runner SSR,
// deixando o `ReactCurrentDispatcher` a null (`Cannot read properties of null (reading 'useState')`).
let React = null;
let renderToStaticMarkup = null;
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";
import { opcoesServidorTeste, ALIASES } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUBS = caminho(AQUI, "_stubs");
let vite = null;
let Pagina = null;
let MemoryRouter = null;
let definirContexto = null;
// UTAC000.9 (DEBT-008)
let definirResultadoOficial = null;
let edicoesPedidas = null;
// UTAC107c
let definirPontos = null;
let chamadasPontos = null;
let estadoPasse = null;

before(async () => {
  vite = await createServer({
      ...opcoesServidorTeste(),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    resolve: {
      alias: [...ALIASES, 
        { find: /^\.\.\/context\/AppContext\.jsx$/,    replacement: `${STUBS}/AppContext.jsx` },
        { find: /^\.\.\/context\/IdiomaContext\.jsx$/, replacement: `${STUBS}/IdiomaContext.jsx` },
        { find: /^\.\.\/components\/CardLance\.jsx$/,  replacement: `${STUBS}/CardLance.jsx` },
        // UTAC000.9 (DEBT-008) — o resultado OFICIAL é o que este ficheiro controla.
        { find: /^\.\.\/hooks\/useResultadoOficial\.js$/, replacement: `${STUBS}/useResultadoOficial.js` },
        // UTAC107c — os pontos de CARTÃO do tile «Passe Desafio».
        { find: /^\.\.\/hooks\/usePontos\.js$/, replacement: `${STUBS}/usePontos.js` },
      ],
    },
  });
  // A ponte PRIMEIRO: é ela que fixa a instância de React do processo.
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule(`${STUBS}/AppContext.jsx`));
  // UTAC000.9 — duplo do resultado oficial (mesmo ficheiro usado pelos testes do MeusAtivos).
  ({ definirResultadoOficial, argumentos: edicoesPedidas } =
    await vite.ssrLoadModule(`${STUBS}/useResultadoOficial.js`));
  ({ definirPontos, chamadasPontos } = await vite.ssrLoadModule(`${STUBS}/usePontos.js`));
  // react-router-dom é CJS: carregado pelo node, que é o que o Vite externaliza em SSR.
  ({ MemoryRouter } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ default: Pagina, estadoPasse } = await vite.ssrLoadModule("/src/pages/Dashboard.jsx"));
});
after(async () => { if (vite) await vite.close(); });

const H = 3_600_000;
const iso = (ms) => new Date(ms).toISOString();
const especial = (inicioMs, extra = {}) => ({
  id: "ESPECIAL-AIRFRYER", tipo: "programado", produto: "Air Fryer",
  inicio_em: iso(inicioMs), termino_em: iso(inicioMs + H / 2),
  status: "agendado", imagem_url: "/artes/edicao-especial-airfryer.jpg", lances: 0, ...extra,
});
const R1 = { id: "R-1", tipo: "relampago", produto: null, termino_em: iso(Date.now() + 24 * H), lances: 0, status: "aberto" };

function renderizar(contexto = {}) {
  definirContexto({
    lances: [], vencedor: null,
    saldoSenhas: null, saldoSenhasStatus: "idle", saldoRsCentavos: null, saldoRsStatus: "idle",
    authToken: null, fecharOverlay: () => {},
    encerrado: false, modalidade: "flash", DURACAO: { flash: 1800, programado: 86400 },
    pareceAutenticado: false, address: null, userLabel: null, EDICAO_ATIVA: "R-1",
    showOverlay: false, showCountdown: false, handleNovaRodada: () => {}, setPrazoTimestamp: () => {},
    edicoes: { "R-1": R1 }, agendadas: {}, offsetRelogioMs: 0,
    isConnected: false, ready: true, abrirModal: () => {}, desconectar: () => {},
    ...contexto,
  });
  return renderToStaticMarkup(
    React.createElement(MemoryRouter, null, React.createElement(Pagina)),
  );
}
const texto = (html) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
/** O corpo da especial DENTRO do slot (marca `data-slot`, desde o MC94.3.1). */
const dentroDoSlot = (html) => /data-slot="edicao-especial"/.test(html);
/** Lado do ícone de presente, em px, tal como saiu no `style` inline. */
const ladoDoBanner = (html) => html.match(/width:\s*(\d+)px;\s*height:\s*\d+px;\s*flex-shrink:\s*0;\s*border-radius:\s*\d+px;\s*overflow:\s*hidden/)?.[1] ?? null;

// ───────────────────────────────────────────────────────────────────────────
// UTAC000.9 (DEBT-008) — o vencedor mostrado no Dashboard é o OFICIAL.
// Antes: derivava dos lances locais (`vencedor` do contexto = «o menor único que este browser
// viu»). Em mainnet o browser vê pouco ou nada da edição (medido no UTAC000.8 §-1.9).
// ⚠️ UTAC107c — o card «🏆 Menor Lance Único» SAIU do Início. O vencedor só aparece agora no
// OVERLAY de fim de edição (`FimEdicaoOverlay`), por isso as provas passaram do card para ele.
describe("UTAC000.9 · Dashboard — o vencedor mostrado é o OFICIAL", () => {
  const EU    = "0xaaaa000000000000000000000000000000000001";
  const OUTRO = "0xbbbb000000000000000000000000000000000002";
  // ⚠️ CASO DISCRIMINANTE: o local (100, OUTRO) ≠ o oficial (300, EU). Com o fix o card tem de
  // mostrar o OFICIAL; sem ele mostrava o local — é isso que faz o teste morder.
  const LOCAL  = { endereco: OUTRO, valor: 100 };
  const OFICIAL = { consolidado: true, vencedor: EU, menorUnicoCentavos: 300 };
  const abrev = (e) => `${e.slice(0, 10)}...${e.slice(-6)}`;

  test("com resultado oficial: o overlay mostra o ENDEREÇO e o VALOR oficiais", () => {
    definirResultadoOficial(OFICIAL);
    const html = renderizar({ vencedor: LOCAL, encerrado: true, showOverlay: true });
    assert.ok(html.includes(abrev(EU)), "o overlay não mostra o endereço do vencedor OFICIAL");
    assert.ok(html.includes("R$ 3.00"), "o overlay não mostra o valor do menor único OFICIAL");
    assert.ok(!html.includes("R$ 1.00"), "o overlay continua a mostrar o vencedor LOCAL");
  });

  test("SEM resultado oficial: o overlay mantém o apuramento local (zero regressões)", () => {
    definirResultadoOficial(null);
    const html = renderizar({ vencedor: LOCAL, encerrado: true, showOverlay: true });
    assert.ok(html.includes(abrev(OUTRO)), "o overlay deixou de mostrar o vencedor local");
    assert.ok(html.includes("R$ 1.00"), "o overlay deixou de mostrar o valor local");
  });

  test("o vencedor SÓ aparece no overlay — o Início deixou de o mostrar (UTAC107c)", () => {
    // Prova por CONTAGEM (sem marcador no markup do overlay): sem overlay, o endereço do
    // vencedor oficial aparece ZERO vezes (o card 🏆 saiu); com ele, UMA. O local, nenhuma.
    const contar = (s, alvo) => s.split(alvo).length - 1;
    definirResultadoOficial(OFICIAL); // ⚠️ ANTES dos dois renders (é estado de módulo do duplo)
    const semOverlay = renderizar({ vencedor: LOCAL, encerrado: true, showOverlay: false });
    const comOverlay = renderizar({ vencedor: LOCAL, encerrado: true, showOverlay: true });
    assert.equal(contar(semOverlay, abrev(EU)), 0, "o Início continua a mostrar o vencedor (o card 🏆 voltou?)");
    assert.equal(contar(comOverlay, abrev(EU)), 1, "o overlay NÃO recebeu o vencedor oficial");
    assert.equal(contar(comOverlay, abrev(OUTRO)), 0, "o overlay mostra o vencedor LOCAL");
  });

  test("cablagem: o Dashboard pede o resultado da EDIÇÃO ACTIVA", () => {
    definirResultadoOficial(null);
    renderizar({ vencedor: LOCAL });
    assert.deepEqual(edicoesPedidas(), ["R-1"], "o Dashboard não pediu o resultado da edição activa");
  });
});

describe("MC94.2/MC94.3.1 · Dashboard — a edição especial NO SLOT", () => {
  test("antes da hora (em `agendadas`): a especial preenche o slot, com arte e cronómetro", () => {
    const html = renderizar({ agendadas: { "ESPECIAL-AIRFRYER": especial(Date.now() + 5 * H) } });
    assert.ok(dentroDoSlot(html), "a especial não apareceu no slot");
    assert.match(html, /data-estado="agendada"/);
    assert.match(html, /src="\/artes\/edicao-especial-airfryer\.jpg"/);
    assert.match(html, /role="timer"/);
  });

  test("⛔ a secção própria do MC94.2 DESAPARECEU (o teste que o MC94.2 tinha exigia o contrário)", () => {
    const html = renderizar({ agendadas: { "ESPECIAL-AIRFRYER": especial(Date.now() + 5 * H) } });
    assert.doesNotMatch(html, /data-secao="edicao-especial"/, "o antigo marcador de secção voltou");
    const t = texto(html);
    // O resto da página continua (os tiles e os atalhos ficam — UTAC107c: o card
    // «Menor Lance Único» saiu), mas o CABEÇALHO do slot deixa de dizer "🎯 Edição
    // Ativa": quem o preenche é a especial, e o cabeçalho tem de dizê-lo.
    assert.match(t, /Edição especial/, "o cabeçalho da especial");
    assert.doesNotMatch(t, /🎯 Edição Ativa/, "o slot continuava a dizer 'Edição Ativa' com a especial lá dentro");
    assert.match(t, /Passe Desafio/, "os tiles desapareceram da página");
    assert.match(t, /Acesso Rápido/, "os atalhos desapareceram da página");
  });

  test("a especial fica DENTRO do slot — depois dos tiles, antes do 'Acesso Rápido'", () => {
    const html = renderizar({ agendadas: { "ESPECIAL-AIRFRYER": especial(Date.now() + 5 * H) } });
    const iEsp = html.indexOf("data-slot=\"edicao-especial\"");
    const iPasse = html.indexOf("Passe Desafio");
    assert.ok(iEsp >= 0 && iPasse >= 0 && iPasse < iEsp, `ordem errada: tiles=${iPasse} slot=${iEsp}`);
    // e ANTES de "Outras Edições"/"Acesso Rápido" (não é uma secção de topo)
    const iRapido = html.indexOf("Acesso Rápido");
    assert.ok(iRapido > iEsp, "a especial ficou depois do Acesso Rápido");
  });

  test("MC94.3.2 — o ícone da especial é IGUAL ao padrão das outras edições (não maior)", () => {
    // Medido no SEG-1: o padrão é 52 px (default do EdicaoBanner e o que a R-1 usa).
    // O MC94.3.1 tinha-o subido a 96 px SÓ na especial; o operador corrigiu: a
    // especial tem de ficar IGUAL, não maior. Este teste exige a IGUALDADE — não
    // um literal — para que uma futura alteração do padrão não volte a divergir.
    const comEspecial = renderizar({ agendadas: { "ESPECIAL-AIRFRYER": especial(Date.now() + 5 * H) } });
    const semEspecial = renderizar();
    const ladoEspecial = ladoDoBanner(comEspecial);
    const ladoR1 = ladoDoBanner(semEspecial);
    assert.ok(ladoEspecial, "não medi o ícone da especial");
    assert.equal(ladoEspecial, ladoR1, `a especial (${ladoEspecial}px) difere do padrão da R-1 (${ladoR1}px)`);
    assert.equal(ladoEspecial, "52", "o padrão medido no SEG-1 é 52 px");
  });

  test("sem especial: nenhuma marca de slot, e a página é a de sempre", () => {
    const html = renderizar();
    assert.equal(dentroDoSlot(html), false, "apareceu um card especial sem haver especial");
    const t = texto(html);
    for (const s of ["🎯 Edição Ativa", "Passe Desafio", "Acesso Rápido"]) assert.match(t, new RegExp(s));
    assert.doesNotMatch(t, /🎁 Edição especial/);
  });

  test("a contagem do slot usa o offset do servidor que vem do contexto", () => {
    // Aparelho 3 h adiantado: pelo relógio dele a especial já teria acabado.
    // Na hora do servidor faltam ~2 h.
    const offset = -3 * H;
    const html = renderizar({
      agendadas: { "ESPECIAL-AIRFRYER": especial(Date.now() + offset + 2 * H) },
      offsetRelogioMs: offset,
    });
    assert.match(html, /data-estado="agendada"/, "o offset não chegou ao card");
    assert.match(texto(html), /0[12] horas/);
  });

  // MC94.4.1 — era "pago em senha" (R18 antiga do MC94.1). O operador reverteu: a
  // especial é RELÂMPAGO e o lance debita SALDO R$ a partir de R$ 0,01.
  test("na hora (já em `edicoes`): o formulário é o da ESPECIAL, pago em SALDO (flash)", async () => {
    const ctx = { edicoes: { "R-1": R1, "ESPECIAL-AIRFRYER": especial(Date.now() - 60_000, { status: "aberto" }) } };
    // O CardLance é lazy: o 1.º render em SSR dá o espaço reservado e dispara o
    // import. ⚠️ Uma 1.ª versão deste teste aceitava "duplo OU espaço reservado"
    // e, medido, corria SEMPRE o ramo do espaço reservado — a asserção do id
    // nunca executava. O lazy fica em cache depois de resolvido, por isso
    // re-renderiza-se e EXIGE-SE o formulário, sem alternativa.
    const primeiro = renderizar(ctx);
    assert.match(primeiro, /data-estado="activa"/);
    assert.match(primeiro, /aria-busy="true"/, "espaço reservado enquanto carrega");
    let html = "";
    for (let i = 0; i < 50 && !/data-stub="card-lance"/.test(html); i++) {
      await new Promise((r) => setTimeout(r, 20));
      html = renderizar(ctx);
    }
    assert.match(html, /data-stub="card-lance"/, "o formulário nunca chegou");
    assert.match(html, /data-id-edicao="ESPECIAL-AIRFRYER"/, "licitaria noutra edição");
    assert.match(html, /data-tipo="flash"/, "a especial debita SALDO R$ (MC94.4.1), não senha");
    assert.match(html, /data-encerrado="false"/);
    // O botão do slot da R-1 desapareceu com a especial lá dentro.
    assert.doesNotMatch(texto(html), /Ir para o Mercado de Lances/, "o botão da R-1 ficou no slot da especial");
  });

  test("na hora, a especial NÃO aparece também em 'Outras Edições'", () => {
    const html = renderizar({
      edicoes: { "R-1": R1, "ESPECIAL-AIRFRYER": especial(Date.now() - 60_000, { status: "aberto" }) },
    });
    assert.doesNotMatch(texto(html), /Outras Edições/, "desenhada duas vezes");
    // Contagem directa: a especial tem de aparecer UMA vez em todo o ecrã.
    const vezes = (texto(html).match(/Air Fryer/g) || []).length;
    assert.equal(vezes, 1, `a especial apareceu ${vezes} vezes no ecrã`);
  });

  test("'Outras Edições' continua a mostrar as outras", () => {
    const relamp = { id: "RELAMP-3", tipo: "relampago", produto: "Smart TV", termino_em: "2026-05-31T03:52:13.827Z", lances: 0, status: "encerrado" };
    const html = renderizar({
      edicoes: { "R-1": R1, "RELAMP-3": relamp, "ESPECIAL-AIRFRYER": especial(Date.now() - 60_000, { status: "aberto" }) },
    });
    assert.match(texto(html), /Outras Edições/);
    assert.match(html, /Smart TV/);
  });

  test("uma PROG-* em `agendadas` não vira card especial", () => {
    const html = renderizar({ agendadas: { "PROG-9": { ...especial(Date.now() + H), id: "PROG-9" } } });
    assert.equal(dentroDoSlot(html), false);
    assert.match(texto(html), /🎯 Edição Ativa/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// UTAC107c — Início: tile «Passe Desafio» (era «Senhas») e o card 🏆 removido.
// ⚠️ Substitui o bloco do UTAC000.12 (DEBT-012), que testava o VALOR do card «🏆 Menor Lance
// Único»: o card saiu do Início (R18-A do UTAC107a-front), logo a guarda que ele protegia saiu
// com ele. O valor do vencedor só se mostra agora no `FimEdicaoOverlay`, que tem a sua própria
// guarda e o seu próprio teste (`utac00014-fim-edicao-overlay.test.mjs`, DEBT-013).
describe("UTAC107c · Início — Passe Desafio, destino e remoções", () => {
  const COM_SESSAO = { address: "0xaaaa000000000000000000000000000000000001", authToken: "tok-user-session" };

  /** O <button> do tile cujo rótulo contém `rotulo` (o StatTile é um <button>). */
  function tile(html, rotulo) {
    const botoes = html.match(/<button[\s\S]*?<\/button>/g) || [];
    return botoes.find((b) => texto(b).includes(rotulo)) ?? null;
  }

  test("o tile «Senhas» saiu e o «Passe Desafio» entrou no lugar dele (2.º tile)", () => {
    definirResultadoOficial(null);
    definirPontos({ pontos: 14, pontosCartao: 12 });
    const html = renderizar(COM_SESSAO);
    const t = texto(html);
    assert.doesNotMatch(t, /\bSenhas\b/, "o tile «Senhas» continua no Início");
    assert.ok(tile(html, "Passe Desafio"), "o tile «Passe Desafio» não existe");
    const ordem = ["Saldo (R$)", "Passe Desafio", "Lances Únicos", "Total de Lances"].map((r) => t.indexOf(r));
    assert.ok(ordem.every((i) => i >= 0), `faltam tiles: ${ordem}`);
    assert.deepEqual([...ordem].sort((a, b) => a - b), ordem, "a ordem dos 4 tiles mudou");
  });

  test("o número é `pontosCartao` «X / 50» — não o total, nem as senhas", () => {
    definirPontos({ pontos: 14, pontosCartao: 12, pontosParaCartao: 50 });
    const html = renderizar({ ...COM_SESSAO, saldoSenhas: 7, saldoSenhasStatus: "ok" });
    const b = tile(html, "Passe Desafio");
    assert.ok(texto(b).includes("12 / 50"), `esperava «12 / 50»; o tile diz: «${texto(b)}»`);
    assert.ok(!texto(b).includes("14"), "o tile mostra o TOTAL (compras + bónus), não os pontos de cartão");
    assert.ok(!/\b7\b/.test(texto(b)), "o tile mostra as SENHAS on-chain (Via A)");
    assert.ok(chamadasPontos() > 0, "controlo: a página não chamou o `usePontos`");
  });

  test("clicar no Passe leva às Ofertas Programadas (não à Carteira)", async () => {
    // O StatTile navega com `navigate(to)`; em SSR não há clique, por isso a prova é a rota que
    // o tile recebe, lida da fonte: o objecto do tile tem de apontar para /ofertas-programadas.
    const { readFileSync } = await import("node:fs");
    const fonte = readFileSync(caminho(AQUI, "../Dashboard.jsx"), "utf8");
    const bloco = fonte.match(/const passeStat = \{[\s\S]*?\};/)?.[0];
    assert.ok(bloco, "o objecto do tile «Passe Desafio» (`passeStat`) desapareceu");
    assert.match(bloco, /to:\s*"\/ofertas-programadas"/, "o Passe não leva às Ofertas Programadas");
    assert.doesNotMatch(bloco, /"\/carteira"/, "o Passe ainda leva à Carteira");
    assert.match(fonte, /\n\s*passeStat,\s*\r?\n/, "o tile não entra na lista `stats`");
  });

  test("a carregar: skeleton, nunca «0 / 50» prematuro", () => {
    definirPontos({ loading: true });
    const b = tile(renderizar(COM_SESSAO), "Passe Desafio");
    assert.match(b, /data-testid="passe-skeleton"/, "sem skeleton durante o carregamento");
    assert.doesNotMatch(texto(b), /\/ 50/, "mostrou um número enquanto carregava");
  });

  test("sessão ainda a cunhar o token: skeleton (o hook devolve 0 nesse intervalo)", () => {
    definirPontos({ loading: false, pontosCartao: 0 });
    const b = tile(renderizar({ ...COM_SESSAO, authToken: null }), "Passe Desafio");
    assert.match(b, /data-testid="passe-skeleton"/, "mostrou «0 / 50» antes do token chegar");
  });

  test("erro: o número fica oculto («—»), sem «0 / 50» falso", () => {
    definirPontos({ erro: "Não foi possível carregar os pontos", pontosCartao: 0 });
    const b = tile(renderizar(COM_SESSAO), "Passe Desafio");
    assert.doesNotMatch(texto(b), /\d+ \/ 50/, "mostrou um número com o pedido em erro");
    assert.doesNotMatch(b, /passe-skeleton/, "o erro ficou preso no skeleton");
    assert.match(texto(b), /—/, "o erro devia mostrar «—»");
  });

  test("vazio: «0 / 50» com convite para começar", () => {
    definirPontos({ pontosCartao: 0 });
    const b = tile(renderizar(COM_SESSAO), "Passe Desafio");
    assert.match(texto(b), /0 \/ 50/);
    assert.match(texto(b), /comece já/, "sem convite no estado vazio");
  });

  test("sem conta: «—» (não há pontos de ninguém a mostrar)", () => {
    definirPontos({ pontosCartao: 0 });
    const b = tile(renderizar({ address: null, authToken: null }), "Passe Desafio");
    assert.doesNotMatch(texto(b), /\/ 50/);
    assert.match(texto(b), /—/);
  });

  test("os KPIs «Lances Únicos» e «Total de Lances» FICAM (R18-A do UTAC107c)", () => {
    definirPontos({});
    const html = renderizar({ lances: [{ repetido: false }, { repetido: true }, { repetido: false }] });
    assert.match(texto(tile(html, "Lances Únicos")), /\b2\b/);
    assert.match(texto(tile(html, "Total de Lances")), /\b3\b/);
  });

  test("o card «🏆 Menor Lance Único» saiu do Início (com e sem vencedor)", () => {
    definirPontos({});
    definirResultadoOficial(null);
    const EU = "0xaaaa000000000000000000000000000000000001";
    for (const vencedor of [null, { endereco: EU, valor: 300 }]) {
      const t = texto(renderizar({ vencedor, encerrado: true }));
      assert.doesNotMatch(t, /🏆/, "o troféu continua no Início");
      assert.doesNotMatch(t, /Menor Lance Único/, "o card «Menor Lance Único» continua no Início");
      assert.doesNotMatch(t, /Nenhum lance único ainda/, "o estado vazio do card continua no Início");
    }
  });

  test("Regra 1: o título «Outras Edições» fica DENTRO de vidro", () => {
    definirPontos({});
    const relamp = { id: "RELAMP-3", tipo: "relampago", produto: "Smart TV", termino_em: "2026-05-31T03:52:13.827Z", lances: 0, status: "encerrado" };
    const html = renderizar({ edicoes: { "R-1": R1, "RELAMP-3": relamp } });
    const i = html.indexOf("Outras Edições");
    assert.ok(i > 0, "controlo: o título não foi renderizado");
    const antes = html.slice(0, i);
    const abre = antes.lastIndexOf("gut-glass-standard");
    const fecha = antes.lastIndexOf("</div>");
    assert.ok(abre > fecha, "o título «Outras Edições» está fora de um contentor de vidro");
  });

  // ⚠️ Achado do validador adversarial (UTAC107c): na sequência REAL o par address+authToken fica
  // completo (ou muda) UM commit antes de o `usePontos` voltar a pedir — com `loading:false` e
  // `pontosCartao:0`. Em SSR não há 2.º commit, por isso a regra testa-se na função pura, em sequência.
  describe("estadoPasse — sequências reais (sem «0 / 50» prematuro)", () => {
    const A = "0xAAAA000000000000000000000000000000000001";
    const B = "0xbbbb000000000000000000000000000000000002";
    const VAZIO = { loading: false, erro: "", pontosCartao: 0 };
    const correr = (passos) => { const memo = { chave: null, pendente: false }; return passos.map((p) => estadoPasse(memo, p)); };

    test("login: address antes do token → nunca «vazio» antes de o hook pedir", () => {
      assert.deepEqual(correr([
        { address: null, authToken: null, ...VAZIO },
        { address: A, authToken: null, ...VAZIO },
        { address: A, authToken: "t1", ...VAZIO },              // o commit perigoso
        { address: A, authToken: "t1", ...VAZIO, loading: true },
        { address: A, authToken: "t1", ...VAZIO, pontosCartao: 12 },
      ]), ["sem-sessao", "carregando", "carregando", "carregando", "dados"]);
    });

    test("refresh: token em cache, address chega depois → idem", () => {
      assert.deepEqual(correr([
        { address: null, authToken: "t1", ...VAZIO },
        { address: A, authToken: "t1", ...VAZIO },
        { address: A, authToken: "t1", ...VAZIO, loading: true },
        { address: A, authToken: "t1", ...VAZIO },
      ]), ["sem-sessao", "carregando", "carregando", "vazio"]);
    });

    test("troca de conta: os pontos de A não aparecem como sendo de B", () => {
      assert.deepEqual(correr([
        { address: A, authToken: "t1", ...VAZIO, pontosCartao: 12 },
        { address: B, authToken: "t2", ...VAZIO, pontosCartao: 12 }, // dados ainda de A
        { address: B, authToken: "t2", ...VAZIO, loading: true },
        { address: B, authToken: "t2", ...VAZIO, pontosCartao: 3 },
      ]), ["dados", "carregando", "carregando", "dados"]);
    });

    test("mount com o par completo: sem espera a mais; caixa do endereço não conta como troca", () => {
      assert.deepEqual(correr([
        { address: A, authToken: "t1", ...VAZIO, pontosCartao: 5 },
        { address: A.toLowerCase(), authToken: "t1", ...VAZIO, pontosCartao: 5 },
      ]), ["dados", "dados"]);
    });

    test("pontosCartao não numérico/negativo → «erro» (nunca «NaN / 50»)", () => {
      for (const v of [NaN, "12", -1, 1.5, undefined]) {
        assert.equal(correr([{ address: A, authToken: "t1", ...VAZIO, pontosCartao: v }])[0], "erro", String(v));
      }
    });
  });
});

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
// UTAC108h.2 — a separação das edições não-ativas nas duas prateleiras (função pura).
let prateleirasDeEdicoes = null;
// UTAC109f
let definirEmBreve = null;
let getEstadoEdicao = null;

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
        // UTAC109f — o `EM_BREVE_MODE` real é a constante `true`; o duplo (UTAC108d) deixa testar os DOIS ramos
        // (vidro Relâmpago vazio / com edição; P1 «palpite já!» só existe com a edição ATIVA). Default = true.
        { find: /^\.\.\/lib\/leilaoLock\.js$/, replacement: `${STUBS}/leilaoLock.js` },
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
  ({ default: Pagina, estadoPasse, prateleirasDeEdicoes } = await vite.ssrLoadModule("/src/pages/Dashboard.jsx"));
  ({ definirEmBreve } = await vite.ssrLoadModule(`${STUBS}/leilaoLock.js`));
  ({ getEstadoEdicao } = await vite.ssrLoadModule("/src/utils/edicao.js"));
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
    const ladoEspecial = ladoDoBanner(comEspecial);
    assert.ok(ladoEspecial, "não medi o ícone da especial");
    // UTAC108h.3 — a comparação era com o banner da R-1, que entretanto passou a ser um
    // `CartaoEdicao` (arte com `aspect-ratio`, sem aquele padrão de width/height inline), pelo que
    // a igualdade deixaria de medir o que media. O que este teste protege — «a especial NÃO é maior
    // do que o padrão» — passa a medir-se contra o padrão declarado no SEG-1.
    assert.equal(ladoEspecial, "52", "a especial deixou de usar o tamanho padrão (52 px)");
  });

  test("sem especial: nenhuma marca de slot, e a página é a de sempre", () => {
    const html = renderizar();
    assert.equal(dentroDoSlot(html), false, "apareceu um card especial sem haver especial");
    const t = texto(html);
    // UTAC108h.3 — o Início passou a mostrar os DOIS vidros por família (saiu o «🎯 Edição Ativa»).
    for (const s of ["⚡ Relâmpago", "🎫 Programada", "Passe Desafio", "Acesso Rápido"]) assert.match(t, new RegExp(s));
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

  test("na hora, a especial NÃO é desenhada TAMBÉM nas prateleiras (UTAC108h.2)", () => {
    const html = renderizar({
      edicoes: { "R-1": R1, "ESPECIAL-AIRFRYER": especial(Date.now() - 60_000, { status: "aberto" }) },
    });
    // ⚠️ UTAC108h.2 — esta guarda procurava a AUSÊNCIA do título «Outras Edições». Com a
    // prateleira única substituída por DUAS, esse título deixou de existir e a asserção antiga
    // (`doesNotMatch /Outras Edições/`) passaria VERDE por aritmética, não por medição — o
    // buraco que a skill `verification-blindspots` descreve. Mede-se agora o ALVO: nenhuma
    // prateleira pode conter a especial.
    // ⚠️ A âncora é `prateleira-` (não `prateleira-scroll`): neste cenário NÃO há edições
    // extra (só a ativa e a especial, ambas excluídas), logo as duas prateleiras ficam VAZIAS
    // e o que existe é `prateleira-vazia`. Ancorar no carrossel dava «controlo falhou» — erro
    // meu na 1.ª versão, apanhado pela própria asserção de controlo.
    // UTAC108h.3 — deixou de haver prateleiras: a especial ocupa o vidro «⚡ Relâmpago» e não pode
    // aparecer TAMBÉM dentro de um `CartaoEdicao` (o vidro das famílias).
    assert.ok(html.indexOf('data-slot="edicao-especial"') > 0, "controlo: a especial não renderizou");
    // A especial ocupa o lugar do vidro «⚡ Relâmpago»: NÃO pode ao mesmo tempo criar um vidro de
    // família. Neste cenário só o vidro da Programada é um `CartaoEdicao` — e é isso que se mede
    // (a versão anterior deste assert fatiar até ao FIM apanhava esse vidro e dava um falso alarme).
    assert.equal((html.match(/data-testid="cartao-edicao"/g) || []).length, 1,
      "a especial criou também um vidro de família (ficaria duas vezes no ecrã)");
    // Contagem directa: a especial tem de aparecer UMA vez em todo o ecrã.
    const vezes = (texto(html).match(/Air Fryer/g) || []).length;
    assert.equal(vezes, 1, `a especial apareceu ${vezes} vezes no ecrã`);
  });

  test("uma PROG-* em `agendadas` não vira card especial", () => {
    const html = renderizar({ agendadas: { "PROG-9": { ...especial(Date.now() + H), id: "PROG-9" } } });
    assert.equal(dentroDoSlot(html), false);
    assert.match(texto(html), /⚡ Relâmpago/); // UTAC108h.3: o vidro da família, sempre presente
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

  // UTAC108h.2 — passou a haver DOIS títulos de prateleira, e ambos ficam SEMPRE visíveis
  // (decisão P-2b). O alvo é medido pelo <h3> da prateleira, não por uma contagem na página:
  // «⚡ Relâmpago» também aparece como RÓTULO dentro do card da Edição Ativa (Dashboard.jsx:434),
  // e uma busca solta apanhá-lo-ia em vez do título.
  test("Regra 1: os títulos das DUAS prateleiras ficam DENTRO de vidro", () => {
    definirPontos({});
    const relamp = { id: "RELAMP-3", tipo: "relampago", produto: "Smart TV", termino_em: "2026-05-31T03:52:13.827Z", lances: 0, status: "encerrado" };
    const html = renderizar({ edicoes: { "R-1": R1, "RELAMP-3": relamp } });
    for (const titulo of ["⚡ Relâmpago", "🎫 Programada"]) {
      const m = html.match(new RegExp(`<h3[^>]*>\\s*${titulo}\\s*</h3>`));
      assert.ok(m, `o título «${titulo}» não foi renderizado como <h3> da prateleira`);
      const antes = html.slice(0, html.indexOf(m[0]));
      const abre = antes.lastIndexOf("gut-glass-standard");
      const fecha = antes.lastIndexOf("</div>");
      assert.ok(abre > fecha, `o título «${titulo}» está fora de um contentor de vidro`);
    }
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

// ═══ UTAC107g → UTAC109f — «Acesso Rápido» ════════════════════════════════════════════════════════
// O contrato do 107g (Vitrine · Meus Ativos · Configurações) foi SUBSTITUÍDO pelo enunciado do 109f:
// Carteira · Regras · Suporte · Perfil (R18-B «Perfil» → /configuracoes; R18-C «Suporte» → e-mail oficial).
// Os 3 destinos do 107g continuam no menu «Mais»; o que o 107g proibia (Depositar PIX, Converter Ficha)
// continua proibido.
describe("UTAC109f · Início — acessos rápidos", () => {
  /** Os elementos [data-atalho] da secção dos acessos rápidos (só dela). */
  function atalhos(html) {
    const i = html.indexOf('data-testid="acessos-rapidos"');
    assert.ok(i >= 0, "a secção dos acessos rápidos desapareceu");
    const bloco = html.slice(i, html.indexOf("</section>", i));
    return [...bloco.matchAll(/<(a|button)\b([^>]*data-atalho="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g)]
      .map((m) => ({ tag: m[1], attrs: m[2], nome: m[3], texto: texto(m[4]) }));
  }

  test("EXACTAMENTE 4 acessos, por esta ordem: Carteira · Regras · Suporte · Perfil (ícone + rótulo)", () => {
    definirResultadoOficial(null);
    const r = atalhos(renderizar());
    assert.deepEqual(r.map((a) => a.nome), ["Carteira", "Regras", "Suporte", "Perfil"]);
    for (const a of r) assert.match(a.texto, new RegExp(`^\\S+ ${a.nome}$`), `«${a.texto}» não é ícone + rótulo`);
  });

  test("toque ≥ 48 px e o MESMO estilo/cor nos 4 (padronizados)", () => {
    const r = atalhos(renderizar());
    assert.equal(r.length, 4);
    for (const a of r) {
      assert.match(a.attrs, /min-height:\s*48px/, `${a.nome} sem alvo de 48 px`);
      assert.match(a.attrs, /color:\s*#f5a623/, `${a.nome} com outra cor`);
    }
    const estilos = r.map((a) => a.attrs.match(/style="([^"]*)"/)?.[1]);
    assert.equal(new Set(estilos).size, 1, "os 4 acessos não partilham o mesmo estilo");
  });

  test("destinos: /carteira, /regras-oficiais, mailto do suporte, /configuracoes", async () => {
    const { readFileSync } = await import("node:fs");
    const fonte = readFileSync(caminho(AQUI, "../Dashboard.jsx"), "utf8");
    const bloco = fonte.match(/export const ATALHOS = \[[\s\S]*?\];/)?.[0];
    assert.ok(bloco, "o array ATALHOS desapareceu");
    const destinos = [...bloco.matchAll(/\b(to|href):\s*[`"]([^`"]+)[`"]/g)].map((m) => m[2]);
    assert.deepEqual(destinos, ["/carteira", "/regras-oficiais", "mailto:${EMAIL_SUPORTE}", "/configuracoes"]);
    // V14 — no desktop (SSR = não-mobile) os 4 numa linha; o 2×2 é só do telemóvel
    const html = renderizar();
    const i = html.indexOf('data-testid="acessos-rapidos"');
    assert.match(html.slice(i, html.indexOf("</section>", i)), /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
    const sup = atalhos(renderizar()).find((a) => a.nome === "Suporte");
    assert.equal(sup.tag, "a");
    assert.match(sup.attrs, /href="mailto:desafiogut01@gmail\.com"/, "o Suporte não aponta ao e-mail oficial");
    for (const a of atalhos(renderizar()).filter((x) => x.nome !== "Suporte")) assert.equal(a.tag, "button");
  });

  test("os atalhos que o 107g tirou continuam fora do Início", () => {
    const t = texto(renderizar());
    for (const s of ["Depositar PIX", "Converter Ficha", "Vitrine 4 Slots"]) assert.ok(!t.includes(s), `«${s}» voltou ao Início`);
  });
});

// ═══ UTAC109f — ORDEM FINAL, GLASS FINAL, P1/P2/P4 ══════════════════════════════════════════════════
describe("UTAC109f · Início — ordem final e pendências do 109e", () => {
  const PROG = { id: "PROG-1", tipo: "programado", produto: "Air Fryer", termino_em: iso(Date.now() + 5 * H), lances: 0, status: "aberto", imagem_url: "/artes/p.png" };
  /** O <article> do cartão que contém `marca` (os cartões não se aninham). */
  const fatia = (html, marca) => {
    const i = html.indexOf(marca); assert.ok(i >= 0, `não encontrei ${marca}`);
    const ini = html.lastIndexOf("<article", i);
    return html.slice(ini, html.indexOf("</article>", i) + "</article>".length);
  };

  test("a ordem dos 6 blocos: carrossel → 4 glass pequenos → MLC → OP → acessos → glass final", () => {
    definirPontos({}); definirResultadoOficial(null);
    const html = renderizar({ edicoes: { "R-1": R1, "PROG-1": PROG } });
    const marcas = ["guto-1.png?v=", "Saldo (R$)", ">⚡ Relâmpago<", ">🎫 Programada<", 'data-testid="acessos-rapidos"', 'data-testid="vencedores"'];
    const pos = marcas.map((m) => html.indexOf(m));
    assert.ok(pos.every((p, k) => p > 0 && (k === 0 || p > pos[k - 1])),
      `ordem: ${JSON.stringify(Object.fromEntries(marcas.map((m, k) => [m, pos[k]])))}`);
  });

  test("os 4 glass pequenos: Saldo · Passe Desafio · Lances Únicos · Total de Lances (por esta ordem)", () => {
    definirPontos({}); definirResultadoOficial(null);
    const html = renderizar();
    const ini = html.indexOf("Saldo (R$)"), fim = html.indexOf(">⚡ Relâmpago<");
    const rotulos = (html.slice(html.lastIndexOf("<section", ini), fim).match(/<button[\s\S]*?<\/button>/g) || []).map(texto);
    assert.equal(rotulos.length, 4, JSON.stringify(rotulos));
    ["Saldo (R$)", "Passe Desafio", "Lances Únicos", "Total de Lances"].forEach((r, k) => assert.ok(rotulos[k].includes(r), `${k}: ${rotulos[k]}`));
  });

  // ⚠️2 do validador (109f): sem esta guarda, mudar o destino/cor de um tile passava a suíte. Os blocos do
  // `passeStat`/`stats` e do render dos KPIs têm de ser BYTE-IGUAIS ao baseline `731ec28` (fins de linha normalizados).
  test("os 4 glass pequenos ficam BYTE-IGUAIS ao baseline 731ec28 (diff zero) e o Saldo leva à Carteira", async () => {
    const { readFileSync } = await import("node:fs");
    const { createHash } = await import("node:crypto");
    const s = readFileSync(caminho(AQUI, "../Dashboard.jsx"), "utf8").replace(/\r\n/g, "\n");
    const bloco = (a, b) => { const i = s.indexOf(a), j = s.indexOf(b); assert.ok(i > 0 && j > i, `bloco ${a}`); return s.slice(i, j); };
    const sha = (t) => createHash("sha256").update(t).digest("hex");
    assert.equal(sha(bloco("  const passeStat = {", "  const cardPad")),
      "92686ab28a655631dbffe87c3469d6f7eb5f14c25ade0b1fd7f8c15c1c67922d", "os dados dos 4 tiles mudaram");
    assert.equal(sha(bloco("      {/* ── KPIs ── */}", "      {/* ── UTAC108h.3")),
      "0b037a7abb13b9db6272de47aadddafdc98da2121615d967d11f51a3ce68db69", "o render dos 4 tiles mudou");
    assert.match(s, /label: "Saldo \(R\$\)"[^\n]*to: "\/carteira"/, "o KPI «Saldo» deixou de levar à Carteira");
  });

  test("glass final: dentro de vidro, aviso honesto (LACUNA), sem dados inventados, sem 🏆 nem «ver todos»", () => {
    definirResultadoOficial(null);
    const html = renderizar({ vencedor: { endereco: "0xaaaa000000000000000000000000000000000001", valor: 300 }, encerrado: true });
    const i = html.indexOf('data-testid="vencedores"');
    assert.ok(i > 0, "o glass final não existe");
    const sec = html.slice(html.lastIndexOf("<section", i), html.indexOf("</section>", i));
    assert.match(sec, /gut-glass-standard/, "o glass final não é vidro");
    assert.match(sec, /data-estado="placeholder"/);
    // V4 — o texto INTEIRO (o padrão dos placeholders de MeusAtivos), sem nada acrescentado
    assert.equal(texto(sec), "🏅 Vencedores Esta área ainda não está disponível. Os vencedores das edições vão aparecer aqui quando o recurso for lançado.");
    assert.doesNotMatch(texto(sec), /0x|R\$|\d/, "o placeholder mostra dados");
    assert.doesNotMatch(sec, /🏆|ver todos/i);
  });

  test("glass MLC sem edição (EM BREVE) = o cartão vazio da aba MLC: GUTO 7 + «Seu lance (em centavos)» desligado", () => {
    definirPontos({}); definirResultadoOficial(null);
    const v = fatia(renderizar(), ">⚡ Relâmpago<");
    assert.match(v, /data-vazio="true"/);
    assert.match(v, /data-acao="lance"/);
    assert.match(v, /data-testid="guto-animado-7"/);
    assert.match(v, /<label[^>]*>Seu lance \(em centavos\)<\/label>/);
    assert.match(v, /<button[^>]*disabled=""[^>]*>Dar lance<\/button>/);
    assert.match(texto(v), /Nenhuma edição em andamento/);
    assert.match(v, /data-testid="cartao-estado"[^>]*>SEM EDIÇÃO</, "V5: o vazio do Relâmpago perdeu «SEM EDIÇÃO»");
  });

  test("glass MLC COM edição (fora do EM BREVE): R-1 + porta do lance, sem GUTO 7 (bidireccional)", () => {
    definirPontos({}); definirResultadoOficial(null);
    definirEmBreve(false);
    try {
      const v = fatia(renderizar(), ">⚡ Relâmpago<");
      assert.match(v, /data-vazio="false"/);
      assert.match(v, />R-1</);
      assert.match(texto(v), /Dar lance/);
      assert.doesNotMatch(v, /guto-animado-7/);
    } finally { definirEmBreve(true); }
  });

  test("P1 · fonte: edição ATIVA Programada → «palpite já!»; Relâmpago/sem tipo → «lance já!»", () => {
    definirEmBreve(false);
    try {
      const fut = { termino_em: iso(Date.now() + H) };
      assert.equal(getEstadoEdicao({ ...fut, tipo: "programado" }).rotuloLongo, "Em andamento — palpite já!");
      assert.equal(getEstadoEdicao({ ...fut, tipo: "relampago" }).rotuloLongo, "Em andamento — lance já!");
      assert.equal(getEstadoEdicao({ ...fut }).rotuloLongo, "Em andamento — lance já!");
      // só o estado ATIVO muda: uma Programada encerrada continua «Edição encerrada»
      assert.equal(getEstadoEdicao({ tipo: "programado", termino_em: iso(Date.now() - H) }).rotuloLongo, "Edição encerrada");
    } finally { definirEmBreve(true); }
    assert.equal(getEstadoEdicao({ tipo: "programado" }).rotuloLongo, "Aguardando abertura", "EM BREVE não muda");
  });

  test("P1 · no ecrã: a faixa do vidro OP diz «palpite já!» e NUNCA «lance já!»", () => {
    definirPontos({}); definirResultadoOficial(null);
    definirEmBreve(false);
    try {
      const v = fatia(renderizar({ edicoes: { "R-1": R1, "PROG-1": PROG } }), ">🎫 Programada<");
      assert.match(texto(v), /Em andamento — palpite já!/);
      assert.doesNotMatch(texto(v), /lance já!/);
    } finally { definirEmBreve(true); }
  });

  test("P2 · vidro OP vazio diz «Sem edições programadas no momento.»; com edição não (bidireccional)", () => {
    definirPontos({}); definirResultadoOficial(null);
    const vazio = fatia(renderizar(), ">🎫 Programada<");
    assert.match(texto(vazio), /Sem edições programadas no momento\./);
    assert.match(vazio, /data-acao="palpite"/);
    assert.match(vazio, /data-testid="cartao-estado"[^>]*>SEM EDIÇÃO</, "V5: o vazio da OP perdeu «SEM EDIÇÃO»");
    const cheio = fatia(renderizar({ edicoes: { "R-1": R1, "PROG-1": PROG } }), ">🎫 Programada<");
    assert.doesNotMatch(texto(cheio), /Sem edições programadas/);
  });

  test("P4 · a faixa do cartão deixa o tempo descer de linha em vez de espremer o nome", () => {
    definirPontos({}); definirResultadoOficial(null);
    const v = fatia(renderizar({ edicoes: { "R-1": R1, "PROG-1": PROG } }), ">🎫 Programada<");
    assert.match(v, /data-testid="cartao-faixa"[^>]*style="[^"]*flex-wrap:\s*wrap/);
    assert.match(v, /data-testid="cartao-nome"[^>]*style="[^"]*flex:\s*1 1 12\.5rem/);
    assert.doesNotMatch(v, /data-testid="cartao-tempo"[^>]*style="[^"]*flex:\s*none/);
  });
});


// ═══ UTAC108h.3 — APENAS OS DOIS VIDROS (Relâmpago + Programada) ══════════════════════════════
// Decisão do operador (2026-10-08): o Início mostra SÓ dois vidros, um por família, no casco único
// `CartaoEdicao` (o mesmo das abas MLC/OP). Saíram: o vidro separado «🎯 Edição Ativa», os títulos
// soltos das prateleiras, o carrossel de «Outras Edições» e o vidro de estado vazio — o vazio passa
// a viver DENTRO do vidro da família.
describe("UTAC108h.3 · Início — apenas as duas edições", () => {
  const PROG = { id: "PROG-1", tipo: "programado", produto: "Air Fryer", termino_em: iso(Date.now() + 5 * H), lances: 0, status: "aberto", imagem_url: "/artes/p.png" };
  const REL_ENC = { id: "RELAMP-3", tipo: "relampago", produto: "Smart TV", termino_em: "2026-05-31T03:52:13.827Z", lances: 0, status: "encerrado" };

  const vidros = (html) => html.match(/data-testid="cartao-edicao"/g) || [];
  const titulos = (html) => [...html.matchAll(/data-testid="cartao-titulo"[^>]*>([^<]+)</g)].map((m) => m[1]);

  test("o Início mostra EXACTAMENTE dois vidros: Relâmpago e Programada", () => {
    definirPontos({}); definirResultadoOficial(null);
    const html = renderizar({ edicoes: { "R-1": R1, "PROG-1": PROG, "RELAMP-3": REL_ENC } });
    assert.equal(vidros(html).length, 2, `esperava 2 vidros; contei ${vidros(html).length}`);
    assert.deepEqual(titulos(html), ["⚡ Relâmpago", "🎫 Programada"], `títulos: ${JSON.stringify(titulos(html))}`);
  });

  test("saiu o vidro «🎯 Edição Ativa», saíram as prateleiras e saem as Relâmpago encerradas", () => {
    definirPontos({}); definirResultadoOficial(null);
    const html = renderizar({ edicoes: { "R-1": R1, "PROG-1": PROG, "RELAMP-3": REL_ENC } });
    const t = texto(html);
    assert.doesNotMatch(t, /🎯 Edição Ativa/, "o vidro separado «Edição Ativa» voltou");
    assert.doesNotMatch(html, /prateleira-scroll|prateleira-vazia/, "as prateleiras voltaram");
    assert.doesNotMatch(t, /Outras Edições/, "o título solto das prateleiras voltou");
    assert.doesNotMatch(t, /Smart TV|RELAMP-3/, "uma Relâmpago ENCERRADA continua no Início");
  });

  // UTAC109f (R18-A) — com EM BREVE o vidro Relâmpago é o cartão vazio da aba MLC; a edição VIVA
  // só aparece fora do EM BREVE (duplo `leilaoLock`).
  test("o vidro Relâmpago mostra a edição VIVA (R-1) e mantém a porta do lance", () => {
    definirPontos({}); definirResultadoOficial(null);
    definirEmBreve(false);
    try {
      const html = renderizar({ edicoes: { "R-1": R1, "RELAMP-3": REL_ENC } });
      assert.match(html, />R-1</, "o vidro Relâmpago não mostra a edição ativa");
      assert.match(texto(html), /Dar lance/, "o vidro Relâmpago perdeu a acção do lance");
    } finally { definirEmBreve(true); }
  });

  test("o palpite vive DENTRO do vidro da Programada (input + botão)", () => {
    definirPontos({}); definirResultadoOficial(null);
    const html = renderizar({ edicoes: { "R-1": R1, "PROG-1": PROG } });
    const i = html.indexOf('data-testid="palpite-zona"');
    assert.ok(i > 0, "a zona do palpite não está no vidro da Programada");
    assert.match(texto(html), /Seu palpite \(nº de lances\)/, "falta o rótulo do palpite");
    assert.match(texto(html), /Dar palpite/, "falta o botão «Dar palpite» (UTAC109e, R18-C)");
    // Regra 1: o <article> do cartão que a contém continua aberto depois da zona
    const iCart = html.lastIndexOf('data-testid="cartao-edicao"', i);
    assert.ok(iCart > 0 && html.indexOf("</article>", iCart) > i, "a zona do palpite ficou FORA do vidro (Regra 1)");
  });

  test("sem edição Programada: o vazio fica DENTRO do vidro, nunca num vidro solto", () => {
    definirPontos({}); definirResultadoOficial(null);
    const html = renderizar(); // só a R-1
    assert.equal(vidros(html).length, 2, "os dois vidros têm de continuar a existir");
    assert.match(texto(html), /Sem edições programadas no momento\./, "falta o estado vazio da Programada (UTAC109f P2)");
    assert.match(html, /data-vazio="true"/, "o vidro vazio não está marcado como vazio");
  });

  // UTAC109e — o GUTO animado 7 (vídeo 7 do carrossel) só existe enquanto não há edição: no vidro vazio da
  // Programada aparece; com edição, a arte toma o lugar. O carrossel do topo (8 vídeos) não conta: é outro sítio.
  // (`vidros()` só conta marcadores; aqui recorta-se o HTML de CADA <article> do cartão.)
  const fatias = (html) => [...html.matchAll(/data-testid="cartao-edicao"/g)].map((m) => {
    const ini = html.lastIndexOf("<article", m.index);
    let prof = 0;
    for (const t of html.slice(ini).matchAll(/<(\/?)article\b/g)) {
      prof += t[1] ? -1 : 1;
      if (prof === 0) return html.slice(ini, ini + t.index + "</article>".length);
    }
    throw new Error("cartão sem </article>");
  });
  test("UTAC109e · sem edição Programada: o GUTO animado 7 está DENTRO do vidro vazio", () => {
    definirPontos({}); definirResultadoOficial(null);
    const v = fatias(renderizar()).find((x) => x.includes('data-vazio="true"'));
    assert.ok(v, "não há vidro vazio");
    assert.match(v, /data-testid="guto-animado-7"[\s\S]*?guto-7\.png\?v=/, "o GUTO animado 7 não está no vidro vazio");
  });

  // UTAC109f (R18-A) — com EM BREVE o vidro Relâmpago passou a ser vazio (com GUTO 7); fora do EM BREVE,
  // com as duas edições, nenhum vidro tem o GUTO 7.
  test("UTAC109e · com edição Programada: o GUTO animado 7 NÃO aparece em nenhum vidro", () => {
    definirPontos({}); definirResultadoOficial(null);
    const prog = fatias(renderizar({ edicoes: { "R-1": R1, "PROG-1": PROG } })).find((v) => v.includes(">PROG-1<"));
    assert.doesNotMatch(prog, /guto-animado-7|guto-7\.png/, "o GUTO animado 7 apareceu com edição");
    definirEmBreve(false);
    try {
      const vs = fatias(renderizar({ edicoes: { "R-1": R1, "PROG-1": PROG } }));
      assert.equal(vs.length, 2);
      for (const v of vs) assert.doesNotMatch(v, /guto-animado-7|guto-7\.png/, "o GUTO animado 7 apareceu com edição");
    } finally { definirEmBreve(true); }
  });

  test("a Programada escolhida é a ABERTA (a mesma regra da aba OP)", () => {
    definirPontos({}); definirResultadoOficial(null);
    const agendada = { ...PROG, id: "PROG-9", status: "agendado" };
    const html = renderizar({ edicoes: { "R-1": R1, "PROG-1": PROG, "PROG-9": agendada } });
    assert.match(html, />PROG-1</, "não escolheu a Programada ABERTA");
    assert.doesNotMatch(html, />PROG-9</, "mostrou a Programada agendada em vez da aberta");
  });

  test("a edição ativa nunca vai parar ao vidro da Programada", () => {
    definirPontos({}); definirResultadoOficial(null);
    const html = renderizar({ edicoes: { "R-1": R1 } });
    const iProg = html.lastIndexOf("🎫 Programada");
    assert.ok(iProg > 0, "controlo: o vidro Programada não renderizou");
    assert.doesNotMatch(html.slice(iProg), />R-1</, "a edição ativa foi para o vidro da Programada");
  });
});

// MeusAtivos.test.mjs — MC94. Renderiza a PÁGINA INTEIRA, a sério.
//
// Corre com:  node --test src/pages/__tests__/MeusAtivos.test.mjs
// (a partir de desafio-gut/frontend)
//
// O que isto prova, e o que nenhum teste de componente prova:
//   • HARD GATE 5 — as secções ANTIGAS continuam lá, com os mesmos números;
//   • as secções NOVAS aparecem na mesma página, na ordem planeada;
//   • a página NÃO PARTE quando os dois endpoints falham.
//
// Como: `resolve.alias` do Vite troca `AppContext.jsx` e `IdiomaContext.jsx` por
// duplos, e os hooks de I/O por duplos que devolvem estado controlado. Nenhum
// ficheiro do projeto é alterado para o teste correr.

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUBS = caminho(AQUI, "_stubs");

let vite = null;
let Pagina = null;
let definirContexto = null;
let definirHooks = null;
let argumentos = null;

before(async () => {
  vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    resolve: {
      // ⚠️ As regexes ancoram no especificador COMPLETO (`^…$`). A primeira
      // versão casava só o sufixo `/context/AppContext.jsx`, e o Vite substituía
      // apenas essa parte — deixando o `..` do import à frente do caminho
      // absoluto (`..C:/Users/…`). O erro não era "não encontrei o duplo": era
      // um caminho impossível construído em silêncio.
      alias: [
        { find: /^\.\.\/context\/AppContext\.jsx$/,    replacement: `${STUBS}/AppContext.jsx` },
        { find: /^\.\.\/context\/IdiomaContext\.jsx$/, replacement: `${STUBS}/IdiomaContext.jsx` },
        { find: /^\.\.\/hooks\/useRanking\.js$/,       replacement: `${STUBS}/hooks.js` },
        { find: /^\.\.\/hooks\/useFeedback\.js$/,      replacement: `${STUBS}/hooks.js` },
        // `BotaoLoginPrincipal` arrasta o SDK do Privy (2,68 MB), que em SSR
        // estoura a heap. A tela só precisa que ele RENDERIZE algo com a palavra
        // "Entrar" para o teste de não-regressão do convite a entrar.
        { find: /^\.\.\/components\/BotaoLoginPrincipal\.jsx$/, replacement: `${STUBS}/BotaoLoginPrincipal.jsx` },
      ],
    },
  });
  ({ definirContexto } = await vite.ssrLoadModule(`${STUBS}/AppContext.jsx`));
  ({ definirHooks, argumentos } = await vite.ssrLoadModule(`${STUBS}/hooks.js`));
  Pagina = (await vite.ssrLoadModule("/src/pages/MeusAtivos.jsx")).default;
});

after(async () => { if (vite) await vite.close(); });

/** Renderiza a página com contexto e hooks controlados. */
function renderizar({ contexto = {}, hooks = {} } = {}) {
  definirContexto({
    lances: [],
    address: null,
    isConnected: false,
    abrirModal: () => {},
    EDICAO_ATIVA: "R-1",
    authToken: null,
    ...contexto,
  });
  definirHooks({
    ranking:  { ranking: [], total: 0, carregando: false, erro: null },
    feedback: { feedback: null, carregando: false, erro: null, semSessao: true },
    ...hooks,
  });
  return renderToStaticMarkup(React.createElement(Pagina));
}

const texto = (html) =>
  html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const LANCES = [
  { valor: 100, repetido: false, endereco: "0xaaaa" },
  { valor: 250, repetido: true,  endereco: "0xaaaa" },
  { valor: 500, repetido: false, endereco: "0xbbbb" },
];

// ───────────────────────────────────────────────────────────────────────────
describe("MC94 · MeusAtivos — HARD GATE 5: nada regride", () => {
  test("as quatro estatísticas antigas continuam lá, com os mesmos números", () => {
    const t = texto(renderizar({ contexto: { lances: LANCES, isConnected: true } }));
    for (const rotulo of ["Total de Lances", "Lances Únicos", "Lances Repetidos", "Menor Lance"]) {
      assert.match(t, new RegExp(rotulo), `perdeu a estatística "${rotulo}"`);
    }
    // 3 lances, 2 únicos, 1 repetido, menor = 100 centavos.
    // ⚠️ A tela EXISTENTE formata com `.toFixed(2)` e NÃO troca o ponto pela
    // vírgula: mostra "R$ 1.00". Está errado para pt-BR, mas é o comportamento
    // actual e o HARD GATE 5 manda não o alterar neste MC. O teste afirma o que
    // a tela FAZ, não o que devia fazer — e a divergência com o formato das
    // secções novas ("R$ 1,00", correcto) está registada como achado para o MC97.
    assert.match(t, /R\$ 1\.00/, "o Menor Lance deixou de ser calculado");
  });

  test("o cabeçalho e o rodapé regulamentar continuam lá", () => {
    const t = texto(renderizar());
    assert.match(t, /Meus Ativos/);
    assert.match(t, /Histórico de lances/i);
    assert.match(t, /Art\. 26/, "perdeu a nota do Art. 26");
    assert.match(t, /Art\. 8/,  "perdeu a nota do Art. 8");
  });

  test("os filtros continuam lá", () => {
    const t = texto(renderizar());
    for (const f of ["Todos", "Únicos", "Repetidos"]) {
      assert.match(t, new RegExp(f), `perdeu o filtro "${f}"`);
    }
  });

  test("o convite a entrar continua a aparecer quando não há sessão", () => {
    const html = renderizar({ contexto: { isConnected: false } });
    assert.match(texto(html), /entrar|entre|login/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("MC94 · MeusAtivos — as secções novas estão na página", () => {
  test("as cinco secções do torneio renderizam", () => {
    const html = renderizar();
    for (const secao of [
      "painel-torneio", "progresso-bonus", "estado-bonus",
      "feedback-lance", "ranking-ciclo",
    ]) {
      assert.match(html, new RegExp(`data-secao="${secao}"`),
        `a secção "${secao}" não está na página`);
    }
  });

  test("a ordem é a planeada: torneio ANTES do histórico", () => {
    const html = renderizar();
    const iTorneio = html.indexOf('data-secao="painel-torneio"');
    const iFiltro  = html.indexOf("Filtrar");
    assert.ok(iTorneio !== -1 && iFiltro !== -1, "faltam âncoras para comparar");
    assert.ok(iTorneio < iFiltro,
      "as secções do torneio ficaram DEPOIS dos filtros/histórico");
  });

  test("com sessão e dados, mostra posição, pontos e senhas a creditar", () => {
    const t = texto(renderizar({
      contexto: { address: "0xaaaa", isConnected: true, authToken: "tok", lances: LANCES },
      hooks: {
        feedback: {
          feedback: {
            posicao: 2, pontosTotais: 9, acertosTotais: 3,
            sequenciaAtual: 3, faltamParaBonus: 2,
            bonusEmitido: true, senhasACreditar: 20, liquidado: false,
          },
          carregando: false, erro: null, semSessao: false,
        },
        ranking: {
          ranking: [
            { posicao: 1, endereco: "0xcccccccccccccccccccccccccccccccccccccccc", pontosTotais: 12, acertosTotais: 4, bonusEmitido: false },
            { posicao: 2, endereco: "0xaaaa", pontosTotais: 9, acertosTotais: 3, bonusEmitido: true },
          ],
          total: 2, carregando: false, erro: null,
        },
      },
    }));
    assert.match(t, /2º/, "não mostra a posição");
    assert.match(t, /\b9\b/, "não mostra os pontos");
    assert.match(t, /20/, "não mostra as senhas a creditar");
    assert.match(t, /você|voce/i, "não destaca o próprio no ranking");
  });

  test("a palavra 'saldo' não aparece em toda a página do torneio", () => {
    // ⚠️ Vale para a página INTEIRA, não só para o componente: se alguém puser
    // "saldo" num título ao juntar as secções, este teste apanha.
    const t = texto(renderizar({
      contexto: { address: "0xaaaa", isConnected: true, authToken: "tok" },
      hooks: {
        feedback: {
          feedback: {
            posicao: 1, pontosTotais: 5, acertosTotais: 5,
            sequenciaAtual: 5, faltamParaBonus: 0,
            bonusEmitido: true, senhasACreditar: 20, liquidado: true,
          },
          carregando: false, erro: null, semSessao: false,
        },
      },
    }));
    assert.doesNotMatch(t, /saldo/i, "a página promete um saldo que não existe off-chain");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("MC94 · MeusAtivos — resiliência", () => {
  test("NÃO PARTE quando os dois endpoints falham, e o histórico sobrevive", () => {
    const html = renderizar({
      contexto: { address: "0xaaaa", isConnected: true, authToken: "tok", lances: LANCES },
      hooks: {
        ranking:  { ranking: [], total: 0, carregando: false, erro: "rede" },
        feedback: { feedback: null, carregando: false, erro: "rede", semSessao: false },
      },
    });
    const t = texto(html);
    // A parte antiga continua a funcionar com os endpoints em baixo.
    assert.match(t, /Total de Lances/, "a falha dos endpoints derrubou o histórico");
    assert.match(t, /R\$ 1\.00/);
    // E o erro é dito, não escondido nem disfarçado de vazio.
    assert.match(t, /não foi possível/i, "engole o erro em silêncio");
  });

  test("a carregar, não mostra erro nem números inventados", () => {
    const t = texto(renderizar({
      contexto: { address: "0xaaaa", isConnected: true, authToken: "tok" },
      hooks: {
        ranking:  { ranking: [], total: 0, carregando: true, erro: null },
        feedback: { feedback: null, carregando: true, erro: null, semSessao: false },
      },
    }));
    assert.doesNotMatch(t, /não foi possível|erro/i, "mostra erro durante a espera");
    assert.match(t, /carregar/i, "não avisa que está a carregar");
  });

  test("sem sessão, convida a entrar em vez de mostrar erro", () => {
    const t = texto(renderizar({
      hooks: { feedback: { feedback: null, carregando: false, erro: null, semSessao: true } },
    }));
    assert.doesNotMatch(t, /não foi possível carregar a sua pontuação/i);
    assert.match(t, /Entre na sua conta/i);
  });

  test("o ranking é público: aparece mesmo sem sessão", () => {
    const t = texto(renderizar({
      hooks: {
        ranking: {
          ranking: [{ posicao: 1, endereco: "0xdddddddddddddddddddddddddddddddddddddddd", pontosTotais: 4, acertosTotais: 1, bonusEmitido: false }],
          total: 1, carregando: false, erro: null,
        },
      },
    }));
    assert.match(t, /Ranking do ciclo/i);
    assert.match(t, /0xdddd/, "não mostra a linha do ranking sem sessão");
    assert.doesNotMatch(t, /você|voce/i, "destaca alguém sem saber quem é o utilizador");
  });
});

// ───────────────────────────────────────────────────────────────────────────
// CABLAGEM. Os testes acima provam que as secções SABEM renderizar; estes provam
// que a página lhes ENTREGA os dados. A validação independente do MC94 mostrou
// que as duas coisas são independentes: um componente correcto ligado a `undefined`
// renderiza o estado "sem dados" e a suíte fica verde.
// ───────────────────────────────────────────────────────────────────────────
describe("MC94 · MeusAtivos — cablagem: os dados chegam às secções", () => {
  const EU = "0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa";

  test("`useFeedback` é chamado com ciclo, endereço E token — os três", () => {
    renderizar({ contexto: { address: EU, authToken: "tok", isConnected: true, EDICAO_ATIVA: "R-1" } });
    const [args] = argumentos().feedback;
    assert.ok(args, "a página não chamou `useFeedback`");
    assert.equal(args[0], "R-1",   "não passou a edição activa");
    assert.equal(args[1], EU,      "não passou o endereço — o endpoint devolveria 401/403");
    assert.equal(args[2], "tok",   "não passou o authToken — o endpoint devolveria 401");
  });

  test("`useRanking` é chamado com a edição activa, não com `undefined`", () => {
    renderizar({ contexto: { EDICAO_ATIVA: "R-7" } });
    const [args] = argumentos().ranking;
    assert.ok(args, "a página não chamou `useRanking`");
    assert.equal(args[0], "R-7",
      "chamou o ranking sem ciclo — o hook devolve vazio e a secção parece um ciclo sem pontuações");
  });

  test("a edição activa vem do contexto, não de um literal na página", () => {
    // ⚠️ `EDICAO_ATIVA` é "R-1" hoje. Um literal cravado na página continuaria a
    // pedir "R-1" depois de o ciclo mudar, e o ranking ficaria congelado no ciclo
    // anterior sem ninguém dar por isso.
    renderizar({ contexto: { EDICAO_ATIVA: "R-99", address: EU, authToken: "tok" } });
    assert.equal(argumentos().ranking[0][0], "R-99", "o ciclo do ranking está cravado na página");
    assert.equal(argumentos().feedback[0][0], "R-99", "o ciclo do feedback está cravado na página");
  });

  test("`address` chega ao RANKING: sem ele ninguém é destacado; com ele, o próprio é", () => {
    const comum = {
      ranking: {
        ranking: [
          { posicao: 1, endereco: "0xCCCCccccCCCCccccCCCCccccCCCCccccCCCCcccc", pontosTotais: 12, acertosTotais: 4, bonusEmitido: false },
          { posicao: 2, endereco: EU, pontosTotais: 9, acertosTotais: 3, bonusEmitido: false },
        ],
        total: 2, carregando: false, erro: null,
      },
    };
    const semEndereco = renderizar({ contexto: { address: null }, hooks: comum });
    const comEndereco = renderizar({ contexto: { address: EU, authToken: "tok", isConnected: true }, hooks: comum });
    assert.doesNotMatch(semEndereco, /data-eu="sim"/);
    assert.match(comEndereco, /data-eu="sim"/,
      "o `address` do contexto não chega ao RankingCiclo — ninguém se encontra no ranking");
  });

  test("`address` chega ao FEEDBACK DE LANCES: só os lances do próprio aparecem", () => {
    const lances = [
      { valor: 100, repetido: false, endereco: "0xBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbb" },
      { valor: 900, repetido: false, endereco: EU },
    ];
    const html = renderizar({ contexto: { address: EU, authToken: "tok", isConnected: true, lances } });
    const secao = html.slice(html.indexOf('data-secao="feedback-lance"'));
    const corpo = secao.slice(0, secao.indexOf("</section>"));
    assert.equal(corpo.split('data-linha="lance"').length - 1, 1,
      "a secção de lances não recebeu o `address` — mostra os lances de todos como sendo do utilizador");
    assert.match(texto(corpo), /R\$ 9,00/);
    assert.doesNotMatch(texto(corpo), /R\$ 1,00/, "mostrou o lance de outra pessoa como sendo do utilizador");
  });

  test("`erro` do feedback chega às TRÊS secções pessoais — e só a essas", () => {
    // ⚠️ V22/V23/V24: a primeira versão passava os dados às três secções mas o
    // `erro` só a uma. As outras duas mostravam o estado "sem dados", isto é,
    // zeros — que é pior do que um aviso, porque o utilizador acredita neles.
    const html = renderizar({
      contexto: { address: EU, authToken: "tok", isConnected: true },
      hooks: {
        feedback: { feedback: null, carregando: false, erro: "rede", semSessao: false },
        ranking:  { ranking: [], total: 0, carregando: false, erro: null },
      },
    });
    for (const secao of ["painel-torneio", "progresso-bonus", "estado-bonus"]) {
      const i = html.indexOf(`data-secao="${secao}"`);
      assert.notEqual(i, -1, `a secção ${secao} desapareceu`);
      const corpo = html.slice(i, i + html.slice(i).indexOf("</section>"));
      assert.match(corpo, /data-estado="erro"/,
        `o \`erro\` não chega a "${secao}" — a secção mostra zeros com o endpoint em baixo`);
    }
    // O ranking é OUTRO endpoint: o erro de um não pode apagar o outro.
    const iRank = html.indexOf('data-secao="ranking-ciclo"');
    const corpoRank = html.slice(iRank, iRank + html.slice(iRank).indexOf("</section>"));
    assert.doesNotMatch(corpoRank, /data-estado="erro"/,
      "o erro do feedback contaminou o ranking, que é um endpoint independente e público");
  });

  test("`carregando` do feedback chega às três secções pessoais", () => {
    const html = renderizar({
      contexto: { address: EU, authToken: "tok", isConnected: true },
      hooks: { feedback: { feedback: null, carregando: true, erro: null, semSessao: false } },
    });
    for (const secao of ["painel-torneio", "progresso-bonus", "estado-bonus"]) {
      const i = html.indexOf(`data-secao="${secao}"`);
      const corpo = html.slice(i, i + html.slice(i).indexOf("</section>"));
      assert.match(corpo, /data-estado="carregando"/, `"${secao}" não recebe o \`carregando\``);
    }
  });

  test("`semSessao` chega às três: um anónimo não lê factos sobre si próprio", () => {
    const html = renderizar({
      contexto: { address: null, authToken: null, isConnected: false },
      hooks: { feedback: { feedback: null, carregando: false, erro: null, semSessao: true } },
    });
    for (const secao of ["painel-torneio", "progresso-bonus", "estado-bonus"]) {
      const i = html.indexOf(`data-secao="${secao}"`);
      const corpo = html.slice(i, i + html.slice(i).indexOf("</section>"));
      assert.match(corpo, /data-estado="sem-sessao"/, `"${secao}" não recebe o \`semSessao\``);
    }
    const t = texto(html);
    assert.doesNotMatch(t, /Faltam \d+ acertos/i, "afirma o progresso de alguém que não identificou");
    assert.doesNotMatch(t, /Nenhum bónus conquistado/i, "afirma a ausência de bónus de alguém que não identificou");
  });

  test("os campos do feedback chegam ao sítio certo, cada um ao seu", () => {
    // Números distintos e improváveis, para que um campo trocado por outro salte.
    const html = renderizar({
      contexto: { address: EU, authToken: "tok", isConnected: true },
      hooks: {
        feedback: {
          feedback: {
            posicao: 4, pontosTotais: 13, acertosTotais: 6,
            sequenciaAtual: 3, faltamParaBonus: 2,
            bonusEmitido: true, senhasACreditar: 40, liquidado: false,
          },
          carregando: false, erro: null, semSessao: false,
        },
      },
    });
    const dentro = (secao) => {
      const i = html.indexOf(`data-secao="${secao}"`);
      return texto(html.slice(i, i + html.slice(i).indexOf("</section>")));
    };
    assert.match(dentro("painel-torneio"), /4º/, "a posição não chega ao painel");
    assert.match(dentro("painel-torneio"), /\b13\b/, "os pontos não chegam ao painel");
    assert.match(dentro("progresso-bonus"), /\b3\b[\s\S]*\/\s*5/, "a sequência não chega ao progresso");
    assert.match(dentro("progresso-bonus"), /Faltam 2 acertos/, "o `faltamParaBonus` não chega ao progresso");
    assert.match(dentro("estado-bonus"), /\b40\s+senhas\b/,
      "o `senhasACreditar` não chega ao estado do bónus — ou está em literal");
    assert.match(dentro("estado-bonus"), /A creditar/i, "o `liquidado: false` não chega");
  });

  test("⚠️ as secções NÃO se contradizem quando a sequência está completa", () => {
    // ⚠️ Achado da validação independente: com 5/5 o ProgressoBonus declarava
    // "bónus conquistado!" a partir de uma conta LOCAL, enquanto o EstadoBonus
    // lia `bonusEmitido: false` do livro-razão e escrevia "Nenhum bónus
    // conquistado neste ciclo" — as duas frases na mesma página, uma por cima da
    // outra. Só o backend pode afirmar que há bónus.
    const t = texto(renderizar({
      contexto: { address: EU, authToken: "tok", isConnected: true },
      hooks: {
        feedback: {
          feedback: {
            posicao: 1, pontosTotais: 5, acertosTotais: 5,
            sequenciaAtual: 5, faltamParaBonus: 0,
            bonusEmitido: false, senhasACreditar: 0, liquidado: false,
          },
          carregando: false, erro: null, semSessao: false,
        },
      },
    }));
    assert.match(t, /Sequência completa/i, "não diz que a sequência está completa");
    assert.match(t, /Nenhum bónus/i, "não reporta o que o livro-razão diz");
    assert.doesNotMatch(t, /bónus conquistado!|bonus conquistado!/i,
      "declara o bónus a partir de uma conta local e contradiz a secção ao lado");
  });

  test("com bónus já LIQUIDADO, a página não promete creditar outra vez", () => {
    const t = texto(renderizar({
      contexto: { address: EU, authToken: "tok", isConnected: true },
      hooks: {
        feedback: {
          feedback: {
            posicao: 1, pontosTotais: 10, acertosTotais: 5,
            sequenciaAtual: 5, faltamParaBonus: 0,
            bonusEmitido: true, senhasACreditar: 20, liquidado: true,
          },
          carregando: false, erro: null, semSessao: false,
        },
      },
    }));
    assert.match(t, /Já creditadas/i);
    assert.doesNotMatch(t, /A creditar/i, "promete creditar senhas que já foram creditadas");
  });
});

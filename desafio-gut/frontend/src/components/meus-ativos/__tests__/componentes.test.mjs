// componentes.test.mjs — MC94. Testes de RENDERIZAÇÃO REAL dos componentes do
// torneio em "Meus Ativos".
//
// Corre com:  node --test src/components/meus-ativos/__tests__/componentes.test.mjs
// (a partir de desafio-gut/frontend)
//
// Ver `_render.mjs` para o porquê do instrumento e os seus limites.

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { carregar, render, texto, fechar } from "./_render.mjs";

const D = "/src/components/meus-ativos";
let Painel, Progresso, Estado, Feedback, Ranking;

before(async () => {
  Painel    = await carregar(`${D}/PainelTorneio.jsx`);
  Progresso = await carregar(`${D}/ProgressoBonus.jsx`);
  Estado    = await carregar(`${D}/EstadoBonus.jsx`);
  Feedback  = await carregar(`${D}/FeedbackLance.jsx`);
  Ranking   = await carregar(`${D}/RankingCiclo.jsx`);
});

after(fechar);

// ───────────────────────────────────────────────────────────────────────────
describe("MC94 · PainelTorneio", () => {
  test("renderiza posição, pontos e acertos", () => {
    const t = texto(render(Painel, {
      temSessao: true,
      feedback: { posicao: 3, pontosTotais: 7, acertosTotais: 2 },
    }));
    // Literais de propósito: se a UI parar de mostrar um destes números, falha.
    assert.match(t, /3/, "não mostra a posição");
    assert.match(t, /7/, "não mostra os pontos");
    assert.match(t, /2/, "não mostra os acertos");
    assert.match(t, /pontos/i);
    assert.match(t, /acertos/i);
  });

  test("sem sessão CONVIDA a entrar, e não mostra erro", () => {
    const t = texto(render(Painel, { temSessao: false }));
    assert.match(t, /entr/i, "não convida a entrar");
    assert.doesNotMatch(t, /erro|falh/i, "trata falta de sessão como erro");
  });

  test("com erro, di-lo — e não finge zeros", () => {
    const t = texto(render(Painel, { temSessao: true, erro: "rede" }));
    assert.match(t, /não foi possível|erro/i);
    // ⚠️ Zeros inventados seriam pior do que um erro: o utilizador acreditaria.
    assert.doesNotMatch(t, /\b0 pontos\b/i, "inventa zeros quando falhou");
  });

  test("a carregar, não mostra números nem erro", () => {
    const t = texto(render(Painel, { temSessao: true, carregando: true }));
    assert.doesNotMatch(t, /erro/i);
    assert.match(t, /\S/, "não renderiza nada durante a espera (salto de layout)");
  });

  test("sem dados ainda (ciclo novo) diz que não há, sem parecer avaria", () => {
    const t = texto(render(Painel, {
      temSessao: true,
      feedback: { posicao: null, pontosTotais: 0, acertosTotais: 0 },
    }));
    assert.doesNotMatch(t, /erro|falh/i);
    assert.match(t, /\S/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("MC94 · ProgressoBonus", () => {
  test("mostra a barra e quantos faltam", () => {
    const html = render(Progresso, {
      sequenciaAtual: 3, faltamParaBonus: 2, acertosParaBonus: 5,
    });
    const t = texto(html);
    assert.match(t, /3/, "não mostra a sequência");
    assert.match(t, /2/, "não mostra quantos faltam");
    assert.match(t, /falta/i);
    // A barra tem de existir como elemento com largura proporcional, não só texto.
    assert.match(html, /width:\s*60%/, "a barra não reflecte 3/5 = 60%");
  });

  test("a 5 de 5 diz COMPLETO, não 'faltam 0'", () => {
    const t = texto(render(Progresso, {
      sequenciaAtual: 5, faltamParaBonus: 0, acertosParaBonus: 5,
    }));
    assert.doesNotMatch(t, /faltam?\s*0/i, "escreve 'faltam 0' em vez de completo");
    assert.match(t, /complet|conquist|bónus|bonus/i);
  });

  test("a zero, mostra o alvo e não uma barra cheia", () => {
    const html = render(Progresso, {
      sequenciaAtual: 0, faltamParaBonus: 5, acertosParaBonus: 5,
    });
    assert.match(texto(html), /5/);
    assert.match(html, /width:\s*0%/, "barra não está a zero");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("MC94 · EstadoBonus", () => {
  test("distingue PENDENTE de LIQUIDADO", () => {
    const pendente = texto(render(Estado, {
      senhasACreditar: 20, bonusEmitido: true, liquidado: false,
    }));
    const liquidado = texto(render(Estado, {
      senhasACreditar: 20, bonusEmitido: true, liquidado: true,
    }));
    assert.match(pendente, /creditar|pendente|aguard/i);
    assert.match(liquidado, /credita|liquidad|conclu/i);
    assert.notEqual(pendente, liquidado, "pendente e liquidado renderizam igual");
  });

  test("`liquidado: undefined` conta como PENDENTE", () => {
    // ⚠️ MEDIDO no SEG-1 [M19]: o default `vazio` de `lerFeedback` NÃO inclui
    // `liquidado`, logo chega `undefined`. Tratá-lo como liquidado diria ao
    // utilizador que já recebeu senhas que não recebeu.
    const t = texto(render(Estado, { senhasACreditar: 20, bonusEmitido: true }));
    assert.match(t, /creditar|pendente|aguard/i);
    assert.doesNotMatch(t, /já (foi )?creditad/i, "diz que já creditou sem saber");
  });

  test("NUNCA chama isto de saldo", () => {
    // ⚠️ Regra do MC93-B: `senhasACreditar` é um DIREITO por liquidar. O saldo que
    // habilita um lance é `saldoSenhas` ON-CHAIN. Chamar-lhe saldo faria o
    // utilizador esperar que um lance passasse — e a transacção reverteria.
    for (const props of [
      { senhasACreditar: 20, bonusEmitido: true, liquidado: false },
      { senhasACreditar: 20, bonusEmitido: true, liquidado: true },
      { senhasACreditar: 0,  bonusEmitido: false },
    ]) {
      assert.doesNotMatch(texto(render(Estado, props)), /saldo/i,
        `chamou "saldo" com props ${JSON.stringify(props)}`);
    }
  });

  test("sem bónus nenhum, não promete nada", () => {
    const t = texto(render(Estado, { senhasACreditar: 0, bonusEmitido: false }));
    assert.doesNotMatch(t, /20/, "mostra 20 senhas sem haver bónus");
    assert.match(t, /\S/);
  });

  test("mostra a quantidade que o livro-razão diz, não a constante", () => {
    // Se o componente tiver 20 em literal, isto apanha-o.
    const t = texto(render(Estado, {
      senhasACreditar: 40, bonusEmitido: true, liquidado: false,
    }));
    assert.match(t, /40/, "não usa `senhasACreditar` — tem a constante em literal");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("MC94 · FeedbackLance", () => {
  const lances = [
    { valor: 100, repetido: false, endereco: "0xaa" },
    { valor: 250, repetido: true,  endereco: "0xaa" },
    { valor: 500, repetido: false, endereco: "0xaa" },
  ];

  test("diz quanto cada lance VALE, nunca que já ganhou", () => {
    const t = texto(render(Feedback, { lances, address: "0xaa" }));
    assert.match(t, /vale/i, "não enquadra como valor pela regra");
    // ⚠️ MEDIDO no SEG-1 [M22]: NENHUM endpoint devolve pontos por lance. A
    // pontuação é atribuída no fecho da rodada. Afirmar "ganhou" seria a UI a
    // inventar um facto que o backend não produziu.
    assert.doesNotMatch(t, /ganh|conquistou|creditad/i,
      "afirma pontos ganhos que o backend não atribuiu");
  });

  test("o menor único vale mais do que um único qualquer", () => {
    const t = texto(render(Feedback, { lances, address: "0xaa" }));
    assert.match(t, /3/, "não mostra os 3 pontos do menor único");
    assert.match(t, /1/, "não mostra o 1 ponto do único");
  });

  test("um lance repetido vale zero e di-lo", () => {
    const t = texto(render(Feedback, {
      lances: [{ valor: 250, repetido: true, endereco: "0xaa" }],
      address: "0xaa",
    }));
    assert.match(t, /repetid/i);
    assert.match(t, /0|nenhum|não vale/i);
  });

  test("sem lances, não inventa linhas", () => {
    const t = texto(render(Feedback, { lances: [], address: "0xaa" }));
    assert.doesNotMatch(t, /vale 1|vale 3/i);
    assert.match(t, /\S/);
  });

  test("só considera os lances do próprio endereço", () => {
    const t = texto(render(Feedback, {
      lances: [
        { valor: 100, repetido: false, endereco: "0xbb" },
        { valor: 900, repetido: false, endereco: "0xaa" },
      ],
      address: "0xaa",
    }));
    assert.match(t, /900|9,00|9\.00/, "não mostra o lance do próprio");
    assert.doesNotMatch(t, /\b100\b|1,00/, "mostra lance de outro endereço");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("MC94 · RankingCiclo", () => {
  const ranking = [
    { posicao: 1, endereco: "0x1111111111111111111111111111111111111111", pontosTotais: 12, acertosTotais: 4, bonusEmitido: false },
    { posicao: 2, endereco: "0x2222222222222222222222222222222222222222", pontosTotais: 9,  acertosTotais: 3, bonusEmitido: false },
    { posicao: 3, endereco: "0x3333333333333333333333333333333333333333", pontosTotais: 7,  acertosTotais: 2, bonusEmitido: true  },
  ];

  test("destaca a posição do próprio utilizador", () => {
    const html = render(Ranking, {
      ranking, total: 3,
      address: "0x2222222222222222222222222222222222222222",
    });
    assert.match(texto(html), /você|voce|seu|sua/i, "não identifica o próprio");
    // O destaque tem de ser visual, não só textual.
    assert.match(html, /a78bfa|f5a623|fontWeight|font-weight/i,
      "não há marca visual da própria linha");
  });

  test("não destaca ninguém quando não há endereço", () => {
    const t = texto(render(Ranking, { ranking, total: 3, address: null }));
    assert.doesNotMatch(t, /você|voce/i, "destaca alguém sem saber quem é o utilizador");
  });

  test("VAZIO e ERRO não são a mesma coisa", () => {
    const vazio = texto(render(Ranking, { ranking: [], total: 0 }));
    const erro  = texto(render(Ranking, { ranking: [], total: 0, erro: "rede" }));
    assert.notEqual(vazio, erro,
      "colapsa 'ainda não há dados' com 'não consegui ler' — dois factos diferentes");
    assert.doesNotMatch(vazio, /erro|falh/i);
    assert.match(erro, /não foi possível|erro/i);
  });

  test("mostra no máximo 10, mesmo com mais", () => {
    const muitos = Array.from({ length: 25 }, (_, i) => ({
      posicao: i + 1,
      endereco: "0x" + String(i).padStart(40, "0"),
      pontosTotais: 100 - i, acertosTotais: 1, bonusEmitido: false,
    }));
    const html = render(Ranking, { ranking: muitos, total: 25 });
    const linhas = (html.match(/data-linha="rank"/g) ?? []).length;
    assert.equal(linhas, 10, `mostrou ${linhas} linhas em vez de 10`);
    assert.match(texto(html), /25/, "não diz quantos participantes há no total");
  });

  test("os endereços aparecem ABREVIADOS (R4)", () => {
    const t = texto(render(Ranking, { ranking, total: 3 }));
    assert.doesNotMatch(t, /0x1111111111111111111111111111111111111111/,
      "mostra o endereço inteiro — dado pessoal em ecrã e em capturas");
    assert.match(t, /0x1111|1111…|…1111/, "não mostra sequer o prefixo");
  });
});

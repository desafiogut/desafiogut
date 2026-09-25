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
import { reais, valorUtilizavel, inteiroSeguro, encurtar } from "../_estilo.js";

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
  test("renderiza posição, pontos e acertos — cada número com o SEU rótulo", () => {
    // ⚠️ ASSERÇÃO ANCORADA AO PAR. A versão anterior asseria /3/, /7/ e /2/ soltos,
    // e por isso trocar os VALORES de Pontos e Acertos mantendo os rótulos
    // sobrevivia à suíte inteira (mutante da 2.ª validação independente). É a
    // mesma classe de asserção fraca que a 1.ª ronda listou como ⛔ corrigido —
    // corrigida nalguns testes, e não neste.
    const html = render(Painel, {
      temSessao: true,
      feedback: { posicao: 3, pontosTotais: 7, acertosTotais: 2 },
    });
    const celulas = html.split('data-celula="painel"').slice(1)
      .map((c) => texto(c.slice(0, c.indexOf("</div></div>") + 12)));
    assert.equal(celulas.length, 3, "não são três células");
    assert.match(celulas[0], /(^|\s)3º\s+Posição/, `posição errada: ${celulas[0]}`);
    assert.match(celulas[1], /(^|\s)7\s+Pontos/, `pontos errados: ${celulas[1]}`);
    assert.match(celulas[2], /(^|\s)2\s+Acertos/, `acertos errados: ${celulas[2]}`);
  });

  test("⚠️ quantidades impossíveis não chegam ao painel", () => {
    // ⚠️ `EstadoBonus` e `RankingCiclo` passaram a usar `inteiroSeguro` na 1.ª
    // ronda; este ficou com `?? 0` e `posicao ?`. Resultado medido:
    // "1.5º · Infinity Pontos · 1e+21 Acertos". Meia correcção, outra vez.
    const t = texto(render(Painel, {
      temSessao: true,
      feedback: { posicao: 1.5, pontosTotais: Infinity, acertosTotais: 1e21 },
    }));
    assert.doesNotMatch(t, /Infinity|e\+|\d+\.\d/, `renderizou lixo: ${t}`);
  });

  test("⚠️ pontos ausentes mostram — , não um zero inventado", () => {
    const t = texto(render(Painel, {
      temSessao: true,
      feedback: { posicao: 2, pontosTotais: null, acertosTotais: null },
    }));
    assert.match(t, /—/, "não marca a ausência");
    assert.doesNotMatch(t, /\b0\s+Pontos/, "inventou zero pontos");
    assert.doesNotMatch(t, /\b0\s+Acertos/, "inventou zero acertos");
  });

  test("⚠️ `posicao: null` não vira 'nullº'", () => {
    const t = texto(render(Painel, {
      temSessao: true,
      feedback: { posicao: null, pontosTotais: 3, acertosTotais: 1 },
    }));
    assert.doesNotMatch(t, /null/i);
    assert.match(t, /—\s+Posição/);
  });

  test("com ERRO e a carregar ao mesmo tempo, o erro ganha", () => {
    // Precedência uniforme nas quatro secções: dizer "a carregar" quando já se
    // sabe que falhou deixa o utilizador à espera de nada.
    const t = texto(render(Painel, { temSessao: true, carregando: true, erro: "rede" }));
    assert.match(t, /não foi possível/i, "a espera escondeu o erro");
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

  test("⚠️ com sessão e SEM dados, não finge que está a carregar", () => {
    // O ramo `sem-dados` do painel não tinha teste nenhum: um mutante que o
    // removesse passava a suíte inteira (e faria o componente rebentar ao ler
    // `feedback.posicao` de null). Achado da minha ronda de mutação da 2.ª volta.
    const html = render(Painel, { temSessao: true, feedback: null });
    assert.match(html, /data-estado="sem-dados"/, "não distingue 'sem dados' de 'a carregar'");
    const t = texto(html);
    assert.doesNotMatch(t, /Carregando/i, "spinner eterno");
    assert.doesNotMatch(t, /erro|falh/i);
    assert.match(t, /\S/);
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
  const comDados = { temSessao: true, sequenciaAtual: 3, faltamParaBonus: 2, acertosParaBonus: 5 };

  test("mostra a barra e quantos faltam", () => {
    const html = render(Progresso, comDados);
    const t = texto(html);
    // ⚠️ Asserts ANCORADOS. A versão anterior usava /3/ e /2/, que casavam em
    // qualquer dígito da frase — a validação independente mostrou que o mesmo
    // padrão fraco deixava passar mutações reais.
    assert.match(t, /\b3\b[\s\S]*\/\s*5/, "não mostra 3 / 5");
    assert.match(t, /Faltam 2 acertos/i, "não diz quantos faltam");
    assert.match(html, /width:\s*60%/, "a barra não reflecte 3/5 = 60%");
  });

  test("a 5 de 5 diz sequência completa — mas NÃO declara o bónus conquistado", () => {
    const t = texto(render(Progresso, {
      temSessao: true, sequenciaAtual: 5, faltamParaBonus: 0, acertosParaBonus: 5,
    }));
    assert.doesNotMatch(t, /faltam?\s*0/i, "escreve 'faltam 0' em vez de completo");
    assert.match(t, /Sequência completa/i);
    // ⚠️ Só `bonusEmitido` (do livro-razão) pode afirmar que há bónus. Esta
    // secção derivava-o de uma conta local e CONTRADIZIA a secção ao lado, que
    // dizia "Nenhum bónus conquistado". Achado da validação independente.
    assert.doesNotMatch(t, /b[oôó]nus conquistado/i,
      "declara o bónus a partir de uma conta local, contradizendo o EstadoBonus");
  });

  test("a barra anuncia-se a quem não a vê", () => {
    // Uma barra de progresso que não diz o seu valor e o seu máximo é uma faixa
    // colorida para um leitor de ecrã.
    const html = render(Progresso, { temSessao: true, sequenciaAtual: 3, acertosParaBonus: 5 });
    assert.match(html, /role="progressbar"/);
    assert.match(html, /aria-valuenow="3"/, "o valor anunciado não é o mostrado");
    assert.match(html, /aria-valuemax="5"/, "o máximo anunciado não é o alvo");
    assert.match(html, /aria-valuemin="0"/);
  });

  test("a zero, mostra o alvo e não uma barra cheia", () => {
    const html = render(Progresso, {
      temSessao: true, sequenciaAtual: 0, faltamParaBonus: 5, acertosParaBonus: 5,
    });
    assert.match(texto(html), /Faltam 5 acertos/i);
    assert.match(html, /width:\s*0%/, "barra não está a zero");
  });

  test("7 acertos com alvo 5 mostra 2/5, não 7/5", () => {
    const t = texto(render(Progresso, {
      temSessao: true, sequenciaAtual: 7, faltamParaBonus: 3, acertosParaBonus: 5,
    }));
    assert.match(t, /\b2\b[\s\S]*\/\s*5/, "mostra a sequência crua em vez do ciclo");
    assert.doesNotMatch(t, /\b7\s*\/\s*5/, "mostra 7/5");
  });

  test("⚠️ `faltam: 0` com ZERO acertos não é sequência completa", () => {
    // ⚠️ SOBREVIVENTE DA RONDA DE MUTAÇÃO. Tirar o `&& feitos > 0` de
    // `sequenciaCompleta` deixava a suíte inteira verde, porque eu nunca tinha
    // testado as duas condições em simultâneo: os meus casos a zero tinham sempre
    // `faltam: 5`. É o caso que o `feitos > 0` existe para travar, e era o único
    // que faltava. Um ciclo acabado de abrir pode devolver ambos a zero.
    const html = render(Progresso, {
      temSessao: true, sequenciaAtual: 0, faltamParaBonus: 0, acertosParaBonus: 5,
    });
    const t = texto(html);
    assert.doesNotMatch(t, /Sequência completa/i,
      "declarou a sequência completa com zero acertos feitos");
    assert.match(html, /width:\s*0%/, "barra cheia com zero acertos");
  });

  test("⛔ quem FECHA uma sequência de 5 vê 5/5, não 0/5", () => {
    // ⛔ O BACKEND NUNCA MANDA `faltamParaBonus: 0`.
    // `_lib/pontuacao-store.mjs:314` calcula `max(0, 5 - (sequenciaAtual % 5))`,
    // cujo domínio é [1..5]. Medido: sequencia=5 -> faltam=5.
    // A versão anterior decidia "completa" por `faltam === 0`, logo o ramo era
    // CÓDIGO MORTO e quem fechava cinco acertos lia "0 / 5 acertos seguidos ·
    // Faltam 5 acertos" — a app a dizer-lhe que não tem acertos nenhuns no
    // instante exacto em que completou a série. Achado da 2.ª validação.
    // Agora deriva-se de `sequenciaAtual`, que é o número do próprio backend.
    const html = render(Progresso, {
      temSessao: true, sequenciaAtual: 5, acertosParaBonus: 5,
      faltamParaBonus: 5,   // o que o backend MANDA MESMO neste ponto
    });
    const t = texto(html);
    assert.match(t, /\b5\b[\s\S]*\/\s*5/, "mostra 0/5 a quem fechou a sequência");
    assert.doesNotMatch(t, /Faltam \d+ acertos/i, "diz que faltam acertos a quem os fez todos");
    assert.match(t, /Sequência completa/i);
    assert.match(html, /width:\s*100%/, "a barra não está cheia");
  });

  test("a 10 acertos (dois ciclos) também está completa", () => {
    const t = texto(render(Progresso, {
      temSessao: true, sequenciaAtual: 10, acertosParaBonus: 5, faltamParaBonus: 5,
    }));
    assert.match(t, /Sequência completa/i);
    assert.doesNotMatch(t, /\b10\s*\/\s*5/, "mostrou a sequência crua");
  });

  test("⚠️ sem dados NÃO é 'a carregar' — um spinner eterno é uma afirmação falsa", () => {
    // Sem `carregando` e sem `erro`, um `sequenciaAtual` ausente mostrava
    // "A carregar a sua sequência…" para sempre. O `PainelTorneio` já tinha sido
    // corrigido disto na 1.ª ronda; esta secção não. Achado da 2.ª validação.
    const html = render(Progresso, { temSessao: true });
    assert.match(html, /data-estado="sem-dados"/, "continua a fingir que está a carregar");
    assert.doesNotMatch(texto(html), /Carregando/i);
  });

  test("com ERRO e a carregar ao mesmo tempo, o erro ganha", () => {
    const t = texto(render(Progresso, { temSessao: true, carregando: true, erro: "rede" }));
    assert.match(t, /não foi possível/i);
  });

  test("um alvo inválido não parte a barra", () => {
    for (const alvo2 of [0, -5, null, "5", NaN]) {
      const html = render(Progresso, { temSessao: true, sequenciaAtual: 3, acertosParaBonus: alvo2 });
      assert.doesNotMatch(texto(html), /Infinity|NaN/, `alvo ${String(alvo2)} partiu o cálculo`);
      assert.match(html, /width:\s*\d+(\.\d+)?%/, `alvo ${String(alvo2)} não produziu barra`);
    }
  });

  test("SEM SESSÃO não afirma zero acertos — convida a entrar", () => {
    // ⚠️ Isto chegou a PRODUÇÃO: um anónimo lia "0 / 5 acertos seguidos ·
    // Faltam 5 acertos", um facto sobre alguém que a app não identificou.
    const t = texto(render(Progresso, { temSessao: false }));
    assert.match(t, /Entre na sua conta/i);
    assert.doesNotMatch(t, /Faltam \d+ acertos/i, "afirma progresso sem saber quem é");
    assert.doesNotMatch(t, /\/\s*5\s*acertos/i, "mostra a barra sem sessão");
  });

  test("COM ERRO não mostra zeros — di-lo", () => {
    const t = texto(render(Progresso, { temSessao: true, erro: "rede" }));
    assert.match(t, /não foi possível/i);
    assert.doesNotMatch(t, /Faltam \d+ acertos/i, "inventa progresso quando falhou");
  });

  test("A CARREGAR não mostra progresso nem erro", () => {
    const t = texto(render(Progresso, { temSessao: true, carregando: true }));
    assert.doesNotMatch(t, /não foi possível|erro/i);
    assert.doesNotMatch(t, /Faltam \d+ acertos/i);
    assert.match(t, /carregando/i);
  });
});

describe("MC94 · EstadoBonus", () => {
  const base = { temSessao: true };

  test("distingue PENDENTE de LIQUIDADO", () => {
    const pendente = texto(render(Estado, { ...base, senhasACreditar: 20, bonusEmitido: true, liquidado: false }));
    const liquidado = texto(render(Estado, { ...base, senhasACreditar: 20, bonusEmitido: true, liquidado: true }));
    assert.match(pendente, /A creditar/i);
    assert.match(liquidado, /Já creditadas/i);
    assert.notEqual(pendente, liquidado, "pendente e liquidado renderizam igual");
  });

  test("pendente e liquidado distinguem-se também na cor, não só nas palavras", () => {
    const pendente = render(Estado, { ...base, senhasACreditar: 20, bonusEmitido: true, liquidado: false });
    const liquidado = render(Estado, { ...base, senhasACreditar: 20, bonusEmitido: true, liquidado: true });
    assert.match(pendente, /data-estado="pendente"/);
    assert.match(liquidado, /data-estado="liquidado"/);
    const cor = (h) => (h.match(/data-estado="(?:pendente|liquidado)"/) ? h : "");
    assert.notEqual(cor(pendente), cor(liquidado), "os dois estados renderizam igual");
    // ⚠️ ANCORAR NA COR DO TEXTO, não no ficheiro inteiro. A versão anterior
    // asseria /#10b981|rgba\(16,185,129/, que casava no FUNDO do selo — e por isso
    // um mutante que pintasse o texto sempre de roxo sobrevivia. Terceira vez que
    // uma asserção minha é satisfeita por outra coisa que não o que ela nomeia.
    assert.match(liquidado, /color:\s*#10b981/, "o texto do liquidado não usa o verde de sucesso");
    assert.match(pendente, /color:\s*#a78bfa/, "o texto do pendente não usa o roxo de senhas");
    assert.doesNotMatch(pendente, /color:\s*#10b981/, "o pendente está pintado de liquidado");
  });

  test("`liquidado: undefined` conta como PENDENTE", () => {
    const t = texto(render(Estado, { ...base, senhasACreditar: 20, bonusEmitido: true }));
    assert.match(t, /A creditar/i);
    assert.doesNotMatch(t, /já (foi |foram )?creditad/i, "diz que já creditou sem saber");
  });

  test("NUNCA chama isto de saldo", () => {
    for (const props of [
      { ...base, senhasACreditar: 20, bonusEmitido: true, liquidado: false },
      { ...base, senhasACreditar: 20, bonusEmitido: true, liquidado: true },
      { ...base, senhasACreditar: 0,  bonusEmitido: false },
      { temSessao: false },
      { ...base, erro: "rede" },
    ]) {
      assert.doesNotMatch(texto(render(Estado, props)), /saldo/i,
        `chamou "saldo" com props ${JSON.stringify(props)}`);
    }
  });

  test("⚠️ bónus emitido com quantidade ZERO não vira 'nenhum bónus'", () => {
    // ⚠️ `temDireito` exigia `quantidade > 0`, logo `bonusEmitido: true` com
    // `senhasACreditar: 0` dizia "Nenhum bónus conquistado neste ciclo" a quem o
    // tinha conquistado. Não é alcançável hoje, mas o CHECK da migração foi
    // afrouxado DE PROPÓSITO para permitir liquidar zerando a quantidade
    // (`20260923_mc93b_pontuacoes.sql:81-86`). Achado da 2.ª validação.
    const t = texto(render(Estado, {
      ...base, senhasACreditar: 0, bonusEmitido: true, liquidado: true,
    }));
    assert.doesNotMatch(t, /Nenhum bônus/i, "negou um bónus que o livro-razão confirma");
    assert.match(t, /Já creditadas/i);
    assert.doesNotMatch(t, /\b0\s+senhas\b/, "escreveu '0 senhas'");
  });

  test("com ERRO e a carregar ao mesmo tempo, o erro ganha", () => {
    const t = texto(render(Estado, { ...base, carregando: true, erro: "rede" }));
    assert.match(t, /não foi possível/i);
  });

  test("sem bónus nenhum, não promete nada", () => {
    const t = texto(render(Estado, { ...base, senhasACreditar: 0, bonusEmitido: false }));
    assert.doesNotMatch(t, /\b20\b/, "mostra 20 senhas sem haver bónus");
    assert.match(t, /Nenhum bônus/i);
  });

  test("mostra a quantidade que o livro-razão diz, não a constante", () => {
    const t = texto(render(Estado, { ...base, senhasACreditar: 40, bonusEmitido: true, liquidado: false }));
    assert.match(t, /\b40\s+senhas\b/, "não usa `senhasACreditar` — tem a constante em literal");
  });

  test("quantidades impossíveis não chegam ao ecrã", () => {
    // ⚠️ `Number(x) || 0` fazia `Infinity` -> "Infinity senhas" e 1e21 ->
    // "1e+21 senhas". Achado da validação independente.
    for (const q of [Infinity, 1e21, 3.7, -5, NaN, null, "20"]) {
      const t = texto(render(Estado, { ...base, senhasACreditar: q, bonusEmitido: true, liquidado: false }));
      assert.doesNotMatch(t, /Infinity|e\+|\d+\.\d/, `renderizou ${String(q)} cru`);
    }
  });

  test("SEM SESSÃO não afirma que não há bónus — convida a entrar", () => {
    const t = texto(render(Estado, { temSessao: false }));
    assert.match(t, /Entre na sua conta/i);
    assert.doesNotMatch(t, /Nenhum bônus conquistado/i, "afirma ausência sem saber quem é");
  });

  test("COM ERRO não finge ausência de bónus", () => {
    const t = texto(render(Estado, { temSessao: true, erro: "rede" }));
    assert.match(t, /não foi possível/i);
    assert.doesNotMatch(t, /Nenhum bônus conquistado/i);
  });
});

describe("MC94 · FeedbackLance", () => {
  const EU = "0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa";
  const lances = (...ls) => ls.map((l) => ({ endereco: EU, repetido: false, ...l }));

  test("diz quanto cada lance VALE, nunca que já ganhou", () => {
    // Um lance sozinho é, por definição, o menor único do utilizador: vale 3.
    const t = texto(render(Feedback, { temSessao: true, address: EU, lances: lances({ valor: 100 }) }));
    assert.match(t, /vale 3 pontos\b/, "não diz quanto vale");
    // ⚠️ Nenhum endpoint devolve pontos POR LANCE: o `lerFeedback` devolve
    // agregados e a pontuação é atribuída no fecho da rodada. "Ganhou" seria a UI
    // a afirmar um facto que o backend não produziu.
    assert.doesNotMatch(t, /ganhou|ganhaste|conquistou/i, "afirma vitória que o backend não apurou");
    assert.match(t, /apurad|coordenação/i, "não diz que a apuração é da coordenação");
  });

  test("o menor único vale 3, os outros únicos valem 1", () => {
    const t = texto(render(Feedback, {
      temSessao: true, address: EU,
      lances: lances({ valor: 100 }, { valor: 900 }),
    }));
    assert.match(t, /R\$ 1,00[\s\S]*menor único seu[\s\S]*vale 3 pontos/,
      "o menor não está marcado como menor único a 3 pontos");
    assert.match(t, /R\$ 9,00[\s\S]*único[\s\S]*vale 1 ponto/,
      "o lance mais alto não vale 1 ponto");
  });

  test("EMPATE no menor marca TODOS os empatados, não um à sorte", () => {
    // ⚠️ A versão anterior escolhia um arbitrariamente e mostrava, lado a lado,
    // dois lances de R$ 1,00 — um a "vale 3 pontos" e o outro a "vale 1 ponto".
    // Achado da validação independente. Quem desempata é o backend, no fecho.
    const html = render(Feedback, {
      temSessao: true, address: EU,
      lances: lances({ valor: 100 }, { valor: 100 }, { valor: 900 }),
    });
    const linhas = html.split('data-linha="lance"').slice(1);
    assert.equal(linhas.length, 3, "não renderizou as três linhas");
    const empatados = linhas.filter((l) => /R\$ 1,00/.test(texto(l)));
    assert.equal(empatados.length, 2);
    for (const l of empatados) {
      assert.match(texto(l), /menor único seu[\s\S]*vale 3 pontos/,
        "um dos empatados no menor valor não está marcado como os outros");
    }
    assert.match(texto(linhas.find((l) => /R\$ 9,00/.test(texto(l)))), /vale 1 ponto/);
  });

  test("um lance repetido vale zero e di-lo por palavras", () => {
    const t = texto(render(Feedback, {
      temSessao: true, address: EU, lances: lances({ valor: 250, repetido: true }),
    }));
    assert.match(t, /repetido/i);
    assert.match(t, /não vale pontos/i, "escreve 'vale 0 pontos' em vez de o dizer");
    assert.doesNotMatch(t, /vale 1 ponto|vale 3 pontos/, "atribui pontos a um lance repetido");
  });

  test("um repetido NÃO pode ser eleito menor único", () => {
    const t = texto(render(Feedback, {
      temSessao: true, address: EU,
      lances: lances({ valor: 100, repetido: true }, { valor: 900 }),
    }));
    // O de 900 é o único ÚNICO, logo é ele o menor único — e vale 3.
    assert.match(t, /R\$ 9,00[\s\S]*menor único seu[\s\S]*vale 3 pontos/);
    assert.match(t, /R\$ 1,00[\s\S]*repetido[\s\S]*não vale pontos/);
  });

  test("⚠️ `valor: null` não aparece como R$ 0,00 nem ganha 3 pontos", () => {
    // ⚠️ `Number(null) === 0`. É a armadilha EXACTA que o MC93-A pagou no motor
    // (`Number.isInteger(Number(null))` é `true` → lance nulo eleito vencedor), e
    // há caminho real: `_lib/data-store-supabase.mjs` grava `valor_centavos = null`
    // DE PROPÓSITO para marcar lance inválido. Reproduzi a mesma armadilha aqui e a
    // validação independente apanhou-a: aparecia "R$ 0,00 · menor único seu".
    const html = render(Feedback, {
      temSessao: true, address: EU,
      lances: lances({ valor: null }, { valor: 900 }),
    });
    const t = texto(html);
    assert.doesNotMatch(t, /R\$ 0,00/, "formatou um lance nulo como zero reais");
    assert.equal(html.split('data-linha="lance"').length - 1, 1,
      "o lance inválido chegou à lista");
    assert.match(t, /R\$ 9,00[\s\S]*menor único seu/,
      "o lance nulo roubou o lugar de menor único ao lance real");
  });

  test("valores impossíveis não entram na lista", () => {
    for (const valor of [undefined, NaN, Infinity, -1, "100", {}, true]) {
      const html = render(Feedback, { temSessao: true, address: EU, lances: lances({ valor }) });
      assert.equal(html.split('data-linha="lance"').length - 1, 0,
        `aceitou o valor ${String(valor)}`);
      assert.match(texto(html), /Ainda não há lances seus/i);
    }
  });

  test("sem lances, não inventa linhas", () => {
    const t = texto(render(Feedback, { temSessao: true, address: EU, lances: [] }));
    assert.match(t, /Ainda não há lances seus/i);
    assert.doesNotMatch(t, /vale \d+ ponto/, "inventou uma linha de lance");
  });

  test("só considera os lances do PRÓPRIO endereço", () => {
    const html = render(Feedback, {
      temSessao: true, address: EU,
      lances: [
        { valor: 100, repetido: false, endereco: "0xBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbb" },
        { valor: 900, repetido: false, endereco: EU },
      ],
    });
    assert.equal(html.split('data-linha="lance"').length - 1, 1,
      "mostrou o lance de outra pessoa");
    assert.doesNotMatch(texto(html), /R\$ 1,00/, "mostrou o valor do lance de outra pessoa");
  });

  test("o endereço compara-se sem distinguir maiúsculas", () => {
    const html = render(Feedback, {
      temSessao: true, address: EU.toLowerCase(),
      lances: [{ valor: 900, repetido: false, endereco: EU.toUpperCase() }],
    });
    assert.equal(html.split('data-linha="lance"').length - 1, 1,
      "perdeu o próprio lance por causa da capitalização do endereço");
  });

  test("com sessão mas sem endereço ainda não atribui lances a ninguém", () => {
    const html = render(Feedback, { temSessao: true, address: null, lances: lances({ valor: 100 }) });
    assert.equal(html.split('data-linha="lance"').length - 1, 0,
      "mostrou lances como sendo do utilizador sem saber quem ele é");
  });

  test("⛔ SEM SESSÃO convida a entrar — não afirma que não há lances seus", () => {
    // ⚠️ ISTO ESTAVA EM PRODUÇÃO, e na captura que eu próprio olhei: três secções
    // a dizer "Entre na sua conta" e esta, ao lado, a dizer a um ANÓNIMO
    // "Ainda não há lances seus nesta edição." — um facto sobre uma pessoa que a
    // app não identificou, possivelmente falso (há lances na edição).
    // Achado da 2.ª validação independente. É o MESMO defeito que a 1.ª apanhou
    // nas outras duas secções: a lição foi aplicada a 3 dos 4 sítios.
    const t = texto(render(Feedback, { temSessao: false, lances: lances({ valor: 100 }) }));
    assert.match(t, /Entre na sua conta/i);
    assert.doesNotMatch(t, /Ainda não há lances seus/i,
      "afirma a ausência de lances de alguém que não identificou");
    assert.doesNotMatch(t, /vale \d+ ponto/, "mostrou lances sem sessão");
  });

  test("os lances aparecem do menor para o maior", () => {
    const html = render(Feedback, {
      temSessao: true, address: EU,
      lances: lances({ valor: 900 }, { valor: 100 }, { valor: 500 }),
    });
    const valores = [...html.matchAll(/R\$ ([\d.,]+)/g)].map((m) => m[1]);
    assert.deepEqual(valores, ["1,00", "5,00", "9,00"], "a lista não está ordenada");
  });

  test("`repetido: undefined` conta como ÚNICO, não como repetido", () => {
    const t = texto(render(Feedback, {
      temSessao: true, address: EU,
      lances: [{ valor: 100, endereco: EU }],
    }));
    assert.match(t, /menor único seu/i);
    assert.doesNotMatch(t, /repetido/i, "tratou um lance sem a marca como repetido");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("MC94 · RankingCiclo", () => {
  const EU = "0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa";
  const OUTRO = (n) => `0x${String(n).repeat(2)}${"c".repeat(36)}`;
  const linhaRank = (i, extra = {}) => ({
    posicao: i, endereco: OUTRO(i), pontosTotais: 30 - i, acertosTotais: 3, bonusEmitido: false, ...extra,
  });

  test("destaca a posição do próprio utilizador", () => {
    const html = render(Ranking, {
      address: EU,
      ranking: [linhaRank(1), { ...linhaRank(2), endereco: EU }],
      total: 2,
    });
    assert.match(html, /data-eu="sim"/, "não marca a linha do próprio");
    assert.equal(html.split('data-eu="sim"').length - 1, 1, "marcou mais de uma linha como sendo o próprio");
    assert.match(texto(html), /você/i);
  });

  test("não destaca ninguém quando não há endereço", () => {
    const html = render(Ranking, { address: null, ranking: [linhaRank(1)], total: 1 });
    assert.doesNotMatch(html, /data-eu="sim"/, "destacou alguém sem saber quem é o utilizador");
    assert.doesNotMatch(texto(html), /você/i);
  });

  test("VAZIO e ERRO não são a mesma coisa", () => {
    const vazio = texto(render(Ranking, { ranking: [], total: 0 }));
    const erro  = texto(render(Ranking, { ranking: [], total: 0, erro: "rede" }));
    assert.match(vazio, /Ainda não há pontuações/i);
    assert.doesNotMatch(vazio, /não foi possível/i, "chama avaria a um ciclo ainda sem pontuações");
    assert.match(erro, /não foi possível/i);
    assert.doesNotMatch(erro, /Ainda não há pontuações/i, "chama ciclo vazio a uma falha de rede");
  });

  test("com ERRO e a carregar ao mesmo tempo, o erro ganha", () => {
    const t = texto(render(Ranking, { ranking: [], total: 0, carregando: true, erro: "rede" }));
    assert.match(t, /não foi possível/i, "a espera escondeu o erro");
  });

  test("A CARREGAR não é vazio nem erro", () => {
    const t = texto(render(Ranking, { ranking: [], total: 0, carregando: true }));
    assert.match(t, /carregando/i);
    assert.doesNotMatch(t, /Ainda não há pontuações|não foi possível/i);
  });

  test("mostra no máximo 10, mesmo com mais — e diz quantos há", () => {
    const html = render(Ranking, {
      ranking: Array.from({ length: 14 }, (_, i) => linhaRank(i + 1)),
      total: 25,
    });
    assert.equal(html.split('data-linha="rank"').length - 1, 10,
      "não limitou o top a 10 linhas");
    // ⚠️ Ancorado: a versão anterior usava /25/, que casava em qualquer sítio —
    // inclusive nos pontos de uma linha. A frase inteira é o que o utilizador lê.
    assert.match(texto(html), /A mostrar os 10 primeiros de 25 participantes\./,
      "não diz quantos participantes há para lá do top");
  });

  test("⚠️ `total` a zero com linhas na lista não escreve '0 participantes'", () => {
    // ⚠️ `useRanking` faz `Number(data?.total) || 0`: um endpoint que omita `total`
    // (ou o mande a zero) fazia escrever "0 participantes." debaixo de 4 linhas
    // visíveis — a página a contradizer-se a si mesma no mesmo parágrafo.
    const t = texto(render(Ranking, {
      ranking: [linhaRank(1), linhaRank(2), linhaRank(3), linhaRank(4)],
      total: 0,
    }));
    assert.doesNotMatch(t, /\b0 participantes\b/,
      "escreveu '0 participantes' por baixo de 4 linhas de ranking");
    assert.match(t, /\b4 participantes\b/, "não reconciliou a contagem com a lista");
  });

  test("um só participante fala no singular", () => {
    const t = texto(render(Ranking, { ranking: [linhaRank(1)], total: 1 }));
    assert.match(t, /\b1 participante\./, "escreve '1 participantes'");
  });

  test("⚠️ a posição mostrada é a do backend, não o índice da lista", () => {
    // Um ranking paginado ou filtrado tem `posicao` que NÃO coincide com a ordem.
    const t = texto(render(Ranking, {
      ranking: [linhaRank(7), linhaRank(8), linhaRank(9)],
      total: 30,
    }));
    assert.match(t, /7º/, "reescreveu a posição do backend com o índice da lista");
    assert.match(t, /8º/);
    assert.match(t, /9º/);
    assert.doesNotMatch(t, /\b1º/, "numerou as linhas de 1 em vez de usar `posicao`");
  });

  test("⚠️ `posicao: null` cai na ordem da lista, sem 'º' solto nem '0º'", () => {
    // `lerFeedback` devolve `linha.posicao || null`.
    const t = texto(render(Ranking, {
      ranking: [
        { ...linhaRank(1), posicao: null },
        { ...linhaRank(2), posicao: 0 },
      ],
      total: 2,
    }));
    assert.doesNotMatch(t, /0º/, "renderizou '0º'");
    assert.doesNotMatch(t, /(^|\s)º/, "renderizou um 'º' sem número à frente");
    assert.match(t, /1º/);
    assert.match(t, /2º/);
  });

  test("⚠️ `pontosTotais` ausente mostra '—', não zero", () => {
    const t = texto(render(Ranking, {
      ranking: [{ ...linhaRank(1), pontosTotais: null }],
      total: 1,
    }));
    assert.match(t, /—/, "não marca a ausência de pontos");
    assert.doesNotMatch(t, /\b0\b/, "inventou zero pontos onde o backend não disse nada");
  });

  test("quem está fora do top 10 vê a SUA linha à parte, com a posição real", () => {
    const t = texto(render(Ranking, {
      address: EU,
      ranking: [
        ...Array.from({ length: 10 }, (_, i) => linhaRank(i + 1)),
        { ...linhaRank(17), endereco: EU },
      ],
      total: 17,
    }));
    assert.match(t, /Sua posição/i, "não mostra a linha do utilizador fora do top");
    assert.match(t, /17º/, "não mostra a posição real de quem está fora do top");
    assert.match(t, /você/i);
  });

  test("a ordem da lista é preservada — o 1.º do backend é o 1.º no ecrã", () => {
    const html = render(Ranking, {
      ranking: [linhaRank(1), linhaRank(2), linhaRank(3)],
      total: 3,
    });
    const ordem = [...html.matchAll(/data-linha="rank"[\s\S]*?>(\d+)º/g)].map((m) => m[1]);
    assert.deepEqual(ordem, ["1", "2", "3"], "o ranking foi reordenado");
  });

  test("um `total` que não é número não escreve lixo", () => {
    for (const total of [null, undefined, NaN, "muitos", Infinity, -3]) {
      const t = texto(render(Ranking, { ranking: [linhaRank(1), linhaRank(2)], total }));
      assert.doesNotMatch(t, /NaN|Infinity|undefined|null|muitos/,
        `total ${String(total)} chegou ao ecrã`);
      assert.match(t, /\b2 participantes\b/, `não reconciliou com a lista (total=${String(total)})`);
    }
  });

  test("os endereços aparecem ABREVIADOS (R4)", () => {
    const completo = OUTRO(1);
    const t = texto(render(Ranking, { ranking: [linhaRank(1)], total: 1 }));
    assert.doesNotMatch(t, new RegExp(completo, "i"),
      "mostrou o endereço inteiro de um terceiro — as capturas vão para o repositório");
    // `encurtar` = 6 primeiros + … + 4 últimos (`_estilo.js`).
    assert.match(t, /0x11cc…cccc/, "não abreviou no formato do projeto");
  });

  test("o selo de bónus só aparece a quem o backend diz que o tem", () => {
    const com = render(Ranking, { ranking: [linhaRank(1, { bonusEmitido: true })], total: 1 });
    const sem = render(Ranking, { ranking: [linhaRank(1, { bonusEmitido: false })], total: 1 });
    assert.match(com, /🎟️/);
    assert.doesNotMatch(sem, /🎟️/, "deu selo de bónus a quem não o tem");
  });
});

// ───────────────────────────────────────────────────────────────────────────
// APARÊNCIA. Um teste não vê o que uma captura vê — mas depois de a captura ver,
// dá-se-lhe um nome e prende-se. Os três valores aqui não são gosto: cada um é uma
// regra que este projeto mediu e pagou.
// ───────────────────────────────────────────────────────────────────────────
describe("MC94 · aparência das secções", () => {
  const TODAS = () => [
    [Painel,    { temSessao: true, feedback: { posicao: 1, pontosTotais: 4, acertosTotais: 1 } }],
    [Progresso, { temSessao: true, sequenciaAtual: 3, faltamParaBonus: 2, acertosParaBonus: 5 }],
    [Estado,    { temSessao: true, senhasACreditar: 20, bonusEmitido: true, liquidado: false }],
    [Feedback,  { address: "0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa",
                  lances: [{ valor: 100, repetido: false, endereco: "0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa" }] }],
    [Ranking,   { ranking: [{ posicao: 1, endereco: "0xCCCCccccCCCCccccCCCCccccCCCCccccCCCCcccc",
                              pontosTotais: 9, acertosTotais: 3, bonusEmitido: false }], total: 1 }],
  ];

  test("as cinco secções usam o vidro SÓLIDO do projeto, não um fundo translúcido", () => {
    // ⚠️ ISTO CHEGOU A PRODUÇÃO E SÓ A CAPTURA O VIU. A primeira versão usava
    // `rgba(255,255,255,0.02)` — quase transparente — e a imagem de fundo do app
    // (electrodomésticos, confetes, luzes) passava através do texto. O markup
    // estava CORRECTO, por isso nenhum teste falhou.
    // `rgba(13,18,53,0.92)` é o `.gut-glass--solid` de `globals.css:429`, criado no
    // MC25.7 e reutilizado no MC89.4 pelo MESMO sintoma. A minha segunda tentativa
    // inventou `rgba(5,8,24,0.82)`, 18% de transparência — que continua a deixar
    // passar os electrodomésticos brancos. Não se inventa fundo novo.
    for (const [Componente, props] of TODAS()) {
      const html = render(Componente, props);
      assert.match(html, /background:\s*rgba\(13,\s*18,\s*53,\s*0\.92\)/,
        "uma secção deixou de usar o vidro sólido — o texto vai assentar na ilustração de fundo");
    }
  });

  test("nenhuma secção usa backdrop-filter", () => {
    // ⚠️ O projeto MEDIU que o custo do blur é por CAMADA, não por raio: 11 camadas
    // custaram 29 fps, e removê-las deu 17,5 -> 59,6 fps. Cinco secções novas com
    // blur seriam cinco camadas a mais num ecrã que já tem as suas.
    for (const [Componente, props] of TODAS()) {
      assert.doesNotMatch(render(Componente, props), /backdrop-?[fF]ilter/,
        "uma secção acrescentou uma camada de blur ao ecrã");
    }
  });

  test("as senhas aparecem em ROXO, que é a cor semântica delas no app", () => {
    // ⚠️ `#a78bfa` é a cor de senhas em todo o app (KPI Senhas, "Trocar por
    // senhas"). Pintar isto de laranja quebraria a leitura que o utilizador já tem.
    const html = render(Estado, { temSessao: true, senhasACreditar: 20, bonusEmitido: true, liquidado: false });
    assert.match(html, /#a78bfa/i, "as senhas a creditar perderam a cor semântica de senhas");
  });

  test("todas as secções se identificam com `data-secao` — é por aí que a página é medida", () => {
    const esperados = ["painel-torneio", "progresso-bonus", "estado-bonus", "feedback-lance", "ranking-ciclo"];
    const obtidos = TODAS().map(([C, p]) => {
      const m = render(C, p).match(/data-secao="([^"]+)"/);
      return m && m[1];
    });
    assert.deepEqual(obtidos, esperados, "uma secção perdeu ou trocou o seu `data-secao`");
  });
});

// ───────────────────────────────────────────────────────────────────────────
// As guardas de `_estilo.js`, testadas DIRECTAMENTE.
//
// ⚠️ SOBREVIVENTE DA RONDA DE MUTAÇÃO. Trocar o `"—"` de `reais()` por
// `"R$ 0,00"` deixava as 48 asserções verdes: `FeedbackLance` filtra com
// `valorUtilizavel` ANTES de chamar `reais`, logo o ramo de recusa do `reais`
// nunca era exercitado. A guarda existe em dois sítios e eu só testava o de fora
// — e é o de dentro que protege quem chamar `reais()` numa secção futura.
//
// `_estilo.js` é JS puro (sem JSX, sem imports), por isso importa-se aqui
// directamente, sem passar pelo Vite.
// ───────────────────────────────────────────────────────────────────────────
describe("MC94 · _estilo — as guardas sem coerção", () => {
  test("`reais` recusa tudo o que não é um valor, e NUNCA devolve R$ 0,00", () => {
    for (const v of [null, undefined, NaN, Infinity, -Infinity, -1, "100", "", {}, [], true, false]) {
      assert.equal(reais(v), "—", `reais(${JSON.stringify(v)}) devia ser "—"`);
    }
  });

  test("⚠️ `reais` recusa não-inteiros e inteiros não seguros", () => {
    // ⚠️ `valorUtilizavel` exigia só "finito", enquanto `inteiroSeguro` exigia
    // inteiro seguro — assimetria que deixava passar `reais(3.7)` = "R$ 0,04",
    // `reais(0.5)` = "R$ 0,01" e `reais(1e21)` = "R$ 10000000000000000000,00".
    // Um lance é em CENTAVOS: inteiros por definição. Achado da 2.ª validação.
    for (const v of [3.7, 0.5, 1e21, Number.MAX_SAFE_INTEGER + 2]) {
      assert.equal(reais(v), "—", `reais(${v}) devia ser "—"`);
      assert.equal(valorUtilizavel(v), false, `valorUtilizavel(${v}) devia ser false`);
    }
  });

  test("`reais` formata em pt-BR, com vírgula", () => {
    assert.equal(reais(0), "R$ 0,00");   // zero É um valor: R$ 0,00 é verdade aqui
    assert.equal(reais(1), "R$ 0,01");
    assert.equal(reais(100), "R$ 1,00");
    assert.equal(reais(123456), "R$ 1234,56");
  });

  test("`valorUtilizavel` não coage — é o defeito do MC93-A", () => {
    for (const v of [0, 1, 100, 999999]) assert.equal(valorUtilizavel(v), true, String(v));
    for (const v of [null, undefined, NaN, Infinity, -1, "0", "100", {}, [], true]) {
      assert.equal(valorUtilizavel(v), false, `aceitou ${JSON.stringify(v)}`);
    }
  });

  test("`inteiroSeguro` devolve o número ou `null`, nunca zero inventado", () => {
    assert.equal(inteiroSeguro(0), 0);
    assert.equal(inteiroSeguro(40), 40);
    for (const v of [null, undefined, NaN, Infinity, 1e21, 3.7, -1, "20", {}, true]) {
      assert.equal(inteiroSeguro(v), null, `aceitou ${String(v)}`);
    }
  });

  test("`encurtar` nunca devolve um endereço completo (R4)", () => {
    const completo = "0x1111111111111111111111111111111111111111";
    const curto = encurtar(completo);
    assert.notEqual(curto, completo);
    assert.ok(curto.length < completo.length, "não encurtou");
    assert.equal(curto, "0x1111…1111");
    // Um valor curto de mais não se parte nem se decora.
    assert.equal(encurtar("0xabc"), "0xabc");
    assert.equal(encurtar(null), "");
  });
});

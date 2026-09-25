// hooks-torneio.test.mjs — MC94. `useRanking` e `useFeedback` exercitados a correr,
// com o `apiGet` REAL e um duplo de `fetch`.
//
// Corre com:  node --test --test-concurrency=1 src/hooks/__tests__/hooks-torneio.test.mjs
// (a partir de desafio-gut/frontend)
//
// Ver `_hook-runner.mjs` para o instrumento e os seus limites. Os três primeiros
// testes são CONTROLOS POSITIVOS: partem hooks de propósito e exigem que o condutor
// os reprove. Sem eles, um erro na minha comparação de dependências daria verde a
// tudo o que vem depois.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { useEffect, useState } from "react";
import { montar, duploDeFetch } from "./_hook-runner.mjs";
import { useRanking } from "../useRanking.js";
import { useFeedback } from "../useFeedback.js";

/** Espera que uma condição se verifique, deixando o hook assentar. */
async function ate(controlador, condicao, comoFalhou) {
  for (let i = 0; i < 20; i += 1) {
    if (condicao(controlador.resultado())) return controlador.resultado();
    await new Promise((r) => setTimeout(r, 0));
  }
  assert.fail(`${comoFalhou} — estado final: ${JSON.stringify(controlador.resultado())}`);
}

// ───────────────────────────────────────────────────────────────────────────
// CONTROLOS POSITIVOS — o instrumento tem de ver defeitos que EU plantei.
// ───────────────────────────────────────────────────────────────────────────
describe("MC94 · controlo positivo do condutor de hooks", () => {
  test("vê deps erradas: `[]` ignora a mudança de argumento", async () => {
    // Hook partido de propósito: array de dependências vazio.
    function useCego(chave) {
      const [visto, setVisto] = useState(null);
      useEffect(() => { setVisto(chave); }, []); // ⚠️ falta `chave`
      return visto;
    }
    const c = montar(useCego, ["A"]);
    await c.assentar();
    assert.equal(c.resultado(), "A");
    await c.actualizar(["B"]);
    // Se o condutor não comparasse deps, isto seria "B" e o controlo não provaria nada.
    assert.equal(c.resultado(), "A", "o condutor não distingue deps — é CEGO");
  });

  test("vê deps certas: com `[chave]` o efeito volta a correr", async () => {
    function useAtento(chave) {
      const [visto, setVisto] = useState(null);
      useEffect(() => { setVisto(chave); }, [chave]);
      return visto;
    }
    const c = montar(useAtento, ["A"]);
    await c.assentar();
    await c.actualizar(["B"]);
    assert.equal(c.resultado(), "B", "o condutor não re-corre efeitos quando as deps mudam");
  });

  test("vê falta de limpeza: escrita depois de desmontar", async () => {
    let escreveuTarde = false;
    function useFugaDeMemoria() {
      const [, set] = useState(0);
      useEffect(() => {
        setTimeout(() => { escreveuTarde = true; set(1); }, 1);
        return undefined; // ⚠️ sem limpeza
      }, []);
      return null;
    }
    const c = montar(useFugaDeMemoria, []);
    await c.desmontar();
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(escreveuTarde, true, "o condutor não deixa o trabalho tardio acontecer");
    // ⚠️ A METADE QUE FALTAVA. A versão anterior parava na linha acima — afirmava
    // que o temporizador DISPAROU, não que a escrita é VISÍVEL ao instrumento. E
    // não era: o condutor engolia-a, e por isso as asserções de "não escreveu
    // depois de desmontar" nos testes dos hooks reais não podiam falhar.
    // Achado da 2.ª validação independente.
    assert.deepEqual(c.tardias(), [1],
      "o condutor não VÊ a escrita tardia — as asserções de fuga são vácuas");
  });

  test("o duplo de fetch honra o AbortSignal, como o fetch real", async () => {
    const f = duploDeFetch(() => ({ demora: 50, json: {} }));
    try {
      const controlador = new AbortController();
      const promessa = globalThis.fetch("/x", { signal: controlador.signal });
      controlador.abort();
      await assert.rejects(promessa, (e) => e.name === "AbortError",
        "um duplo que ignora o sinal esconde o defeito que se procura");
    } finally { f.restaurar(); }
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("MC94 · useRanking", () => {
  test("sem cicloId não toca na rede e não fica pendurado a carregar", async () => {
    const f = duploDeFetch(() => assert.fail("chamou a rede sem cicloId"));
    try {
      const c = montar(useRanking, [null]);
      await c.assentar();
      assert.equal(f.chamadas.length, 0);
      assert.deepEqual(c.resultado(), { ranking: [], total: 0, carregando: false, erro: null });
    } finally { f.restaurar(); }
  });

  test("resposta boa dá ranking e total, e o URL leva o ciclo", async () => {
    const f = duploDeFetch(() => ({
      json: { cicloId: "R-1", total: 2, ranking: [{ endereco: "0xaa", posicao: 1 }, { endereco: "0xbb", posicao: 2 }] },
    }));
    try {
      const c = montar(useRanking, ["R-1"]);
      const r = await ate(c, (e) => !e.carregando, "não saiu de carregando");
      assert.equal(r.erro, null);
      assert.equal(r.total, 2);
      assert.equal(r.ranking.length, 2);
      // O `apiGet` real é que monta isto — o BASE das Netlify Functions incluído.
      assert.match(f.chamadas[0].url, /^\/\.netlify\/functions\/ranking\?cicloId=R-1$/);
    } finally { f.restaurar(); }
  });

  test("ciclo com caracteres especiais vai codificado", async () => {
    const f = duploDeFetch(() => ({ json: { total: 0, ranking: [] } }));
    try {
      const c = montar(useRanking, ["R/1 &2"]);
      await ate(c, (e) => !e.carregando, "não respondeu");
      assert.match(f.chamadas[0].url, /cicloId=R%2F1%20%262$/);
    } finally { f.restaurar(); }
  });

  test("500 é erro — e NÃO um ranking vazio", async () => {
    const f = duploDeFetch(() => ({ status: 500, json: { erro: "interno" } }));
    try {
      const c = montar(useRanking, ["R-1"]);
      const r = await ate(c, (e) => !e.carregando, "não saiu de carregando");
      assert.equal(r.erro, "resposta_invalida");
      assert.deepEqual(r.ranking, []);
      assert.equal(r.total, 0);
    } finally { f.restaurar(); }
  });

  test("⚠️ HTML com status 200 (o fallback SPA) é ERRO, não ranking vazio", async () => {
    // ⚠️ DEFEITO REAL DO PROJETO, não hipótese: `netlify.toml:34` reescreve `/*`
    // para `/index.html` com **status 200**. Uma função ausente ou mal deployada
    // devolve HTML com 200 — e o `apiGet` devolve `ok: true, data: null`. Sem esta
    // guarda o utilizador via "Ainda não há pontuações neste ciclo" enquanto o
    // endpoint estava em baixo. É a regra que o MC93-F registou: validar por
    // `content-type: application/json`, nunca pelo código HTTP.
    const f = duploDeFetch(() => ({ status: 200, corpo: "<!doctype html><html><body>…</body></html>" }));
    try {
      const c = montar(useRanking, ["R-1"]);
      const r = await ate(c, (e) => !e.carregando, "não saiu de carregando");
      assert.equal(r.erro, "resposta_invalida",
        "aceitou o index.html como resposta do endpoint");
      assert.deepEqual(r.ranking, []);
    } finally { f.restaurar(); }
  });

  test("falha de rede é erro de rede", async () => {
    const f = duploDeFetch(() => { throw new TypeError("Failed to fetch"); });
    try {
      const c = montar(useRanking, ["R-1"]);
      const r = await ate(c, (e) => !e.carregando, "não saiu de carregando");
      assert.equal(r.erro, "rede");
    } finally { f.restaurar(); }
  });

  test("`ranking` não-array não passa a lista", async () => {
    const f = duploDeFetch(() => ({ json: { total: 9, ranking: { nao: "e array" } } }));
    try {
      const c = montar(useRanking, ["R-1"]);
      const r = await ate(c, (e) => !e.carregando, "não respondeu");
      assert.deepEqual(r.ranking, [], "passou um objecto onde a UI espera lista");
    } finally { f.restaurar(); }
  });

  test("desmontar ABORTA e não escreve estado depois", async () => {
    const f = duploDeFetch(() => ({ demora: 40, json: { total: 1, ranking: [{ endereco: "0xaa" }] } }));
    try {
      const c = montar(useRanking, ["R-1"]);
      await c.desmontar();
      assert.equal(f.chamadas[0].signal?.aborted, true, "não abortou o pedido em curso");
      await new Promise((r) => setTimeout(r, 60));
      assert.deepEqual(c.tardias(), [], "escreveu estado depois de desmontar");
    } finally { f.restaurar(); }
  });

  test("mudar de cicloId refaz o pedido e a resposta ANTIGA não vence", async () => {
    // O antigo é lento e responde LIXO; o novo é rápido e responde certo. Se o
    // pedido antigo não fosse abortado/descartado, sobrescreveria o novo.
    const f = duploDeFetch((url) => (url.includes("R-1")
      ? { demora: 40, json: { total: 999, ranking: [{ endereco: "0xVELHO" }] } }
      : { json: { total: 1, ranking: [{ endereco: "0xNOVO" }] } }));
    try {
      const c = montar(useRanking, ["R-1"]);
      await c.actualizar(["R-2"]);
      const r = await ate(c, (e) => !e.carregando && e.ranking.length > 0, "não carregou o novo ciclo");
      assert.equal(r.ranking[0].endereco, "0xNOVO");
      assert.equal(r.total, 1);
      assert.equal(f.chamadas.length, 2, "não voltou a pedir com o ciclo novo");
      assert.equal(f.chamadas[0].signal?.aborted, true, "não abortou o pedido do ciclo antigo");
      await new Promise((r2) => setTimeout(r2, 60));
      assert.equal(c.resultado().ranking[0].endereco, "0xNOVO",
        "a resposta atrasada do ciclo antigo sobrescreveu o novo");
    } finally { f.restaurar(); }
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("MC94 · useRanking — a corrida que a guarda `vivo` trava", () => {
  test("resposta JÁ resolvida que aterra depois do desmonte não escreve estado", async () => {
    // ⚠️ Esta é a corrida real: o `fetch` resolve, e SÓ DEPOIS o componente
    // desmonta — o `abort` já não desfaz nada, porque a resposta veio. Sem o
    // `if (!vivo) return` depois do `await`, o hook escreve estado num componente
    // que já não existe. Nenhum teste cobria isto: o mutante que removia a guarda
    // sobrevivia à suíte inteira (achado da 2.ª validação independente), porque os
    // testes de desmonte usavam respostas LENTAS, que o `abort` rejeita.
    let controlador = null;
    const f = duploDeFetch(() => ({
      json: { total: 1, ranking: [{ endereco: "0xaa" }] },
      // O desmonte acontece DEPOIS de a resposta existir — a janela exacta.
      aposResposta: async () => { await controlador.desmontar(); },
    }));
    try {
      controlador = montar(useRanking, ["R-1"]);
      await new Promise((r) => setTimeout(r, 30));
      assert.deepEqual(controlador.tardias(), [],
        "escreveu o resultado num hook já desmontado");
    } finally { f.restaurar(); }
  });

  test("um pedido novo limpa o erro do anterior", async () => {
    // Sem isto, mudar de ciclo depois de uma falha mostrava o ERRO do ciclo antigo
    // em vez de "a carregar" — porque a secção testa `erro` antes de `carregando`.
    let vez = 0;
    const f = duploDeFetch(() => (vez++ === 0
      ? { status: 500, json: { erro: "interno" } }
      : { demora: 20, json: { total: 1, ranking: [{ endereco: "0xbb" }] } }));
    try {
      const c = montar(useRanking, ["R-1"]);
      await ate(c, (e) => e.erro !== null, "não falhou como esperado");
      await c.actualizar(["R-2"]);
      assert.equal(c.resultado().erro, null,
        "manteve o erro do ciclo anterior enquanto o novo carregava");
      assert.equal(c.resultado().carregando, true);
    } finally { f.restaurar(); }
  });
});

describe("MC94 · useFeedback", () => {
  const ARGS = ["R-1", "0xda3a83aaaaaaaaaaaaaaaaaaaaaaaaaaaaaae84e", "jwt-de-teste"];

  test("sem token não chama nada — o 401 é certo e poupa-se", async () => {
    const f = duploDeFetch(() => assert.fail("chamou sem token"));
    try {
      const c = montar(useFeedback, ["R-1", ARGS[1], null]);
      await c.assentar();
      assert.equal(f.chamadas.length, 0);
      assert.deepEqual(c.resultado(),
        { feedback: null, carregando: false, erro: null, semSessao: true });
    } finally { f.restaurar(); }
  });

  test("sem endereço também não chama", async () => {
    const f = duploDeFetch(() => assert.fail("chamou sem endereço"));
    try {
      const c = montar(useFeedback, ["R-1", null, "jwt"]);
      await c.assentar();
      assert.equal(f.chamadas.length, 0);
      assert.equal(c.resultado().semSessao, true);
    } finally { f.restaurar(); }
  });

  test("envia o Bearer e pede o recurso certo, com o endereço codificado", async () => {
    const f = duploDeFetch(() => ({ json: { pontosTotais: 7 } }));
    try {
      const c = montar(useFeedback, ARGS);
      await ate(c, (e) => !e.carregando, "não respondeu");
      const chamada = f.chamadas[0];
      // Montado pelo `apiGet` REAL (`src/lib/api.js:montarHeaders`).
      assert.equal(chamada.headers.Authorization, "Bearer jwt-de-teste",
        "não enviou o Bearer — o endpoint devolveria 401");
      assert.match(chamada.url, /recurso=feedback/);
      assert.match(chamada.url, new RegExp(`endereco=${ARGS[1]}$`));
      // ⚠️ GET não leva Content-Type (o `apiGet` só o põe com corpo). Um
      // Content-Type a mais num GET já custou pré-flights CORS a este projeto.
      assert.equal(chamada.headers["Content-Type"], undefined);
    } finally { f.restaurar(); }
  });

  test("401 é FALTA DE SESSÃO, não erro de rede", async () => {
    const f = duploDeFetch(() => ({ status: 401, json: { erro: "sessao_invalida" } }));
    try {
      const c = montar(useFeedback, ARGS);
      const r = await ate(c, (e) => !e.carregando, "não respondeu");
      assert.equal(r.semSessao, true);
      assert.equal(r.erro, null, "um 401 apresentado como avaria manda o utilizador tentar de novo em vez de entrar");
      assert.equal(r.feedback, null);
    } finally { f.restaurar(); }
  });

  test("403 (anti-IDOR: sessão de outro endereço) também é falta de sessão", async () => {
    const f = duploDeFetch(() => ({ status: 403, json: { erro: "acesso_negado" } }));
    try {
      const c = montar(useFeedback, ARGS);
      const r = await ate(c, (e) => !e.carregando, "não respondeu");
      assert.equal(r.semSessao, true);
      assert.equal(r.erro, null);
    } finally { f.restaurar(); }
  });

  test("500 é erro, e NÃO falta de sessão", async () => {
    const f = duploDeFetch(() => ({ status: 500, json: { erro: "interno" } }));
    try {
      const c = montar(useFeedback, ARGS);
      const r = await ate(c, (e) => !e.carregando, "não respondeu");
      assert.equal(r.erro, "resposta_invalida");
      assert.equal(r.semSessao, false, "mandou o utilizador entrar na conta por causa de uma avaria do servidor");
    } finally { f.restaurar(); }
  });

  test("⚠️ HTML com status 200 é erro, não feedback vazio", async () => {
    const f = duploDeFetch(() => ({ status: 200, corpo: "<!doctype html><html></html>" }));
    try {
      const c = montar(useFeedback, ARGS);
      const r = await ate(c, (e) => !e.carregando, "não respondeu");
      assert.equal(r.erro, "resposta_invalida",
        "aceitou o index.html como feedback do torneio");
      assert.equal(r.feedback, null);
    } finally { f.restaurar(); }
  });

  test("resposta boa passa o corpo tal como vem, sem normalizar `liquidado`", async () => {
    // ⚠️ `liquidado` pode vir ausente (o default `vazio` de `lerFeedback` não o
    // inclui). Normalizá-lo aqui a `false` seria inventar; e a `true` seria mentir.
    // Quem decide é o `EstadoBonus`, e decide por PENDENTE.
    const f = duploDeFetch(() => ({ json: { pontosTotais: 7, acertosTotais: 2, senhasACreditar: 20, bonusEmitido: true } }));
    try {
      const c = montar(useFeedback, ARGS);
      const r = await ate(c, (e) => !e.carregando, "não respondeu");
      assert.equal(r.feedback.pontosTotais, 7);
      assert.equal("liquidado" in r.feedback, false, "inventou o campo `liquidado`");
      assert.equal(r.erro, null);
      assert.equal(r.semSessao, false);
    } finally { f.restaurar(); }
  });

  test("desmontar aborta e não escreve depois", async () => {
    const f = duploDeFetch(() => ({ demora: 40, json: { pontosTotais: 7 } }));
    try {
      const c = montar(useFeedback, ARGS);
      await c.desmontar();
      assert.equal(f.chamadas[0].signal?.aborted, true, "não abortou");
      await new Promise((r) => setTimeout(r, 60));
      assert.deepEqual(c.tardias(), [], "escreveu estado depois de desmontar");
    } finally { f.restaurar(); }
  });

  test("entrar na conta (token aparece) dispara o pedido", async () => {
    const f = duploDeFetch(() => ({ json: { pontosTotais: 3 } }));
    try {
      const c = montar(useFeedback, ["R-1", ARGS[1], null]);
      await c.assentar();
      assert.equal(f.chamadas.length, 0);
      assert.equal(c.resultado().semSessao, true);

      await c.actualizar(ARGS); // o utilizador entrou
      const r = await ate(c, (e) => !e.carregando && e.feedback !== null, "não pediu depois do login");
      assert.equal(f.chamadas.length, 1);
      assert.equal(r.feedback.pontosTotais, 3);
      assert.equal(r.semSessao, false);
    } finally { f.restaurar(); }
  });

  test("⚠️ TROCAR DE CARTEIRA refaz o pedido e não deixa os dados do endereço anterior", async () => {
    // ⚠️ R4: mostrar a pontuação da carteira anterior a uma carteira nova é
    // expor dados de outra pessoa. As deps do efeito incluem `endereco`, mas
    // nada o testava — o mutante que as removia sobrevivia (2.ª validação).
    const OUTRO = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const f = duploDeFetch((url) => (url.includes(OUTRO)
      ? { json: { pontosTotais: 99 } }
      : { json: { pontosTotais: 7 } }));
    try {
      const c = montar(useFeedback, ARGS);
      await ate(c, (e) => e.feedback !== null, "não carregou o primeiro");
      assert.equal(c.resultado().feedback.pontosTotais, 7);

      await c.actualizar(["R-1", OUTRO, ARGS[2]]);
      const r = await ate(c, (e) => e.feedback !== null && !e.carregando, "não pediu para a carteira nova");
      assert.equal(f.chamadas.length, 2, "não refez o pedido ao trocar de carteira");
      assert.match(f.chamadas[1].url, new RegExp(OUTRO));
      assert.equal(r.feedback.pontosTotais, 99,
        "deixou no ecrã a pontuação da carteira anterior");
    } finally { f.restaurar(); }
  });

  test("⚠️ RENOVAR O TOKEN refaz o pedido", async () => {
    const f = duploDeFetch(() => ({ json: { pontosTotais: 7 } }));
    try {
      const c = montar(useFeedback, ARGS);
      await ate(c, (e) => e.feedback !== null, "não carregou");
      await c.actualizar(["R-1", ARGS[1], "jwt-renovado"]);
      await ate(c, (e) => e.feedback !== null && !e.carregando, "não repetiu com o token novo");
      assert.equal(f.chamadas.length, 2, "não refez o pedido com o token renovado");
      assert.equal(f.chamadas[1].headers.Authorization, "Bearer jwt-renovado");
    } finally { f.restaurar(); }
  });

  test("sair da conta (token desaparece) volta a SEM SESSÃO e não deixa dados à vista", async () => {
    // ⚠️ R4: deixar o feedback do utilizador anterior no ecrã depois do logout é
    // exposição de dados de outra pessoa no mesmo dispositivo.
    const f = duploDeFetch(() => ({ json: { pontosTotais: 3, senhasACreditar: 20 } }));
    try {
      const c = montar(useFeedback, ARGS);
      await ate(c, (e) => e.feedback !== null, "não carregou");
      await c.actualizar(["R-1", ARGS[1], null]);
      const r = c.resultado();
      assert.equal(r.semSessao, true);
      assert.equal(r.feedback, null, "manteve os dados do utilizador anterior depois do logout");
    } finally { f.restaurar(); }
  });
});

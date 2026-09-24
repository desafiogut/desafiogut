// MC93-B — endpoints do torneio: /pontuar (admin), /ranking, /feedback.
//
// PORQUÊ ESTE TESTE EXISTE: `/pontuar` escreve a tabela que decide prémio e
// regista dívida de senhas. Se o guarda de admin cair, qualquer pessoa pontua
// o torneio. E `/feedback` devolve a posição de um endereço — sem anti-IDOR,
// expõe a atividade de qualquer carteira a qualquer pessoa.
//
// Os três endpoints são exercidos a sério (handler invocado com um Request
// real), com o store e a autenticação mockados — não há asserções sobre o
// texto do ficheiro.
//
// node --test --experimental-test-module-mocks _tests/mc93b-endpoints.test.mjs

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const estado = {
  adminNegado: null,      // Response quando guardAdmin recusa
  sessaoValida: true,
  registado: [],
  ranking: [],
  feedback: null,
  falharPontuacao: false,
  admins: [],
  enderecoSessao: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};

mock.module("../_lib/admin-auth.mjs", {
  namedExports: { guardAdmin: async () => estado.adminNegado },
});
mock.module("../_lib/jwt.mjs", {
  namedExports: {
    // ⚠️ O mock EXIGE uma string, como a função real: `_lib/jwt.mjs:78`
    // recebe o TOKEN, não o Request. A primeira versão deste mock ignorava o
    // argumento, e por isso deu verde a um endpoint que passava `req` e
    // lançava JWSInvalid para TODOS os chamadores em produção. Um duplo que
    // aceita mais do que o original esconde o defeito que devia apanhar.
    verificarUserSession: async (token) => {
      if (typeof token !== "string" || !token) {
        throw new TypeError("verificarUserSession recebe a STRING do token, nao " + typeof token);
      }
      if (!estado.sessaoValida) throw new Error("token invalido");
      return { endereco: estado.enderecoSessao, tipo: "user-session" };
    },
  },
});
mock.module("../_lib/rate-limiter.mjs", {
  namedExports: { aplicarRateLimit: async () => null },
});
mock.module("../_lib/pontuacao-store.mjs", {
  namedExports: {
    registrarPontuacaoRodada: async (ciclo, lances, opts) => {
      if (estado.falharPontuacao) throw new Error("supabase em baixo");
      estado.registado.push({ ciclo, lances, opts });
      return { cicloId: ciclo, participantes: 2, bonusRegistados: 1 };
    },
    lerRankingCiclo: async () => estado.ranking,
    lerFeedback: async (ciclo, endereco) => estado.feedback ?? {
      cicloId: ciclo, endereco, pontosTotais: 4, acertosTotais: 1, posicao: 1,
      sequenciaAtual: 2, faltamParaBonus: 3, bonusEmitido: false, senhasACreditar: 0,
    },
  },
});
mock.module("../_lib/admin-helpers.mjs", {
  namedExports: { getAdminAddresses: async () => estado.admins },
});
mock.module("../_lib/data-store.mjs", {
  namedExports: { getLances: async () => [{ endereco: "0xa", valorCentavos: 30 }] },
});

// ── mocks só para a integração em consolidar-lances ──────────────────────────
const consolidacao = { marcado: [], recibo: { hash: "0xtx", blockNumber: 1 } };
mock.module("../_lib/bids-store.mjs", {
  namedExports: {
    estaConsolidado: async () => null,
    marcarConsolidado: async (id, r) => { consolidacao.marcado.push({ id, r }); },
  },
});
mock.module("../_lib/signer.mjs", {
  namedExports: {
    backendAssinatura: () => "local-key",
    obterSignerCoordenacao: async () => ({
      provider: { waitForTransaction: async () => consolidacao.recibo },
      signer: { signTypedData: async () => "0xassinatura" },
    }),
  },
});
mock.module("../_lib/rpc-fallback.mjs", {
  namedExports: { escolherRpc: async (a) => a },
});
mock.module("ethers", {
  namedExports: {
    Contract: class {
      async edicaoNonce() { return 1n; }
      async consolidarResultado() { return { hash: "0xtx" }; }
    },
  },
});

const pontuar = (await import("../pontuacao.mjs")).default;
const ranking = (await import("../ranking.mjs")).default;

const req = (url, init = {}) => new Request(url, init);
const reqFeedback = (endereco, token = "tok-valido") =>
  req(`https://x/.netlify/functions/ranking?recurso=feedback&cicloId=R-1&endereco=${endereco}`,
    { headers: token ? { authorization: `Bearer ${token}` } : {} });
const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

beforeEach(() => {
  estado.adminNegado = null;
  estado.sessaoValida = true;
  estado.registado.length = 0;
  estado.ranking = [];
  estado.feedback = null;
  estado.falharPontuacao = false;
});

// ── POST /pontuar ────────────────────────────────────────────────────────────

test("/pontuar: sem admin, devolve a negação do guardAdmin e NÃO escreve", async () => {
  estado.adminNegado = new Response("nao", { status: 403 });
  const res = await pontuar(req("https://x/.netlify/functions/pontuacao", {
    method: "POST", body: JSON.stringify({ cicloId: "R-1" }),
  }));
  assert.equal(res.status, 403);
  assert.equal(estado.registado.length, 0, "recusado não pode ter pontuado nada");
});

test("/pontuar: método != POST → 405", async () => {
  const res = await pontuar(req("https://x/.netlify/functions/pontuacao", { method: "GET" }));
  assert.equal(res.status, 405);
});

test("/pontuar: sem cicloId → 400 e nada escrito", async () => {
  const res = await pontuar(req("https://x/.netlify/functions/pontuacao", {
    method: "POST", body: JSON.stringify({}),
  }));
  assert.equal(res.status, 400);
  assert.equal(estado.registado.length, 0);
});

test("/pontuar: admin com cicloId pontua e responde ok", async () => {
  const res = await pontuar(req("https://x/.netlify/functions/pontuacao", {
    method: "POST",
    body: JSON.stringify({ cicloId: "R-1", lances: [{ endereco: A, valorCentavos: 30 }] }),
  }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.cicloId, "R-1");
  assert.equal(estado.registado[0].ciclo, "R-1");
});

test("/pontuar: sem lances no body, lê-os pelo data-store", async () => {
  await pontuar(req("https://x/.netlify/functions/pontuacao", {
    method: "POST", body: JSON.stringify({ cicloId: "R-7" }),
  }));
  assert.equal(estado.registado[0].lances.length, 1, "caiu no getLances");
});

// ── GET /ranking ─────────────────────────────────────────────────────────────

test("/ranking: sem cicloId → 400", async () => {
  const res = await ranking(req("https://x/.netlify/functions/ranking"));
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(JSON.stringify(body), /ciclo/i);
});

test("/ranking: devolve a lista ordenada do store", async () => {
  estado.ranking = [
    { posicao: 1, endereco: A, pontosTotais: 9, acertosTotais: 2, bonusEmitido: false },
  ];
  const res = await ranking(req("https://x/.netlify/functions/ranking?cicloId=R-1"));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.cicloId, "R-1");
  assert.equal(body.total, 1);
  assert.equal(body.ranking[0].posicao, 1);
});

test("/ranking: método != GET → 405", async () => {
  const res = await ranking(req("https://x/.netlify/functions/ranking?cicloId=R-1", { method: "POST" }));
  assert.equal(res.status, 405);
});

// ── GET /feedback ────────────────────────────────────────────────────────────

test("/feedback: devolve pontos, posição e quanto falta para o bónus", async () => {
  const res = await ranking(reqFeedback(A));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.pontosTotais, 4);
  assert.equal(body.posicao, 1);
  assert.equal(body.faltamParaBonus, 3);
});

test("/feedback: sem sessão válida → 401 (anti-IDOR)", async () => {
  // Sem este guarda, a atividade de qualquer carteira fica pública.
  estado.sessaoValida = false;
  const res = await ranking(reqFeedback(A));
  assert.equal(res.status, 401);
});

test("/feedback: endereço inválido → 400", async () => {
  const res = await ranking(reqFeedback("nao-e-endereco"));
  assert.equal(res.status, 400);
});

// ── INTEGRAÇÃO em consolidar-lances.mjs ──────────────────────────────────────
//
// PORQUÊ: a colocação do gancho é uma decisão de correcção, não de estilo.
// Pontuar antes do recibo pontuaria uma rodada que não existe on-chain; e
// rebentar depois do recibo faria o caller crer que a consolidação falhou,
// quando a transação já está minerada e é irreversível.

const ENV = {
  NETWORK_STAGE: "mainnet",
  CONSOLIDATION_RPC_URL: "https://rpc.exemplo",
  CONTRATO_MAINNET: "0x0052477a8ca81bcaf4a60e21e635f9e00a5d16cd",
  MAINNET_CHAIN_ID: "1",
  COORDENACAO_PRIVATE_KEY: "0x" + "1".repeat(64),
};
const consolidar = (await import("../consolidar-lances.mjs")).default;
const pedidoConsolidacao = () => req("https://x/.netlify/functions/consolidar-lances", {
  method: "POST", body: JSON.stringify({ edicaoId: "R-1" }),
});

test("consolidar: pontua a rodada e devolve o resultado da pontuação", async () => {
  const antes = { ...process.env };
  Object.assign(process.env, ENV);
  try {
    consolidacao.marcado.length = 0;
    const res = await consolidar(pedidoConsolidacao());
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(estado.registado.at(-1).ciclo, "R-1", "pontuou a edição consolidada");
    assert.equal(body.pontuacao.participantes, 2);
    assert.equal(consolidacao.marcado.length, 1, "marcou consolidado");
  } finally { process.env = antes; }
});

test("consolidar: se a pontuação REBENTAR, a consolidação mantém-se (fail-soft)", async () => {
  // A tx já está minerada neste ponto. Uma falha a pontuar NÃO pode transformar
  // uma consolidação bem-sucedida numa resposta de erro.
  const antes = { ...process.env };
  Object.assign(process.env, ENV);
  try {
    consolidacao.marcado.length = 0;
    estado.falharPontuacao = true;
    const res = await consolidar(pedidoConsolidacao());
    assert.equal(res.status, 200, "a consolidação NÃO pode falhar por causa da pontuação");
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.txHash, "0xtx", "a transação continua reportada");
    assert.equal(body.pontuacao, null, "a pontuação vem null, não em falta");
    assert.equal(consolidacao.marcado.length, 1, "a edição foi marcada na mesma");
  } finally { estado.falharPontuacao = false; process.env = antes; }
});

test("consolidar: tx NÃO minerada (202) não pontua nada", async () => {
  const antes = { ...process.env };
  const reciboOriginal = consolidacao.recibo;
  Object.assign(process.env, ENV);
  try {
    consolidacao.recibo = null;          // waitForTransaction devolve null
    const marcoAntes = estado.registado.length;
    const res = await consolidar(pedidoConsolidacao());
    assert.equal(res.status, 202);
    assert.equal(estado.registado.length, marcoAntes,
      "rodada pendente não pode gerar pontos");
  } finally { consolidacao.recibo = reciboOriginal; process.env = antes; }
});

test("/feedback: sessão de OUTRA carteira → 403 (anti-IDOR a sério)", async () => {
  // Ter sessão não chega. Sem esta comparação, qualquer utilizador autenticado
  // lê a posição e a atividade de qualquer endereço — e os endereços são
  // públicos na blockchain. Mesmo guarda de saldo-rs.mjs:51.
  estado.enderecoSessao = "0x9999999999999999999999999999999999999999";
  const res = await ranking(reqFeedback(A));
  assert.equal(res.status, 403);
});

test("/feedback: um admin PODE ler o de outro endereço", async () => {
  estado.enderecoSessao = "0x9999999999999999999999999999999999999999";
  estado.admins = ["0x9999999999999999999999999999999999999999"];
  const res = await ranking(reqFeedback(A));
  assert.equal(res.status, 200);
});

test("/feedback: sem cabeçalho Authorization → 401", async () => {
  // O caminho que o P0 escondia: sem token não há string para verificar.
  const res = await ranking(req(
    `https://x/.netlify/functions/ranking?recurso=feedback&cicloId=R-1&endereco=${A}`));
  assert.equal(res.status, 401);
});

test("/feedback: token inválido → 401, não 500", async () => {
  // Se a verificação LANÇAR e ninguém apanhar, o runtime devolve 500 fora do
  // jsonResponse — sem CORS — e o APK vê "Failed to fetch".
  estado.sessaoValida = false;
  const res = await ranking(reqFeedback(A));
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("content-type"), "application/json; charset=utf-8");
});

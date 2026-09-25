// MC94.2 — HARD GATE 5: a edição ESPECIAL-* é consolidada mas NÃO pontua.
//
// Decisão do operador (R18, 2026-09-25, D2): o sorteio especial não entra nas
// sequências de 5 acertos nem no bónus de 20 senhas do torneio. A consolidação
// on-chain corre igual (é ela que publica o vencedor em `resultados`).
//
// Mesma montagem do mc93b-endpoints (handler real, dependências em duplo).
// node --test --experimental-test-module-mocks _tests/mc942-especial-nao-pontua.test.mjs

import { test, mock } from "node:test";
import assert from "node:assert/strict";

const estado = { pontuadas: [], marcadas: [], consolidadasOnchain: [] };

mock.module("../_lib/admin-auth.mjs", { namedExports: { guardAdmin: async () => null } });
mock.module("../_lib/pontuacao-store.mjs", {
  namedExports: {
    registrarPontuacaoRodada: async (ciclo, lances) => {
      estado.pontuadas.push(ciclo);
      return { cicloId: ciclo, participantes: new Set(lances.map((l) => l.endereco)).size };
    },
  },
});
mock.module("../_lib/data-store.mjs", {
  namedExports: {
    getLances: async () => [
      { endereco: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", valorCentavos: 30 },
      { endereco: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", valorCentavos: 50 },
    ],
  },
});
mock.module("../_lib/bids-store.mjs", {
  namedExports: {
    estaConsolidado: async () => null,
    marcarConsolidado: async (id, r) => { estado.marcadas.push({ id, r }); },
  },
});
mock.module("../_lib/signer.mjs", {
  namedExports: {
    backendAssinatura: () => "local-key",
    obterSignerCoordenacao: async () => ({
      provider: { waitForTransaction: async () => ({ hash: "0xtx", blockNumber: 7 }) },
      signer: { signTypedData: async () => "0xassinatura" },
    }),
  },
});
mock.module("../_lib/rpc-fallback.mjs", { namedExports: { escolherRpc: async (a) => a } });
mock.module("ethers", {
  namedExports: {
    Contract: class {
      async edicaoNonce() { return 0n; }
      async consolidarResultado(id) { estado.consolidadasOnchain.push(id); return { hash: "0xtx" }; }
    },
  },
});

const ENV = {
  NETWORK_STAGE: "mainnet",
  CONSOLIDATION_RPC_URL: "https://rpc.exemplo",
  CONTRATO_MAINNET: "0x0052477a8ca81bcaf4a60e21e635f9e00a5d16cd",
  MAINNET_CHAIN_ID: "1",
  COORDENACAO_PRIVATE_KEY: "0x" + "1".repeat(64),
};

const consolidar = (await import("../consolidar-lances.mjs")).default;

async function consolidarEdicao(edicaoId) {
  const antes = { ...process.env };
  Object.assign(process.env, ENV);
  estado.pontuadas.length = 0;
  estado.marcadas.length = 0;
  estado.consolidadasOnchain.length = 0;
  try {
    const res = await consolidar(new Request("https://x/.netlify/functions/consolidar-lances", {
      method: "POST", body: JSON.stringify({ edicaoId }),
    }));
    return { status: res.status, body: await res.json() };
  } finally { process.env = antes; }
}

test("ESPECIAL-AIRFRYER: consolida on-chain e marca, mas NÃO pontua", async () => {
  const { status, body } = await consolidarEdicao("ESPECIAL-AIRFRYER");
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.deepEqual(estado.consolidadasOnchain, ["ESPECIAL-AIRFRYER"], "o vencedor tem de ir on-chain");
  assert.equal(estado.marcadas.length, 1, "a edição fica marcada como consolidada");
  assert.deepEqual(estado.pontuadas, [], "a especial não pode entrar no torneio");
  assert.equal(body.pontuacao, null);
  assert.equal(body.pontua, false, "a resposta diz à coordenação que não pontuou, e porquê");
  assert.equal(body.vencedor, "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "menor único = 30");
});

test("qualquer ESPECIAL-* fica de fora, não só a Air Fryer", async () => {
  await consolidarEdicao("ESPECIAL-NATAL2026");
  assert.deepEqual(estado.pontuadas, []);
});

test("controlo: R-1 continua a pontuar", async () => {
  const { body } = await consolidarEdicao("R-1");
  assert.deepEqual(estado.pontuadas, ["R-1"]);
  assert.equal(body.pontua, true);
  assert.equal(body.pontuacao.participantes, 2);
});

test("controlo: PROG-7 continua a pontuar (o prefixo não é 'contém ESPECIAL')", async () => {
  await consolidarEdicao("PROG-7");
  assert.deepEqual(estado.pontuadas, ["PROG-7"]);
});

test("um id que só CONTÉM 'ESPECIAL' não escapa ao torneio", async () => {
  await consolidarEdicao("PROG-ESPECIAL-1");
  assert.deepEqual(estado.pontuadas, ["PROG-ESPECIAL-1"]);
});

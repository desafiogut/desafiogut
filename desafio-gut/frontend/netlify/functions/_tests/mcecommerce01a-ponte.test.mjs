// MC-ECOMMERCE-01a — PONTE apuração → catálogo, exercida pelo USO: o handler real
// `consolidar-lances` → `consolidarEdicao` → `registrarVendaDaEdicao`, com a edição, o
// catálogo, os pedidos e as notificações REAIS sobre Blobs em memória. Só a cadeia e a
// assinatura são duplos (mesma montagem do mc942).
//
// O que se prova:
//   (a) a venda regista o vencedor APURADO on-chain (não o de um pedido HTTP) e cria o pedido;
//   (b) tx por minerar (202) NÃO vende; edição sem produtoId não mexe no catálogo;
//   (c) a ponte é idempotente e recusa um segundo vencedor;
//   (d) a falha da ponte NÃO derruba a consolidação (a tx já está minerada);
//   (e) a ligação edição → produto só aceita produto `ativo` e não partilhado.
// Mutações validadas: ver o rodapé.
//
// node --test --experimental-test-module-mocks _tests/mcecommerce01a-ponte.test.mjs

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
// MC102.0 — ETag do duplo: por conteúdo, como um servidor que versiona o blob.
const etagDe = (v) => `"${createHash("sha1").update(v).digest("hex")}"`;

const blobs = new Map();
let blobsRebentam = null; // nome de store que lança em escrita (teste de fail-soft)
mock.module("@netlify/blobs", {
  namedExports: {
    getStore: ({ name }) => {
      if (!blobs.has(name)) blobs.set(name, new Map());
      const m = blobs.get(name);
      return {
        async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
        async getWithMetadata(k, { type } = {}) { const v = m.get(k); if (v === undefined) return null;
          return { data: type === "json" ? JSON.parse(v) : v, etag: etagDe(v), metadata: {} }; },
        async setJSON(k, o, opt = {}) { if (blobsRebentam === name) throw new Error("blobs em baixo"); 
          if (opt.onlyIfMatch && (!m.has(k) || etagDe(m.get(k)) !== opt.onlyIfMatch)) return { modified: false };
          const v = JSON.stringify(o); m.set(k, v); return { modified: true, etag: etagDe(v) }; },
        async list({ prefix = "" } = {}) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
        async delete(k) { m.delete(k); },
      };
    },
  },
});
mock.module("../_lib/cache.mjs", { namedExports: { cacheAside: async (_k, f) => f(), cacheDel: async () => {} } });

const estado = { marcadas: [], onchain: [], recibo: true };
mock.module("../_lib/admin-auth.mjs", { namedExports: { guardAdmin: async () => null } });
mock.module("../_lib/pontuacao-store.mjs", { namedExports: { registrarPontuacaoRodada: async () => ({}) } });
// Menor único = 30 → vencedor A. O B licita 50.
const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
mock.module("../_lib/data-store.mjs", {
  namedExports: { getLances: async () => [{ endereco: A, valorCentavos: 30 }, { endereco: B, valorCentavos: 50 }] },
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
      provider: { waitForTransaction: async () => (estado.recibo ? { hash: "0xrecibo", blockNumber: 7 } : null) },
      signer: { signTypedData: async () => "0xassinatura" },
    }),
  },
});
mock.module("../_lib/rpc-fallback.mjs", { namedExports: { escolherRpc: async (a) => a } });
mock.module("ethers", {
  namedExports: {
    Contract: class {
      async edicaoNonce() { return 0n; }
      async consolidarResultado(id, venc) { estado.onchain.push({ id, venc }); return { hash: "0xtx" }; }
    },
  },
});

const ENV = {
  NETWORK_STAGE: "mainnet", CONSOLIDATION_RPC_URL: "https://rpc.exemplo",
  CONTRATO_MAINNET: "0x0052477a8ca81bcaf4a60e21e635f9e00a5d16cd", MAINNET_CHAIN_ID: "1",
  COORDENACAO_PRIVATE_KEY: "0x" + "1".repeat(64),
};

const consolidar = (await import("../consolidar-lances.mjs")).default;
const { vincularProdutoAEdicao, registrarVendaDaEdicao } = await import("../_lib/pedidos.mjs");
const { buscarEdicao } = await import("../_lib/edicoes-core.mjs");

const PID = "11111111-2222-3333-4444-555555555555";
const LOJISTA = "0xcccccccccccccccccccccccccccccccccccccccc";
const ler = (store, k) => { const v = blobs.get(store)?.get(k); return v ? JSON.parse(v) : null; };
const gravar = (store, k, o) => { if (!blobs.has(store)) blobs.set(store, new Map()); blobs.get(store).set(k, JSON.stringify(o)); };

function semear({ produtoId = PID, status = "ativo" } = {}) {
  gravar("produtos", `produto:${PID}`, { id: PID, nome: "Air Fryer", lojista: LOJISTA, categoria: "ouro",
    status, vencedor: null, prazo_entrega_dias: 10 });
  gravar("edicoes-metadata", "RELAMP-9", { id: "RELAMP-9", tipo: "relampago", produto: "Air Fryer",
    produtoId, termino_em: new Date(Date.now() - 1000).toISOString(), status: "encerrado" });
}

async function consolidarEdicao(edicaoId) {
  const antes = { ...process.env };
  Object.assign(process.env, ENV);
  try {
    const res = await consolidar(new Request("https://x/.netlify/functions/consolidar-lances", {
      method: "POST", body: JSON.stringify({ edicaoId }),
    }));
    return { status: res.status, body: await res.json() };
  } finally { process.env = antes; }
}

beforeEach(() => {
  blobs.clear(); estado.marcadas.length = 0; estado.onchain.length = 0; estado.recibo = true; blobsRebentam = null;
});

test("(a) consolidação com recibo → produto vendido ao vencedor APURADO + pedido + notificação", async () => {
  semear();
  const { status, body } = await consolidarEdicao("RELAMP-9");
  assert.equal(status, 200);
  assert.deepEqual(body.venda, { ok: true, idempotent: false, produtoId: PID });

  const p = ler("produtos", `produto:${PID}`);
  assert.equal(p.status, "vendido");
  assert.equal(p.vencedor.endereco, A, "o vencedor é o menor único apurado (30), não outro");
  assert.equal(p.vencedor.edicaoId, "RELAMP-9");
  assert.equal(p.vencedor.txHash, "0xrecibo", "a venda cita o RECIBO on-chain");
  assert.equal(p.vencedor.menorUnicoCentavos, 30);

  const ped = ler("pedidos", `pedido:${PID}`);
  assert.equal(ped.comprador, A);
  assert.equal(ped.valorPagoCentavos, 30);
  assert.equal(ped.prazo_entrega_dias, 10, "o prazo do produto passa para o pedido");
  assert.equal(ped.morada, null);
  assert.deepEqual(ler("pedidos", `comprador:${A}`).ids, [PID], "índice do comprador");

  const notifs = ler("notificacoes", A).notificacoes;
  assert.ok(notifs.some((n) => n.tipo === "pedido_morada"), "o comprador é avisado para dar o endereço");
  assert.equal(ler("notificacoes", B), null, "quem perdeu não recebe o pedido");
});

test("(b1) tx por minerar (202) → NÃO vende nem cria pedido", async () => {
  semear(); estado.recibo = false;
  const { status } = await consolidarEdicao("RELAMP-9");
  assert.equal(status, 202);
  assert.equal(ler("produtos", `produto:${PID}`).status, "ativo");
  assert.equal(ler("pedidos", `pedido:${PID}`), null);
});

test("(b2) edição sem produtoId → consolida, catálogo intacto, venda diz porquê", async () => {
  semear({ produtoId: null });
  const { status, body } = await consolidarEdicao("RELAMP-9");
  assert.equal(status, 200);
  assert.equal(body.venda.code, "edicao_sem_produto");
  assert.equal(ler("produtos", `produto:${PID}`).status, "ativo");
});

test("(c) idempotente com o mesmo vencedor; repara pedido em falta; recusa outro vencedor", async () => {
  semear();
  await consolidarEdicao("RELAMP-9");
  blobs.get("pedidos").delete(`pedido:${PID}`);
  const r1 = await registrarVendaDaEdicao({ edicaoId: "RELAMP-9", vencedor: A, menorUnicoCentavos: 30, txHash: "0xrecibo" }, { buscarEdicao });
  assert.equal(r1.ok, true); assert.equal(r1.idempotent, true); assert.equal(r1.pedidoReparado, true);
  assert.ok(ler("pedidos", `pedido:${PID}`), "o pedido perdido foi recriado");

  const r2 = await registrarVendaDaEdicao({ edicaoId: "RELAMP-9", vencedor: B, menorUnicoCentavos: 50, txHash: "0xoutro" }, { buscarEdicao });
  assert.equal(r2.ok, false); assert.equal(r2.code, "produto_ja_vendido");
  assert.equal(ler("produtos", `produto:${PID}`).vencedor.endereco, A, "o vencedor não muda");
});

test("(c2) vencedor inválido (endereço zero) é recusado", async () => {
  semear();
  const r = await registrarVendaDaEdicao({ edicaoId: "RELAMP-9", vencedor: "0x" + "0".repeat(40), menorUnicoCentavos: 30 }, { buscarEdicao });
  assert.equal(r.code, "vencedor_invalido");
  assert.equal(ler("produtos", `produto:${PID}`).status, "ativo");
});

test("(d) a ponte rebenta → a consolidação mantém-se (200, marcada) e a resposta diz que falhou", async () => {
  semear(); blobsRebentam = "produtos";
  const { status, body } = await consolidarEdicao("RELAMP-9");
  assert.equal(status, 200, "a tx já está minerada: a consolidação não pode parecer falhada");
  assert.equal(estado.marcadas.length, 1);
  assert.equal(body.venda.ok, false, "a coordenação vê que há uma venda por reprocessar");
});

test("(e) ligação edição → produto: só ativo, e não partilhado entre edições", async () => {
  semear({ status: "rascunho" });
  assert.equal((await vincularProdutoAEdicao(PID, "RELAMP-10")).code, "produto_nao_ativo");
  semear();
  assert.equal((await vincularProdutoAEdicao(PID, "RELAMP-10")).ok, true);
  assert.equal(ler("produtos", `produto:${PID}`).edicaoVinculada, "RELAMP-10");
  assert.equal((await vincularProdutoAEdicao(PID, "RELAMP-11")).code, "produto_ja_vinculado");
});

// MUTAÇÕES (cada uma pôs este ficheiro RED; ver o relatório do MC-ECOMMERCE-01a):
//   M1 remover a chamada da ponte em consolidacao.mjs            → (a) RED
//   M2 chamar a ponte ANTES do waitForTransaction                 → (b1) RED
//   M3 tirar o try/catch da ponte                                 → (d) RED
//   M4 registrarVendaDaEdicao sem a guarda de vencedor diferente  → (c) RED
//   M5 vincularProdutoAEdicao sem a guarda de status              → (e) RED

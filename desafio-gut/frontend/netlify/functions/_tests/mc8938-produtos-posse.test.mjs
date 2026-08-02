// MC89.38 (P0) — POSSE DO `cliente_id` em POST /produtos.
//
// node --test --experimental-test-module-mocks _tests/mc8938-produtos-posse.test.mjs
//
// O QUE ESTES TESTES PROTEGEM: antes deste MC, `produtos.mjs` aceitava o
// `cliente_id` vindo do CORPO do pedido sem verificar posse — e o comentário
// imediatamente abaixo anunciava um check anti-IDOR que não estava lá. Qualquer
// autenticado podia publicar um produto atribuído a outro lojista.
//
// ⚠️ Cada teste deste ficheiro foi validado por mutação (lista no rodapé).

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ── mocks ────────────────────────────────────────────────────────────────────
const cotasMem = new Map();
let getCotaRebenta = false;   // interruptor do teste de fail-closed
mock.module("../_lib/cotas-store.mjs", {
  namedExports: {
    getCota: async (id) => {
      if (getCotaRebenta) throw new Error("supabase em baixo");
      return cotasMem.get(String(id)) ?? null;
    },
    upsertCota: async () => {}, deleteCota: async () => {},
    getCotaByCnpj: async () => null, getCotaByEmail: async () => null,
    listarCategoria: async () => [], resumoCotas: async () => ({}),
    getFingerprint: async () => null, setFingerprint: async () => {},
    getCotaPaga: async () => null, setCotaPaga: async () => {},
  },
});

let jwtEndereco = null;
mock.module("../_lib/jwt.mjs", {
  namedExports: {
    verificarUserSession: async () => {
      if (!jwtEndereco) { const e = new Error("invalido"); e.code = "ERR_JWT_INVALID"; throw e; }
      return { endereco: jwtEndereco, tipo: "user-session" };
    },
    assinarUserSession: async () => "tok",
  },
});

let admin = false;
mock.module("../_lib/admin-auth.mjs", {
  namedExports: { autenticarAdmin: async () => (admin ? { ok: true } : { ok: false }) },
});

const blobs = new Map();
mock.module("@netlify/blobs", {
  namedExports: {
    getStore: ({ name }) => {
      if (!blobs.has(name)) blobs.set(name, new Map());
      const m = blobs.get(name);
      return {
        async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
        async setJSON(k, o) { m.set(k, JSON.stringify(o)); },
        async list() { return { blobs: [...m.keys()].map((key) => ({ key })) }; },
        async delete(k) { m.delete(k); },
      };
    },
  },
});

mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/cache.mjs", { namedExports: { cacheAside: async (_k, f) => f(), cacheDel: async () => {} } });

const { default: handler } = await import("../produtos.mjs");

// ── util ─────────────────────────────────────────────────────────────────────
const DONO   = "0xaabbccddeeff00112233445566778899aabbccdd";
const OUTRO  = "0x99887766554433221100ffeeddccbbaa99887766";
const IMAGEM = "data-base64-fake";

function pedido(body) {
  return new Request("https://x/.netlify/functions/produtos", {
    method: "POST",
    headers: { authorization: "Bearer tok", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const produtoBase = {
  nome: "Produto", preco: 1000, categoria: "bronze",
  imagemBase64: IMAGEM, mime: "image/png",
};

beforeEach(() => { cotasMem.clear(); blobs.clear(); jwtEndereco = DONO; admin = false; getCotaRebenta = false; });

// ── OS TESTES ────────────────────────────────────────────────────────────────

test("sem cliente_id no corpo → usa o do JWT e publica (não regride)", async () => {
  const r = await handler(pedido({ ...produtoBase }));
  assert.equal(r.status, 201, "o caminho normal do lojista tem de continuar a funcionar");
});

test("⚠️ CONTROLO POSITIVO: cliente_id igual ao do JWT → publica", async () => {
  // Sem este, uma guarda que rejeitasse TUDO passaria nos testes negativos
  // abaixo e pareceria perfeita.
  const r = await handler(pedido({ ...produtoBase, cliente_id: DONO }));
  assert.equal(r.status, 201);
});

test("cliente_id igual ao do JWT mas em MAIÚSCULAS → publica", async () => {
  // O `address` do Privy vem em checksum; a comparação tem de ser insensível.
  const r = await handler(pedido({ ...produtoBase, cliente_id: DONO.toUpperCase().replace("0X", "0x") }));
  assert.equal(r.status, 201);
});

test("⚠️ O DEFEITO: cliente_id de OUTRO lojista → 403", async () => {
  const r = await handler(pedido({ ...produtoBase, cliente_id: OUTRO }));
  assert.equal(r.status, 403);
  assert.equal((await r.json()).error.code, "endereco_nao_corresponde");
});

test("cliente_id `cnpj:` SEM vínculo comprovável → 403", async () => {
  // Cadastro direto (MC12.3.1): a cota existe mas não tem `endereco`, logo o
  // servidor não tem como saber que aquela carteira lhe pertence.
  cotasMem.set("cnpj:12345678000199", { cliente_id: "cnpj:12345678000199", endereco: null });
  const r = await handler(pedido({ ...produtoBase, cliente_id: "cnpj:12345678000199" }));
  assert.equal(r.status, 403);
});

test("cliente_id `cnpj:` COM `endereco` que bate → publica", async () => {
  // É o ramo que salva o cadastro direto assim que a cota for vinculada a uma
  // carteira. Hoje nenhuma cota em produção tem este campo (MC89.38-F0), por
  // isso este teste descreve o comportamento pretendido, não o estado atual.
  cotasMem.set("cnpj:12345678000199", { cliente_id: "cnpj:12345678000199", endereco: DONO });
  const r = await handler(pedido({ ...produtoBase, cliente_id: "cnpj:12345678000199" }));
  assert.equal(r.status, 201);
});

test("cliente_id `cnpj:` com `endereco` de OUTRA carteira → 403", async () => {
  cotasMem.set("cnpj:12345678000199", { cliente_id: "cnpj:12345678000199", endereco: OUTRO });
  const r = await handler(pedido({ ...produtoBase, cliente_id: "cnpj:12345678000199" }));
  assert.equal(r.status, 403);
});

test("o `endereco` da cota é comparado sem distinguir maiúsculas", async () => {
  cotasMem.set("cnpj:1", { cliente_id: "cnpj:1", endereco: DONO.toUpperCase().replace("0X", "0x") });
  const r = await handler(pedido({ ...produtoBase, cliente_id: "cnpj:1" }));
  assert.equal(r.status, 201);
});

test("admin pode publicar em nome de outro (mesma exceção do banners.mjs)", async () => {
  admin = true;
  const r = await handler(pedido({ ...produtoBase, cliente_id: OUTRO }));
  assert.equal(r.status, 201);
});

test("⚠️ FAIL-CLOSED: se a leitura da cota rebentar, NÃO autoriza", async () => {
  // Uma falha de infraestrutura não pode virar autorização — é a diferença
  // entre um erro e uma porta aberta.
  getCotaRebenta = true;
  const r = await handler(pedido({ ...produtoBase, cliente_id: "cnpj:1" }));
  assert.equal(r.status, 403, "erro de leitura tem de fechar a porta, não abri-la");
});

test("sem Authorization continua 401 (controlo negativo)", async () => {
  const r = await handler(new Request("https://x/.netlify/functions/produtos", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(produtoBase),
  }));
  assert.equal(r.status, 401);
});

// ── MUTAÇÕES VALIDADAS ───────────────────────────────────────────────────────
//  1. remover o bloco inteiro da guarda de posse
//     → apanhada por: "cliente_id de OUTRO lojista → 403"
//  2. comparar `body.cliente_id` sem `toLowerCase()`
//     → apanhada por: "cliente_id igual ao do JWT mas em MAIÚSCULAS"
//  3. não comparar o `endereco` da cota em minúsculas
//     → apanhada por: "o `endereco` da cota é comparado sem distinguir maiúsculas"
//  4. no catch de `enderecoDaCota`, devolver o endereço do JWT (fail-open)
//     → apanhada por: "FAIL-CLOSED"
//  5. aceitar sempre quando a cota existe (ignorar o campo `endereco`)
//     → apanhada por: "cnpj: SEM vínculo comprovável" e "com endereco de OUTRA carteira"
//  6. inverter a exceção de admin (bloquear admin)
//     → apanhada por: "admin pode publicar em nome de outro"

// MC89.40 (F1) — GATE DE COTA PAGA nos endpoints de escrita.
//
// node --test --experimental-test-module-mocks _tests/mc8940-gate-cota.test.mjs
//
// ⚠️ Mutações validadas — lista no rodapé.

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const cotasMem = new Map();
let getCotaRebenta = false;
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
      if (!jwtEndereco) { const e = new Error("x"); e.code = "ERR_JWT_INVALID"; throw e; }
      return { endereco: jwtEndereco, tipo: "user-session" };
    },
    assinarUserSession: async () => "tok",
    verificarLanceAuth: async () => ({ endereco: jwtEndereco }),
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

const { cotaEstaAtiva, validarCotaAtiva } = await import("../_lib/cota-utils.mjs");
const { default: produtos } = await import("../produtos.mjs");

const DONO = "0xaabbccddeeff00112233445566778899aabbccdd";

function pedidoProduto(extra = {}) {
  return new Request("https://x/.netlify/functions/produtos", {
    method: "POST",
    headers: { authorization: "Bearer tok", "content-type": "application/json" },
    body: JSON.stringify({
      nome: "Produto", preco: 1000, categoria: "bronze",
      imagemBase64: "b64", mime: "image/png", ...extra,
    }),
  });
}
const cotaPaga = (cat = "bronze") => ({ cliente_id: DONO, vendida: true, categoria: cat });

beforeEach(() => { cotasMem.clear(); blobs.clear(); jwtEndereco = DONO; admin = false; getCotaRebenta = false; });

// ── A REGRA PURA ─────────────────────────────────────────────────────────────

test("cotaEstaAtiva: paga e com categoria → ativa", () => {
  assert.equal(cotaEstaAtiva({ vendida: true, categoria: "ouro" }).ativa, true);
});

test("cotaEstaAtiva: o cadastro sem pagamento NÃO é ativo", () => {
  // É literalmente o registo que `cotas.mjs` cria em register-corporativo.
  assert.equal(cotaEstaAtiva({ vendida: false, categoria: null }).ativa, false);
});

test("⚠️ cotaEstaAtiva: vendida=true SEM categoria → inativa", () => {
  // A cota meio-válida que o formulário do ADM consegue produzir (não tem campo
  // categoria). Sem esta metade da regra, passaria o gate e rebentaria depois.
  assert.equal(cotaEstaAtiva({ vendida: true, categoria: null }).ativa, false);
});

test("cotaEstaAtiva: categoria inventada → inativa", () => {
  assert.equal(cotaEstaAtiva({ vendida: true, categoria: "platina" }).ativa, false);
});

test("cotaEstaAtiva: `vendida` truthy mas não booleano → inativa", () => {
  // Uma string "false" é truthy. A comparação tem de ser estrita.
  assert.equal(cotaEstaAtiva({ vendida: "false", categoria: "ouro" }).ativa, false);
  assert.equal(cotaEstaAtiva({ vendida: 1, categoria: "ouro" }).ativa, false);
});

test("cotaEstaAtiva: categoria em MAIÚSCULAS é aceite e normalizada", () => {
  const r = cotaEstaAtiva({ vendida: true, categoria: "DIAMANTE" });
  assert.equal(r.ativa, true);
  assert.equal(r.categoria, "diamante");
});

test("cotaEstaAtiva: sem cota → inativa (não rebenta)", () => {
  assert.equal(cotaEstaAtiva(null).ativa, false);
  assert.equal(cotaEstaAtiva(undefined).ativa, false);
});

// ── A LEITURA (armadilha da chave) ───────────────────────────────────────────

test("⚠️ ARMADILHA DA CHAVE: cota gravada em minúsculas, procurada em checksum", () => {
  // `ativarCotaPaga` grava em lowercase; o JWT pode trazer checksum. Procurar
  // pela chave errada diria "sem cota" a quem PAGOU — indistinguível de não ter
  // pago. É o modo de falha mais provável de todo este MC.
  cotasMem.set(DONO, cotaPaga());
  const comChecksum = "0xAABBCCDDEEFF00112233445566778899AABBCCDD";
  return validarCotaAtiva(comChecksum).then((r) => assert.equal(r.ativa, true));
});

test("⚠️ FAIL-CLOSED: erro de leitura → inativa, nunca ativa", async () => {
  cotasMem.set(DONO, cotaPaga());
  getCotaRebenta = true;
  assert.equal((await validarCotaAtiva(DONO)).ativa, false);
});

// ── O ENDPOINT ───────────────────────────────────────────────────────────────

test("⚠️ O DEFEITO: utilizador COMUM (sem cota) → 403 cota_inativa", async () => {
  // Antes deste MC devolvia 201: bastava um JWT, que é emitido a toda a gente.
  const r = await produtos(pedidoProduto());
  assert.equal(r.status, 403);
  const b = await r.json();
  assert.equal(b.error.code, "cota_inativa");
  assert.equal(b.error.needsPayment, true, "o painel precisa de distinguir isto de um erro seco");
});

test("lojista cadastrado mas NÃO pago → 403", async () => {
  cotasMem.set(DONO, { cliente_id: DONO, vendida: false, categoria: null });
  assert.equal((await produtos(pedidoProduto())).status, 403);
});

test("⚠️ CONTROLO POSITIVO: cota paga e slot a bater → 201", async () => {
  // Sem este, um gate que rejeitasse TUDO passaria em todos os testes negativos.
  cotasMem.set(DONO, cotaPaga("bronze"));
  assert.equal((await produtos(pedidoProduto({ categoria: "bronze" }))).status, 201);
});

test("D3: cota bronze não publica no slot diamante → 403", async () => {
  cotasMem.set(DONO, cotaPaga("bronze"));
  const r = await produtos(pedidoProduto({ categoria: "diamante" }));
  assert.equal(r.status, 403);
  assert.equal((await r.json()).error.code, "categoria_nao_permitida");
});

test("D3 NÃO é acumulativo: diamante também não publica em bronze", async () => {
  // Decisão do operador: cada um publica só no slot do seu nível.
  cotasMem.set(DONO, cotaPaga("diamante"));
  assert.equal((await produtos(pedidoProduto({ categoria: "bronze" }))).status, 403);
});

test("cada nível publica no seu slot", async () => {
  for (const cat of ["bronze", "prata", "ouro", "diamante"]) {
    cotasMem.clear(); blobs.clear();
    cotasMem.set(DONO, cotaPaga(cat));
    assert.equal((await produtos(pedidoProduto({ categoria: cat }))).status, 201, `falhou em ${cat}`);
  }
});

// ── NÃO-REGRESSÃO: a vitrine pública não pode ser trancada ───────────────────

test("⚠️ GET /produtos continua público (a vitrine não é do lojista)", async () => {
  const r = await produtos(new Request("https://x/.netlify/functions/produtos?categoria=bronze"));
  // O que este teste afirma é UMA coisa: o gate não tocou na leitura. Se a
  // vitrine passasse a exigir cota, ninguém veria os produtos — e o gate é para
  // proteger a PUBLICAÇÃO, não a montra.
  assert.notEqual(r.status, 403, "o gate atingiu a leitura pública — a vitrine deixaria de abrir");
  assert.notEqual(r.status, 401, "a leitura pública passou a exigir autenticação");
  // ⚠️ NÃO se afirma aqui `status < 500`. Este ramo devolve 5xx NESTE ARNÊS
  // porque o mock de Blobs não implementa o índice por categoria — é limitação
  // do teste, não do produto. Afirmá-lo daria um vermelho que não diz nada sobre
  // a alteração, e o F1 só mexe no `handlePost`.
});

test("GET sem params (resumo agregado) continua público", async () => {
  const r = await produtos(new Request("https://x/.netlify/functions/produtos"));
  assert.notEqual(r.status, 403);
  assert.notEqual(r.status, 401);
});

// ── MUTAÇÕES VALIDADAS ───────────────────────────────────────────────────────
//  1. remover a chamada a validarCotaAtiva em produtos.mjs
//     → apanhada por: "utilizador COMUM → 403"
//  2. trocar `vendida === true` por `!!vendida`
//     → apanhada por: "`vendida` truthy mas não booleano"
//  3. remover a exigência de categoria válida
//     → apanhada por: "vendida=true SEM categoria" e "categoria inventada"
//  4. remover a comparação categoria-do-produto vs categoria-da-cota
//     → apanhada por: "cota bronze não publica no slot diamante"
//  5. tornar a regra de nível acumulativa (>= em vez de ===)
//     → apanhada por: "D3 NÃO é acumulativo"
//  6. remover o retry em minúsculas em validarCotaAtiva
//     → apanhada por: "ARMADILHA DA CHAVE"
//  7. no catch de validarCotaAtiva, devolver { ativa: true }
//     → apanhada por: "FAIL-CLOSED"
//  8. aplicar o gate também ao GET
//     → apanhada por: "GET /produtos continua público"

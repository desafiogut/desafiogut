// MC102 — «Recebi» pelo comprador (C13) + prazo de arrependimento de 7 dias (CDC art. 49).
// Handlers REAIS (`pedidos.mjs`, `produtos.mjs`) sobre Blobs em memória; auth, log e cota em duplo
// controlável (o mesmo arnês do MC-ECOMMERCE-01a). Bidireccional em cada ponto.
//
// node --test --experimental-test-module-mocks _tests/mc102-recebido.test.mjs

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const blobs = new Map();
mock.module("@netlify/blobs", {
  namedExports: {
    getStore: ({ name }) => {
      if (!blobs.has(name)) blobs.set(name, new Map());
      const m = blobs.get(name);
      return {
        async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
        async setJSON(k, o) { if (ctx.falhaChave && ctx.falhaChave.test(k)) throw new Error("blobs em baixo"); m.set(k, JSON.stringify(o)); },
        async list({ prefix = "" } = {}) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
        async delete(k) { m.delete(k); },
      };
    },
  },
});
mock.module("../_lib/cache.mjs", { namedExports: { cacheAside: async (_k, f) => f(), cacheDel: async () => {} } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });

const ctx = { falhaChave: null, lances: [], user: null, admin: null, logRebenta: false, logs: [], cota: { ativa: true, categoria: "ouro" }, marcador: null };
mock.module("../_lib/jwt.mjs", {
  namedExports: {
    verificarUserSession: async () => {
      if (!ctx.user) { const e = new Error("inv"); e.code = "ERR_JWT_INVALID"; throw e; }
      return { endereco: ctx.user, tipo: "user-session" };
    },
    assinarUserSession: async () => "tok",
  },
});
mock.module("../_lib/admin-auth.mjs", {
  namedExports: {
    guardAdmin: async () => (ctx.admin ? null : new Response("{}", { status: 401 })),
    autenticarAdmin: async () => (ctx.admin
      ? { ok: true, endereco: ctx.admin.endereco, payload: { nivel: ctx.admin.nivel } } : { ok: false }),
  },
});
mock.module("../_lib/admin-log.mjs", {
  namedExports: {
    registrarAcao: async (a) => { if (ctx.logRebenta) throw new Error("supabase em baixo"); ctx.logs.push(a); return { id: "log1" }; },
    confirmarAcao: async () => {},
  },
});
mock.module("../_lib/cotas-store.mjs", { namedExports: { getCota: async () => null } });
mock.module("../_lib/cota-utils.mjs", {
  namedExports: { validarCotaAtiva: async () => ctx.cota, MSG_COTA_INATIVA: "cota inativa" },
});
mock.module("../_lib/bids-store.mjs", { namedExports: { estaConsolidado: async () => ctx.marcador, marcarConsolidado: async () => {} } });
mock.module("../_lib/data-store.mjs", { namedExports: { getLances: async () => ctx.lances } });

const pedidosH  = (await import("../pedidos.mjs")).default;
const edicoesH  = (await import("../edicoes.mjs")).default;
const { buscarEdicao } = await import("../_lib/edicoes-core.mjs");
const produtosH = (await import("../produtos.mjs")).default;
const L = await import("../_lib/pedidos.mjs");

const PID = "11111111-2222-3333-4444-555555555555";
const LOJISTA = "0xcccccccccccccccccccccccccccccccccccccccc";
const COMPRADOR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OUTRO = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const ADMIN = { endereco: "0xdddddddddddddddddddddddddddddddddddddddd", nivel: "operador" };
const ENDERECO_OK = { nome: "Maria Silva", cpf: "529.982.247-25", cep: "69027-010", logradouro: "Rua 5 de Setembro",
  numero: "86", bairro: "São Raimundo", cidade: "Manaus", uf: "am", telefone: "(92) 99999-0000" };

const ler = (s, k) => { const v = blobs.get(s)?.get(k); return v ? JSON.parse(v) : null; };
const gravar = (s, k, o) => { if (!blobs.has(s)) blobs.set(s, new Map()); blobs.get(s).set(k, JSON.stringify(o)); };
const req = (fn, method, qs, body) => fn(new Request(`https://x/.netlify/functions/${fn === pedidosH ? "pedidos" : "produtos"}?${qs}`, {
  method, headers: { authorization: "Bearer tok", "content-type": "application/json" },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
}));
const json = async (p) => { const r = await p; return { status: r.status, body: await r.json() }; };

function semearVendido({ comMorada = false, comRastreio = false } = {}) {
  gravar("produtos", `produto:${PID}`, { id: PID, nome: "Air Fryer", lojista: LOJISTA, endereco: LOJISTA,
    categoria: "ouro", status: "vendido", vencedor: { endereco: COMPRADOR, edicaoId: "RELAMP-9" } });
  gravar("pedidos", `pedido:${PID}`, { produtoId: PID, edicaoId: "RELAMP-9", comprador: COMPRADOR, produtoNome: "Air Fryer",
    morada: comMorada ? L.validarMorada(ENDERECO_OK) : null,
    rastreio: comRastreio ? { codigo: "AA123456789BR", transportadora: "Correios" } : null, nfe: null, historico: [] });
  gravar("pedidos", `comprador:${COMPRADOR}`, { ids: [PID] });
}

beforeEach(() => {
  blobs.clear(); ctx.user = null; ctx.admin = null; ctx.logRebenta = false; ctx.logs.length = 0;
  ctx.cota = { ativa: true, categoria: "ouro" }; ctx.marcador = null; ctx.lances = []; ctx.falhaChave = null;
});


const PUT_RECEBIDO = () => json(req(pedidosH, "PUT", `acao=recebido&produtoId=${PID}`, {}));

// ── Frente B: marcar recebido ──────────────────────────────────────────────
test("B: sem sessão → 401 e o pedido não muda", async () => {
  semearVendido({ comMorada: true, comRastreio: true });
  const r = await PUT_RECEBIDO();
  assert.equal(r.status, 401);
  assert.equal(ler("pedidos", `pedido:${PID}`).recebido_em, undefined);
});

test("B: o DONO de um pedido enviado marca → 200, grava recebido_em (ISO) e o evento no histórico", async () => {
  semearVendido({ comMorada: true, comRastreio: true });
  ctx.user = COMPRADOR;
  const antes = Date.now();
  const r = await PUT_RECEBIDO();
  assert.equal(r.status, 200);
  const p = ler("pedidos", `pedido:${PID}`);
  assert.match(p.recebido_em, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.ok(Date.parse(p.recebido_em) >= antes - 5 && Date.parse(p.recebido_em) <= Date.now() + 5);
  assert.equal(p.historico.at(-1).evento, "recebido");
  assert.equal(r.body.pedido.recebido_em, p.recebido_em);
});

test("B: OUTRO utilizador → 404 pedido_nao_encontrado (não confirma que existe) e o pedido NÃO muda", async () => {
  semearVendido({ comMorada: true, comRastreio: true });
  ctx.user = OUTRO;
  const r = await PUT_RECEBIDO();
  assert.equal(r.status, 404);
  assert.equal(r.body.error.code, "pedido_nao_encontrado");
  assert.equal(ler("pedidos", `pedido:${PID}`).recebido_em, undefined);
});

test("B: o admin não marca pelo comprador — sem sessão (401) e com o token de admin aceite como sessão (404)", async () => {
  semearVendido({ comMorada: true, comRastreio: true });
  ctx.admin = ADMIN;
  assert.equal((await PUT_RECEBIDO()).status, 401);
  // No servidor REAL, verificarUserSession também aceita tokens admin-access (jwt.mjs), e
  // devolve o endereço do ADMIN. O duplo daqui rejeitava tudo — era mais permissivo que o
  // real no sentido de esconder este caminho (achado do validador). Simula-se o real:
  ctx.user = ADMIN.endereco;
  const r = await PUT_RECEBIDO();
  assert.equal(r.status, 404);
  assert.equal(ler("pedidos", `pedido:${PID}`).recebido_em, undefined);
});

test("B: o endereço vem SÓ do token — um corpo a dizer que é o comprador não abre a porta (validador, B1)", async () => {
  semearVendido({ comMorada: true, comRastreio: true });
  ctx.user = OUTRO;
  const r = await json(req(pedidosH, "PUT", `acao=recebido&produtoId=${PID}`, { endereco: COMPRADOR, comprador: COMPRADOR }));
  assert.equal(r.status, 404);
  assert.equal(ler("pedidos", `pedido:${PID}`).recebido_em, undefined);
});

test("B: antes do envio (sem rastreio) → 409 pedido_nao_enviado e o pedido NÃO muda", async () => {
  semearVendido({ comMorada: true });
  ctx.user = COMPRADOR;
  const r = await PUT_RECEBIDO();
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, "pedido_nao_enviado");
  assert.equal(ler("pedidos", `pedido:${PID}`).recebido_em, undefined);
});

test("B: IDEMPOTENTE — a 2.ª chamada do dono devolve 200 e NÃO reescreve recebido_em nem o histórico", async () => {
  semearVendido({ comMorada: true, comRastreio: true });
  const p0 = ler("pedidos", `pedido:${PID}`);
  const ANTIGO = "2026-09-01T10:00:00.000Z";
  gravar("pedidos", `pedido:${PID}`, { ...p0, recebido_em: ANTIGO, historico: [{ evento: "recebido", em: ANTIGO }] });
  ctx.user = COMPRADOR;
  const r = await PUT_RECEBIDO();
  assert.equal(r.status, 200);
  assert.equal(r.body.idempotent, true);
  const p = ler("pedidos", `pedido:${PID}`);
  assert.equal(p.recebido_em, ANTIGO);
  assert.equal(p.historico.length, 1);
});

test("B: não-regressão — o operador ainda regista NF-e depois do «Recebi», e o recebido_em sobrevive", async () => {
  semearVendido({ comMorada: true, comRastreio: true });
  ctx.user = COMPRADOR;
  await PUT_RECEBIDO();
  const rec = ler("pedidos", `pedido:${PID}`).recebido_em;
  ctx.user = null; ctx.admin = ADMIN;
  const r = await json(req(pedidosH, "PUT", `acao=nfe&produtoId=${PID}`, { numero: "123" }));
  assert.equal(r.status, 200);
  assert.equal(ler("pedidos", `pedido:${PID}`).recebido_em, rec);
});

test("B: não-regressão — marcar-entregue (lojista) continua a funcionar e coexiste com o «Recebi»", async () => {
  semearVendido({ comMorada: true, comRastreio: true });
  ctx.user = COMPRADOR;
  await PUT_RECEBIDO();
  ctx.user = LOJISTA;
  assert.equal((await json(req(produtosH, "PUT", `id=${PID}&acao=marcar-entregue`))).status, 200);
  assert.equal(ler("produtos", `produto:${PID}`).status, "entregue");
  assert.ok(ler("pedidos", `pedido:${PID}`).recebido_em);
});

test("B: acção desconhecida continua recusada com a lista actualizada", async () => {
  semearVendido({ comMorada: true, comRastreio: true });
  ctx.user = COMPRADOR;
  const r = await json(req(pedidosH, "PUT", `acao=xpto&produtoId=${PID}`, {}));
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /recebido/);
});

// ── Frente C: prazo de arrependimento (CDC art. 49) ────────────────────────
const DIA = 86_400_000;
test("C: com recebido_em, o prazo conta DELE — mesmo havendo entregue_em diferente no produto", () => {
  const r = L.prazoArrependimento({ recebido_em: "2026-09-25T10:00:00.000Z" }, "2026-09-20T08:00:00.000Z");
  assert.equal(r.fonte, "recebido_em");
  assert.equal(r.inicio, "2026-09-25T10:00:00.000Z");
  assert.equal(r.fim, "2026-10-02T10:00:00.000Z");
  assert.equal(Date.parse(r.fim) - Date.parse(r.inicio), 7 * DIA);
  assert.equal(r.dias, 7);
});

test("C: SEM recebido_em, fallback para o entregue_em do produto", () => {
  const r = L.prazoArrependimento({ recebido_em: undefined }, "2026-09-20T08:00:00.000Z");
  assert.equal(r.fonte, "entregue_em");
  assert.equal(r.inicio, "2026-09-20T08:00:00.000Z");
  assert.equal(r.fim, "2026-09-27T08:00:00.000Z");
});

test("C: sem nenhum dos dois (ou data ilegível) → null: o prazo NÃO abriu", () => {
  assert.equal(L.prazoArrependimento({}, null), null);
  assert.equal(L.prazoArrependimento(null, null), null);
  assert.equal(L.prazoArrependimento({ recebido_em: "ontem" }, null), null);
  assert.equal(L.prazoArrependimento({}, "nao-e-data"), null);
});

test("C (uso): o GET do comprador devolve o arrependimento — antes do «Recebi» com fallback, depois dele a contar do recebido_em", async () => {
  semearVendido({ comMorada: true, comRastreio: true });
  ctx.user = COMPRADOR;
  // antes de tudo: sem entregue nem recebido → null
  let g = await json(req(pedidosH, "GET", ""));
  assert.equal(g.status, 200);
  assert.equal(g.body.pedidos[0].arrependimento, null);
  // o lojista marca entregue → fallback entregue_em
  ctx.user = LOJISTA;
  await json(req(produtosH, "PUT", `id=${PID}&acao=marcar-entregue`));
  const entregue = ler("produtos", `produto:${PID}`).entregue_em;
  ctx.user = COMPRADOR;
  g = await json(req(pedidosH, "GET", `produtoId=${PID}`));
  assert.equal(g.body.pedido.arrependimento.fonte, "entregue_em");
  assert.equal(g.body.pedido.arrependimento.inicio, entregue);
  // o comprador confirma → passa a contar do recebido_em
  await PUT_RECEBIDO();
  const rec = ler("pedidos", `pedido:${PID}`).recebido_em;
  g = await json(req(pedidosH, "GET", ""));
  assert.equal(g.body.pedidos[0].arrependimento.fonte, "recebido_em");
  assert.equal(g.body.pedidos[0].arrependimento.inicio, rec);
  // o valor é CALCULADO na leitura, não gravado no pedido
  assert.equal(ler("pedidos", `pedido:${PID}`).arrependimento, undefined);
});

test("C (uso): o admin também recebe o arrependimento calculado", async () => {
  semearVendido({ comMorada: true, comRastreio: true });
  const p0 = ler("pedidos", `pedido:${PID}`);
  gravar("pedidos", `pedido:${PID}`, { ...p0, recebido_em: "2026-09-25T10:00:00.000Z" });
  ctx.admin = ADMIN;
  const g = await json(req(pedidosH, "GET", ""));
  assert.equal(g.body.pedidos[0].arrependimento.fim, "2026-10-02T10:00:00.000Z");
});

test("C (uso): o GET do admin por produtoId também traz o arrependimento (validador, B2)", async () => {
  semearVendido({ comMorada: true, comRastreio: true });
  const p0 = ler("pedidos", `pedido:${PID}`);
  gravar("pedidos", `pedido:${PID}`, { ...p0, recebido_em: "2026-09-25T10:00:00.000Z" });
  ctx.admin = ADMIN;
  const g = await json(req(pedidosH, "GET", `produtoId=${PID}`));
  assert.equal(g.body.pedido.arrependimento.fonte, "recebido_em");
  assert.equal(g.body.pedido.arrependimento.fim, "2026-10-02T10:00:00.000Z");
});

// MC-ECOMMERCE-01a — entrega, rastreio, NF-e e as portas fechadas no catálogo.
// Handlers REAIS (`pedidos.mjs`, `produtos.mjs`) sobre Blobs em memória; auth, log e cota
// em duplo controlável.
//
// Bidireccional em cada ponto: o caminho legítimo passa E o caminho oposto é recusado.
// Mutações validadas: ver o rodapé.
//
// node --test --experimental-test-module-mocks _tests/mcecommerce01a-pedidos.test.mjs

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

// ── validação pura ──────────────────────────────────────────────────────────
test("validação: CEP, CPF, UF, rastreio, NF-e (chave com DV) e prazo — aceita o válido, recusa o oposto", () => {
  const m = L.validarMorada(ENDERECO_OK);
  assert.equal(m.cep, "69027010"); assert.equal(m.cpf, "52998224725"); assert.equal(m.uf, "AM");
  assert.throws(() => L.validarMorada({ ...ENDERECO_OK, cep: "6902-701" }), { code: "cep_invalido" });
  assert.throws(() => L.validarMorada({ ...ENDERECO_OK, cpf: "529.982.247-24" }), { code: "cpf_invalido" });
  assert.throws(() => L.validarMorada({ ...ENDERECO_OK, uf: "XX" }), { code: "uf_invalida" });
  assert.throws(() => L.validarMorada({ ...ENDERECO_OK, numero: " " }), { code: "numero_invalido" });

  assert.deepEqual(L.validarRastreio("aa123456789br"), { codigo: "AA123456789BR", transportadora: "Correios" });
  assert.throws(() => L.validarRastreio("XYZ12345"), { code: "transportadora_obrigatoria" });
  assert.throws(() => L.validarRastreio("a b"), { code: "rastreio_invalido" });

  // chave de acesso real de exemplo com DV válido (43 dígitos + DV módulo 11)
  const base = "3523100000000000000055001000000001100000001";
  let soma = 0, peso = 2; for (let i = 42; i >= 0; i--) { soma += Number(base[i]) * peso; peso = peso === 9 ? 2 : peso + 1; }
  const dv = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  assert.equal(L.validarNfe({ numero: "123", chave: base + dv }).chave, base + dv);
  assert.throws(() => L.validarNfe({ numero: "123", chave: base + ((dv + 1) % 10) }), { code: "nfe_chave_invalida" });
  assert.throws(() => L.validarNfe({ numero: "0" }), { code: "nfe_numero_invalido" });

  assert.equal(L.validarPrazo(""), null); assert.equal(L.validarPrazo("15"), 15);
  assert.throws(() => L.validarPrazo(0), { code: "prazo_invalido" });
  assert.throws(() => L.validarPrazo(91), { code: "prazo_invalido" });
});

// ── endereço de entrega (comprador) ─────────────────────────────────────────
test("endereço: o comprador grava o seu; outro utilizador não vê nem escreve (404)", async () => {
  semearVendido();
  ctx.user = OUTRO;
  assert.equal((await json(req(pedidosH, "PUT", `acao=endereco&produtoId=${PID}`, { endereco: ENDERECO_OK }))).status, 404);
  assert.equal((await json(req(pedidosH, "GET", `produtoId=${PID}`))).status, 404, "pedido alheio não se confirma");
  assert.equal(ler("pedidos", `pedido:${PID}`).morada, null);

  ctx.user = COMPRADOR;
  const r = await json(req(pedidosH, "PUT", `acao=endereco&produtoId=${PID}`, { endereco: ENDERECO_OK }));
  assert.equal(r.status, 200);
  assert.equal(ler("pedidos", `pedido:${PID}`).morada.cep, "69027010");
  const lista = await json(req(pedidosH, "GET", ""));
  assert.equal(lista.body.pedidos.length, 1);

  const inval = await json(req(pedidosH, "PUT", `acao=endereco&produtoId=${PID}`, { endereco: { ...ENDERECO_OK, cep: "1" } }));
  assert.equal(inval.status, 400); assert.equal(inval.body.error.code, "cep_invalido");
  assert.equal(ler("pedidos", `pedido:${PID}`).morada.cep, "69027010", "um endereço inválido não apaga o válido");
});

test("endereço: depois do envio já não muda (409)", async () => {
  semearVendido({ comMorada: true, comRastreio: true });
  ctx.user = COMPRADOR;
  assert.equal((await json(req(pedidosH, "PUT", `acao=endereco&produtoId=${PID}`, { endereco: ENDERECO_OK }))).status, 409);
});

test("o endereço NÃO vaza pelo catálogo público", async () => {
  semearVendido({ comMorada: true });
  const r = await json(req(produtosH, "GET", `id=${PID}`));
  assert.equal(r.status, 200);
  const txt = JSON.stringify(r.body);
  assert.ok(!txt.includes("52998224725") && !txt.includes("69027010"), "CPF/CEP no GET público de produtos");
});

// ── rastreio e NF-e (operador) ──────────────────────────────────────────────
test("rastreio: só operador; exige endereço; notifica o comprador; tem log", async () => {
  semearVendido();
  ctx.user = LOJISTA;
  assert.equal((await json(req(pedidosH, "PUT", `acao=rastreio&produtoId=${PID}`, { codigo: "AA123456789BR" }))).status, 403);
  ctx.user = null; ctx.admin = ADMIN;
  assert.equal((await json(req(pedidosH, "PUT", `acao=rastreio&produtoId=${PID}`, { codigo: "AA123456789BR" }))).status, 409,
    "sem endereço não há envio");
  semearVendido({ comMorada: true });
  const r = await json(req(pedidosH, "PUT", `acao=rastreio&produtoId=${PID}`, { codigo: "AA123456789BR" }));
  assert.equal(r.status, 200);
  assert.equal(ler("pedidos", `pedido:${PID}`).rastreio.codigo, "AA123456789BR");
  assert.ok(ler("notificacoes", COMPRADOR).notificacoes.some((n) => n.tipo === "pedido_enviado" && n.mensagem.includes("AA123456789BR")));
  assert.ok(ctx.logs.some((l) => l.tipo_acao === "pedido_rastreio"), "acção do operador fica no log");
});

test("NF-e: guardada, notificada; chave inválida recusada; log fail-closed impede a escrita", async () => {
  semearVendido({ comMorada: true });
  ctx.admin = ADMIN;
  assert.equal((await json(req(pedidosH, "PUT", `acao=nfe&produtoId=${PID}`, { numero: "12", chave: "123" }))).status, 400);
  assert.equal(ler("pedidos", `pedido:${PID}`).nfe, null);

  ctx.logRebenta = true;
  assert.equal((await json(req(pedidosH, "PUT", `acao=nfe&produtoId=${PID}`, { numero: "4521" }))).status, 503);
  assert.equal(ler("pedidos", `pedido:${PID}`).nfe, null, "sem registo de auditoria, a acção NÃO acontece");

  ctx.logRebenta = false;
  const r = await json(req(pedidosH, "PUT", `acao=nfe&produtoId=${PID}`, { numero: "4521", serie: "1" }));
  assert.equal(r.status, 200);
  assert.equal(ler("pedidos", `pedido:${PID}`).nfe.numero, "4521");
  assert.ok(ler("notificacoes", COMPRADOR).notificacoes.some((n) => n.tipo === "nfe_emitida" && n.mensagem.includes("4521")));
});

test("reprocessar-venda: usa o vencedor do MARCADOR de consolidação e ignora o corpo; exige nível admin", async () => {
  gravar("produtos", `produto:${PID}`, { id: PID, nome: "Air Fryer", lojista: LOJISTA, categoria: "ouro", status: "ativo" });
  gravar("edicoes-metadata", "RELAMP-9", { id: "RELAMP-9", tipo: "relampago", produtoId: PID });
  ctx.marcador = { vencedor: COMPRADOR, menorUnicoCentavos: 30, txHash: "0xrecibo" };
  ctx.admin = ADMIN; // operador
  assert.equal((await json(req(pedidosH, "POST", "acao=reprocessar-venda&edicaoId=RELAMP-9", { vencedor: OUTRO }))).status, 403);
  ctx.admin = { ...ADMIN, nivel: "admin" };
  const r = await json(req(pedidosH, "POST", "acao=reprocessar-venda&edicaoId=RELAMP-9", { vencedor: OUTRO }));
  assert.equal(r.status, 200);
  assert.equal(ler("produtos", `produto:${PID}`).vencedor.endereco, COMPRADOR, "o corpo não escolhe o vencedor");
});

// ── portas fechadas no catálogo (produtos.mjs) ──────────────────────────────
test("registrar-vencedor: o lojista dono já não escolhe o vencedor (410, produto intacto)", async () => {
  gravar("produtos", `produto:${PID}`, { id: PID, lojista: LOJISTA, endereco: LOJISTA, categoria: "ouro", status: "ativo" });
  ctx.user = LOJISTA;
  const r = await json(req(produtosH, "PUT", `id=${PID}&acao=registrar-vencedor`, { vencedor: { endereco: OUTRO } }));
  assert.equal(r.status, 410);
  const p = ler("produtos", `produto:${PID}`);
  assert.equal(p.status, "ativo"); assert.equal(p.vencedor, undefined);
});

test("PUT status: rascunho↔ativo passa; vendido/entregue por edição NÃO; nada com o produto numa edição", async () => {
  gravar("produtos", `produto:${PID}`, { id: PID, lojista: LOJISTA, endereco: LOJISTA, categoria: "ouro", status: "ativo" });
  ctx.user = LOJISTA;
  assert.equal((await json(req(produtosH, "PUT", `id=${PID}`, { status: "rascunho" }))).status, 200);
  assert.equal((await json(req(produtosH, "PUT", `id=${PID}`, { status: "vendido" }))).status, 409);
  assert.equal(ler("produtos", `produto:${PID}`).status, "rascunho");
  gravar("produtos", `produto:${PID}`, { id: PID, lojista: LOJISTA, endereco: LOJISTA, categoria: "ouro", status: "ativo", edicaoVinculada: "RELAMP-9" });
  assert.equal((await json(req(produtosH, "PUT", `id=${PID}`, { status: "rascunho" }))).status, 409);
  semearVendido();
  assert.equal((await json(req(produtosH, "PUT", `id=${PID}`, { status: "ativo" }))).status, 409, "vendido não volta à vitrine");
});

test("PUT categoria: mudar para um slot acima da cota é recusado; o próprio slot passa", async () => {
  gravar("produtos", `produto:${PID}`, { id: PID, lojista: LOJISTA, endereco: LOJISTA, categoria: "bronze", status: "ativo" });
  ctx.user = LOJISTA; ctx.cota = { ativa: true, categoria: "bronze" };
  assert.equal((await json(req(produtosH, "PUT", `id=${PID}`, { categoria: "diamante" }))).status, 403);
  assert.equal(ler("produtos", `produto:${PID}`).categoria, "bronze");
  assert.equal((await json(req(produtosH, "PUT", `id=${PID}`, { categoria: "bronze", prazo_entrega_dias: 12 }))).status, 200);
  assert.equal(ler("produtos", `produto:${PID}`).prazo_entrega_dias, 12);
  assert.equal((await json(req(produtosH, "PUT", `id=${PID}`, { prazo_entrega_dias: 400 }))).status, 400);
});

test("marcar-entregue: exige envio registado; DELETE de vendido recusado", async () => {
  semearVendido({ comMorada: true });
  ctx.user = LOJISTA;
  assert.equal((await json(req(produtosH, "PUT", `id=${PID}&acao=marcar-entregue`))).status, 409);
  assert.equal(ler("produtos", `produto:${PID}`).status, "vendido");
  semearVendido({ comMorada: true, comRastreio: true });
  assert.equal((await json(req(produtosH, "PUT", `id=${PID}&acao=marcar-entregue`))).status, 200);
  assert.equal(ler("produtos", `produto:${PID}`).status, "entregue");
  assert.equal((await json(req(produtosH, "DELETE", `id=${PID}`))).status, 409);
  assert.ok(ler("produtos", `produto:${PID}`), "o produto vendido continua lá");
});

// ── Achados do validador adversarial (cada teste mata a mutação que ele mediu a sobreviver) ──

const ED_BODY = { tipo: "relampago", produto: "Air Fryer", produtoId: PID, duracaoMin: 60 };
const criarEd = (body = ED_BODY) => json(req(edicoesH, "POST", "", body));
const ativo = (extra = {}) => gravar("produtos", `produto:${PID}`,
  { id: PID, nome: "Air Fryer 5L", preco: 50000, lojista: LOJISTA, endereco: LOJISTA, categoria: "ouro", status: "ativo", ...extra });

test("[X1/X2] POST /edicoes com produtoId → edição ligada ao produto, e a ponte vende-o (caminho do uso)", async () => {
  ativo(); ctx.admin = { ...ADMIN, nivel: "admin" };
  const r = await criarEd();
  assert.equal(r.status, 201);
  const id = r.body.edicao.id;
  assert.equal(r.body.edicao.produtoId, PID, "a resposta da criação mostra o produto ligado");
  assert.equal(ler("edicoes-metadata", id).produtoId, PID, "a edição GRAVADA tem o produtoId (é o que a ponte lê)");
  assert.equal(ler("produtos", `produto:${PID}`).edicaoVinculada, id);
  const v = await L.registrarVendaDaEdicao({ edicaoId: id, vencedor: COMPRADOR, menorUnicoCentavos: 30, txHash: "0xr" }, { buscarEdicao });
  assert.equal(v.ok, true, `a ponte não vendeu: ${v.code}`);
  assert.equal(ler("produtos", `produto:${PID}`).status, "vendido");
});

test("[X3] a listagem do comprador só traz os SEUS pedidos (IDOR)", async () => {
  semearVendido({ comMorada: true });
  const PID2 = "99999999-8888-7777-6666-555555555555";
  gravar("pedidos", `pedido:${PID2}`, { produtoId: PID2, comprador: OUTRO, morada: { cpf: "11144477735" }, historico: [] });
  gravar("pedidos", `comprador:${OUTRO}`, { ids: [PID2] });
  ctx.user = COMPRADOR;
  const r = await json(req(pedidosH, "GET", ""));
  assert.deepEqual(r.body.pedidos.map((p) => p.produtoId), [PID]);
  assert.ok(!JSON.stringify(r.body).includes("11144477735"), "CPF de outro comprador na listagem");
});

test("[X4] DELETE de produto vinculado a uma edição é recusado", async () => {
  ativo({ edicaoVinculada: "RELAMP-9" }); ctx.user = LOJISTA;
  assert.equal((await json(req(produtosH, "DELETE", `id=${PID}`))).status, 409);
  assert.ok(ler("produtos", `produto:${PID}`));
});

test("[achado 1] bait-and-switch: nome/preço/imagem não mudam com o produto numa edição ou vendido", async () => {
  ctx.user = LOJISTA;
  ativo({ edicaoVinculada: "RELAMP-9" });
  assert.equal((await json(req(produtosH, "PUT", `id=${PID}`, { nome: "Chaveiro", preco: 100 }))).status, 409);
  assert.equal(ler("produtos", `produto:${PID}`).nome, "Air Fryer 5L");
  semearVendido();
  assert.equal((await json(req(produtosH, "PUT", `id=${PID}`, { nome: "Outro" }))).status, 409);
  assert.equal(ler("produtos", `produto:${PID}`).nome, "Air Fryer");
  ativo(); // sem vínculo: a edição normal continua a funcionar
  assert.equal((await json(req(produtosH, "PUT", `id=${PID}`, { nome: "Air Fryer 6L" }))).status, 200);
});

test("[achado 3] gravação da edição falha → o produto NÃO fica preso; vínculo órfão não bloqueia", async () => {
  ativo(); ctx.admin = { ...ADMIN, nivel: "admin" }; ctx.falhaChave = /^RELAMP-/;
  const r = await criarEd();
  assert.equal(r.status, 503);
  assert.equal(ler("produtos", `produto:${PID}`).edicaoVinculada, undefined, "rollback do vínculo");
  ctx.falhaChave = null;
  ativo({ edicaoVinculada: "RELAMP-77" }); // órfão: a edição RELAMP-77 não existe
  assert.equal((await criarEd()).status, 201, "vínculo a uma edição inexistente não prende o produto");
});

test("[achado 3] liberar-produto: só com a edição terminada E sem vencedor possível", async () => {
  ctx.admin = { ...ADMIN, nivel: "admin" };
  const fim = new Date(Date.now() - 60_000).toISOString();
  ativo({ edicaoVinculada: "RELAMP-9" });
  gravar("edicoes-metadata", "RELAMP-9", { id: "RELAMP-9", status: "aberto", termino_em: new Date(Date.now() + 3600_000).toISOString(), produtoId: PID });
  assert.equal((await json(req(pedidosH, "POST", `acao=liberar-produto&produtoId=${PID}`))).status, 409, "em curso");
  gravar("edicoes-metadata", "RELAMP-9", { id: "RELAMP-9", status: "aberto", termino_em: fim, produtoId: PID });
  ctx.lances = [{ endereco: COMPRADOR, valorCentavos: 30 }];
  assert.equal((await json(req(pedidosH, "POST", `acao=liberar-produto&produtoId=${PID}`))).status, 409, "há vencedor possível");
  assert.equal(ler("produtos", `produto:${PID}`).edicaoVinculada, "RELAMP-9");
  ctx.lances = [{ endereco: COMPRADOR, valorCentavos: 30 }, { endereco: OUTRO, valorCentavos: 30 }];
  assert.equal((await json(req(pedidosH, "POST", `acao=liberar-produto&produtoId=${PID}`))).status, 200);
  assert.equal(ler("produtos", `produto:${PID}`).edicaoVinculada, undefined);
});

test("[achado 4] correcção do rastreio chega ao comprador (não é engolida pela dedupe)", async () => {
  semearVendido({ comMorada: true }); ctx.admin = ADMIN;
  await json(req(pedidosH, "PUT", `acao=rastreio&produtoId=${PID}`, { codigo: "AA111111111BR" }));
  await json(req(pedidosH, "PUT", `acao=rastreio&produtoId=${PID}`, { codigo: "AA222222222BR" }));
  const envios = ler("notificacoes", COMPRADOR).notificacoes.filter((n) => n.tipo === "pedido_enviado");
  assert.ok(envios.some((n) => n.mensagem.includes("AA222222222BR")), "o código corrigido não chegou");
});

test("[achado 7] depois da NF-e o endereço/CPF já não muda", async () => {
  semearVendido({ comMorada: true });
  const p = ler("pedidos", `pedido:${PID}`); p.nfe = { numero: "1", serie: "1" }; gravar("pedidos", `pedido:${PID}`, p);
  ctx.user = COMPRADOR;
  assert.equal((await json(req(pedidosH, "PUT", `acao=endereco&produtoId=${PID}`, { endereco: { ...ENDERECO_OK, cpf: "111.444.777-35" } }))).status, 409);
  assert.equal(ler("pedidos", `pedido:${PID}`).morada.cpf, "52998224725");
});

// MUTAÇÕES (cada uma pôs este ficheiro RED; ver o relatório do MC-ECOMMERCE-01a):
//   P1 repor o registrar-vencedor antigo (vencedor do corpo)       → registrar-vencedor RED
//   P2 definirMorada sem a verificação de comprador                → endereço RED
//   P3 pedidos.mjs sem a exigência de admin no rastreio            → rastreio RED
//   P4 comLog sem o return 503 (log falha e a acção corre)         → NF-e RED
//   P5 PUT status sem a restrição de transição                     → PUT status RED
//   P6 PUT categoria sem revalidar a cota                          → PUT categoria RED
//   P7 marcar-entregue sem exigir rastreio                         → marcar-entregue RED
//   P8 reprocessar-venda a ler o vencedor do corpo                 → reprocessar RED

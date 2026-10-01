// UTAC105b.1 — AUTENTICAÇÃO em `cotas?action=update-corporativo` (regra MC89.38).
//
//   node --test --experimental-test-module-mocks _tests/utac105b1-cotas.test.mjs
//
// O QUE ESTE FICHEIRO PROVA (GATE 8 — bidireccional):
//   (a) dono legítimo ............... 200 e GRAVA
//   (b) sem token ................... 401 e NÃO grava
//   (c) token de outro .............. 403 e NÃO grava
//   (d) admin ....................... 200 e GRAVA
//   (e) token expirado .............. 401
//   (+ ) cota vinculada por `endereco` 200 · cota `cnpj:` sem endereco 403 (aceite, R18-2)
//   (+ ) 401/403 têm PRIORIDADE sobre 404 (não se revela a existência da cota)
//   (+ ) falha de leitura → 502 (fail-closed, não autoriza)
//
// ⚠️ Mutações validadas — lista no rodapé (8 mutantes, 8 mortos; md5 restaurado idêntico).

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const DONO  = "0xaabbccddeeff00112233445566778899aabbccdd";
const OUTRO = "0x1111222233334444555566667777888899990000";
const CNPJ_ID = "cnpj:23040066000100";

// ── duplos (só fronteiras externas; `validate.mjs`/`cors.mjs` ficam REAIS) ────
const cotas = new Map();
const upserts = [];
let getCotaRebenta = false;
mock.module("../_lib/cotas-store.mjs", { namedExports: {
  getCota: async (id) => {
    if (getCotaRebenta) throw new Error("supabase em baixo");
    return cotas.get(String(id)) ?? null;
  },
  upsertCota: async (id, reg) => { upserts.push({ id: String(id), reg }); cotas.set(String(id), reg); },
  deleteCota: async () => {}, getCotaByCnpj: async () => null, getCotaByEmail: async () => null,
  listarCategoria: async () => [], resumoCotas: async () => ({}),
  getFingerprint: async () => null, setFingerprint: async () => {},
  getCotaPaga: async () => null, setCotaPaga: async () => {},
} });

let jwtEndereco = null, jwtErro = null;
mock.module("../_lib/jwt.mjs", { namedExports: {
  verificarUserSession: async () => {
    if (jwtErro) { const e = new Error("jwt"); e.code = jwtErro; throw e; }
    if (!jwtEndereco) { const e = new Error("jwt"); e.code = "ERR_JWT_INVALID"; throw e; }
    return { endereco: jwtEndereco, tipo: "user-session" };
  },
  assinarUserSession: async () => "tok", verificarLanceAuth: async () => ({ endereco: jwtEndereco }),
} });

let admin = false;
mock.module("../_lib/admin-auth.mjs", { namedExports: {
  autenticarAdmin: async () => (admin ? { ok: true, endereco: null } : { ok: false }),
  guardAdmin: async () => (admin ? null : new Response("{}", { status: 401 })),
} });
mock.module("../_lib/admin-helpers.mjs", { namedExports: { getAdminAddresses: async () => [] } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
const blobs = new Map();
mock.module("@netlify/blobs", { namedExports: { getStore: ({ name }) => {
  if (!blobs.has(name)) blobs.set(name, new Map());
  const m = blobs.get(name);
  return { async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
           async setJSON(k, o) { m.set(k, JSON.stringify(o)); }, async set(k, v) { m.set(k, v); },
           async list() { return { blobs: [...m.keys()].map((key) => ({ key })) }; }, async delete(k) { m.delete(k); } };
} } });

const { default: cotasFn } = await import("../cotas.mjs");

// ── helpers ──────────────────────────────────────────────────────────────────
function pedido({ token, cliente_id = DONO, empresa = "Nova Empresa", extra = {} } = {}) {
  const h = { "content-type": "application/json" };
  if (token) h.authorization = `Bearer ${token}`;
  return new Request("https://x/.netlify/functions/cotas?action=update-corporativo", {
    method: "POST", headers: h,
    body: JSON.stringify({ cliente_id, empresa, segmento: "Varejo", site: null, logoUrl: null, email: null, ...extra }),
  });
}
/** Cota corporativa de `DONO`. `semEndereco` = o caso do cadastro directo (cnpj:). */
function semear({ id = DONO, endereco = null, tipo = "corporativo", empresa = "Original" } = {}) {
  cotas.set(String(id), { cliente_id: id, tipo, empresa, endereco, cnpj: "23040066000100", categoria: "prata" });
}
beforeEach(() => {
  cotas.clear(); upserts.length = 0;
  jwtEndereco = DONO; jwtErro = null; admin = false; getCotaRebenta = false;
  semear();
});

// ── (a) DONO LEGÍTIMO ────────────────────────────────────────────────────────
test("A1 dono (cliente_id == endereço do JWT) → 200 e grava", async () => {
  const r = await cotasFn(pedido({ quem: DONO, token: "tok" }));
  assert.equal(r.status, 200);
  assert.equal(upserts.length, 1);
  assert.equal(cotas.get(DONO).empresa, "Nova Empresa");
});

test("A2 cliente_id em MAIÚSCULAS → 404 (PRÉ-EXISTENTE, fora do escopo: a leitura não normaliza)", async () => {
  // ⚠️ MEDIDO: `getCota(clienteIdUpdate)` usa a string tal como vem no corpo, e as
  // chaves do store são minúsculas. Logo um `cliente_id` em maiúsculas dá 404 — e já
  // dava ANTES desta correcção (o ramo antigo também lia sem normalizar). Não se
  // corrige aqui: normalizar a leitura é fora do escopo do UTAC105b.1 (só a guarda).
  // O que importa para a segurança é que a NORMALIZAÇÃO DA GUARDA existe (é por isso
  // que o dono em minúsculas passa em A1) e que este caso NÃO ganha acesso: 404.
  const r = await cotasFn(pedido({ token: "tok", cliente_id: DONO.toUpperCase() }));
  assert.equal(r.status, 404);
  assert.equal(upserts.length, 0, "não pode gravar");
});

// ── (b) SEM TOKEN ────────────────────────────────────────────────────────────
test("A3 sem token → 401 e NÃO grava", async () => {
  jwtEndereco = null;
  const r = await cotasFn(pedido({}));
  assert.equal(r.status, 401);
  assert.equal((await r.json()).error.code, "token_ausente");
  assert.equal(upserts.length, 0, "não pode gravar sem token");
  assert.equal(cotas.get(DONO).empresa, "Original", "a cota não pode ter mudado");
});

test("A4 sem token + cota INEXISTENTE → 401 (não 404: não se revela existência)", async () => {
  jwtEndereco = null;
  const r = await cotasFn(pedido({ cliente_id: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" }));
  assert.equal(r.status, 401);
  assert.equal(upserts.length, 0);
});

test("A5 token inválido (não é JWT) → 401", async () => {
  jwtEndereco = null;   // verificarUserSession lança ERR_JWT_INVALID
  const r = await cotasFn(pedido({ token: "lixo" }));
  assert.equal(r.status, 401);
  assert.equal(upserts.length, 0);
});

test("A6 token EXPIRADO → 401", async () => {
  jwtEndereco = null; jwtErro = "ERR_JWT_EXPIRED";
  const r = await cotasFn(pedido({ token: "tok" }));
  assert.equal(r.status, 401);
  assert.equal(upserts.length, 0);
});

// ── (c) TOKEN DE OUTRO ───────────────────────────────────────────────────────
test("A7 token de outro utilizador → 403 e NÃO grava", async () => {
  jwtEndereco = OUTRO;
  const r = await cotasFn(pedido({ token: "tok" }));
  assert.equal(r.status, 403);
  assert.equal((await r.json()).error.code, "endereco_nao_corresponde");
  assert.equal(upserts.length, 0);
  assert.equal(cotas.get(DONO).empresa, "Original");
});

test("A8 token de outro + cota INEXISTENTE → 403 (não 404)", async () => {
  jwtEndereco = OUTRO;
  const r = await cotasFn(pedido({ token: "tok", cliente_id: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" }));
  assert.equal(r.status, 403);
});

// ── ramo (b): cota vinculada por `endereco` ──────────────────────────────────
test("A9 cota com cliente_id 'cnpj:' MAS com endereco == JWT → 200 (ramo b do MC89.38)", async () => {
  semear({ id: CNPJ_ID, endereco: DONO, empresa: "Original" });
  const r = await cotasFn(pedido({ token: "tok", cliente_id: CNPJ_ID }));
  assert.equal(r.status, 200);
  assert.equal(upserts.length, 1);
  assert.equal(cotas.get(CNPJ_ID).empresa, "Nova Empresa");
});

test("A10 cota 'cnpj:' SEM endereco → 403 para o dono (consequência ACEITE, R18-2)", async () => {
  semear({ id: CNPJ_ID, endereco: null });
  jwtEndereco = DONO;
  const r = await cotasFn(pedido({ token: "tok", cliente_id: CNPJ_ID }));
  assert.equal(r.status, 403);
  assert.equal(upserts.length, 0);
});

test("A11 cota 'cnpj:' sem endereco → o ADMIN pode (excepção (c))", async () => {
  semear({ id: CNPJ_ID, endereco: null });
  admin = true;
  const r = await cotasFn(pedido({ token: "adm", cliente_id: CNPJ_ID }));
  assert.equal(r.status, 200);
  assert.equal(upserts.length, 1);
});

// ── (d) ADMIN ────────────────────────────────────────────────────────────────
test("A12 admin → 200 e grava (mesmo sem ser o dono)", async () => {
  admin = true;
  const r = await cotasFn(pedido({ token: "adm", cliente_id: DONO }));
  assert.equal(r.status, 200);
  assert.equal(upserts.length, 1);
});

// ── falha de leitura → fail-closed ───────────────────────────────────────────
test("A13 falha de leitura da cota → 502 (fail-closed, NÃO autoriza nem grava)", async () => {
  jwtEndereco = OUTRO;              // nem sequer é o dono
  getCotaRebenta = true;
  const r = await cotasFn(pedido({ token: "tok" }));
  assert.equal(r.status, 502);
  assert.equal(upserts.length, 0);
});

// ── A17/A18 — lacunas apontadas pelo validador adversarial (SEG3, F2/F3) ──────
test("A17 cota `cnpj:` com `endereco` em CAIXA MISTA (EIP-55) → 200 (normalização do lado da cota)", async () => {
  // F2: o `.toLowerCase()` aplicado ao `endereco` DA COTA não era exercido por nenhum teste.
  // Um payload legado com `endereco` em caixa mista faria o DONO LEGÍTIMO levar 403.
  const eip55 = "0xAaBbCcDdEeFf00112233445566778899AaBbCcDd";   // caixa mista, mesma carteira de DONO
  semear({ id: CNPJ_ID, endereco: eip55 });
  const r = await cotasFn(pedido({ token: "tok", cliente_id: CNPJ_ID }));
  assert.equal(r.status, 200, "o dono não pode ser bloqueado por causa da caixa do endereco da cota");
  assert.equal(upserts.length, 1);
});

test("A18 sem token E LEITURA EM FALHA → 401 (o 401 precede a leitura; não é oráculo do store)", async () => {
  // F3: nenhum teste fixava a ORDEM 401-antes-da-leitura. Se o 401 fosse movido para depois,
  // um anónimo com o store em baixo receberia 502 — revelando o estado do armazenamento.
  jwtEndereco = null;
  getCotaRebenta = true;
  const r = await cotasFn(pedido({}));
  assert.equal(r.status, 401, "anónimo tem de levar 401, mesmo com a leitura a falhar");
  assert.equal((await r.json()).error.code, "token_ausente");
  assert.equal(upserts.length, 0);
});

// ── integridade do que é escrito ─────────────────────────────────────────────
test("A14 campos protegidos (cnpj/tipo/categoria) NÃO são sobrescritos pelo body", async () => {
  const r = await cotasFn(pedido({ token: "tok", extra: { cnpj: "999", tipo: "pessoal", categoria: "diamante" } }));
  assert.equal(r.status, 200);
  const g = cotas.get(DONO);
  assert.equal(g.cnpj, "23040066000100");
  assert.equal(g.tipo, "corporativo");
  assert.equal(g.categoria, "prata");
});

test("A15 sem cliente_id no body → 400", async () => {
  // `null` (não `undefined`): em JS, `undefined` aciona o default do helper e enviaria o DONO.
  const r = await cotasFn(pedido({ token: "tok", cliente_id: null }));
  assert.equal(r.status, 400);
  assert.equal(upserts.length, 0);
});

test("A16 cota existe mas tipo NÃO é corporativo → 404 (para o dono)", async () => {
  semear({ endereco: null, tipo: "pessoal" });
  const r = await cotasFn(pedido({ token: "tok" }));
  assert.equal(r.status, 404);
  assert.equal(upserts.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTAÇÕES VALIDADAS (cada uma reposta → o teste indicado fica RED)
//   M1 remover o bloco 401 (anon) ....................................... A3, A4, A5, A6
//   M2 remover o 403 (aceitar qualquer autenticado) ..................... A7, A8, A10
//   M3 tratar admin como não-dono (remover a excepção (c)) .............. A11, A12
//   M4 remover o .toLowerCase() da guarda de posse ...................... A2
//      (⚠️ medido: eu tinha-o declarado EQUIVALENTE e não é — removê-lo faz o A2
//       dar 403 em vez do 404 pré-existente. Ambos os resultados RECUSAM o acesso;
//       a diferença é entre duas recusas. A previsão errada fica registada.)
//   M5 remover o ramo (b) (vínculo por `endereco`) ...................... A9
//   M6 engolir a falha de leitura e seguir (autorizar) .................. A13
//   M7 mover o 404 para antes do 401/403 ................................ A4, A8
//   M8 escrever os campos do body por cima da cota (não preservar) ...... A14
//   V6 remover o .toLowerCase() do `endereco` DA COTA (lacuna F2) ........ A17
//   V7 mover o 401 para DEPOIS da leitura (lacuna F3) ................... A18
// ─────────────────────────────────────────────────────────────────────────────

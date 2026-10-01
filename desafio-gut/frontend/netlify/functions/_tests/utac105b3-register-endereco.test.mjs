// UTAC105b.3 — POSSE DO `endereco` no `register-corporativo` (achado V-4 do UTAC105b.2).
//
//   node --test --experimental-test-module-mocks _tests/utac105b3-register-endereco.test.mjs
//
// O QUE ESTE FICHEIRO PROVA
//   Se o corpo traz `endereco`, exige-se Bearer do MESMO endereço (ou admin):
//     · anónimo com o `endereco` de terceiros → 401, sem escrever  (era o V-4)
//     · logado com token de OUTRO → 403, sem escrever               (o caso do spec)
//   E que NADA do que funcionava mudou:
//     · logado com o PRÓPRIO `endereco` → 201 (contrato MC12.3.1)
//     · SEM `endereco` (cadastro directo, o único caminho do frontend) → 201 cria `cnpj:…`
//     · admin → acesso total
//
// CONTEXTO DO DEFEITO (medido, `_logs/UTAC105b.3_SEG-1_MEDICAO.md` §-1.5): `clienteId` vinha do
// CORPO (`endereco ?? "cnpj:…"`) sem prova de posse. Um pedido ANÓNIMO com o `endereco` de outra
// pessoa criava ali uma cota corporativa (`empresa="INVASOR LTDA"`), e a fusão da activação
// (`_lib/cota-ativacao.mjs:41-47`, `{...existente}`) herdava esses dados.
//
// FIDELIDADE DOS DUPLOS (T3): só as fronteiras externas são duplicadas. O handler corre a sério.
import { test, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

const VITIMA   = "0x1111111111111111111111111111111111111111"; // terceiro (sem cota, no início)
const EU       = "0x2222222222222222222222222222222222222222";
const OUTRO    = "0x3333333333333333333333333333333333333333";
const VISIT    = "visitor-id-de-teste-1234567890";

function cnpjValido(base12) {
  const arr = base12.split("").map(Number);
  const calc = (a, len) => { let s = 0, pos = len - 7; for (let i = len; i >= 1; i--) { s += a[len - i] * pos--; if (pos < 2) pos = 9; } return s % 11 < 2 ? 0 : 11 - (s % 11); };
  const d1 = calc(arr, 12), d2 = calc([...arr, d1], 13);
  return base12 + d1 + d2;
}
const CNPJ_A = cnpjValido("444555660001");
const CNPJ_B = cnpjValido("777888990001");
const CNPJ_C = cnpjValido("123123120001");

const cotas = new Map();
let escritas = [], jwtEndereco = null, admin = false, getCotaRebenta = false;
const semear = (extra) => { cotas.clear(); escritas = []; if (extra) cotas.set(extra.cliente_id, extra); };
const cotaDaVitima = () => JSON.stringify(cotas.get(VITIMA));

mock.module("../_lib/cotas-store.mjs", { namedExports: {
  getCota: async (id) => { if (getCotaRebenta) throw new Error("store em baixo (simulado)"); const c = cotas.get(String(id)); return c ? { ...c, endereco: c.endereco ?? null } : null; },
  getCotaByCnpj: async (cnpj) => [...cotas.values()].find((c) => String(c.cnpj) === String(cnpj)) ?? null,
  getCotaByEmail: async () => null,
  upsertCota: async (id, reg) => { escritas.push(String(id)); cotas.set(String(id), { ...reg, endereco: reg?.endereco ?? null }); },
  deleteCota: async () => {}, listarCategoria: async () => [], resumoCotas: async () => ({}),
  getFingerprint: async () => null, setFingerprint: async () => {},
  getCotaPaga: async () => null, setCotaPaga: async () => {},
} });
mock.module("../_lib/jwt.mjs", { namedExports: {
  verificarUserSession: async () => { if (!jwtEndereco) { const e = new Error("jwt"); e.code = "ERR_JWT_INVALID"; throw e; } return { endereco: jwtEndereco, tipo: "user-session" }; },
  assinarUserSession: async () => "t", verificarLanceAuth: async () => ({ endereco: jwtEndereco }),
} });
mock.module("../_lib/admin-auth.mjs", { namedExports: {
  autenticarAdmin: async () => (admin ? { ok: true, endereco: null } : { ok: false }),
  guardAdmin: async () => (admin ? null : new Response("{}", { status: 401 })),
} });
mock.module("../_lib/admin-helpers.mjs", { namedExports: { getAdminAddresses: async () => [] } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/troco-senhas.mjs", { namedExports: { creditarTroco: async () => ({ ok: true, senhas: 0 }), senhasDoExcedente: () => 0, TROCO_VALIDADE_DIAS: 30 } });
const blobs = new Map();
mock.module("@netlify/blobs", { namedExports: { getStore: ({ name }) => {
  if (!blobs.has(name)) blobs.set(name, new Map());
  const m = blobs.get(name);
  return { async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
           async setJSON(k, o) { m.set(k, JSON.stringify(o)); }, async set(k, v) { m.set(k, v); },
           async list() { return { blobs: [...m.keys()].map((key) => ({ key })) }; }, async delete(k) { m.delete(k); } };
} } });

const { default: cotasFn } = await import("../cotas.mjs");

beforeEach(() => { jwtEndereco = null; admin = false; getCotaRebenta = false; });

async function chamar(corpo, { token = null, ehAdmin = false, visitor = VISIT } = {}) {
  escritas = []; jwtEndereco = token; admin = ehAdmin;
  const h = { "content-type": "application/json" };
  if (visitor) h["x-visitor-id"] = visitor;
  if (token) h.authorization = "Bearer tok";
  const r = await cotasFn(new Request("https://x/.netlify/functions/cotas?action=register-corporativo",
                                      { method: "POST", headers: h, body: JSON.stringify(corpo) }));
  let j = {}; try { j = await r.json(); } catch {}
  return { status: r.status, escreveu: escritas.length > 0, clienteId: escritas[0] ?? null, code: j?.error?.code ?? null };
}
const CAD = { cnpj: CNPJ_B, empresa: "Empresa Nova", segmento: "Varejo", email: "novo@x.com" };

// ── O DEFEITO V-4: `endereco` de terceiros sem prova de posse ─────────────────
test("E1 [V-4] anónimo com `endereco` DE TERCEIROS (sem cota) → 401 e NÃO cria", async () => {
  semear();
  const r = await chamar({ endereco: VITIMA, cnpj: CNPJ_A, empresa: "INVASOR LTDA", email: "a@x.com" });
  assert.equal(r.status, 401);
  assert.equal(r.code, "token_ausente");
  assert.equal(r.escreveu, false, "não pode ter criado nada");
  assert.equal(cotas.get(VITIMA), undefined, "não pode existir cota no endereço de terceiros");
});

test("E2 [V-4] anónimo com `endereco` de terceiros QUE JÁ TEM cota → 401 e cota intacta", async () => {
  semear({ cliente_id: VITIMA, tipo: "corporativo", empresa: "LOJA DA VITIMA", endereco: VITIMA,
           cnpj: CNPJ_C, email: "v@loja.com", categoria: "ouro", vendida: true, valor: 55000 });
  const antes = cotaDaVitima();
  const r = await chamar({ endereco: VITIMA, cnpj: CNPJ_A, empresa: "INVASOR", email: "a@x.com" });
  assert.equal(r.status, 401);
  assert.equal(r.escreveu, false);
  assert.equal(cotaDaVitima(), antes);
});

test("E3 [V-4] LOGADO com token de OUTRO + `endereco` de terceiros → 403 e NÃO escreve", async () => {
  // é o «erro esperado se ambíguo» previsto nas notas de arranque do spec
  semear();
  const r = await chamar({ endereco: VITIMA, ...CAD }, { token: OUTRO });
  assert.equal(r.status, 403);
  assert.equal(r.code, "endereco_nao_corresponde");
  assert.equal(r.escreveu, false);
  assert.equal(cotas.get(VITIMA), undefined);
});

// ── O QUE NÃO PODE MUDAR ─────────────────────────────────────────────────────
test("E4 logado com o PRÓPRIO `endereco` + token → 201 (contrato MC12.3.1 preservado)", async () => {
  semear();
  const r = await chamar({ endereco: EU, ...CAD }, { token: EU });
  assert.equal(r.status, 201);
  assert.equal(r.clienteId, EU);
});

test("E5 SEM `endereco` (cadastro directo — o único caminho do frontend) → 201 cria `cnpj:`", async () => {
  semear();
  const r = await chamar(CAD);
  assert.equal(r.status, 201, "o cadastro legítimo não pode quebrar");
  assert.equal(r.clienteId, `cnpj:${CNPJ_B}`);
});

test("E6 admin + `endereco` de terceiros → 201 (acesso total)", async () => {
  semear();
  const r = await chamar({ endereco: VITIMA, ...CAD }, { ehAdmin: true });
  assert.equal(r.status, 201);
  assert.equal(r.escreveu, true);
});

// ── FRONTEIRAS ───────────────────────────────────────────────────────────────
test("E7 `endereco` com formato inválido → 400 (o formato é validado ANTES da posse)", async () => {
  for (const mau of ["nao-e-endereco", "0x123", `${VITIMA} `, 12345, [VITIMA]]) {
    semear();
    const r = await chamar({ endereco: mau, ...CAD });
    assert.equal(r.status, 400, `endereco=${JSON.stringify(mau)} devia dar 400`);
    assert.equal(r.escreveu, false);
  }
});

test("E8 sem token E leitura do store em falha + `endereco` de terceiros → 401 (não 502, nem oráculo)", async () => {
  semear(); getCotaRebenta = true;
  const r = await chamar({ endereco: VITIMA, ...CAD });
  getCotaRebenta = false;
  assert.equal(r.status, 401, "a posse do endereco é decidida antes de tocar no store");
  assert.equal(r.escreveu, false);
});

test("E9 `cliente_id` no corpo é IGNORADO por este ramo (não se aponta para a vítima)", async () => {
  semear({ cliente_id: VITIMA, tipo: "corporativo", empresa: "LOJA DA VITIMA", endereco: VITIMA,
           cnpj: CNPJ_C, email: "v@loja.com", categoria: "ouro", vendida: true, valor: 55000 });
  const antes = cotaDaVitima();
  // atacante logado no SEU endereço a tentar mirar a vítima pelo `cliente_id` do corpo
  const r = await chamar({ cliente_id: VITIMA, endereco: EU, ...CAD, cnpj: CNPJ_A }, { token: EU });
  assert.equal(r.status, 201);
  assert.equal(r.clienteId, EU, "o ramo decide pelo `endereco`, não pelo `cliente_id`");
  assert.equal(cotaDaVitima(), antes, "a cota da vítima fica intacta");
});

test("E10 `endereco` próprio em CAIXA MISTA + token → 201 (normalização não bloqueia o dono)", async () => {
  semear();
  const misto = "0x2222222222222222222222222222222222222222".toUpperCase().replace("0X", "0x");
  const r = await chamar({ endereco: misto, ...CAD }, { token: EU });
  assert.equal(r.status, 201);
  assert.equal(r.clienteId, EU);
});

test("E11 token inválido/expirado + `endereco` de terceiros → 401 e NÃO escreve", async () => {
  semear();
  const r = await chamar({ endereco: VITIMA, ...CAD }, { token: null });
  assert.equal(r.status, 401);
  assert.equal(r.escreveu, false);
});

// ── LISTA DE MUTAÇÕES (T1) — cada mutante tem de pôr os testes indicados RED ─
//   Medido com `tmp-utac105b3/mut-utac105b3.mjs`. A coluna MORTOS é o conjunto COMPLETO observado.
//   ⚠️ Revisão pós-validador (achado ℹ️-2 do SEG3): o mapa anterior estava errado — dizia que MB5
//   matava E10 (não mata: é equivalente) e omitia o MC1; e a enumeração de mortos era só a
//   INTERSECÇÃO com o esperado, o que sub-relatava (MB1 mata também E8/E11, como agora se vê).
//   MB1 remover a guarda da posse do `endereco` ............... MORTOS: E1, E3, E8, E11
//   MC1 tirar as DUAS guardas (V-4 e a do b.2) ................ MORTOS: E1, E2, E3, E8, E11
//   MB2 `papel === "anon"` → `false` (anónimo tratado como user) MORTOS: E1, E2, E8, E11
//   MB3 remover a isenção do admin ........................... MORTOS: E6
//   MB4 `ehDonoDoEndereco` sempre `true` (aceita qualquer token) MORTOS: E1, E3, E8, E11
//   MB5 [EQUIVALENTE] sem `.toLowerCase()` no `endereco` do corpo — sobrevive: `validarEndereco`
//       (`_lib/validate.mjs`) JÁ devolve minúsculas, logo é defesa inalcançável. Declarado, não fingido.
//   ME1 [EQUIVALENTE] sem o `!!chamadorReg.endereco &&` — sobrevive: `null === x` já é `false`.
//   E2 não morre em MB1/MB2/MB4 por si só: a guarda do UTAC105b.2 (cota já existente) também a recusa
//   (defesa em profundidade) — só o mutante COMBINADO MC1 a mata. E8/E11 morrem em qualquer mutante
//   que remova a guarda, porque é ela que garante o 401 ANTES de se chegar ao store.

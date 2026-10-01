// UTAC105b.2 — P0 do `register-corporativo` + Frente C (POST genérico preserva `endereco`).
//
//   node --test --experimental-test-module-mocks _tests/utac105b2-register.test.mjs
//
// O QUE ESTE FICHEIRO PROVA
//   Frente A/B — um pedido SEM prova de posse NUNCA sobrescreve uma cota existente
//                (401 anónimo · 403 utilizador), e o cadastro legítimo de cota NOVA
//                continua a funcionar (incl. o cadastro directo `cnpj:`, sem endereço).
//   Frente C   — o POST genérico de admin preserva a coluna `endereco`.
//
// CONTEXTO DO DEFEITO (medido, `_logs/UTAC105b.2_SEG-1_MEDICAO.md`)
//   `cotas.mjs` decidia o `clienteId` a partir do CORPO (`endereco ?? "cnpj:…"`, l.396) e
//   escrevia sempre com `upsertCota` (l.442) um registo COMPLETO que fixava
//   `categoria:null, vendida:false, valor:0`. Um pedido anónimo com o `endereco` (ou o
//   CNPJ) de outra pessoa devolvia 201 e DESTRUÍA a cota dela — medido no PoC:
//   `empresa="LOJA DA VITIMA" cat=ouro vendida=true valor=55000` → `"INVASOR" cat=null
//   vendida=false valor=0`.
//
// FIDELIDADE DOS DUPLOS (T3): só as fronteiras externas são duplicadas (o store, o JWT,
// o admin-auth, o rate-limit e o @netlify/blobs). O handler `cotas.mjs` corre a sério.
// O `upsertCota` duplicado substitui o registo inteiro — é o que a `colunas()` real faz
// (`payload: registro`, cotas-store.mjs:34).
import { test, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

const DONO = "0xaabbccddeeff00112233445566778899aabbccdd";   // vítima (cota paga)
const OUTRO = "0x1111111111111111111111111111111111111111"; // utilizador autenticado alheio
const VISIT = "visitor-id-de-teste-1234567890";

// CNPJ válido (mesmo algoritmo do `validarCNPJ` do cotas.mjs). Bases SINTÉTICAS.
function cnpjValido(base12) {
  const arr = base12.split("").map(Number);
  const calc = (a, len) => { let s = 0, pos = len - 7; for (let i = len; i >= 1; i--) { s += a[len - i] * pos--; if (pos < 2) pos = 9; } return s % 11 < 2 ? 0 : 11 - (s % 11); };
  const d1 = calc(arr, 12), d2 = calc([...arr, d1], 13);
  return base12 + d1 + d2;
}
const CNPJ_VITIMA   = cnpjValido("111222330001");
const CNPJ_ATACANTE = cnpjValido("444555660001");
const CNPJ_NOVO     = cnpjValido("777888990001");
const CNPJ_OUTRO    = cnpjValido("123123120001");

const cotas = new Map();
let escritas = [];
let jwtEndereco = null, admin = false, getCotaRebenta = false;

function cotaVitima() {
  // ⚠️ seed COMPLETO: inclui todos os campos do payload corporativo. Sem eles, medir
  // «o campo sobreviveu?» daria falso (o campo nunca existiu) — defeito de instrumento
  // que eu já tinha cometido no PoC (FC2 dizia «DESAPARECEU» o que o seed não tinha).
  return { cliente_id: DONO, tipo: "corporativo", empresa: "LOJA DA VITIMA", endereco: DONO,
           cnpj: CNPJ_VITIMA, email: "vitima@loja.com", segmento: "Varejo",
           site: "https://loja.example", logoUrl: "https://loja.example/logo.png",
           origem: "autenticado", cadastradoEm: "2026-01-15T10:00:00.000Z",
           categoria: "ouro", vendida: true, disponivel: false, valor: 55000, pedidoId: "ped-123" };
}
function semear(extra) {
  cotas.clear(); escritas = [];
  cotas.set(DONO, cotaVitima());
  if (extra) cotas.set(extra.cliente_id, extra);
}
const estadoVitima = () => JSON.stringify(cotas.get(DONO));

mock.module("../_lib/cotas-store.mjs", { namedExports: {
  getCota: async (id) => {
    if (getCotaRebenta) throw new Error("store em baixo (simulado)");
    const c = cotas.get(String(id));
    // a coluna `endereco` é gravada por colunas(); getCota devolve o payload.
    return c ? { ...c, endereco: c.endereco ?? null } : null;
  },
  getCotaByCnpj: async (cnpj) => [...cotas.values()].find((c) => String(c.cnpj) === String(cnpj)) ?? null,
  getCotaByEmail: async () => null,
  // substitui o registo inteiro — fiel à colunas() real (`payload: registro`)
  upsertCota: async (id, reg) => { escritas.push(String(id)); cotas.set(String(id), { ...reg, endereco: reg?.endereco ?? null }); },
  deleteCota: async () => {}, listarCategoria: async () => [], resumoCotas: async () => ({}),
  getFingerprint: async () => null, setFingerprint: async () => {},
  getCotaPaga: async () => null, setCotaPaga: async () => {},
} });
mock.module("../_lib/jwt.mjs", { namedExports: {
  verificarUserSession: async () => {
    if (!jwtEndereco) { const e = new Error("jwt"); e.code = "ERR_JWT_INVALID"; throw e; }
    return { endereco: jwtEndereco, tipo: "user-session" };
  },
  assinarUserSession: async () => "t", verificarLanceAuth: async () => ({ endereco: jwtEndereco }),
} });
mock.module("../_lib/admin-auth.mjs", { namedExports: {
  autenticarAdmin: async () => (admin ? { ok: true, endereco: null } : { ok: false }),
  guardAdmin: async () => (admin ? null : new Response("{}", { status: 401 })),
} });
mock.module("../_lib/admin-helpers.mjs", { namedExports: { getAdminAddresses: async () => [] } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
// fronteira do troco (grava no Supabase — fora do escopo deste UTAC; duplicada por inteiro):
// `Number(null)` é 0, logo o POST genérico com `valor` ausente entra no cálculo de troco.
mock.module("../_lib/troco-senhas.mjs", { namedExports: {
  creditarTroco: async () => ({ ok: true, senhas: 0 }),
  senhasDoExcedente: () => 0,
  TROCO_VALIDADE_DIAS: 30,
} });
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

async function chamar(corpo, { token = null, ehAdmin = false, visitor = VISIT, acao = "register-corporativo" } = {}) {
  jwtEndereco = token; admin = ehAdmin;
  const h = { "content-type": "application/json" };
  if (acao === "register-corporativo" && visitor) h["x-visitor-id"] = visitor;   // visitor:null → header ausente
  if (token) h.authorization = "Bearer tok";
  const url = acao ? `https://x/.netlify/functions/cotas?action=${acao}` : "https://x/.netlify/functions/cotas";
  const r = await cotasFn(new Request(url, { method: "POST", headers: h, body: JSON.stringify(corpo) }));
  let j = {}; try { j = await r.json(); } catch {}
  return { status: r.status, escreveu: escritas.length > 0, clienteId: escritas[0] ?? null, corpo: j };
}
const CADASTRO = { cnpj: CNPJ_NOVO, empresa: "Empresa Nova", segmento: "Varejo", email: "novo@x.com" };

// ── FRENTE A/B — posse do `cliente_id` ───────────────────────────────────────
test("B1 anónimo passa o `endereco` DA VÍTIMA → 401 e NÃO sobrescreve", async () => {
  semear();
  const antes = estadoVitima();
  const r = await chamar({ endereco: DONO, ...CADASTRO, cnpj: CNPJ_ATACANTE });
  assert.equal(r.status, 401);
  assert.equal(r.corpo.error.code, "token_ausente");
  assert.equal(r.escreveu, false, "não pode ter escrito");
  assert.equal(estadoVitima(), antes, "a cota da vítima tem de ficar intacta");
});

test("B2 anónimo com o `endereco` E o CNPJ da vítima → 401 e NÃO sobrescreve", async () => {
  semear();
  const antes = estadoVitima();
  const r = await chamar({ endereco: DONO, ...CADASTRO, cnpj: CNPJ_VITIMA });
  assert.equal(r.status, 401);
  assert.equal(r.escreveu, false);
  assert.equal(estadoVitima(), antes);
});

test("B3 CADASTRO LEGÍTIMO: anónimo, cota NOVA (cadastro directo) → 201 e CRIA", async () => {
  semear();
  const r = await chamar(CADASTRO);                     // sem endereco → cliente_id "cnpj:…"
  assert.equal(r.status, 201, "o fluxo legítimo NÃO pode ser quebrado (P10)");
  assert.equal(r.escreveu, true);
  assert.equal(r.clienteId, `cnpj:${CNPJ_NOVO}`);
  assert.equal(cotas.get(`cnpj:${CNPJ_NOVO}`).empresa, "Empresa Nova");
});

test("B4 dono legítimo (JWT == cliente_id, cota existente) → 201 (AUTORIZADO)", async () => {
  semear();
  const r = await chamar({ endereco: DONO, ...CADASTRO }, { token: DONO });
  assert.equal(r.status, 201, "o dono comprovado tem de poder registar (prova de posse)");
  // ⚠️ V-6 (validador do SEG3): este teste assertava `escreveu: true` SEM olhar ao estado
  // final — ou seja, aplaudia uma escrita que destrói a cota paga do próprio dono. Isso é o
  // DEFEITO V-1, caracterizado (e escalado) no B13. Aqui só se mede a AUTORIZAÇÃO.
});

test("B5 ramo (b): cota `cnpj:` com `endereco` == JWT → 201 (vinculado)", async () => {
  // ⚠️ semeia SÓ esta cota: com a cota da vítima (mesmo CNPJ) também no mapa, o
  // anti-duplicidade (MC12.3) dispararia 409 e mascararia o ramo (b) — defeito que eu
  // tinha no teste (medido: 409 !== 201).
  cotas.clear(); escritas = [];
  cotas.set(`cnpj:${CNPJ_VITIMA}`, { cliente_id: `cnpj:${CNPJ_VITIMA}`, tipo: "corporativo", empresa: "E",
             endereco: DONO, cnpj: CNPJ_VITIMA, categoria: null, vendida: false, valor: 0 });
  const r = await chamar({ cnpj: CNPJ_VITIMA, empresa: "E2" }, { token: DONO });
  assert.equal(r.status, 201, "dono da cota vinculada tem de poder registar");
});

test("B6 admin → 201 (excepção (c) do MC89.38)", async () => {
  semear();
  const r = await chamar({ endereco: DONO, ...CADASTRO }, { ehAdmin: true });
  assert.equal(r.status, 201);
  assert.equal(r.escreveu, true);
});

test("B7 utilizador autenticado NÃO dono, cota existente → 403 e NÃO sobrescreve", async () => {
  semear();
  const antes = estadoVitima();
  const r = await chamar({ endereco: DONO, ...CADASTRO }, { token: OUTRO });
  assert.equal(r.status, 403);
  assert.equal(r.corpo.error.code, "endereco_nao_corresponde");
  assert.equal(r.escreveu, false);
  assert.equal(estadoVitima(), antes);
});

test("B8 cota `cnpj:` existente SEM `endereco` + anónimo → 401 (não sobrescreve)", async () => {
  // era este o caso que destruía a cota de quem se registou pelo cadastro directo.
  const id = `cnpj:${CNPJ_VITIMA}`;
  cotas.clear(); escritas = [];   // só esta cota (senão o 409 do CNPJ duplicado entraria primeiro)
  cotas.set(id, { cliente_id: id, tipo: "corporativo", empresa: "LOJA DIRECTA", endereco: null,
                  cnpj: CNPJ_VITIMA, categoria: "ouro", vendida: true, valor: 55000 });
  const antes = JSON.stringify(cotas.get(id));
  const r = await chamar({ cnpj: CNPJ_VITIMA, empresa: "INVASOR", email: "i@x.com" });
  assert.equal(r.status, 401);
  assert.equal(r.escreveu, false);
  assert.equal(JSON.stringify(cotas.get(id)), antes);
});

test("B9 falha de leitura do store → 502 fail-closed (não autoriza NEM escreve)", async () => {
  semear();
  getCotaRebenta = true;
  const r = await chamar(CADASTRO);
  assert.equal(r.status, 502);
  assert.equal(r.corpo.error.code, "store_indisponivel");
  assert.equal(r.escreveu, false);
});

test("B10 repetição do MESMO registo por anónimo → 401 e NÃO escreve (nem 200 nem 201)", async () => {
  // Decisão declarada (SEG-1 §-1.7): devolver 200 exigiria ou escrever (destruir) ou
  // devolver o registo existente a um anónimo — o que o MC87 (P0-1) proíbe.
  semear();
  const r = await chamar(CADASTRO);
  assert.equal(r.status, 201);                              // 1.º: cria
  assert.equal(r.escreveu, true);
  escritas = [];                                            // ⚠️ limpava o flag do 1.º caso
  const r2 = await chamar(CADASTRO);                        // 2.º: repete
  assert.equal(r2.status, 401);
  assert.equal(r2.escreveu, false);
});

test("B11 anti-duplicidade (MC12.3) intacta: CNPJ existente noutro cliente_id → 409", async () => {
  semear();
  const r = await chamar({ cnpj: CNPJ_VITIMA, empresa: "Outra", email: "o@x.com" });
  assert.equal(r.status, 409, "o CNPJ da vítima está noutro cliente_id → duplicidade");
  assert.equal(r.corpo.error.code, "cnpj_duplicado");
  assert.equal(r.escreveu, false);
});

test("B12 cota NOVA com `endereco` do próprio chamador autenticado → 201", async () => {
  semear();
  const r = await chamar({ endereco: OUTRO, ...CADASTRO, cnpj: CNPJ_OUTRO }, { token: OUTRO });
  assert.equal(r.status, 201);
  assert.equal(r.clienteId, OUTRO);
});

test("B13 [V-1 CORRIGIDO] o dono comprovado a repetir PRESERVA a cota paga", async () => {
  // O validador do SEG3 mediu (⚠️ V-1) que o DONO COMPROVADO a repetir o registo destruía a
  // própria cota paga (`ouro/vendida:true/55000` → `null/false/0`). Corrigido por decisão do
  // operador (R18-3) com o tratamento proposto pelo validador: os campos de PAGAMENTO são
  // preservados quando a cota já existe; só se inicializam na CRIAÇÃO.
  // ⚠️ Antes desta correcção este teste caracterizava o DEFEITO (assertava `categoria:null`
  // etc.). Era o que o SEG3 criticava em V-6 («um teste que aplaude a escrita destructiva»).
  semear();
  const r = await chamar({ endereco: DONO, ...CADASTRO }, { token: DONO });
  assert.equal(r.status, 201);
  const c = cotas.get(DONO);
  assert.equal(c.categoria, "ouro",  "V-1: a categoria paga tem de sobreviver");
  assert.equal(c.vendida, true,      "V-1: o estado 'vendida' tem de sobreviver");
  assert.equal(c.valor, 55000,       "V-1: o valor pago tem de sobreviver");
  assert.equal(c.empresa, "Empresa Nova", "os campos de PERFIL são actualizados (é um registo)");
});

test("B14 [V-1] cota NOVA continua a nascer com os defaults de pagamento", async () => {
  semear();
  const r = await chamar(CADASTRO);                     // cadastro directo, cota nova
  assert.equal(r.status, 201);
  const c = cotas.get(`cnpj:${CNPJ_NOVO}`);
  assert.deepEqual([c.categoria, c.vendida, c.disponivel, c.valor], [null, false, false, 0],
                   "cota nova tem de nascer sem pagamento (a preservação é só para cotas existentes)");
});

// ── FRENTE C — o POST genérico preserva `endereco` ───────────────────────────
test("C1 POST genérico de admin sobre cota COM `endereco` → PRESERVA a coluna", async () => {
  semear();
  const r = await chamar({ cliente_id: DONO, categoria: "prata", vendida: true, disponivel: false, valor: 55000 },
                         { ehAdmin: true, acao: "" });
  assert.equal(r.status, 200);
  assert.equal(cotas.get(DONO).endereco, DONO, "o `endereco` não pode ser apagado");
});

test("C2 POST genérico de admin sobre cota NOVA → `endereco: null`", async () => {
  cotas.clear(); escritas = [];
  const novo = "0x2222222222222222222222222222222222222222";
  const r = await chamar({ cliente_id: novo, categoria: "bronze", vendida: false, valor: null },
                         { ehAdmin: true, acao: "" });
  // 201 para cota NOVA (200 só quando já existia — é o que o C1 mede). Eu tinha
  // escrito 200 aqui: expectativa INVENTADA, corrigida para o que o código faz.
  assert.equal(r.status, 201);
  assert.equal(cotas.get(novo).endereco, null);
});

// ── FRONTEIRAS (V-5) — casos que o SEG3 mediu como fail-closed mas NÃO tinham teste ──
const UPPER = DONO.toUpperCase().replace("0X", "0x");

test("F1 `endereco` da vítima em CAIXA MISTA (anónimo) → 401, sem escrita", async () => {
  semear(); const antes = estadoVitima();
  const r = await chamar({ endereco: "0xAaBbCcDdEeFf00112233445566778899AaBbCcDd", ...CADASTRO, cnpj: CNPJ_ATACANTE });
  assert.equal(r.status, 401); assert.equal(r.escreveu, false); assert.equal(estadoVitima(), antes);
});

test("F2 `endereco` com ESPAÇOS → 400 `endereco_invalido`, sem escrita", async () => {
  semear(); const antes = estadoVitima();
  const r = await chamar({ endereco: ` ${DONO} `, ...CADASTRO });
  assert.equal(r.status, 400); assert.equal(r.corpo.error.code, "endereco_invalido");
  assert.equal(r.escreveu, false); assert.equal(estadoVitima(), antes);
});

test("F3 `endereco` com `%20` literal → 400, sem escrita", async () => {
  semear();
  const r = await chamar({ endereco: "0xaabb%20ccdd", ...CADASTRO });
  assert.equal(r.status, 400); assert.equal(r.escreveu, false);
});

test("F4 `endereco` como array/objecto/número/booleano → 400 nos 4, sem escrita", async () => {
  for (const mau of [[DONO], { endereco: DONO }, 12345, true]) {
    semear();
    const r = await chamar({ endereco: mau, ...CADASTRO });
    assert.equal(r.status, 400, `endereco=${JSON.stringify(mau)} devia dar 400`);
    assert.equal(r.escreveu, false);
  }
});

test("F5 esquemas de `Authorization` (bearer/BEARER/'Bearer  '/Token/sem esquema) → 401 nos 5", async () => {
  for (const h of ["bearer tok", "BEARER tok", "Bearer  tok", "Token tok", "tok"]) {
    semear();
    const r = await chamar({ endereco: DONO, ...CADASTRO }, { headerAuth: h });
    assert.equal(r.status, 401, `Authorization=${JSON.stringify(h)} devia degradar para anónimo`);
    assert.equal(r.escreveu, false);
  }
});

test("F6 sem `X-Visitor-ID` → 400 `visitor_id_obrigatorio`, sem escrita", async () => {
  semear();
  const r = await chamar({ endereco: DONO, ...CADASTRO }, { visitor: null });
  assert.equal(r.status, 400); assert.equal(r.corpo.error.code, "visitor_id_obrigatorio");
  assert.equal(r.escreveu, false);
});

test("F7 `__proto__`/`constructor` no corpo → cota intacta e sem poluição de protótipo", async () => {
  semear(); const antes = estadoVitima();
  const r = await chamar(JSON.parse(`{"endereco":"${DONO}","cnpj":"${CNPJ_ATACANTE}","empresa":"X","__proto__":{"poluido":1},"constructor":{"x":1}}`));
  assert.equal(r.status, 401);
  assert.equal(r.escreveu, false); assert.equal(estadoVitima(), antes);
  assert.equal(({}).poluido, undefined, "não pode haver poluição de Object.prototype");
});

test("F8 [MS2] cota com `endereco` em MAIÚSCULAS + JWT minúsculo → 201 (normalização do lado da cota)", async () => {
  // mata o mutante MS2 (sobrevivente apontado pelo SEG3, §4.3): sem o `.toLowerCase()` do
  // `endereco` DA COTA, o dono de uma cota com payload legado em caixa mista levaria 403.
  const id = `cnpj:${CNPJ_VITIMA}`;
  cotas.clear(); escritas = [];
  cotas.set(id, { cliente_id: id, tipo: "corporativo", empresa: "E", endereco: UPPER,
                  cnpj: CNPJ_VITIMA, categoria: null, vendida: false, valor: 0 });
  const r = await chamar({ cnpj: CNPJ_VITIMA, empresa: "E2" }, { token: DONO });
  assert.equal(r.status, 201, "a caixa do endereço guardado não pode bloquear o dono");
});

test("C3 [V-2 CORRIGIDO] após o POST genérico, o payload corporativo sobrevive e o dono continua a editar", async () => {
  // O validador do SEG3 mediu (⚠️ V-2): o POST genérico apagava `tipo`, e como o
  // `update-corporativo` exige `tipo === "corporativo"`, o DONO passava a levar **404**.
  // Corrigido por decisão do operador (R18-3): o registo passa a ser o existente com os
  // campos da operação sobrepostos (`...(existente ?? {})`).
  semear();
  let r = await chamar({ cliente_id: DONO, categoria: "prata", vendida: true, disponivel: false, valor: 55000 },
                       { ehAdmin: true, acao: "" });
  assert.equal(r.status, 200);
  const c = cotas.get(DONO);
  assert.equal(c.tipo, "corporativo", "V-2: o `tipo` não pode ser destruído pelo POST genérico");
  assert.equal(c.empresa, "LOJA DA VITIMA", "V-2: a empresa corporativa não pode desaparecer");
  assert.equal(c.endereco, DONO, "Frente C: o `endereco` é preservado");
  // o payload todo tem de sobreviver (V-2/F-1): antes só sobreviviam os campos do lance
  assert.deepEqual([c.segmento, c.site, c.logoUrl, c.origem, c.cadastradoEm, c.pedidoId, c.email],
                   ["Varejo", "https://loja.example", "https://loja.example/logo.png", "autenticado",
                    "2026-01-15T10:00:00.000Z", "ped-123", "vitima@loja.com"],
                   "⚠️ V-2: o resto do payload corporativo tem de sobreviver ao POST genérico");
  escritas = [];
  r = await chamar({ cliente_id: DONO, empresa: "Loja Renovada" }, { token: DONO, acao: "update-corporativo" });
  assert.equal(r.status, 200, "V-2: o dono não pode passar a levar 404 por causa do POST genérico");
  assert.equal(cotas.get(DONO).empresa, "Loja Renovada");
});

// ── LISTA DE MUTAÇÕES (T1) — cada uma tem de pôr o teste indicado RED ────────
//   MA1 remover o bloco da guarda de posse ................... B1, B2, B7, B8, B10
//   MA2 `papel === "anon"` → `false` (anónimo tratado como utilizador) ... B1, B2, B8
//   MA3 remover a excepção do admin ......................... B6
//   MA4 remover o ramo (b) `vinculado` ...................... B5
//   MA5 leitura do store engolida (fail-open) ............... B9
//   MA6 Frente C: não preservar `endereco` .................. C1
//   MS2 sem `.toLowerCase()` no `endereco` DA COTA .......... F8
//   MV1 registo volta a fixar os campos de pagamento a null/false/0 (V-1) ... B13
//   MV2 registo do POST genérico volta a ser reconstruído de zero (V-2/F-1) .. C3
//
// ⚠️ MUTANTES EQUIVALENTES (declarados, medidos pelo SEG3 §4.3 — nenhum teste os pode matar):
//   MS1 `String(clienteId).toLowerCase()` na guarda — no-op: `validarEndereco` já devolve
//       o `endereco` do corpo em minúsculas, e o ramo `cnpj:` é só dígitos.
//   MS3 `getCota(String(clienteId))` — no-op: `clienteId` já é string nos dois ramos.
//   São defesa-em-profundidade: ficam (não estorvam e protegem se `validarEndereco` mudar),
//   mas NÃO se declara cobertura que não existe.

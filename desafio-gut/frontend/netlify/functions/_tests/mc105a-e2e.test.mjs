// MC105a Frentes B+C — `comprar-passe` pelo HANDLER REAL, com o `_lib/saldoRs.mjs` REAL (CAS do débito, reembolso),
// o `_lib/passe.mjs` real, JWT real (jose), rate-limit/kill-switch/edições/catálogo reais sobre Blobs em duplo.
// Só se trocam os módulos de I/O: `@netlify/blobs` (duplo com ETag, _blobs-cas-duplo.mjs) e o cliente Supabase
// (duplo fiel, _supabase-duplo-mc105a.mjs, com `saldo_rs*` e `passes`); o Sentry é espiado.
// node --test --experimental-test-module-mocks _tests/mc105a-e2e.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-mc105a-com-comprimento-suficiente";
let B = criarBlobs(), S = criarSupabase();
const alertas = [];
mock.module("@netlify/blobs", { namedExports: { getStore: (o) => B.getStore(o) } });
mock.module("../_lib/supabase-client.mjs", { namedExports: { getSupabase: () => S.cliente, getSupabaseReadOnly: () => S.cliente, supabaseConfigurado: () => true } });
mock.module("../_lib/sentry-server.mjs", { namedExports: { captureSecurityAlert: async (k, p) => { alertas.push([k, p]); }, Sentry: {} } });
const { default: handler } = await import("../comprar-passe.mjs");
const { assinarUserSession, assinarLanceAuth } = await import("../_lib/jwt.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OUTRO = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const ED = "PROG-7", PROD = "11111111-2222-3333-4444-555555555555";
const LOJISTA = "0xcccccccccccccccccccccccccccccccccccccccc", CUPOM_ID = "aaaaaaaa-0000-4000-8000-000000000010";
const hora = (h) => new Date(Date.now() + h * 3600_000).toISOString();

function semear({ saldo = 500, tipo = "programado", status = "aberto", inicio = -1, fim = 1, produtoStatus = "ativo", produtoId = PROD } = {}) {
  B = criarBlobs(); S = criarSupabase(); alertas.length = 0;
  B.gravar("edicoes-metadata", ED, { id: ED, tipo, status, inicio_em: hora(inicio), termino_em: hora(fim), produtoId });
  // UTAC105b: o produto tem lojista com 1 cupom activo (sem cupons a compra dá 409 — R18-C; testado em utac105b-ligacao).
  B.gravar("produtos", `produto:${PROD}`, { id: PROD, status: produtoStatus, nome: "Air Fryer", lojista: LOJISTA });
  S.tabelas.cupons.push({ id: CUPOM_ID, lojista_id: LOJISTA, valor_rs: 10, descricao: "", validade_dias: 30, ativo: true, criado_em: "x", atualizado_em: "x" });
  if (saldo != null) S.tabelas.saldo_rs.push({ cliente_id: A, payload: { centavos: saldo }, atualizado_em: "x" });
}
beforeEach(() => semear());

let ip = 0; // o rate-limit é por IP (5/min): cada pedido do teste vem de um IP diferente, salvo quando se testa o limite
async function comprar(body = { edicaoId: ED, produtoId: PROD }, { token, auth = true, metodo = "POST", ipFixo } = {}) {
  const tk = token ?? (auth ? await assinarUserSession(A) : null);
  const req = new Request("https://x/.netlify/functions/comprar-passe", {
    method: metodo, body: metodo === "POST" ? JSON.stringify(body) : undefined,
    headers: { "content-type": "application/json", "x-nf-client-connection-ip": ipFixo ?? `10.0.0.${++ip % 250}`, ...(tk ? { authorization: `Bearer ${tk}` } : {}) },
  });
  const r = await handler(req);
  return { status: r.status, corpo: await r.json().catch(() => null) };
}
const saldo = () => S.tabelas.saldo_rs.find((l) => l.cliente_id === A)?.payload?.centavos;

// ── Caminho feliz + idempotência ─────────────────────────────────────────────
test("E1 compra válida → 201, passe criado e R$ 2,00 debitado (saldo real via saldoRs.mjs)", async () => {
  const r = await comprar();
  assert.equal(r.status, 201, JSON.stringify(r.corpo));
  assert.equal(r.corpo.idempotent, false);
  assert.equal(r.corpo.passe.endereco, A);
  assert.deepEqual([r.corpo.saldoRsAntesCentavos, r.corpo.saldoRsDepoisCentavos], [500, 300]);
  assert.equal(saldo(), 300);
  assert.equal(S.tabelas.passes.length, 1);
});

test("E2 compra 2× → 200 idempotente, 1 só passe, 1 só débito", async () => {
  const r1 = await comprar();
  const antes = S.g.chamadas.length;
  const r2 = await comprar();
  assert.equal(S.g.chamadas.slice(antes).some((c) => c.startsWith("saldo_rs")), false, "a 2.ª compra nem toca no saldo");
  assert.equal(r2.status, 200); assert.equal(r2.corpo.idempotent, true);
  assert.equal(r2.corpo.passe.id, r1.corpo.passe.id);
  assert.equal(S.tabelas.passes.length, 1);
  assert.equal(saldo(), 300, "debitado UMA vez");
});

test("E3 corrida: outro pedido cria o passe entre a verificação e o INSERT → reembolso, 200 com o existente, saldo final = 1 débito", async () => {
  S.g.antesDeInserir = (tab, linha, t) => {
    t.passes.push({ id: "00000000-0000-4000-8000-000000000009", ...linha, comprado_em: "x", palpite_usado: false, cupons_ids: [], status: "activo" });
    t.saldo_rs[0].payload = { centavos: t.saldo_rs[0].payload.centavos - 200 }; // o vencedor pagou
  };
  const r = await comprar();
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  assert.equal(r.corpo.idempotent, true); assert.equal(r.corpo.reembolsado, true);
  assert.equal(r.corpo.passe.id, "00000000-0000-4000-8000-000000000009");
  assert.equal(S.tabelas.passes.length, 1);
  assert.equal(saldo(), 300, "500 − 200 (vencedor) − 200 (perdedor) + 200 (reembolso)");
});

// ── Saldo (HG14) ─────────────────────────────────────────────────────────────
test("E4 saldo insuficiente (R$ 1,99) → 402, nada criado, saldo intacto", async () => {
  semear({ saldo: 199 });
  const r = await comprar();
  assert.equal(r.status, 402); assert.equal(r.corpo.error.code, "saldo_insuficiente");
  assert.equal(S.tabelas.passes.length, 0);
  assert.equal(saldo(), 199);
});

test("E5 sem saldo nenhum → 402; saldo EXACTO (R$ 2,00) → 201 e fica 0, nunca negativo", async () => {
  semear({ saldo: null });
  assert.equal((await comprar()).status, 402);
  assert.equal(S.tabelas.passes.length, 0);
  semear({ saldo: 200 });
  assert.equal((await comprar()).status, 201);
  assert.equal(saldo(), 0);
});

test("E6 o saldo desce entre a leitura e o débito (outro gasto) → o débito atómico recusa: 402, nada criado", async () => {
  // o CAS do saldoRs relê: se o saldo caiu para 100 antes do UPDATE, recusa em vez de ficar negativo
  let n = 0;
  const orig = S.cliente.from;
  S.cliente.from = (t) => { if (t === "saldo_rs" && ++n === 2) S.tabelas.saldo_rs[0].payload = { centavos: 100 }; return orig(t); };
  const r = await comprar();
  assert.equal(r.status, 402, JSON.stringify(r.corpo));
  assert.equal(S.tabelas.passes.length, 0);
  assert.ok(saldo() >= 0);
});

// ── Erros de entrada / auth ──────────────────────────────────────────────────
test("E7 sem auth → 401 token_ausente; token forjado → 401; token lance-auth (tipo errado) → 401", async () => {
  assert.equal((await comprar(undefined, { auth: false })).corpo.error.code, "token_ausente");
  assert.equal((await comprar(undefined, { token: "x.y.z" })).status, 401);
  assert.equal((await comprar(undefined, { token: await assinarLanceAuth(A) })).status, 401);
  assert.equal(S.tabelas.passes.length, 0); assert.equal(saldo(), 500);
});

test("E8 corpo inválido → 400 params_invalidos (edicaoId fora do formato, produtoId ausente)", async () => {
  assert.equal((await comprar({ edicaoId: "PROG-7; drop", produtoId: PROD })).status, 400);
  assert.equal((await comprar({ edicaoId: ED })).status, 400);
  assert.equal((await comprar({ edicaoId: 7, produtoId: PROD })).status, 400);
  assert.equal(saldo(), 500);
});

test("E9 edição inexistente → 404; Relâmpago → 409; encerrada → 409; ainda não aberta → 409 — nada debitado", async () => {
  assert.equal((await comprar({ edicaoId: "PROG-99", produtoId: PROD })).corpo.error.code, "edicao_nao_encontrada");
  semear({ tipo: "relampago" }); assert.equal((await comprar()).corpo.error.code, "edicao_nao_programada");
  semear({ status: "encerrado" }); assert.equal((await comprar()).corpo.error.code, "edicao_encerrada");
  semear({ inicio: -2, fim: -1 }); assert.equal((await comprar()).corpo.error.code, "edicao_encerrada");
  semear({ inicio: 1, fim: 2 }); assert.equal((await comprar()).corpo.error.code, "edicao_nao_iniciada");
  assert.equal(S.tabelas.passes.length, 0); assert.equal(saldo(), 500);
});

test("E10 produto não vinculado à edição → 409; produto inexistente → 404; não activo → 409", async () => {
  semear({ produtoId: "99999999-2222-3333-4444-555555555555" });
  assert.equal((await comprar()).corpo.error.code, "produto_nao_vinculado");
  semear(); B.blobs.get("produtos").delete(`produto:${PROD}`);
  assert.equal((await comprar()).corpo.error.code, "produto_nao_encontrado");
  semear({ produtoStatus: "vendido" }); assert.equal((await comprar()).corpo.error.code, "produto_nao_ativo");
  assert.equal(S.tabelas.passes.length, 0); assert.equal(saldo(), 500);
});

// ── Falhas depois do débito ──────────────────────────────────────────────────
test("E11 o INSERT falha (erro do Supabase) → 502 e o R$ 2,00 é DEVOLVIDO", async () => {
  S.g.falhar.passes = { op: "insert", code: "XX000" };
  const r = await comprar();
  assert.equal(r.status, 502); assert.equal(r.corpo.error.code, "gravar_passe_falhou"); assert.equal(r.corpo.error.reembolsado, true);
  assert.equal(saldo(), 500);
  assert.equal(alertas.length, 0);
});

test("E12 INSERT falha E o reembolso falha → 502 reembolsado:false + alerta (sem endereço no alerta)", async () => {
  S.g.falhar.passes = { op: "insert", code: "XX000" };
  // 1.ª chamada a `passes` = lerPasse (antes do débito); 2.ª = o INSERT (já debitado) → a partir daí o UPDATE do saldo falha
  let n = 0; const orig = S.cliente.from;
  S.cliente.from = (t) => { if (t === "passes" && ++n === 2) S.g.falhar.saldo_rs = { op: "update", code: "XX000" }; return orig(t); };
  const r = await comprar();
  assert.equal(r.status, 502); assert.equal(r.corpo.error.reembolsado, false);
  assert.deepEqual(alertas.map(([k]) => k), ["comprar_passe_reembolso_falhou"]);
  assert.equal(JSON.stringify(alertas).includes(A.slice(2)), false, "P10: o alerta não leva o endereço");
  assert.equal(saldo(), 300, "o débito ficou (reembolso falhou) — é o caso que o alerta existe para reconciliar");
});

test("E13 o passe é do TITULAR do token: o body não escolhe o comprador", async () => {
  const r = await comprar({ edicaoId: ED, produtoId: PROD, endereco: OUTRO });
  assert.equal(r.status, 201);
  assert.equal(S.tabelas.passes[0].endereco, A);
});

test("E14 OPTIONS → preflight; GET → 405; kill switch → 503; rate-limit (5/min/IP) → 429 — nada debitado", async () => {
  assert.equal((await comprar(undefined, { metodo: "OPTIONS", auth: false })).status < 300, true);
  assert.equal((await comprar(undefined, { metodo: "GET" })).status, 405);
  B.gravar("system-state", "state", { status: "paused" }); // chave/valor reais de _lib/system-state.mjs
  const pausa = await comprar();
  assert.equal(pausa.status, 503); assert.equal(pausa.corpo.error.code, "sistema_pausado");
  semear();
  for (let i = 0; i < 5; i++) await comprar({ edicaoId: "PROG-99", produtoId: PROD }, { ipFixo: "10.9.9.9" });
  assert.equal((await comprar(undefined, { ipFixo: "10.9.9.9" })).status, 429);
  assert.equal(saldo(), 500);
  assert.equal(S.tabelas.passes.length, 0);
});

test("E15 P10: nenhum log do handler/libs leva o endereço completo", async () => {
  const linhas = [];
  const o = { info: console.info, warn: console.warn, error: console.error, log: console.log };
  for (const k of Object.keys(o)) console[k] = (...a) => linhas.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
  try {
    await comprar(); await comprar();
    semear({ saldo: 100 }); await comprar();
    semear(); S.g.falhar.passes = { op: "insert", code: "XX000" }; await comprar();
  } finally { Object.assign(console, o); }
  assert.ok(linhas.length > 0, "controlo: houve logs");
  assert.equal(linhas.some((l) => l.toLowerCase().includes(A.slice(2))), false, linhas.join("\n"));
});

// ── Achados do validador (SEG3) ──────────────────────────────────────────────
test("E16 corrida 23505 + releitura que FALHA → reembolso e 502 (antes: excepção, cobrado 2×, sem alerta)", async () => {
  S.g.antesDeInserir = (tab, linha, t) => {
    t.passes.push({ id: "00000000-0000-4000-8000-00000000000a", ...linha, comprado_em: "x", palpite_usado: false, cupons_ids: [], status: "activo" });
    t.saldo_rs[0].payload = { centavos: t.saldo_rs[0].payload.centavos - 200 };
    S.g.falhar.passes = { op: "select", code: "" }; // a releitura cai (falha de rede real vem com code "")
  };
  const r = await comprar();
  assert.equal(r.status, 502, JSON.stringify(r.corpo)); assert.equal(r.corpo.error.reembolsado, true);
  assert.equal(saldo(), 300, "só o débito do vencedor fica");
});

test("E17 EXCEPÇÃO depois do débito (from() lança no INSERT) → reembolso, 502", async () => {
  let n = 0; const orig = S.cliente.from;
  S.cliente.from = (t) => { if (t === "passes" && ++n === 2) throw new Error("rede"); return orig(t); };
  const r = await comprar();
  assert.equal(r.status, 502); assert.equal(r.corpo.error.reembolsado, true);
  assert.equal(saldo(), 500); assert.equal(S.tabelas.passes.length, 0);
});

test("E18 10 cliques SIMULTÂNEOS na mesma chave → nenhum 402 falso: todos 200/201, 1 passe, 1 débito líquido", async () => {
  const rs = await Promise.all(Array.from({ length: 10 }, () => comprar()));
  const st = rs.map((r) => r.status);
  assert.equal(st.filter((s) => s === 201).length, 1, JSON.stringify(st));
  assert.ok(st.every((s) => s === 200 || s === 201), JSON.stringify(st));
  assert.equal(S.tabelas.passes.length, 1);
  assert.equal(saldo(), 300);
});

test("E19 a leitura dos passes falha ANTES do débito → 503, nada debitado", async () => {
  S.g.falhar.passes = { op: "select", code: "" };
  const r = await comprar();
  assert.equal(r.status, 503); assert.equal(r.corpo.error.code, "store_indisponivel");
  assert.equal(saldo(), 500);
});

test("E20 catálogo indisponível → 503, nada debitado", async () => {
  const orig = B.getStore;
  B.getStore = (o) => { if (o.name === "produtos") throw new Error("blobs em baixo"); return orig(o); };
  const r = await comprar();
  assert.equal(r.status, 503); assert.equal(saldo(), 500); assert.equal(S.tabelas.passes.length, 0);
});

test("E21 débito falha por outra razão (escrita do saldo) → 502 debito_falhou, não 402; nada criado", async () => {
  S.g.falhar.saldo_rs = { op: "update", code: "XX000" };
  const r = await comprar();
  assert.equal(r.status, 502); assert.equal(r.corpo.error.code, "debito_falhou");
  assert.equal(S.tabelas.passes.length, 0);
});

test("E22 token válido com endereço inválido → 401; produtoId fora do formato → 400", async () => {
  assert.equal((await comprar(undefined, { token: await assinarUserSession("lixo") })).status, 401);
  assert.equal((await comprar({ edicaoId: ED, produtoId: "../x" })).status, 400);
  assert.equal((await comprar({ edicaoId: ED, produtoId: "abc" })).status, 400);
  assert.equal(saldo(), 500);
});
